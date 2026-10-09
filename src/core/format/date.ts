import type { FormatHint } from '@/messaging/protocol';

// 날짜(YYYY-MM-DD) → 입력란 형식: docs/reports/06_generic_widget_strategy.md 3.2
// 형식 신호(type=date·placeholder·maxLength)가 있을 때만 변환, 없으면 저장값 그대로

interface DatePattern {
  yearDigits: 2 | 4;
  sep: string;
}

function patternFromPlaceholder(placeholder: string): DatePattern | undefined {
  // 형식 문자열: YYYY.MM.DD, yy-mm-dd, YYYYMMDD
  const token = placeholder.match(/(y{4}|y{2})([.\-/ ]?)mm\2dd/i);
  if (token) return { yearDigits: token[1]!.length === 4 ? 4 : 2, sep: token[2]! };
  // 예시값: 1990.01.01, 19900101, 900101
  const example = placeholder.match(/(?<!\d)(\d{4}|\d{2})([.\-/]?)\d{2}\2\d{2}(?!\d)/);
  if (example) return { yearDigits: example[1]!.length === 4 ? 4 : 2, sep: example[2]! };
  // 자릿수 안내: '8자리', '6자리'
  if (/8\s*자리/.test(placeholder)) return { yearDigits: 4, sep: '' };
  if (/6\s*자리/.test(placeholder)) return { yearDigits: 2, sep: '' };
  return undefined;
}

function patternFromMaxLength(maxLength?: number): DatePattern | undefined {
  if (maxLength === 8) return { yearDigits: 4, sep: '' };
  if (maxLength === 6) return { yearDigits: 2, sep: '' };
  return undefined;
}

export function formatDate(value: string, hint: FormatHint): string {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m || hint.widget === 'date') return value;
  const pattern = (hint.placeholder && patternFromPlaceholder(hint.placeholder)) || patternFromMaxLength(hint.maxLength);
  if (!pattern) return value;
  const year = pattern.yearDigits === 4 ? m[1]! : m[1]!.slice(2);
  return [year, m[2], m[3]].join(pattern.sep);
}
