# TODO

## 조사
- [x] 확장 프로그램 구조·유사 앱 레퍼런스 조사 → [reports](reports/README.md)
- [x] 범용 드롭다운·날짜 선택기 처리 전략 정리 → [06](reports/06_generic_widget_strategy.md)
- [x] 검증용 사이트 선정: 사람인, 잡코리아, 링크드인 (링크드인은 약관 문제로 재결정 필요)
- [ ] 선정 사이트 이력서 작성 페이지 DOM 현장 조사 (React 여부, 위젯 종류, ARIA 준수 여부, iframe 여부) — 사용자 로그인 필요
- [x] 링크드인 이용약관 확인 → [05](reports/05_privacy_and_policy.md) 4.1 (확장 프로그램 명시적 금지)
- [ ] 사람인·잡코리아 이용약관의 자동화 도구 제한 여부 확인

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
- [ ] 위젯 후속: ARIA 미준수 커스텀 위젯, 달력 탐색 클릭 (DOM 조사 후 범위 결정)
- [x] 사이드 패널: 결과 목록, 직접 입력·선택·복사, 이동, 위치 보기, 되돌리기, 건너뛰기, 다시 작성
- [x] 사용자 수정 결과 학습: 직접 입력·선택지 선택·페이지에서 직접 고친 값
- [x] 사이드 패널 복사 전용 모드 (제외 사이트용, [screens](design/screens.md) 3장 ②)
- [x] 최초 실행 동의 모달 ([screens](design/screens.md) 5장 ①, 개인정보처리방침 링크는 방침 작성 시 추가)
- [x] 스타일 가이드 적용 (옵션·팝업·사이드 패널, [style_guide](design/style_guide.md) 8장)

## 구현 (후속)
- [ ] BYOK LLM 매핑 보조 + 옵션 설정(제공자·API 키) + LLM 첫 사용 동의 모달([screens](design/screens.md) 5장 ②)
- [x] 자기소개서 문항 매칭·글자수 검사 (사이드 패널 '자기소개서 추천')
- [ ] 반복 항목 '추가' 버튼 클릭으로 입력 블록 늘리기 (현재는 페이지에 있는 블록만 순서대로 입력)
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
- [ ] 열람 페이지 가져오기: 범용 라벨-값 추출(`readPairs`) → 범용 처리 불가 사이트만 사이트별 어댑터 (DOM 조사 후 범위 결정)

### 연동 사이트 일괄 열기 ([architecture](design/architecture.md) 7.5)
- [x] `local:linkedSites` 저장 + 백업 내보내기·가져오기·전체 삭제 포함
- [x] 옵션 '연동 사이트' 메뉴: 추가·삭제·순서 변경, 제외 사이트 안내
- [x] '모두 열기'(팝업·옵션, `windows.create`)
- [x] `startFill` 성공 시 `lastFilledAt` 기록, '갱신 필요' 표시
- [ ] 기본 추천 URL (DOM 현장 조사 후)

### 테스트
- [x] 단위: 역변환·같은 항목 판별·갱신 필요 판정
- [x] E2E: 값이 채워진 fixture에서 가져오기 → 미리 보기 반영, 연동 사이트 화면·작성 시각 기록
- [ ] 실사용 검증 (Claude in Chrome, 사용자 조작 필요: 확장 프로그램 로드·팝업 버튼 클릭)
  - 준비: `npm run build` → `.output/chrome-mv3` 로드, `python -m http.server 8000 --directory tests/e2e/fixtures`
  - 가져오기(`import.html`): 동의 모달 가져오기 안내 / 빈 이력서 → 미리 보기 전 항목 선택·학력 2개 추가·자기소개서 후보·비밀번호 미수집 → 반영 값(생년월일·휴대폰·성별·학력) / 기존 이력서 → 다른 값 미선택·같은 학교 갱신·같은 자기소개서 제외 / 취소 시 draft 삭제 / 입력란 없는 페이지 'empty'·제외 사이트 안내
  - 왕복: `formats`·`masks`·`sections` fixture '작성' → '가져오기' → 변경 항목 없음
  - 연동 사이트: 추가·삭제·순서 변경·제외 사이트 안내 / 모두 열기(옵션·팝업) 새 창 / '작성' 후 작성 시각 기록·'갱신 필요' 해제 → 이력서 수정 시 '갱신 필요'(팝업 개수) / 백업 내보내기·가져오기·전체 삭제 포함
  - 화면: 가져오기·연동 사이트 화면, 팝업 신규 버튼 라이트/다크 모드

## 테스트
- [x] 위젯 종류별 로컬 HTML fixture (`tests/e2e/fixtures/`, 19종)
- [x] Playwright E2E 테스트 환경 (`npm run test:e2e`)
- [ ] 실제 채용 사이트 검증 (사람인·잡코리아)

## 배포
- [ ] 개인정보처리방침 작성 (작성 후 동의 모달에 링크 추가)
- [ ] Chrome 웹 스토어 등록 (웨일 스토어 동시 등록 검토)
