import { defineExtensionMessaging } from '@webext-core/messaging';

// 메시지 규격: docs/design/architecture.md 5·6장
// 현재 범위: 최상위 프레임 + 주입 가능한(같은 출처) iframe의 text·textarea·date 입력란, 기본 select, radio 그룹, 단일 checkbox, checkbox 그룹, ARIA 콤보박스, 파일

export type WidgetKind = 'text' | 'textarea' | 'date' | 'select' | 'radio' | 'checkbox' | 'checkboxes' | 'combobox' | 'file';

/** content script → background: 페이지에서 수집한 필드 정보 (값 미포함) */
export interface FieldDescriptor {
  fieldId: string;          // content script 내부 인덱스 (DOM에 속성 추가 안 함)
  widget: WidgetKind;
  label?: string;
  name?: string;
  id?: string;
  placeholder?: string;
  autocomplete?: string;
  ariaLabel?: string;
  maxLength?: number;
  section?: string;         // 소속 섹션 텍스트 (fieldset legend → 직전 제목)
  options?: { value: string; text: string }[]; // select·radio·checkbox 그룹 선택지 (페이지 정보, 이력서 값 아님)
  cluster?: string;         // 같은 묶음(가까운 공통 조상)의 입력란 식별자 — 분리 입력(전화번호 3칸 등) 판별용
  accept?: string;          // 파일 입력란 accept 속성
  readOnly?: boolean;       // 달력 팝업형 날짜 입력란 (readonly, 날짜 키만 입력)
}

/** 형식 변환(core/format)·첨부 파일 선택 판단에 쓰는 입력란 정보 */
export type FormatHint = Pick<FieldDescriptor, 'widget' | 'placeholder' | 'maxLength' | 'options' | 'accept'>;
/** 반복 항목 '추가' 버튼 (섹션 판별은 background, core/mapping/match.ts blocksToAdd) */
export interface AddButton {
  buttonId: string;         // filler 메모리 인덱스 (fieldId와 별개)
  label?: string;           // 표시 텍스트
  ariaLabel?: string;
  section?: string;         // 소속 섹션 텍스트 (fieldset legend → 직전 제목)
}

export interface PageDetails {
  url: string;              // origin + pathname만 (쿼리 제거)
  fields: FieldDescriptor[];
  addButtons?: AddButton[];
}

export type MatchSource = 'learned' | 'autocomplete' | 'rule' | 'manual';

/** background → content script: 무엇을 어디에 넣을지 */
export interface FillPlan {
  items: { fieldId: string; schemaKey: string; value: string; source: MatchSource }[];
  unmatched: string[];      // 매핑 실패 또는 이력서 값 없음
  skipped?: { fieldId: string; schemaKey: string; reason: 'no-option' | 'no-file' }[]; // 매핑됐으나 입력 불가 (선택지 불일치·첨부 파일 본문 없음)
}

/** content script → background: 입력 결과 */
export interface FillResult {
  filled: { fieldId: string; strategy: string }[];
  failed: { fieldId: string; reason: string }[];
  formChanged?: boolean; // 입력 중 사이트가 입력란을 새로 그림 (학력구분 선택 시 폼 전환 등) → 다시 수집·입력
}

/** 사이드 패널 표시용 입력란별 결과 (background → session:fillReport) */
export interface ReportField {
  fieldId: string;
  label: string;            // label → ariaLabel → placeholder → name → id 순 대체
  status: 'filled' | 'failed' | 'unmatched';
  schemaKey?: string;
  reason?: string;          // failed 사유 코드 (not-found·too-long·not-applied·no-option·no-file)
  hint: FormatHint;         // fillOne·복사 시 같은 형식 변환 적용
  fingerprint?: string;     // 학습 규칙 식별자 (core/mapping/learned.ts)
  source?: MatchSource;     // 입력 완료 시 매핑 출처
}

export interface FillReport {
  tabId: number;            // fillOne·focusField·undo 대상 탭
  frameIds?: number[];      // filler를 주입한 프레임 (highlight·undo 대상, 없으면 최상위 프레임만)
  url: string;
  at: string;               // ISO 시각
  fields: ReportField[];    // 페이지 순서
}

export type StartFillResponse =
  | { status: 'ok'; filled: number; failed: number; unmatched: number; added: number } // added: '추가' 버튼으로 늘린 블록 수
  | { status: 'excluded' | 'user-excluded' | 'no-resume' }
  | { status: 'needs-permission'; origins: string[] } // 권한 없는 교차 출처 iframe (팝업에서 허용 또는 부분 입력)
  | { status: 'error'; message: string };

/** '작성' 결과 문구 (팝업·사이드 패널 공용) */
export function describeStartFill(res: StartFillResponse): string {
  switch (res.status) {
    case 'ok':
      return `입력 완료 ${res.filled}개 · 입력 실패 ${res.failed}개 · 해당 없음 ${res.unmatched}개${res.added ? ` · 블록 추가 ${res.added}개` : ''}`;
    case 'excluded':
      return '이용약관상 자동 입력을 지원하지 않는 사이트입니다.';
    case 'user-excluded':
      return '설정에서 자동 입력을 제외한 사이트입니다.';
    case 'needs-permission':
      return `다른 사이트(${res.origins.join(', ')})의 입력 영역에 접근하려면 툴바 아이콘의 '작성'에서 허용이 필요합니다.`;
    case 'no-resume':
      return '저장된 이력서가 없습니다.';
    case 'error':
      return `입력하지 못했습니다: ${res.message}`;
  }
}

export type StartImportResponse =
  | { status: 'ok'; count: number }
  | { status: 'excluded' | 'user-excluded' | 'empty' }
  | { status: 'error'; message: string };

/** '가져오기' 결과 문구 (팝업) */
export function describeStartImport(res: StartImportResponse): string {
  switch (res.status) {
    case 'ok':
      return `이력서 항목 ${res.count}개를 읽었습니다. 미리 보기에서 반영할 항목을 골라 주세요.`;
    case 'excluded':
      return '이용약관상 가져오기를 지원하지 않는 사이트입니다.';
    case 'user-excluded':
      return '설정에서 제외한 사이트입니다.';
    case 'empty':
      return '이 페이지에서 가져올 이력서 값을 찾지 못했습니다. 이력서 수정 페이지에서 다시 시도해 주세요.';
    case 'error':
      return `가져오지 못했습니다: ${res.message}`;
  }
}

export type ErrorResponse = { status: 'error'; message: string };
export type ActionResponse = { status: 'ok' } | ErrorResponse;
export type UndoResponse = { status: 'ok'; restored: number } | ErrorResponse;

// focusField·highlight·undo: sidepanel → background(runtime 메시지)와 background → filler(tabs 메시지)에 같은 이름 사용
interface ProtocolMap {
  /** partial: 권한 없는 교차 출처 iframe은 건너뛰고 입력 ('이 페이지 부분만 입력') */
  startFill(data: { tabId: number; partial?: boolean }): StartFillResponse;
  collect(): PageDetails;
  /** 이력서 가져오기 (architecture.md 7.4): 결과는 session:importDraft */
  startImport(data: { tabId: number }): StartImportResponse;
  /** 마지막 collect로 매긴 입력란의 현재 값 (빈 값·파일 제외) */
  readValues(): { fieldId: string; value: string }[];
  /** 반복 항목 '추가' 버튼을 count번 클릭 (새 입력란이 생길 때까지 대기, 생기지 않으면 중단) → 실제 추가 횟수 */
  addBlocks(data: { buttonId: string; count: number }): { added: number };
  fill(plan: FillPlan): FillResult;
  /** optionValue: select 선택지 직접 선택 (이력서 값 대신 해당 선택지 입력 + 학습) */
  fillOne(data: { fieldId: string; schemaKey: string; optionValue?: string }): ActionResponse;
  /** 자기소개서 라이브러리 답변 입력 (사이드 패널 '자기소개서 추천', 학습 없음) */
  fillAnswer(data: { fieldId: string; coverLetterId: string }): ActionResponse;
  focusField(data: { fieldId: string }): ActionResponse;
  /** 입력란 위치 표시, 빈 배열이면 해제 */
  highlight(data: { fields: Pick<ReportField, 'fieldId' | 'status'>[] }): ActionResponse;
  undo(): UndoResponse;
  /** filler → background: 사용자가 페이지에서 직접 바꾼 입력란 값 (같은 값의 이력서 항목이면 결과 갱신·학습) */
  userEdit(data: { fieldId: string; value: string }): void;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
