import { itemPattern } from '@/core/schema/labels';
import type { FormatHint } from '@/messaging/protocol';
import { formatDate, formatPartialDate, formatYearMonth } from './date';
import { formatPhone } from './phone';

// 저장 형식 → 입력란 형식 변환 (docs/design/resume_schema_v1.md 2장: 변환은 입력 시점)

// 반복 항목 키는 인덱스를 '*'로 정규화해 조회 (itemPattern)
const FORMATTERS: Record<string, (value: string, hint: FormatHint) => string> = {
  'basics.birthDate': formatDate,
  'basics.phone.mobile': formatPhone,
  'basics.phone.home': formatPhone,
  'education.*.startDate': formatYearMonth,
  'education.*.endDate': formatYearMonth,
  'work.*.startDate': formatYearMonth,
  'work.*.endDate': formatYearMonth,
  'activities.*.startDate': formatYearMonth,
  'activities.*.endDate': formatYearMonth,
  'projects.*.startDate': formatYearMonth,
  'projects.*.endDate': formatYearMonth,
  'certificates.*.date': formatPartialDate,
  'languageTests.*.date': formatPartialDate,
  'languageTests.*.expiresAt': formatPartialDate,
  'awards.*.date': formatPartialDate,
  'military.startDate': formatYearMonth,
  'military.endDate': formatYearMonth,
  'desired.availableFrom': formatPartialDate,
};

const formatterOf = (schemaKey: string) => FORMATTERS[itemPattern(schemaKey)];

export function formatValue(schemaKey: string, value: string, hint: FormatHint): string {
  return formatterOf(schemaKey)?.(value, hint) ?? value;
}

/** 날짜 키의 저장 형식 (가져오기 역변환용): 연월일·연월·둘 다 허용. 날짜 키 아니면 undefined */
export function dateKind(schemaKey: string): 'date' | 'month' | 'partial' | undefined {
  const formatter = formatterOf(schemaKey);
  if (formatter === formatDate) return 'date';
  if (formatter === formatYearMonth) return 'month';
  return formatter === formatPartialDate ? 'partial' : undefined;
}

/** 날짜(연월·연월일) 키 — 달력 팝업형 readonly 입력란은 이 키만 입력 */
export function isDateKey(schemaKey: string): boolean {
  const formatter = formatterOf(schemaKey);
  return !!formatter && formatter !== formatPhone;
}
