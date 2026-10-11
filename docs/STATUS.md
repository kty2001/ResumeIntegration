# STATUS

최종 갱신: 2026-10-11

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
- 학습 규칙: 사이드 패널 직접 입력 성공 시 `origin + fingerprint → schemaKey` 규칙을 `local:learnedRules`에 저장(같은 입력란은 교체), 다음 '작성'에서 autocomplete·사전보다 우선 적용, 사이드 패널에 '(학습)' 표시. fingerprint는 widget·name·id·표시 텍스트 조합(`core/mapping/learned.ts`). 단위 테스트 32개·E2E 4개·타입 검사·빌드 통과
- 옵션 화면 학습 규칙 조회·삭제: '학습 규칙' 섹션에 사이트·입력란(fingerprint 표시 텍스트 → name → id)·이력서 항목·수정일 표, '삭제' 시 `local:learnedRules`에서 제거(`removeRule`). 단위 테스트 34개·E2E 4개(학습 규칙 시나리오에 조회·삭제 추가)·타입 검사·빌드 통과
- 입력 항목 하이라이트: 사이드 패널 '입력 항목 위치 보기' 토글 → `highlight` 메시지(sidepanel → background → filler) → 페이지에 상태별 색 테두리(초록 입력 완료·주황 확인 필요·회색 해당 없음). `dom/highlight.ts`가 Shadow Root 안 `position: fixed` 박스로 표시(페이지 요소 스타일 미변경, scroll·resize 시 재배치), `fillOne` 후 색 갱신, `collect`·`undo` 시 해제. 단위 테스트 34개·E2E 4개(직접 입력 시나리오에 위치 표시 추가)·타입 검사·빌드 통과
- 섹션 문맥 매핑(학력·경력): 수집 시 입력란별 섹션 텍스트(가장 가까운 fieldset legend → 직전 h1~h6) 추가, 입력란 텍스트 → 섹션 텍스트 순으로 섹션 판별(두 섹션이 함께 걸리면 보류). 섹션 판별 시 해당 섹션 규칙만 적용(섹션 안 '주소' 등 basics 오입력 방지). 규칙 키는 `education.*.school.ko` 형식, 페이지 등장 순서대로 인덱스 부여 → 반복 블록 지원. 대상: 학교명·전공·부/복수전공·입학/졸업 연월·학점, 회사명·부서·직급·직책·직무·입사/퇴사 연월·연봉·퇴사 사유·담당 업무 (enum 항목 제외). 연월 `YYYY-MM` → placeholder·maxLength 6 신호로 변환(`formatYearMonth`). 사이드 패널·옵션 표시명 '학력 1 학교명' 형식(`schemaKeyLabel`·`schemaKeyOptions`). 페이지 안 중복 fingerprint는 학습 제외. 단위 테스트 45개·E2E 5개(`sections.html`)·타입 검사·빌드 통과
- 섹션 문맥 매핑 확장: 자격증(자격증명·발행 기관·취득일·번호)·어학(시험명·점수·등급·응시일·만료일·수험 번호)·수상(수상명·수여 기관·수상일·내용)·활동(활동명·기관·시작/종료 연월·내용)·프로젝트(프로젝트명·기관·시작/종료 연월·URL·내용). 섹션 목록은 `labels.ts`의 `SECTION_LABELS` 한 곳에서 관리(`SectionKey`). '수상경력'·'활동 경력' 제목은 경력 섹션으로 보지 않음. 연월/연월일 값(`PartialDate`)은 `formatPartialDate`로 변환(연월일 값을 연월 입력란에 넣으면 연월만). 단위 테스트 50개·E2E 5개(`sections.html`에 자격증·어학 추가)·타입 검사·빌드 통과
- 키워드·옵션 동의어 사전 v1 + 기본 `<select>`: 설계 문서([design/dictionary_v1.md](design/dictionary_v1.md)). `<select>` 수집(선택지 text·value, 안내·비활성 옵션 제외)·입력(네이티브 setter + input·change, 되돌리기 포함). enum 항목 매핑 추가(성별, 학력 구분·졸업 상태·소재지, 고용 형태, 어학 언어, 활동 구분, 병역 구분·군별·계급·입대/전역 연월·전역 구분). 옵션 동의어 사전(`core/mapping/options.ts`, resume_schema 5장 초안 이관): 표시명·동의어·코드 순 정규화 일치 → 단일 옵션 포함 매칭, 실패 시 '해당 없음'. 텍스트 입력란의 enum 값은 표시명 입력, 사이드 패널 복사도 표시명. 단위 테스트 60개·E2E 5개(`sections.html`에 select·병역 추가)·타입 검사·빌드 통과
- 선택지 불일치 처리: select 매칭 실패 시 '해당 없음' 대신 '확인 필요 · 맞는 선택지 없음'(`FillPlan.skipped` → reason `no-option`, 팝업 '입력 실패'에 포함). 사이드 패널에 저장 값 표시명 + 사이트 선택지 목록 + '선택'(`fillOne` `optionValue`). 성공 시 학습 규칙에 `option: { value: 이력서 원래 값, text: 선택지 텍스트 }` 저장 → 다음 '작성'에서 이력서 값이 같으면 사전 매칭보다 우선. 옵션 화면 학습 규칙 표에 '선택지' 열. 단위 테스트 62개·E2E 6개(`options.html`)·타입 검사·빌드 통과
- 사이드 패널 '다시 작성'·'건너뛰기': '다시 작성'은 `fillReport.tabId`로 `startFill` 재실행 + 결과 문구 표시(팝업과 같은 `describeStartFill`). 주입 실패 시 기존 결과 유지 + '툴바 아이콘의 작성으로 다시 실행' 안내. '건너뛰기'는 확인 필요 → 해당 없음(`skipField`, `session:fillReport`만 변경). 단위 테스트 63개·E2E 7개·타입 검사·빌드 통과
- 백업(JSON 내보내기/가져오기·전체 삭제): 옵션 화면 '백업' 메뉴. 백업 파일 `{ app, backupVersion, exportedAt, resume, coverLetters, learnedRules }`(입력 결과·API 키 제외, `core/backup.ts`). 가져오기는 형식·앱·스키마 버전 검증 + 누락 필드 보완 → 미리 보기 → '덮어쓰기'. 전체 삭제는 '정말 삭제' 확인 단계. 옵션 편집 화면이 저장소 변경을 `watch`로 반영(대기 중 저장 없을 때). 팝업 이력서 없음 상태 'JSON 가져오기' → `options.html#backup`. E2E 공용 설정 `tests/e2e/extension.ts`로 분리. 단위 테스트 69개·E2E 10개(`options.spec.ts` 3개 추가)·타입 검사·빌드 통과
- radio 그룹: 같은 form·name의 radio를 입력란 1개(`widget: 'radio'`, 선택지 = 각 radio value·label)로 수집 → select와 같은 옵션 동의어 매칭·선택지 불일치('확인 필요')·사이드 패널 '선택'·학습 적용. 그룹 표시 텍스트는 `role=radiogroup` aria 이름 → 그룹 전용 fieldset legend(이 경우 섹션은 바깥 문맥). native radio를 숨기고 label만 보이는 커스텀 디자인도 수집. 입력은 대상 radio `click()`, 되돌리기는 기존 선택 복원(없으면 해제), 위치 표시는 그룹 radio·label 전체 테두리. 단위 테스트 70개·E2E 11개(`radios.html`)·타입 검사·빌드 통과
- 단일 checkbox: checkbox를 개별 입력란(`widget: 'checkbox'`, 값 `'true'`/`'false'`)으로 수집, boolean 키 규칙(`FieldRule.checkbox`)만 매칭 — 재직 중(`work.*.current`)·편입(`education.*.transfer`). 민감정보(보훈·장애·취업보호 대상)는 자동 입력 제외. 이력서 값 false면 체크 해제, 값 없으면 해당 없음. 입력은 상태가 다를 때만 `click()`, 되돌리기는 기존 체크 상태 복원, 숨긴 native checkbox(label만 표시) 수집·위치 표시. 사이드 패널 checkbox 행의 이력서 항목 목록은 boolean 항목만. 단위 테스트 72개·E2E 12개(`checkboxes.html`)·타입 검사·빌드 통과
- 희망 조건 매핑: '희망' 섹션 판별 + 희망 연봉·연봉 회사 내규(checkbox)·고용 형태·근무지·직무·입사 가능일(연월일 형식 변환)·입사 가능일 메모 규칙. 배열 값은 텍스트 입력란에 ', ' 결합(고용 형태는 표시명), select·radio는 원소 순서대로 첫 일치 선택지(동의어 사전은 경력 고용 형태와 공유). '회사 내규'는 경력 섹션으로 판별하지 않음. 사이드 패널 선택·복사 목록에 희망 조건 항목 추가. 단위 테스트 74개·E2E 13개(`desired.html`)·타입 검사·빌드 통과
- 다중 선택 checkbox 그룹: 같은 form·name의 입력 가능 checkbox가 2개 이상이면 입력란 1개(`widget: 'checkboxes'`, 선택지 = value·label, 표시 텍스트는 radio와 같은 규칙 + `role=group`)로 수집. 값은 체크할 value의 JSON 배열 — 이력서 배열 원소별 동의어 매칭 결과 전부(희망 고용 형태·근무지 등), 하나도 없으면 '확인 필요 · 맞는 선택지 없음' → 사이드 패널 '선택'·학습. 입력은 목록과 정확히 일치하도록 체크·해제, 되돌리기는 기존 체크 상태 복원. 단위 테스트 75개·E2E 14개(`checkbox-groups.html`)·타입 검사·빌드 통과
- 분리 입력: 수집 시 가까운 공통 조상(3단계 이내, 입력란 2~6개)으로 묶음(`cluster`) 표시. 전화번호·날짜 키로 매칭된 짧은 칸(maxLength ≤ 4 또는 선택지가 모두 숫자인 select)과 같은 묶음에서 연속한 짧은 칸(앞쪽은 미매칭, 뒤쪽은 미매칭 또는 같은 키)을 한 묶음으로 보고 값 분할(`core/format/split.ts`): 전화번호 3칸(010/1234/5678)·2칸(국번 + 나머지), 날짜 연·월(·일). select 칸은 숫자 비교로 선택지 매칭('03' ↔ '3월'). 묶음은 반복 항목 인덱스 하나만 사용, 분할 실패 시 각 칸 기존 매칭대로. 단위 테스트 79개·E2E 14개(`formats.html`에 전화번호 3칸·연월일 select 추가)·타입 검사·빌드 통과
- 페이지에서 직접 고친 값 학습: filler가 수집한 입력란의 사용자 `change`(isTrusted, 확장 프로그램 입력·되돌리기 중 제외)를 감지해 `userEdit`(filler → background) 전송. background는 입력란 형식으로 변환한 값이 같은 이력서 항목이 정확히 하나일 때(`keyForValue`) 해당 입력란을 '입력 완료'(직접 입력)로 갱신하고 학습 규칙 저장(해당 없음 입력란 채움·잘못된 매핑 교정 모두). 이력서와 다른 값·값이 겹치는 항목·checkbox는 학습 안 함. 단위 테스트 80개·E2E 15개·타입 검사·빌드 통과
- 옵션 화면 자기소개서 라이브러리: '자기소개서' 메뉴(`options.html#cover`), `local:coverLetters` 자동 저장(이력서와 같은 500ms 디바운스 — `useAutoSave`로 일반화). 목록(태그·문항·사용처·글자수/제한), 문항·답변 검색, 태그 필터, 편집(문항·태그·글자수 제한·기준·답변·사용처), 복제·삭제. 글자수는 공백 포함·공백 제외·바이트(한글 등 비ASCII 2바이트) 실시간 표시, 제한 초과 경고(`core/coverLetter.ts`). 단위 테스트 83개·E2E 16개·타입 검사·빌드 통과
- 자기소개서 문항 매칭·글자수 검사: 사이드 패널 '자기소개서 추천'에 아직 입력하지 않은 서술형(textarea) 입력란별로 비슷한 저장 답변 최대 3개 표시. 점수 = 태그 일치(문항 키워드 사전 — 지원 동기·성장 과정·성격 장단점·입사 후 포부·협업·직무 역량, 저장 답변은 사용자 태그 + 문항에서 판별한 태그) + 문항 글자 유사도(2글자 단위 Dice). 글자수 제한은 문항 문구('1,000자 이내'·'공백 제외'·'byte') → 입력란 maxLength 순으로 판별, 답변 글자수/제한·초과 표시, 미리 보기. '입력'은 `fillAnswer`(학습 없음), 입력란 maxLength 초과 시 안내 + 확인 필요. 단위 테스트 86개·E2E 17개(`coverletter.html`)·타입 검사·빌드 통과
- 옵션 화면 설정(제외 사이트): '설정' 메뉴에 기본 제외(linkedin.com, 삭제 불가) + 사용자 추가 제외 도메인 목록·추가·삭제. 입력은 주소·www·대소문자 정리(`normalizeDomain`), 형식 오류·중복 안내. `local:settings.excludedSites`에 저장, '작성' 시 하위 도메인 포함 제외 → 팝업 '설정에서 자동 입력을 제외한 사이트입니다.'(`user-excluded`). 전체 삭제에 설정 포함. 단위 테스트 87개·E2E 19개·타입 검사·빌드 통과
- ARIA 콤보박스(선택 전용 커스텀 드롭다운): `[role=combobox]`(input 제외)·`button[aria-haspopup=listbox]` 수집(`widget: 'combobox'`, 이름은 label·aria-labelledby(자기 id 제외)). 선택지는 연결된 listbox에 있으면 그대로, 없으면 실제 클릭과 같은 포인터·마우스 이벤트로 열어 `role=option` 출현 대기 후 읽고 Esc로 닫음(수집이 비동기로 바뀜). listbox는 aria-controls·aria-owns 대상 → 열린 뒤 보이는 마지막 listbox(portal 대응). 선택지 value는 표시 텍스트 → select와 같은 동의어 매칭·선택지 불일치·사이드 패널 '선택'·학습 재사용. 입력은 열기 → 같은 텍스트 option 클릭 → 표시 텍스트·aria-selected로 검증(`dom/widgets/combobox.ts`). 커스텀 위젯 내부 보조 입력란(aria-hidden)은 수집 제외. 되돌리기는 표시 텍스트로 복원하므로 '선택' 같은 안내 문구 상태는 복원 안 됨. 단위 테스트 87개·E2E 20개(`combobox.html`: click형·mousedown+portal형·선택지 불일치)·타입 검사·빌드 통과
- 검색형 콤보박스(자동완성): `input[role=combobox]`·`aria-autocomplete=list|both` 입력란은 텍스트 입력 후 최대 0.8초 후보 목록(aria-controls·aria-owns → 보이는 listbox) 대기 → 텍스트가 같은 후보, 없으면 검색어를 포함하는 후보가 하나뿐일 때 클릭해 확정(hidden 코드 값 등 위젯 상태 반영). 후보가 없거나 애매하면 입력한 텍스트 유지(입력값을 지우는 위젯이 있어 Esc 미전송). 단위 테스트 87개·E2E 21개(`searchable.html`)·타입 검사·빌드 통과
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
- 사람인·잡코리아 DOM 현장 조사 (사용자 로그인 필요)

## 이슈·리스크
- 국내 사이트의 WAI-ARIA 준수율 미확인 → 범용 전략 효과 불확실
- 스크립트 이벤트(`isTrusted=false`)를 무시하는 위젯은 자동 입력 불가 → 사용자 직접 선택으로 대체
- 링크드인: 확장 프로그램 사용 시 계정 제한·정지 위험 명시
- 사람인·잡코리아 이용약관상 자동화 도구 제한 여부 미확인
- 사이드 패널 '다시 작성': activeTab은 툴바 클릭으로만 부여되고 페이지 이동 시 해제 → 페이지 이동 후에는 팝업 '작성' 필요 (E2E는 localhost 호스트 권한이라 미검증)
