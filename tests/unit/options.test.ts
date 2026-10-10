import { describe, expect, it } from 'vitest';
import { enumLabel, matchOption, normalizeOption } from '@/core/mapping/options';

const opts = (...texts: string[]) => texts.map((text, i) => ({ value: String(i + 1), text }));

describe('matchOption', () => {
  it('정규화 후 표시명 일치 (공백·괄호·구분 기호 무시)', () => {
    expect(normalizeOption('대학교 (4년)')).toBe('대학교4년');
    expect(matchOption('education.0.level', 'university', opts('고등학교', '대학교 (4년)', '대학원'))).toBe('2');
    expect(matchOption('education.0.status', 'graduated', opts('졸업', '졸업예정', '재학'))).toBe('1');
  });

  it('동의어 일치', () => {
    expect(matchOption('military.status', 'served', opts('병역필', '미필', '면제'))).toBe('1');
    expect(matchOption('basics.gender', 'female', opts('남성', '여성'))).toBe('2');
    expect(matchOption('work.0.employmentType', 'full_time', opts('Full-time', 'Contract'))).toBe('1');
  });

  it('옵션 value(코드) 일치', () => {
    const options = [
      { value: 'M', text: '남' },
      { value: 'male', text: 'Man' },
    ];
    expect(matchOption('basics.gender', 'male', options)).toBe('M');
    expect(matchOption('languageTests.0.language', 'en', [{ value: 'en', text: 'EN' }])).toBe('en');
  });

  it('포함 매칭: 후보 순서대로, 한 옵션에만 걸릴 때만 선택', () => {
    // '대학교(4년)'은 '대학교(4년제)'에만 포함
    expect(matchOption('education.0.level', 'university', opts('대학(2,3년제)', '대학교(4년제)'))).toBe('2');
    // 표시명이 어디에도 없고 동의어 '대학교'가 두 옵션에 걸리면 다음 후보
    expect(matchOption('education.0.level', 'university', opts('대학교 2년', '대학교 4년제'))).toBe('2');
    expect(matchOption('education.0.level', 'master', opts('대학원 석사', '대학원 박사'))).toBe('1');
  });

  it('enum 아닌 값은 값 자체로 매칭', () => {
    expect(matchOption('education.0.gpa.max', '4.5', opts('4.3', '4.5', '100'))).toBe('2');
    expect(matchOption('education.0.gpa.max', '4.5', opts('4.3점 만점', '4.5점 만점'))).toBe('2');
  });

  it('매칭 실패는 undefined', () => {
    expect(matchOption('education.0.level', 'doctor', opts('고등학교', '대학교'))).toBeUndefined();
    expect(matchOption('basics.gender', 'male', [])).toBeUndefined();
  });
});

describe('enumLabel', () => {
  it('enum 키는 표시명, 아니면 undefined', () => {
    expect(enumLabel('education.1.level', 'university')).toBe('대학교(4년)');
    expect(enumLabel('military.branch', 'army')).toBe('육군');
    expect(enumLabel('basics.email', 'a@b.c')).toBeUndefined();
  });
});
