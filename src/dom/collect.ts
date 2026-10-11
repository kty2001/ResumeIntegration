import type { FieldDescriptor, PageDetails } from '@/messaging/protocol';

// 필드 수집 (Page Details): docs/design/architecture.md 5장
// 현재 범위: 최상위 문서의 text·textarea·date 입력란, 기본 select, radio 그룹(같은 form·name → 입력란 1개)

export type TextElement = HTMLInputElement | HTMLTextAreaElement;
/** radio 그룹은 그룹의 첫 radio로 보관 */
export type FillElement = TextElement | HTMLSelectElement;

const TEXT_INPUT_TYPES = new Set(['text', 'email', 'tel', 'url', 'search', 'date']);

/** fieldId → 요소. DOM에 식별 속성을 추가하지 않고 메모리에만 보관 */
const elements = new Map<string, FillElement>();

export function getElement(fieldId: string): FillElement | undefined {
  return elements.get(fieldId);
}

// false 분기에서 HTMLInputElement 전체가 제외되지 않도록 type까지 좁힘
export function isRadio(el: Element): el is HTMLInputElement & { type: 'radio' } {
  return el instanceof HTMLInputElement && el.type === 'radio';
}

/** 같은 form·name의 radio (문서 순서) */
export function radioGroup(el: HTMLInputElement): HTMLInputElement[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>('input[type=radio]')).filter(
    (r) => r.name === el.name && r.form === el.form,
  );
}

function isVisible(el: Element): boolean {
  return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
}

function isFillable(el: FillElement): boolean {
  if (el.disabled) return false;
  // 커스텀 디자인은 radio를 숨기고 label만 표시 → label이 보여도 입력 가능
  if (isRadio(el)) return isVisible(el) || [...(el.labels ?? [])].some(isVisible);
  if (el instanceof HTMLInputElement && !TEXT_INPUT_TYPES.has(el.type)) return false;
  if (!(el instanceof HTMLSelectElement) && el.readOnly) return false;
  return isVisible(el);
}

function cleanText(text: string | null | undefined): string | undefined {
  const t = text?.replace(/\s+/g, ' ').trim();
  return t || undefined;
}

function labelledByText(el: Element): string | undefined {
  const ids = el.getAttribute('aria-labelledby');
  if (!ids) return undefined;
  const text = ids
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ');
  return cleanText(text);
}

function resolveLabel(el: FillElement): string | undefined {
  // label[for] 또는 감싸는 label (감싼 경우 입력란 자체 텍스트 제외)
  const label = el.labels?.[0];
  if (label) {
    const copy = label.cloneNode(true) as HTMLElement;
    copy.querySelectorAll('input, textarea, select').forEach((c) => c.remove());
    return cleanText(copy.textContent);
  }
  return labelledByText(el);
}

/** 섹션 문맥: 가장 가까운 fieldset의 legend → 문서 순서상 직전 제목 */
function resolveSection(el: Element | null, heading: string | undefined): string | undefined {
  const legend = el?.closest('fieldset')?.querySelector(':scope > legend');
  return (legend && cleanText(legend.textContent)) || heading;
}

const HEADING = /^H[1-6]$/;

function widgetOf(el: FillElement): FieldDescriptor['widget'] {
  if (el instanceof HTMLSelectElement) return 'select';
  if (el instanceof HTMLTextAreaElement) return 'textarea';
  return el.type === 'date' ? 'date' : 'text';
}

/** 선택지 (값 없는 안내 옵션·비활성 옵션 제외) */
function selectOptions(el: HTMLSelectElement): FieldDescriptor['options'] {
  return Array.from(el.options)
    .filter((o) => o.value !== '' && !o.disabled)
    .map((o) => ({ value: o.value, text: cleanText(o.text) ?? '' }));
}

function describe(el: FillElement, heading: string | undefined): Omit<FieldDescriptor, 'fieldId'> {
  const select = el instanceof HTMLSelectElement;
  return {
    widget: widgetOf(el),
    label: resolveLabel(el),
    name: el.name || undefined,
    id: el.id || undefined,
    placeholder: select ? undefined : cleanText(el.placeholder),
    autocomplete: el.getAttribute('autocomplete') || undefined,
    ariaLabel: cleanText(el.getAttribute('aria-label')),
    maxLength: !select && el.maxLength > 0 ? el.maxLength : undefined,
    section: resolveSection(el, heading),
    options: select ? selectOptions(el) : undefined,
  };
}

/**
 * radio 그룹: 표시 텍스트는 role=radiogroup의 aria 이름 → 그룹 radio만 담은 fieldset의 legend
 * (다른 입력란이 섞인 fieldset의 legend는 섹션명). id는 선택지별 값이라 제외
 */
function describeRadio(group: HTMLInputElement[], heading: string | undefined): Omit<FieldDescriptor, 'fieldId'> {
  const first = group[0]!;
  const container = first.closest('[role=radiogroup]');
  const fieldset = first.closest('fieldset');
  const ownFieldset =
    fieldset && [...fieldset.querySelectorAll('input, textarea, select')].every((c) => group.includes(c as HTMLInputElement));
  const legend = ownFieldset ? cleanText(fieldset.querySelector(':scope > legend')?.textContent) : undefined;
  return {
    widget: 'radio',
    label: (container && labelledByText(container)) ?? legend,
    name: first.name,
    autocomplete: first.getAttribute('autocomplete') || undefined,
    ariaLabel: cleanText(container?.getAttribute('aria-label')),
    // 그룹 전용 fieldset은 섹션이 아니므로 바깥에서 섹션 탐색
    section: resolveSection(ownFieldset ? fieldset.parentElement : first, heading),
    options: group.map((r) => ({
      value: r.value,
      text: resolveLabel(r) ?? cleanText(r.getAttribute('aria-label')) ?? r.value,
    })),
  };
}

export function collectPageDetails(): PageDetails {
  elements.clear();
  const fields: FieldDescriptor[] = [];
  let heading: string | undefined;
  // 제목과 입력란을 문서 순서로 함께 순회해 직전 제목 추적
  const nodes = document.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6, input, textarea, select');
  nodes.forEach((node) => {
    if (HEADING.test(node.tagName)) {
      heading = cleanText(node.textContent);
      return;
    }
    const el = node as FillElement;
    if (!isFillable(el)) return;
    let descriptor: Omit<FieldDescriptor, 'fieldId'>;
    if (isRadio(el)) {
      if (!el.name) return;
      // 그룹의 첫 radio에서만 입력란 1개로 수집
      const group = radioGroup(el).filter(isFillable);
      if (group[0] !== el) return;
      descriptor = describeRadio(group, heading);
    } else {
      descriptor = describe(el, heading);
    }
    const fieldId = String(elements.size);
    elements.set(fieldId, el);
    fields.push({ fieldId, ...descriptor });
  });
  return { url: location.origin + location.pathname, fields };
}
