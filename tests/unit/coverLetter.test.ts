import { describe, expect, it } from 'vitest';
import { countLength, detectLimit, detectTags, filterCoverLetters, recommendAnswers } from '@/core/coverLetter';
import { newCoverLetter } from '@/core/schema/empty';
import type { CoverLetterTag } from '@/core/schema/resume';

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

describe('문항 매칭', () => {
  const entry = (question: string, tags: CoverLetterTag[], answer = '답변') => ({ ...newCoverLetter(), question, tags, answer });

  it('detectTags: 문항 키워드 → 태그', () => {
    expect(detectTags('당사에 지원하게 된 동기를 기술하시오')).toEqual(['motivation']);
    expect(detectTags('보유 자격증')).toEqual([]);
    expect(detectTags('1. 지원 동기 (1,000자 이내)')).toEqual(['motivation']);
    expect(detectTags('입사 후 포부와 성격의 장단점')).toEqual(['personality', 'aspiration']);
    expect(detectTags('팀 프로젝트에서 갈등을 해결한 경험')).toEqual(['collaboration']);
  });

  it('detectLimit: 문구 → maxLength 순', () => {
    expect(detectLimit('지원 동기 (1,000자 이내)')).toEqual({ count: 1000, unit: 'chars_with_space' });
    expect(detectLimit('성장 과정 (공백 제외 700자)')).toEqual({ count: 700, unit: 'chars_without_space' });
    expect(detectLimit('입사 후 포부 최대 1500 byte')).toEqual({ count: 1500, unit: 'bytes' });
    expect(detectLimit('자유 기술', 500)).toEqual({ count: 500, unit: 'chars_with_space' });
    expect(detectLimit('자유 기술')).toBeUndefined();
  });

  it('recommendAnswers: 태그 일치·문항 유사도 순, 답변 없거나 관련 없으면 제외', () => {
    const motivation = entry('지원 동기를 기술해 주십시오', ['motivation']);
    const similar = entry('당사에 지원한 이유', []);
    const growth = entry('성장 과정', ['growth']);
    const empty = entry('지원 동기', ['motivation'], ' ');
    expect(recommendAnswers([growth, similar, motivation, empty], '1. 지원 동기 (1,000자 이내)')).toEqual([motivation, similar]);
    expect(recommendAnswers([growth, motivation], '보유 자격증')).toEqual([]);
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
