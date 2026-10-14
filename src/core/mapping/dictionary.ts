// 필드 키워드 사전 — 스키마 키별 autocomplete 토큰·키워드 정규식 (한/영)
// 배열 순서 = 검사 순서: 다른 키의 키워드를 포함하는 구체적 항목을 앞에 둠
// (예: '영문 이름' → 이름, '이메일 주소' → 주소, '상세 주소' → 주소)

import type { SectionKey } from '@/core/schema/labels';

/** 반복 항목 섹션 + 병역·희망 조건(단일 객체) */
export type RuleSection = SectionKey | 'military' | 'desired';

export interface FieldRule {
  schemaKey: string;        // 반복 섹션 규칙은 인덱스 자리를 '*'로 표기 (education.*.school.ko)
  autocomplete?: string[];  // 정규화된 autocomplete 값 (section-*·shipping·billing 제거)
  pattern: RegExp;
  exclude?: RegExp;
  section?: RuleSection;    // 지정 시 해당 섹션 문맥에서만 검사
  checkbox?: true;          // boolean 키: checkbox 입력란에만 적용 (checkbox는 이 규칙만 검사)
}

// 섹션 판별: 입력란 텍스트 → 섹션 텍스트(fieldset legend·직전 제목) 순, 두 섹션이 함께 걸리면 판별 보류
export const SECTION_RULES: { section: RuleSection; pattern: RegExp }[] = [
  { section: 'education', pattern: /학력|학교|school|education/i },
  // '수상경력'·'활동 경력' 같은 제목, '회사 내규'(희망 연봉 옵션)는 경력 섹션으로 보지 않음
  { section: 'work', pattern: /(?<!(수상|활동|봉사)\s*)경력|직장|회사(?!\s*내규)|company(?!\s*policy)|employment|work\s*experience|career/i },
  { section: 'certificates', pattern: /자격|면허|certificat|license|\bcert/i },
  { section: 'languageTests', pattern: /어학|외국어|language|toeic|토익/i },
  { section: 'awards', pattern: /수상|award|honou?r/i },
  { section: 'activities', pattern: /활동|동아리|봉사|activit|volunteer|extracurricular/i },
  { section: 'projects', pattern: /프로젝트|project/i },
  { section: 'military', pattern: /병역|군\s*복무|군필|military/i },
  { section: 'desired', pattern: /희망|desired|preferred/i },
];

// 날짜·명칭 규칙에서 제외할 enum 성격 라벨 (학교 구분·졸업 상태 등은 각 enum 규칙이 먼저 처리)
const ENUM_LABEL = /구분|상태|여부|유형|종류|형태|소재|type|status|location/i;

export const SECTION_FIELD_RULES: FieldRule[] = [
  // 학력
  {
    section: 'education',
    schemaKey: 'education.*.school.en',
    pattern: /영문\s*학교|학교\s*명?\s*\(\s*영문|school.*\(\s*(english|eng)\s*\)/i,
  },
  {
    section: 'education',
    schemaKey: 'education.*.school.ko',
    pattern: /학교\s*명|school\s*name/i,
  },
  {
    section: 'education',
    schemaKey: 'education.*.major.en',
    pattern: /영문\s*전공|전공\s*명?\s*\(\s*영문|major.*\(\s*(english|eng)\s*\)/i,
  },
  { section: 'education', schemaKey: 'education.*.minor', pattern: /부\s*전공|minor/i },
  {
    section: 'education',
    schemaKey: 'education.*.doubleMajor',
    pattern: /복수\s*전공|이중\s*전공|double\s*major|second\s*major/i,
  },
  { section: 'education', schemaKey: 'education.*.major.ko', pattern: /전공|학과|major/i, exclude: /계열/ },
  {
    section: 'education',
    schemaKey: 'education.*.gpa.max',
    pattern: /만점|기준\s*학점|학점\s*기준|scale|out\s*of|max/i,
  },
  {
    section: 'education',
    schemaKey: 'education.*.gpa.value',
    pattern: /학점|평점|gpa/i,
    exclude: /이수|취득|credit/i,
  },
  {
    section: 'education',
    schemaKey: 'education.*.status',
    pattern: /(졸업|재학)\s*(구분|상태|여부)|학적|status/i,
  },
  { section: 'education', schemaKey: 'education.*.location', pattern: /소재지?|국내\s*\/?\s*해외|location/i },
  {
    section: 'education',
    schemaKey: 'education.*.level',
    pattern: /학력|(학교|대학)\s*(구분|종류|유형)|학위|degree|level/i,
  },
  {
    section: 'education',
    schemaKey: 'education.*.startDate',
    pattern: /입학|start|admission/i,
    exclude: ENUM_LABEL,
  },
  {
    section: 'education',
    schemaKey: 'education.*.endDate',
    pattern: /졸업|end|graduat/i,
    exclude: ENUM_LABEL,
  },
  {
    section: 'education',
    schemaKey: 'education.*.school.ko',
    pattern: /학교|대학|school|university|college/i,
    exclude: ENUM_LABEL,
  },
  { section: 'education', schemaKey: 'education.*.transfer', pattern: /편입|transfer/i, checkbox: true },
  // 경력
  {
    section: 'work',
    schemaKey: 'work.*.company.en',
    pattern: /영문\s*(회사|직장)|(회사|직장)\s*명?\s*\(\s*영문|company.*\(\s*(english|eng)\s*\)/i,
  },
  {
    section: 'work',
    schemaKey: 'work.*.company.ko',
    pattern: /(회사|직장|기관)\s*(명|이름)|company\s*name|employer/i,
  },
  {
    section: 'work',
    schemaKey: 'work.*.leaveReason',
    pattern: /(퇴사|퇴직|이직)\s*사유|reason\s*for\s*leaving/i,
  },
  {
    section: 'work',
    schemaKey: 'work.*.description',
    pattern: /담당\s*업무|업무\s*내용|주요\s*업무|직무\s*내용|경력\s*기술|description|duties|responsibilit/i,
  },
  { section: 'work', schemaKey: 'work.*.startDate', pattern: /입사|start|join/i, exclude: ENUM_LABEL },
  { section: 'work', schemaKey: 'work.*.endDate', pattern: /퇴사|퇴직|end/i, exclude: ENUM_LABEL },
  { section: 'work', schemaKey: 'work.*.salary', pattern: /연봉|급여|salary/i, exclude: /희망|desired/i },
  { section: 'work', schemaKey: 'work.*.department', pattern: /부서|department|\bdept\b/i },
  { section: 'work', schemaKey: 'work.*.rank', pattern: /직급|rank/i },
  {
    section: 'work',
    schemaKey: 'work.*.role.ko',
    pattern: /직무|담당\s*분야|\bjob\b|role/i,
  },
  { section: 'work', schemaKey: 'work.*.title', pattern: /직책|직위|position|title/i },
  {
    section: 'work',
    schemaKey: 'work.*.employmentType',
    pattern: /(고용|근무|채용|계약)\s*(형태|구분|유형)|employment\s*type/i,
  },
  {
    section: 'work',
    schemaKey: 'work.*.company.ko',
    pattern: /회사|직장|company/i,
    exclude: /주소|전화|규모|업종|size|industry|구분|형태|유형|type|소재|location/i,
  },
  {
    section: 'work',
    schemaKey: 'work.*.current',
    pattern: /재직\s*중|현재\s*(재직|근무)|근무\s*중|current|present/i,
    checkbox: true,
  },
  // 자격증
  {
    section: 'certificates',
    schemaKey: 'certificates.*.number',
    pattern: /번호|number|\bno\b/i,
  },
  {
    section: 'certificates',
    schemaKey: 'certificates.*.issuer',
    pattern: /기관|발행|시행처|issuer|issued\s*by|organization/i,
  },
  {
    section: 'certificates',
    schemaKey: 'certificates.*.date',
    pattern: /취득|발급\s*일|합격|date|acquired/i,
    exclude: ENUM_LABEL,
  },
  {
    section: 'certificates',
    schemaKey: 'certificates.*.name',
    pattern: /자격|면허|명칭|name|certificat|license/i,
    exclude: ENUM_LABEL,
  },
  // 어학
  {
    section: 'languageTests',
    schemaKey: 'languageTests.*.registrationNo',
    pattern: /번호|registration|number|\bno\b/i,
  },
  {
    section: 'languageTests',
    schemaKey: 'languageTests.*.expiresAt',
    pattern: /만료|유효|expir|valid/i,
  },
  {
    section: 'languageTests',
    schemaKey: 'languageTests.*.date',
    pattern: /응시|취득|시험\s*일|date/i,
    exclude: ENUM_LABEL,
  },
  { section: 'languageTests', schemaKey: 'languageTests.*.grade', pattern: /등급|급수|grade|level/i },
  { section: 'languageTests', schemaKey: 'languageTests.*.score', pattern: /점수|성적|score/i },
  {
    section: 'languageTests',
    schemaKey: 'languageTests.*.exam',
    pattern: /시험|exam|test/i,
    exclude: ENUM_LABEL,
  },
  { section: 'languageTests', schemaKey: 'languageTests.*.language', pattern: /외국어|언어|language/i },
  // 수상
  {
    section: 'awards',
    schemaKey: 'awards.*.awarder',
    pattern: /수여|주최|주관|기관|awarder|issuer|organization/i,
  },
  {
    section: 'awards',
    schemaKey: 'awards.*.date',
    pattern: /수상\s*(일|년월|연월|날짜)|일자|date/i,
    exclude: ENUM_LABEL,
  },
  { section: 'awards', schemaKey: 'awards.*.description', pattern: /내용|설명|description|detail/i },
  {
    section: 'awards',
    schemaKey: 'awards.*.title',
    pattern: /수상|대회|상\s*명|award|title|name/i,
    exclude: ENUM_LABEL,
  },
  // 활동
  {
    section: 'activities',
    schemaKey: 'activities.*.organization',
    pattern: /기관|단체|주최|주관|소속|organization/i,
  },
  { section: 'activities', schemaKey: 'activities.*.startDate', pattern: /시작|start/i, exclude: ENUM_LABEL },
  { section: 'activities', schemaKey: 'activities.*.endDate', pattern: /종료|end/i, exclude: ENUM_LABEL },
  {
    section: 'activities',
    schemaKey: 'activities.*.description',
    pattern: /내용|설명|역할|description|detail/i,
  },
  { section: 'activities', schemaKey: 'activities.*.type', pattern: /구분|종류|유형|분류|type/i },
  {
    section: 'activities',
    schemaKey: 'activities.*.name',
    pattern: /활동|명칭|name|title/i,
    exclude: ENUM_LABEL,
  },
  // 프로젝트
  { section: 'projects', schemaKey: 'projects.*.url', pattern: /url|링크|주소|link|github/i },
  {
    section: 'projects',
    schemaKey: 'projects.*.organization',
    pattern: /기관|소속|발주|organization|client/i,
  },
  { section: 'projects', schemaKey: 'projects.*.startDate', pattern: /시작|start/i, exclude: ENUM_LABEL },
  { section: 'projects', schemaKey: 'projects.*.endDate', pattern: /종료|end/i, exclude: ENUM_LABEL },
  {
    section: 'projects',
    schemaKey: 'projects.*.description',
    pattern: /내용|설명|역할|description|detail/i,
  },
  {
    section: 'projects',
    schemaKey: 'projects.*.name',
    pattern: /프로젝트|명칭|name|title/i,
    exclude: ENUM_LABEL,
  },
  // 병역 (단일 객체 → 인덱스 없는 키, 민감 항목 exemptionReason 제외)
  {
    section: 'military',
    schemaKey: 'military.dischargeType',
    pattern: /(전역|제대)\s*(구분|사유|유형|형태)|discharge/i,
  },
  { section: 'military', schemaKey: 'military.branch', pattern: /군별|군\s*(구분|종류)|branch/i },
  { section: 'military', schemaKey: 'military.rank', pattern: /계급|rank/i },
  {
    section: 'military',
    schemaKey: 'military.startDate',
    pattern: /입대|입영|복무\s*시작|enlist|start/i,
    exclude: ENUM_LABEL,
  },
  {
    section: 'military',
    schemaKey: 'military.endDate',
    pattern: /전역|제대|소집\s*해제|복무\s*종료|end/i,
    exclude: ENUM_LABEL,
  },
  { section: 'military', schemaKey: 'military.status', pattern: /병역|군필|구분|사항|여부|상태|status|military/i },
  // 희망 조건 (단일 객체 → 인덱스 없는 키, 배열 값은 match.ts에서 처리)
  {
    section: 'desired',
    schemaKey: 'desired.salary.companyPolicy',
    pattern: /내규|협의|negotiable|company\s*policy/i,
    checkbox: true,
  },
  { section: 'desired', schemaKey: 'desired.salary.amount', pattern: /연봉|급여|salary|\bpay\b/i },
  {
    section: 'desired',
    schemaKey: 'desired.employmentTypes',
    pattern: /(고용|근무|채용)\s*(형태|구분|유형)|employment/i,
  },
  { section: 'desired', schemaKey: 'desired.locations', pattern: /근무\s*(지|지역)|지역|location|region/i },
  { section: 'desired', schemaKey: 'desired.jobs', pattern: /직무|직종|분야|\bjob|position|role/i },
  { section: 'desired', schemaKey: 'desired.availableNote', pattern: /(입사|가능).*(메모|비고)|\bnote/i },
  {
    section: 'desired',
    schemaKey: 'desired.availableFrom',
    pattern: /입사\s*(가능|예정)|가능\s*일|available|start/i,
  },
];

// 민감정보(보훈·장애·취업보호·병역 면제 사유): 설정 '민감정보 자동 입력 사용'을 켰을 때만 검사 (섹션 무관, 일반 규칙보다 먼저)
// checkbox 표시 규칙은 checkbox 입력란에만 적용 (일반 규칙과 같음)
export const SENSITIVE_RULES: FieldRule[] = [
  { schemaKey: 'preference.veteran.number', pattern: /보훈\s*번호|유공자\s*번호/ },
  { schemaKey: 'preference.veteran.relation', pattern: /보훈\s*관계|유공자\s*(와의\s*)?관계/ },
  { schemaKey: 'preference.disability.severity', pattern: /장애\s*(정도|등급|구분|유형)/ },
  { schemaKey: 'military.exemptionReason', pattern: /면제\s*사유/ },
  { schemaKey: 'preference.veteran.target', pattern: /보훈|국가\s*유공/, checkbox: true },
  { schemaKey: 'preference.employmentProtection', pattern: /취업\s*보호/, checkbox: true },
  { schemaKey: 'preference.disability.target', pattern: /장애/, checkbox: true },
];

/** 민감정보 키: 설정을 끄면 학습 규칙으로 매칭돼도 입력하지 않음 */
export function isSensitiveKey(schemaKey: string): boolean {
  return schemaKey.startsWith('preference.') || schemaKey === 'military.exemptionReason';
}

// 파일 입력란 전용 (섹션 판별 없이 이 규칙만 검사, 키는 core/attachments.ts attachmentKey)
export const FILE_RULES: FieldRule[] = [
  { schemaKey: 'attachments.photo', pattern: /증명\s*사진|사진|photo|picture|profile\s*image/i },
  { schemaKey: 'attachments.portfolio', pattern: /포트\s*폴리오|portfolio|작품/i },
  { schemaKey: 'attachments.transcript', pattern: /성적\s*(증명|표)|transcript/i },
  { schemaKey: 'attachments.certificate', pattern: /증명서|자격증|사본|certificate/i },
  { schemaKey: 'attachments.resume', pattern: /이력서|경력\s*기술서|resume|\bcv\b/i },
];

export const FIELD_RULES: FieldRule[] = [
  {
    schemaKey: 'basics.name.en',
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
    pattern: /상세\s*주소|나머지\s*주소|주소\s*2|address\s*(line\s*)?2|addr(ess)?_?2|detail_?addr|addr(ess)?_?details?/i,
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
    pattern: /한\s*줄\s*소개|간단\s*소개|headline|summary/i,
  },
  { schemaKey: 'basics.gender', autocomplete: ['sex'], pattern: /성별|gender|\bsex\b/i },
  {
    schemaKey: 'basics.name.ko',
    autocomplete: ['name'],
    pattern: /성명|성함|이름|full\s*name|\bname\b/i,
    exclude: /회사|학교|기관|단체|프로젝트|자격|파일|닉네임|아이디|company|school|organi[sz]ation|project|file|nick|user/i,
  },
];
