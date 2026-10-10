import { rulesForOrigin, upsertRule, type LearnedRule } from '@/core/mapping/learned';
import { getValueByKey, mapFields, resolveValue } from '@/core/mapping/match';
import { applyFillOne, buildFillReport } from '@/core/mapping/report';
import { isExcluded } from '@/core/site-policy';
import {
  onMessage,
  sendMessage,
  type ActionResponse,
  type ErrorResponse,
  type FillReport,
  type ReportField,
  type StartFillResponse,
  type UndoResponse,
} from '@/messaging/protocol';
import { fillReportItem, learnedRulesItem, resumeItem } from '@/storage/items';

// 자동 입력 흐름: docs/design/architecture.md 7.1 (현재 최상위 프레임만 처리)
// 사이드 패널 동작(fillOne·focusField·highlight·undo): 7.2·7.3, 대상 탭은 session:fillReport의 tabId
// fillOne 성공 시 학습 규칙 저장 → 다음 startFill에서 매핑 1순위

async function startFill(tabId: number): Promise<StartFillResponse> {
  const tab = await browser.tabs.get(tabId);
  if (tab.url && isExcluded(tab.url)) {
    await fillReportItem.setValue(null);
    return { status: 'excluded' };
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
    value = chosen.value;
    const original = resume && getValueByKey(resume, schemaKey);
    if (original) option = { value: original, text: chosen.text };
  } else {
    value = resume ? resolveValue(resume, schemaKey, field.hint) : undefined;
  }
  if (!value) return { status: 'error', message: '이력서 값 없음' };

  const plan = { items: [{ fieldId, schemaKey, value, source: 'manual' as const }], unmatched: [] };
  const result = await sendMessage('fill', plan, { tabId: report.tabId, frameId: 0 });
  await fillReportItem.setValue(applyFillOne(report, fieldId, schemaKey, result));

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
});
