// 단일 checkbox 입력: 값 'true'/'false' → 상태가 다를 때만 click()
// (radio와 같이 React 등은 click 이벤트로 변경을 처리)

export function fillCheckbox(el: HTMLInputElement, value: string): boolean {
  const want = value === 'true';
  if (el.checked !== want) el.click();
  return el.checked === want;
}
