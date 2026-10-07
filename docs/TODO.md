# TODO

## 조사
- [x] 확장 프로그램 구조·유사 앱 레퍼런스 조사 → [reports](reports/README.md)
- [x] 범용 드롭다운·날짜 선택기 처리 전략 정리 → [06](reports/06_generic_widget_strategy.md)
- [x] 검증용 사이트 선정: 사람인, 잡코리아, 링크드인 (링크드인은 약관 문제로 재결정 필요)
- [ ] 선정 사이트 이력서 작성 페이지 DOM 현장 조사 (React 여부, 위젯 종류, ARIA 준수 여부, iframe 여부) — 사용자 로그인 필요
- [x] 링크드인 이용약관 확인 → [05](reports/05_privacy_and_policy.md) 4.1 (확장 프로그램 명시적 금지)
- [ ] 사람인·잡코리아 이용약관의 자동화 도구 제한 여부 확인

## 결정
- [x] 기술 스택: WXT + TypeScript → [tech_stack](design/tech_stack.md)
- [x] UI 라이브러리: React → [tech_stack](design/tech_stack.md)
- [ ] 링크드인 지원 범위 (자동 입력 제외, 복사 전용 모드 여부) 및 DOM 조사 진행 여부
- [ ] BYOK 지원 LLM 제공자 범위

## 설계 (`docs/design/`)
- [x] 이력서 데이터 스키마 v1 → [resume_schema_v1](design/resume_schema_v1.md) (사이트별 선택지 대응은 DOM 조사 후 보완)
- [ ] 필드 키워드·옵션 동의어 사전 v1 (한/영)
- [x] 확장 프로그램 구조·메시지 흐름 설계 → [architecture](design/architecture.md)
- [x] 화면 설계·와이어프레임 → [screens](design/screens.md), [mockups](design/mockups/)

## 구현 (MVP)
- [x] 프로젝트 초기 설정 (WXT + TypeScript + React, manifest 권한, 엔트리포인트 뼈대, 스키마 타입, 저장소 정의)
- [ ] 이력서 데이터 입력·저장 화면
- [ ] 입력란 수집 (content script)
- [ ] 규칙/사전 기반 매핑
- [ ] 텍스트 입력란 자동 입력 (React 제어 컴포넌트 대응 포함)
- [ ] 드롭다운·날짜 선택기 범용 처리
- [ ] 입력 결과 하이라이트, 되돌리기
- [ ] 사이드 패널: 미입력 항목 직접 선택·복사
- [ ] 사용자 수정 결과 학습 (사이트별 규칙 저장)

## 구현 (후속)
- [ ] BYOK LLM 매핑 보조
- [ ] 자기소개서 문항 매칭·글자수 검사
- [ ] 반복 항목(경력·학력 추가) 처리
- [ ] 파일 업로드 (이력서 PDF)
- [ ] JSON 내보내기/가져오기

## 테스트
- [ ] 위젯 종류별 로컬 HTML fixture 작성
- [ ] Playwright E2E 테스트 환경 구성

## 배포
- [ ] 개인정보처리방침 작성
- [ ] Chrome 웹 스토어 등록 (웨일 스토어 동시 등록 검토)
