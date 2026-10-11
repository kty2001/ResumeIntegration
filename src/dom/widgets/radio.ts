import { inputGroup } from '../collect';

// radio 그룹 입력: 대상 radio click() → checked 변경 + click·input·change 발생
// (React 등은 radio 변경을 click 이벤트로 처리하므로 checked setter보다 안전)

/** 그룹에서 선택된 value, 선택 없으면 '' */
export function readRadio(first: HTMLInputElement): string {
  return inputGroup(first).find((r) => r.checked)?.value ?? '';
}

/** value 일치 radio 선택. '' 이면 선택 해제 (되돌리기용) */
export function fillRadio(first: HTMLInputElement, value: string): boolean {
  const group = inputGroup(first);
  if (value === '') {
    for (const r of group.filter((r) => r.checked)) {
      r.checked = false;
      r.dispatchEvent(new Event('input', { bubbles: true }));
      r.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return group.every((r) => !r.checked);
  }
  const target = group.find((r) => r.value === value);
  if (!target) return false;
  if (!target.checked) target.click();
  return target.checked;
}
