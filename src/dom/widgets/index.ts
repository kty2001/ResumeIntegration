import type { FillElement } from '../collect';
import { fillSelect } from './select';
import { fillText } from './text';

/** 요소 종류별 입력 전략 */
export function fillElement(el: FillElement, value: string): boolean {
  return el instanceof HTMLSelectElement ? fillSelect(el, value) : fillText(el, value);
}
