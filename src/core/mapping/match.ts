import type { Resume } from '@/core/schema/resume';
import { formatValue } from '@/core/format';
import type { FieldDescriptor, FillPlan, FormatHint, MatchSource } from '@/messaging/protocol';
import { FIELD_RULES } from './dictionary';
import { fieldFingerprint } from './learned';

// 매핑 순서: 학습 규칙 → autocomplete 속성 → 키워드 사전 (docs/design/architecture.md 7.1)

function normalizeAutocomplete(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t && !t.startsWith('section-') && t !== 'shipping' && t !== 'billing')
    .join(' ');
}

/** learned: 해당 origin의 fingerprint → schemaKey (learned.ts rulesForOrigin) */
export function matchField(
  field: FieldDescriptor,
  learned?: Map<string, string>,
): { schemaKey: string; source: MatchSource } | null {
  const fingerprint = learned && fieldFingerprint(field);
  const learnedKey = fingerprint && learned.get(fingerprint);
  if (learnedKey) return { schemaKey: learnedKey, source: 'learned' };
  if (field.autocomplete) {
    const ac = normalizeAutocomplete(field.autocomplete);
    const rule = FIELD_RULES.find((r) => r.autocomplete.includes(ac));
    if (rule) return { schemaKey: rule.schemaKey, source: 'autocomplete' };
  }
  // 신뢰도 높은 텍스트부터 검사
  const texts = [field.label, field.ariaLabel, field.placeholder, field.name, field.id];
  for (const text of texts) {
    if (!text) continue;
    const rule = FIELD_RULES.find((r) => r.pattern.test(text) && !r.exclude?.test(text));
    if (rule) return { schemaKey: rule.schemaKey, source: 'rule' };
  }
  return null;
}

/** 'basics.name.ko' 같은 점 경로로 이력서 값 조회 (비어 있으면 undefined) */
export function getValueByKey(resume: Resume, schemaKey: string): string | undefined {
  let cur: unknown = resume;
  for (const part of schemaKey.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  if (typeof cur === 'number') return String(cur);
  return typeof cur === 'string' && cur.trim() ? cur : undefined;
}

/** 이력서 값을 입력란 형식으로 변환해 조회 */
export function resolveValue(resume: Resume, schemaKey: string, hint: FormatHint): string | undefined {
  const value = getValueByKey(resume, schemaKey);
  return value && formatValue(schemaKey, value, hint);
}

export function mapFields(fields: FieldDescriptor[], resume: Resume, learned?: Map<string, string>): FillPlan {
  const plan: FillPlan = { items: [], unmatched: [] };
  for (const field of fields) {
    const match = matchField(field, learned);
    const value = match && resolveValue(resume, match.schemaKey, field);
    if (match && value) plan.items.push({ fieldId: field.fieldId, schemaKey: match.schemaKey, value, source: match.source });
    else plan.unmatched.push(field.fieldId);
  }
  return plan;
}
