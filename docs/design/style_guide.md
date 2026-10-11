# 스타일 가이드 v1

최종 갱신: 2026-10-11 · 관련 문서: [screens.md](screens.md) · 견본: [mockups/style.html](mockups/style.html)

- 팝업·사이드 패널·옵션 화면의 공통 디자인 기준 (색·글꼴·간격·컴포넌트)
- 구현: 공통 `src/assets/theme.css` + 화면별 `style.css` (8장)
- 견본 HTML은 다른 목업과 같이 파일을 직접 열어 확인 (외부 리소스 없음, 라이트/다크 전환 버튼)

## 1. 원칙

| 항목 | 기준 |
|---|---|
| 톤 | 깔끔한 업무 도구형: 흰 면 + 옅은 회색 배경, 인디고 포인트 1색, 둥근 모서리, 은은한 그림자 |
| 강조 | 화면당 primary 버튼 1개 (팝업 '작성', 사이드 패널 '다시 작성' 등). 나머지는 secondary·ghost |
| 상태 표현 | 색만으로 구분하지 않음: 색 + 문구(배지·개수) 함께 표시 |
| 정보 밀도 | 팝업 360px·사이드 패널 400px 좁은 폭 → 본문 13~14px, 카드 안 여백 12~16px |
| 리소스 | 웹 폰트·아이콘 폰트·CDN 미사용 (시스템 글꼴, 필요 시 인라인 SVG) |
| 토큰 | 컴포넌트는 CSS 변수(토큰)만 참조, 색 값 직접 사용 금지 → 다크 모드는 토큰 재정의만으로 처리 |

## 2. 색 토큰

### 2.1 기본

| 토큰 | 라이트 | 다크 | 용도 |
|---|---|---|---|
| `--bg` | `#f6f7f9` | `#0f1115` | 페이지 배경 |
| `--surface` | `#ffffff` | `#171a21` | 카드·상단 바·입력란 |
| `--surface-2` | `#f1f3f6` | `#1f232c` | 보조 면 (내비 선택, 표 머리, disabled 입력란) |
| `--line` | `#e3e6eb` | `#2a2f3a` | 카드·구분선 |
| `--line-strong` | `#cfd4dc` | `#3a404d` | 입력란·secondary 버튼 테두리 |
| `--text` | `#1a1d23` | `#e7e9ee` | 본문 |
| `--text-sub` | `#5f6673` | `#9aa1ad` | 보조 문구·라벨 |
| `--text-mute` | `#9ca3af` | `#6b7280` | placeholder·비활성 |

### 2.2 포인트 (primary)

| 토큰 | 라이트 | 다크 | 용도 |
|---|---|---|---|
| `--primary` | `#4f46e5` | `#6366f1` | primary 버튼 배경, 선택 표시 |
| `--primary-hover` | `#4338ca` | `#818cf8` | primary hover |
| `--primary-fg` | `#4f46e5` | `#a5b4fc` | 면 위의 포인트 글자·링크 |
| `--primary-soft` | `#eef2ff` | `rgba(129,140,248,.16)` | 선택된 행·내비 배경, 포커스 링 |
| `--on-primary` | `#ffffff` | `#ffffff` | primary 배경 위 글자 |

### 2.3 상태

- 점·테두리 색(`--ok` 등)은 페이지 하이라이트 색(`src/dom/highlight.ts` `COLORS`)과 같은 값 → 사이드 패널 표시와 페이지 테두리 색 일치
- 하이라이트는 채용 사이트 위에 그려지므로 다크 모드와 무관하게 고정 값 유지
- 글자에는 대비를 높인 `-text` 토큰 사용 (상태 색은 흰 배경 대비 4.5:1 미달)

| 의미 | 사용처 | 색 (라이트 / 다크) | 글자 `-text` | 배경 `-soft` |
|---|---|---|---|---|
| `--ok` 입력 완료 | 결과 요약, 배지, '입력 가능' | `#16a34a` / `#22c55e` | `#15803d` / `#4ade80` | `#e9f7ef` / `rgba(34,197,94,.14)` |
| `--warn` 확인 필요 | 확인 필요 카드, 민감정보 표시, 제외 사이트 안내 | `#ea580c` / `#fb923c` | `#c2410c` / `#fdba74` | `#fff1e8` / `rgba(251,146,60,.14)` |
| `--err` 오류 | 저장 실패, 글자수 초과, 삭제 버튼 | `#dc2626` / `#f87171` | `#b91c1c` / `#fca5a5` | `#fdecec` / `rgba(248,113,113,.14)` |
| `--neutral` 해당 없음 | 해당 없음 개수·배지 | `#9ca3af` / `#6b7280` | `#5f6673` / `#9aa1ad` | `#f1f3f6` / `#1f232c` |
| `--info` 안내 | 일반 안내 메시지 | `#2563eb` / `#60a5fa` | `#1d4ed8` / `#93c5fd` | `#eaf1fe` / `rgba(96,165,250,.14)` |

## 3. 타이포그래피

- 글꼴: `system-ui, -apple-system, 'Segoe UI', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif`
- 숫자 정렬이 필요한 곳(결과 개수·글자수·날짜): `font-variant-numeric: tabular-nums`
- 한글 줄바꿈: `word-break: keep-all` (본문·카드 제목)

| 토큰 | 크기 / 줄높이 | 굵기 | 용도 |
|---|---|---|---|
| `--fs-xs` | 11 / 16 | 500 | 배지, 보조 표시(필수·민감) |
| `--fs-sm` | 12 / 18 | 400·500 | 필드 라벨, 보조 문구, 표 머리 |
| `--fs-md` | 13 / 20 | 400·500 | 사이드 패널 본문, 버튼, 표, 메시지 |
| `--fs-base` | 14 / 22 | 400 | 옵션 본문, 입력란 |
| `--fs-lg` | 16 / 24 | 600 | 팝업·사이드 패널 제목, 카드 제목 |
| `--fs-xl` | 18 / 26 | 700 | 옵션 섹션 제목(h2) |
| `--fs-2xl` | 20 / 28 | 700 | 옵션 상단 바 제목, 결과 요약 숫자 |

- 굵기는 400·500·600·700 네 단계만 사용

## 4. 간격·모서리·그림자

| 구분 | 토큰 | 값 |
|---|---|---|
| 간격 (4px 단위) | `--sp-1` ~ `--sp-8` | 4 / 8 / 12 / 16 / 20 / 24 / 32 (`--sp-1`=4, `--sp-2`=8, `--sp-3`=12, `--sp-4`=16, `--sp-5`=20, `--sp-6`=24, `--sp-8`=32) |
| 모서리 | `--r-sm` | 6px — 입력란, 버튼, 메시지 |
| | `--r-md` | 8px — 팝업 안 카드, 드롭다운 |
| | `--r-lg` | 12px — 옵션 카드, 사이드 패널 카드 |
| | `--r-pill` | 999px — 배지, 상태 토글 |
| 그림자 | `--shadow-sm` | 라이트 `0 1px 2px rgba(16,24,40,.06)` / 다크 `0 1px 2px rgba(0,0,0,.4)` — 카드 기본 |
| | `--shadow-md` | 라이트 `0 4px 12px rgba(16,24,40,.08)` / 다크 `0 4px 16px rgba(0,0,0,.5)` — 상단 고정 바, 떠 있는 요소 |
| 포커스 링 | `--focus` | `0 0 0 3px var(--primary-soft)` + 테두리 `var(--primary)` |
| 전환 | `--ease` | `120ms ease` (색·배경·테두리만, 레이아웃 애니메이션 없음) |

- 주요 간격 기준: 카드 안 여백 16(옵션)·12(팝업·사이드 패널), 카드 사이 12, 필드 사이 12, 섹션 사이 24

## 5. 컴포넌트

### 5.1 버튼 `.btn`

| 변형 | 클래스 | 모양 | 사용처 |
|---|---|---|---|
| primary | `.btn.primary` | `--primary` 배경, `--on-primary` 글자, 600 | 화면 대표 동작 1개 ('작성', '다시 작성', '가져오기') |
| secondary | `.btn` | `--surface` 배경, `--line-strong` 테두리 | 일반 동작 ('복사', '입력', '이동') |
| ghost | `.btn.ghost` | 배경·테두리 없음, `--text-sub` 글자 | 보조 동작 ('건너뛰기', 하단 링크) |
| danger | `.btn.danger` | secondary + `--err-text` 글자, hover 시 `--err-soft` 배경 | 삭제, 전체 삭제 |
| add | `.btn.add` | 폭 100%, 점선 테두리, `--text-sub` 글자 | 반복 항목 추가 |

| 크기 | 높이 | 여백 | 글자 |
|---|---|---|---|
| 기본 | 32px | 0 12px | `--fs-md` 500 |
| 작게 `.btn.sm` | 26px | 0 8px | `--fs-sm` 500 (카드 머리 위·아래·삭제, 행 안 '복사') |
| 크게 `.btn.lg` | 40px, 폭 100% | — | `--fs-base` 600 (팝업 '작성') |

- 상태: hover 배경 한 단계(secondary → `--surface-2`, primary → `--primary-hover`), focus-visible `--focus`, disabled `opacity: .45` + `cursor: default` (disabled에는 hover 배경 미적용 — primary 글자가 사라지지 않도록)
- 진행 중: 문구 교체('입력 중…') + disabled, 스피너 미사용

### 5.2 입력란

- `input`·`select`·`textarea`: 높이 36px(textarea 제외), 여백 0 10px, `--surface` 배경, `--line-strong` 테두리, `--r-sm`
- hover 테두리 `--text-mute`, focus 테두리 `--primary` + `--focus`, disabled `--surface-2` 배경 + `--text-mute` 글자
- 오류: 테두리 `--err` + 아래 `--fs-sm` `--err-text` 문구
- checkbox·radio: `accent-color: var(--primary)`, 16px, 라벨과 간격 8
- placeholder: `--text-mute`

### 5.3 필드 라벨 `.field-label`

- `--fs-sm` 500 `--text-sub`, 입력란과 간격 4
- 필수: '필수' 배지(primary), 민감: '민감' 배지(warn) — 5.5
- 배지 앞 공백 텍스트 유지 → 입력란 접근성 이름이 '문항 필수' 형태로 유지됨 (E2E `getByLabel` 기준)

### 5.4 카드 `.card`

- `--surface` 배경, `--line` 테두리, `--r-lg`, `--shadow-sm`, 여백 16 (팝업·사이드 패널 12)
- 카드 머리 `.card-head`: 제목 `--fs-base` 600 + 오른쪽 `.btn.sm` 묶음, 아래 간격 12
- 상태 카드(사이드 패널 확인 필요): 왼쪽 3px 테두리 `--warn` 추가

### 5.5 배지 `.badge`

- `--r-pill`, 높이 20px, 여백 0 8px, `--fs-xs` 500, `-soft` 배경 + `-text` 글자
- 변형: `.badge.ok`(입력 완료·입력 가능), `.badge.warn`(확인 필요·민감·제외), `.badge.err`, `.badge.neutral`(해당 없음·학습), `.badge.primary`(태그)
- 점 표시 `.dot`: 8px 원, 상태 색 — 결과 요약 개수 앞

### 5.6 메시지 `.msg`

- 여백 10px 12px, `--r-sm`, `--fs-md`, `-soft` 배경 + `--text` 글자, 왼쪽 3px 상태 색 테두리
- 변형: `.msg`(info, 기본) / `.msg.warn` / `.msg.err` / `.msg.ok`
- 작업 결과 문구(`role="status"`)·권한 안내(`role="alert"`)에 사용

### 5.7 표

- `--fs-md`, 행 높이 40px, 행 구분 `--line`
- 머리: `--surface-2` 배경, `--fs-sm` 600 `--text-sub`
- 행 hover `--surface-2`, 선택 행 `tr.on` `--primary-soft`

### 5.8 내비게이션 (옵션 좌측)

- 폭 208px, 항목 높이 36px, 여백 0 12px, `--r-sm`, 항목 사이 2
- 기본 `--text-sub`, hover `--surface-2` 배경 + `--text`, 선택 `.on` `--primary-soft` 배경 + `--primary-fg` 600
- 기존 왼쪽 3px 테두리 표시는 배경 강조로 대체

### 5.9 상단 바 `.top`

- 높이 56px, `--surface` 배경, 아래 `--line` 테두리, 고정(sticky)
- 제목 `--fs-lg` 700, 오른쪽 저장 상태 `--fs-sm` `--text-sub` (오류 시 `--err-text`, 저장 완료 시 `.dot.ok` 함께)

### 5.10 결과 요약 (사이드 패널)

- 3칸 그리드, 칸마다 `--surface` 카드: 숫자 `--fs-2xl` 700 tabular-nums + 아래 `.dot` + 라벨 `--fs-sm`
- 칸 순서·색: 입력 완료(ok) · 확인 필요(warn) · 해당 없음(neutral)
- 확인 필요 0개면 해당 칸 숫자 `--text-mute`

### 5.11 기타

| 요소 | 기준 |
|---|---|
| 진행 막대 | 높이 6px, `--surface-2` 바탕, `--primary` 채움, `--r-pill` |
| 접이식 `details` | `summary` 높이 36px, `--fs-md` 500, 앞에 ▸/▾ 표시, 펼친 내용은 카드 안 |
| 글자수 `.count` | `--fs-sm` tabular-nums `--text-sub`, 초과 시 `--err-text` 600 |
| 구분선 | 1px `--line`, 위아래 간격 16 |
| 빈 상태 | 가운데 정렬 `--fs-md` `--text-sub` 문구 + 아래 primary/secondary 버튼 |

## 6. 화면별 적용

| 화면 | 레이아웃 | 적용 지점 |
|---|---|---|
| 팝업 (360px) | 머리(제목, 아래 `--line`) / 본문(여백 16, 요소 간격 12) / 하단(ghost 버튼, 위 `--line`) | 이력서 요약 `.card.compact`(이름 600, 수정일 `--fs-sm`), '작성' `.btn.primary.lg`, 권한 안내 `.msg.warn` + `.btn.sm` 2개, 결과 문구 `.msg` |
| 사이드 패널 (400px) | 머리(제목 + 대상 URL·시각 `--fs-sm`, sticky) / 결과 요약 3칸 / 동작 버튼 줄 / 섹션 목록(간격 16) | 확인 필요는 상태 카드(5.4) 1항목 = 1카드, 입력 완료·이력서 항목 복사는 카드 안 행 목록 + `.btn.sm`, 해당 없음은 `details.card`, 자기소개서 추천은 카드 + 글자수 `.count` |
| 옵션 (최대 1100px) | 상단 바 56px / 좌측 내비 208px + 본문(여백 24) | 기존 클래스(`.top .wrap nav main .card .card-head .grid .field .field-label .btn .toolbar .count table`) 유지. `.grid` 3열은 폭 720px 미만에서 2열 |

- 사이드 패널 섹션 제목(h2): `--fs-md` 600 `--text-sub` + 오른쪽 개수 배지
- 결과 요약 3칸 묶음에 `aria-label="입력 완료 N · 확인 필요 N · 해당 없음 N"` (스크린 리더·E2E 확인용)
- 팝업 현재 사이트 줄·설정 버튼, 아바타는 기능 미구현으로 미적용 (견본에만 있음)

## 7. 다크 모드

- 기준: `@media (prefers-color-scheme: dark)`에서 `:root` 토큰만 재정의 (2·4장 다크 값)
- 컴포넌트 CSS에 다크 전용 규칙 두지 않음 (토큰으로 해결 안 되는 경우만 예외)
- `color-scheme: light dark` 지정 → 스크롤바·기본 폼 컨트롤·date 입력란 달력 아이콘도 함께 전환
- 증명사진 등 이미지는 그대로, 카드 테두리로 경계 구분
- 페이지 하이라이트 색(2.3)은 다크 모드 대상 아님

## 8. 적용 구조

| 파일 | 내용 |
|---|---|
| `src/assets/theme.css` | 토큰(라이트·다크) + 기본 요소(body·입력란·버튼) + 5장 컴포넌트 클래스 |
| `src/entrypoints/options/style.css` | 옵션 전용 레이아웃 (`.top .wrap nav main .grid .toolbar`) |
| `src/entrypoints/popup/style.css` | 팝업 전용 레이아웃 (`.popup-head .popup-body .popup-foot`) |
| `src/entrypoints/sidepanel/style.css` | 사이드 패널 전용 레이아웃 (`.panel-head .summary .sec-title .row-list` 등) |

- 각 화면 `main.tsx`에서 `theme.css` → 화면별 `style.css` 순서로 import
- 새 화면(동의 모달·복사 전용 모드 등)도 같은 방식: 공통 클래스 우선, 화면 전용 배치만 별도 CSS
- 견본(`mockups/style.html`)의 토큰 값은 `theme.css`와 동일하게 유지 (변경 시 함께 수정)
