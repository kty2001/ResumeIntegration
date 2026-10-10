import {
  ACTIVITY_TYPE_LABELS,
  DISCHARGE_TYPE_LABELS,
  EDUCATION_LEVEL_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  GENDER_LABELS,
  GRADUATION_STATUS_LABELS,
  LANGUAGE_LABELS,
  MILITARY_BRANCH_LABELS,
  MILITARY_STATUS_LABELS,
  SCHOOL_LOCATION_LABELS,
} from '@/core/schema/labels';
import type { FormatHint } from '@/messaging/protocol';

// 옵션 동의어 사전 v1: docs/design/dictionary_v1.md 3장
// enum 스키마 키('*' 인덱스 정규화) → 코드별 표시명·동의어. 초안은 resume_schema_v1.md 5장

interface EnumOptions {
  labels: Record<string, string>;
  synonyms: Record<string, string[]>;
}

export const ENUM_OPTIONS: Record<string, EnumOptions> = {
  'basics.gender': {
    labels: GENDER_LABELS,
    synonyms: { male: ['남자', '남성', 'male', 'man'], female: ['여자', '여성', 'female', 'woman'] },
  },
  'education.*.level': {
    labels: EDUCATION_LEVEL_LABELS,
    synonyms: {
      high_school: ['고졸', '고등학교 졸업'],
      college: ['전문대', '전문학사', '2년제', '3년제', '초대졸'],
      university: ['4년제', '학사', '대졸', '대학교'],
      master: ['석사'],
      doctor: ['박사'],
    },
  },
  'education.*.status': {
    labels: GRADUATION_STATUS_LABELS,
    synonyms: {
      graduated: ['졸업 완료'],
      expected: ['졸업예정'],
      completed: ['과정 수료'],
      dropped: ['중도 퇴학'],
      enrolled: ['재학 중'],
      on_leave: ['휴학 중'],
    },
  },
  'education.*.location': {
    labels: SCHOOL_LOCATION_LABELS,
    synonyms: { domestic: ['국내대학'], overseas: ['해외대학', '외국'] },
  },
  'work.*.employmentType': {
    labels: EMPLOYMENT_TYPE_LABELS,
    synonyms: {
      full_time: ['정규', 'Full-time'],
      contract: ['계약', '기간제', 'Contract'],
      intern: ['인턴십', '체험형 인턴', '채용연계형 인턴', 'Intern'],
      part_time: ['파트타임', 'Part-time'],
      freelance: ['위촉', 'Freelance'],
      dispatched: ['파견'],
    },
  },
  'languageTests.*.language': {
    labels: LANGUAGE_LABELS,
    synonyms: {
      en: ['English'],
      ja: ['Japanese'],
      zh: ['Chinese', '중국어(만다린)'],
      de: ['German'],
      fr: ['French'],
      es: ['Spanish'],
      ru: ['Russian'],
      vi: ['Vietnamese'],
      ko: ['Korean'],
    },
  },
  'activities.*.type': {
    labels: ACTIVITY_TYPE_LABELS,
    synonyms: { volunteer: ['봉사활동'], training: ['교육'], overseas: ['해외연수', '어학연수'] },
  },
  'military.status': {
    labels: MILITARY_STATUS_LABELS,
    synonyms: {
      served: ['병역필', '필'],
      not_served: ['병역 미필'],
      exempted: ['병역 면제'],
      serving: ['현역 복무 중', '복무중'],
      not_applicable: ['비대상', '해당없음'],
    },
  },
  'military.branch': {
    labels: MILITARY_BRANCH_LABELS,
    synonyms: { social_service: ['사회복무요원', '공익근무'] },
  },
  'military.dischargeType': {
    labels: DISCHARGE_TYPE_LABELS,
    synonyms: {
      expiration: ['만기제대', '만기'],
      hardship: ['의가사제대'],
      medical: ['의병제대'],
    },
  },
};

const enumOf = (schemaKey: string) => ENUM_OPTIONS[schemaKey.replace(/\.\d+\./, '.*.')];

/** 텍스트 입력란용 enum 표시명 (enum 키 아니면 undefined) */
export function enumLabel(schemaKey: string, code: string): string | undefined {
  return enumOf(schemaKey)?.labels[code];
}

/** 비교용 정규화: 소문자, 공백·괄호·구분 기호 제거 */
export function normalizeOption(text: string): string {
  return text.toLowerCase().replace(/[\s()[\]{}·.,/\-_:]/g, '');
}

/**
 * 선택지 매칭 → 옵션 value. 후보 = [표시명, 동의어…, 코드] (enum 아니면 [값])
 * 1단계: 후보 순서대로 옵션 text·value와 일치 / 2단계: 후보를 포함하는 옵션이 하나뿐이면 선택
 */
export function matchOption(schemaKey: string, value: string, options: NonNullable<FormatHint['options']>): string | undefined {
  const spec = enumOf(schemaKey);
  const candidates = (spec ? [spec.labels[value], ...(spec.synonyms[value] ?? []), value] : [value])
    .filter((c): c is string => !!c)
    .map(normalizeOption);
  const normalized = options.map((o) => ({ value: o.value, text: normalizeOption(o.text), raw: normalizeOption(o.value) }));

  for (const c of candidates) {
    const exact = normalized.find((o) => o.text === c || o.raw === c);
    if (exact) return exact.value;
  }
  for (const c of candidates) {
    if (c.length < 2) continue;
    const contains = normalized.filter((o) => o.text.includes(c));
    if (contains.length === 1) return contains[0]!.value;
  }
  return undefined;
}
