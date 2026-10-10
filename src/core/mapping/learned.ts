import type { FieldDescriptor } from '@/messaging/protocol';

// 사용자 직접 입력 기반 학습 규칙: docs/design/architecture.md 5장·7.2
// 사이드 패널 직접 입력 성공 시 저장 → 다음 자동 입력에서 매핑 1순위

export interface LearnedRule {
  origin: string;
  fingerprint: string;
  schemaKey: string;
  updatedAt: string;        // ISO 시각
}

/** 입력란 안정 식별자 (widget·name·id·표시 텍스트). 식별 정보가 없으면 undefined → 학습 안 함 */
export function fieldFingerprint(
  field: Pick<FieldDescriptor, 'widget' | 'name' | 'id' | 'label' | 'ariaLabel' | 'placeholder'>,
): string | undefined {
  const text = field.label ?? field.ariaLabel ?? field.placeholder;
  if (!field.name && !field.id && !text) return undefined;
  return JSON.stringify([field.widget, field.name ?? '', field.id ?? '', text ?? '']);
}

/** fingerprint 표시명: 표시 텍스트 → name → id (옵션 화면 학습 규칙 목록) */
export function fingerprintLabel(fingerprint: string): string {
  try {
    const [, name, id, text] = JSON.parse(fingerprint) as string[];
    return text || name || id || fingerprint;
  } catch {
    return fingerprint;
  }
}

/** origin + fingerprint 규칙 제거 */
export function removeRule(rules: LearnedRule[], origin: string, fingerprint: string): LearnedRule[] {
  return rules.filter((r) => r.origin !== origin || r.fingerprint !== fingerprint);
}

/** 같은 origin + fingerprint 규칙은 교체 */
export function upsertRule(rules: LearnedRule[], rule: LearnedRule): LearnedRule[] {
  return [...removeRule(rules, rule.origin, rule.fingerprint), rule];
}

/** fingerprint → schemaKey (해당 origin 규칙만) */
export function rulesForOrigin(rules: LearnedRule[], origin: string): Map<string, string> {
  return new Map(rules.filter((r) => r.origin === origin).map((r) => [r.fingerprint, r.schemaKey]));
}
