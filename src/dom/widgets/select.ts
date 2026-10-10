// 기본 select 입력: docs/reports/06_generic_widget_strategy.md 2.1
// 프로토타입의 네이티브 value setter 호출 후 이벤트 발생 (fillText와 같은 방식)

export function fillSelect(el: HTMLSelectElement, value: string): boolean {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
  el.focus();
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.blur();

  // 검증: 값 재확인 (해당 value 옵션이 없으면 빈 값)
  return el.value === value;
}
