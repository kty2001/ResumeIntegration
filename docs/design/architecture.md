# 구조·메시지 흐름 설계 v1

최종 갱신: 2026-10-09 · 기술 스택: WXT + TypeScript ([tech_stack.md](tech_stack.md))

## 1. 설계 원칙
- **DOM 작업과 판단 로직 분리**: content script는 수집·입력만, 매핑 판단은 background에서 수행 → 매핑 로직을 DOM 없이 단위 테스트 가능 (Bitwarden 수집→결정→입력 구조 참고, [02 보고서](../reports/02_field_mapping.md) 3장)
- **최소 권한**: 기본은 `activeTab`, 추가 출처 권한은 필요 시 런타임 요청
- **로컬 우선**: 개발자 서버 없음. 외부 전송은 BYOK LLM 사용 시에만, 이력서 값 미전송
- **자동 제출 없음**: 입력까지만 수행
- **상태 비보존 background**: service worker는 30초 무활동 시 종료 → 진행 상태는 `storage.session`에 저장

## 2. 구성 요소와 책임

| 구성 요소 | WXT 엔트리포인트 | 책임 |
|---|---|---|
| Popup | `entrypoints/popup/` | '작성' 버튼, 현재 사이트 상태 표시(지원/제외/권한 필요), 사이드 패널 열기 |
| Options | `entrypoints/options/` | 이력서 데이터 입력·편집, BYOK 설정, 학습 규칙 관리, 내보내기/가져오기 |
| Side Panel | `entrypoints/sidepanel/` | 입력 결과 요약, 미입력 항목 직접 선택·복사, 되돌리기 |
| Background | `entrypoints/background.ts` | 스크립트 주입, 메시지 중계, **매핑 엔진 실행**, BYOK LLM 호출, 권한 요청 처리 |
| Filler (content script) | `entrypoints/filler.ts` (`defineUnlistedScript`) | 필드 수집(Page Details), 위젯 전략 체인으로 값 입력·검증, 하이라이트, 입력 전 값 백업 |

- Filler는 manifest에 등록하지 않는 unlisted script로 빌드(`/filler.js`) → '작성' 클릭 시 `scripting.executeScript({ files: ['/filler.js'] })`로 주입. content script 정의(`defineContentScript`)는 `matches` 지정이 필요해 권한에 영향을 줄 수 있어 미사용 → 평소에는 어떤 페이지에도 스크립트 미실행
- 중복 주입 방지: 전역 플래그 확인 후 이미 주입된 경우 메시지 수신만 수행

## 3. 권한

```jsonc
{
  "permissions": ["activeTab", "scripting", "storage", "sidePanel"],
  "optional_host_permissions": ["https://*/*"]
}
```

| 권한 | 용도 | 설치 시 경고 |
|---|---|---|
| `activeTab` | 툴바 아이콘 클릭 시 현재 탭 접근 | 없음 |
| `scripting` | Filler 주입 | 없음 (activeTab과 함께 사용) |
| `storage` | 이력서·설정·학습 규칙 저장 | 없음 |
| `sidePanel` | 사이드 패널 | 없음 |
| `optional_host_permissions` | ① 교차 출처 iframe 폼 ② 사이드 패널에서 '작성' 재실행 ③ BYOK LLM API 도메인 | 설치 시 없음, 요청 시점에 출처별 동의 |

- activeTab 미적용 상황(사이드 패널 버튼, 교차 출처 iframe)은 [01 보고서](../reports/01_extension_architecture.md) 2.2 참고

## 4. 디렉터리 구조

```
src/
├─ entrypoints/
│  ├─ background.ts
│  ├─ filler.ts
│  ├─ popup/
│  ├─ options/
│  └─ sidepanel/
├─ core/                     # DOM 무관 순수 로직 (단위 테스트 대상)
│  ├─ schema/                # 이력서 스키마 타입·마이그레이션
│  ├─ mapping/               # 규칙 매칭, 키워드·동의어 사전, 학습 규칙 조회
│  ├─ format/                # 날짜·전화번호·학점 형식 변환
│  └─ site-policy.ts         # 제외 사이트 목록
├─ dom/                      # content script 전용 DOM 로직
│  ├─ collect.ts             # Page Details 수집
│  ├─ widgets/               # select, combobox, custom-popup, date, verify
│  ├─ highlight.ts           # Shadow Root UI로 하이라이트·안내
│  └─ snapshot.ts            # 입력 전 값 백업·되돌리기
├─ llm/                      # BYOK: 공통 인터페이스 + 제공자별 구현
├─ messaging/                # 메시지 규격 정의
└─ storage/                  # storage.defineItem 정의
tests/
├─ unit/                     # core/ 대상 (Vitest)
└─ e2e/                      # Playwright + fixtures/
```

## 5. 핵심 데이터 구조

- 이력서 데이터 타입·스키마 키 정의: [resume_schema_v1.md](resume_schema_v1.md)

```ts
// content script → background: 페이지에서 수집한 필드 정보 (값 미포함)
interface PageDetails {
  url: string;              // origin + pathname만 (쿼리 제거)
  frameId: number;
  fields: FieldDescriptor[];
  repeatGroups: RepeatGroup[];   // 경력·학력 등 '추가' 버튼 단위 묶음
}

interface FieldDescriptor {
  fieldId: string;          // content script 내부 인덱스 (DOM에 속성 추가 안 함)
  fingerprint: string;      // 학습 규칙용 안정 식별자 (현재 구현: FieldDescriptor에 두지 않고 background에서 widget·name·id·표시 텍스트로 계산)
  widget: 'text' | 'textarea' | 'select' | 'combobox' | 'searchable' | 'custom-popup'
        | 'date' | 'date-text' | 'date-split' | 'date-calendar' | 'checkbox' | 'radio' | 'file';
  label?: string;
  name?: string;
  id?: string;
  placeholder?: string;
  autocomplete?: string;
  ariaLabel?: string;
  maxLength?: number;
  options?: string[];       // 드롭다운 선택지 텍스트 (열지 않고 알 수 있는 경우)
  dateFormat?: string;      // 'YYYY.MM' 등 추론 결과
  sectionHeading?: string;  // 가장 가까운 섹션 제목 (문맥 판별용)
  groupIndex?: number;      // 반복 항목 내 순번
}

// background → content script: 무엇을 어디에 넣을지
interface FillPlan {
  items: { fieldId: string; schemaKey: string; value: string; source: MatchSource }[];
  unmatched: string[];      // 매핑 실패 fieldId
}
type MatchSource = 'learned' | 'autocomplete' | 'rule' | 'llm' | 'adapter' | 'manual';  // manual: 사이드 패널 직접 입력

// content script → background: 입력 결과
interface FillResult {
  filled: { fieldId: string; strategy: string }[];
  failed: { fieldId: string; reason: string }[];  // 사이드 패널에서 직접 선택 대상
}

// 사용자 수정 기반 학습 규칙
interface LearnedRule {
  origin: string;
  fingerprint: string;
  schemaKey: string;
  optionText?: string;      // 드롭다운의 경우 사용자가 고른 선택지
  updatedAt: string;
}
```

## 6. 메시지 규격

| 메시지 | 방향 | 요청 | 응답 |
|---|---|---|---|
| `startFill` | popup·sidepanel → background | `{ tabId }` | `{ status: 'ok', filled, failed, unmatched }` 또는 `{ status: 'excluded' \| 'no-resume' \| 'needs-permission' \| 'error' }` |
| `collect` | background → filler | — | `PageDetails` |
| `fill` | background → filler | `FillPlan` | `FillResult` |
| `undo` | sidepanel → background → filler | — | `{ status: 'ok', restored: number }` (성공 시 `session:fillReport` 초기화) |
| `fillOne` | sidepanel → background → filler | `{ fieldId, schemaKey }` (값은 background가 이력서에서 조회, filler에는 `fill`로 전달) | `{ status: 'ok' \| 'error' }` (결과는 `session:fillReport` 갱신) |
| `focusField` | sidepanel → background → filler | `{ fieldId }` | `{ status: 'ok' \| 'error' }` (해당 입력란으로 스크롤·포커스) |
| `highlight` | sidepanel → background → filler | `{ fields: { fieldId, status }[] }` (빈 배열이면 해제) | `{ status: 'ok' \| 'error' }` (상태별 색 테두리로 입력란 위치 표시) |
| `fillReport` | background → sidepanel | `FillReport` (입력란별 라벨·상태·스키마 키·사유) | — (메시지 대신 `session:fillReport` 저장) |
| `llmMap` | background 내부 | 필드 정보 + 스키마 키 목록 | `{ fieldId → schemaKey }` |

- 메시지 정의는 `messaging/protocol.ts`에 타입으로 일원화 (`@webext-core/messaging`, [tech_stack.md](tech_stack.md))
- 현재 구현: `startFill`·`collect`·`fill`·`fillOne`·`focusField`·`highlight`·`undo`, 최상위 프레임(`frameId: 0`)의 text·textarea·date 입력란만 처리. 학습 규칙은 `fillOne` 성공 시 background가 저장하고 `startFill` 매핑에서 1순위 적용(`core/mapping/learned.ts`). 값 형식 변환은 background에서 수행(`core/format`, 입력란 placeholder·maxLength·widget 기준), `FillReport` 필드에 같은 정보(`hint`)를 보관해 `fillOne`에도 적용. 사이드 패널 동작의 대상 탭은 `FillReport.tabId`, `focusField`·`highlight`·`undo`는 background가 같은 이름의 메시지로 filler에 중계. 섹션 문맥: `FieldDescriptor.section`(fieldset legend → 직전 제목)과 입력란 텍스트로 섹션 판별(학력·경력·자격증·어학·수상·활동·프로젝트, 목록은 `SECTION_LABELS`), 섹션 규칙 키는 `education.*.school.ko` 형식이고 `mapFields`가 페이지 등장 순서대로 인덱스 부여. 하이라이트는 `dom/highlight.ts`가 Shadow Root 안 고정 위치 박스로 표시(페이지 요소 스타일 미변경), `collect`·`undo` 시 해제. `needs-permission`은 iframe 처리 시 추가
- `fillReport`는 메시지 대신 `session:fillReport`에 저장, 사이드 패널이 `watch`로 표시 → 사이드 패널 로드 전·팝업 닫힘 시에도 결과 유실 없음. 이력서 값은 미포함 (사이드 패널이 `local:resume`에서 직접 조회)

## 7. 주요 흐름

### 7.1 자동 입력
```
Popup '작성' 클릭 (activeTab 부여)
 → background: site-policy 확인 ── 제외 사이트 → 'excluded' 반환, 복사 전용 모드 안내
 → scripting.executeScript(filler, allFrames)
 → collect → PageDetails 수신
 → 매핑 엔진 (background)
      1. LearnedRule (origin + fingerprint)
      2. autocomplete 속성
      3. 규칙/키워드 사전 + 섹션 문맥
      4. (BYOK 설정 시) 미매핑 필드만 llmMap → 결과 캐싱
      5. 사이트 보정 규칙(JSON)
 → FillPlan 생성 (민감정보 키는 사용자 설정에 따라 제외 가능)
 → fill → filler: 입력 전 값 snapshot → 위젯 전략 체인 → 검증 → FillResult
 → sidePanel.open (popup 클릭 제스처 내에서 호출) → fillReport 표시
```

### 7.2 미입력 항목 처리·학습
```
사이드 패널: 실패 필드 목록 + 이력서 값 표시
 → 사용자가 항목 선택 → fillOne
 → 성공 시 LearnedRule 저장 → 다음 방문 시 1순위 적용
 → 자동 입력 불가 위젯은 '복사' 버튼으로 클립보드 복사
```

### 7.3 되돌리기
- filler가 입력 직전 값을 메모리에 보관 → `undo` 시 동일 전략으로 복원
- 페이지 이동 시 snapshot 소멸 (저장하지 않음)

## 8. 저장 구조 (`storage.local`)

| 키 | 내용 | 비고 |
|---|---|---|
| `local:resume` | 이력서 데이터 (스키마 v1) | `version`·`migrations` 적용 |
| `local:coverLetters` | 자기소개서 문항-답변 라이브러리 | |
| `local:learnedRules` | `LearnedRule[]` | 옵션 화면에서 조회·삭제 |
| `local:llmCache` | `origin + fingerprint → schemaKey` | |
| `local:settings` | 민감정보 입력 여부, BYOK 제공자, 제외 사이트 추가 목록 | |
| `local:llmKey` | BYOK API 키 | content script 접근 차단, 내보내기 제외 |
| `session:fillState` | 진행 중 작업 상태 | service worker 재시작 대비 |
| `session:fillReport` | 마지막 자동 입력 결과 (`FillReport`) | 사이드 패널 표시용, '작성' 시작 시 초기화 |

- `storage.setAccessLevel`로 content script의 storage 접근 차단 → filler는 메시지로 받은 값만 사용

## 9. 사이트 정책
- 기본 제외 목록: `linkedin.com` (이용약관상 확장 프로그램의 활동 자동화·화면 변경 금지, [05 보고서](../reports/05_privacy_and_policy.md) 4.1)
- 제외 사이트에서는 filler 미주입, 사이드 패널에서 이력서 항목 복사 기능만 제공
- 사용자 추가 제외 목록 지원

## 10. 확인 필요 사항
- Isolated world(content script 기본 실행 환경)에서 React 제어 input 값 반영 여부 → fixture로 검증, 필요 시 해당 로직만 main world 주입
- `allFrames: true` 주입 시 iframe별 `frameId`로 PageDetails를 나눠 받는 처리
- 사이드 패널 열기를 popup 클릭 처리 중 비동기 작업 이후 호출할 때 사용자 제스처 유지 여부
