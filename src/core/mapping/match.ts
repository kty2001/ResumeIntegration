import type { Resume } from '@/core/schema/resume';
import { formatValue, isDateKey } from '@/core/format';
import { schemaKeyOptions, SECTION_LABELS, type SectionKey } from '@/core/schema/labels';
import { isSplitPart, partValue, splitValue } from '@/core/format/split';
import type { AddButton, FieldDescriptor, FillPlan, FormatHint, MatchSource, WidgetKind } from '@/messaging/protocol';
import { attachmentFor } from '@/core/attachments';
import {
  FIELD_RULES,
  FILE_RULES,
  isSensitiveKey,
  SECTION_FIELD_RULES,
  SECTION_RULES,
  SENSITIVE_RULES,
  type RuleSection,
} from './dictionary';
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

/**
 * learned: 해당 origin의 fingerprint → 학습 정보 (learned.ts rulesForOrigin)
 * sensitive: 설정 '민감정보 자동 입력 사용' — 끄면 민감정보 키는 학습 규칙으로도 매칭하지 않음
 */
export function matchField(
  field: FieldDescriptor,
  learned?: Map<string, LearnedMatch>,
  sensitive = false,
): { schemaKey: string; source: MatchSource; option?: LearnedMatch['option'] } | null {
  const fingerprint = learned && fieldFingerprint(field);
  const rule = fingerprint && learned.get(fingerprint);
  if (rule && (sensitive || !isSensitiveKey(rule.schemaKey)))
    return { schemaKey: rule.schemaKey, source: 'learned', option: rule.option };
  const checkbox = field.widget === 'checkbox';
  const file = field.widget === 'file';
  if (field.autocomplete && !checkbox && !file) {
    const ac = normalizeAutocomplete(field.autocomplete);
    const rule = FIELD_RULES.find((r) => r.autocomplete?.includes(ac));
    if (rule) return { schemaKey: rule.schemaKey, source: 'autocomplete' };
  }
  // 섹션이 판별되면 해당 섹션 규칙만, 아니면 basics 규칙만 검사 (섹션 안 '주소' 등의 basics 오입력 방지)
  // checkbox는 boolean 규칙만, 그 외는 boolean 규칙 제외 ('이메일 수신 동의' 오매칭·반복 인덱스 밀림 방지)
  // 파일 입력란은 섹션과 무관하게 첨부 파일 규칙만 ('자격증 사본'이 자격증 섹션으로 판별되는 문제 방지)
  // 민감정보 규칙은 설정을 켰을 때만, 섹션과 무관하게 먼저
  const section = file ? undefined : detectSection(field);
  const rules = file
    ? FILE_RULES
    : [
        ...(sensitive ? SENSITIVE_RULES : []),
        ...(section ? SECTION_FIELD_RULES.filter((r) => r.section === section) : FIELD_RULES),
      ].filter((r) => !!r.checkbox === checkbox);
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
export function detectSection(
  field: Pick<FieldDescriptor, 'label' | 'ariaLabel' | 'placeholder' | 'name' | 'id' | 'section'>,
): RuleSection | undefined {
  const texts = [field.label, field.ariaLabel, field.placeholder, field.name, field.id, field.section];
  for (const text of texts) {
    if (!text) continue;
    const hits = SECTION_RULES.filter((r) => r.pattern.test(text));
    if (hits.length === 1) return hits[0]!.section;
  }
  return undefined;
}

/** 점 경로 값 조회 (가공 없음) */
export function getByPath(resume: Resume, schemaKey: string): unknown {
  let cur: unknown = resume;
  for (const part of schemaKey.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function scalarValue(cur: unknown): string | undefined {
  if (typeof cur === 'number') return String(cur);
  return typeof cur === 'string' && cur.trim() ? cur : undefined;
}

/** 이력서 값 목록: 배열(희망 근무지 등)은 비지 않은 원소들, 그 외는 단일 값 */
function listValues(resume: Resume, schemaKey: string): string[] {
  const cur = getByPath(resume, schemaKey);
  const values = Array.isArray(cur) ? cur.map(scalarValue) : [scalarValue(cur)];
  return values.filter((v): v is string => !!v);
}

/** 'basics.name.ko' 같은 점 경로로 이력서 값 조회 (비어 있으면 undefined, 배열은 ', ' 결합) */
export function getValueByKey(resume: Resume, schemaKey: string): string | undefined {
  const values = listValues(resume, schemaKey);
  return values.length > 0 ? values.join(', ') : undefined;
}

/** 선택지를 고르는 입력란 (값 = 선택지 value, checkbox 그룹은 value JSON 배열) */
export function isChoiceWidget(widget: WidgetKind): boolean {
  return widget === 'select' || widget === 'radio' || widget === 'checkboxes' || widget === 'combobox';
}

/** 학습한 선택지: 이력서 값이 학습 당시와 같을 때만, 같은 텍스트의 선택지가 있으면 그 value */
function learnedOptionValue(value: string, hint: FormatHint, option?: LearnedMatch['option']): string | undefined {
  if (!option || option.value !== value) return undefined;
  const text = normalizeOption(option.text);
  return hint.options?.find((o) => normalizeOption(o.text) === text)?.value;
}

/**
 * 이력서 값을 입력란 형식으로 변환해 조회. select·radio는 선택지 value(학습 선택지 우선), 텍스트 입력란의 enum 값은 표시명
 * checkbox는 boolean 값만 'true'/'false', 파일은 첨부 파일 id
 * 배열 값: select·radio는 원소 순서대로 첫 일치 선택지, 텍스트는 원소별 변환 후 ', ' 결합
 * checkbox 그룹은 원소별 일치 선택지 전부의 JSON 배열 (하나도 없으면 undefined)
 * option: 학습 규칙의 선택지 (matchField 반환값)
 */
export function resolveValue(
  resume: Resume,
  schemaKey: string,
  hint: FormatHint,
  option?: LearnedMatch['option'],
): string | undefined {
  if (hint.widget === 'checkbox') {
    const flag = getByPath(resume, schemaKey);
    return typeof flag === 'boolean' ? String(flag) : undefined;
  }
  // 파일: accept에 맞는 첨부 파일 id (본문은 background가 IndexedDB에서 읽어 전달)
  if (hint.widget === 'file') return attachmentFor(resume, schemaKey, hint.accept)?.id;
  const values = listValues(resume, schemaKey);
  if (values.length === 0) return undefined;
  if (isChoiceWidget(hint.widget)) {
    // 학습 선택지는 학습 당시 값(getValueByKey, 배열은 결합 문자열)과 비교
    const learnedHit = learnedOptionValue(values.join(', '), hint, option);
    const hits = learnedHit ? [learnedHit] : values.map((value) => matchOption(schemaKey, value, hint.options ?? []));
    const matched = [...new Set(hits.filter((v): v is string => !!v))];
    if (matched.length === 0) return undefined;
    return hint.widget === 'checkboxes' ? JSON.stringify(matched) : matched[0];
  }
  return values.map((value) => enumLabel(schemaKey, value) ?? formatValue(schemaKey, value, hint)).join(', ');
}

/** 입력란 값과 같은 값으로 변환되는 이력서 항목 (정확히 하나일 때만, 사용자 직접 수정 학습용. 민감정보는 sensitive일 때만) */
export function keyForValue(resume: Resume, value: string, hint: FormatHint, sensitive = false): string | undefined {
  const target = value.trim();
  if (!target) return undefined;
  const keys = schemaKeyOptions(resume)
    .map(([key]) => key)
    .filter((key) => (sensitive || !isSensitiveKey(key)) && resolveValue(resume, key, hint)?.trim() === target);
  return keys.length === 1 ? keys[0] : undefined;
}

type FieldMatch = ReturnType<typeof matchField>;

/**
 * 분리 입력 묶음: 매칭된 짧은 칸과 같은 cluster에서 연속한 짧은 칸(앞쪽은 미매칭, 뒤쪽은 미매칭 또는 같은 키)
 * → 입력란 인덱스별 묶음 구성원 (2칸 이상만)
 */
function splitRuns(fields: FieldDescriptor[], matches: FieldMatch[]): Map<number, number[]> {
  const runOf = new Map<number, number[]>();
  const joinable = (j: number, cluster: string, key?: string) => {
    const field = fields[j];
    if (!field || runOf.has(j) || field.cluster !== cluster || !isSplitPart(field)) return false;
    return !matches[j] || (key !== undefined && matches[j]!.schemaKey === key);
  };
  fields.forEach((field, i) => {
    const key = matches[i]?.schemaKey;
    if (!key || !field.cluster || runOf.has(i) || !isSplitPart(field)) return;
    let start = i;
    while (joinable(start - 1, field.cluster)) start--;
    let end = i + 1;
    while (joinable(end, field.cluster, key)) end++;
    if (end - start < 2) return;
    const run = Array.from({ length: end - start }, (_, k) => start + k);
    for (const j of run) runOf.set(j, run);
  });
  return runOf;
}

export interface KeyAssignment {
  matches: FieldMatch[];          // 입력란별 매칭 (분리 입력 묶음의 미매칭 칸은 null)
  keys: (string | undefined)[];   // 입력란별 스키마 키 (반복 인덱스 부여, 묶음 구성원은 같은 키)
  runOf: Map<number, number[]>;   // 분리 입력 묶음
}

const runMatch = (matches: FieldMatch[], run: number[]) => run.map((j) => matches[j]).find((m) => m)!;

const EXPLICIT_MOBILE = /휴대|핸드폰|mobile|cell/i;

/**
 * '전화번호'와 '휴대폰'이 함께 있는 페이지: 사전 규칙으로 휴대폰에 매칭된 '전화' 입력란은 자택 전화로
 * ('전화번호' 단독·'연락처'는 휴대폰 유지, 학습·autocomplete 매칭은 그대로)
 */
function preferHomePhone(fields: FieldDescriptor[], matches: FieldMatch[]): FieldMatch[] {
  const text = (f: FieldDescriptor) => f.label ?? f.ariaLabel ?? f.placeholder ?? '';
  const mobile = (m: FieldMatch) => m?.schemaKey === 'basics.phone.mobile';
  if (!fields.some((f, i) => mobile(matches[i]!) && EXPLICIT_MOBILE.test(text(f)))) return matches;
  return matches.map((m, i) =>
    m && mobile(m) && m.source === 'rule' && /전화/.test(text(fields[i]!)) && !EXPLICIT_MOBILE.test(text(fields[i]!))
      ? { ...m, schemaKey: 'basics.phone.home' }
      : m,
  );
}

/**
 * 이력서 값과 무관하게 입력란별 스키마 키 결정 (자동 입력 mapFields·가져오기 core/import.ts 공용)
 * sensitive: 설정 '민감정보 자동 입력 사용' (matchField 참고)
 */
export function assignKeys(fields: FieldDescriptor[], learned?: Map<string, LearnedMatch>, sensitive = false): KeyAssignment {
  // 달력 팝업형 readonly 입력란은 날짜 키만 입력
  const matches = preferHomePhone(
    fields,
    fields.map((field) => {
      const match = matchField(field, learned, sensitive);
      return match && field.readOnly && !isDateKey(match.schemaKey) ? null : match;
    }),
  );
  const runOf = splitRuns(fields, matches);
  // 반복 항목 키('education.*.school.ko')는 페이지 등장 순서대로 인덱스 부여 (분리 입력 묶음은 하나로)
  const counts = new Map<string, number>();
  const keys: (string | undefined)[] = [];
  fields.forEach((_, i) => {
    const run = runOf.get(i);
    if (run && run[0] !== i) {
      keys[i] = keys[run[0]!];
      return;
    }
    let schemaKey = (run ? runMatch(matches, run) : matches[i])?.schemaKey;
    if (schemaKey?.includes('*')) {
      const index = counts.get(schemaKey) ?? 0;
      counts.set(schemaKey, index + 1);
      schemaKey = schemaKey.replace('*', String(index));
    }
    keys[i] = schemaKey;
  });
  return { matches, keys, runOf };
}

/**
 * 반복 항목 '추가' 버튼 클릭 계획: 섹션별 (이력서 항목 수 − 페이지 블록 수) > 0 인 섹션의 버튼과 클릭 횟수
 * 페이지 블록 수 = assignKeys 반복 인덱스 최대 + 1. 버튼 섹션은 버튼 텍스트 → 섹션 텍스트 순 판별,
 * 섹션별 버튼이 여럿이면 마지막 버튼 (블록마다 버튼이 있는 사이트 대비)
 */
export function blocksToAdd(
  keys: (string | undefined)[],
  buttons: AddButton[],
  resume: Pick<Resume, SectionKey>,
): { buttonId: string; count: number }[] {
  const buttonOf = new Map<SectionKey, string>();
  for (const button of buttons) {
    const section = detectSection(button);
    if (section && section in SECTION_LABELS) buttonOf.set(section as SectionKey, button.buttonId);
  }
  return [...buttonOf].flatMap(([section, buttonId]) => {
    const blocks = Math.max(
      0,
      ...keys.map((key) => {
        const m = key?.match(/^(\w+)\.(\d+)\./);
        return m && m[1] === section ? Number(m[2]) + 1 : 0;
      }),
    );
    const count = resume[section].length - blocks;
    return count > 0 ? [{ buttonId, count }] : [];
  });
}

/** sensitive: 설정 '민감정보 자동 입력 사용' (matchField 참고) */
export function mapFields(
  fields: FieldDescriptor[],
  resume: Resume,
  learned?: Map<string, LearnedMatch>,
  sensitive = false,
): FillPlan {
  const skipped: NonNullable<FillPlan['skipped']> = [];
  const plan: FillPlan = { items: [], unmatched: [], skipped };
  const { matches, keys, runOf } = assignKeys(fields, learned, sensitive);

  fields.forEach((field, i) => {
    const run = runOf.get(i);
    const parts = run && splitValue(keys[i]!, getValueByKey(resume, keys[i]!) ?? '', run.length);
    // 분할 실패 시 묶음 구성원은 자기 매칭대로 (미매칭 칸은 해당 없음)
    const match = parts ? runMatch(matches, run!) : matches[i];
    const schemaKey = match ? keys[i] : undefined;
    const value = parts
      ? partValue(parts[run!.indexOf(i)]!, field)
      : schemaKey && resolveValue(resume, schemaKey, field, match?.option);
    if (match && schemaKey && value) plan.items.push({ fieldId: field.fieldId, schemaKey, value, source: match.source });
    // 이력서 값은 있지만 맞는 선택지 없음 → '확인 필요'로 사이드 패널에서 직접 선택
    else if (schemaKey && isChoiceWidget(field.widget) && getValueByKey(resume, schemaKey))
      skipped.push({ fieldId: field.fieldId, schemaKey, reason: 'no-option' });
    else plan.unmatched.push(field.fieldId);
  });
  return plan;
}
