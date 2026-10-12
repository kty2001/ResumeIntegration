import { describe, expect, it } from 'vitest';
import { applyImport, convertValue, diffImport, newCoverLetterCandidates, parseDate, parseImport, type ImportedItem } from '@/core/import';
import { assignKeys } from '@/core/mapping/match';
import { optionCode } from '@/core/mapping/options';
import { createEmptyResume, newEducation } from '@/core/schema/empty';
import type { FieldDescriptor } from '@/messaging/protocol';

let seq = 0;
const field = (props: Partial<FieldDescriptor>): FieldDescriptor => ({ fieldId: String(seq++), widget: 'text', ...props });

describe('parseDate', () => {
  it('구분자·숫자만·한글 단위 → 저장 형식', () => {
    expect(parseDate('1995.03.15', 'date')).toBe('1995-03-15');
    expect(parseDate('19950315', 'date')).toBe('1995-03-15');
    expect(parseDate('1995년 3월 5일', 'date')).toBe('1995-03-05');
    expect(parseDate('2020.3', 'month')).toBe('2020-03');
    expect(parseDate('202003', 'month')).toBe('2020-03');
    expect(parseDate('2020-03-02', 'month')).toBe('2020-03');
    expect(parseDate('2020/03', 'partial')).toBe('2020-03');
    expect(parseDate('2020/03/02', 'partial')).toBe('2020-03-02');
  });

  it('2자리 연도·범위 밖·연월일 키의 연월만 값은 실패', () => {
    expect(parseDate('950315', 'date')).toBeUndefined();
    expect(parseDate('2020.13', 'month')).toBeUndefined();
    expect(parseDate('2020.03', 'date')).toBeUndefined();
    expect(parseDate('재학 중', 'month')).toBeUndefined();
  });
});

describe('optionCode·convertValue', () => {
  it('enum: 표시명·동의어·포함 텍스트 → 코드, 불일치는 undefined', () => {
    expect(optionCode('basics.gender', '남성')).toBe('male');
    expect(optionCode('education.0.status', '졸업')).toBe('graduated');
    expect(optionCode('work.0.employmentType', '정규직')).toBe('full_time');
    expect(optionCode('basics.gender', '선택 안 함')).toBeUndefined();
    expect(optionCode('basics.email', ' a@b.c ')).toBe('a@b.c');
  });

  it('전화번호·숫자·연봉·배열', () => {
    expect(convertValue('basics.phone.mobile', ['010-1234-5678'])).toBe('01012345678');
    expect(convertValue('basics.phone.mobile', ['123'])).toBeUndefined();
    expect(convertValue('education.0.gpa.value', ['3.8'])).toBe(3.8);
    expect(convertValue('education.0.gpa.max', ['4.5'])).toBe(4.5);
    expect(convertValue('education.0.gpa.max', ['5'])).toBeUndefined();
    expect(convertValue('desired.salary.amount', ['4,000만원'])).toBe(4000);
    expect(convertValue('work.0.salary', ['40,000,000'])).toBe(4000);
    expect(convertValue('desired.locations', ['서울, 경기'])).toEqual(['서울', '경기']);
    expect(convertValue('desired.employmentTypes', ['정규직', '계약직', '알 수 없음'])).toEqual(['full_time', 'contract']);
  });
});

describe('parseImport', () => {
  it('입력란 값 → 스키마 키별 값, 선택지 텍스트 역조회, 분리 입력 결합, 자기소개서 후보', () => {
    const fields = [
      field({ label: '이름' }),
      field({ label: '이메일' }),
      field({ label: '이메일' }), // 같은 키 두 번째는 무시
      field({ label: '성별', widget: 'select', options: [{ value: 'M', text: '남자' }, { value: 'F', text: '여자' }] }),
      field({ label: '휴대폰', cluster: 'p', maxLength: 3 }),
      field({ cluster: 'p', maxLength: 4 }),
      field({ cluster: 'p', maxLength: 4 }),
      field({ label: '학교명', section: '학력사항' }),
      field({ label: '입학년월', section: '학력사항' }),
      field({ label: '편입', section: '학력사항', widget: 'checkbox' }),
      field({ label: '학교명', section: '학력사항' }),
      field({ label: '생년월일' }),
      field({ label: '지원 동기를 적어 주세요', widget: 'textarea' }),
    ];
    const raw = ['홍길동', 'a@b.c', 'x@y.z', 'M', '010', '1234', '5678', '예시대학교', '2014.03', 'false', '예시고등학교', '95.03.15', '저는…'];
    const values = new Map(fields.map((f, i) => [f.fieldId, raw[i]!]));
    const { items, coverLetters } = parseImport(fields, values, assignKeys(fields));

    expect(items).toEqual([
      { schemaKey: 'basics.name.ko', value: '홍길동', raw: '홍길동' },
      { schemaKey: 'basics.email', value: 'a@b.c', raw: 'a@b.c' },
      { schemaKey: 'basics.gender', value: 'male', raw: '남자' },
      { schemaKey: 'basics.phone.mobile', value: '01012345678', raw: '010 1234 5678' },
      { schemaKey: 'education.0.school.ko', value: '예시대학교', raw: '예시대학교' },
      { schemaKey: 'education.0.startDate', value: '2014-03', raw: '2014.03' },
      { schemaKey: 'education.1.school.ko', value: '예시고등학교', raw: '예시고등학교' },
      { schemaKey: 'basics.birthDate', raw: '95.03.15' }, // 변환 실패: 원문만
    ]);
    expect(coverLetters).toEqual([{ question: '지원 동기를 적어 주세요', answer: '저는…' }]);
  });
});

describe('diffImport·applyImport', () => {
  const resume = createEmptyResume();
  resume.basics.name.ko = '홍길동';
  resume.basics.email = 'old@b.c';
  resume.education = [{ ...newEducation(), school: { ko: '예시 대학교' }, startDate: '2014-03' }];

  const items: ImportedItem[] = [
    { schemaKey: 'basics.name.ko', value: '홍길동', raw: '홍길동' },
    { schemaKey: 'basics.email', value: 'a@b.c', raw: 'a@b.c' },
    { schemaKey: 'basics.phone.mobile', value: '01012345678', raw: '010-1234-5678' },
    { schemaKey: 'basics.birthDate', raw: '95.03.15' },
    { schemaKey: 'education.0.school.ko', value: '예시대학교', raw: '예시대학교' },
    { schemaKey: 'education.0.endDate', value: '2018-02', raw: '2018.02' },
    { schemaKey: 'education.1.school.ko', value: '예시고등학교', raw: '예시고등학교' },
    { schemaKey: 'desired.salary.amount', value: 4000, raw: '4000' },
  ];

  it('같은 값 제외, 빈 항목만 기본 선택, 대표 항목으로 기존 반복 항목 판별', () => {
    const groups = diffImport(resume, items);
    const basics = groups.find((g) => g.title === '기본 정보')!;
    expect(basics.rows.map((r) => [r.label, r.current, r.imported, r.selected])).toEqual([
      ['이메일', 'old@b.c', 'a@b.c', false],
      ['휴대폰', undefined, '01012345678', true],
      ['생년월일', undefined, '95.03.15', false],
    ]);
    expect(basics.rows.find((r) => r.label === '생년월일')?.value).toBeUndefined();

    const updated = groups.find((g) => g.id === 'education.0')!;
    expect(updated).toMatchObject({ title: '학력 · 예시대학교 (갱신)', index: 0 });
    expect(updated.rows.map((r) => r.path)).toEqual(['endDate']); // 학교명은 같은 값(공백 무시)
    const added = groups.find((g) => g.id === 'education.1')!;
    expect(added.title).toBe('학력 · 예시고등학교 (추가)');
    expect(added.index).toBeUndefined();
  });

  it('선택 행만 반영: 기존 항목 갱신·새 항목 추가·희망 조건 기본값 생성, 원본 불변', () => {
    const groups = diffImport(resume, items);
    const selected = new Set(['basics.email', 'education.0:endDate', 'education.1:school.ko', 'desired.salary.amount', 'basics.birthDate']);
    const next = applyImport(resume, groups, selected);
    expect(next.basics.email).toBe('a@b.c');
    expect(next.basics.phone).toBeUndefined();
    expect(next.basics.birthDate).toBeUndefined(); // 변환 실패 행은 선택돼도 반영 안 함
    expect(next.education.map((e) => [e.school.ko, e.endDate])).toEqual([
      ['예시 대학교', '2018-02'],
      ['예시고등학교', undefined],
    ]);
    expect(next.education[1]?.id).toBeTruthy();
    expect(next.desired).toEqual({ locations: [], jobs: [], employmentTypes: [], salary: { companyPolicy: false, amount: 4000 } });
    expect(resume.basics.email).toBe('old@b.c');
    expect(resume.education).toHaveLength(1);
  });

  it('이력서 없음: 빈 이력서 기준', () => {
    const groups = diffImport(null, items);
    const next = applyImport(null, groups, new Set(['basics.name.ko']));
    expect(next.basics.name.ko).toBe('홍길동');
  });
});

describe('newCoverLetterCandidates', () => {
  it('같은 문항·답변(공백 무시)이 있으면 제외', () => {
    const existing = [{ question: '지원 동기', answer: '저는 개발자' }];
    const candidates = [
      { question: '지원동기', answer: '저는  개발자' },
      { question: '성장 과정', answer: '…' },
    ];
    expect(newCoverLetterCandidates(existing, candidates)).toEqual([{ question: '성장 과정', answer: '…' }]);
  });
});
