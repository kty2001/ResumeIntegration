import type { TextElement } from '../collect';

// 텍스트 입력: 프로토타입의 네이티브 value setter 호출 후 이벤트 발생
// → React 등 제어 컴포넌트가 인스턴스 setter를 덮어써도 내부 상태에 반영됨

export function fillText(el: TextElement, value: string): boolean {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  el.focus();
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.blur();

  // 검증: 값 재확인
  return el.value === value;
}
