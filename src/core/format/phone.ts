import type { FormatHint } from '@/messaging/protocol';

// 전화번호 → 입력란 형식 (숫자만 / 하이픈)
// 형식 신호(placeholder·maxLength)가 있을 때만 변환, 없으면 저장값 그대로

// 숫자만: 안내 문구 또는 하이픈 없는 예시값(01012345678)
const DIGITS_ONLY = /숫자만|-['"‘’]?\s*(없이|제외|빼고)|하이픈\s*(없이|제외|빼고)|(?<![\d-])0\d{8,10}(?![\d-])/;
const WITH_HYPHEN = /\d+-\d+-\d+|-['"‘’]?\s*포함|하이픈\s*포함/;

/** 02-XXX(X)-XXXX, 0XX-XXX(X)-XXXX. 그 외 길이는 숫자 그대로 */
export function hyphenatePhone(digits: string): string {
  const m = digits.match(/^(02)(\d{3,4})(\d{4})$/) ?? digits.match(/^(0\d{2})(\d{3,4})(\d{4})$/);
  return m ? m.slice(1).join('-') : digits;
}

export function formatPhone(value: string, hint: FormatHint): string {
  const digits = value.replace(/\D/g, '');
  if (!digits) return value;
  const hyphenated = hyphenatePhone(digits);
  const placeholder = hint.placeholder ?? '';
  if (DIGITS_ONLY.test(placeholder)) return digits;
  if (hint.maxLength && hint.maxLength < hyphenated.length) return digits;
  if (WITH_HYPHEN.test(placeholder)) return hyphenated;
  return value;
}
