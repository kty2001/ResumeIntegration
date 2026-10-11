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

/** 문항·답변 검색어(대소문자 무시) + 태그 필터 */
export function filterCoverLetters(entries: CoverLetterEntry[], query: string, tag?: CoverLetterTag): CoverLetterEntry[] {
  const q = query.trim().toLowerCase();
  return entries.filter(
    (e) =>
      (!tag || e.tags.includes(tag)) &&
      (!q || e.question.toLowerCase().includes(q) || e.answer.toLowerCase().includes(q)),
  );
}
