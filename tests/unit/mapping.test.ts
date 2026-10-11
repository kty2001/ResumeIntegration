import { describe, expect, it } from 'vitest';
import { acceptsFile } from '@/core/attachments';
import { fieldFingerprint } from '@/core/mapping/learned';
import { detectSection, getValueByKey, keyForValue, mapFields, matchField } from '@/core/mapping/match';
import { createEmptyResume } from '@/core/schema/empty';
import { schemaKeyLabel, schemaKeyOptions } from '@/core/schema/labels';
import { isExcluded, normalizeDomain } from '@/core/site-policy';
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

  it('섹션 안에서는 basics 규칙 미적용', () => {
    expect(keyOf({ label: '주소', section: '경력사항' })).toBeUndefined();
    expect(keyOf({ label: '이름', section: '학력사항' })).toBeUndefined();
  });

  it('enum 항목 라벨은 날짜·명칭보다 enum 규칙 우선', () => {
    expect(keyOf({ label: '졸업 구분', section: '학력사항' })).toBe('education.*.status');
    expect(keyOf({ label: '학교 소재지', section: '학력사항' })).toBe('education.*.location');
    expect(keyOf({ label: '학력', section: '학력사항', widget: 'select' })).toBe('education.*.level');
    expect(keyOf({ label: '학교 구분' })).toBe('education.*.level');
    expect(keyOf({ label: '고용 형태', section: '경력사항' })).toBe('work.*.employmentType');
    expect(keyOf({ label: '성별' })).toBe('basics.gender');
    expect(keyOf({ autocomplete: 'sex' })).toBe('basics.gender');
  });

  it('병역 섹션 (인덱스 없는 키)', () => {
    expect(keyOf({ label: '병역 구분' })).toBe('military.status');
    expect(keyOf({ label: '군별', section: '병역사항' })).toBe('military.branch');
    expect(keyOf({ label: '계급', section: '병역사항' })).toBe('military.rank');
    expect(keyOf({ label: '입대일', section: '병역사항' })).toBe('military.startDate');
    expect(keyOf({ label: '전역일', section: '병역사항' })).toBe('military.endDate');
    expect(keyOf({ label: '전역 구분', section: '병역사항' })).toBe('military.dischargeType');
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

  it('새 섹션의 enum 항목', () => {
    expect(keyOf({ label: '활동 구분', section: '대외활동' })).toBe('activities.*.type');
    expect(keyOf({ label: '외국어', section: '어학' })).toBe('languageTests.*.language');
    expect(keyOf({ label: '시험 종류', section: '어학' })).toBeUndefined();
  });

  it('두 섹션이 함께 걸리는 제목은 판별 보류 → basics 규칙', () => {
    expect(detectSection(field({ label: '전공', section: '학력·경력 사항' }))).toBeUndefined();
    expect(keyOf({ label: '이메일', section: '학력·경력 사항' })).toBe('basics.email');
  });

  it('checkbox는 boolean 규칙만, 다른 입력란은 boolean 규칙 제외', () => {
    expect(keyOf({ label: '재직중', section: '경력사항', widget: 'checkbox' })).toBe('work.*.current');
    expect(keyOf({ label: '현재 근무', section: 'Work Experience', widget: 'checkbox' })).toBe('work.*.current');
    expect(keyOf({ label: '편입', section: '학력사항', widget: 'checkbox' })).toBe('education.*.transfer');
    expect(keyOf({ label: '재직중', section: '경력사항' })).toBeUndefined();
    expect(keyOf({ label: '이메일 수신 동의', widget: 'checkbox', autocomplete: 'email' })).toBeUndefined();
  });

  it('희망 조건 섹션 매칭', () => {
    expect(keyOf({ label: '희망 연봉' })).toBe('desired.salary.amount');
    expect(keyOf({ label: '회사 내규에 따름', section: '희망 근무 조건', widget: 'checkbox' })).toBe('desired.salary.companyPolicy');
    expect(keyOf({ label: '희망 근무지' })).toBe('desired.locations');
    expect(keyOf({ label: '희망 직무' })).toBe('desired.jobs');
    expect(keyOf({ label: '희망 근무 형태' })).toBe('desired.employmentTypes');
    expect(keyOf({ label: '입사 가능일', section: '희망 조건' })).toBe('desired.availableFrom');
    expect(keyOf({ label: '입사 가능일 메모', section: '희망 조건' })).toBe('desired.availableNote');
    // 경력 섹션 연봉은 희망 연봉과 구분
    expect(keyOf({ label: '연봉', section: '경력사항' })).toBe('work.*.salary');
  });

  it('파일 입력란은 섹션과 무관하게 첨부 파일 규칙만', () => {
    expect(keyOf({ label: '증명사진', widget: 'file' })).toBe('attachments.photo');
    expect(keyOf({ label: '이력서 첨부', widget: 'file' })).toBe('attachments.resume');
    expect(keyOf({ label: '자격증 사본', section: '자격증', widget: 'file' })).toBe('attachments.certificate');
    expect(keyOf({ label: '포트폴리오(PDF)', widget: 'file' })).toBe('attachments.portfolio');
    expect(keyOf({ label: '이메일', widget: 'file' })).toBeUndefined();
    expect(keyOf({ label: '이력서 제목' })).toBeUndefined();
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
      [fieldFingerprint(company)!, { schemaKey: 'basics.email' }],
      [fieldFingerprint(name)!, { schemaKey: 'basics.phone.mobile' }],
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

  it('select는 선택지 value, 텍스트 입력란의 enum 값은 표시명, 선택지 불일치는 skipped', () => {
    const r = createEmptyResume();
    r.basics.gender = 'male';
    r.education = [{ id: 'e1', level: 'university', school: { ko: '한국대학교' }, status: 'expected' }];
    const options = [
      { value: '1', text: '고등학교' },
      { value: '2', text: '대학(2,3년제)' },
      { value: '3', text: '대학교(4년제)' },
    ];
    const plan = mapFields(
      [
        field({ fieldId: '0', label: '학력', section: '학력사항', widget: 'select', options }),
        field({ fieldId: '1', label: '졸업 구분', section: '학력사항' }),
        field({ fieldId: '2', label: '성별', widget: 'select', options: [{ value: 'F', text: '여자' }] }),
      ],
      r,
    );
    expect(plan.items).toEqual([
      { fieldId: '0', schemaKey: 'education.0.level', value: '3', source: 'rule' },
      { fieldId: '1', schemaKey: 'education.0.status', value: '졸업 예정', source: 'rule' },
    ]);
    expect(plan.unmatched).toEqual([]);
    expect(plan.skipped).toEqual([{ fieldId: '2', schemaKey: 'basics.gender', reason: 'no-option' }]);
  });

  it('radio 그룹도 select처럼 선택지 value 매칭, 선택지 불일치는 skipped', () => {
    const r = createEmptyResume();
    r.basics.gender = 'female';
    r.education = [{ id: 'e1', level: 'university', school: { ko: '한국대학교' }, status: 'graduated' }];
    const plan = mapFields(
      [
        field({ fieldId: '0', name: 'sex', widget: 'radio', options: [{ value: 'M', text: '남' }, { value: 'female', text: '여' }] }),
        field({ fieldId: '1', label: '졸업 구분', section: '학력사항', widget: 'radio', options: [{ value: '1', text: '졸업' }, { value: '2', text: '졸업예정' }] }),
        field({ fieldId: '2', label: '학력', section: '학력사항', widget: 'radio', options: [{ value: 'a', text: '일반대학' }] }),
      ],
      r,
    );
    expect(plan.items).toEqual([
      { fieldId: '0', schemaKey: 'basics.gender', value: 'female', source: 'rule' },
      { fieldId: '1', schemaKey: 'education.0.status', value: '1', source: 'rule' },
    ]);
    expect(plan.skipped).toEqual([{ fieldId: '2', schemaKey: 'education.0.level', reason: 'no-option' }]);
  });

  it('checkbox는 boolean 값을 true/false로, 값 없으면 unmatched', () => {
    const r = createEmptyResume();
    r.work = [{ id: 'w1', company: { ko: '가나다' }, startDate: '2020-01', current: true }];
    r.education = [
      { id: 'e1', level: 'university', school: { ko: '한국대학교' }, status: 'graduated', transfer: false },
      { id: 'e2', level: 'master', school: { ko: '한국대학원' }, status: 'graduated' },
    ];
    const transfer = (fieldId: string) => field({ fieldId, label: '편입', section: '학력사항', widget: 'checkbox' });
    const plan = mapFields(
      [field({ fieldId: '0', label: '재직중', section: '경력사항', widget: 'checkbox' }), transfer('1'), transfer('2')],
      r,
    );
    expect(plan.items).toEqual([
      { fieldId: '0', schemaKey: 'work.0.current', value: 'true', source: 'rule' },
      { fieldId: '1', schemaKey: 'education.0.transfer', value: 'false', source: 'rule' },
    ]);
    expect(plan.unmatched).toEqual(['2']);
  });

  it('희망 조건 배열 값: 텍스트는 결합(enum은 표시명), select는 원소 순서대로 첫 일치 선택지', () => {
    const r = createEmptyResume();
    r.desired = {
      salary: { amount: 5000, companyPolicy: false },
      locations: ['서울', '경기'],
      jobs: [],
      employmentTypes: ['intern', 'full_time'],
      availableFrom: '2026-11-01',
    };
    const plan = mapFields(
      [
        field({ fieldId: '0', label: '희망 연봉' }),
        field({ fieldId: '1', label: '회사 내규', section: '희망 조건', widget: 'checkbox' }),
        field({ fieldId: '2', label: '희망 근무지' }),
        field({ fieldId: '3', label: '희망 고용 형태' }),
        field({ fieldId: '4', label: '희망 고용 형태', widget: 'select', options: [{ value: 'P', text: '정규직' }, { value: 'C', text: '계약직' }] }),
        field({ fieldId: '5', label: '입사 가능일', section: '희망 조건', placeholder: 'YYYY.MM.DD' }),
        field({ fieldId: '6', label: '희망 직무' }),
      ],
      r,
    );
    expect(plan.items.map((i) => [i.schemaKey, i.value])).toEqual([
      ['desired.salary.amount', '5000'],
      ['desired.salary.companyPolicy', 'false'],
      ['desired.locations', '서울, 경기'],
      ['desired.employmentTypes', '인턴, 정규직'],
      ['desired.employmentTypes', 'P'],
      ['desired.availableFrom', '2026.11.01'],
    ]);
    expect(plan.unmatched).toEqual(['6']);
  });

  it('checkbox 그룹은 원소별 일치 선택지 전부(JSON 배열), 하나도 없으면 skipped', () => {
    const r = createEmptyResume();
    r.desired = { locations: ['서울', '부산', '제주'], jobs: [], employmentTypes: ['full_time', 'intern'] };
    const plan = mapFields(
      [
        field({ fieldId: '0', label: '희망 고용 형태', widget: 'checkboxes', options: [
          { value: 'P', text: '정규직' }, { value: 'C', text: '계약직' }, { value: 'I', text: '인턴' },
        ] }),
        field({ fieldId: '1', label: '희망 근무지', widget: 'checkboxes', options: [
          { value: '11', text: '서울특별시' }, { value: '26', text: '부산광역시' }, { value: '41', text: '경기도' },
        ] }),
        field({ fieldId: '2', label: '희망 직무', widget: 'checkboxes', options: [{ value: 'a', text: '개발' }] }),
      ],
      r,
    );
    expect(plan.items.map((i) => i.value)).toEqual(['["P","I"]', '["11","26"]']);
    expect(plan.unmatched).toEqual(['2']);
  });

  describe('분리 입력', () => {
    const r = createEmptyResume();
    r.basics.phone = { mobile: '010-1234-5678' };
    r.basics.birthDate = '1995-03-15';
    r.education = [{ id: 'e1', level: 'university', school: { ko: '한국대학교' }, status: 'graduated', startDate: '2014-03', endDate: '2020-02' }];
    const numbers = (from: number, to: number, text = (n: number) => String(n)) =>
      Array.from({ length: to - from + 1 }, (_, k) => ({ value: String(from + k), text: text(from + k) }));
    const values = (plan: ReturnType<typeof mapFields>) => plan.items.map((i) => [i.fieldId, i.schemaKey, i.value]);

    it('전화번호 3칸: 국번 select + 4자리 칸 2개 (뒤 칸은 미매칭)', () => {
      const plan = mapFields(
        [
          field({ fieldId: '0', label: '휴대폰', widget: 'select', cluster: 'c', options: [{ value: '010', text: '010' }, { value: '011', text: '011' }] }),
          field({ fieldId: '1', name: 'hp2', maxLength: 4, cluster: 'c' }),
          field({ fieldId: '2', name: 'hp3', maxLength: 4, cluster: 'c' }),
        ],
        r,
      );
      expect(values(plan)).toEqual([
        ['0', 'basics.phone.mobile', '010'],
        ['1', 'basics.phone.mobile', '1234'],
        ['2', 'basics.phone.mobile', '5678'],
      ]);
    });

    it('생년월일 연·월·일 select: 숫자로 선택지 매칭', () => {
      const plan = mapFields(
        [
          field({ fieldId: '0', label: '생년월일', widget: 'select', cluster: 'b', options: numbers(1990, 1999, (n) => `${n}년`) }),
          field({ fieldId: '1', name: 'birth_m', widget: 'select', cluster: 'b', options: numbers(1, 12, (n) => `${n}월`) }),
          field({ fieldId: '2', name: 'birth_d', widget: 'select', cluster: 'b', options: numbers(1, 31, (n) => String(n).padStart(2, '0')) }),
        ],
        r,
      );
      expect(values(plan)).toEqual([
        ['0', 'basics.birthDate', '1995'],
        ['1', 'basics.birthDate', '3'],
        ['2', 'basics.birthDate', '15'],
      ]);
    });

    it('한 묶음 안 입학·졸업 연/월 칸: 키별로 나눠 같은 인덱스', () => {
      const plan = mapFields(
        [
          field({ fieldId: '0', label: '입학년월', section: '학력사항', maxLength: 4, cluster: 'e' }),
          field({ fieldId: '1', name: 'in_m', section: '학력사항', maxLength: 2, cluster: 'e' }),
          field({ fieldId: '2', label: '졸업년월', section: '학력사항', maxLength: 4, cluster: 'e' }),
          field({ fieldId: '3', name: 'out_m', section: '학력사항', maxLength: 2, cluster: 'e' }),
        ],
        r,
      );
      expect(values(plan)).toEqual([
        ['0', 'education.0.startDate', '2014'],
        ['1', 'education.0.startDate', '03'],
        ['2', 'education.0.endDate', '2020'],
        ['3', 'education.0.endDate', '02'],
      ]);
    });

    it('짧은 칸이 아니거나 묶음이 아니면 분할하지 않음', () => {
      const plan = mapFields(
        [
          field({ fieldId: '0', label: '휴대폰', cluster: 'c' }),
          field({ fieldId: '1', name: 'memo', maxLength: 4, cluster: 'c' }),
          field({ fieldId: '2', label: '생년월일', maxLength: 4 }),
          field({ fieldId: '3', name: 'x', maxLength: 2 }),
        ],
        r,
      );
      expect(values(plan)).toEqual([
        ['0', 'basics.phone.mobile', '010-1234-5678'],
        ['2', 'basics.birthDate', '1995-03-15'],
      ]);
      expect(plan.unmatched).toEqual(['1', '3']);
    });
  });

  it('select 학습 선택지: 이력서 값이 학습 당시와 같을 때만 적용, 선택지 없으면 사전 매칭', () => {
    const r = createEmptyResume();
    r.education = [{ id: 'e1', level: 'university', school: { ko: '한국대학교' }, status: 'graduated' }];
    const level = field({ label: '학력', section: '학력사항', widget: 'select', options: [
      { value: 'A', text: '일반 대학' },
      { value: 'B', text: '대학교(4년)' },
    ] });
    const learned = (value: string) =>
      new Map([[fieldFingerprint(level)!, { schemaKey: 'education.0.level', option: { value, text: '일반대학' } }]]);

    expect(mapFields([level], r, learned('university')).items[0]).toMatchObject({ value: 'A', source: 'learned' });
    // 이력서 값이 바뀌면 학습 선택지 무시 → 사전 매칭
    expect(mapFields([level], r, learned('college')).items[0]?.value).toBe('B');
    // 학습한 텍스트의 선택지가 사라지면 사전 매칭
    const noLearnedText = { ...level, options: [{ value: 'B', text: '대학교(4년)' }] };
    expect(mapFields([noLearnedText], r, learned('university')).items[0]?.value).toBe('B');
  });

  it('파일 입력란: accept에 맞는 해당 구분 첫 첨부 파일 id', () => {
    const r = createEmptyResume();
    const meta = (id: string, kind: 'photo' | 'resume', fileName: string, mimeType: string) =>
      ({ id, kind, fileName, mimeType, size: 1, addedAt: '2026-10-01T00:00:00.000Z' });
    r.attachments = [meta('a1', 'resume', 'resume.docx', 'application/msword'), meta('a2', 'resume', 'resume.pdf', 'application/pdf'), meta('p1', 'photo', 'me.jpg', 'image/jpeg')];
    const plan = mapFields(
      [
        field({ fieldId: '0', label: '이력서', widget: 'file', accept: '.pdf' }),
        field({ fieldId: '1', label: '증명사진', widget: 'file', accept: 'image/*' }),
        field({ fieldId: '2', label: '포트폴리오', widget: 'file' }),
        field({ fieldId: '3', label: '이력서', widget: 'file', accept: '.hwp' }),
      ],
      r,
    );
    expect(plan.items.map((i) => [i.fieldId, i.value])).toEqual([['0', 'a2'], ['1', 'p1']]);
    expect(plan.unmatched).toEqual(['2', '3']);
  });

  it('acceptsFile: 확장자·MIME 와일드카드·정확한 MIME', () => {
    expect(acceptsFile(undefined, 'a.pdf', 'application/pdf')).toBe(true);
    expect(acceptsFile('.PDF, .doc', 'a.pdf', 'application/pdf')).toBe(true);
    expect(acceptsFile('image/*', 'a.png', 'image/png')).toBe(true);
    expect(acceptsFile('application/pdf', 'a.png', 'image/png')).toBe(false);
  });

  it('keyForValue: 입력란 형식으로 같은 값인 이력서 항목이 하나일 때만', () => {
    const r = createEmptyResume();
    r.basics.email = 'hong@example.com';
    r.basics.phone = { mobile: '010-1234-5678', home: '010-1234-5678' };
    r.basics.gender = 'female';
    r.basics.address = { line2: '101호' };
    expect(keyForValue(r, ' hong@example.com ', { widget: 'text' })).toBe('basics.email');
    expect(keyForValue(r, '101호', { widget: 'text' })).toBe('basics.address.line2');
    // 휴대폰·자택 전화가 같은 값 → 판단 보류
    expect(keyForValue(r, '010-1234-5678', { widget: 'text' })).toBeUndefined();
    expect(keyForValue(r, 'F', { widget: 'select', options: [{ value: 'M', text: '남' }, { value: 'F', text: '여' }] })).toBe('basics.gender');
    expect(keyForValue(r, '직접 쓴 값', { widget: 'text' })).toBeUndefined();
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
    expect(schemaKeyLabel('work.0.current')).toBe('경력 1 재직 중');
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
    expect(isExcluded('https://recruit.example.com/apply', ['example.com'])).toBe(true);
  });

  it('normalizeDomain: 주소·www·대소문자 정리, 형식 아니면 undefined', () => {
    expect(normalizeDomain(' https://WWW.Example.com/jobs?id=1 ')).toBe('example.com');
    expect(normalizeDomain('recruit.example.co.kr/apply')).toBe('recruit.example.co.kr');
    expect(normalizeDomain('localhost:3000')).toBe('localhost');
    expect(normalizeDomain('example')).toBeUndefined();
    expect(normalizeDomain('')).toBeUndefined();
    expect(normalizeDomain('채용 사이트')).toBeUndefined();
  });
});
