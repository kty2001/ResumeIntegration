import { COVER_LETTER_KEY } from '@/core/coverLetter';
import { rulesForOrigin, upsertRule, type LearnedRule } from '@/core/mapping/learned';
import { getValueByKey, keyForValue, mapFields, resolveValue } from '@/core/mapping/match';
import { applyFillOne, buildFillReport } from '@/core/mapping/report';
import { isExcluded } from '@/core/site-policy';
import {
  onMessage,
  sendMessage,
  type ActionResponse,
  type ErrorResponse,
  type FillReport,
  type FillResult,
  type ReportField,
  type StartFillResponse,
  type UndoResponse,
} from '@/messaging/protocol';
import { coverLettersItem, fillReportItem, learnedRulesItem, resumeItem, settingsItem } from '@/storage/items';

// 자동 입력 흐름: docs/design/architecture.md 7.1 (현재 최상위 프레임만 처리)
// 사이드 패널 동작(fillOne·fillAnswer·focusField·highlight·undo): 7.2·7.3, 대상 탭은 session:fillReport의 tabId
// fillOne 성공·페이지 직접 수정(userEdit) 시 학습 규칙 저장 → 다음 startFill에서 매핑 1순위

async function startFill(tabId: number): Promise<StartFillResponse> {
  const tab = await browser.tabs.get(tabId);
  if (tab.url && isExcluded(tab.url)) {
    await fillReportItem.setValue(null);
    return { status: 'excluded' };
  }
  if (tab.url && isExcluded(tab.url, (await settingsItem.getValue()).excludedSites)) {
    await fillReportItem.setValue(null);
    return { status: 'user-excluded' };
  }
  const resume = await resumeItem.getValue();
  if (!resume) {
    await fillReportItem.setValue(null);
    return { status: 'no-resume' };
  }

  // 사이드 패널 '다시 작성'은 activeTab 부여가 없어 페이지 이동 후 실패 → 안내 문구, 기존 결과는 유지
  try {
    await browser.scripting.executeScript({ target: { tabId }, files: ['/filler.js'] });
  } catch {
    throw new Error("페이지 접근 권한 없음: 툴바 아이콘의 '작성'으로 다시 실행해 주세요");
  }
  await fillReportItem.setValue(null);
  const target = { tabId, frameId: 0 };
  const details = await sendMessage('collect', undefined, target);
  const learned = rulesForOrigin(await learnedRulesItem.getValue(), new URL(details.url).origin);
  const plan = mapFields(details.fields, resume, learned);
  const result = await sendMessage('fill', plan, target);
  const report = buildFillReport(details, plan, result, tabId);
  await fillReportItem.setValue(report);

  // 선택지 불일치(plan.skipped)도 '입력 실패'에 포함되도록 보고서 상태 기준으로 집계
  const count = (status: ReportField['status']) => report.fields.filter((f) => f.status === status).length;
  return { status: 'ok', filled: count('filled'), failed: count('failed'), unmatched: count('unmatched') };
}

async function requireReport(): Promise<FillReport> {
  const report = await fillReportItem.getValue();
  if (!report) throw new Error('입력 결과 없음');
  return report;
}

/** 사이드 패널 직접 입력: 한 입력란에 값 입력 후 결과 반영 */
async function fillManual(report: FillReport, fieldId: string, schemaKey: string, value: string): Promise<FillResult> {
  const plan = { items: [{ fieldId, schemaKey, value, source: 'manual' as const }], unmatched: [] };
  const result = await sendMessage('fill', plan, { tabId: report.tabId, frameId: 0 });
  await fillReportItem.setValue(applyFillOne(report, fieldId, schemaKey, result));
  return result;
}

/** 자기소개서 라이브러리 답변 입력 (문항 매칭은 사이드 패널, 학습 없음) */
async function fillAnswer(fieldId: string, coverLetterId: string): Promise<ActionResponse> {
  const report = await requireReport();
  const entry = (await coverLettersItem.getValue()).find((e) => e.id === coverLetterId);
  if (!entry?.answer) return { status: 'error', message: '자기소개서 답변을 찾을 수 없음' };
  const result = await fillManual(report, fieldId, COVER_LETTER_KEY, entry.answer);
  const failed = result.failed[0];
  if (failed?.reason === 'too-long') return { status: 'error', message: '입력란 글자수 제한을 초과합니다' };
  return { status: 'ok' };
}

/** optionValue: select 선택지 직접 선택 → 그 선택지를 입력하고 '이력서 값 → 선택지 텍스트'도 학습 */
async function fillOne(fieldId: string, schemaKey: string, optionValue?: string): Promise<ActionResponse> {
  const report = await requireReport();
  const field = report.fields.find((f) => f.fieldId === fieldId);
  if (!field) throw new Error('입력란을 찾을 수 없음');
  const resume = await resumeItem.getValue();
  let value: string | undefined;
  let option: LearnedRule['option'];
  if (optionValue !== undefined) {
    const chosen = field.hint.options?.find((o) => o.value === optionValue);
    if (!chosen) return { status: 'error', message: '선택지를 찾을 수 없음' };
    value = field.hint.widget === 'checkboxes' ? JSON.stringify([chosen.value]) : chosen.value;
    const original = resume && getValueByKey(resume, schemaKey);
    if (original) option = { value: original, text: chosen.text };
  } else {
    value = resume ? resolveValue(resume, schemaKey, field.hint) : undefined;
  }
  if (!value) return { status: 'error', message: '이력서 값 없음' };

  const result = await fillManual(report, fieldId, schemaKey, value);
  if (field.fingerprint && result.filled.length > 0) {
    const rule = {
      origin: new URL(report.url).origin,
      fingerprint: field.fingerprint,
      schemaKey,
      option,
      updatedAt: new Date().toISOString(),
    };
    await learnedRulesItem.setValue(upsertRule(await learnedRulesItem.getValue(), rule));
  }
  return { status: 'ok' };
}

/**
 * 사용자가 페이지에서 직접 바꾼 값이 이력서 항목 하나와 같으면 그 항목으로 입력 완료 처리 + 학습
 * (checkbox는 true/false 값이 여러 항목과 겹쳐 제외)
 */
async function userEdit(tabId: number | undefined, fieldId: string, value: string): Promise<void> {
  const report = await fillReportItem.getValue();
  if (!report || report.tabId !== tabId) return;
  const field = report.fields.find((f) => f.fieldId === fieldId);
  const resume = await resumeItem.getValue();
  if (!field || !resume || field.hint.widget === 'checkbox' || field.hint.widget === 'checkboxes') return;
  const schemaKey = keyForValue(resume, value, field.hint);
  if (!schemaKey || (field.status === 'filled' && field.schemaKey === schemaKey)) return;

  const result = { filled: [{ fieldId, strategy: 'user' }], failed: [] };
  await fillReportItem.setValue(applyFillOne(report, fieldId, schemaKey, result));
  if (field.fingerprint) {
    const rule = { origin: new URL(report.url).origin, fingerprint: field.fingerprint, schemaKey, updatedAt: new Date().toISOString() };
    await learnedRulesItem.setValue(upsertRule(await learnedRulesItem.getValue(), rule));
  }
}

async function undo(): Promise<UndoResponse> {
  const report = await requireReport();
  const response = await sendMessage('undo', undefined, { tabId: report.tabId, frameId: 0 });
  // 입력 전 상태로 돌아갔으므로 결과 초기화
  if (response.status === 'ok') await fillReportItem.setValue(null);
  return response;
}

async function withErrors<T>(run: () => Promise<T>): Promise<T | ErrorResponse> {
  try {
    return await run();
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : String(e) };
  }
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(({ reason }) => {
    console.log('[resume-integration] installed:', reason);
  });

  onMessage('startFill', ({ data }) => withErrors(() => startFill(data.tabId)));
  onMessage('fillOne', ({ data }) => withErrors(() => fillOne(data.fieldId, data.schemaKey, data.optionValue)));
  onMessage('fillAnswer', ({ data }) => withErrors(() => fillAnswer(data.fieldId, data.coverLetterId)));
  onMessage('focusField', ({ data }) =>
    withErrors(async () => {
      const report = await requireReport();
      return sendMessage('focusField', data, { tabId: report.tabId, frameId: 0 });
    }),
  );
  onMessage('highlight', ({ data }) =>
    withErrors(async () => {
      const report = await requireReport();
      return sendMessage('highlight', data, { tabId: report.tabId, frameId: 0 });
    }),
  );
  onMessage('undo', () => withErrors(undo));
  onMessage('userEdit', ({ data, sender }) => userEdit(sender.tab?.id, data.fieldId, data.value));
});
