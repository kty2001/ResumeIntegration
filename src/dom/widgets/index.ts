import { isCheckbox, isRadio, type FillElement } from '../collect';
import { fillCheckbox } from './checkbox';
import { fillRadio, readRadio } from './radio';
import { fillSelect } from './select';
import { fillText } from './text';

/** 요소 종류별 입력 전략 */
export function fillElement(el: FillElement, value: string): boolean {
  if (el instanceof HTMLSelectElement) return fillSelect(el, value);
  if (isRadio(el)) return fillRadio(el, value);
  if (isCheckbox(el)) return fillCheckbox(el, value);
  return fillText(el, value);
}

/** 현재 값 (radio는 그룹에서 선택된 value, checkbox는 'true'/'false') */
export function readValue(el: FillElement): string {
  if (isRadio(el)) return readRadio(el);
  if (isCheckbox(el)) return String(el.checked);
  return el.value;
}
