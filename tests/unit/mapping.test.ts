import { describe, expect, it } from 'vitest';
import { fieldFingerprint } from '@/core/mapping/learned';
import { detectSection, getValueByKey, mapFields, matchField } from '@/core/mapping/match';
import { createEmptyResume } from '@/core/schema/empty';
import { schemaKeyLabel, schemaKeyOptions } from '@/core/schema/labels';
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
    expect(keyOf({ label: '회사 이름' })).toBe('work.*.company.ko');
    expect(keyOf({ label: 'Company name' })).toBe('work.*.company.ko');
    expect(keyOf({ name: 'username' })).toBeUndefined();
  });

  it('섹션 제목 문맥으로 학력·경력 항목 매칭', () => {
    expect(keyOf({ label: '전공', section: '학력사항' })).toBe('education.*.major.ko');
    expect(keyOf({ label: '입학년월', section: '학력사항' })).toBe('education.*.startDate');
    expect(keyOf({ label: '졸업년월', section: 'Education' })).toBe('education.*.endDate');
    expect(keyOf({ label: '학점 만점', section: '학력사항' })).toBe('education.*.gpa.max');
    expect(keyOf({ label: '학점', section: '학력사항' })).toBe('education.*.gpa.value');
    expect(keyOf({ label: '부서', section: '경력사항' })).toBe('work.*.department');
    expect(keyOf({ label: '입사일', section: '경력사항' })).toBe('work.*.startDate');
    expect(keyOf({ label: '퇴사 사유', section: '경력사항' })).toBe('work.*.leaveReason');
    expect(keyOf({ label: '담당 업무', section: 'Work Experience' })).toBe('work.*.description');
  });

  it('입력란 라벨 자체로 섹션 판별, 라벨이 섹션 제목보다 우선', () => {
    expect(keyOf({ label: '학교명' })).toBe('education.*.school.ko');
    expect(keyOf({ label: '영문 학교명' })).toBe('education.*.school.en');
    expect(keyOf({ label: '회사명', section: '학력사항' })).toBe('work.*.company.ko');
  });

  it('섹션 안에서는 basics 규칙 미적용, enum 성격 라벨 제외', () => {
    expect(keyOf({ label: '주소', section: '경력사항' })).toBeUndefined();
    expect(keyOf({ label: '이름', section: '학력사항' })).toBeUndefined();
    expect(keyOf({ label: '졸업 구분', section: '학력사항' })).toBeUndefined();
    expect(keyOf({ label: '학교 소재지', section: '학력사항' })).toBeUndefined();
  });

  it('자격증·어학·수상·활동·프로젝트 섹션 매칭', () => {
    expect(keyOf({ label: '자격증명' })).toBe('certificates.*.name');
    expect(keyOf({ label: '발행기관', section: '자격증' })).toBe('certificates.*.issuer');
    expect(keyOf({ label: '취득일', section: '자격증' })).toBe('certificates.*.date');
    expect(keyOf({ label: '자격증 번호' })).toBe('certificates.*.number');
    expect(keyOf({ label: '시험명', section: '어학' })).toBe('languageTests.*.exam');
    expect(keyOf({ label: '점수', section: '어학 시험' })).toBe('languageTests.*.score');
    expect(keyOf({ label: '응시일', section: 'Language' })).toBe('languageTests.*.date');
    expect(keyOf({ label: '수험번호', section: '어학' })).toBe('languageTests.*.registrationNo');
    expect(keyOf({ label: '수상명' })).toBe('awards.*.title');
    expect(keyOf({ label: '수상일' })).toBe('awards.*.date');
    expect(keyOf({ label: '수여 기관', section: '수상경력' })).toBe('awards.*.awarder');
    expect(keyOf({ label: '내용', section: '대외활동 경력' })).toBe('activities.*.description');
    expect(keyOf({ label: '부서', section: '경력 사항' })).toBe('work.*.department');
    expect(keyOf({ label: '활동명' })).toBe('activities.*.name');
    expect(keyOf({ label: '종료 연월', section: '대외활동' })).toBe('activities.*.endDate');
    expect(keyOf({ label: '프로젝트명' })).toBe('projects.*.name');
    expect(keyOf({ label: 'URL', section: '프로젝트' })).toBe('projects.*.url');
  });

  it('새 섹션의 enum 성격 라벨 제외', () => {
    expect(keyOf({ label: '활동 구분', section: '대외활동' })).toBeUndefined();
    expect(keyOf({ label: '외국어', section: '어학' })).toBeUndefined();
    expect(keyOf({ label: '시험 종류', section: '어학' })).toBeUndefined();
  });

  it('두 섹션이 함께 걸리는 제목은 판별 보류 → basics 규칙', () => {
    expect(detectSection(field({ label: '전공', section: '학력·경력 사항' }))).toBeUndefined();
    expect(keyOf({ label: '이메일', section: '학력·경력 사항' })).toBe('basics.email');
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

  it('학습 규칙이 autocomplete·사전보다 우선, 학습 키 값 없으면 unmatched', () => {
    const company = field({ fieldId: '0', label: '회사 이름' });
    const name = field({ fieldId: '1', label: '이름', autocomplete: 'name' });
    const learned = new Map([
      [fieldFingerprint(company)!, 'basics.email'],
      [fieldFingerprint(name)!, 'basics.phone.mobile'],
    ]);
    const plan = mapFields([company, name], resume, learned);
    expect(plan.items).toEqual([{ fieldId: '0', schemaKey: 'basics.email', value: 'hong@example.com', source: 'learned' }]);
    expect(plan.unmatched).toEqual(['1']);
    expect(mapFields([company, name], resume).items.map((i) => i.source)).toEqual(['autocomplete']);
  });

  it('입력란 형식에 맞게 값 변환', () => {
    const r = createEmptyResume();
    r.basics.birthDate = '1995-03-15';
    const plan = mapFields([field({ label: '생년월일', maxLength: 8 })], r);
    expect(plan.items[0]?.value).toBe('19950315');
  });

  it('반복 항목은 등장 순서대로 인덱스 부여, 이력서에 없는 인덱스는 unmatched', () => {
    const r = createEmptyResume();
    r.education = [
      { id: 'e1', level: 'university', school: { ko: '한국대학교' }, status: 'graduated', startDate: '2014-03', gpa: { value: 3.8, max: 4.5 } },
      { id: 'e2', level: 'master', school: { ko: '한국대학원' }, status: 'graduated' },
    ];
    const school = (fieldId: string) => field({ fieldId, label: '학교명', section: '학력사항' });
    const plan = mapFields(
      [
        school('0'),
        field({ fieldId: '1', label: '입학년월', placeholder: 'YYYY.MM', section: '학력사항' }),
        field({ fieldId: '2', label: '학점', section: '학력사항' }),
        school('3'),
        school('4'),
      ],
      r,
    );
    expect(plan.items).toEqual([
      { fieldId: '0', schemaKey: 'education.0.school.ko', value: '한국대학교', source: 'rule' },
      { fieldId: '1', schemaKey: 'education.0.startDate', value: '2014.03', source: 'rule' },
      { fieldId: '2', schemaKey: 'education.0.gpa.value', value: '3.8', source: 'rule' },
      { fieldId: '3', schemaKey: 'education.1.school.ko', value: '한국대학원', source: 'rule' },
    ]);
    expect(plan.unmatched).toEqual(['4']);
  });

  it('getValueByKey: 없는 경로·빈 문자열은 undefined', () => {
    expect(getValueByKey(resume, 'basics.phone.mobile')).toBeUndefined();
    expect(getValueByKey(resume, 'basics.name.en')).toBeUndefined();
  });
});

describe('schemaKeyLabel·schemaKeyOptions', () => {
  it('반복 항목 키는 섹션·순번 포함 표시명', () => {
    expect(schemaKeyLabel('basics.email')).toBe('이메일');
    expect(schemaKeyLabel('education.0.school.ko')).toBe('학력 1 학교명');
    expect(schemaKeyLabel('work.1.startDate')).toBe('경력 2 입사 연월');
    expect(schemaKeyLabel('certificates.0.name')).toBe('자격증 1 자격증명');
    expect(schemaKeyLabel('languageTests.2.score')).toBe('어학 3 점수');
    expect(schemaKeyLabel('unknown.key')).toBe('unknown.key');
  });

  it('이력서 항목 수만큼 인덱스 키 생성', () => {
    const r = createEmptyResume();
    r.work = [{ id: 'w1', company: { ko: '가나다' }, startDate: '2020-01', current: true }];
    r.projects = [{ id: 'p1', name: '추천 시스템' }];
    const keys = schemaKeyOptions(r).map(([key]) => key);
    expect(keys).toContain('basics.name.ko');
    expect(keys).toContain('work.0.company.ko');
    expect(keys).toContain('projects.0.url');
    expect(keys.some((k) => k.startsWith('certificates.'))).toBe(false);
    expect(keys.some((k) => k.startsWith('education.') || k.startsWith('work.1.'))).toBe(false);
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
