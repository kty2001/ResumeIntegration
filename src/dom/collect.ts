import type { FieldDescriptor, PageDetails } from '@/messaging/protocol';
import { comboboxOptions } from './widgets/combobox';

// 필드 수집 (Page Details): docs/design/architecture.md 5장
// 현재 범위: 최상위 문서의 text·textarea·date 입력란, 기본 select, radio 그룹(같은 form·name → 입력란 1개),
// 단일 checkbox(값 'true'/'false'), 다중 선택 checkbox 그룹(같은 form·name 2개 이상, 값 = 체크된 value JSON 배열),
// ARIA 콤보박스(선택 전용 커스텀 드롭다운, 선택지는 열어서 읽음), 파일 입력란(accept 포함)

export type TextElement = HTMLInputElement | HTMLTextAreaElement;
/** 폼 입력 요소. radio·checkbox 그룹은 그룹의 첫 입력란으로 보관 */
export type FormControl = TextElement | HTMLSelectElement;
/** ARIA 콤보박스는 div·button 등 일반 요소 */
export type FillElement = FormControl | HTMLElement;

// 입력형 콤보박스(input[role=combobox], 검색·자동완성)는 텍스트 입력란으로 처리
const COMBOBOX = '[role=combobox]:not(input), button[aria-haspopup=listbox]';

const TEXT_INPUT_TYPES = new Set(['text', 'email', 'tel', 'url', 'search', 'date']);

/** fieldId → 요소. DOM에 식별 속성을 추가하지 않고 메모리에만 보관 */
const elements = new Map<string, FillElement>();

/** checkbox 그룹으로 수집한 첫 checkbox (단일 checkbox와 구분) */
const checkboxGroups = new WeakSet<Element>();

export function getElement(fieldId: string): FillElement | undefined {
  return elements.get(fieldId);
}

/** 페이지 요소 → fieldId (radio·checkbox 그룹은 구성원 어느 것이든 그룹의 fieldId) */
export function fieldIdOf(target: Element): string | undefined {
  for (const [fieldId, el] of elements) {
    if (el === target) return fieldId;
    if ((isRadio(el) || isCheckboxGroup(el)) && target instanceof HTMLInputElement && inputGroup(el).includes(target))
      return fieldId;
  }
  return undefined;
}

export function isCheckboxGroup(el: Element): el is HTMLInputElement & { type: 'checkbox' } {
  return checkboxGroups.has(el);
}

export function isFormControl(el: Element): el is FormControl {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
}

// false 분기에서 HTMLInputElement 전체가 제외되지 않도록 type까지 좁힘
export function isRadio(el: Element): el is HTMLInputElement & { type: 'radio' } {
  return el instanceof HTMLInputElement && el.type === 'radio';
}

export function isCheckbox(el: Element): el is HTMLInputElement & { type: 'checkbox' } {
  return el instanceof HTMLInputElement && el.type === 'checkbox';
}

export function isFile(el: Element): el is HTMLInputElement & { type: 'file' } {
  return el instanceof HTMLInputElement && el.type === 'file';
}

/** 같은 type·form·name의 입력란 (radio·checkbox 그룹, 문서 순서) */
export function inputGroup(el: HTMLInputElement): HTMLInputElement[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>(`input[type=${el.type}]`)).filter(
    (r) => r.name === el.name && r.form === el.form,
  );
}

function isVisible(el: Element): boolean {
  return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
}

function isFillable(el: FormControl): boolean {
  if (el.disabled) return false;
  // 커스텀 디자인은 radio·checkbox·파일 입력란을 숨기고 label만 표시 → label이 보여도 입력 가능
  if (isRadio(el) || isCheckbox(el) || isFile(el)) return isVisible(el) || [...(el.labels ?? [])].some(isVisible);
  if (el instanceof HTMLInputElement && !TEXT_INPUT_TYPES.has(el.type)) return false;
  if (!(el instanceof HTMLSelectElement) && el.readOnly && !isDatePicker(el)) return false;
  // 커스텀 위젯 내부의 보조 입력란(aria-hidden)은 제외
  if (el.getAttribute('aria-hidden') === 'true') return false;
  return isVisible(el);
}

const DATE_LIKE = /date|calendar|picker|ymd|yyyy|birth|날짜|일자|연월|년월|생년|기간|입학|졸업|입사|퇴사|취득|응시/i;

/**
 * 달력 팝업형 날짜 입력란(docs/reports/06_generic_widget_strategy.md 3.4): 직접 입력을 막은 readonly input 중
 * placeholder·name·id·class·label이 날짜로 보이는 것 → 값 직접 설정 (매핑은 날짜 키만, match.ts)
 */
function isDatePicker(el: TextElement): boolean {
  if (!(el instanceof HTMLInputElement)) return false;
  return [el.placeholder, el.name, el.id, el.className, resolveLabel(el)].some((t) => t && DATE_LIKE.test(t));
}

function isComboboxFillable(el: HTMLElement): boolean {
  if (el.getAttribute('aria-disabled') === 'true' || (el instanceof HTMLButtonElement && el.disabled)) return false;
  // 다른 콤보박스 안의 버튼 등 중첩 요소는 바깥 콤보박스만 수집
  return !el.parentElement?.closest(COMBOBOX) && isVisible(el);
}

function cleanText(text: string | null | undefined): string | undefined {
  const t = text?.replace(/\s+/g, ' ').trim();
  return t || undefined;
}

/** aria-labelledby 텍스트 (자기 자신 id는 제외 — 콤보박스가 선택값을 이름에 포함하는 경우) */
function labelledByText(el: Element): string | undefined {
  const ids = el.getAttribute('aria-labelledby');
  if (!ids) return undefined;
  const text = ids
    .split(/\s+/)
    .filter((id) => id !== el.id)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ');
  return cleanText(text);
}

function resolveLabel(el: FillElement): string | undefined {
  // label[for] 또는 감싸는 label (감싼 경우 입력란 자체 텍스트 제외). div 콤보박스는 labels 없음
  const label = (el as Partial<HTMLInputElement>).labels?.[0];
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

function widgetOf(el: FormControl): FieldDescriptor['widget'] {
  if (el instanceof HTMLSelectElement) return 'select';
  if (el instanceof HTMLTextAreaElement) return 'textarea';
  if (isCheckbox(el)) return 'checkbox';
  if (isFile(el)) return 'file';
  return el.type === 'date' ? 'date' : 'text';
}

/** 선택지 (값 없는 안내 옵션·비활성 옵션 제외) */
function selectOptions(el: HTMLSelectElement): FieldDescriptor['options'] {
  return Array.from(el.options)
    .filter((o) => o.value !== '' && !o.disabled)
    .map((o) => ({ value: o.value, text: cleanText(o.text) ?? '' }));
}

/** 콤보박스: 선택지는 수집 마지막에 열어서 채움 (collectPageDetails) */
function describeCombobox(el: HTMLElement, heading: string | undefined): Omit<FieldDescriptor, 'fieldId'> {
  return {
    widget: 'combobox',
    label: resolveLabel(el),
    name: el.getAttribute('name') || undefined,
    id: el.id || undefined,
    ariaLabel: cleanText(el.getAttribute('aria-label')),
    section: resolveSection(el, heading),
  };
}

function describe(el: FormControl, heading: string | undefined): Omit<FieldDescriptor, 'fieldId'> {
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
    accept: isFile(el) ? el.accept || undefined : undefined,
    readOnly: !select && el.readOnly ? true : undefined,
  };
}

/**
 * radio·checkbox 그룹: 표시 텍스트는 role=radiogroup·group의 aria 이름 → 그룹 입력란만 담은 fieldset의 legend
 * (다른 입력란이 섞인 fieldset의 legend는 섹션명). id는 선택지별 값이라 제외
 */
function describeGroup(
  group: HTMLInputElement[],
  heading: string | undefined,
  widget: 'radio' | 'checkboxes',
): Omit<FieldDescriptor, 'fieldId'> {
  const first = group[0]!;
  const container = first.closest('[role=radiogroup], [role=group]');
  const fieldset = first.closest('fieldset');
  const ownFieldset =
    fieldset && [...fieldset.querySelectorAll('input, textarea, select')].every((c) => group.includes(c as HTMLInputElement));
  const legend = ownFieldset ? cleanText(fieldset.querySelector(':scope > legend')?.textContent) : undefined;
  return {
    widget,
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

export async function collectPageDetails(): Promise<PageDetails> {
  elements.clear();
  const fields: FieldDescriptor[] = [];
  const comboboxes: [FieldDescriptor, HTMLElement][] = [];
  let heading: string | undefined;
  // 제목과 입력란을 문서 순서로 함께 순회해 직전 제목 추적
  const nodes = document.querySelectorAll<HTMLElement>(`h1, h2, h3, h4, h5, h6, input, textarea, select, ${COMBOBOX}`);
  nodes.forEach((node) => {
    if (HEADING.test(node.tagName)) {
      heading = cleanText(node.textContent);
      return;
    }
    if (!isFormControl(node)) {
      if (!isComboboxFillable(node)) return;
      const field = { fieldId: String(elements.size), ...describeCombobox(node, heading) };
      elements.set(field.fieldId, node);
      fields.push(field);
      comboboxes.push([field, node]);
      return;
    }
    const el = node;
    if (!isFillable(el)) return;
    let descriptor: Omit<FieldDescriptor, 'fieldId'>;
    // 그룹은 첫 입력란에서만 입력란 1개로 수집
    // (name 없는 radio는 그룹을 알 수 없어 제외, name 없거나 하나뿐인 checkbox는 단일 checkbox)
    const group = (isRadio(el) || isCheckbox(el)) && el.name ? inputGroup(el).filter(isFillable) : undefined;
    if (isRadio(el)) {
      if (group?.[0] !== el) return;
      descriptor = describeGroup(group, heading, 'radio');
    } else if (group && group.length > 1) {
      if (group[0] !== el) return;
      checkboxGroups.add(el);
      descriptor = describeGroup(group, heading, 'checkboxes');
    } else {
      descriptor = describe(el, heading);
    }
    const fieldId = String(elements.size);
    elements.set(fieldId, el);
    fields.push({ fieldId, ...descriptor });
  });
  // 콤보박스 선택지: 하나씩 열고 닫으며 읽기 (동시에 열면 서로 닫힘)
  for (const [field, el] of comboboxes) field.options = await comboboxOptions(el);
  assignClusters(fields);
  return { url: location.origin + location.pathname, fields };
}

/**
 * 분리 입력 묶음: 가까운 조상(3단계 이내) 중 처음으로 다른 입력란도 담은 요소가
 * 입력란 2~6개만 담으면 같은 묶음 (폼 전체 같은 큰 컨테이너는 제외)
 */
function assignClusters(fields: FieldDescriptor[]): void {
  const els = fields.map((f) => elements.get(f.fieldId)!);
  const ids = new Map<Element, string>();
  fields.forEach((field, i) => {
    let ancestor = els[i]!.parentElement;
    for (let depth = 0; ancestor && depth < 3; depth++, ancestor = ancestor.parentElement) {
      const container = ancestor;
      const count = els.filter((e) => container.contains(e)).length;
      if (count < 2) continue;
      if (count <= 6) {
        if (!ids.has(container)) ids.set(container, String(ids.size));
        field.cluster = ids.get(container);
      }
      return;
    }
  });
}
