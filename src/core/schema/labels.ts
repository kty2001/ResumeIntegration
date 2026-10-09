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
};
