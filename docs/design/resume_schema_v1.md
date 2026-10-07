# 이력서 데이터 스키마 v1

최종 갱신: 2026-10-07 · 관련 문서: [architecture.md](architecture.md), [screens.md](screens.md), [04 보고서](../reports/04_target_sites_and_data_model.md)

## 1. 설계 원칙

| 원칙 | 내용 |
|---|---|
| JSON Resume 호환 | 최상위 섹션명 `basics`, `education`, `work`, `certificates`, `languages`, `awards`, `projects`, `skills` 유지 → 내보내기 변환 단순화 ([jsonresume.org/schema](https://jsonresume.org/schema)) |
| 국내 확장 | `military`(병역), `preference`(취업우대), `languageTests`(어학 시험), `activities`(대외활동·교육 등), `desired`(희망 조건), `attachments`(첨부 메타) 추가 |
| 스키마 키 | `education[].school.ko` 형식 경로. 매핑 결과(`FillPlan.schemaKey`)·학습 규칙·BYOK 전송에 공통 사용 |
| 값 정규화 | 저장은 단일 형식, 사이트별 형식 변환은 입력 시점에 수행 (2장) |
| enum | 영문 코드로 저장. 화면 표시명·사이트 선택지 매칭은 사전(표시명·동의어)으로 처리 (5장) |
| 반복 항목 식별 | 배열 항목마다 `id` 부여 → 순서 변경·학습 규칙·편집 대상 식별 |
| 민감정보 | `민감` 표시 필드는 기본 자동 입력 꺼짐, LLM 전송 대상 아님 ([05 보고서](../reports/05_privacy_and_policy.md) 2장) |
| 수집 제외 | 채용절차법 제4조의3 수집 금지 항목(용모·키·체중 등 신체조건, 출신지역, 혼인여부, 재산, 직계존비속·형제자매의 학력·직업·재산)은 스키마에 두지 않음 |
| 선택 입력 | `basics.name.ko` 외 모든 필드 선택 입력. 빈 값은 키 생략 |

## 2. 값 정규화 규칙

| 대상 | 저장 형식 | 예시 | 입력 시 변환 예 |
|---|---|---|---|
| 연월 | `YYYY-MM` | `2022-03` | `2022.03`, `202203`, 년/월 분리 |
| 날짜 | `YYYY-MM-DD` | `1998-01-01` | `1998.01.01`, `19980101` |
| 전화번호 | 숫자만 | `01000000000` | `010-0000-0000`, 3칸 분할 |
| 금액 | 만원 단위 정수 | `4000` | `4,000만원`, 원 단위 입력란은 ×10,000 |
| 학점 | `{ value, max }` | `{ "value": 3.8, "max": 4.5 }` | 만점이 다른 입력란은 비례 환산 여부를 사용자 확인 |
| 다국어 이름 | `{ ko, en?, hanja? }` | `{ "ko": "예시대학교", "en": "Example University" }` | 입력란 언어(라벨·placeholder)에 따라 선택 |
| 날짜·시각(메타) | ISO 8601 | `2026-10-07T09:00:00+09:00` | — |

## 3. TypeScript 타입 정의

```ts
// ---- 공통 ----
type YearMonth = string;               // 'YYYY-MM'
type FullDate = string;                // 'YYYY-MM-DD'
type PartialDate = YearMonth | FullDate;
type IsoDateTime = string;

interface LocalizedName {
  ko: string;
  en?: string;
  hanja?: string;
}

// ---- enum ----
type Gender = 'male' | 'female';
type EducationLevel = 'high_school' | 'college' | 'university' | 'master' | 'doctor';
type GraduationStatus = 'graduated' | 'expected' | 'completed' | 'dropped' | 'enrolled' | 'on_leave';
type GpaScale = 4.5 | 4.3 | 4.0 | 100;
type SchoolLocation = 'domestic' | 'overseas';
type EmploymentType = 'full_time' | 'contract' | 'intern' | 'part_time' | 'freelance' | 'dispatched';
type MilitaryStatus = 'served' | 'not_served' | 'exempted' | 'serving' | 'not_applicable';
type MilitaryBranch = 'army' | 'navy' | 'air_force' | 'marines' | 'social_service' | 'other';
type DischargeType = 'expiration' | 'hardship' | 'medical' | 'call_off' | 'other';
type DisabilitySeverity = 'severe' | 'mild';
type Fluency = 'native' | 'business' | 'daily' | 'basic';
type ActivityType = 'extracurricular' | 'club' | 'volunteer' | 'training' | 'overseas' | 'other';
type AttachmentKind = 'photo' | 'resume' | 'portfolio' | 'transcript' | 'certificate' | 'other';
type CoverLetterTag = 'motivation' | 'growth' | 'personality' | 'competency' | 'aspiration' | 'collaboration' | 'other';
type LengthUnit = 'chars_with_space' | 'chars_without_space' | 'bytes';

// ---- 이력서 (storage key: local:resume) ----
interface Resume {
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

interface Basics {
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

interface Education {
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

interface Work {
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

interface Military {
  status: MilitaryStatus;
  branch?: MilitaryBranch;
  rank?: string;
  startDate?: YearMonth;
  endDate?: YearMonth;
  dischargeType?: DischargeType;
  exemptionReason?: string;            // 민감
}

interface Preference {                 // 섹션 전체 민감
  veteran?: { target: boolean; relation?: string; number?: string };
  disability?: { target: boolean; severity?: DisabilitySeverity };
  employmentProtection?: boolean;      // 취업보호대상
}

interface LanguageTest {
  id: string;
  language: string;                    // ISO 639-1 (en, ja, zh …)
  exam: string;                        // TOEIC, OPIc …
  score?: string;
  grade?: string;
  date?: PartialDate;
  expiresAt?: PartialDate;
  registrationNo?: string;
}

interface LanguageSkill {
  language: string;                    // ISO 639-1
  fluency: Fluency;
}

interface Certificate {
  id: string;
  name: string;
  issuer?: string;
  date?: PartialDate;
  number?: string;
}

interface Award {
  id: string;
  title: string;
  awarder?: string;
  date?: PartialDate;
  description?: string;
}

interface Activity {
  id: string;
  type: ActivityType;
  name: string;
  organization?: string;
  startDate?: YearMonth;
  endDate?: YearMonth;
  description?: string;
}

interface Project {
  id: string;
  name: string;
  organization?: string;
  startDate?: YearMonth;
  endDate?: YearMonth;
  url?: string;
  description?: string;
  keywords?: string[];
}

interface Skill {
  name: string;
  level?: string;
  keywords?: string[];
}

interface Desired {
  salary?: { amount?: number; companyPolicy: boolean };   // amount: 만원
  locations: string[];
  jobs: string[];
  employmentTypes: EmploymentType[];
  availableFrom?: PartialDate;
  availableNote?: string;              // '협의 가능' 등
}

interface AttachmentMeta {
  id: string;
  kind: AttachmentKind;
  fileName: string;
  mimeType: string;
  size: number;                        // bytes
  addedAt: IsoDateTime;
}

// ---- 자기소개서 라이브러리 (storage key: local:coverLetters) ----
interface CoverLetterEntry {
  id: string;
  question: string;
  tags: CoverLetterTag[];
  answer: string;
  limit?: { count: number; unit: LengthUnit };
  usages: { company: string; date?: YearMonth }[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}
```

## 4. 섹션별 필드 표

`민감` = 기본 자동 입력 꺼짐 + LLM 전송 대상 아님. 배열은 `[]`로 표기.

### 4.1 meta
| 스키마 키 | 타입 | 필수 | 설명 | 민감 |
|---|---|---|---|---|
| `meta.schemaVersion` | `1` | ● | 스키마 버전 | |
| `meta.updatedAt` | IsoDateTime | ● | 마지막 수정 시각 | |

### 4.2 basics (기본 정보)
| 스키마 키 | 타입 | 필수 | 설명 | 민감 |
|---|---|---|---|---|
| `basics.name.ko` | string | ● | 이름(한글) | |
| `basics.name.en` | string | | 이름(영문) | |
| `basics.name.hanja` | string | | 이름(한자) | |
| `basics.birthDate` | FullDate | | 생년월일 | |
| `basics.gender` | Gender | | 성별 | |
| `basics.email` | string | | 이메일 | |
| `basics.phone.mobile` | string | | 휴대폰 (숫자만) | |
| `basics.phone.home` | string | | 자택 전화 (숫자만) | |
| `basics.address.postalCode` | string | | 우편번호 | |
| `basics.address.line1` | string | | 기본 주소 | |
| `basics.address.line2` | string | | 상세 주소 | |
| `basics.urls[].label` | string | | URL 이름 (포트폴리오, GitHub, 블로그 …) | |
| `basics.urls[].url` | string | | URL | |
| `basics.photo` | string | | 증명사진 첨부 id | |
| `basics.summary` | string | | 한 줄 소개 | |

### 4.3 education (학력)
| 스키마 키 | 타입 | 필수 | 설명 | 민감 |
|---|---|---|---|---|
| `education[].id` | string | ● | 항목 id | |
| `education[].level` | EducationLevel | ● | 학교 구분 | |
| `education[].school.ko` | string | ● | 학교명 | |
| `education[].school.en` | string | | 학교 영문명 | |
| `education[].location` | SchoolLocation | | 국내/해외 | |
| `education[].startDate` | YearMonth | | 입학 | |
| `education[].endDate` | YearMonth | | 졸업(예정) | |
| `education[].status` | GraduationStatus | ● | 졸업 상태 | |
| `education[].major.ko` | string | | 전공 | |
| `education[].major.en` | string | | 전공 영문명 | |
| `education[].minor` | string | | 부전공 | |
| `education[].doubleMajor` | string | | 복수전공 | |
| `education[].gpa.value` | number | | 학점 | |
| `education[].gpa.max` | GpaScale | | 학점 만점 기준 | |
| `education[].transfer` | boolean | | 편입 여부 | |

### 4.4 work (경력)
| 스키마 키 | 타입 | 필수 | 설명 | 민감 |
|---|---|---|---|---|
| `work[].id` | string | ● | 항목 id | |
| `work[].company.ko` | string | ● | 회사명 | |
| `work[].company.en` | string | | 회사 영문명 | |
| `work[].employmentType` | EmploymentType | | 고용 형태 | |
| `work[].department` | string | | 부서 | |
| `work[].rank` | string | | 직급 | |
| `work[].title` | string | | 직책 | |
| `work[].role.ko` | string | | 직무 | |
| `work[].role.en` | string | | 직무 영문명 | |
| `work[].startDate` | YearMonth | ● | 입사 | |
| `work[].endDate` | YearMonth | | 퇴사 (`current: true`면 생략) | |
| `work[].current` | boolean | ● | 재직 중 | |
| `work[].salary` | number | | 연봉 (만원) | |
| `work[].leaveReason` | string | | 퇴사 사유 | |
| `work[].description` | string | | 담당 업무 | |

### 4.5 military (병역)
| 스키마 키 | 타입 | 필수 | 설명 | 민감 |
|---|---|---|---|---|
| `military.status` | MilitaryStatus | ● | 병역 구분 | |
| `military.branch` | MilitaryBranch | | 군별 | |
| `military.rank` | string | | 계급 | |
| `military.startDate` | YearMonth | | 복무 시작 | |
| `military.endDate` | YearMonth | | 복무 종료 | |
| `military.dischargeType` | DischargeType | | 전역 구분 | |
| `military.exemptionReason` | string | | 면제 사유 (건강 정보 포함 가능) | ● |

- `dischargeType: 'medical'`(의병전역)은 건강 관련 정보 → 해당 값일 때만 민감 처리

### 4.6 preference (취업우대) — 섹션 전체 민감
| 스키마 키 | 타입 | 필수 | 설명 | 민감 |
|---|---|---|---|---|
| `preference.veteran.target` | boolean | | 보훈 대상 여부 | ● |
| `preference.veteran.relation` | string | | 보훈 관계 | ● |
| `preference.veteran.number` | string | | 보훈 번호 | ● |
| `preference.disability.target` | boolean | | 장애 여부 | ● |
| `preference.disability.severity` | DisabilitySeverity | | 장애 정도 | ● |
| `preference.employmentProtection` | boolean | | 취업보호대상 여부 | ● |

### 4.7 languageTests · languages (어학)
| 스키마 키 | 타입 | 필수 | 설명 | 민감 |
|---|---|---|---|---|
| `languageTests[].id` | string | ● | 항목 id | |
| `languageTests[].language` | string | ● | 언어 코드 | |
| `languageTests[].exam` | string | ● | 시험명 | |
| `languageTests[].score` | string | | 점수 | |
| `languageTests[].grade` | string | | 등급 (OPIc IH 등) | |
| `languageTests[].date` | PartialDate | | 취득일 | |
| `languageTests[].expiresAt` | PartialDate | | 만료일 | |
| `languageTests[].registrationNo` | string | | 수험·등록 번호 | |
| `languages[].language` | string | ● | 언어 코드 | |
| `languages[].fluency` | Fluency | ● | 회화 수준 | |

### 4.8 certificates · awards · activities · projects · skills
| 스키마 키 | 타입 | 필수 | 설명 | 민감 |
|---|---|---|---|---|
| `certificates[].id` | string | ● | 항목 id | |
| `certificates[].name` | string | ● | 자격증명 | |
| `certificates[].issuer` | string | | 발행기관 | |
| `certificates[].date` | PartialDate | | 취득일 | |
| `certificates[].number` | string | | 자격번호 | |
| `awards[].id` | string | ● | 항목 id | |
| `awards[].title` | string | ● | 수상명 | |
| `awards[].awarder` | string | | 수여기관 | |
| `awards[].date` | PartialDate | | 수상일 | |
| `awards[].description` | string | | 내용 | |
| `activities[].id` | string | ● | 항목 id | |
| `activities[].type` | ActivityType | ● | 활동 구분 | |
| `activities[].name` | string | ● | 활동명 | |
| `activities[].organization` | string | | 기관 | |
| `activities[].startDate` | YearMonth | | 시작 | |
| `activities[].endDate` | YearMonth | | 종료 | |
| `activities[].description` | string | | 내용 | |
| `projects[].id` | string | ● | 항목 id | |
| `projects[].name` | string | ● | 프로젝트명 | |
| `projects[].organization` | string | | 소속·발주처 | |
| `projects[].startDate` | YearMonth | | 시작 | |
| `projects[].endDate` | YearMonth | | 종료 | |
| `projects[].url` | string | | URL | |
| `projects[].description` | string | | 내용 | |
| `projects[].keywords` | string[] | | 사용 기술 | |
| `skills[].name` | string | ● | 기술명 | |
| `skills[].level` | string | | 수준 | |
| `skills[].keywords` | string[] | | 세부 키워드 | |

### 4.9 desired (희망 조건)
| 스키마 키 | 타입 | 필수 | 설명 | 민감 |
|---|---|---|---|---|
| `desired.salary.amount` | number | | 희망 연봉 (만원) | |
| `desired.salary.companyPolicy` | boolean | | 회사 내규에 따름 | |
| `desired.locations` | string[] | | 희망 근무지 | |
| `desired.jobs` | string[] | | 희망 직무 | |
| `desired.employmentTypes` | EmploymentType[] | | 희망 고용 형태 | |
| `desired.availableFrom` | PartialDate | | 입사 가능일 | |
| `desired.availableNote` | string | | 입사 가능일 메모 (협의 가능 등) | |

### 4.10 attachments (첨부 파일 메타데이터)
| 스키마 키 | 타입 | 필수 | 설명 | 민감 |
|---|---|---|---|---|
| `attachments[].id` | string | ● | 첨부 id | |
| `attachments[].kind` | AttachmentKind | ● | 구분 | |
| `attachments[].fileName` | string | ● | 파일명 | |
| `attachments[].mimeType` | string | ● | MIME 타입 | |
| `attachments[].size` | number | ● | 크기 (bytes) | |
| `attachments[].addedAt` | IsoDateTime | ● | 추가 시각 | |

### 4.11 coverLetters (자기소개서 라이브러리, 별도 저장)
| 스키마 키 | 타입 | 필수 | 설명 | 민감 |
|---|---|---|---|---|
| `coverLetters[].id` | string | ● | 항목 id | |
| `coverLetters[].question` | string | ● | 문항 | |
| `coverLetters[].tags` | CoverLetterTag[] | ● | 문항 태그 | |
| `coverLetters[].answer` | string | ● | 답변 | |
| `coverLetters[].limit.count` | number | | 글자수 제한 | |
| `coverLetters[].limit.unit` | LengthUnit | | 글자수 기준 | |
| `coverLetters[].usages[].company` | string | | 사용 기업 | |
| `coverLetters[].usages[].date` | YearMonth | | 사용 시기 | |
| `coverLetters[].createdAt` | IsoDateTime | ● | 생성 시각 | |
| `coverLetters[].updatedAt` | IsoDateTime | ● | 수정 시각 | |

- 매핑 대상 키: `meta.*`, `*.id`, `attachments[].*`(파일 업로드 전용 처리), `coverLetters[].*`(문항 매칭 전용 처리)를 제외한 키
- BYOK 전송 키 목록: 매핑 대상 키 중 `민감` 제외

## 5. enum 정의 (표시명·동의어 초안)

동의어는 키워드·동의어 사전 v1의 초기값. 사이트별 실제 선택지는 DOM 현장 조사 후 `사이트 선택지` 열에 보완.

### 학력 구분 `EducationLevel`
| 코드 | 표시명 | 동의어 초안 | 사이트 선택지 |
|---|---|---|---|
| `high_school` | 고등학교 | 고졸, 고등학교 졸업 | |
| `college` | 대학교(2·3년) | 전문대, 전문학사, 2년제, 3년제, 초대졸 | |
| `university` | 대학교(4년) | 학사, 대졸, 4년제, 대학교 | |
| `master` | 대학원(석사) | 석사 | |
| `doctor` | 대학원(박사) | 박사 | |

### 졸업 상태 `GraduationStatus`
| 코드 | 표시명 | 동의어 초안 | 사이트 선택지 |
|---|---|---|---|
| `graduated` | 졸업 | 졸업 완료 | |
| `expected` | 졸업 예정 | 졸업예정 | |
| `completed` | 수료 | 과정 수료 | |
| `dropped` | 중퇴 | 중도 퇴학 | |
| `enrolled` | 재학 | 재학 중 | |
| `on_leave` | 휴학 | 휴학 중 | |

### 고용 형태 `EmploymentType`
| 코드 | 표시명 | 동의어 초안 | 사이트 선택지 |
|---|---|---|---|
| `full_time` | 정규직 | 정규, Full-time | |
| `contract` | 계약직 | 계약, 기간제, Contract | |
| `intern` | 인턴 | 인턴십, 체험형 인턴, 채용연계형 인턴, Intern | |
| `part_time` | 아르바이트 | 파트타임, Part-time | |
| `freelance` | 프리랜서 | 위촉, Freelance | |
| `dispatched` | 파견직 | 파견 | |

### 병역 `MilitaryStatus` · `MilitaryBranch` · `DischargeType`
| 코드 | 표시명 | 동의어 초안 | 사이트 선택지 |
|---|---|---|---|
| `served` | 군필 | 병역필, 필 | |
| `not_served` | 미필 | 병역 미필 | |
| `exempted` | 면제 | 병역 면제 | |
| `serving` | 복무 중 | 현역 복무 중 | |
| `not_applicable` | 해당 없음 | 비대상 | |
| `army` | 육군 | | |
| `navy` | 해군 | | |
| `air_force` | 공군 | | |
| `marines` | 해병대 | | |
| `social_service` | 사회복무 | 사회복무요원, 공익근무 | |
| `other` | 기타 | 전문연구요원, 산업기능요원 등 | |
| `expiration` | 만기전역 | 만기제대, 만기 | |
| `hardship` | 의가사전역 | 의가사제대 | |
| `medical` | 의병전역 | 의병제대 | |
| `call_off` | 소집해제 | | |

### 장애 정도 `DisabilitySeverity`
| 코드 | 표시명 | 동의어 초안 | 사이트 선택지 |
|---|---|---|---|
| `severe` | 장애의 정도가 심한 | 중증 | |
| `mild` | 장애의 정도가 심하지 않은 | 경증 | |

### 기타
| enum | 코드 → 표시명 |
|---|---|
| `Gender` | `male` 남, `female` 여 |
| `SchoolLocation` | `domestic` 국내, `overseas` 해외 |
| `GpaScale` | `4.5`, `4.3`, `4.0`, `100` |
| `Fluency` | `native` 원어민, `business` 비즈니스 회화, `daily` 일상 회화, `basic` 기초 |
| `ActivityType` | `extracurricular` 대외활동, `club` 동아리, `volunteer` 봉사, `training` 교육 이수, `overseas` 해외 경험, `other` 기타 |
| `AttachmentKind` | `photo` 증명사진, `resume` 이력서, `portfolio` 포트폴리오, `transcript` 성적증명서, `certificate` 증명서, `other` 기타 |
| `CoverLetterTag` | `motivation` 지원 동기, `growth` 성장 과정, `personality` 성격 장단점, `competency` 직무 역량, `aspiration` 입사 후 포부, `collaboration` 협업 경험, `other` 기타 |
| `LengthUnit` | `chars_with_space` 공백 포함, `chars_without_space` 공백 제외, `bytes` 바이트 (인코딩 기준이 사이트마다 달라 화면에서 UTF-8·EUC-KR 기준 모두 표시) |

## 6. 저장 구조

| 저장 키 | 타입 | 비고 |
|---|---|---|
| `local:resume` | `Resume` | WXT `storage.defineItem`, `version: 1` |
| `local:coverLetters` | `CoverLetterEntry[]` | 이력서와 독립 수정·검색 |
| 첨부 파일 본문 | Blob/base64 | 메타데이터(`attachments[]`)와 분리 저장. 방식(storage 별도 키 vs IndexedDB)은 구현 시 결정 |

- 용량: `storage.local` 기본 10MB. 증명사진·PDF 포함 시 초과 가능 → `unlimitedStorage` 권한(설치 경고 없음 여부는 구현 시 확인) 또는 IndexedDB 검토

## 7. 버전·마이그레이션
- `meta.schemaVersion`과 WXT storage item `version`을 같은 값으로 유지
- 스키마 변경 시 `migrations: { 2: (v1) => v2 }` 형태로 변환 함수 추가, 기존 데이터 삭제 금지
- JSON 가져오기 시 `meta.schemaVersion` 확인 후 같은 마이그레이션 함수로 변환
- 키 이름 변경은 학습 규칙(`LearnedRule.schemaKey`)·LLM 캐시에도 영향 → 같은 마이그레이션에서 함께 변환

## 8. JSON Resume 내보내기 대응

| 본 스키마 | JSON Resume |
|---|---|
| `basics.name.ko` (또는 `en`) | `basics.name` |
| `basics.email` | `basics.email` |
| `basics.phone.mobile` | `basics.phone` |
| `basics.summary` | `basics.summary` |
| `basics.address.*` | `basics.location.address`, `postalCode` |
| `basics.urls[]` | `basics.profiles[]` (`network` ← `label`) |
| `work[]` | `work[]`: `name` ← `company`, `position` ← `role`, `startDate`, `endDate`, `summary` ← `description` |
| `education[]` | `education[]`: `institution` ← `school`, `area` ← `major`, `studyType` ← `level`, `score` ← `gpa`, `startDate`, `endDate` |
| `certificates[]` | `certificates[]`: `name`, `issuer`, `date` |
| `awards[]` | `awards[]`: `title`, `awarder`, `date`, `summary` ← `description` |
| `languages[]` | `languages[]`: `language`, `fluency` |
| `projects[]` | `projects[]`: `name`, `description`, `url`, `keywords`, `startDate`, `endDate` |
| `skills[]` | `skills[]` |
| `activities[]` (`volunteer`) | `volunteer[]` |
| `military`, `preference`, `languageTests`, `desired`, `attachments`, 나머지 `activities` | 대응 없음 → 내보내기 시 제외 또는 확장 필드(`x-ko`)로 보관 |

## 9. 예시 데이터 (가상)

`local:resume`
```json
{
  "meta": { "schemaVersion": 1, "updatedAt": "2026-10-07T09:00:00+09:00" },
  "basics": {
    "name": { "ko": "홍길동", "en": "Gildong Hong", "hanja": "洪吉童" },
    "birthDate": "1998-01-01",
    "email": "gildong@example.com",
    "phone": { "mobile": "01000000000" },
    "address": { "postalCode": "00000", "line1": "서울특별시 예시구 예시로 1", "line2": "101호" },
    "urls": [{ "label": "포트폴리오", "url": "https://example.com/portfolio" }],
    "photo": "att-photo",
    "summary": "결제 시스템을 만드는 백엔드 개발자"
  },
  "education": [
    {
      "id": "edu-1",
      "level": "university",
      "school": { "ko": "예시대학교", "en": "Example University" },
      "location": "domestic",
      "startDate": "2017-03",
      "endDate": "2023-02",
      "status": "graduated",
      "major": { "ko": "컴퓨터공학", "en": "Computer Science" },
      "gpa": { "value": 3.8, "max": 4.5 },
      "transfer": false
    },
    { "id": "edu-2", "level": "high_school", "school": { "ko": "예시고등학교" }, "endDate": "2017-02", "status": "graduated" }
  ],
  "work": [
    {
      "id": "work-1",
      "company": { "ko": "예시주식회사", "en": "Example Corp." },
      "employmentType": "full_time",
      "department": "플랫폼개발팀",
      "rank": "사원",
      "title": "팀원",
      "role": { "ko": "백엔드 개발", "en": "Backend Engineer" },
      "startDate": "2022-03",
      "current": true,
      "salary": 4000,
      "description": "결제 시스템 API 개발 및 운영"
    }
  ],
  "military": { "status": "served", "branch": "army", "rank": "병장", "startDate": "2018-03", "endDate": "2019-09", "dischargeType": "expiration" },
  "preference": { "veteran": { "target": false }, "disability": { "target": false }, "employmentProtection": false },
  "languageTests": [
    { "id": "lt-1", "language": "en", "exam": "TOEIC", "score": "900", "date": "2025-06" },
    { "id": "lt-2", "language": "en", "exam": "OPIc", "grade": "IH", "date": "2025-08" }
  ],
  "languages": [{ "language": "en", "fluency": "business" }],
  "certificates": [{ "id": "cert-1", "name": "정보처리기사", "issuer": "한국산업인력공단", "date": "2023-06", "number": "00000000000A" }],
  "awards": [{ "id": "award-1", "title": "교내 해커톤 대상", "awarder": "예시대학교", "date": "2022-11" }],
  "activities": [
    { "id": "act-1", "type": "extracurricular", "name": "오픈소스 기여 프로그램", "organization": "예시재단", "startDate": "2021-07", "endDate": "2021-12" },
    { "id": "act-2", "type": "training", "name": "클라우드 실무 과정", "organization": "예시교육원", "startDate": "2024-01", "endDate": "2024-06" }
  ],
  "projects": [{ "id": "prj-1", "name": "정산 자동화", "organization": "예시주식회사", "startDate": "2024-02", "endDate": "2024-08", "keywords": ["Kotlin", "Spring"] }],
  "skills": [{ "name": "Kotlin", "level": "상" }, { "name": "Spring", "keywords": ["Spring Boot", "JPA"] }],
  "desired": {
    "salary": { "amount": 5000, "companyPolicy": false },
    "locations": ["서울", "경기"],
    "jobs": ["백엔드 개발"],
    "employmentTypes": ["full_time"],
    "availableNote": "협의 가능"
  },
  "attachments": [
    { "id": "att-photo", "kind": "photo", "fileName": "photo.jpg", "mimeType": "image/jpeg", "size": 48000, "addedAt": "2026-10-01T10:00:00+09:00" },
    { "id": "att-resume", "kind": "resume", "fileName": "resume_2026.pdf", "mimeType": "application/pdf", "size": 320000, "addedAt": "2026-10-01T10:00:00+09:00" }
  ]
}
```

`local:coverLetters`
```json
[
  {
    "id": "cl-1",
    "question": "지원 동기를 기술해 주십시오.",
    "tags": ["motivation"],
    "answer": "예시 답변 내용",
    "limit": { "count": 1000, "unit": "chars_with_space" },
    "usages": [{ "company": "A사", "date": "2026-09" }],
    "createdAt": "2026-09-01T10:00:00+09:00",
    "updatedAt": "2026-09-10T10:00:00+09:00"
  }
]
```

## 10. 목업([options.html](mockups/options.html))과의 차이

| 구분 | 항목 | 비고 |
|---|---|---|
| 목업에 추가 필요 | 성별, 한 줄 소개, URL 여러 개 | 기본 정보 |
| 목업에 추가 필요 | 학교 소재지(국내/해외), 전공 영문명 | 학력 |
| 목업에서 분리 | '직급·직책' → 직급 / 직책, '직무(영문)' → 직무 국문·영문 | 경력 |
| 목업에 추가 필요 | 전역 구분, 보훈 관계·번호 | 병역·취업우대 |
| 목업 수정 | 취업보호대상에 민감 표시 | 취업우대 |
| 목업에 추가 필요 | 회화 수준(`languages`), 어학 만료일·수험번호 | 어학 |
| 목업에 추가 필요 | 프로젝트, 보유 기술 섹션 | 신규 메뉴 |
| 목업에 추가 필요 | 희망 직무·희망 고용 형태 | 희망 조건 |

- 목업은 와이어프레임 단계이므로 수정하지 않고, React 화면 구현 시 본 스키마 기준으로 반영
