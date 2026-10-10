import type { ReportField } from '@/messaging/protocol';
import type { TextElement } from './collect';

// 입력란 위치 하이라이트: docs/design/architecture.md 4장
// 페이지 요소 스타일은 변경하지 않고 Shadow Root 안의 고정 위치 테두리 박스로 표시
// (unlisted script는 ContentScriptContext가 없어 WXT createShadowRootUi 대신 네이티브 attachShadow 사용)

export type HighlightStatus = ReportField['status'];

const COLORS: Record<HighlightStatus, string> = {
  filled: '#16a34a',
  failed: '#ea580c',
  unmatched: '#9ca3af',
};

const STYLE = `
:host { all: initial; }
div {
  position: fixed;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 4px;
  pointer-events: none;
  z-index: 2147483647;
}
`;

let host: HTMLDivElement | null = null;
let boxes: [TextElement, HTMLDivElement][] = [];
let frame = 0;

function position(): void {
  frame = 0;
  for (const [el, box] of boxes) {
    const rect = el.getBoundingClientRect();
    const visible = el.isConnected && rect.width > 0 && rect.height > 0;
    box.style.display = visible ? 'block' : 'none';
    if (!visible) continue;
    box.style.left = `${rect.left - 3}px`;
    box.style.top = `${rect.top - 3}px`;
    box.style.width = `${rect.width + 6}px`;
    box.style.height = `${rect.height + 6}px`;
  }
}

function schedule(): void {
  if (!frame) frame = requestAnimationFrame(position);
}

export function clearHighlights(): void {
  if (!host) return;
  removeEventListener('scroll', schedule, true);
  removeEventListener('resize', schedule);
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  host.remove();
  host = null;
  boxes = [];
}

/** 기존 표시를 지우고 다시 그림. 빈 배열이면 해제만 */
export function showHighlights(items: { el: TextElement; status: HighlightStatus }[]): void {
  clearHighlights();
  if (items.length === 0) return;

  host = document.createElement('div');
  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = STYLE;
  root.append(style);
  boxes = items.map(({ el, status }) => {
    const box = document.createElement('div');
    box.dataset.status = status;
    box.style.borderColor = COLORS[status];
    root.append(box);
    return [el, box];
  });
  document.documentElement.append(host);

  position();
  addEventListener('scroll', schedule, { capture: true, passive: true });
  addEventListener('resize', schedule);
}
