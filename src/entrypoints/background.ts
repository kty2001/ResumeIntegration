import type { FilePayload } from '@/core/attachments';
import { COVER_LETTER_KEY } from '@/core/coverLetter';
import { globalFieldId, mergeFrames, mergeResults, planByFrame, splitFieldId } from '@/core/frames';
import { rulesForOrigin, upsertRule, type LearnedRule } from '@/core/mapping/learned';
import { getValueByKey, keyForValue, mapFields, resolveValue } from '@/core/mapping/match';
import { applyFillOne, buildFillReport } from '@/core/mapping/report';
import { isExcluded } from '@/core/site-policy';
import {
  onMessage,
  sendMessage,
  type ActionResponse,
  type ErrorResponse,
  type FieldDescriptor,
  type FillPlan,
  type FillReport,
  type FillResult,
  type PageDetails,
  type ReportField,
  type StartFillResponse,
  type UndoResponse,
} from '@/messaging/protocol';
import type { Resume } from '@/core/schema/resume';
import { getFile } from '@/storage/files';
import { coverLettersItem, fillReportItem, learnedRulesItem, resumeItem, settingsItem } from '@/storage/items';

// 자동 입력 흐름: docs/design/architecture.md 7.1 (최상위 프레임 + 주입 가능한 같은 출처 iframe)
// 사이드 패널 동작(fillOne·fillAnswer·focusField·highlight·undo): 7.2·7.3, 대상 탭은 session:fillReport의 tabId
// fillOne 성공·페이지 직접 수정(userEdit) 시 학습 규칙 저장 → 다음 startFill에서 매핑 1순위

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

/** 첨부 파일 id → filler로 보낼 파일 본문(JSON). 메타나 본문이 없으면 undefined */
async function filePayload(resume: Resume, id: string): Promise<string | undefined> {
  const meta = resume.attachments.find((a) => a.id === id);
  const blob = meta && (await getFile(id));
  if (!meta || !blob) return undefined;
  const payload: FilePayload = { fileName: meta.fileName, mimeType: meta.mimeType, data: toBase64(await blob.arrayBuffer()) };
  return JSON.stringify(payload);
}

/** 파일 입력란 항목 값을 파일 본문으로 교체, 본문이 없으면 '확인 필요 · 첨부 파일 없음' */
async function withFilePayloads(plan: FillPlan, fields: FieldDescriptor[], resume: Resume): Promise<FillPlan> {
  const fileFields = new Set(fields.filter((f) => f.widget === 'file').map((f) => f.fieldId));
  const items: FillPlan['items'] = [];
  const skipped = [...(plan.skipped ?? [])];
  for (const item of plan.items) {
    if (!fileFields.has(item.fieldId)) {
      items.push(item);
      continue;
    }
    const value = await filePayload(resume, item.value);
    if (value) items.push({ ...item, value });
    else skipped.push({ fieldId: item.fieldId, schemaKey: item.schemaKey, reason: 'no-file' });
  }
  return { ...plan, items, skipped };
}

const FILLER: ['/filler.js'] = ['/filler.js'];

/**
 * 최상위 프레임 + 주입 가능한(같은 출처) iframe에 filler 주입 → 주입된 frameId 목록
 * 사이드 패널 '다시 작성'은 activeTab 부여가 없어 페이지 이동 후 실패 → 안내 문구, 기존 결과는 유지
 */
async function injectFiller(tabId: number): Promise<number[]> {
  try {
    await browser.scripting.executeScript({ target: { tabId }, files: FILLER });
  } catch {
    throw new Error("페이지 접근 권한 없음: 툴바 아이콘의 '작성'으로 다시 실행해 주세요");
  }
  // 권한 없는(교차 출처) iframe 때문에 실패하면 최상위 프레임만 처리
  try {
    const results = await browser.scripting.executeScript({ target: { tabId, allFrames: true }, files: FILLER });
    return [...new Set([0, ...results.map((r) => r.frameId)])].sort((a, b) => a - b);
  } catch {
    return [0];
  }
}

/** 프레임별로 나눠 입력 후 결과 합침 (전체 fieldId 기준) */
async function sendFill(tabId: number, plan: FillPlan): Promise<FillResult> {
  const results: { frameId: number; result: FillResult }[] = [];
  for (const [frameId, part] of planByFrame(plan)) {
    results.push({ frameId, result: await sendMessage('fill', part, { tabId, frameId }) });
  }
  return mergeResults(results);
}

async function startFill(tabId: number): Promise<StartFillResponse> {
  const tab = await browser.tabs.get(tabId);
  if (tab.url && isExcluded(tab.url)) {
    await fillReportItem.setValue(null);
    return { status: 'excluded' };
  }
  const settings = await settingsItem.getValue();
  if (tab.url && isExcluded(tab.url, settings.excludedSites)) {
    await fillReportItem.setValue(null);
    return { status: 'user-excluded' };
  }
  const resume = await resumeItem.getValue();
  if (!resume) {
    await fillReportItem.setValue(null);
    return { status: 'no-resume' };
  }

  const frameIds = await injectFiller(tabId);
  await fillReportItem.setValue(null);
  const frames: { frameId: number; details: PageDetails }[] = [];
  for (const frameId of frameIds) {
    // 수집 중 이동·제거된 iframe은 건너뜀 (최상위 프레임 실패는 오류)
    try {
      frames.push({ frameId, details: await sendMessage('collect', undefined, { tabId, frameId }) });
    } catch (e) {
      if (frameId === 0) throw e;
    }
  }
  const details = mergeFrames(frames);
  const learned = rulesForOrigin(await learnedRulesItem.getValue(), new URL(details.url).origin);
  const mapped = mapFields(details.fields, resume, learned, settings.sensitiveAutofill ?? false);
  const plan = await withFilePayloads(mapped, details.fields, resume);
  const result = await sendFill(tabId, plan);
  const report = { ...buildFillReport(details, plan, result, tabId), frameIds: frames.map((f) => f.frameId) };
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
  const result = await sendFill(report.tabId, plan);
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
  if (field.hint.widget === 'file') {
    value = resume ? await filePayload(resume, value) : undefined;
    if (!value) return { status: 'error', message: '첨부 파일을 찾을 수 없음' };
  }

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
  const schemaKey = keyForValue(resume, value, field.hint, (await settingsItem.getValue()).sensitiveAutofill ?? false);
  if (!schemaKey || (field.status === 'filled' && field.schemaKey === schemaKey)) return;

  const result = { filled: [{ fieldId, strategy: 'user' }], failed: [] };
  await fillReportItem.setValue(applyFillOne(report, fieldId, schemaKey, result));
  if (field.fingerprint) {
    const rule = { origin: new URL(report.url).origin, fingerprint: field.fingerprint, schemaKey, updatedAt: new Date().toISOString() };
    await learnedRulesItem.setValue(upsertRule(await learnedRulesItem.getValue(), rule));
  }
}

/** 모든 프레임 되돌리기, 복원 개수 합계 */
async function undo(): Promise<UndoResponse> {
  const report = await requireReport();
  let restored = 0;
  for (const frameId of report.frameIds ?? [0]) {
    const response = await sendMessage('undo', undefined, { tabId: report.tabId, frameId });
    if (response.status === 'error') return response;
    restored += response.restored;
  }
  // 입력 전 상태로 돌아갔으므로 결과 초기화
  await fillReportItem.setValue(null);
  return { status: 'ok', restored };
}

/** 입력란 위치 표시: 프레임별로 나눠 전달 (표시할 입력란이 없는 프레임은 해제) */
async function highlight(fields: Pick<ReportField, 'fieldId' | 'status'>[]): Promise<ActionResponse> {
  const report = await requireReport();
  for (const frameId of report.frameIds ?? [0]) {
    const own = fields.flatMap((f) => {
      const { frameId: owner, localId } = splitFieldId(f.fieldId);
      return owner === frameId ? [{ ...f, fieldId: localId }] : [];
    });
    const response = await sendMessage('highlight', { fields: own }, { tabId: report.tabId, frameId });
    if (response.status === 'error') return response;
  }
  return { status: 'ok' };
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
      const { frameId, localId } = splitFieldId(data.fieldId);
      return sendMessage('focusField', { fieldId: localId }, { tabId: report.tabId, frameId });
    }),
  );
  onMessage('highlight', ({ data }) => withErrors(() => highlight(data.fields)));
  onMessage('undo', () => withErrors(undo));
  // iframe의 filler는 로컬 id를 보냄 → 보낸 프레임 기준 전체 id
  onMessage('userEdit', ({ data, sender }) =>
    userEdit(sender.tab?.id, globalFieldId(sender.frameId ?? 0, data.fieldId), data.value),
  );
});
