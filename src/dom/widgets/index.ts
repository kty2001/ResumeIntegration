import { isRadio, type FillElement } from '../collect';
import { fillRadio, readRadio } from './radio';
import { fillSelect } from './select';
import { fillText } from './text';

/** 요소 종류별 입력 전략 */
export function fillElement(el: FillElement, value: string): boolean {
  if (el instanceof HTMLSelectElement) return fillSelect(el, value);
  if (isRadio(el)) return fillRadio(el, value);
  return fillText(el, value);
}

/** 현재 값 (radio는 그룹에서 선택된 value) */
export function readValue(el: FillElement): string {
  return isRadio(el) ? readRadio(el) : el.value;
}
