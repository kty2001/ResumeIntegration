import type { FieldDescriptor, PageDetails } from '@/messaging/protocol';

// 필드 수집 (Page Details): docs/design/architecture.md 5장
// 현재 범위: 최상위 문서의 text·textarea·date 입력란

export type TextElement = HTMLInputElement | HTMLTextAreaElement;

const TEXT_INPUT_TYPES = new Set(['text', 'email', 'tel', 'url', 'search', 'date']);

/** fieldId → 요소. DOM에 식별 속성을 추가하지 않고 메모리에만 보관 */
const elements = new Map<string, TextElement>();

export function getElement(fieldId: string): TextElement | undefined {
  return elements.get(fieldId);
}

function isFillable(el: TextElement): boolean {
  if (el instanceof HTMLInputElement && !TEXT_INPUT_TYPES.has(el.type)) return false;
  if (el.disabled || el.readOnly) return false;
  return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
}

function cleanText(text: string | null | undefined): string | undefined {
  const t = text?.replace(/\s+/g, ' ').trim();
  return t || undefined;
}

function resolveLabel(el: TextElement): string | undefined {
  // label[for] 또는 감싸는 label (감싼 경우 입력란 자체 텍스트 제외)
  const label = el.labels?.[0];
  if (label) {
    const copy = label.cloneNode(true) as HTMLElement;
    copy.querySelectorAll('input, textarea, select').forEach((c) => c.remove());
    return cleanText(copy.textContent);
  }
  const ids = el.getAttribute('aria-labelledby');
  if (ids) {
    const text = ids
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ');
    return cleanText(text);
  }
  return undefined;
}

/** 섹션 문맥: 가장 가까운 fieldset의 legend → 문서 순서상 직전 제목 */
function resolveSection(el: TextElement, heading: string | undefined): string | undefined {
  const legend = el.closest('fieldset')?.querySelector(':scope > legend');
  return (legend && cleanText(legend.textContent)) || heading;
}

const HEADING = /^H[1-6]$/;

export function collectPageDetails(): PageDetails {
  elements.clear();
  const fields: FieldDescriptor[] = [];
  let heading: string | undefined;
  // 제목과 입력란을 문서 순서로 함께 순회해 직전 제목 추적
  const nodes = document.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6, input, textarea');
  nodes.forEach((node) => {
    if (HEADING.test(node.tagName)) {
      heading = cleanText(node.textContent);
      return;
    }
    const el = node as TextElement;
    if (!isFillable(el)) return;
    const fieldId = String(elements.size);
    elements.set(fieldId, el);
    fields.push({
      fieldId,
      widget: el instanceof HTMLTextAreaElement ? 'textarea' : el.type === 'date' ? 'date' : 'text',
      label: resolveLabel(el),
      name: el.name || undefined,
      id: el.id || undefined,
      placeholder: cleanText(el.placeholder),
      autocomplete: el.getAttribute('autocomplete') || undefined,
      ariaLabel: cleanText(el.getAttribute('aria-label')),
      maxLength: el.maxLength > 0 ? el.maxLength : undefined,
      section: resolveSection(el, heading),
    });
  });
  return { url: location.origin + location.pathname, fields };
}
