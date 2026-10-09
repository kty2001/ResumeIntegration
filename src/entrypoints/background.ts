import { mapFields } from '@/core/mapping/match';
import { buildFillReport } from '@/core/mapping/report';
import { isExcluded } from '@/core/site-policy';
import { onMessage, sendMessage, type StartFillResponse } from '@/messaging/protocol';
import { fillReportItem, resumeItem } from '@/storage/items';

// 자동 입력 흐름: docs/design/architecture.md 7.1 (현재 최상위 프레임만 처리)

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
  await fillReportItem.setValue(buildFillReport(details, plan, result));

  return {
    status: 'ok',
    filled: result.filled.length,
    failed: result.failed.length,
    unmatched: plan.unmatched.length,
  };
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(({ reason }) => {
    console.log('[resume-integration] installed:', reason);
  });

  onMessage('startFill', async ({ data }) => {
    try {
      return await startFill(data.tabId);
    } catch (e) {
      return { status: 'error', message: e instanceof Error ? e.message : String(e) };
    }
  });
});
