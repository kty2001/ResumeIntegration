import type { TextElement } from '../collect';

// 텍스트 입력: 프로토타입의 네이티브 value setter 호출 후 이벤트 발생
// → React 등 제어 컴포넌트가 인스턴스 setter를 덮어써도 내부 상태에 반영됨
// 입력 마스크(docs/reports/06_generic_widget_strategy.md 3.2): 마스크가 서식을 바꾼 값은 숫자가 같으면 성공,
// 한 번에 넣은 값을 되돌리는 마스크는 문자 단위 입력(InputEvent insertText)으로 재시도

function setValue(el: TextElement, value: string): void {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
}

const digits = (text: string) => text.replace(/\D/g, '');

/** 값이 같거나, 숫자가 들어간 값이면 마스크 서식(하이픈·점 등)을 빼고 숫자가 같은지 */
function applied(el: TextElement, value: string): boolean {
  if (el.value === value) return true;
  const d = digits(value);
  return d.length > 0 && /^[\d\s.\-/()]+$/.test(value) && digits(el.value) === d;
}

/** 키 입력처럼 한 글자씩 입력 (마스크가 InputEvent.data로 처리하는 경우) */
function typeChars(el: TextElement, value: string): void {
  setValue(el, '');
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
  for (const ch of value) {
    setValue(el, el.value + ch);
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ch }));
  }
}

export function fillText(el: TextElement, value: string): boolean {
  el.focus();
  setValue(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  if (!applied(el, value) && value) typeChars(el, value);
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.blur();

  // 검증: 값 재확인 (마스크 서식 차이는 허용)
  return applied(el, value);
}
