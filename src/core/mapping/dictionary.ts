// 필드 키워드 사전 — 스키마 키별 autocomplete 토큰·키워드 정규식 (한/영)
// 배열 순서 = 검사 순서: 다른 키의 키워드를 포함하는 구체적 항목을 앞에 둠
// (예: '영문 이름' → 이름, '이메일 주소' → 주소, '상세 주소' → 주소)

export type SectionKey = 'education' | 'work';

export interface FieldRule {
  schemaKey: string;        // 섹션 규칙은 인덱스 자리를 '*'로 표기 (education.*.school.ko)
  autocomplete: string[];   // 정규화된 autocomplete 값 (section-*·shipping·billing 제거)
  pattern: RegExp;
  exclude?: RegExp;
  section?: SectionKey;     // 지정 시 해당 섹션 문맥에서만 검사
}

// 섹션 판별: 입력란 텍스트 → 섹션 텍스트(fieldset legend·직전 제목) 순, 두 섹션이 함께 걸리면 판별 보류
export const SECTION_RULES: { section: SectionKey; pattern: RegExp }[] = [
  { section: 'education', pattern: /학력|학교|school|education/i },
  { section: 'work', pattern: /경력|직장|회사|company|employment|work\s*experience|career/i },
];

// enum 성격 라벨 (학교 구분·졸업 상태·고용 형태 등) → 드롭다운 처리 시 매핑
const ENUM_LABEL = /구분|상태|여부|유형|종류|형태|소재|type|status|location/i;

export const SECTION_FIELD_RULES: FieldRule[] = [
  // 학력
  {
    section: 'education',
    schemaKey: 'education.*.school.en',
    autocomplete: [],
    pattern: /영문\s*학교|학교\s*명?\s*\(\s*영문|school.*\(\s*(english|eng)\s*\)/i,
  },
  {
    section: 'education',
    schemaKey: 'education.*.school.ko',
    autocomplete: [],
    pattern: /학교\s*명|school\s*name/i,
  },
  {
    section: 'education',
    schemaKey: 'education.*.major.en',
    autocomplete: [],
    pattern: /영문\s*전공|전공\s*명?\s*\(\s*영문|major.*\(\s*(english|eng)\s*\)/i,
  },
  { section: 'education', schemaKey: 'education.*.minor', autocomplete: [], pattern: /부\s*전공|minor/i },
  {
    section: 'education',
    schemaKey: 'education.*.doubleMajor',
    autocomplete: [],
    pattern: /복수\s*전공|이중\s*전공|double\s*major|second\s*major/i,
  },
  { section: 'education', schemaKey: 'education.*.major.ko', autocomplete: [], pattern: /전공|학과|major/i, exclude: /계열/ },
  {
    section: 'education',
    schemaKey: 'education.*.gpa.max',
    autocomplete: [],
    pattern: /만점|기준\s*학점|학점\s*기준|scale|out\s*of|max/i,
  },
  {
    section: 'education',
    schemaKey: 'education.*.gpa.value',
    autocomplete: [],
    pattern: /학점|평점|gpa/i,
    exclude: /이수|취득|credit/i,
  },
  {
    section: 'education',
    schemaKey: 'education.*.startDate',
    autocomplete: [],
    pattern: /입학|start|admission/i,
    exclude: ENUM_LABEL,
  },
  {
    section: 'education',
    schemaKey: 'education.*.endDate',
    autocomplete: [],
    pattern: /졸업|end|graduat/i,
    exclude: ENUM_LABEL,
  },
  {
    section: 'education',
    schemaKey: 'education.*.school.ko',
    autocomplete: [],
    pattern: /학교|대학|school|university|college/i,
    exclude: ENUM_LABEL,
  },
  // 경력
  {
    section: 'work',
    schemaKey: 'work.*.company.en',
    autocomplete: [],
    pattern: /영문\s*(회사|직장)|(회사|직장)\s*명?\s*\(\s*영문|company.*\(\s*(english|eng)\s*\)/i,
  },
  {
    section: 'work',
    schemaKey: 'work.*.company.ko',
    autocomplete: [],
    pattern: /(회사|직장|기관)\s*(명|이름)|company\s*name|employer/i,
  },
  {
    section: 'work',
    schemaKey: 'work.*.leaveReason',
    autocomplete: [],
    pattern: /(퇴사|퇴직|이직)\s*사유|reason\s*for\s*leaving/i,
  },
  {
    section: 'work',
    schemaKey: 'work.*.description',
    autocomplete: [],
    pattern: /담당\s*업무|업무\s*내용|주요\s*업무|직무\s*내용|경력\s*기술|description|duties|responsibilit/i,
  },
  { section: 'work', schemaKey: 'work.*.startDate', autocomplete: [], pattern: /입사|start|join/i, exclude: ENUM_LABEL },
  { section: 'work', schemaKey: 'work.*.endDate', autocomplete: [], pattern: /퇴사|퇴직|end/i, exclude: ENUM_LABEL },
  { section: 'work', schemaKey: 'work.*.salary', autocomplete: [], pattern: /연봉|급여|salary/i, exclude: /희망|desired/i },
  { section: 'work', schemaKey: 'work.*.department', autocomplete: [], pattern: /부서|department|\bdept\b/i },
  { section: 'work', schemaKey: 'work.*.rank', autocomplete: [], pattern: /직급|rank/i },
  {
    section: 'work',
    schemaKey: 'work.*.role.ko',
    autocomplete: [],
    pattern: /직무|담당\s*분야|\bjob\b|role/i,
  },
  { section: 'work', schemaKey: 'work.*.title', autocomplete: [], pattern: /직책|직위|position|title/i },
  {
    section: 'work',
    schemaKey: 'work.*.company.ko',
    autocomplete: [],
    pattern: /회사|직장|company/i,
    exclude: /주소|전화|규모|업종|size|industry|구분|형태|유형|type|소재|location/i,
  },
];

export const FIELD_RULES: FieldRule[] = [
  {
    schemaKey: 'basics.name.en',
    autocomplete: [],
    pattern: /영문\s*(성명|이름|성함)|english\s*name|name.*\(\s*(english|eng)\s*\)|eng_?name|name_?eng?\b/i,
  },
  {
    schemaKey: 'basics.email',
    autocomplete: ['email'],
    pattern: /e-?mail|이메일|전자\s*우편/i,
  },
  {
    schemaKey: 'basics.address.postalCode',
    autocomplete: ['postal-code'],
    pattern: /우편\s*번호|zip|postal|post_?code/i,
  },
  {
    schemaKey: 'basics.address.line2',
    autocomplete: ['address-line2'],
    pattern: /상세\s*주소|나머지\s*주소|주소\s*2|address\s*(line\s*)?2|addr(ess)?_?2|detail_?addr/i,
  },
  {
    schemaKey: 'basics.address.line1',
    autocomplete: ['street-address', 'address-line1'],
    pattern: /주소|address|addr/i,
  },
  {
    schemaKey: 'basics.phone.home',
    autocomplete: ['home tel', 'home tel-national'],
    pattern: /자택|집\s*전화|일반\s*전화|home\s*(phone|tel)/i,
  },
  {
    // 일반 '전화번호'·'연락처'는 휴대폰으로 처리
    schemaKey: 'basics.phone.mobile',
    autocomplete: ['tel', 'tel-national', 'mobile tel', 'mobile tel-national'],
    pattern: /휴대|핸드폰|연락처|전화\s*번호|mobile|cell|phone|\bhp\b|\btel\b/i,
  },
  {
    schemaKey: 'basics.birthDate',
    autocomplete: ['bday'],
    pattern: /생년월일|생일|birth|bday|\bdob\b/i,
  },
  {
    schemaKey: 'basics.summary',
    autocomplete: [],
    pattern: /한\s*줄\s*소개|간단\s*소개|headline|summary/i,
  },
  {
    schemaKey: 'basics.name.ko',
    autocomplete: ['name'],
    pattern: /성명|성함|이름|full\s*name|\bname\b/i,
    exclude: /회사|학교|기관|단체|프로젝트|자격|파일|닉네임|아이디|company|school|organi[sz]ation|project|file|nick|user/i,
  },
];
