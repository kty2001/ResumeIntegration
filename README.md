# ResumeIntegration

이력서 통합 작성 크롬 확장 프로그램

## 배경
- 채용 플랫폼(사람인, 잡코리아, 원티드 등)과 기업별 채용 페이지마다 이력서를 반복 작성·갱신해야 하는 문제
- 플랫폼 간 이력서 데이터 미연동, 기업 자체 채용 사이트는 매번 새로 입력 필요

## 목표
- 이력서 내용을 확장 프로그램에 한 번 저장
- 이력서 작성 페이지에서 '작성' 버튼 클릭 시 현재 페이지의 입력란을 분석해 자동 입력
- 특정 사이트 전용이 아닌 **범용** 동작 지향

## 주요 기능
- 이력서·자기소개서·첨부 파일 입력·저장 (로컬 저장, 개발자 서버 전송 없음), JSON 백업
- 현재 페이지 입력란 수집 → 이력서 항목 매핑(학습 규칙 → autocomplete → 키워드 사전·섹션 문맥) → 자동 입력
- 텍스트·select·radio·checkbox·ARIA 콤보박스·파일·달력 팝업형 날짜 등 범용 위젯 처리, 같은 출처·교차 출처(권한 요청) iframe
- 사이드 패널: 입력 결과 확인, 미입력 항목 직접 선택·복사, 위치 보기, 되돌리기, 자기소개서 답변 추천
- 사용자 수정 결과를 사이트별 규칙으로 학습
- 자동 제출 없음: 입력까지만 수행, 제출은 사용자가 검토 후 직접 진행

계획: (선택) 사용자 본인 API 키 입력 시 LLM 기반 매핑 보조, 제외 사이트용 복사 전용 모드 — [할 일 목록](docs/TODO.md)

## 기술 방향
- Chrome Extension Manifest V3
- 최소 권한: `activeTab` + `scripting` + `storage` + `sidePanel`, 교차 출처 iframe은 선택 호스트 권한을 필요 시 요청 ([architecture](docs/design/architecture.md) 3장)
- WXT + TypeScript + React ([기술 스택](docs/design/tech_stack.md))

## 디렉터리 구조

```
.
├─ README.md
├─ package.json
├─ wxt.config.ts     # WXT 설정, manifest 권한
├─ src/
│  ├─ entrypoints/   # background, filler(주입 스크립트), popup, options, sidepanel
│  ├─ core/          # DOM 무관 순수 로직: 스키마, 매핑·사전, 형식 변환, 백업 등
│  ├─ dom/           # 입력란 수집, 위젯별 입력, 하이라이트, 되돌리기
│  ├─ messaging/     # 메시지 규격
│  └─ storage/       # 저장소 항목, 첨부 파일(IndexedDB)
├─ tests/
│  ├─ unit/          # Vitest
│  └─ e2e/           # Playwright + fixtures/
└─ docs/
   ├─ STATUS.md      # 현재 진행 상황
   ├─ TODO.md        # 할 일 목록
   ├─ design/        # 설계 문서
   └─ reports/       # 레퍼런스 조사 보고서
```

## 개발

요구 사항: Node.js, npm

```bash
npm install        # 의존성 설치 (WXT 타입 생성 포함)
npm run dev        # 개발 모드 (변경 시 자동 재빌드, 개발용 브라우저 실행)
npm run build      # 프로덕션 빌드 → .output/chrome-mv3/
npm run compile    # 타입 검사
npm run test       # 단위 테스트 (Vitest)
npm run test:e2e   # E2E 테스트 (최초 1회 npx playwright install chromium 필요)
npm run zip        # 스토어 업로드용 zip 생성
```

크롬에 직접 로드
1. `npm run build`
2. `chrome://extensions` 접속 → 우측 상단 '개발자 모드' 켜기
3. '압축해제된 확장 프로그램을 로드합니다' → `.output/chrome-mv3` 폴더 선택

## 문서
- [진행 상황](docs/STATUS.md)
- [할 일 목록](docs/TODO.md)
- 설계: [구조·메시지 흐름](docs/design/architecture.md) · [화면](docs/design/screens.md) · [이력서 스키마](docs/design/resume_schema_v1.md) · [키워드·동의어 사전](docs/design/dictionary_v1.md) · [기술 스택](docs/design/tech_stack.md)
- [레퍼런스 조사 보고서](docs/reports/README.md)

## 커밋 메시지 규칙

### 형식
```
<type>: <제목>

<본문 (선택)>
```

### type

| type | 용도 |
|---|---|
| `feat` | 새 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서 추가·수정 |
| `refactor` | 기능 변화 없는 코드 구조 개선 |
| `style` | 포맷팅, 세미콜론 등 동작에 영향 없는 변경 |
| `test` | 테스트 추가·수정 |
| `chore` | 빌드 설정, 패키지, 기타 잡무 |
