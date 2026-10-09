import { describe, expect, it } from 'vitest';
import { getValueByKey, mapFields, matchField } from '@/core/mapping/match';
import { createEmptyResume } from '@/core/schema/empty';
import { isExcluded } from '@/core/site-policy';
import type { FieldDescriptor } from '@/messaging/protocol';

const field = (props: Partial<FieldDescriptor>): FieldDescriptor => ({ fieldId: '0', widget: 'text', ...props });
const keyOf = (props: Partial<FieldDescriptor>) => matchField(field(props))?.schemaKey;

describe('matchField', () => {
  it('autocomplete 속성을 키워드보다 우선', () => {
    expect(matchField(field({ autocomplete: 'email', label: '이름' }))).toEqual({ schemaKey: 'basics.email', source: 'autocomplete' });
    expect(keyOf({ autocomplete: 'section-a shipping postal-code' })).toBe('basics.address.postalCode');
    expect(keyOf({ autocomplete: 'home tel' })).toBe('basics.phone.home');
  });

  it('한/영 라벨 매칭', () => {
    expect(keyOf({ label: '성명 *' })).toBe('basics.name.ko');
    expect(keyOf({ label: 'Email' })).toBe('basics.email');
    expect(keyOf({ label: '휴대폰 번호' })).toBe('basics.phone.mobile');
    expect(keyOf({ label: '생년월일' })).toBe('basics.birthDate');
    expect(keyOf({ placeholder: '우편번호' })).toBe('basics.address.postalCode');
    expect(keyOf({ name: 'zipcode' })).toBe('basics.address.postalCode');
  });

  it('다른 키워드를 포함하는 구체적 항목 구분', () => {
    expect(keyOf({ label: '영문 이름' })).toBe('basics.name.en');
    expect(keyOf({ label: '이메일 주소' })).toBe('basics.email');
    expect(keyOf({ label: '상세 주소' })).toBe('basics.address.line2');
    expect(keyOf({ label: '주소' })).toBe('basics.address.line1');
    expect(keyOf({ label: '휴대전화번호' })).toBe('basics.phone.mobile');
    expect(keyOf({ label: '자택 전화번호' })).toBe('basics.phone.home');
  });

  it('이름이 아닌 명칭 입력란은 이름으로 매칭하지 않음', () => {
    expect(keyOf({ label: '회사 이름' })).toBeUndefined();
    expect(keyOf({ label: 'Company name' })).toBeUndefined();
    expect(keyOf({ name: 'username' })).toBeUndefined();
  });

  it('라벨이 매칭되지 않으면 placeholder·name 순으로 검사', () => {
    expect(keyOf({ label: '항목 1', placeholder: 'example@mail.com 이메일' })).toBe('basics.email');
    expect(keyOf({ name: 'mobile' })).toBe('basics.phone.mobile');
  });
});

describe('mapFields', () => {
  const resume = createEmptyResume();
  resume.basics.name.ko = '홍길동';
  resume.basics.email = 'hong@example.com';

  it('값 있는 키는 items, 매칭 실패·값 없음은 unmatched', () => {
    const plan = mapFields(
      [field({ fieldId: '0', label: '이름' }), field({ fieldId: '1', label: '이메일' }), field({ fieldId: '2', label: '휴대폰' }), field({ fieldId: '3', label: '자기소개' })],
      resume,
    );
    expect(plan.items).toEqual([
      { fieldId: '0', schemaKey: 'basics.name.ko', value: '홍길동', source: 'rule' },
      { fieldId: '1', schemaKey: 'basics.email', value: 'hong@example.com', source: 'rule' },
    ]);
    expect(plan.unmatched).toEqual(['2', '3']);
  });

  it('getValueByKey: 없는 경로·빈 문자열은 undefined', () => {
    expect(getValueByKey(resume, 'basics.phone.mobile')).toBeUndefined();
    expect(getValueByKey(resume, 'basics.name.en')).toBeUndefined();
  });
});

describe('isExcluded', () => {
  it('제외 도메인과 서브도메인', () => {
    expect(isExcluded('https://www.linkedin.com/jobs')).toBe(true);
    expect(isExcluded('https://linkedin.com/')).toBe(true);
    expect(isExcluded('https://notlinkedin.com/')).toBe(false);
    expect(isExcluded('https://www.saramin.co.kr/')).toBe(false);
  });
});
