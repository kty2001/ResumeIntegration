# 레퍼런스 조사 보고서 (2026-10-07)

이력서 통합 작성 크롬 확장 프로그램 구현 전 사전 조사 결과

## 보고서 목록

| 파일 | 내용 |
|---|---|
| [01_extension_architecture.md](01_extension_architecture.md) | MV3 구조, 권한(activeTab·storage·scripting), 동작 흐름, 폼 입력 기술 이슈, 빌드 도구, 테스트, 디렉터리 구조 초안 |
| [02_field_mapping.md](02_field_mapping.md) | autocomplete 표준, Chromium·Firefox 휴리스틱, Bitwarden 파이프라인, 매핑 방식 비교, BYOK LLM 설계, 자기소개서 문항 매칭 |
| [03_similar_apps.md](03_similar_apps.md) | 해외 상용 확장, 오픈소스, 국내 유사 확장, 차별화 포인트 |
| [04_target_sites_and_data_model.md](04_target_sites_and_data_model.md) | 국내 플랫폼·ATS 분류, JSON Resume, 국내 특화 필드 |
| [05_privacy_and_policy.md](05_privacy_and_policy.md) | Chrome Web Store 정책, 개인정보보호법, 로컬 암호화, BYOK 키·전송 관리, 약관 이슈 |
| [06_generic_widget_strategy.md](06_generic_widget_strategy.md) | 범용 입력 전략: 판별→시도→검증→대체, 드롭다운·날짜 선택기 처리, `isTrusted` 한계 |

## 결정 사항

| 항목 | 결정 |
|---|---|
| 지향점 | 특정 사이트 전용이 아닌 **범용 확장 프로그램**. 사이트별 어댑터는 예외 보정용 |
| LLM | Chrome 내장 AI는 한국어 미지원으로 제외. **원하는 사용자에 한해 본인 API 키 입력(BYOK)** 방식으로 사용, 키 미입력 시 규칙 기반만으로 동작 |

## 핵심 요약

1. **구조**: Options(데이터 입력) + Popup('작성' 버튼) + Service Worker(주입) + Content Script(수집·입력)의 MV3 표준 구조로 충분. `activeTab` + `scripting`으로 설치 경고 없는 최소 권한 구성 가능
2. **기술 난점**: React 제어 input(native setter + 이벤트), 커스텀 드롭다운·날짜 선택기, 경력·학력 반복 항목, 교차 출처 iframe(activeTab 미적용), 사이드 패널 버튼은 activeTab 미부여
3. **매핑**: 저장된 사용자 규칙 → 규칙/사전 기반 → (선택) BYOK LLM 순서. LLM에는 이력서 값이 아닌 스키마 키·필드 정보만 전송. Chromium 자동완성 정규식에 한국어 패턴 존재 → 초기 사전 참고 가능
4. **범용 위젯 처리**: WAI-ARIA 콤보박스·달력 패턴 기준 처리로 UI 라이브러리 단위 커버, 입력 후 검증 실패 시 다음 전략, 최종 실패 시 사용자 직접 선택 결과를 학습
5. **시장**: 해외는 Simplify·Jobright 등 성숙(100+ ATS). 국내는 원티드 공식 확장 포함 여러 시도 있으나 모두 소규모, 지배적 제품 부재
6. **데이터 모델**: JSON Resume 골격 + 병역·학점 만점 기준·어학·자격증·자기소개서 문항 라이브러리 등 국내 특화 필드 확장
7. **정책**: 로컬 저장이라도 개인정보처리방침 필요. 장애·보훈 정보는 민감정보(LLM 전송 제외). 자동 제출 없이 '입력까지만' 원칙

## 시사점 및 다음 단계 제안

- [ ] 검증용 사이트 2~3곳 선정 (예: 사람인 + 원티드 + 그리팅) — 범용 전략의 실제 동작 확인용
- [ ] 선정 사이트 이력서 작성 페이지 DOM 현장 조사 (React 여부, 위젯 종류, ARIA 준수 여부, iframe 여부)
- [ ] 위젯 종류별 로컬 HTML fixture 작성 (기본 select, ARIA 콤보박스, 검색형, 포털 팝업, 마스크 입력, 달력 팝업)
- [ ] 기술 스택 결정: Vanilla JS(빠른 프로토타입) vs WXT(확장성)
- [ ] 이력서 데이터 스키마 v1 정의 (JSON Resume 기반)
- [ ] 필드 키워드·옵션 동의어 사전 v1 작성 (한/영)
- [ ] BYOK 지원 LLM 제공자 범위 결정
- [ ] 대상 사이트 이용약관 확인
