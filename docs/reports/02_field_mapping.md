# 02. 필드 식별·매핑 레퍼런스

자동 입력 품질을 결정하는 핵심 = "이 입력란이 이력서의 어떤 항목인가" 판별 로직

## 1. 표준: HTML `autocomplete` 속성
- 폼 작성자가 필드 용도를 명시하는 표준 토큰 (WHATWG HTML Living Standard)
- 이력서 관련 활용 가능 토큰: `name`, `given-name`, `family-name`, `email`, `tel`, `street-address`, `postal-code`, `bday`, `organization`(회사명), `organization-title`(직함), `url`, `photo`
- 한계: 학력, 경력 기간, 자격증, 병역, 자기소개서 등 이력서 고유 항목 토큰 없음. 국내 채용 사이트의 실제 부여율 미확인
- 활용: 매칭 1순위 신호로 사용 (존재 시 신뢰도 최상)
- 출처: [MDN autocomplete](https://developer.mozilla.org/en-US/docs/Web/HTML/attributes/autocomplete)

## 2. 브라우저 오픈소스 휴리스틱

### 2.1 Chromium Autofill
- 필드 분류용 정규식 패턴을 언어별 JSON 리소스로 관리, 빌드 시 `transpile_regex_patterns.py`로 변환
  - [`form_parsing/regex_patterns.h`](https://chromium.googlesource.com/chromium/src/+/main/components/autofill/core/browser/form_parsing/regex_patterns.h)
  - [`resources/legacy_regex_patterns.json`](https://chromium.googlesource.com/chromium/src/+/main/components/autofill/core/browser/form_parsing/resources/legacy_regex_patterns.json)
- **한국어 패턴 포함 확인**: `FULL_NAME: "성명"`, `FIRST_NAME: "이름"`, `ADDRESS_LINE_1: "주소"`, `ADDRESS_LINE_2: "주소.?2"`, `CITY: "시[·・]?군[·・]?구"` 등
- 패턴이 label·name 속성 단위, 입력 타입(text/select/search) 단위로 구분됨
- 참고 포인트: 키워드 사전 구조(필드 타입 → 언어별 정규식 목록 → 매칭 대상 속성), 한국어 키워드 초기 사전 소스로 활용 가능
- 한계: 주소·이름·연락처 등 개인정보 중심, 이력서 항목 미포함

### 2.2 Firefox Form Autofill
- 판별 순서: ① `autocomplete` 속성 → ② 정규식(`HeuristicsRegExp.sys.mjs`, Chromium 패턴을 JS로 변환한 것 포함)으로 id·name·placeholder·label 매칭 → ③ 필드별 parser가 `FieldScanner`로 주변 필드 문맥을 보고 타입 보정 (예: 연속된 전화번호 3칸 분할 입력)
- 신용카드 필드는 Fathom(규칙 기반 경량 학습) 사용
- 참고 포인트: **주변 문맥 기반 보정** 개념 → '시작일/종료일', '학교명 → 전공 → 학점' 같은 연속 필드 그룹 판별에 응용 가능
- 출처: [Form Autofill Heuristics 문서](https://firefox-source-docs.mozilla.org/_sources/browser/extensions/formautofill/docs/heuristics.rst.txt), [FormAutofillHeuristics.sys.mjs](https://searchfox.org/mozilla-central/source/toolkit/components/formautofill/shared/FormAutofillHeuristics.sys.mjs), [FieldScanner.sys.mjs](https://arai.searchfox.org/firefox-main/source/toolkit/components/formautofill/shared/FieldScanner.sys.mjs)

## 3. Bitwarden 브라우저 확장 (비밀번호 관리자 오픈소스)
- 파이프라인: **수집(Collect) → 결정(Fill Script 생성) → 입력(Insert)** 3단계 분리
  - `autofill-init.ts` content script가 `CollectAutofillContentService.getPageDetails()`로 DOM 파싱
  - 결과 `AutofillPageDetails` = `AutofillField[]` + `AutofillForm[]` (필드별 메타데이터 묶음)
  - background(`runtime.background.ts`, `main.background.ts`)가 채울 값 결정 후 content script에 입력 지시
- 트리거 경로 다양화: 툴바 UI, 컨텍스트 메뉴, 단축키(MV3는 Promise 기반 `collectPageDetailsImmediately`)
- 인라인 자동완성 메뉴: `overlay.background.ts`가 content script ↔ 메뉴 UI ↔ background 조율
- 시사점: 필드 수집 결과를 직렬화 가능한 데이터 구조로 정의 → 매핑 로직을 DOM과 분리해 단위 테스트 가능
- 출처: [Collecting Page Details](https://contributing.bitwarden.com/architecture/deep-dives/autofill/collecting-page-details), [Inline Autofill Menu](https://contributing.bitwarden.com/architecture/deep-dives/autofill/autofill-menu)

## 4. 매핑 방식 비교

| 방식 | 원리 | 정확도 | 비용 | 개인정보 | 유지보수 |
|---|---|---|---|---|---|
| 규칙/사전 기반 | label·name·placeholder·id·aria-label에 키워드 정규식 매칭 | 일반 필드 양호, 자유 형식 문항 취약 | 없음 | 로컬 처리 | 키워드 사전 관리 |
| 사이트별 어댑터 | 사이트·ATS별 셀렉터/XPath 정의 (job_app_filler, Autofill Jobs 방식) | 지원 사이트 최상 | 없음 | 로컬 처리 | 사이트 개편 시 수정 필요 |
| **LLM – 사용자 API 키(BYOK)** | 사용자가 입력한 본인 API 키로 LLM 호출, 필드 정보 + 스키마 키 목록 전달 → 매핑 JSON 수신 | 범용성 최상 | 사용자 본인 부담 | 필드 정보·스키마 키만 외부 전송 (이력서 값 미전송 설계) | 프롬프트 관리 |
| ~~LLM – Chrome 내장 AI~~ | Gemini Nano Prompt API | — | — | 온디바이스 | **한국어 미지원으로 제외** |

- Chrome 내장 AI 제외 근거: Chrome 138+ 확장 전용, 지원 언어 영어·일본어·스페인어·독일어·프랑스어(**한국어 미포함**), 여유 저장공간 22GB·GPU VRAM 4GB 초과 또는 RAM 16GB·4코어 이상 요구 — [Prompt API](https://developer.chrome.com/docs/extensions/ai/prompt-api), [Built-in AI](https://developer.chrome.com/docs/ai/built-in)
- **결정 사항**: 규칙/사전 기반을 기본으로 하고, 원하는 사용자에 한해 BYOK LLM으로 미매핑 필드 보조. 사이트별 어댑터는 범용 전략 반복 실패 사이트의 예외 보정용 ([06 보고서](06_generic_widget_strategy.md))

### 4.1 BYOK LLM 설계
- **선택 기능**: API 키 미입력 사용자도 규칙 기반만으로 기본 기능 동작
- 키 관리: 옵션 페이지에서 제공자 선택 + API 키 입력 → `chrome.storage.local` 저장, `setAccessLevel`로 content script 접근 차단
- 호출 위치: service worker에서만 호출. 선택한 제공자의 API 도메인만 `optional_host_permissions`로 런타임 요청
- **개인정보 최소 전송**
  - 필드 매핑: 이력서 *값*이 아닌 *스키마 키 목록*(예: `education[].school`, `military.status`) + 페이지 필드 정보(label·placeholder·name·옵션 목록) 전송 → LLM은 `필드 ↔ 스키마 키` 매핑 JSON만 반환 → 실제 값 입력은 로컬 수행
  - 드롭다운 옵션 선택: 해당 항목 값 1개 + 옵션 목록만 전송 ([06 보고서](06_generic_widget_strategy.md) 2.5)
  - 페이지 필드 정보에 다른 사용자 정보가 섞이지 않도록 기존 입력값(`value`)은 전송 대상에서 제외
- 결과 캐싱: `도메인 + 필드 식별자 → 스키마 키` 저장 → 같은 사이트 재방문 시 API 미호출, 비용 절감
- 응답 검증: 반환 JSON을 스키마로 검증, 존재하지 않는 스키마 키는 폐기
- 최초 사용 시 외부 전송 범위 고지·동의 화면 ([05 보고서](05_privacy_and_policy.md))
- 지원 제공자 범위: 구현 단계에서 결정 (제공자별 호출부만 분리한 공통 인터페이스 구조 권장)

## 5. 사용자 수정 학습
- 개념: 자동 입력 후 사용자가 수정한 필드를 `도메인 + 필드 식별자 → 이력서 항목` 규칙으로 저장, 다음 방문 시 우선 적용
- 사례
  - job_app_filler: `page → section → field type → field name` 계층 경로로 사용자 답변 저장 — [GitHub](https://github.com/berellevy/job_app_filler)
  - Bitwarden 'Fill Assist': 사용자가 문제 사이트 제보 → 사이트별 맞춤 규칙을 DB에 추가 → 확장 업데이트 없이 전체 사용자에게 규칙 동기화 — [Bitwarden 블로그](https://bitwarden.com/blog/fill-assist-improving-autofill-every-time-for-everyone.md)
    - 시사점: 사이트 어댑터를 코드가 아닌 **원격 갱신 가능한 규칙 데이터(JSON)**로 분리하면 사이트 개편 대응 속도 향상 (단, MV3는 원격 코드 실행 금지 → 셀렉터 등 데이터만 원격 수신 가능 — [Remote hosted code](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code))
- 필드 식별자 후보: `name`/`id` (안정적일 때), label 텍스트, 폼 내 순서 (클래스명은 빌드마다 바뀌는 경우 많아 비권장)

## 6. 자기소개서 문항 매칭
- 문제: 기업마다 문항 표현 상이 (예: "지원 동기" / "우리 회사에 지원한 이유")
- 접근
  - 1단계: 문항 텍스트 정규화 후 키워드 사전 매칭 (지원동기, 성장과정, 성격 장단점, 직무역량, 입사 후 포부, 협업 경험 등)
  - 2단계: 과거 답변 목록에서 유사 문항 후보 제시 → 사용자가 선택 (자동 입력보다 **추천 + 확인** 방식이 안전)
  - 선택: 문자열 유사도(n-gram, 편집 거리) 또는 임베딩 기반 유사도
- 글자수 제한 처리
  - `maxlength` 속성 확인, 문항 텍스트 내 "(500자 이내)", "공백 포함/제외" 표기 파싱
  - 공백 포함/제외, 바이트 기준(한글 2byte/3byte) 등 사이트별 계산 방식 상이 → 계산 모드별 글자수 표시 후 초과 시 경고
