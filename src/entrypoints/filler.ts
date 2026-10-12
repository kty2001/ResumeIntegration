import {
  collectedFieldIds,
  collectPageDetails,
  fieldIdOf,
  getElement,
  isCheckbox,
  isCheckboxGroup,
  isFile,
  isFormControl,
  isRadio,
  type FillElement,
} from '@/dom/collect';
import { clearHighlights, showHighlights } from '@/dom/highlight';
import { restoreAll, saveSnapshot } from '@/dom/snapshot';
import { fillElement, readValue } from '@/dom/widgets';
import { onMessage, sendMessage, type FillResult } from '@/messaging/protocol';

// '작성' 클릭 시 scripting.executeScript({ files: ['/filler.js'] })로 주입되는 스크립트.
// 수집·입력만 수행, 매핑 판단은 background (docs/design/architecture.md 1·2장)

declare global {
  interface Window {
    __resumeFillerInjected?: boolean;
  }
}

/** 입력 결과 보고용 전략 이름 */
function strategyOf(el: FillElement): string {
  if (!isFormControl(el)) return 'combobox';
  if (el instanceof HTMLSelectElement) return 'select';
  if (isRadio(el)) return 'radio';
  if (isCheckboxGroup(el)) return 'checkboxes';
  if (isFile(el)) return 'file';
  return isCheckbox(el) ? 'checkbox' : 'text';
}

export default defineUnlistedScript(() => {
  // 중복 주입 시 리스너 중복 등록 방지
  if (window.__resumeFillerInjected) return;
  window.__resumeFillerInjected = true;

  // 확장 프로그램이 수집(콤보박스 열기)·입력·되돌리는 동안 발생한 change는 사용자 수정으로 보지 않음
  let filling = false;
  const whileFilling = async <T>(run: () => Promise<T>): Promise<T> => {
    filling = true;
    try {
      return await run();
    } finally {
      filling = false;
    }
  };

  // 재수집 시 fieldId가 다시 매겨지므로 기존 하이라이트 해제
  onMessage('collect', () => {
    clearHighlights();
    return whileFilling(collectPageDetails);
  });

  // 이력서 가져오기: 수집한 입력란의 현재 값 (파일 입력란은 readValue가 '' → 제외)
  onMessage('readValues', () =>
    collectedFieldIds().flatMap((fieldId) => {
      const el = getElement(fieldId);
      const value = el?.isConnected ? readValue(el) : '';
      return value.trim() ? [{ fieldId, value }] : [];
    }),
  );

  // 사용자가 페이지에서 직접 바꾼 값 → background가 같은 값의 이력서 항목이면 결과 갱신·학습
  document.addEventListener(
    'change',
    (e) => {
      if (filling || !e.isTrusted || !(e.target instanceof Element)) return;
      const fieldId = fieldIdOf(e.target);
      const el = fieldId && getElement(fieldId);
      if (!fieldId || !el) return;
      sendMessage('userEdit', { fieldId, value: readValue(el) }).catch(() => {});
    },
    true,
  );

  onMessage('fill', ({ data: plan }) => whileFilling(async () => {
    const result: FillResult = { filled: [], failed: [] };
    for (const { fieldId, value } of plan.items) {
      const el = getElement(fieldId);
      if (!el || !el.isConnected) {
        result.failed.push({ fieldId, reason: 'not-found' });
      } else if (isFormControl(el) && !(el instanceof HTMLSelectElement) && el.maxLength > 0 && value.length > el.maxLength) {
        result.failed.push({ fieldId, reason: 'too-long' });
      } else {
        saveSnapshot(el);
        if (await fillElement(el, value)) result.filled.push({ fieldId, strategy: strategyOf(el) });
        else result.failed.push({ fieldId, reason: 'not-applied' });
      }
    }
    return result;
  }));

  onMessage('focusField', ({ data }) => {
    const el = getElement(data.fieldId);
    if (!el || !el.isConnected) return { status: 'error', message: '입력란을 찾을 수 없음' };
    // 숨긴 radio·checkbox는 스크롤되지 않으므로 label 기준
    const target = isFormControl(el) && (isRadio(el) || isCheckbox(el) || isFile(el)) ? (el.labels?.[0] ?? el) : el;
    target.scrollIntoView({ block: 'center' });
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
    return whileFilling(async () => ({ status: 'ok' as const, restored: await restoreAll() }));
  });
});
