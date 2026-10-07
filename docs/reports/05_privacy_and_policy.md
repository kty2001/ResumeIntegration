# 05. 개인정보·정책

> 법률 자문이 아닌 공개 자료 기반 정리. 배포 전 최신 정책·법령 재확인 필요

## 1. Chrome Web Store 정책

| 항목 | 요구 사항 | 본 프로젝트 영향 |
|---|---|---|
| 개인정보처리방침 | 사용자 데이터를 다루면 정확한 최신 개인정보처리방침 게시 필수 | 로컬 저장만 하더라도 이력서 = 개인정보 → **처리방침 게시 필요** |
| 공개·동의 | 수집 데이터와 사용 방식을 눈에 띄게 공개하고 명시적 동의 획득 | 최초 실행 시 동의 화면 필요 |
| 안전한 전송 | 데이터 전송 시 최신 암호화 사용 | 서버 백업·LLM 연동 시 HTTPS 필수 |
| 단일 목적 | 좁고 이해하기 쉬운 단일 목적 | '이력서 자동 입력'에 집중, 무관 기능 추가 지양 |
| 최소 권한 | 기능 구현에 필요한 최소 권한만 요청 | `activeTab` 우선, `<all_urls>` 지양 |
| Limited Use | 공개된 단일 목적 범위 내 사용, 광고·데이터 브로커 전달 금지, 사람의 데이터 열람 제한, 웹사이트에 준수 선언문 게시 | 처리방침에 Limited Use 준수 문구 포함 |
| 원격 코드 | 원격 호스팅 JS/WASM 실행 금지 (JSON 등 데이터는 허용) | 사이트 규칙은 데이터(JSON)로만 원격 갱신 가능 |

- 출처: [Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies), [Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use/), [User Data FAQ](https://developer.chrome.com/webstore/user_data), [Remote hosted code](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code)
- 참고: 국내 경쟁 확장 JOBPREP는 `<all_urls>` + 서버 로그인 구조로 고위험 권한 평가 받음 — [ExtScope](https://extscope.org/extension/fdhfgbcdilegcpphkkkahffgcgeebcko)

## 2. 국내 개인정보보호법 관점

| 구조 | 법적 성격 | 시사점 |
|---|---|---|
| **로컬 저장 전용** (개발자 서버로 전송 없음) | 개발자가 개인정보를 수집·보관하지 않는 구조 | 법적 부담 최소. 단, 처리방침에 "외부 전송 없음" 명시 |
| 서버 저장/동기화 | 개발자가 개인정보처리자 지위 | 수집·이용 동의, 보관·파기, 안전성 확보 조치 의무 발생 |
| 개발자 운영 LLM API 경유 | 제3자 제공 또는 처리위탁 해당 가능 | 별도 고지·동의 필요, 해외 이전 시 추가 고지 |
| **BYOK LLM (채택 방식)** | 사용자 본인 API 키·계정으로 브라우저에서 제공자에 직접 전송, 개발자 서버 미경유 | 개발자는 데이터 미수신. 법적 성격 해석은 **미확인**. 처리방침·UI에 전송 범위 고지 필요 |

- **민감정보(제23조)**: 건강·장애 정보(장애 여부·등급 포함)는 민감정보 → 별도 동의 또는 법적 근거 없이 처리 불가 — [nepla 위키: 민감정보 의미와 유형](https://www.nepla.ai/wiki/it-정보-방송통신/개인정보-위치정보-신용정보/민감정보의-처리/민감정보의-의미와-유형-0vyn50d38d7p)
  - 이력서의 '장애 여부·등급', '보훈' 항목이 해당 가능 → 서버 저장 시 특히 주의, 로컬 저장 + 선택 입력 처리 권장
- 개인 사용자가 자기 정보를 자기 브라우저에 저장하는 경우의 법 적용 범위: **미확인** (전문가 확인 권장)

## 3. 로컬 데이터 보호
- `chrome.storage.local`은 기본적으로 디스크에 평문 저장으로 알려짐 (공식 문서상 암호화 언급 없음) → 공유 PC 환경 위험
- 선택 옵션: Web Crypto API(`crypto.subtle`, AES-GCM + PBKDF2로 사용자 비밀번호 기반 키 유도)로 암호화 저장
  - 장점: 기기 탈취·공유 PC 대응
  - 단점: 매 사용 시 잠금 해제 필요 → UX 저하. 비밀번호 분실 시 복구 불가
- `chrome.storage.setAccessLevel()`로 content script의 storage 직접 접근 차단 → 페이지에 주입된 스크립트에는 필요한 값만 전달 — [chrome.storage](https://developer.chrome.com/docs/extensions/reference/api/storage)

## 3.1 BYOK API 키·전송 데이터 관리
- 전송 범위 최소화 설계 ([02 보고서](02_field_mapping.md) 4.1)
  - 필드 매핑: 스키마 키 목록 + 페이지 필드 정보(label·placeholder·옵션)만 전송, **이력서 값 미전송**
  - 드롭다운 옵션 선택: 해당 항목 값 1개 + 옵션 목록만 전송
  - 장애·보훈 등 민감정보 항목은 LLM 전송 대상에서 제외
- API 키 보관
  - `chrome.storage.local` 저장, `sync` 미사용 (다른 기기로 키 복제 방지)
  - content script 접근 차단, API 호출은 service worker에서만 수행 → 웹 페이지 스크립트로의 키 노출 방지
  - JSON 내보내기·백업 파일에서 API 키 제외
  - 옵션 화면에 키 일부만 표시(마스킹), 삭제 버튼 제공
- 사용자 고지: 최초 사용 시 "어떤 정보가 어느 제공자로 전송되는지" 명시 후 동의, 제공자 요금은 사용자 부담임을 안내

## 4. 채용 사이트 이용약관
- 사람인·잡코리아·원티드 등 각 사이트 약관상 **자동화 도구 사용 제한 조항 여부: 미조사**
- 관찰: 원티드는 공식 자동 입력 확장 직접 배포 (자사 이력서 → 타 기업 채용 사이트) — [Extension Auditor](https://extensionauditor.com/scan/kghpojihbihjlicjokikldciiceafoll)
- 위험 완화 원칙 (해외 상용 확장 공통 관행)
  - **자동 제출 금지**: 입력까지만 수행, 제출은 사용자가 검토 후 직접 클릭
  - 사용자 클릭 시에만 동작 (백그라운드 대량 지원·크롤링 없음)
  - 사이트 서버에 비정상 요청 생성 없음 (DOM 입력만 수행)
- 배포 전 주요 대상 사이트 약관 확인 필요
