import { describe, expect, it } from 'vitest';
import { countLength, filterCoverLetters } from '@/core/coverLetter';
import { newCoverLetter } from '@/core/schema/empty';

describe('countLength', () => {
  it('공백 포함·제외·바이트(비ASCII 2바이트)', () => {
    const text = 'AB 가나\n다';
    expect(countLength(text, 'chars_with_space')).toBe(7);
    expect(countLength(text, 'chars_without_space')).toBe(5);
    expect(countLength(text, 'bytes')).toBe(10);
  });

  it('이모지 등 서로게이트 쌍은 한 글자', () => {
    expect(countLength('😀a', 'chars_with_space')).toBe(2);
  });
});

describe('filterCoverLetters', () => {
  const motivation = { ...newCoverLetter(), question: '지원 동기를 기술해 주십시오', tags: ['motivation' as const], answer: 'Backend 개발' };
  const growth = { ...newCoverLetter(), question: '성장 과정', tags: ['growth' as const], answer: '어린 시절' };

  it('문항·답변 검색(대소문자 무시)과 태그 필터', () => {
    expect(filterCoverLetters([motivation, growth], '지원')).toEqual([motivation]);
    expect(filterCoverLetters([motivation, growth], 'backend')).toEqual([motivation]);
    expect(filterCoverLetters([motivation, growth], '', 'growth')).toEqual([growth]);
    expect(filterCoverLetters([motivation, growth], '지원', 'growth')).toEqual([]);
    expect(filterCoverLetters([motivation, growth], '  ')).toEqual([motivation, growth]);
  });
});
