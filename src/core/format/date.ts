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

function yearMonthPatternFromPlaceholder(placeholder: string): DatePattern | undefined {
  // 형식 문자열: YYYY.MM, yy-mm, YYYYMM (뒤에 일자 없음)
  const token = placeholder.match(/(y{4}|y{2})([.\-/ ]?)mm(?![.\-/ ]?dd)/i);
  if (token) return { yearDigits: token[1]!.length === 4 ? 4 : 2, sep: token[2]! };
  // 예시값: 2020.03, 202003 (연도 4자리만, 뒤에 일자 없음)
  const example = placeholder.match(/(?<!\d)(\d{4})([.\-/]?)(0[1-9]|1[0-2])(?![.\-/]?\d)/);
  if (example) return { yearDigits: 4, sep: example[2]! };
  return undefined;
}

/** 연월(YYYY-MM) → 입력란 형식. 신호 없으면 저장값 그대로 */
export function formatYearMonth(value: string, hint: FormatHint): string {
  const m = value.match(/^(\d{4})-(\d{2})$/);
  if (!m || hint.widget === 'date') return value;
  const pattern =
    (hint.placeholder && yearMonthPatternFromPlaceholder(hint.placeholder)) ||
    (hint.maxLength === 6 ? { yearDigits: 4, sep: '' } : undefined);
  if (!pattern) return value;
  const year = pattern.yearDigits === 4 ? m[1]! : m[1]!.slice(2);
  return [year, m[2]].join(pattern.sep);
}

/** 연월 또는 연월일(PartialDate) → 입력란 형식. 연월일 값을 연월 입력란에 넣을 때는 연월만 */
export function formatPartialDate(value: string, hint: FormatHint): string {
  if (/^\d{4}-\d{2}$/.test(value)) return formatYearMonth(value, hint);
  const date = formatDate(value, hint);
  if (date !== value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return date;
  const yearMonth = value.slice(0, 7);
  const formatted = formatYearMonth(yearMonth, hint);
  return formatted !== yearMonth ? formatted : value;
}

export function formatDate(value: string, hint: FormatHint): string {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m || hint.widget === 'date') return value;
  const pattern = (hint.placeholder && patternFromPlaceholder(hint.placeholder)) || patternFromMaxLength(hint.maxLength);
  if (!pattern) return value;
  const year = pattern.yearDigits === 4 ? m[1]! : m[1]!.slice(2);
  return [year, m[2], m[3]].join(pattern.sep);
}
