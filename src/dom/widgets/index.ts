import { isCheckbox, isCheckboxGroup, isFile, isFormControl, isRadio, type FillElement } from '../collect';
import { fillCheckbox, fillCheckboxes, readCheckboxes } from './checkbox';
import { fillCombobox, isSearchable, pickListSuggestion, pickSuggestion, readCombobox, visibleLists } from './combobox';
import { fillFile } from './file';
import { fillRadio, readRadio } from './radio';
import { fillSelect } from './select';
import { fillText } from './text';

/** ARIA 없는 자동완성일 수 있는 항목 (학교명·전공·회사명) — 목록 대기 시간이 들어 이 키만 확인 */
const AUTOCOMPLETE_KEY = /^(education\.\d+\.(school|major)|work\.\d+\.company)\b/;

/**
 * 요소 종류별 입력 전략 (콤보박스는 열고 고르는 동안 대기)
 * schemaKey: 자동 입력·직접 입력 항목 (되돌리기 복원은 없음)
 */
export async function fillElement(el: FillElement, value: string, schemaKey?: string): Promise<boolean> {
  if (!isFormControl(el)) return fillCombobox(el, value);
  if (el instanceof HTMLSelectElement) return fillSelect(el, value);
  if (isRadio(el)) return fillRadio(el, value);
  if (isCheckboxGroup(el)) return fillCheckboxes(el, value);
  if (isCheckbox(el)) return fillCheckbox(el, value);
  if (isFile(el)) return fillFile(el, value);
  // 검색형 콤보박스: 입력 후 후보 확정 (되돌리기의 빈 값 복원은 제외)
  const searchable = !!value && el instanceof HTMLInputElement;
  const before = searchable && !isSearchable(el) && schemaKey && AUTOCOMPLETE_KEY.test(schemaKey) ? visibleLists() : undefined;
  const ok = fillText(el, value);
  if (!ok || !searchable) return ok;
  if (isSearchable(el)) await pickSuggestion(el, value);
  else if (before) return pickListSuggestion(el, value, before);
  return ok;
}

/**
 * 현재 값 (radio는 그룹에서 선택된 value, checkbox는 'true'/'false', checkbox 그룹은 체크된 value JSON 배열,
 * 콤보박스는 표시 텍스트, 파일은 '' — 선택된 파일은 되돌리기용으로 보관하지 않음)
 */
export function readValue(el: FillElement): string {
  if (!isFormControl(el)) return readCombobox(el);
  if (isRadio(el)) return readRadio(el);
  if (isCheckboxGroup(el)) return readCheckboxes(el);
  if (isCheckbox(el)) return String(el.checked);
  if (isFile(el)) return '';
  return el.value;
}
