import type { FormatHint } from '@/messaging/protocol';
import { formatDate } from './date';
import { formatPhone } from './phone';

// 저장 형식 → 입력란 형식 변환 (docs/design/resume_schema_v1.md 2장: 변환은 입력 시점)

const FORMATTERS: Record<string, (value: string, hint: FormatHint) => string> = {
  'basics.birthDate': formatDate,
  'basics.phone.mobile': formatPhone,
  'basics.phone.home': formatPhone,
};

export function formatValue(schemaKey: string, value: string, hint: FormatHint): string {
  return FORMATTERS[schemaKey]?.(value, hint) ?? value;
}
