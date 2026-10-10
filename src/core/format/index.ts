import type { FormatHint } from '@/messaging/protocol';
import { formatDate, formatYearMonth } from './date';
import { formatPhone } from './phone';

// 저장 형식 → 입력란 형식 변환 (docs/design/resume_schema_v1.md 2장: 변환은 입력 시점)

// 반복 항목 키는 인덱스를 '*'로 정규화해 조회 (education.0.startDate → education.*.startDate)
const FORMATTERS: Record<string, (value: string, hint: FormatHint) => string> = {
  'basics.birthDate': formatDate,
  'basics.phone.mobile': formatPhone,
  'basics.phone.home': formatPhone,
  'education.*.startDate': formatYearMonth,
  'education.*.endDate': formatYearMonth,
  'work.*.startDate': formatYearMonth,
  'work.*.endDate': formatYearMonth,
};

export function formatValue(schemaKey: string, value: string, hint: FormatHint): string {
  return FORMATTERS[schemaKey.replace(/\.\d+\./, '.*.')]?.(value, hint) ?? value;
}
