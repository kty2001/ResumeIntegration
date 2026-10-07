# 01. 확장 프로그램 코드 구조 조사

## 1. Manifest V3 구성 요소

| 구성 요소 | 역할 | 본 프로젝트에서의 용도 |
|---|---|---|
| `manifest.json` | 권한, 스크립트, UI 진입점 선언 | 권한 최소화 설계의 기준점 |
| Service Worker (background) | 이벤트 처리, 메시지 중계, 스크립트 주입 | '작성' 명령 수신 → 탭에 content script 주입 |
| Content Script | 웹 페이지 DOM 접근 | 폼 필드 수집, 값 입력 |
| Popup | 툴바 아이콘 클릭 시 표시되는 작은 UI | '작성' 버튼, 프로필 선택 |
| Options Page | 전체 화면 설정 페이지 | 이력서 데이터 입력·편집 |
| Side Panel (Chrome 114+) | 브라우저 우측 상주 패널 | 입력 결과 확인, 미매핑 항목 복사·붙여넣기 지원 |

- Side Panel: `"sidePanel"` 권한 + `side_panel.default_path` 선언, `setPanelBehavior({ openPanelOnActionClick: true })`로 아이콘 클릭 시 열기 가능, `sidePanel.open()`은 사용자 제스처 필요 (Chrome 116+) — [Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
- Service Worker 수명: 30초 무활동 시 종료, 전역 변수 상태 유실 → 상태는 `chrome.storage`에 저장 필요 — [Service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)

## 2. 핵심 API 및 권한

### 2.1 `chrome.storage`
| 영역 | 용량 | 특징 |
|---|---|---|
| `local` | 10MB (`unlimitedStorage`로 확장 가능) | 이력서 전체 데이터, 첨부 파일 저장 적합 |
| `sync` | 총 ~100KB, 항목당 8KB, 최대 512개, 쓰기 120회/분 | Chrome 로그인 기기 간 동기화. 자기소개서 등 긴 텍스트에는 부적합 |
| `session` | 10MB, 메모리 전용 | 브라우저 재시작 시 삭제. 임시 상태 용도 |

- `setAccessLevel()`로 content script의 storage 접근 제어 가능
- 출처: [chrome.storage API](https://developer.chrome.com/docs/extensions/reference/api/storage)
- 참고 사례: Autofill Jobs는 일반 데이터 `sync`, 이력서 파일 `local`로 분리 저장 — [GitHub](https://github.com/andrewmillercode/Autofill-Jobs)

### 2.2 스크립트 주입: `chrome.scripting` + `activeTab`
- `activeTab`: 사용자 제스처(툴바 액션 클릭, 컨텍스트 메뉴, 단축키, 옴니박스) 시 현재 탭에 임시 접근 권한 부여, **설치 시 권한 경고 없음** — [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
- `scripting` 권한과 함께 사용 시 `scripting.executeScript()`로 필요 시점에만 content script 주입 가능
- 제약 사항
  - **Side Panel 내부 버튼 클릭은 activeTab 부여 제스처 목록에 없음** → 사이드 패널에서 '작성' 실행 시 `optional_host_permissions` 런타임 요청 또는 `host_permissions` 필요
  - **activeTab은 교차 출처(cross-origin) iframe에 적용 불가** → `allFrames: true`로도 iframe 내부 폼 접근 불가, 해당 출처 host 권한 필요 — [Mozilla Bug 1684736](https://bugzilla.mozilla.org/show_bug.cgi?id=1684736), [scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting)
- 권장 전략: 기본은 `activeTab` + popup '작성' 버튼, iframe 기반 채용 사이트(예: 임베드형 ATS)는 `optional_host_permissions`로 사이트별 동의 요청

### 2.3 메시징
- popup/side panel ↔ service worker ↔ content script 간 `chrome.runtime.sendMessage` / `chrome.tabs.sendMessage` 사용
- Bitwarden 사례: `collectPageDetails` 메시지 → content script가 페이지 정보 수집 후 `collectPageDetailsResponse` 응답 → background에서 채울 값 결정 — [Bitwarden: Collecting Page Details](https://contributing.bitwarden.com/architecture/deep-dives/autofill/collecting-page-details)

## 3. 동작 흐름 (제안)

```
[Options Page] 이력서 입력 → chrome.storage.local 저장
        │
[Popup '작성' 클릭] ── activeTab 부여
        │
[Service Worker] scripting.executeScript(collector.js)
        │
[Content Script] 1) 필드 수집: input/select/textarea + label/placeholder/name/id/aria-label
        │        2) 결과(Page Details)를 service worker로 전달
        ▼
[매핑 엔진] 필드 ↔ 이력서 항목 매칭 (저장된 사용자 규칙 → 규칙/사전 → (API 키 입력 시) BYOK LLM → 사이트 어댑터 보정)
        │
[Content Script] 3) 위젯 종류별 전략으로 값 입력 시도 → 검증 → 실패 시 다음 전략 (06 보고서)
        │        4) 입력 필드 하이라이트, 미입력 필드 표시
        │
[Side Panel/Popup] 결과 요약, 되돌리기(입력 전 값 백업), 미입력 항목 직접 선택·복사
        │
[학습] 사용자가 직접 고친 결과를 '도메인 + 필드 식별자' 규칙으로 저장
```

## 4. 폼 자동 입력 기술 이슈

| 이슈 | 내용 | 대응 방법 |
|---|---|---|
| React/Vue 제어 컴포넌트 | `el.value = x` 직접 대입 시 프레임워크 상태 미반영 | 프로토타입의 native value setter 호출 후 `input`(bubbles) 이벤트 dispatch — [Cory Rylan](https://coryrylan.com/blog/trigger-input-updates-with-react-controlled-inputs), [React #10135](https://github.com/facebook/react/issues/10135) |
| 검증 로직이 blur에 걸린 필드 | onChange만으로 값 확정 안 됨 | `change`, `blur` 이벤트 추가 발생 (Workday 사례) — [job_app_filler](https://github.com/berellevy/job_app_filler) |
| 커스텀 드롭다운·날짜 선택기 | 실제 `<select>`가 아닌 div 기반 위젯 | WAI-ARIA 패턴 기반 범용 전략 체인 → 실패 시 사용자 직접 선택 ([06 보고서](06_generic_widget_strategy.md)) |
| 반복 항목 | 경력·학력·자격증 '추가' 버튼으로 행 생성 | 항목 수만큼 추가 버튼 클릭 후 신규 행 대기·입력 |
| 동적 로딩/SPA | 단계별 페이지, 지연 렌더링 | `MutationObserver`로 신규 필드 감지 (job_app_filler 방식) |
| iframe | 임베드형 채용 폼 | `allFrames` + 해당 출처 host 권한 |
| Shadow DOM | 웹 컴포넌트 내부 필드 | `element.shadowRoot` 재귀 탐색 (open 모드만 가능) |
| 파일 업로드 | 이력서·포트폴리오 PDF | `DataTransfer`로 `File` 생성 후 `input.files`에 할당 + `change` 이벤트 — [pqina](https://pqina.nl/blog/set-value-to-file-input/) |
| 글자수 제한 | `maxlength`, 자기소개서 글자수 표기 | 입력 전 길이 검사, 초과 시 경고 |

## 5. 빌드 도구 / 프레임워크 비교

| 도구 | 성격 | 장점 | 단점 |
|---|---|---|---|
| Vanilla JS | 빌드 없음 | 단순, 의존성 없음 | 규모 증가 시 모듈화·타입 관리 어려움 |
| Vite + CRXJS | Vite 플러그인 | 가볍고 제어권 높음, HMR | 규칙을 직접 설계해야 함, ZIP·멀티 브라우저 지원 부분적 |
| **WXT** | 풀 프레임워크 (Vite 기반) | 프레임워크 무관(React/Vue/Svelte), MV2/MV3, 멀티 브라우저, ZIP·배포 자동화, 활발한 유지보수 | 프레임워크 규칙 학습 필요 |
| Plasmo | 풀 프레임워크 (Parcel 기반) | React 친화적, 초기 DX 우수 | 유지보수 상태 우려, Parcel 빌드 속도 |

- 출처: [WXT 비교 문서](https://wxt.dev/guide/resources/compare), [DEV: Plasmo vs CRXJS vs WXT (2026)](https://dev.to/extensionbooster/plasmo-vs-crxjs-vs-wxt-which-chrome-extension-framework-should-you-use-in-2026-37o4), [2025 State of Browser Extension Frameworks](https://redreamality.com/blog/the-2025-state-of-browser-extension-frameworks-a-comparative-analysis-of-plasmo-wxt-and-crxjs/)
- 판단: 다수 비교 글에서 신규 프로젝트에 WXT 권장. 프로토타입 단계는 Vanilla JS도 충분 → 기술 스택은 별도 결정 필요

## 6. 크로스 브라우저
- Edge: Chromium 기반, MV3 확장 호환
- **네이버 웨일**: Chromium 기반으로 Chrome 웹 스토어 확장 설치 가능, 웨일 스토어에 동일 ZIP 별도 등록 가능 — [웨일에 크롬 확장 설치](https://extrememanual.net/44867), [크롬/웨일 확장프로그램 출시하기](https://velog.io/@budlebee/크롬웨일-확장프로그램-출시하기)
- 국내 사용자 비중 고려 시 웨일 스토어 동시 배포 검토 가치 존재

## 7. 테스트
- Playwright: `launchPersistentContext` + `--disable-extensions-except`, `--load-extension` 플래그로 unpacked 확장 로드, `context.serviceWorkers()`로 확장 ID 획득 — [Playwright: Chrome extensions](https://playwright.dev/docs/chrome-extensions)
- 제약: Chromium 전용, Playwright 번들 Chromium 사용 필요 (Chrome/Edge 정식판은 사이드로드 플래그 제거)
- 권장: 실제 채용 사이트 대신 사이트별 폼 구조를 모사한 로컬 HTML fixture로 회귀 테스트 구성 (일반 input / React 제어 input / 커스텀 드롭다운 / 반복 항목 / iframe)

## 8. 권장 디렉터리 구조 초안 (Vanilla 기준, WXT 채택 시 `entrypoints/` 규칙으로 치환)

```
extension/
├─ manifest.json
├─ background/
│  ├─ service-worker.js      # 메시지 중계, executeScript
│  └─ llm/                   # BYOK LLM 호출 (제공자별 호출부 분리, service worker 전용)
├─ content/
│  ├─ collector.js           # 필드 수집 (Page Details)
│  ├─ filler.js              # 전략 체인 실행, 하이라이트
│  ├─ widgets/               # 위젯 종류별 범용 입력 전략 (select, combobox, date, verify ...)
│  └─ adapters/              # 예외 보정용 사이트 규칙 (JSON 데이터 위주)
├─ mapping/
│  ├─ dictionary.js          # 필드 키워드·옵션 동의어 사전 (한/영)
│  ├─ matcher.js             # 필드 ↔ 이력서 항목 매칭
│  └─ learned-rules.js       # 사용자 수정 기반 도메인별 규칙
├─ popup/                    # '작성' 버튼
├─ options/                  # 이력서 데이터 입력 화면
├─ sidepanel/                # 결과 확인, 복사 지원
├─ storage/
│  └─ schema.js              # 이력서 데이터 모델, 마이그레이션
└─ tests/
   └─ fixtures/              # 사이트 모사 HTML
```
