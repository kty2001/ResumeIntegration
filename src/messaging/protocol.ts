import { defineExtensionMessaging } from '@webext-core/messaging';

// 메시지 규격: docs/design/architecture.md 5·6장
// 현재 범위: 최상위 프레임의 text·textarea 입력란만 처리

export type WidgetKind = 'text' | 'textarea';

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

export interface PageDetails {
  url: string;              // origin + pathname만 (쿼리 제거)
  fields: FieldDescriptor[];
}

export type MatchSource = 'autocomplete' | 'rule';

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

export type StartFillResponse =
  | { status: 'ok'; filled: number; failed: number; unmatched: number }
  | { status: 'excluded' | 'no-resume' }
  | { status: 'error'; message: string };

interface ProtocolMap {
  startFill(data: { tabId: number }): StartFillResponse;
  collect(): PageDetails;
  fill(plan: FillPlan): FillResult;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
