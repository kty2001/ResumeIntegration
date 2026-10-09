import { describe, expect, it } from 'vitest';
import { formatValue } from '@/core/format';
import { formatDate } from '@/core/format/date';
import { formatPhone, hyphenatePhone } from '@/core/format/phone';
import type { FormatHint } from '@/messaging/protocol';

const hint = (props: Partial<FormatHint> = {}): FormatHint => ({ widget: 'text', ...props });

describe('formatDate', () => {
  const date = (props: Partial<FormatHint>) => formatDate('1995-03-15', hint(props));

  it('placeholder 형식 문자열', () => {
    expect(date({ placeholder: 'YYYY.MM.DD' })).toBe('1995.03.15');
    expect(date({ placeholder: 'yyyy/mm/dd' })).toBe('1995/03/15');
    expect(date({ placeholder: 'YYYYMMDD' })).toBe('19950315');
    expect(date({ placeholder: '생년월일 (YYMMDD)' })).toBe('950315');
  });

  it('placeholder 예시값·자릿수 안내', () => {
    expect(date({ placeholder: '예) 1990.01.01' })).toBe('1995.03.15');
    expect(date({ placeholder: '19900101' })).toBe('19950315');
    expect(date({ placeholder: '900101' })).toBe('950315');
    expect(date({ placeholder: '8자리 숫자' })).toBe('19950315');
    expect(date({ placeholder: '6자리' })).toBe('950315');
  });

  it('maxLength 기준', () => {
    expect(date({ maxLength: 8 })).toBe('19950315');
    expect(date({ maxLength: 6 })).toBe('950315');
    expect(date({ maxLength: 10 })).toBe('1995-03-15');
  });

  it('placeholder가 maxLength보다 우선', () => {
    expect(date({ placeholder: 'YYYY.MM.DD', maxLength: 8 })).toBe('1995.03.15');
  });

  it('type=date·신호 없음·저장 형식 아님은 그대로', () => {
    expect(date({ widget: 'date', placeholder: 'YYYYMMDD' })).toBe('1995-03-15');
    expect(date({})).toBe('1995-03-15');
    expect(date({ placeholder: '생년월일' })).toBe('1995-03-15');
    expect(formatDate('1995.03.15', hint({ maxLength: 8 }))).toBe('1995.03.15');
  });
});

describe('formatPhone', () => {
  it('hyphenatePhone: 휴대폰·서울·지역번호, 그 외 길이는 그대로', () => {
    expect(hyphenatePhone('01012345678')).toBe('010-1234-5678');
    expect(hyphenatePhone('0212345678')).toBe('02-1234-5678');
    expect(hyphenatePhone('021234567')).toBe('02-123-4567');
    expect(hyphenatePhone('0311234567')).toBe('031-123-4567');
    expect(hyphenatePhone('15881234')).toBe('15881234');
  });

  it('하이픈 신호', () => {
    expect(formatPhone('01012345678', hint({ placeholder: '010-0000-0000' }))).toBe('010-1234-5678');
    expect(formatPhone('01012345678', hint({ placeholder: "'-' 포함 입력" }))).toBe('010-1234-5678');
  });

  it('숫자만 신호', () => {
    expect(formatPhone('010-1234-5678', hint({ placeholder: "'-' 없이 입력" }))).toBe('01012345678');
    expect(formatPhone('010-1234-5678', hint({ placeholder: '숫자만 입력' }))).toBe('01012345678');
    expect(formatPhone('010-1234-5678', hint({ placeholder: '하이픈 제외' }))).toBe('01012345678');
    expect(formatPhone('010-1234-5678', hint({ placeholder: '01012345678' }))).toBe('01012345678');
    expect(formatPhone('010-1234-5678', hint({ maxLength: 11 }))).toBe('01012345678');
  });

  it('숫자만 신호가 하이픈 신호보다 우선', () => {
    expect(formatPhone('01012345678', hint({ placeholder: "010-0000-0000 ('-' 없이)" }))).toBe('01012345678');
  });

  it('신호 없음은 그대로', () => {
    expect(formatPhone('01012345678', hint())).toBe('01012345678');
    expect(formatPhone('010-1234-5678', hint({ maxLength: 13 }))).toBe('010-1234-5678');
  });
});

describe('formatValue', () => {
  it('스키마 키별 변환, 대상 아닌 키는 그대로', () => {
    expect(formatValue('basics.birthDate', '1995-03-15', hint({ maxLength: 8 }))).toBe('19950315');
    expect(formatValue('basics.phone.home', '0212345678', hint({ placeholder: '02-000-0000' }))).toBe('02-1234-5678');
    expect(formatValue('basics.address.postalCode', '06236', hint({ maxLength: 8 }))).toBe('06236');
  });
});
