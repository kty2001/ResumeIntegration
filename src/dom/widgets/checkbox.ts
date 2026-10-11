import { inputGroup } from '../collect';

// 단일 checkbox 입력: 값 'true'/'false' → 상태가 다를 때만 click()
// (radio와 같이 React 등은 click 이벤트로 변경을 처리)
// checkbox 그룹: 값 = 체크할 value JSON 배열 → 목록과 정확히 일치하도록 체크·해제

export function fillCheckbox(el: HTMLInputElement, value: string): boolean {
  const want = value === 'true';
  if (el.checked !== want) el.click();
  return el.checked === want;
}

/** 그룹에서 체크된 value JSON 배열 */
export function readCheckboxes(first: HTMLInputElement): string {
  return JSON.stringify(
    inputGroup(first)
      .filter((c) => c.checked)
      .map((c) => c.value),
  );
}

export function fillCheckboxes(first: HTMLInputElement, value: string): boolean {
  let want: Set<string>;
  try {
    want = new Set(JSON.parse(value) as string[]);
  } catch {
    return false;
  }
  const group = inputGroup(first);
  for (const c of group) if (c.checked !== want.has(c.value)) c.click();
  return group.every((c) => c.checked === want.has(c.value));
}
