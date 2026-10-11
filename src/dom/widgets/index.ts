import { isCheckbox, isCheckboxGroup, isFormControl, isRadio, type FillElement } from '../collect';
import { fillCheckbox, fillCheckboxes, readCheckboxes } from './checkbox';
import { fillCombobox, readCombobox } from './combobox';
import { fillRadio, readRadio } from './radio';
import { fillSelect } from './select';
import { fillText } from './text';

/** 요소 종류별 입력 전략 (콤보박스는 열고 고르는 동안 대기) */
export async function fillElement(el: FillElement, value: string): Promise<boolean> {
  if (!isFormControl(el)) return fillCombobox(el, value);
  if (el instanceof HTMLSelectElement) return fillSelect(el, value);
  if (isRadio(el)) return fillRadio(el, value);
  if (isCheckboxGroup(el)) return fillCheckboxes(el, value);
  if (isCheckbox(el)) return fillCheckbox(el, value);
  return fillText(el, value);
}

/** 현재 값 (radio는 그룹에서 선택된 value, checkbox는 'true'/'false', checkbox 그룹은 체크된 value JSON 배열, 콤보박스는 표시 텍스트) */
export function readValue(el: FillElement): string {
  if (!isFormControl(el)) return readCombobox(el);
  if (isRadio(el)) return readRadio(el);
  if (isCheckboxGroup(el)) return readCheckboxes(el);
  if (isCheckbox(el)) return String(el.checked);
  return el.value;
}
