import type { Resume } from '@/core/schema/resume';
import { formatValue } from '@/core/format';
import type { FieldDescriptor, FillPlan, FormatHint, MatchSource } from '@/messaging/protocol';
import { FIELD_RULES, SECTION_FIELD_RULES, SECTION_RULES, type RuleSection } from './dictionary';
import { fieldFingerprint, type LearnedMatch } from './learned';
import { enumLabel, matchOption, normalizeOption } from './options';

// 매핑 순서: 학습 규칙 → autocomplete 속성 → 키워드 사전 (docs/design/architecture.md 7.1)

function normalizeAutocomplete(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t && !t.startsWith('section-') && t !== 'shipping' && t !== 'billing')
    .join(' ');
}

/** learned: 해당 origin의 fingerprint → 학습 정보 (learned.ts rulesForOrigin) */
export function matchField(
  field: FieldDescriptor,
  learned?: Map<string, LearnedMatch>,
): { schemaKey: string; source: MatchSource; option?: LearnedMatch['option'] } | null {
  const fingerprint = learned && fieldFingerprint(field);
  const rule = fingerprint && learned.get(fingerprint);
  if (rule) return { schemaKey: rule.schemaKey, source: 'learned', option: rule.option };
  if (field.autocomplete) {
    const ac = normalizeAutocomplete(field.autocomplete);
    const rule = FIELD_RULES.find((r) => r.autocomplete.includes(ac));
    if (rule) return { schemaKey: rule.schemaKey, source: 'autocomplete' };
  }
  // 섹션이 판별되면 해당 섹션 규칙만, 아니면 basics 규칙만 검사 (섹션 안 '주소' 등의 basics 오입력 방지)
  const section = detectSection(field);
  const rules = section ? SECTION_FIELD_RULES.filter((r) => r.section === section) : FIELD_RULES;
  // 신뢰도 높은 텍스트부터 검사
  const texts = [field.label, field.ariaLabel, field.placeholder, field.name, field.id];
  for (const text of texts) {
    if (!text) continue;
    const rule = rules.find((r) => r.pattern.test(text) && !r.exclude?.test(text));
    if (rule) return { schemaKey: rule.schemaKey, source: 'rule' };
  }
  return null;
}

/** 입력란 텍스트 → 섹션 텍스트 순으로 섹션 판별. 한 텍스트에 두 섹션이 함께 걸리면 다음 텍스트로 */
export function detectSection(field: FieldDescriptor): RuleSection | undefined {
  const texts = [field.label, field.ariaLabel, field.placeholder, field.name, field.id, field.section];
  for (const text of texts) {
    if (!text) continue;
    const hits = SECTION_RULES.filter((r) => r.pattern.test(text));
    if (hits.length === 1) return hits[0]!.section;
  }
  return undefined;
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

/** 학습한 선택지: 이력서 값이 학습 당시와 같을 때만, 같은 텍스트의 선택지가 있으면 그 value */
function learnedOptionValue(value: string, hint: FormatHint, option?: LearnedMatch['option']): string | undefined {
  if (!option || option.value !== value) return undefined;
  const text = normalizeOption(option.text);
  return hint.options?.find((o) => normalizeOption(o.text) === text)?.value;
}

/**
 * 이력서 값을 입력란 형식으로 변환해 조회. select는 선택지 value(학습 선택지 우선), 텍스트 입력란의 enum 값은 표시명
 * option: 학습 규칙의 선택지 (matchField 반환값)
 */
export function resolveValue(
  resume: Resume,
  schemaKey: string,
  hint: FormatHint,
  option?: LearnedMatch['option'],
): string | undefined {
  const value = getValueByKey(resume, schemaKey);
  if (!value) return undefined;
  if (hint.widget === 'select')
    return learnedOptionValue(value, hint, option) ?? matchOption(schemaKey, value, hint.options ?? []);
  return enumLabel(schemaKey, value) ?? formatValue(schemaKey, value, hint);
}

export function mapFields(fields: FieldDescriptor[], resume: Resume, learned?: Map<string, LearnedMatch>): FillPlan {
  const skipped: NonNullable<FillPlan['skipped']> = [];
  const plan: FillPlan = { items: [], unmatched: [], skipped };
  // 반복 항목 키('education.*.school.ko')는 페이지 등장 순서대로 인덱스 부여
  const counts = new Map<string, number>();
  for (const field of fields) {
    const match = matchField(field, learned);
    let schemaKey = match?.schemaKey;
    if (schemaKey?.includes('*')) {
      const index = counts.get(schemaKey) ?? 0;
      counts.set(schemaKey, index + 1);
      schemaKey = schemaKey.replace('*', String(index));
    }
    const value = schemaKey && resolveValue(resume, schemaKey, field, match?.option);
    if (match && schemaKey && value) plan.items.push({ fieldId: field.fieldId, schemaKey, value, source: match.source });
    // 이력서 값은 있지만 맞는 선택지 없음 → '확인 필요'로 사이드 패널에서 직접 선택
    else if (schemaKey && field.widget === 'select' && getValueByKey(resume, schemaKey))
      skipped.push({ fieldId: field.fieldId, schemaKey, reason: 'no-option' });
    else plan.unmatched.push(field.fieldId);
  }
  return plan;
}
