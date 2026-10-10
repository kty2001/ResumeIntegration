import { defineExtensionMessaging } from '@webext-core/messaging';

// 메시지 규격: docs/design/architecture.md 5·6장
// 현재 범위: 최상위 프레임의 text·textarea·date 입력란, 기본 select

export type WidgetKind = 'text' | 'textarea' | 'date' | 'select';

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
  options?: { value: string; text: string }[]; // select 선택지 (페이지 정보, 이력서 값 아님)
}

/** 형식 변환(core/format) 판단에 쓰는 입력란 정보 */
export type FormatHint = Pick<FieldDescriptor, 'widget' | 'placeholder' | 'maxLength' | 'options'>;

export interface PageDetails {
  url: string;              // origin + pathname만 (쿼리 제거)
  fields: FieldDescriptor[];
}

export type MatchSource = 'learned' | 'autocomplete' | 'rule' | 'manual';

/** background → content script: 무엇을 어디에 넣을지 */
export interface FillPlan {
  items: { fieldId: string; schemaKey: string; value: string; source: MatchSource }[];
  unmatched: string[];      // 매핑 실패 또는 이력서 값 없음
  skipped?: { fieldId: string; schemaKey: string; reason: 'no-option' }[]; // 매핑됐으나 입력 불가 (select 선택지 불일치)
}

/** content script → background: 입력 결과 */
export interface FillResult {
  filled: { fieldId: string; strategy: string }[];
  failed: { fieldId: string; reason: string }[];
}

/** 사이드 패널 표시용 입력란별 결과 (background → session:fillReport) */
export interface ReportField {
  fieldId: string;
  label: string;            // label → ariaLabel → placeholder → name → id 순 대체
  status: 'filled' | 'failed' | 'unmatched';
  schemaKey?: string;
  reason?: string;          // failed 사유 코드 (not-found·too-long·not-applied·no-option)
  hint: FormatHint;         // fillOne·복사 시 같은 형식 변환 적용
  fingerprint?: string;     // 학습 규칙 식별자 (core/mapping/learned.ts)
  source?: MatchSource;     // 입력 완료 시 매핑 출처
}

export interface FillReport {
  tabId: number;            // fillOne·focusField·undo 대상 탭
  url: string;
  at: string;               // ISO 시각
  fields: ReportField[];    // 페이지 순서
}

export type StartFillResponse =
  | { status: 'ok'; filled: number; failed: number; unmatched: number }
  | { status: 'excluded' | 'no-resume' }
  | { status: 'error'; message: string };

/** '작성' 결과 문구 (팝업·사이드 패널 공용) */
export function describeStartFill(res: StartFillResponse): string {
  switch (res.status) {
    case 'ok':
      return `입력 완료 ${res.filled}개 · 입력 실패 ${res.failed}개 · 해당 없음 ${res.unmatched}개`;
    case 'excluded':
      return '이용약관상 자동 입력을 지원하지 않는 사이트입니다.';
    case 'no-resume':
      return '저장된 이력서가 없습니다.';
    case 'error':
      return `입력하지 못했습니다: ${res.message}`;
  }
}

export type ErrorResponse = { status: 'error'; message: string };
export type ActionResponse = { status: 'ok' } | ErrorResponse;
export type UndoResponse = { status: 'ok'; restored: number } | ErrorResponse;

// focusField·highlight·undo: sidepanel → background(runtime 메시지)와 background → filler(tabs 메시지)에 같은 이름 사용
interface ProtocolMap {
  startFill(data: { tabId: number }): StartFillResponse;
  collect(): PageDetails;
  fill(plan: FillPlan): FillResult;
  /** optionValue: select 선택지 직접 선택 (이력서 값 대신 해당 선택지 입력 + 학습) */
  fillOne(data: { fieldId: string; schemaKey: string; optionValue?: string }): ActionResponse;
  focusField(data: { fieldId: string }): ActionResponse;
  /** 입력란 위치 표시, 빈 배열이면 해제 */
  highlight(data: { fields: Pick<ReportField, 'fieldId' | 'status'>[] }): ActionResponse;
  undo(): UndoResponse;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
