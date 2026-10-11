import type { FormatHint } from '@/messaging/protocol';
import { hyphenatePhone } from './phone';

// 분리 입력: 전화번호(010 / 1234 / 5678)·날짜(연 / 월 / 일) 칸에 나눠 입력
// 칸 판별·묶음은 core/mapping/match.ts mapFields, 여기서는 칸 신호와 값 분할만 담당

const PHONE_KEYS = new Set(['basics.phone.mobile', 'basics.phone.home']);
const NUMERIC_OPTION = /^\d+\s*(년|월|일)?$/;

const digitsOf = (text: string) => text.replace(/\D/g, '');

/** 분할 칸이 될 수 있는 입력란: 짧은 텍스트(maxLength ≤ 4) 또는 선택지가 모두 숫자인 select */
export function isSplitPart(hint: FormatHint): boolean {
  if (hint.widget === 'text') return !!hint.maxLength && hint.maxLength <= 4;
  if (hint.widget !== 'select' || !hint.options?.length) return false;
  return hint.options.every((o) => NUMERIC_OPTION.test(o.text) || /^\d+$/.test(o.value));
}

/** 저장 값 → count칸 분할. 전화번호 2칸은 국번 + 나머지, 날짜는 앞에서부터. 지원하지 않으면 undefined */
export function splitValue(schemaKey: string, value: string, count: number): string[] | undefined {
  if (PHONE_KEYS.has(schemaKey)) {
    const parts = hyphenatePhone(digitsOf(value)).split('-');
    if (parts.length !== 3) return undefined;
    if (count === 3) return parts;
    return count === 2 ? [parts[0]!, parts[1]! + parts[2]!] : undefined;
  }
  const date = value.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (!date) return undefined;
  const parts = date.slice(1).filter((p): p is string => !!p);
  return count >= 2 && count <= parts.length ? parts.slice(0, count) : undefined;
}

/** 칸 값: 텍스트는 그대로, select는 숫자가 같은 선택지 value ('03' ↔ '3월', '010' ↔ '010') */
export function partValue(part: string, hint: FormatHint): string | undefined {
  if (hint.widget !== 'select') return part;
  const n = Number(part);
  return hint.options?.find((o) => {
    const digits = digitsOf(o.text) || digitsOf(o.value);
    return digits !== '' && Number(digits) === n;
  })?.value;
}
