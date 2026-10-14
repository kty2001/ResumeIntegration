# 구조·메시지 흐름 설계 v1

최종 갱신: 2026-10-14 · 기술 스택: WXT + TypeScript ([tech_stack.md](tech_stack.md))

- (미구현) 표시 항목은 설계만 있고 코드 없음 (BYOK LLM, 열람 페이지 가져오기)

## 1. 설계 원칙
- **DOM 작업과 판단 로직 분리**: content script는 수집·입력만, 매핑 판단은 background에서 수행 → 매핑 로직을 DOM 없이 단위 테스트 가능 (Bitwarden 수집→결정→입력 구조 참고, [02 보고서](../reports/02_field_mapping.md) 3장)
- **최소 권한**: 기본은 `activeTab`, 추가 출처 권한은 필요 시 런타임 요청
- **로컬 우선**: 개발자 서버 없음. 외부 전송은 BYOK LLM 사용 시에만, 이력서 값 미전송
- **자동 제출 없음**: 입력까지만 수행
- **상태 비보존 background**: service worker는 30초 무활동 시 종료 → 결과·대기 상태는 `storage.session`에 저장

## 2. 구성 요소와 책임

| 구성 요소 | WXT 엔트리포인트 | 책임 |
|---|---|---|
| Popup | `entrypoints/popup/` | '작성' 버튼, 사이트 상태 안내(제외·이력서 없음·권한 필요), 사이드 패널 열기, '이 페이지에서 가져오기', '연동 사이트 모두 열기' |
| Options | `entrypoints/options/` | 이력서·자기소개서·첨부 파일 편집, 설정, 학습 규칙 관리, 백업, 가져오기 미리 보기, 연동 사이트 관리. BYOK 설정 (미구현) |
| Side Panel | `entrypoints/sidepanel/` | 입력 결과 요약, 미입력 항목 직접 선택·복사, 위치 보기, 되돌리기, 자기소개서 추천 |
| Background | `entrypoints/background.ts` | 스크립트 주입, 메시지 중계, **매핑 엔진 실행**, 첨부 파일 본문 전달, 권한 허용 후 재작성, 가져오기 역변환, 연동 사이트 작성 시각 기록. BYOK LLM 호출 (미구현) |
| Filler (content script) | `entrypoints/filler.ts` (`defineUnlistedScript`) | 필드 수집, 위젯별 입력·검증, 하이라이트, 입력 전 값 백업, 사용자 직접 수정 감지, 가져오기용 입력란 값 읽기 |

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
| `optional_host_permissions` | ① 교차 출처 iframe 폼 (구현) ② BYOK LLM API 도메인 (미구현) | 설치 시 없음, 요청 시점에 출처별 동의 |

- 사이드 패널 '다시 작성'은 추가 권한 없이 activeTab이 유지되는 범위(같은 출처)에서만 동작
- 이력서 가져오기·연동 사이트 일괄 열기도 권한 추가 없음: 가져오기는 '작성'과 같은 activeTab + scripting, 일괄 열기는 `windows.create`(권한 불필요)
- E2E 빌드(`--mode e2e`) 전용: 툴바 클릭 재현 불가 → `host_permissions: http://localhost/*`, 선택 권한에 `http://127.0.0.1/*` 추가 (`wxt.config.ts`)
- activeTab 미적용 상황(사이드 패널 버튼, 교차 출처 iframe)은 [01 보고서](../reports/01_extension_architecture.md) 2.2 참고

## 4. 디렉터리 구조

```
src/
├─ entrypoints/
│  ├─ background.ts
│  ├─ filler.ts
│  ├─ popup/
│  ├─ options/               # sections/ 메뉴별 화면, useResume.ts 자동 저장
│  └─ sidepanel/
├─ core/                     # DOM 무관 순수 로직 (단위 테스트 대상)
│  ├─ schema/                # 스키마 타입(resume)·빈 값(empty)·표시명(labels)
│  ├─ mapping/               # 매칭(match, 스키마 키 결정 assignKeys는 가져오기 공용)·키워드 사전(dictionary)·옵션 동의어(options)·학습 규칙(learned)·결과 보고서(report)
│  ├─ format/                # 날짜·전화번호 형식 변환, 분리 입력(split)
│  ├─ frames.ts              # 프레임별 수집 결과 병합·입력 계획 분배
│  ├─ attachments.ts         # 첨부 파일 선택 (accept 확인)
│  ├─ coverLetter.ts         # 글자수 계산, 문항 태그·유사도 매칭
│  ├─ backup.ts              # 백업 파일 생성·검증
│  ├─ import.ts              # 가져오기 역변환·현재 이력서와 비교·반영 (7.4)
│  ├─ linked-sites.ts        # 연동 사이트 주소 확인·작성 시각 기록·갱신 필요 판정 (7.5)
│  └─ site-policy.ts         # 제외 사이트 판별, 선택 권한 패턴 일치
├─ dom/                      # content script 전용 DOM 로직
│  ├─ collect.ts             # 필드 수집
│  ├─ widgets/               # text, select, radio, checkbox, combobox, file
│  ├─ highlight.ts           # Shadow Root 테두리 박스
│  └─ snapshot.ts            # 입력 전 값 백업·되돌리기
├─ messaging/protocol.ts     # 메시지 규격·공용 타입
└─ storage/                  # items.ts (storage.defineItem), files.ts (IndexedDB 첨부 파일)
tests/
├─ unit/                     # core/ 대상 (Vitest)
└─ e2e/                      # Playwright + fixtures/
```

- `llm/` (BYOK 공통 인터페이스 + 제공자별 구현): 미구현

## 5. 핵심 데이터 구조

- 원본은 코드: 메시지·결과 타입 `src/messaging/protocol.ts`, 학습 규칙 `src/core/mapping/learned.ts`, 이력서 타입 [resume_schema_v1.md](resume_schema_v1.md)

| 타입 | 방향 | 요점 |
|---|---|---|
| `PageDetails` | filler → background | `url`(origin + pathname) + `fields: FieldDescriptor[]` + `addButtons: AddButton[]`. 값 미포함 |
| `AddButton` | | `buttonId`(filler 메모리 인덱스, fieldId와 별개), `label`(표시 텍스트)·`ariaLabel`·`section`. 반복 항목 '추가' 버튼 후보 (7.1) |
| `FieldDescriptor` | | `fieldId`(filler 메모리 인덱스, DOM 속성 추가 안 함), `widget`(text·textarea·date·select·radio·checkbox·checkboxes·combobox(ARIA 콤보박스·ARIA 미준수 커스텀 드롭다운)·file), 라벨류(label·ariaLabel·placeholder·name·id), `autocomplete`, `maxLength`, `section`(fieldset legend → 직전 제목), `options`(선택지 value·text), `cluster`(분리 입력 묶음), `accept`, `readOnly`(달력 팝업형) |
| `FillPlan` | background → filler | `items`(fieldId·schemaKey·value·source), `unmatched`, `skipped`(선택지 불일치 `no-option`·첨부 없음 `no-file`) |
| `FillResult` | filler → background | `filled`(전략), `failed`(사유) |
| `FillReport` | background → `session:fillReport` | `tabId`·`frameIds`·`url`·`at` + 입력란별 `ReportField`(label·status·schemaKey·reason·`hint`(형식 변환 정보)·fingerprint·source) |
| `LearnedRule` | `local:learnedRules` | `origin`·`fingerprint`(widget·name·id·표시 텍스트로 background가 계산)·`schemaKey`·`option?`(선택지 직접 선택: 이력서 값 → 선택지 텍스트)·`updatedAt` |
| `ImportDraft` | background → `session:importDraft` | `url`·`at` + `items: { schemaKey, value?(저장 형식, 변환 실패면 없음), raw }[]` + 자기소개서 후보 `{ question, answer }[]`. 현재 이력서와의 비교(`diffImport`: 갱신·추가 판별, 기본 선택)는 미리 보기 시점에 수행 |
| `LinkedSite` | `local:linkedSites` | `id`·`name`·`url`(이력서 수정 페이지)·`lastFilledAt?` |

- `MatchSource`: `learned`·`autocomplete`·`rule`·`manual`(사이드 패널 직접 입력). `llm`·`adapter`는 미구현
- 프레임: 같은 출처 iframe의 fieldId·cluster는 `프레임id:로컬id`, 최상위는 그대로 (`core/frames.ts`)
- 설계 초안에 있었으나 미구현: `dateFormat`, `groupIndex`(반복 인덱스는 매핑 시 등장 순서로 부여). `repeatGroups`는 `addButtons`로 대체

## 6. 메시지 규격

| 메시지 | 방향 | 요청 | 응답 |
|---|---|---|---|
| `startFill` | popup·sidepanel → background | `{ tabId, partial? }` (`partial`: 권한 없는 교차 출처 iframe 건너뜀) | `{ status: 'ok', filled, failed, unmatched, added }`(개수, `added`: 추가한 반복 블록) 또는 `excluded`·`user-excluded`·`no-resume`·`needs-permission { origins }`·`error` |
| `collect` | background → filler | — | `PageDetails` (콤보박스 선택지를 열어 읽으므로 비동기) |
| `addBlocks` | background → filler | `{ buttonId, count }` | `{ added }` (버튼을 count번 클릭, 클릭마다 새 입력란 생길 때까지 최대 2초 대기, 안 생기면 중단) |
| `fill` | background → filler | `FillPlan` | `FillResult` |
| `fillOne` | sidepanel → background → filler | `{ fieldId, schemaKey, optionValue? }` (값은 background가 이력서에서 조회, `optionValue`는 선택지 직접 선택. filler에는 `fill`로 전달) | `{ status: 'ok' \| 'error' }` (성공 시 학습, `session:fillReport` 갱신) |
| `fillAnswer` | sidepanel → background → filler | `{ fieldId, coverLetterId }` (filler에는 `fill`로 전달, 학습 없음. 자유형이면 제목 입력란에 문항도 입력) | `{ status: 'ok' \| 'error' }` (글자수 초과 시 오류 안내) |
| `focusField` | sidepanel → background → filler | `{ fieldId }` | `{ status: 'ok' \| 'error' }` (스크롤·포커스) |
| `highlight` | sidepanel → background → filler | `{ fields: { fieldId, status }[] }` (빈 배열이면 해제) | `{ status: 'ok' \| 'error' }` |
| `undo` | sidepanel → background → filler | — | `{ status: 'ok', restored }` (모든 프레임 합계, 성공 시 `session:fillReport` 초기화) |
| `userEdit` | filler → background | `{ fieldId, value }` (사용자 `change` 이벤트만) | — (같은 값의 이력서 항목이 하나면 결과 갱신 + 학습) |
| `llmMap` | background 내부 | 필드 정보 + 스키마 키 목록 | `{ fieldId → schemaKey }` (미구현) |
| `startImport` | popup → background | `{ tabId }` | `{ status: 'ok', count }`(가져온 항목 수) 또는 `excluded`·`user-excluded`·`empty`(읽은 값 없음)·`error` |
| `readValues` | background → filler | — | `{ fieldId, value }[]` (마지막 `collect` 입력란 중 값 있는 것만, 위젯별 `readValue` 재사용. 파일 제외, 비밀번호는 수집 대상 아님) |
| `readPairs` | background → filler | — | `{ label, value, section? }[]` (열람 페이지 표시 텍스트의 라벨-값 쌍, 7.4) (미구현) |

- 메시지 정의는 `messaging/protocol.ts`에 타입으로 일원화 (`@webext-core/messaging`)
- 사이드 패널 동작의 대상 탭은 `FillReport.tabId`, 프레임별 메시지는 background가 `frameId`로 나눠 중계
- 입력 결과는 메시지 대신 `session:fillReport`에 저장, 사이드 패널이 `watch`로 표시 → 사이드 패널 로드 전·팝업 닫힘 시에도 결과 유실 없음. 이력서 값은 미포함 (사이드 패널이 `local:resume`에서 직접 조회)

## 7. 주요 흐름

### 7.1 자동 입력
```
Popup '작성' 클릭 (activeTab 부여) → sidePanel.open (클릭 제스처 안에서 먼저 호출)
 → background: 제외 사이트 확인 ── 기본 제외 'excluded' / 사용자 제외 'user-excluded'
 → scripting.executeScript(filler, allFrames) ── 실패 시 최상위 프레임만
 → 권한 없는 교차 출처 iframe 있음 (partial 아닐 때)
      → session:pendingPermission 저장, 'needs-permission' 반환 (기존 결과 유지)
      → 팝업 '접근 허용' → permissions.request → 허용 시 permissions.onAdded에서 background가 다시 작성
      → 팝업 '이 페이지 부분만 입력' → startFill { partial: true }
 → 프레임별 collect → 병합 (core/frames.ts)
 → 반복 항목 블록 늘리기 (blocksToAdd, core/mapping/match.ts)
      섹션별 이력서 항목 수 > 페이지 블록 수(assignKeys 반복 인덱스 최대 + 1)이고 섹션 '추가' 버튼 있으면
      → 프레임별 addBlocks로 부족분만큼 클릭 → 추가됐으면 다시 collect·병합
      버튼 후보: 20자 이하 표시 텍스트·aria-label이 '추가'·'add'·'+' (파일·사진·삭제 등 제외), type=submit·외부 이동 링크 제외
      버튼 섹션: 버튼 텍스트 → 섹션 텍스트(detectSection), 섹션별 버튼 여럿이면 마지막
      클릭 중 submit 이벤트 차단 (타입 미지정 <button>의 폼 제출 방지)
 → 매핑 엔진 (background, core/mapping/match.ts)
      1. LearnedRule (origin + fingerprint)
      2. autocomplete 속성
      3. 파일 입력란은 파일 규칙만 / 그 외: 민감정보 규칙(설정 켰을 때) → 섹션 문맥 규칙 또는 basics 규칙
      4. (미구현) BYOK 설정 시 미매핑 필드만 llmMap
      반복 인덱스: 등장 순서대로, 바로 앞과 같은 반복 키인 선택형 입력란은 같은 블록 (학력구분 + 대학구분)
 → 형식 변환 (core/format) → 첨부 파일 본문 base64 추가 → FillPlan
 → 프레임별 fill → filler: 입력 전 값 snapshot → 위젯별 입력 → 검증 → FillResult
      이미 같은 값인 select·콤보박스는 이벤트 생략 (같은 값 change에도 폼을 다시 그리는 사이트)
      학교명·전공·회사명 텍스트는 ARIA 없는 자동완성 목록이 뜨면 후보 클릭, 맞는 후보 없으면 확인 필요
 → 입력 중 입력란이 사라지거나(not-found) 새로 생기면(formChanged, MutationObserver) 한 번만 다시 collect·매핑·fill
 → session:fillReport 저장 → 사이드 패널 표시 (자유형 자기소개서 textarea는 제목 입력란 titleFieldId 포함)
```

### 7.2 미입력 항목 처리·학습
```
사이드 패널: 확인 필요·해당 없음 목록 + 이력서 항목 선택
 → fillOne (선택지 불일치는 optionValue)
 → 성공 시 LearnedRule 저장 → 다음 '작성'에서 1순위 적용
 → 자동 입력 불가 위젯은 '복사' 버튼으로 클립보드 복사

페이지에서 직접 수정 (사용자 change 이벤트, 확장 프로그램 입력·되돌리기 중 제외)
 → filler: userEdit { fieldId, value }
 → background: 입력란 형식으로 같은 값인 이력서 항목이 하나뿐이면 입력 완료 처리 + LearnedRule 저장
```

### 7.3 되돌리기
- filler가 입력 직전 값을 메모리에 보관 → `undo` 시 위젯별로 복원
- 페이지 이동 시 snapshot 소멸 (저장하지 않음)
- '추가' 버튼으로 늘린 반복 블록은 제거하지 않음 (입력값만 복원)

### 7.4 이력서 가져오기
- 목적: 채용 사이트에 이미 작성한 이력서를 확장 프로그램에 다시 입력하지 않고 수집
- 대상: 사이트의 이력서 **수정 폼**(입력란에 값이 있는 페이지) 우선, 열람(보기) 페이지는 후속 (아래 '열람 페이지')
```
Popup '이 페이지에서 가져오기' 클릭 (activeTab 부여)
 → background: 제외 사이트 확인 ── 제외 사이트는 미주입 ('excluded'·'user-excluded')
 → filler 주입 (7.1과 같은 규칙, 교차 출처 iframe은 건너뜀)
 → 프레임별 collect + readValues → 병합
 → 매핑 엔진 assignKeys: 7.1과 같은 순서로 스키마 키 결정 (이력서 값 유무와 무관, 반복 인덱스는 등장 순서)
      파일 입력란 제외, 민감정보는 설정 켰을 때만
 → 역변환 (core/import.ts)
      날짜·연월 → YYYY-MM(-DD) / 전화번호 → 숫자만 / 분리 입력(cluster) 합치기
      선택지 텍스트 → enum 코드 (옵션 동의어 사전 역조회) / checkbox → boolean
      숫자(학점·연봉, 원 단위 연봉은 만원 환산) / 배열(희망 근무지·직무·고용 형태)
      변환 실패 값은 원문 그대로 '확인 필요' 표시, 같은 키 입력란이 여럿이면 첫 값, 체크 해제 checkbox는 값 없음
 → 미매핑 서술형 입력란(textarea): 라벨 = 문항, 값 = 답변 → 자기소개서 후보
 → 읽은 값 없으면 'empty' / 있으면 session:importDraft 저장 → 팝업이 옵션 '가져오기'(options.html#import) 열기
 → 미리 보기 diffImport (현재 이력서 기준)
      같은 값 항목 제외, 빈 항목 기본 선택, 값이 다른 항목·변환 실패 기본 미선택
      반복 항목: 대표 항목(학교명·회사명·자격증명·시험명·수상명·활동명·프로젝트명)으로 기존 항목과 같은 항목 판별 → 갱신 / 추가
      자기소개서 후보: 같은 문항·답변이 라이브러리에 있으면 제외
 → '선택 항목 반영' applyImport → local:resume(자동 저장, meta.updatedAt 갱신)·local:coverLetters 저장, draft 삭제 / '취소' → draft 삭제
```
- 페이지 값은 로컬에서만 처리, 외부 전송 없음 (1장 로컬 우선 원칙 유지). 페이지 조작 없음 (읽기만)
- 학습 규칙은 생성하지 않음 (매핑 확인 없이 읽은 값이므로)
- 최초 실행 동의 문구에 가져오기 안내 포함 (`CONSENT_VERSION` 증가, [screens.md](screens.md) 5장 ①)

열람 페이지 (후속): 범용 처리 우선, 불가 시 사이트별 어댑터
- 범용: filler `readPairs`가 표시 텍스트에서 라벨-값 쌍 추출 (`dl`의 `dt`·`dd`, 표의 `th`·`td`, '라벨: 값' 형식, 섹션 제목 + 반복 블록) → 라벨을 키워드 사전·섹션 문맥으로 매칭 → 위와 같은 역변환·미리 보기
- 사이트별 어댑터: 범용 추출로 주요 항목을 못 읽는 사이트만 선택자 기반 보정 (`MatchSource` `adapter`, 5장)
- 적용 범위는 사람인·잡코리아 DOM 현장 조사에서 범용 추출 가능 여부 확인 후 결정

### 7.5 연동 사이트 일괄 열기
- 목적: 이력서 갱신 후 여러 채용 사이트의 이력서를 빠르게 최신화
```
옵션 '연동 사이트': 이름 + 이력서 수정 페이지 URL 등록 (local:linkedSites)
 → 팝업·옵션 '연동 사이트 모두 열기' → windows.create({ url: [등록 URL…] }) 새 창에 일괄 열기
 → 사용자: 각 탭에서 로그인 (확장 프로그램은 로그인 미관여)
 → 각 탭에서 툴바 '작성' → 7.1 자동 입력 (activeTab 제약상 탭별 클릭 필요)
 → startFill 성공 시 탭 출처가 연동 사이트와 같으면 lastFilledAt 기록
 → lastFilledAt < resume.meta.updatedAt 이면 '갱신 필요' 표시 (옵션 목록·팝업)
```
- 제외 사이트 URL 등록 가능, 열기만 수행 → 해당 탭은 복사 전용 모드(9장)
- 제약: 반복 블록은 '추가' 버튼을 찾은 섹션만 늘림(7.1), 사이트 쪽 항목 삭제 미지원, 덮어쓴 값은 사이드 패널 '되돌리기'로 복구

## 8. 저장 구조

| 키 | 내용 | 비고 |
|---|---|---|
| `local:resume` | 이력서 데이터 (스키마 v1) | `version`·`migrations` 적용 |
| `local:coverLetters` | 자기소개서 문항-답변 라이브러리 | |
| `local:learnedRules` | `LearnedRule[]` | 옵션 화면에서 조회·삭제 |
| `local:consent` | 최초 실행 동의 (`version`·`acceptedAt`) | settings와 분리 (백업 '전체 삭제'·내보내기 대상 아님) |
| `local:settings` | `excludedSites`(사용자 제외 도메인), `sensitiveAutofill`(민감정보 자동 입력) | BYOK 제공자 (미구현) |
| IndexedDB `resume-files` | 첨부 파일 본문(Blob, 키 = 첨부 id) | 옵션·background 공용, 입력 시 background가 base64로 filler에 전달 |
| `session:fillReport` | 마지막 자동 입력 결과 (`FillReport`) | 사이드 패널 표시용 |
| `session:pendingPermission` | 권한 허용 대기 중인 '작성' (`tabId`, `origins`) | `permissions.onAdded`에서 재작성 |
| `local:llmCache` | `origin + fingerprint → schemaKey` | 미구현 |
| `local:llmKey` | BYOK API 키 (content script 접근 차단, 내보내기 제외) | 미구현 |
| `local:linkedSites` | `LinkedSite[]` (연동 사이트, 7.5) | 백업 내보내기·가져오기·전체 삭제 대상 |
| `session:importDraft` | 반영 전 가져오기 결과 (`ImportDraft`, 7.4) | '반영'·'취소' 시 삭제 |

- filler는 storage를 읽지 않고 메시지로 받은 값만 사용. `storage.setAccessLevel`로 content script 접근 차단은 미적용 (BYOK 키 도입 시 적용)
- 백업 파일(옵션 '백업'): `resume`·`coverLetters`·`learnedRules`·`linkedSites`만 포함(이전 백업 파일의 `linkedSites` 누락은 빈 목록), `session:*`·첨부 파일 본문 제외 (`core/backup.ts`, 가져오기 시 `resume.meta.schemaVersion` 확인)

## 9. 사이트 정책
- 기본 제외 목록: `linkedin.com` (이용약관상 확장 프로그램의 활동 자동화·화면 변경 금지, [05 보고서](../reports/05_privacy_and_policy.md) 4.1)
- 제외 사이트에서는 filler 미주입. 팝업 '복사 전용 모드 열기' → 사이드 패널 복사 전용 모드(이력서 항목 복사만)
- 사용자 추가 제외 목록 (옵션 '설정' → `local:settings.excludedSites`, 하위 도메인 포함)

## 10. 확인 필요 사항
- Isolated world에서 React 제어 input 값 반영: 로컬 fixture에서는 네이티브 setter + input·change로 동작, 실제 사이트 검증 전 (필요 시 해당 로직만 main world 주입)
- 해결: 같은 출처·교차 출처 iframe 처리(`core/frames.ts`, `needs-permission`), 팝업 클릭 제스처 안 사이드 패널 열기(실사용 검증 완료)
