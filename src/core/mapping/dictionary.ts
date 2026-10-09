// 필드 키워드 사전 — 스키마 키별 autocomplete 토큰·키워드 정규식 (한/영)
// 배열 순서 = 검사 순서: 다른 키의 키워드를 포함하는 구체적 항목을 앞에 둠
// (예: '영문 이름' → 이름, '이메일 주소' → 주소, '상세 주소' → 주소)

export interface FieldRule {
  schemaKey: string;
  autocomplete: string[];   // 정규화된 autocomplete 값 (section-*·shipping·billing 제거)
  pattern: RegExp;
  exclude?: RegExp;
}

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
