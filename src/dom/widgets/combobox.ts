import { isVisible } from '../collect';

// ARIA 콤보박스(선택 전용 커스텀 드롭다운): docs/reports/06_generic_widget_strategy.md 2.2
// 열기(실제 클릭과 같은 포인터·마우스 이벤트) → role=option 출현 대기 → 선택지 텍스트가 같은 항목 클릭 → 표시 텍스트로 검증
// 선택지 value는 표시 텍스트 (ARIA option에는 value가 없음)
// 검색형 콤보박스(자동완성 입력란, 2.3)는 텍스트 입력 후 후보 목록에서 일치 항목 클릭 (pickSuggestion)
// ARIA 미준수 커스텀 드롭다운(2.4, docs/reports/07_site_dom_survey.md 3.2)도 같은 흐름: 목록은 형제 ul·ol, 값은 형제 숨은 input
// ARIA 없는 자동완성(07 6장)은 입력 후 새로 보인 ul·ol의 li 클릭 (pickListSuggestion)

const OPEN_TIMEOUT_MS = 1000;
const SELECT_TIMEOUT_MS = 500;
const SUGGEST_TIMEOUT_MS = 800;
// ARIA 없는 자동완성: 키 입력에 주변 DOM이 반응하면 서버 검색 지연까지 목록 대기, 반응이 없으면 짧게 (대상 입력란만, widgets/index.ts)
const LIST_SUGGEST_TIMEOUT_MS = 1500;
const REACT_TIMEOUT_MS = 300;

const textOf = (el: Element) => el.textContent?.replace(/\s+/g, ' ').trim() ?? '';
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 실제 클릭과 같은 순서의 이벤트 (mousedown에 여는 위젯·click에 여는 위젯 모두 대응) */
function press(el: HTMLElement): void {
  const init = { bubbles: true, cancelable: true, view: window };
  el.dispatchEvent(new PointerEvent('pointerdown', init));
  el.dispatchEvent(new MouseEvent('mousedown', init));
  el.focus();
  el.dispatchEvent(new PointerEvent('pointerup', init));
  el.dispatchEvent(new MouseEvent('mouseup', init));
  el.dispatchEvent(new MouseEvent('click', init));
}

/** listbox: aria-controls·aria-owns 대상. portal: 대상이 없으면 문서에서 보이는 마지막 listbox (열린 뒤에만 사용) */
function listboxOf(el: HTMLElement, portal: boolean): Element | undefined {
  for (const attr of ['aria-controls', 'aria-owns']) {
    for (const id of el.getAttribute(attr)?.split(/\s+/) ?? []) {
      const target = id ? document.getElementById(id) : null;
      if (target) return target.matches('[role=listbox]') ? target : (target.querySelector('[role=listbox]') ?? target);
    }
  }
  return portal ? [...document.querySelectorAll('[role=listbox]')].filter(isVisible).at(-1) : undefined;
}

function optionsIn(listbox: Element | undefined): HTMLElement[] {
  if (!listbox) return [];
  return [...listbox.querySelectorAll<HTMLElement>('[role=option]')].filter((o) => o.getAttribute('aria-disabled') !== 'true');
}

/** 커스텀 드롭다운의 값 보관 input: 트리거의 형제 input[type=hidden][name] */
function hiddenInputOf(el: HTMLElement): HTMLInputElement | undefined {
  return [...(el.parentElement?.children ?? [])].find((c): c is HTMLInputElement => c !== el && c.matches('input[type=hidden][name]'));
}

/**
 * ARIA 미준수 커스텀 드롭다운이면 선택지 목록: 트리거 버튼의 형제(또는 그 안)에 li가 있는 ul·ol이 있고 형제 숨은 input이 값을 보관
 * (목록이 수집 시점에 숨어 있는지는 collect에서 판별)
 */
export function customListOf(el: HTMLElement): HTMLElement | undefined {
  if (!el.matches('button, [role=button]') || !hiddenInputOf(el)) return undefined;
  for (const sibling of el.parentElement!.children) {
    if (sibling === el) continue;
    const list = sibling.matches('ul, ol') ? sibling : sibling.querySelector('ul, ol');
    if (list?.querySelector(':scope > li')) return list as HTMLElement;
  }
  return undefined;
}

/** 선택지: 커스텀 목록의 li(안의 버튼·링크) → ARIA listbox의 option */
function optionsOf(el: HTMLElement, portal: boolean): HTMLElement[] {
  const custom = customListOf(el);
  if (custom) return [...custom.querySelectorAll<HTMLElement>(':scope > li')].map((li) => li.querySelector<HTMLElement>('button, a') ?? li);
  return optionsIn(listboxOf(el, portal));
}

function isOpen(el: HTMLElement): boolean {
  const custom = customListOf(el);
  return custom ? isVisible(custom) : el.getAttribute('aria-expanded') === 'true';
}

async function waitFor<T>(get: () => T | undefined, timeout: number): Promise<T | undefined> {
  const end = Date.now() + timeout;
  for (;;) {
    const value = get();
    if (value !== undefined) return value;
    if (Date.now() > end) return undefined;
    await sleep(30);
  }
}

/** 열어서 보이는 선택지 (열리지 않으면 빈 배열) */
async function open(el: HTMLElement): Promise<HTMLElement[]> {
  const visible = () => {
    const options = optionsOf(el, true).filter(isVisible);
    return options.length ? options : undefined;
  };
  if (!isOpen(el)) press(el);
  return (await waitFor(visible, OPEN_TIMEOUT_MS)) ?? [];
}

/** Esc로 닫고, 여전히 열려 있으면 다시 눌러 닫음 */
function close(el: HTMLElement): void {
  const init = { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true };
  (document.activeElement ?? el).dispatchEvent(new KeyboardEvent('keydown', init));
  if (isOpen(el)) press(el);
}

/** 수집용 선택지: 연결된 listbox·커스텀 목록에 선택지가 이미 있으면 그대로(숨어 있어도 텍스트는 읽힘), 없으면 열어서 읽고 닫음 */
export async function comboboxOptions(el: HTMLElement): Promise<{ value: string; text: string }[]> {
  let options = optionsOf(el, false);
  const opened = options.length === 0;
  if (opened) options = await open(el);
  const texts = [...new Set(options.map(textOf).filter(Boolean))];
  if (opened) close(el);
  return texts.map((text) => ({ value: text, text }));
}

/** 현재 표시 값 (커스텀 드롭다운은 숨은 input이 비어 있으면 미선택 → '선택' 같은 안내 문구 대신 '') */
export function readCombobox(el: HTMLElement): string {
  if (el instanceof HTMLInputElement) return el.value;
  const hidden = customListOf(el) && hiddenInputOf(el);
  return hidden && !hidden.value ? '' : textOf(el);
}

/** 검색형 콤보박스: input[role=combobox] 또는 aria-autocomplete=list|both */
export function isSearchable(el: HTMLInputElement): boolean {
  return el.getAttribute('role') === 'combobox' || /^(list|both)$/.test(el.getAttribute('aria-autocomplete') ?? '');
}

const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, '');

/**
 * 검색어 입력 후 후보 목록에서 확정: 텍스트가 같은 후보 → 검색어를 포함하는 후보가 하나뿐이면 그 후보 클릭
 * 후보가 안 뜨거나 맞는 후보가 없으면 입력한 텍스트 그대로 둠 (자유 입력 허용 위젯, Esc는 입력값을 지우는 위젯이 있어 보내지 않음)
 * 반환: 후보를 클릭했는지
 */
export async function pickSuggestion(el: HTMLInputElement, value: string): Promise<boolean> {
  const target = normalize(value);
  const choose = () => {
    const options = optionsIn(listboxOf(el, true)).filter(isVisible);
    if (!options.length) return undefined;
    const contains = options.filter((o) => normalize(textOf(o)).includes(target));
    return options.find((o) => normalize(textOf(o)) === target) ?? (contains.length === 1 ? contains[0] : null);
  };
  const option = await waitFor(choose, SUGGEST_TIMEOUT_MS);
  if (option) press(option);
  return !!option;
}

/** 보이는 목록(ul·ol) — ARIA 없는 자동완성의 입력 전 상태 기록용 */
export function visibleLists(): Set<Element> {
  return new Set([...document.querySelectorAll('ul, ol')].filter(isVisible));
}

/** 입력 후 새로 보인 목록: 입력란 가까운 조상(4단계) 안을 우선, 없으면 문서의 마지막 목록 (portal) */
function newListNear(el: HTMLElement, before: Set<Element>): Element | undefined {
  const lists = [...document.querySelectorAll('ul, ol')].filter((l) => !before.has(l) && isVisible(l) && l.querySelector('li'));
  let ancestor = el.parentElement;
  for (let depth = 0; ancestor && depth < 4; depth++, ancestor = ancestor.parentElement) {
    const near = lists.find((l) => ancestor!.contains(l));
    if (near) return near;
  }
  return lists.at(-1);
}

/**
 * ARIA 없는 자동완성(사람인·잡코리아 학교명·전공명, docs/reports/07_site_dom_survey.md 6장): 텍스트 입력 후 새로 보인 목록에서
 * 같은 텍스트 → 포함 후보 하나 → 검색어로 시작하는 첫 후보('서울대학교 (관악)') 클릭
 * 목록이 안 뜨면 입력값 유지(true), 목록이 떴는데 맞는 후보가 없으면 false — 사이트가 고르지 않은 값을 지우므로 확인 필요로 보고
 * before: 입력 전 보이던 목록 (visibleLists)
 */
export async function pickListSuggestion(el: HTMLInputElement, value: string, before: Set<Element>): Promise<boolean> {
  const target = normalize(value);
  // 입력란 주변이 바로 바뀌지 않으면(자동완성 아님) 목록을 기다리지 않음 — 잡코리아는 수 ms 안에 바뀌고 목록은 약 0.2초 뒤 표시
  let scope: HTMLElement = el;
  for (let depth = 0; depth < 4 && scope.parentElement; depth++) scope = scope.parentElement;
  let reacted = false;
  const observer = new MutationObserver(() => (reacted = true));
  observer.observe(scope, { subtree: true, childList: true, attributes: true });
  // 키 입력에 반응하는 자동완성 대비 (값은 fillText가 이미 설정)
  el.focus();
  const key = { key: value.at(-1) ?? '', bubbles: true };
  el.dispatchEvent(new KeyboardEvent('keydown', key));
  el.dispatchEvent(new KeyboardEvent('keyup', key));
  const start = Date.now();
  const choose = () => {
    const list = newListNear(el, before);
    if (!list) return !reacted && Date.now() - start > REACT_TIMEOUT_MS ? false : undefined;
    const items = [...list.querySelectorAll<HTMLElement>(':scope > li')].filter(isVisible);
    const text = (li: HTMLElement) => normalize(textOf(li));
    const contains = items.filter((li) => text(li).includes(target));
    return (
      items.find((li) => text(li) === target) ??
      (contains.length === 1 ? contains[0] : items.find((li) => text(li).startsWith(target))) ??
      null
    );
  };
  // 후보 요소 → 클릭, null → 맞는 후보 없음, false·undefined → 목록 없음 (반응 없음·시간 초과)
  const item = await waitFor(choose, LIST_SUGGEST_TIMEOUT_MS);
  observer.disconnect();
  if (item) press(item.querySelector<HTMLElement>('a, button') ?? item);
  el.blur();
  return item !== null;
}

export async function fillCombobox(el: HTMLElement, value: string): Promise<boolean> {
  // 이미 선택된 값이면 다시 고르지 않음 (선택 시 폼을 다시 그리는 위젯 대비)
  if (value && readCombobox(el) === value) return true;
  const target = (await open(el)).find((o) => textOf(o) === value);
  if (!target) {
    close(el);
    return false;
  }
  const hidden = customListOf(el) && hiddenInputOf(el);
  const before = hidden?.value;
  press(target);
  // 표시 텍스트·aria-selected, 커스텀은 숨은 input 값 변경으로 검증
  const selected = () =>
    readCombobox(el).includes(value) || target.getAttribute('aria-selected') === 'true' || (hidden && hidden.value !== before)
      ? true
      : undefined;
  const ok = !!(await waitFor(selected, SELECT_TIMEOUT_MS));
  if (isOpen(el)) close(el);
  return ok;
}
