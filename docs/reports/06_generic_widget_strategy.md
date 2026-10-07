# 06. 범용 입력 전략: 드롭다운·날짜 선택기

> 결정 사항: 특정 사이트 전용이 아닌 **범용 확장 프로그램** 지향. 사이트별 어댑터는 필수 구성이 아닌 예외 보정용

## 1. 기본 원칙: 판별 → 시도 → 검증 → 대체 수단

```
필드 판별(위젯 종류 분류)
   │
   ▼
전략 1 시도 ──► 검증 ── 성공 ──► 완료
   │              │
   │            실패
   ▼              ▼
전략 2 시도 ──► 검증 ── ...
   │
   ▼ (모든 전략 실패)
하이라이트 + 사이드 패널에서 사용자 직접 선택
   │
   ▼
선택 결과를 '도메인 + 필드 식별자' 규칙으로 저장 → 다음 방문 시 전략 0순위
```

- **검증 방법**: 입력 후 값 다시 읽기, `blur` 이후에도 값 유지 여부, 표시 텍스트 변경 여부, 오류 메시지(`aria-invalid="true"`, 오류 클래스) 출현 여부
- 사이트별 어댑터: 범용 전략이 반복 실패하는 사이트에 한해 셀렉터 규칙(JSON)으로 보정 ([02 보고서](02_field_mapping.md) 5장)

## 2. 드롭다운 처리 (우선순위 순)

### 2.1 기본 `<select>`
- 옵션 `text`·`value` 정규화(공백·괄호·특수문자 제거, 소문자화) 후 매칭
- 동의어 사전 병행: 예) `학사` ↔ `대졸(4년)` ↔ `4년제 대학교`, `군필` ↔ `병역필` ↔ `만기전역`
- 값 설정: native value setter + `change` 이벤트(bubbles) ([01 보고서](01_extension_architecture.md) 4장)
- 가장 확실한 경우, 범용성 문제 없음

### 2.2 ARIA 표준 콤보박스 — 범용성 확보의 핵심
- WAI-ARIA 콤보박스 패턴 구조
  - 입력 요소 `role="combobox"`, 팝업 열림 상태 `aria-expanded="true|false"`
  - 팝업 요소 참조 `aria-controls`, 팝업 역할은 `listbox`·`grid`·`tree`·`dialog` 중 하나
  - 옵션 `role="option"`, 선택 상태 `aria-selected="true"`
  - 키보드: ↓ 키로 팝업 진입, Enter로 선택 확정, Esc로 닫기
  - 출처: [WAI-ARIA APG Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/), [Listbox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)
- 처리 절차
  1. `role="combobox"` 또는 `aria-haspopup` 요소 탐지
  2. 클릭(또는 focus + ↓ 키)으로 열기 → `aria-expanded="true"` 확인
  3. `aria-controls` 대상 또는 문서 전체에서 `role="option"` 출현을 `MutationObserver`로 대기 (타임아웃 설정)
  4. 옵션 텍스트 매칭 → 해당 옵션 클릭
  5. 검증: 콤보박스 표시 텍스트 변경 여부
- 근거: 접근성 준수를 표방하는 UI 라이브러리 다수가 이 패턴 기반으로 구현됨 → 라이브러리 단위 커버 가능 (국내 사이트의 실제 준수율은 **미확인**, 현장 조사 필요)

### 2.3 검색형 콤보박스 (자동완성)
- 대상: 학교명·회사명·자격증명 검색 입력란 (`aria-autocomplete="list|both"`)
- 절차: 검색어 입력(문자 단위 `input` 이벤트) → 후보 목록 출현 대기 → 최적 후보 클릭 (실패 시 ↓ + Enter 키 이벤트)
- 주의: 서버 검색 결과 지연 → 대기 시간 필요. 정확히 일치하는 후보가 없으면 사용자 확인 단계로 이동

### 2.4 ARIA 미준수 커스텀 위젯
- 절차: 클릭 전 DOM 상태 기록 → 클릭 → **새로 나타난 보이는 요소** 탐색 → 그 안의 클릭 가능한 텍스트 요소와 매칭
- 팝업이 입력란 근처가 아닌 `body` 끝에 렌더링되는 경우(React Portal 등) 대비해 문서 전체 대상 탐색
- 오탐 위험 존재 → 매칭 신뢰도 낮으면 클릭 전 사용자 확인

### 2.5 BYOK LLM 보조 (API 키 입력 사용자 한정)
- 문자열·동의어 매칭 실패 시 **"목표 값 + 옵션 텍스트 목록"만** LLM에 전달해 최적 옵션 선택
  - 예) 목표 `컴퓨터공학` / 옵션 `[공학계열, 자연계열, 인문계열, ...]` → `공학계열`
- 이력서 전체가 아닌 해당 항목 값 1개만 전송 → 노출 최소화 (상세 설계는 [02 보고서](02_field_mapping.md) 4장)

### 2.6 최종 대체 수단
- 필드 하이라이트 + 사이드 패널에 "이 항목을 직접 선택해 주세요" 표시
- 사용자 선택 결과를 규칙으로 저장 → 같은 사이트 재방문 시 자동 처리

## 3. 날짜 선택기 처리

### 3.1 기본 `<input type="date|month">`
- 값 형식 고정: `date` = `YYYY-MM-DD`, `month` = `YYYY-MM` — [MDN input type=date](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/date)
- native setter + `input`·`change` 이벤트, 범용성 문제 없음

### 3.2 텍스트형 날짜 입력
- 형식 추론 신호: `placeholder`(예: `YYYY.MM`, `2020.03`), `maxlength`(6 → `YYYYMM`, 7 → `YYYY.MM`), `pattern` 속성, 주변 안내 문구, 기존 입력값 패턴
- 지원 형식 예: `YYYY.MM`, `YYYY-MM`, `YYYY/MM`, `YYYYMM`, `YYYY.MM.DD`, `YYYY-MM-DD`, `YYYYMMDD`
- 입력 마스크(자동 점·하이픈 삽입) 적용 필드: 전체 값 한 번에 설정 시 깨짐 가능 → 숫자만 문자 단위로 입력 이벤트 발생 후 결과 검증

### 3.3 년/월/일 분리 입력
- `<select>` 3개 또는 텍스트 입력란 3개로 분리된 경우
- label·name의 `년/월/일`, `year/month/day` 키워드로 그룹 판별 → 각 칸에 드롭다운 전략(2장) 또는 텍스트 입력 적용

### 3.4 달력 팝업형 (readonly 입력란 + 클릭 시 달력)
1. 값 직접 설정 후 검증: readonly 입력란도 스크립트로 값 설정 가능한 경우 다수. 단, 위젯 내부 상태와 불일치 시 제출 시 값 유실 → 검증 필수
2. ARIA 달력 탐색: 달력 `role="grid"`, 이전/다음 달·연도 버튼 `aria-label`, 날짜 셀 클릭 — [APG Date Picker Dialog 예제](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)
   - 절차: 달력 열기 → 머리글의 현재 년·월 읽기 → 목표 년·월까지 이동 버튼 반복 클릭(연도 선택 드롭다운 있으면 우선 사용) → 날짜 셀 클릭
   - 이력서 날짜는 대부분 수년~수십 년 전 → 월 단위 이동은 클릭 횟수 과다, 연도 선택 수단 우선 탐색 필요
3. 사용자 직접 선택 + 규칙 저장

## 4. 공통 한계: `isTrusted`
- 스크립트의 `dispatchEvent()`·`element.click()`로 만든 이벤트는 `isTrusted=false` — [MDN Event.isTrusted](https://developer.mozilla.org/en-US/docs/Web/API/Event/isTrusted)
- 일부 위젯이 `isTrusted=false` 이벤트를 무시 → 범용 전략 실패 원인
- 우회 수단: `chrome.debugger` API로 Chrome DevTools Protocol의 `Input` 도메인(실제 입력과 동일한 이벤트) 사용 가능 — [chrome.debugger](https://developer.chrome.com/docs/extensions/reference/api/debugger)
  - 단점: 설치 시 "Access the page debugger backend", "Read and change all your data on all websites" 경고 표시 — [Permissions list](https://developer.chrome.com/docs/extensions/reference/permissions-list). 연결 중 브라우저 상단 디버깅 알림 표시로 알려짐(공식 문서 미확인)
  - 판단: 최소 권한 원칙과 충돌 → **비권장**. 해당 위젯은 사용자 직접 선택으로 처리

## 5. 구현 시 모듈 구성 제안

```
content/widgets/
├─ detect.js        # 위젯 종류 분류 (native select / aria combobox / searchable / custom / date 계열)
├─ select.js        # 2.1
├─ combobox.js      # 2.2, 2.3
├─ custom-popup.js  # 2.4
├─ date.js          # 3.1 ~ 3.4
└─ verify.js        # 공통 검증 로직
```

- 위젯 모듈은 "값 입력 시도 + 성공 여부 반환"이라는 동일한 인터페이스 → 전략 체인에서 순서대로 호출
- 테스트: 위젯 종류별 로컬 HTML fixture(기본 select, MUI 유사 콤보박스, 검색형, 포털 팝업, 마스크 입력, 달력 팝업)로 회귀 테스트 ([01 보고서](01_extension_architecture.md) 7장)
