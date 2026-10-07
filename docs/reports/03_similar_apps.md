# 03. 유사 앱/서비스 레퍼런스

> 사용자 수·평점·가격은 조사 시점(2026-10) 검색 결과 기준이며 변동 가능

## 1. 해외 구직 지원서 자동 입력 확장

| 서비스 | 핵심 기능 | 지원 범위 | 가격 | 비고 |
|---|---|---|---|---|
| **Simplify Copilot** | 저장된 프로필로 지원서 자동 입력, 지원 이력 자동 트래킹 | Workday, Greenhouse, Lever, Ashby, iCIMS, Taleo 등 100+ ATS | 무료 (유료 플랜 별도) | 제출은 사용자가 직접 검토 후 진행하는 구조 — [도움말](https://help.simplify.jobs/articles/1749022-installing-and-setting-up-copilot), [Chrome 웹 스토어](https://chrome.google.com/webstore/detail/simplify-copilot-autofill/pbanhockgagggenencehbnadejlgchfc) |
| **Jobright Autofill** | 자동 입력, AI 직무 매칭, 이력서 맞춤 수정, 지원 트래킹 | Workday, Greenhouse, Lever, Taleo, iCIMS, SmartRecruiters 등 100+ | 기본 무료(자동 입력 무제한), Turbo $39.99/월 | 10만+ 사용자, 평점 4.6 — [LoopCV 리뷰](https://www.loopcv.pro/directory/jobright/) |
| **Huntr** | 원클릭 자동 입력, AI 이력서, 지원 트래킹(CRM) | 미확인 | 무료 / $9/월 | 25만+ 사용자 — [비교 자료](https://bestjobsearchapps.com/articles/en/10-best-chrome-extensions-for-job-search-in-2026-find-your-dream-job-10x-faster) |
| **LazyApply** | 대량 자동 지원, 맞춤 커버레터 생성 | 50만+ 사이트 표방 | $99 평생 | 대량 지원 지향 — [비교 자료](https://bestjobsearchapps.com/articles/en/10-best-chrome-extensions-for-job-search-in-2026-find-your-dream-job-10x-faster), [moge.ai](https://moge.ai/product/lazyapply) |
| **Teal** | 이력서 빌더, 지원 트래킹 | — | 무료 / $9/주 | 자동 입력은 핵심 기능으로 확인되지 않음 — [JobShinobi 비교](https://jobshinobi.com/compare/teal-job-tracker-vs-huntr) |
| **JobFill** | 지원서 자동 입력 | 미확인 | 미확인 | [Chrome 웹 스토어](https://chromewebstore.google.com/detail/eoaegpeghnlbiahopljenopcjlccdnhi) |

공통 패턴
- 프로필 1회 입력 → 다수 ATS에서 자동 입력 (본 프로젝트와 동일 컨셉)
- 지원 대상을 **사이트가 아닌 ATS 단위**로 홍보 (Workday/Greenhouse/Lever 지원 = 수천 개 기업 커버)
- 자동 입력 무료 + AI 이력서·매칭 기능 유료화 구조
- 자동 제출이 아닌 **사용자 최종 검토 후 제출** 원칙

## 2. 오픈소스 구직 자동 입력 확장

| 프로젝트 | 스택 | 지원 사이트 | 구조·매핑 특징 | 상태 |
|---|---|---|---|---|
| [Autofill Jobs](https://github.com/andrewmillercode/Autofill-Jobs) | Vue, npm 빌드 → `dist` | Greenhouse, Lever, Dover, Workday | 플랫폼별 필드 매핑, Greenhouse(React 컴포넌트)·Lever(일반 DOM) 별도 처리, `sync`/`local` 분리 저장 | MIT, 유지보수 중단 |
| [job_app_filler](https://github.com/berellevy/job_app_filler) | TypeScript, webpack, React, MUI | Workday, iCIMS | 필드 클래스별 XPath 정의, `MutationObserver`로 신규 필드 감지, 필드 옆 개별 UI 렌더, content script(저장소 통신)·injected script(페이지 조작) 분리 | BSD-3, 커밋 471회 |

- 참고 포인트: 둘 다 **사이트별 어댑터 방식** → 지원 사이트 정확도 높지만 사이트 추가 비용 큼

## 3. 범용 폼 자동 입력
- Chrome 기본 자동완성: 이름·주소·연락처·카드 수준, 이력서 항목(학력·경력·자기소개서) 미지원 (휴리스틱 구조는 [02 보고서](02_field_mapping.md) 참고)
- 비밀번호 관리자(Bitwarden 등): 로그인·신원 정보 중심, 수집→결정→입력 구조 참고 가치
- 규칙 기반 범용 자동 입력 확장(Autofill 류): 사용자가 셀렉터·값 규칙 직접 작성 방식, 상세 미조사

## 4. 국내 현황

| 서비스 | 제공 주체 | 방식 | 지원 사이트 | 규모 |
|---|---|---|---|---|
| **원티드 지원 자동화** | 원티드랩 (공식) | 원티드 기본 이력서로 기업 채용 사이트 지원서 자동 입력 | 여러 기업 채용 사이트 | v1.1.8, 사용자 68명, 2025-04 업데이트 — [Extension Auditor](https://extensionauditor.com/scan/kghpojihbihjlicjokikldciiceafoll) |
| **딸깍 직행이 만든 지원서 자동 채우기** | 직행 | PDF 이력서 업로드 + 정보 입력, AI 기반 자동 입력, 로컬 저장 | 국내 채용 사이트 (구체 목록 미공개) | v1.0.5, 사용자 87명, 2025-12 업데이트 — [ChromeBoard](https://chromeboard.com/extension/딸깍-직행이-만든-지원서-자동-채우기-ppkbagjmomgbdnjoapckamahmfckmlmo) |
| **JOBPREP 자동입력 도우미** | JobPrep | jobprep.work 로그인 후 서버 프로필 불러와 자동 입력 | 사람인, 잡코리아, 원티드 | v1.1.0, 사용자 극소 — `<all_urls>` 권한 요구 — [ExtScope](https://extscope.org/extension/fdhfgbcdilegcpphkkkahffgcgeebcko) |
| **취준 정보 자동 입력** | 미확인 | 공통 정보(이름·연락처·주소·학력·경력) 자동 입력 + **사이드바에서 나머지 항목 복사·붙여넣기** | 사람인, 원티드, 자사 채용 페이지 등 | 미확인 — [Extension Auditor](https://extensionauditor.com/scan/ndgajbafbifkkmohjdelolpeaipcbjeb) |
| JobWizard (한국어 지원) | 해외 | 500+ 채용 사이트 자동 입력, 맞춤 자기소개서 생성 | 해외 ATS 중심 | [jobwizard.ai/ko](https://jobwizard.ai/ko) |

관찰 사항
- 국내 확장 다수 존재하나 **사용자 규모 모두 소규모** (수십~수백 명) → 시장 지배적 제품 부재
- 플랫폼 공식 확장(원티드)은 **자사 이력서 기반** → 타 플랫폼 데이터와 통합되지 않음
- 서버 로그인 방식(JOBPREP) vs 로컬 저장 방식(딸깍) 혼재
- '자동 입력 + 사이드바 복사 지원' 하이브리드 UX 사례 존재 (취준 정보 자동 입력) → 자동 매핑 실패 대비책으로 유용
- 채용 담당자용 확장도 존재: 그리팅 '그리픽'(외부 채용 플랫폼의 지원자 정보를 그리팅으로 옮기는 반대 방향 도구) — [그리픽](https://chrome.google.com/webstore/detail/greepick/lippfnablmodoghfgcmachjpfcflofii). 나인하이어 Assistant 확장도 존재하나 용도 미확인 — [Chrome 웹 스토어](https://chrome.google.com/webstore/detail/ninehire-assistant-%EB%82%98%EC%9D%B8%ED%95%98%EC%9D%B4%EC%96%B4/licodmnnipkpbmbomealilaikbojfabe)

## 5. 비교 요약 및 차별화 포인트

| 관점 | 해외 상용 (Simplify 등) | 국내 기존 확장 | 본 프로젝트 방향 |
|---|---|---|---|
| 대상 사이트 | 해외 ATS 중심 | 국내 일부, 지원 범위 불명확 | **국내 플랫폼 + 국내 ATS(그리팅 등) 명시적 지원** |
| 데이터 모델 | 영미권 이력서 | 기본 인적사항 위주 | **병역·학점(4.5/4.3)·어학·자격증·자기소개서 문항 등 국내 특화 스키마** |
| 데이터 저장 | 서버 계정 | 서버/로컬 혼재 | 로컬 우선, 서버 전송 없음 (선택적 백업) |
| 자기소개서 | AI 생성 중심 | 미지원 또는 미확인 | **기존 답변 재사용 + 문항 매칭 + 글자수 검사** |
| 실패 대응 | 미확인 | 일부 사이드바 복사 | 미매핑 필드 하이라이트 + 사이드 패널 복사 |
