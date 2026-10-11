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
- [ ] 동의 모달 (최초 실행·LLM 첫 사용, [screens](design/screens.md) 5장)
- [x] 스타일 가이드 적용 (옵션·팝업·사이드 패널, [style_guide](design/style_guide.md) 8장)

## 구현 (후속)
- [ ] BYOK LLM 매핑 보조 + 옵션 설정(제공자·API 키)
- [x] 자기소개서 문항 매칭·글자수 검사 (사이드 패널 '자기소개서 추천')
- [ ] 반복 항목 '추가' 버튼 클릭으로 입력 블록 늘리기 (현재는 페이지에 있는 블록만 순서대로 입력)
- [x] 파일 업로드 (구분별 첨부 파일 → 파일 입력란)
- [x] JSON 내보내기/가져오기

## 테스트
- [x] 위젯 종류별 로컬 HTML fixture (`tests/e2e/fixtures/`, 18종)
- [x] Playwright E2E 테스트 환경 (`npm run test:e2e`)
- [ ] 실제 채용 사이트 검증 (사람인·잡코리아)

## 배포
- [ ] 개인정보처리방침 작성
- [ ] Chrome 웹 스토어 등록 (웨일 스토어 동시 등록 검토)
