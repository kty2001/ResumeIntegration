import type { FillElement } from './collect';
import { fillElement } from './widgets';

// 입력 전 값 백업·되돌리기: docs/design/architecture.md 7.3
// 요소별 최초 값만 보관 → '작성'을 다시 실행해도 원래 값으로 복원. 페이지 이동 시 소멸

const snapshot = new Map<FillElement, string>();

export function saveSnapshot(el: FillElement): void {
  if (!snapshot.has(el)) snapshot.set(el, el.value);
}

/** 연결된 요소만 복원, 복원 개수 반환 */
export function restoreAll(): number {
  let restored = 0;
  for (const [el, value] of snapshot) {
    if (el.isConnected && fillElement(el, value)) restored++;
  }
  snapshot.clear();
  return restored;
}
