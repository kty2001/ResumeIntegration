# 04. 대상 사이트 및 데이터 모델

## 1. 대상 사이트 분류

### 1.1 국내 채용 플랫폼
- 사람인, 잡코리아, 원티드, 리멤버, 점핏, 프로그래머스 등
- 특징: 플랫폼 내 이력서를 1회 작성 후 재사용하는 구조 → 플랫폼 **내부** 지원은 이미 간편. 문제는 **플랫폼 간 이력서 최초 작성·갱신 반복**
- 본 프로젝트 활용 시나리오: 각 플랫폼의 '이력서 작성/수정' 페이지 자동 입력
- 각 사이트 폼 구조(React 여부, 커스텀 위젯, iframe 사용 여부): **미조사 → 구현 전 사이트별 DOM 현장 조사 필요**

### 1.2 국내 ATS (기업별 채용 페이지 솔루션)
| 솔루션 | 현황 | 비고 |
|---|---|---|
| **그리팅 (두들린)** | 노코드 채용 사이트 누적 4,200개 이상, 연간 신규 고객사 3,300곳 이상 (LG디스플레이, KB증권, SSG닷컴 등) | 단일 ATS 대응으로 다수 기업 채용 페이지 커버 가능 — [디아이투데이](https://ditoday.com/%ec%b1%84%ec%9a%a9-%ea%b4%80%eb%a6%ac-%ec%86%94%eb%a3%a8%ec%85%98-%ea%b7%b8%eb%a6%ac%ed%8c%85-%eb%8c%80%ea%b8%b0%ec%97%85-%ed%99%9c%ec%9a%a9-%ec%a6%9d%ea%b0%80-%ec%88%98%ec%8b%9c/) |
| **나인하이어** | 채용 관리 SaaS, 잡코리아 연동 보도 존재 | 현재 운영 상태 미확인 (서비스 종료 언급 자료와 성장 보도 혼재) — [넥스트유니콘](https://www.nextunicorn.kr/content/7f2e27ba50c1869b), [THE VC](https://thevc.kr/ninehire) |
| **마이다스인 / 잡다(JOBDA)** | 대기업·공공기관 다수 사용 채용 솔루션 | 역량검사 연계, 지원서 폼 구조 미조사 |
| 대기업 자체 채용 사이트 | 삼성, LG, SK 등 그룹별 자체 시스템 | 사이트별 개별 어댑터 필요, 자기소개서 문항·글자수 제한 엄격 |

### 1.3 해외 ATS
| ATS | DOM 특징 |
|---|---|
| Greenhouse | React 컴포넌트 기반 폼, 기업 사이트에 iframe 임베드 형태 존재 — [Autofill Jobs](https://github.com/andrewmillercode/Autofill-Jobs) |
| Lever | React 미사용, 일반 DOM 폼 |
| Workday | React 제어 컴포넌트 + 커스텀 위젯, blur 시 검증 필드 존재, job_app_filler는 XPath로 필드 식별 (`data-automation-id` 속성 활용은 직접 미검증) — [job_app_filler](https://github.com/berellevy/job_app_filler), [JobWizard 블로그](https://jobwizard.ai/blog/why-workday-makes-you-re-enter-your-resume-after-uploading-it) |
| Ashby, SmartRecruiters, iCIMS, Taleo | Simplify·Jobright 등 상용 확장 지원 대상 (DOM 상세 미조사) |

### 1.4 ATS 레버리지 관점
- 해외 상용 확장은 "100+ ATS 지원"으로 홍보 → **사이트 수가 아닌 ATS 수가 커버리지 결정**
- 국내 우선순위 제안: ① 주요 채용 플랫폼 2~3곳 ② 그리팅(채용 사이트 4,200개+) ③ 범용 규칙 기반 매칭으로 나머지 커버

## 2. 이력서 데이터 스키마 레퍼런스

| 스키마 | 개요 | 활용 |
|---|---|---|
| **JSON Resume** | 커뮤니티 오픈 표준, JSON Schema(draft-07). 최상위 섹션: `basics`, `work`, `volunteer`, `education`, `awards`, `certificates`, `publications`, `skills`, `languages`, `interests`, `references`, `projects` | 기본 골격으로 채택 후 국내 확장 필드 추가 권장. 내보내기 호환성 확보 — [jsonresume.org/schema](https://jsonresume.org/schema) |
| HR Open Standards | 채용·HR 데이터 교환 표준 (구 HR-XML) | 기업 시스템 연동 수준, 개인용 확장에는 과도 (상세 미조사) — [hropenstandards.org](https://www.hropenstandards.org/) |
| Europass | EU 공식 이력서 형식 | 어학 능력 표기(CEFR) 참고용 (상세 미조사) — [europass.europa.eu](https://europass.europa.eu/) |

## 3. 국내 이력서 특화 필드 (JSON Resume 대비 추가 필요)

| 분류 | 필드 예시 | 비고 |
|---|---|---|
| 인적사항 | 한글/영문/한자 성명, 생년월일, 휴대폰·자택 전화, 증명사진 | 성명 표기 다중화 |
| 학력 | 학교 구분(고/전문대/대학/대학원), 입학·졸업 연월, 졸업 상태(졸업/예정/수료/중퇴), 전공·부전공·복수전공, **학점 + 만점 기준(4.5/4.3/4.0/100)**, 편입 여부 | 만점 변환 필요 사이트 존재 |
| 경력 | 회사명, 부서, 직급/직책, 재직 기간, 재직 중 여부, 담당 업무, 연봉, 퇴사 사유 | |
| 병역 | 군필 여부(군필/미필/면제/해당없음), 군별, 계급, 복무 기간, 면제 사유 | 국내 고유 |
| 취업우대 | 보훈 대상, 장애 여부·등급, 취업보호대상 | **민감정보** 해당 가능 → [05 보고서](05_privacy_and_policy.md) |
| 어학 | 시험명(TOEIC, OPIc, TOEIC Speaking 등), 점수/등급, 취득일, 회화 수준 | |
| 자격증 | 자격증명, 발행기관, 취득일, 자격번호 | |
| 기타 | 수상, 대외활동, 교육 이수, 해외 경험, 포트폴리오 URL·파일 | |
| 희망 조건 | 희망 연봉(회사 내규 옵션), 희망 근무지, 입사 가능일 | |
| 자기소개서 | 문항 텍스트, 답변, 글자수 기준, 사용 기업·날짜, 태그(지원동기/성장과정 등) | 문항-답변 라이브러리 형태 |

- 수집 금지 항목 참고: 채용절차법 제4조의3 — 직무 무관 시 신체조건(용모·키·체중), 출신지역·혼인여부·재산, 직계존비속·형제자매 학력·직업·재산 수집 금지 → 일반 지원서에서 요구 빈도 낮음, 기본 스키마에서 제외 가능 — [율촌 리걸 업데이트](https://www.yulchon.com/ko/resources/publications/legal-update-view/37582/page.do), [nepla 위키](https://www.nepla.ai/wiki/근로-직업과-자격/취업준비-채용/출신지역-등-개인정보-요구-금지/채용절차법-제4조의3-출신지역-등-개인정보-요구-금지-x6w9wk6m9gk4)

## 4. 데이터 가져오기·내보내기
- PDF 이력서 파싱: [pdf.js](https://mozilla.github.io/pdf.js/)로 텍스트 추출 → 항목 분리 (규칙 기반 정확도 한계, LLM 활용 시 외부 전송 이슈). 국내 사례 '딸깍'은 PDF 업로드 기능 제공
- JSON 내보내기/가져오기: 기기 이전·백업 수단 (`chrome.storage.sync` 용량 100KB 한계 대안)
- 플랫폼 이력서 역수집(선택): 이미 작성된 사람인·원티드 이력서 페이지를 읽어 데이터 초기 구축 → 최초 입력 부담 경감
