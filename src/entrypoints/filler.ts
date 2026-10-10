import { collectPageDetails, getElement } from '@/dom/collect';
import { clearHighlights, showHighlights } from '@/dom/highlight';
import { restoreAll, saveSnapshot } from '@/dom/snapshot';
import { fillElement } from '@/dom/widgets';
import { onMessage, type FillResult } from '@/messaging/protocol';

// '작성' 클릭 시 scripting.executeScript({ files: ['/filler.js'] })로 주입되는 스크립트.
// 수집·입력만 수행, 매핑 판단은 background (docs/design/architecture.md 1·2장)

declare global {
  interface Window {
    __resumeFillerInjected?: boolean;
  }
}

export default defineUnlistedScript(() => {
  // 중복 주입 시 리스너 중복 등록 방지
  if (window.__resumeFillerInjected) return;
  window.__resumeFillerInjected = true;

  // 재수집 시 fieldId가 다시 매겨지므로 기존 하이라이트 해제
  onMessage('collect', () => {
    clearHighlights();
    return collectPageDetails();
  });

  onMessage('fill', ({ data: plan }) => {
    const result: FillResult = { filled: [], failed: [] };
    for (const { fieldId, value } of plan.items) {
      const el = getElement(fieldId);
      if (!el || !el.isConnected) {
        result.failed.push({ fieldId, reason: 'not-found' });
      } else if (!(el instanceof HTMLSelectElement) && el.maxLength > 0 && value.length > el.maxLength) {
        result.failed.push({ fieldId, reason: 'too-long' });
      } else {
        saveSnapshot(el);
        const strategy = el instanceof HTMLSelectElement ? 'select' : 'text';
        if (fillElement(el, value)) result.filled.push({ fieldId, strategy });
        else result.failed.push({ fieldId, reason: 'not-applied' });
      }
    }
    return result;
  });

  onMessage('focusField', ({ data }) => {
    const el = getElement(data.fieldId);
    if (!el || !el.isConnected) return { status: 'error', message: '입력란을 찾을 수 없음' };
    el.scrollIntoView({ block: 'center' });
    el.focus();
    return { status: 'ok' };
  });

  onMessage('highlight', ({ data }) => {
    const items = data.fields.flatMap(({ fieldId, status }) => {
      const el = getElement(fieldId);
      return el ? [{ el, status }] : [];
    });
    showHighlights(items);
    return { status: 'ok' };
  });

  // 되돌리면 입력 결과가 초기화되므로 하이라이트도 해제
  onMessage('undo', () => {
    clearHighlights();
    return { status: 'ok', restored: restoreAll() };
  });
});
