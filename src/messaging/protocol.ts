import { defineExtensionMessaging } from '@webext-core/messaging';

// 메시지 규격: docs/design/architecture.md 5·6장
// 현재 범위: 최상위 프레임의 text·textarea·date 입력란만 처리

export type WidgetKind = 'text' | 'textarea' | 'date';

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
}

/** 형식 변환(core/format) 판단에 쓰는 입력란 정보 */
export type FormatHint = Pick<FieldDescriptor, 'widget' | 'placeholder' | 'maxLength'>;

export interface PageDetails {
  url: string;              // origin + pathname만 (쿼리 제거)
  fields: FieldDescriptor[];
}

export type MatchSource = 'autocomplete' | 'rule' | 'manual';

/** background → content script: 무엇을 어디에 넣을지 */
export interface FillPlan {
  items: { fieldId: string; schemaKey: string; value: string; source: MatchSource }[];
  unmatched: string[];      // 매핑 실패 또는 이력서 값 없음
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
  reason?: string;          // failed 사유 코드 (not-found·too-long·not-applied)
  hint: FormatHint;         // fillOne·복사 시 같은 형식 변환 적용
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

export type ErrorResponse = { status: 'error'; message: string };
export type ActionResponse = { status: 'ok' } | ErrorResponse;
export type UndoResponse = { status: 'ok'; restored: number } | ErrorResponse;

// focusField·undo: sidepanel → background(runtime 메시지)와 background → filler(tabs 메시지)에 같은 이름 사용
interface ProtocolMap {
  startFill(data: { tabId: number }): StartFillResponse;
  collect(): PageDetails;
  fill(plan: FillPlan): FillResult;
  fillOne(data: { fieldId: string; schemaKey: string }): ActionResponse;
  focusField(data: { fieldId: string }): ActionResponse;
  undo(): UndoResponse;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
