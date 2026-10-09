import { mapFields, resolveValue } from '@/core/mapping/match';
import { applyFillOne, buildFillReport } from '@/core/mapping/report';
import { isExcluded } from '@/core/site-policy';
import {
  onMessage,
  sendMessage,
  type ActionResponse,
  type ErrorResponse,
  type FillReport,
  type StartFillResponse,
  type UndoResponse,
} from '@/messaging/protocol';
import { fillReportItem, resumeItem } from '@/storage/items';

// 자동 입력 흐름: docs/design/architecture.md 7.1 (현재 최상위 프레임만 처리)
// 사이드 패널 동작(fillOne·focusField·undo): 7.2·7.3, 대상 탭은 session:fillReport의 tabId

async function startFill(tabId: number): Promise<StartFillResponse> {
  await fillReportItem.setValue(null);
  const tab = await browser.tabs.get(tabId);
  if (tab.url && isExcluded(tab.url)) return { status: 'excluded' };

  const resume = await resumeItem.getValue();
  if (!resume) return { status: 'no-resume' };

  await browser.scripting.executeScript({ target: { tabId }, files: ['/filler.js'] });
  const target = { tabId, frameId: 0 };
  const details = await sendMessage('collect', undefined, target);
  const plan = mapFields(details.fields, resume);
  const result = await sendMessage('fill', plan, target);
  await fillReportItem.setValue(buildFillReport(details, plan, result, tabId));

  return {
    status: 'ok',
    filled: result.filled.length,
    failed: result.failed.length,
    unmatched: plan.unmatched.length,
  };
}

async function requireReport(): Promise<FillReport> {
  const report = await fillReportItem.getValue();
  if (!report) throw new Error('입력 결과 없음');
  return report;
}

async function fillOne(fieldId: string, schemaKey: string): Promise<ActionResponse> {
  const report = await requireReport();
  const field = report.fields.find((f) => f.fieldId === fieldId);
  if (!field) throw new Error('입력란을 찾을 수 없음');
  const resume = await resumeItem.getValue();
  const value = resume && resolveValue(resume, schemaKey, field.hint);
  if (!value) return { status: 'error', message: '이력서 값 없음' };

  const plan = { items: [{ fieldId, schemaKey, value, source: 'manual' as const }], unmatched: [] };
  const result = await sendMessage('fill', plan, { tabId: report.tabId, frameId: 0 });
  await fillReportItem.setValue(applyFillOne(report, fieldId, schemaKey, result));
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
  onMessage('fillOne', ({ data }) => withErrors(() => fillOne(data.fieldId, data.schemaKey)));
  onMessage('focusField', ({ data }) =>
    withErrors(async () => {
      const report = await requireReport();
      return sendMessage('focusField', data, { tabId: report.tabId, frameId: 0 });
    }),
  );
  onMessage('undo', () => withErrors(undo));
});
