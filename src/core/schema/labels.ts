import type {
  ActivityType,
  AttachmentKind,
  CoverLetterTag,
  DischargeType,
  DisabilitySeverity,
  EducationLevel,
  EmploymentType,
  Fluency,
  Gender,
  GpaScale,
  GraduationStatus,
  LengthUnit,
  MilitaryBranch,
  MilitaryStatus,
  Resume,
  SchoolLocation,
} from './resume';

// enum 코드 → 한국어 표시명: docs/design/resume_schema_v1.md 5장

export const GENDER_LABELS: Record<Gender, string> = { male: '남', female: '여' };

export const EDUCATION_LEVEL_LABELS: Record<EducationLevel, string> = {
  high_school: '고등학교',
  college: '대학교(2·3년)',
  university: '대학교(4년)',
  master: '대학원(석사)',
  doctor: '대학원(박사)',
};

export const GRADUATION_STATUS_LABELS: Record<GraduationStatus, string> = {
  graduated: '졸업',
  expected: '졸업 예정',
  completed: '수료',
  dropped: '중퇴',
  enrolled: '재학',
  on_leave: '휴학',
};

export const SCHOOL_LOCATION_LABELS: Record<SchoolLocation, string> = { domestic: '국내', overseas: '해외' };

export const GPA_SCALES: GpaScale[] = [4.5, 4.3, 4.0, 100];

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  full_time: '정규직',
  contract: '계약직',
  intern: '인턴',
  part_time: '아르바이트',
  freelance: '프리랜서',
  dispatched: '파견직',
};

export const MILITARY_STATUS_LABELS: Record<MilitaryStatus, string> = {
  served: '군필',
  not_served: '미필',
  exempted: '면제',
  serving: '복무 중',
  not_applicable: '해당 없음',
};

export const MILITARY_BRANCH_LABELS: Record<MilitaryBranch, string> = {
  army: '육군',
  navy: '해군',
  air_force: '공군',
  marines: '해병대',
  social_service: '사회복무',
  other: '기타',
};

export const DISCHARGE_TYPE_LABELS: Record<DischargeType, string> = {
  expiration: '만기전역',
  hardship: '의가사전역',
  medical: '의병전역',
  call_off: '소집해제',
  other: '기타',
};

export const DISABILITY_SEVERITY_LABELS: Record<DisabilitySeverity, string> = {
  severe: '장애의 정도가 심한',
  mild: '장애의 정도가 심하지 않은',
};

export const FLUENCY_LABELS: Record<Fluency, string> = {
  native: '원어민',
  business: '비즈니스 회화',
  daily: '일상 회화',
  basic: '기초',
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  extracurricular: '대외활동',
  club: '동아리',
  volunteer: '봉사',
  training: '교육 이수',
  overseas: '해외 경험',
  other: '기타',
};

export const ATTACHMENT_KIND_LABELS: Record<AttachmentKind, string> = {
  photo: '증명사진',
  resume: '이력서',
  portfolio: '포트폴리오',
  transcript: '성적증명서',
  certificate: '증명서',
  other: '기타',
};

export const COVER_LETTER_TAG_LABELS: Record<CoverLetterTag, string> = {
  motivation: '지원 동기',
  growth: '성장 과정',
  personality: '성격 장단점',
  competency: '직무 역량',
  aspiration: '입사 후 포부',
  collaboration: '협업 경험',
  other: '기타',
};

export const LENGTH_UNIT_LABELS: Record<LengthUnit, string> = {
  chars_with_space: '공백 포함',
  chars_without_space: '공백 제외',
  bytes: '바이트',
};

// ISO 639-1 언어 코드
export const LANGUAGE_LABELS: Record<string, string> = {
  en: '영어',
  ja: '일본어',
  zh: '중국어',
  de: '독일어',
  fr: '프랑스어',
  es: '스페인어',
  ru: '러시아어',
  vi: '베트남어',
  ko: '한국어',
};

export function toOptions<T extends string>(labels: Record<T, string>): { value: T; label: string }[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}

// 매핑 사전(core/mapping/dictionary.ts) 스키마 키 → 표시명 (사이드 패널)
export const SCHEMA_KEY_LABELS: Record<string, string> = {
  'basics.name.ko': '이름',
  'basics.name.en': '영문 이름',
  'basics.email': '이메일',
  'basics.phone.mobile': '휴대폰',
  'basics.phone.home': '자택 전화',
  'basics.birthDate': '생년월일',
  'basics.address.postalCode': '우편번호',
  'basics.address.line1': '주소',
  'basics.address.line2': '상세 주소',
  'basics.summary': '한 줄 소개',
  'basics.gender': '성별',
  'military.status': '병역 구분',
  'military.branch': '군별',
  'military.rank': '계급',
  'military.startDate': '입대 연월',
  'military.endDate': '전역 연월',
  'military.dischargeType': '전역 구분',
};

// 반복 항목 섹션 (매핑 사전 SectionKey의 기준) → 표시명
export const SECTION_LABELS = {
  education: '학력',
  work: '경력',
  certificates: '자격증',
  languageTests: '어학',
  awards: '수상',
  activities: '활동',
  projects: '프로젝트',
} as const;

export type SectionKey = keyof typeof SECTION_LABELS;

const SECTION_KEYS = Object.keys(SECTION_LABELS) as SectionKey[];

// 반복 항목 스키마 키(인덱스 자리 '*') → 표시명. 매핑 사전 SECTION_FIELD_RULES와 같은 키
export const ITEM_KEY_LABELS: Record<string, string> = {
  'education.*.school.ko': '학교명',
  'education.*.school.en': '영문 학교명',
  'education.*.major.ko': '전공',
  'education.*.major.en': '영문 전공',
  'education.*.minor': '부전공',
  'education.*.doubleMajor': '복수전공',
  'education.*.startDate': '입학 연월',
  'education.*.endDate': '졸업 연월',
  'education.*.gpa.value': '학점',
  'education.*.gpa.max': '학점 만점',
  'education.*.level': '학력 구분',
  'education.*.status': '졸업 상태',
  'education.*.location': '소재지',
  'work.*.company.ko': '회사명',
  'work.*.company.en': '영문 회사명',
  'work.*.department': '부서',
  'work.*.rank': '직급',
  'work.*.title': '직책',
  'work.*.role.ko': '직무',
  'work.*.startDate': '입사 연월',
  'work.*.endDate': '퇴사 연월',
  'work.*.salary': '연봉(만원)',
  'work.*.leaveReason': '퇴사 사유',
  'work.*.description': '담당 업무',
  'work.*.employmentType': '고용 형태',
  'certificates.*.name': '자격증명',
  'certificates.*.issuer': '발행 기관',
  'certificates.*.date': '취득일',
  'certificates.*.number': '자격 번호',
  'languageTests.*.exam': '시험명',
  'languageTests.*.score': '점수',
  'languageTests.*.grade': '등급',
  'languageTests.*.date': '응시일',
  'languageTests.*.expiresAt': '만료일',
  'languageTests.*.registrationNo': '수험 번호',
  'languageTests.*.language': '언어',
  'awards.*.title': '수상명',
  'awards.*.awarder': '수여 기관',
  'awards.*.date': '수상일',
  'awards.*.description': '수상 내용',
  'activities.*.name': '활동명',
  'activities.*.organization': '기관',
  'activities.*.startDate': '시작 연월',
  'activities.*.endDate': '종료 연월',
  'activities.*.description': '활동 내용',
  'activities.*.type': '활동 구분',
  'projects.*.name': '프로젝트명',
  'projects.*.organization': '기관',
  'projects.*.startDate': '시작 연월',
  'projects.*.endDate': '종료 연월',
  'projects.*.url': 'URL',
  'projects.*.description': '프로젝트 내용',
};

const ITEM_KEY = new RegExp(`^(${SECTION_KEYS.join('|')})\\.(\\d+)\\.(.+)$`);

/** 스키마 키 표시명: basics는 그대로, 반복 항목은 '학력 1 학교명' 형식 */
export function schemaKeyLabel(schemaKey: string): string {
  const m = schemaKey.match(ITEM_KEY);
  const item = m && ITEM_KEY_LABELS[`${m[1]}.*.${m[3]}`];
  if (m && item) return `${SECTION_LABELS[m[1] as SectionKey]} ${Number(m[2]) + 1} ${item}`;
  return SCHEMA_KEY_LABELS[schemaKey] ?? schemaKey;
}

/** 사이드 패널 선택·복사 대상 키 목록: basics + 이력서 반복 항목 수만큼 */
export function schemaKeyOptions(resume: Pick<Resume, SectionKey>): [string, string][] {
  const keys = Object.keys(SCHEMA_KEY_LABELS);
  for (const section of SECTION_KEYS) {
    resume[section].forEach((_, i) => {
      for (const key of Object.keys(ITEM_KEY_LABELS)) {
        if (key.startsWith(`${section}.`)) keys.push(key.replace('*', String(i)));
      }
    });
  }
  return keys.map((key) => [key, schemaKeyLabel(key)]);
}
