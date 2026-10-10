# 키워드·옵션 동의어 사전 v1

최종 갱신: 2026-10-10 · 관련 문서: [architecture.md](architecture.md) 7.1, [resume_schema_v1.md](resume_schema_v1.md) 5장, [06 보고서](../reports/06_generic_widget_strategy.md) 2.1

- 사전 원본은 코드. 이 문서는 구조·규칙·갱신 방법만 기술 (항목 목록은 코드 참조)

| 사전 | 위치 | 역할 |
|---|---|---|
| 섹션 판별 규칙 | `src/core/mapping/dictionary.ts` `SECTION_RULES` | 입력란이 속한 섹션 판별 |
| 섹션 항목 규칙 | 같은 파일 `SECTION_FIELD_RULES` | 섹션 안 입력란 → 스키마 키 |
| basics 규칙 | 같은 파일 `FIELD_RULES` | 섹션 밖 입력란 → 기본 정보 키 |
| 옵션 동의어 | `src/core/mapping/options.ts` `ENUM_OPTIONS` | enum 값 ↔ 사이트 선택지 텍스트 |
| 표시명 | `src/core/schema/labels.ts` | enum 표시명, 사이드 패널·옵션 화면 항목명 |

## 1. 입력란 → 스키마 키 매칭 순서
1. 학습 규칙 (`origin + fingerprint`)
2. `autocomplete` 속성 (basics 규칙의 `autocomplete` 토큰)
3. 섹션 판별 → 해당 섹션 규칙만 검사, 판별 안 되면 basics 규칙만 검사
   - 검사 텍스트 순서: label → aria-label → placeholder → name → id (신뢰도 순)
   - 섹션 안에서 basics 규칙을 쓰지 않는 이유: 경력 섹션 '주소'·학력 섹션 '이름' 같은 오입력 방지

## 2. 키워드 사전 (`dictionary.ts`)
### 2.1 섹션 판별
- 판별 텍스트 순서: 입력란 자체 텍스트(label·aria-label·placeholder·name·id) → 섹션 텍스트(가장 가까운 `fieldset` `legend` → 문서 순서상 직전 `h1`~`h6`)
- 한 텍스트에 두 섹션이 함께 걸리면 그 텍스트로는 판별하지 않고 다음 텍스트로 (예: '학력·경력 사항')
- 섹션: 학력·경력·자격증·어학·수상·활동·프로젝트(반복 항목, `SECTION_LABELS`) + 병역(단일 객체)
- 예외: '수상경력'·'활동 경력'·'봉사 경력'은 경력 섹션으로 보지 않음

### 2.2 항목 규칙 (`FieldRule`)
| 필드 | 의미 |
|---|---|
| `schemaKey` | 반복 섹션은 인덱스 자리를 `*`로 표기 (`education.*.school.ko`), 병역·basics는 고정 키 |
| `pattern` | 한/영 키워드 정규식 |
| `exclude` | 제외 키워드 (예: 날짜·명칭 규칙의 `구분·상태·유형` 등 enum 성격 라벨) |
| `section` | 지정 시 해당 섹션 문맥에서만 검사 |
| `autocomplete` | basics 규칙만 사용 |

- **배열 순서 = 우선순위**: 다른 항목 키워드를 포함하는 구체적 항목을 앞에 둠
  - 예: '영문 학교명' → 학교명, '졸업 구분'(enum) → '졸업'(날짜), '퇴사 사유' → '퇴사'(날짜), '담당 업무' → '직무', 자격증 '번호'·'기관'·'취득일' → '자격증명'
- 반복 항목 인덱스: `mapFields`가 같은 `*` 키의 등장 순서대로 0, 1, 2… 부여 → 블록 n번째 입력란은 이력서 n번째 항목

## 3. 옵션 동의어 사전 (`options.ts`)
### 3.1 구조
- `ENUM_OPTIONS`: enum 스키마 키(`*` 정규화) → `{ labels, synonyms }`
  - `labels`: `labels.ts` 표시명 재사용 (예: `university` → '대학교(4년)')
  - `synonyms`: 코드별 동의어 (예: `university` → 4년제·학사·대졸·대학교). 초안은 resume_schema_v1.md 5장
- 대상: 성별, 학력 구분·졸업 상태·소재지, 고용 형태, 어학 언어, 활동 구분, 병역 구분·군별·전역 구분

### 3.2 선택지 매칭 (`matchOption`)
1. 후보 목록: [표시명, 동의어…, 코드] (enum 아닌 키는 [저장값], 예: 학점 만점 `4.5`)
2. 정규화: 소문자, 공백·괄호·`·.,/-_:` 제거 (예: '대학교 (4년)' → '대학교4년')
3. 1단계 일치: 후보 순서대로 옵션 text 또는 value와 정규화 일치 → 선택
4. 2단계 포함: 후보 순서대로(2자 이상) 옵션 text가 후보를 포함하는 옵션이 **하나뿐**이면 선택. 여러 옵션에 걸리면 다음 후보
   - 예: '대학교(4년)' → '대학교(4년제)' 선택 / '대학교'는 '대학교 2년'·'대학교 4년제' 모두에 걸려 건너뜀
5. 모두 실패 → 입력하지 않음 ('해당 없음' 표시, 사이드 패널에서 직접 선택)

- 값 비어 있는 안내 옵션('선택하세요')·비활성 옵션은 수집 단계에서 제외
- 텍스트 입력란에 enum 값을 넣을 때는 코드 대신 표시명 입력 (`enumLabel`)

## 4. 갱신 방법
- 새 키워드: 해당 규칙 `pattern`에 추가 → 다른 항목 키워드를 포함하면 순서 확인
- 새 동의어: `ENUM_OPTIONS`의 `synonyms`에 추가 (짧은 동의어는 포함 매칭에서 여러 옵션에 걸릴 수 있으므로 표시명·구체적 동의어를 앞에)
- 새 섹션: `labels.ts` `SECTION_LABELS`(반복 항목) → `SECTION_RULES` → `SECTION_FIELD_RULES` → `ITEM_KEY_LABELS` → 날짜 항목은 `core/format` `FORMATTERS`
- 변경 시 `tests/unit/mapping.test.ts`·`options.test.ts`에 실제 라벨·선택지 예시 추가
- 사이트별 실제 선택지는 DOM 현장 조사 후 동의어로 보완

## 5. 미결
- ARIA 콤보박스·검색형 콤보박스 (06 보고서 2.2·2.3) — DOM 현장 조사 후
- 선택지 불일치 시 사이드 패널 '확인 필요'에 사이트 선택지 목록 표시 (screens.md 3장)
- 자기소개서 문항 키워드 (02 보고서 5장)
