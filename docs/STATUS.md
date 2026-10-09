# STATUS

최종 갱신: 2026-10-09

## 현재 단계
**MVP 구현 중**

## 완료
- 레퍼런스 조사 보고서 작성 ([docs/reports](reports/README.md))
  - 확장 프로그램 구조, 필드 매핑 방식, 유사 앱, 대상 사이트·데이터 모델, 개인정보·정책, 범용 위젯 처리 전략
- 링크드인 이용약관 확인 ([05 보고서](reports/05_privacy_and_policy.md) 4.1)
- 기술 스택 문서 작성 ([design/tech_stack.md](design/tech_stack.md))
- 구조·메시지 흐름 설계 v1 작성 ([design/architecture.md](design/architecture.md))
- 화면 설계·와이어프레임 목업 작성 ([design/screens.md](design/screens.md), 팝업·사이드 패널·옵션·동의 모달)
- 이력서 데이터 스키마 v1 작성 ([design/resume_schema_v1.md](design/resume_schema_v1.md))
- 프로젝트 초기 설정: WXT 0.21 + TypeScript + React 19, 빈 엔트리포인트(background·filler·popup·options·sidepanel), 스키마 타입(`src/core/schema/resume.ts`), 저장소 항목(`src/storage/items.ts`). 타입 검사·빌드 통과
- 옵션 화면 이력서 입력·저장: 섹션 8개(기본 정보~희망 조건), 반복 항목 추가·삭제·순서 변경, 500ms 디바운스 자동 저장, 빈 값 키 생략. 타입 검사·빌드 통과, 브라우저 동작 확인 전
- 자동 입력 최소 수직 슬라이스: 팝업 '작성' → filler 주입 → text·textarea 수집 → autocomplete·키워드 사전 매핑(basics 단일 값 10개 키) → 입력 → 팝업에 개수 표시. 제외 사이트(linkedin.com) 차단. `@webext-core/messaging`·Vitest 도입, 매핑 단위 테스트 8개·타입 검사·빌드 통과, fixture(basics.html) 브라우저 확인 완료
- 사이드 패널 입력 결과 표시: '작성' 클릭 시 사이드 패널 자동 열림, 입력란별 입력 완료·확인 필요(사유)·해당 없음 목록, 확인 필요 항목·이력서 basics 항목 '복사'. 결과는 `session:fillReport` 저장 → 사이드 패널 `watch`. 단위 테스트 11개·타입 검사·빌드 통과
- 사이드 패널 직접 입력·이동·되돌리기: 확인 필요·해당 없음 입력란에 이력서 항목 선택 후 '입력'(`fillOne`), '이동'(`focusField`, 스크롤·포커스), '되돌리기'(`undo`, 요소별 최초 값 복원 후 결과 초기화). 대상 탭은 `fillReport.tabId`. 단위 테스트 13개·E2E 2개·타입 검사·빌드 통과
- 형식 변환(`core/format`): 생년월일(`YYYY-MM-DD` → `YYYY.MM.DD`·`YYYYMMDD`·`YYMMDD` 등)·전화번호(숫자만/하이픈)를 입력란 placeholder·maxLength 신호로 변환, 신호 없으면 저장값 그대로. `input[type=date]` 수집. 자동 입력·사이드 패널 직접 입력·복사에 공통 적용(`resolveValue`, `ReportField.hint`). 단위 테스트 26개·E2E 3개·타입 검사·빌드 통과
- Playwright E2E 환경: `npm run test:e2e` (e2e 모드 빌드 → 확장 프로그램 로드한 Chromium). 툴바 클릭(activeTab) 재현 불가 → e2e 빌드에만 `http://localhost/*` 호스트 권한, fixture는 route 응답. 검증 시나리오: '작성' → 사이드 패널 열림(`runtime.getContexts`), fixture 입력값, 사이드 패널 결과·복사(붙여넣기 확인), 재실행 시 갱신 — 통과

## 결정 사항
| 항목 | 결정 | 근거 |
|---|---|---|
| 지향점 | 범용 확장 프로그램 (사이트별 어댑터는 예외 보정용) | 기업별 채용 페이지까지 커버 필요 |
| 매핑 방식 | 저장된 사용자 규칙 → 규칙/사전 기반 → (선택) BYOK LLM | 비용·개인정보 부담 최소화 |
| LLM | 원하는 사용자에 한해 본인 API 키 입력(BYOK) | Chrome 내장 AI(Gemini Nano) 한국어 미지원 |
| LLM 전송 범위 | 이력서 값 미전송, 스키마 키·필드 정보만 전송 | 개인정보 최소 전송 |
| 데이터 저장 | 로컬 저장, 개발자 서버 미사용 | 개인정보 처리 부담 최소화 |
| 제출 | 자동 제출 없음, 입력까지만 수행 | 오입력 방지, 사이트 약관 리스크 완화 |
| 기술 스택 | WXT + TypeScript + React | 빌드·멀티 브라우저·배포 자동화, 스키마·메시지 타입 관리, 폼 위주 화면 |
| 검증 사이트 | 사람인, 잡코리아, 링크드인 | 사용자 선정 (링크드인은 아래 미결 사항 참고) |

## 미결 사항
- 링크드인 처리: 이용약관상 확장 프로그램의 활동 자동화·화면 변경 금지 → 자동 입력 대상 제외 여부, DOM 현장 조사 진행 여부
- BYOK 지원 LLM 제공자 범위

## 다음 작업
- 옵션 화면 브라우저 동작 확인 (사용자 수동, `tests/e2e/fixtures/basics.html`)
- 사이드 패널 후속: 직접 입력 결과 학습 규칙 저장, 입력 항목 하이라이트
- 매핑 확장: 학력·경력 등 섹션 문맥 (연월 `YYYY-MM` 형식 변환 포함)
- 사람인·잡코리아 DOM 현장 조사 (사용자 로그인 필요)
- 필드 키워드·옵션 동의어 사전 v1

## 이슈·리스크
- 국내 사이트의 WAI-ARIA 준수율 미확인 → 범용 전략 효과 불확실
- 스크립트 이벤트(`isTrusted=false`)를 무시하는 위젯은 자동 입력 불가 → 사용자 직접 선택으로 대체
- 링크드인: 확장 프로그램 사용 시 계정 제한·정지 위험 명시
- 사람인·잡코리아 이용약관상 자동화 도구 제한 여부 미확인
