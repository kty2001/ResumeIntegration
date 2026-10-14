# TODO

## 조사
- [x] 확장 프로그램 구조·유사 앱 레퍼런스 조사 → [reports](reports/README.md)
- [x] 범용 드롭다운·날짜 선택기 처리 전략 정리 → [06](reports/06_generic_widget_strategy.md)
- [x] 검증용 사이트 선정: 사람인, 잡코리아, 링크드인 (링크드인은 약관 문제로 재결정 필요)
- [x] 선정 사이트 이력서 작성 페이지 DOM 현장 조사 → [07](reports/07_site_dom_survey.md) (사람인 기본 select·`label[for]`, 잡코리아 ARIA 미준수 커스텀 드롭다운, 달력 탐색 불필요)
- [x] 미확인 항목 재조사: 작성형 이력서 수정·열람 페이지, 사람인 섹션 저장 후 '추가', `isTrusted` 거부 여부 → [07](reports/07_site_dom_survey.md) 6장 (스크립트 이벤트 허용, 사람인 저장 후 '추가', 열람 페이지 범용 추출 부적합)
- [x] 링크드인 이용약관 확인 → [05](reports/05_privacy_and_policy.md) 4.1 (확장 프로그램 명시적 금지)
- [x] 사람인·잡코리아 이용약관의 자동화 도구 제한 여부 확인 → [05](reports/05_privacy_and_policy.md) 4.2 (명시 금지 없음, 자동 입력 대상 유지)

## 결정
- [x] 기술 스택: WXT + TypeScript + React → [tech_stack](design/tech_stack.md)
- [ ] 링크드인 지원 범위 (현재 자동 입력 제외, 복사 전용 모드 여부) 및 DOM 조사 진행 여부
- [ ] BYOK 지원 LLM 제공자 범위

## 설계 (`docs/design/`)
- [x] 이력서 데이터 스키마 v1 → [resume_schema_v1](design/resume_schema_v1.md) (사이트별 선택지 대응은 DOM 조사 후 보완)
- [x] 필드 키워드·옵션 동의어 사전 v1 (한/영) → [dictionary_v1](design/dictionary_v1.md)
- [x] 확장 프로그램 구조·메시지 흐름 설계 → [architecture](design/architecture.md)
- [x] 화면 설계·와이어프레임 → [screens](design/screens.md), [mockups](design/mockups/)
- [x] 스타일 가이드(색·글꼴·컴포넌트·다크 모드) → [style_guide](design/style_guide.md), [견본](design/mockups/style.html)
- [x] 이력서 가져오기·연동 사이트 일괄 열기 설계 → [architecture](design/architecture.md) 7.4·7.5, [screens](design/screens.md) 2·4장

## 구현 (MVP)
- [x] 프로젝트 초기 설정 (WXT + TypeScript + React, manifest 권한, 엔트리포인트, 스키마 타입, 저장소 정의)
- [x] 옵션 화면: 이력서 섹션 8개, 자기소개서, 첨부 파일, 설정(제외 사이트·민감정보), 학습 규칙, 백업
- [x] 입력란 수집: 최상위·같은 출처 iframe, 섹션 텍스트, 교차 출처 iframe 권한 요청
- [x] 규칙/사전 기반 매핑: autocomplete + 키워드 사전 + 섹션 문맥 + enum 동의어 + boolean(checkbox)
- [x] 형식 변환: 날짜·전화번호, 분리 입력, 입력 마스크
- [x] 위젯: text·textarea·date·select·radio·checkbox(단일·그룹)·ARIA 콤보박스(선택 전용·검색형)·파일·달력 팝업형(readonly 값 직접 설정)
- [x] 위젯 후속: ARIA 미준수 커스텀 드롭다운(버튼 + 숨은 목록 + 숨은 input, 잡코리아형 fixture `custom-dropdown.html`) — 달력 탐색 클릭은 불필요로 결정 ([07](reports/07_site_dom_survey.md) 4장)
- [x] 잡코리아 실제 확인: 성별 드롭다운 작성·가져오기 동작, 스크립트 이벤트 허용 ([07](reports/07_site_dom_survey.md) 3.3)
- [x] 커스텀 드롭다운 후속 결정: 숨은 input 없는 선택 UI(잡코리아 학교구분), 목록 안 checkbox 다중 선택형(고용형태) → 보류
- [x] 조사 후속 보완: fingerprint id 숫자 접미사 정규화, select 안내 선택지 라벨, '전화번호'·'휴대폰' 구분, 사전 '대학구분', 사이드 패널 저장 안내 (빈 `label for` textarea는 실제 확인 후)
- [ ] 재조사 후속 ([07](reports/07_site_dom_survey.md) 6.3): 폼을 다시 그리는 select 후 재수집, 같은 블록 중복 키 배정(학력구분·대학구분), ARIA 없는 검색형 자동완성(학교명·전공명), 숨은 input이 목록 안에 있는 커스텀 드롭다운, 자유형 자기소개서(제목 + 내용), 사람인 상세주소 매핑 제외, 안내 문구(사람인 '수정하기' 후 가져오기·섹션 저장 후 '추가')
- [x] 사이드 패널: 결과 목록, 직접 입력·선택·복사, 이동, 위치 보기, 되돌리기, 건너뛰기, 다시 작성
- [x] 사용자 수정 결과 학습: 직접 입력·선택지 선택·페이지에서 직접 고친 값
- [x] 사이드 패널 복사 전용 모드 (제외 사이트용, [screens](design/screens.md) 3장 ②)
- [x] 최초 실행 동의 모달 ([screens](design/screens.md) 5장 ①, 개인정보처리방침 링크는 방침 작성 시 추가)
- [x] 스타일 가이드 적용 (옵션·팝업·사이드 패널, [style_guide](design/style_guide.md) 8장)

## 구현 (후속)
- [ ] BYOK LLM 매핑 보조 + 옵션 설정(제공자·API 키) + LLM 첫 사용 동의 모달([screens](design/screens.md) 5장 ②)
- [x] 자기소개서 문항 매칭·글자수 검사 (사이드 패널 '자기소개서 추천')
- [x] 반복 항목 '추가' 버튼 클릭으로 입력 블록 늘리기 ([architecture](design/architecture.md) 7.1)
- [x] 파일 업로드 (구분별 첨부 파일 → 파일 입력란)
- [x] JSON 내보내기/가져오기

## 구현 (가져오기·연동 사이트)
### 이력서 가져오기 ([architecture](design/architecture.md) 7.4)
- [x] 메시지 `startImport`·`readValues`, filler 입력란 값 읽기 (위젯별 `readValue` 재사용, 파일 제외)
- [x] 매핑: 이력서 값 없이 스키마 키만 결정 (`assignKeys`, 자동 입력과 공용)
- [x] 역변환 `core/import.ts`: 날짜·연월·전화번호·분리 입력 합치기·숫자·배열·선택지 텍스트 → enum 코드·checkbox
- [x] 반복 항목 같은 항목 판별(대표 항목) → 갱신·추가, 서술형 입력란 → 자기소개서 후보
- [x] `session:importDraft` + 옵션 '가져오기' 미리 보기(항목별 선택·반영·취소)
- [x] 팝업 '이 페이지에서 가져오기' (이력서 미입력 상태 포함)
- [x] 최초 실행 동의 문구에 가져오기 안내 추가 + `CONSENT_VERSION` 2 ([screens](design/screens.md) 5장 ①)
- [ ] 열람 페이지 가져오기: 재조사 결과 반복 항목은 두 사이트 모두 라벨 없음 → 범용 `readPairs`로 핵심 항목 추출 불가, 사이트별 어댑터 필요 ([07](reports/07_site_dom_survey.md) 6.3). 수정 폼 가져오기 보완 후 필요성 재판단

### 연동 사이트 일괄 열기 ([architecture](design/architecture.md) 7.5)
- [x] `local:linkedSites` 저장 + 백업 내보내기·가져오기·전체 삭제 포함
- [x] 옵션 '연동 사이트' 메뉴: 추가·삭제·순서 변경, 제외 사이트 안내
- [x] '모두 열기'(팝업·옵션, `windows.create`)
- [x] `startFill` 성공 시 `lastFilledAt` 기록, '갱신 필요' 표시
- [x] 기본 추천 URL: 사람인·잡코리아 이력서 관리 페이지, 옵션 '연동 사이트'에 미등록 추천만 '추가' 버튼 ([07](reports/07_site_dom_survey.md) 4장)

### 테스트
- [x] 단위: 역변환·같은 항목 판별·갱신 필요 판정
- [x] E2E: 값이 채워진 fixture에서 가져오기 → 미리 보기 반영, 연동 사이트 화면·작성 시각 기록
- [x] 실사용 검증: Playwright(동의 모달·가져오기·왕복·연동 사이트·백업·라이트/다크 화면, 화면 외 시나리오는 E2E에 추가) + 실제 Chrome(툴바 가져오기 → 미리 보기 탭, 제외 사이트 안내, 모두 열기·작성 후 '최신'·팝업 개수) → 왕복 날짜 정밀도 차이 수정

## 테스트
- [x] 위젯 종류별 로컬 HTML fixture (`tests/e2e/fixtures/`, 22종)
- [x] Playwright E2E 테스트 환경 (`npm run test:e2e`)
- [ ] 실제 채용 사이트 검증 (사람인·잡코리아)

## 배포
- [ ] 개인정보처리방침 작성 (작성 후 동의 모달에 링크 추가)
- [ ] Chrome 웹 스토어 등록 (웨일 스토어 동시 등록 검토)
