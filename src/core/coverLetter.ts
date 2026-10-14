import type { FieldDescriptor } from '@/messaging/protocol';
import type { CoverLetterEntry, CoverLetterTag, LengthUnit } from './schema/resume';

// 자기소개서 라이브러리: 글자수 계산·검색 (docs/design/screens.md 4장 '자기소개서')

/**
 * 글자수: 공백 포함(문자 단위)·공백 제외(공백·줄바꿈 제외)·바이트
 * 바이트는 국내 채용 사이트 일반 기준(한글 등 비ASCII 2바이트, 영문·숫자·공백 1바이트)
 */
export function countLength(text: string, unit: LengthUnit): number {
  const chars = [...text];
  switch (unit) {
    case 'chars_with_space':
      return chars.length;
    case 'chars_without_space':
      return chars.filter((c) => !/\s/.test(c)).length;
    case 'bytes':
      return chars.reduce((n, c) => n + (c.charCodeAt(0) < 128 ? 1 : 2), 0);
  }
}

// ---- 지원서 문항 매칭 (사이드 패널 '자기소개서 추천') ----

/** 입력 결과(FillReport)에서 자기소개서 답변으로 입력한 입력란의 스키마 키 자리 표시 */
export const COVER_LETTER_KEY = 'coverLetters';

/**
 * 자유형 자기소개서(잡코리아: 문항 제목을 직접 쓰는 input + 라벨 없는 내용 textarea, docs/reports/07_site_dom_survey.md 6.2)
 * 이력서 항목이 아닌 textarea 바로 앞 입력란이 같은 묶음(cluster)의 이력서 항목이 아닌 텍스트 입력란이면 그 인덱스 = 제목
 * matched: 입력란 인덱스가 이력서 항목에 매핑됐는지
 */
export function freeFormTitleIndex(
  fields: Pick<FieldDescriptor, 'widget' | 'cluster'>[],
  matched: (index: number) => boolean,
  index: number,
): number | undefined {
  const field = fields[index];
  const prev = fields[index - 1];
  if (field?.widget !== 'textarea' || prev?.widget !== 'text' || !field.cluster || prev.cluster !== field.cluster) return undefined;
  return matched(index) || matched(index - 1) ? undefined : index - 1;
}

const TAG_PATTERNS: [CoverLetterTag, RegExp][] = [
  ['motivation', /지원\s*(한|하게\s*된|하는)?\s*(동기|이유|배경)|motivation|why/i],
  ['growth', /성장\s*(과정|배경)|가치관|어린\s*시절/],
  ['personality', /성격|장\s*단점|장점|단점|강점|약점/],
  ['aspiration', /입사\s*후|포부|목표|비전|향후\s*계획/],
  ['collaboration', /협업|협력|팀\s*(워크|활동|프로젝트)|갈등|소통/],
  ['competency', /직무\s*(역량|관련|경험)|전문\s*(성|지식)|역량/],
];

/** 문항 텍스트 → 태그 (키워드 사전, 여러 개 가능) */
export function detectTags(question: string): CoverLetterTag[] {
  return TAG_PATTERNS.filter(([, pattern]) => pattern.test(question)).map(([tag]) => tag);
}

const LIMIT_TEXT = /(\d{1,3}(?:,\d{3})+|\d+)\s*(자|bytes?|바이트)/i;

/** 문항 글자수 제한: 문구('1,000자 이내'·'공백 제외 700자'·'500byte') → 입력란 maxLength 순 */
export function detectLimit(question: string, maxLength?: number): CoverLetterEntry['limit'] {
  const m = question.match(LIMIT_TEXT);
  if (m) {
    const unit = /byte|바이트/i.test(m[2]!)
      ? 'bytes'
      : /공백\s*(제외|미포함|없이)/.test(question)
        ? 'chars_without_space'
        : 'chars_with_space';
    return { count: Number(m[1]!.replace(/,/g, '')), unit };
  }
  return maxLength ? { count: maxLength, unit: 'chars_with_space' } : undefined;
}

/** 글자 2개 단위 집합 (공백·기호·글자수 제한 문구 제외) */
function bigrams(text: string): Set<string> {
  const t = text.replace(LIMIT_TEXT, '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  return new Set(Array.from({ length: Math.max(t.length - 1, 0) }, (_, i) => t.slice(i, i + 2)));
}

/** 문항 유사도 (Dice 계수, 0~1) */
function similarity(a: string, b: string): number {
  const x = bigrams(a);
  const y = bigrams(b);
  if (!x.size || !y.size) return 0;
  const common = [...x].filter((g) => y.has(g)).length;
  return (2 * common) / (x.size + y.size);
}

/**
 * 지원서 문항과 비슷한 저장 답변: 점수 = 태그 일치 수 + 문항 유사도, 0.2 미만 제외, 높은 순 max개
 * 저장 답변 태그는 사용자가 붙인 태그 + 저장 문항에서 판별한 태그
 */
export function recommendAnswers(entries: CoverLetterEntry[], question: string, max = 3): CoverLetterEntry[] {
  const tags = detectTags(question);
  const tagScore = (e: CoverLetterEntry) => [...new Set([...e.tags, ...detectTags(e.question)])].filter((t) => tags.includes(t)).length;
  return entries
    .filter((e) => e.answer.trim())
    .map((e) => ({ e, score: tagScore(e) + similarity(e.question, question) }))
    .filter((s) => s.score >= 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((s) => s.e);
}

/** 최근 수정한 답변 max개 (자유형 문항처럼 비교할 문항 텍스트가 없을 때) */
export function recentAnswers(entries: CoverLetterEntry[], max = 3): CoverLetterEntry[] {
  return entries
    .filter((e) => e.answer.trim())
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, max);
}

/** 문항·답변 검색어(대소문자 무시) + 태그 필터 */
export function filterCoverLetters(entries: CoverLetterEntry[], query: string, tag?: CoverLetterTag): CoverLetterEntry[] {
  const q = query.trim().toLowerCase();
  return entries.filter(
    (e) =>
      (!tag || e.tags.includes(tag)) &&
      (!q || e.question.toLowerCase().includes(q) || e.answer.toLowerCase().includes(q)),
  );
}
