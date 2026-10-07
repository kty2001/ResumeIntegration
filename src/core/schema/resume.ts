// 이력서 데이터 스키마 v1 — docs/design/resume_schema_v1.md 3장과 동일하게 유지

export const SCHEMA_VERSION = 1;

// ---- 공통 ----
export type YearMonth = string;               // 'YYYY-MM'
export type FullDate = string;                // 'YYYY-MM-DD'
export type PartialDate = YearMonth | FullDate;
export type IsoDateTime = string;

export interface LocalizedName {
  ko: string;
  en?: string;
  hanja?: string;
}

// ---- enum ----
export type Gender = 'male' | 'female';
export type EducationLevel = 'high_school' | 'college' | 'university' | 'master' | 'doctor';
export type GraduationStatus = 'graduated' | 'expected' | 'completed' | 'dropped' | 'enrolled' | 'on_leave';
export type GpaScale = 4.5 | 4.3 | 4.0 | 100;
export type SchoolLocation = 'domestic' | 'overseas';
export type EmploymentType = 'full_time' | 'contract' | 'intern' | 'part_time' | 'freelance' | 'dispatched';
export type MilitaryStatus = 'served' | 'not_served' | 'exempted' | 'serving' | 'not_applicable';
export type MilitaryBranch = 'army' | 'navy' | 'air_force' | 'marines' | 'social_service' | 'other';
export type DischargeType = 'expiration' | 'hardship' | 'medical' | 'call_off' | 'other';
export type DisabilitySeverity = 'severe' | 'mild';
export type Fluency = 'native' | 'business' | 'daily' | 'basic';
export type ActivityType = 'extracurricular' | 'club' | 'volunteer' | 'training' | 'overseas' | 'other';
export type AttachmentKind = 'photo' | 'resume' | 'portfolio' | 'transcript' | 'certificate' | 'other';
export type CoverLetterTag = 'motivation' | 'growth' | 'personality' | 'competency' | 'aspiration' | 'collaboration' | 'other';
export type LengthUnit = 'chars_with_space' | 'chars_without_space' | 'bytes';

// ---- 이력서 (storage key: local:resume) ----
export interface Resume {
  meta: { schemaVersion: 1; updatedAt: IsoDateTime };
  basics: Basics;
  education: Education[];
  work: Work[];
  military?: Military;
  preference?: Preference;
  languageTests: LanguageTest[];
  languages: LanguageSkill[];
  certificates: Certificate[];
  awards: Award[];
  activities: Activity[];
  projects: Project[];
  skills: Skill[];
  desired?: Desired;
  attachments: AttachmentMeta[];
}

export interface Basics {
  name: LocalizedName;
  birthDate?: FullDate;
  gender?: Gender;
  email?: string;
  phone?: { mobile?: string; home?: string };
  address?: { postalCode?: string; line1?: string; line2?: string };
  urls: { label: string; url: string }[];
  photo?: string;                      // AttachmentMeta.id (kind: 'photo')
  summary?: string;                    // 한 줄 소개
}

export interface Education {
  id: string;
  level: EducationLevel;
  school: LocalizedName;
  location?: SchoolLocation;
  startDate?: YearMonth;
  endDate?: YearMonth;
  status: GraduationStatus;
  major?: LocalizedName;
  minor?: string;
  doubleMajor?: string;
  gpa?: { value: number; max: GpaScale };
  transfer?: boolean;
}

export interface Work {
  id: string;
  company: LocalizedName;
  employmentType?: EmploymentType;
  department?: string;
  rank?: string;                       // 직급 (사원, 대리 …)
  title?: string;                      // 직책 (팀원, 팀장 …)
  role?: LocalizedName;                // 직무 (백엔드 개발 / Backend Engineer)
  startDate: YearMonth;
  endDate?: YearMonth;
  current: boolean;
  salary?: number;                     // 만원
  leaveReason?: string;
  description?: string;
}

export interface Military {
  status: MilitaryStatus;
  branch?: MilitaryBranch;
  rank?: string;
  startDate?: YearMonth;
  endDate?: YearMonth;
  dischargeType?: DischargeType;
  exemptionReason?: string;            // 민감
}

export interface Preference {                 // 섹션 전체 민감
  veteran?: { target: boolean; relation?: string; number?: string };
  disability?: { target: boolean; severity?: DisabilitySeverity };
  employmentProtection?: boolean;      // 취업보호대상
}

export interface LanguageTest {
  id: string;
  language: string;                    // ISO 639-1 (en, ja, zh …)
  exam: string;                        // TOEIC, OPIc …
  score?: string;
  grade?: string;
  date?: PartialDate;
  expiresAt?: PartialDate;
  registrationNo?: string;
}

export interface LanguageSkill {
  language: string;                    // ISO 639-1
  fluency: Fluency;
}

export interface Certificate {
  id: string;
  name: string;
  issuer?: string;
  date?: PartialDate;
  number?: string;
}

export interface Award {
  id: string;
  title: string;
  awarder?: string;
  date?: PartialDate;
  description?: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  name: string;
  organization?: string;
  startDate?: YearMonth;
  endDate?: YearMonth;
  description?: string;
}

export interface Project {
  id: string;
  name: string;
  organization?: string;
  startDate?: YearMonth;
  endDate?: YearMonth;
  url?: string;
  description?: string;
  keywords?: string[];
}

export interface Skill {
  name: string;
  level?: string;
  keywords?: string[];
}

export interface Desired {
  salary?: { amount?: number; companyPolicy: boolean };   // amount: 만원
  locations: string[];
  jobs: string[];
  employmentTypes: EmploymentType[];
  availableFrom?: PartialDate;
  availableNote?: string;              // '협의 가능' 등
}

export interface AttachmentMeta {
  id: string;
  kind: AttachmentKind;
  fileName: string;
  mimeType: string;
  size: number;                        // bytes
  addedAt: IsoDateTime;
}

// ---- 자기소개서 라이브러리 (storage key: local:coverLetters) ----
export interface CoverLetterEntry {
  id: string;
  question: string;
  tags: CoverLetterTag[];
  answer: string;
  limit?: { count: number; unit: LengthUnit };
  usages: { company: string; date?: YearMonth }[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}
