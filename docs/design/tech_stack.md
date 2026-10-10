# 기술 스택

최종 갱신: 2026-10-07

## 확정

| 항목 | 선택 | 근거 |
|---|---|---|
| 확장 프로그램 규격 | Chrome Extension Manifest V3 | Chrome 웹 스토어 현행 규격 |
| 프레임워크 | **WXT** | 빌드·멀티 브라우저(Edge·웨일)·ZIP·배포 자동화, 프레임워크 무관, 활발한 유지보수 — [01 보고서](../reports/01_extension_architecture.md) 5장 |
| 언어 | **TypeScript** | 이력서 스키마·메시지 규격을 타입으로 관리, 위젯 전략 모듈 다수 → 규모 확대 대비 |
| 저장소 | `chrome.storage.local` (WXT `storage.defineItem`) | 10MB, 로컬 저장 원칙. `version`·`migrations`로 스키마 변경 대응 — [WXT Storage](https://wxt.dev/storage.html) |
| 테스트(E2E) | Playwright | unpacked 확장 로드 지원 — [01 보고서](../reports/01_extension_architecture.md) 7장 |
| UI 라이브러리 | **React** | 생태계 최대, 반복 항목 폼 구현에 유리, WXT 공식 템플릿 제공 |

## 권장 (도입 시 확정)

| 항목 | 권장 | 근거 |
|---|---|---|
| 메시징 | `@webext-core/messaging` | WXT 문서 추천 목록 중 가장 가벼운 타입 안전 래퍼 — [WXT Messaging](https://wxt.dev/guide/essentials/messaging.html) |
| 단위 테스트 | Vitest | WXT가 Vite 기반 → 설정 공유 |
| 페이지 내 UI 격리 | WXT `createShadowRootUi` | 하이라이트·안내 UI가 사이트 CSS와 충돌하지 않도록 Shadow Root로 격리 (unlisted script인 filler는 `ContentScriptContext`가 없어 네이티브 `attachShadow` 사용) |

## 미결

| 항목 | 후보 | 비고 |
|---|---|---|
| BYOK 지원 LLM 제공자 | 미정 | 제공자별 호출부만 분리한 공통 인터페이스로 설계 ([architecture.md](architecture.md)) |

## 대상 브라우저
- 1순위: Chrome
- 2순위: Edge, 네이버 웨일 (Chromium 기반, 동일 빌드 사용)
