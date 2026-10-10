import { fieldFingerprint } from './learned';
import type { FieldDescriptor, FillPlan, FillReport, FillResult, PageDetails, ReportField } from '@/messaging/protocol';

// 사이드 패널 입력 결과: docs/design/screens.md 3장 ①

function displayLabel(field: FieldDescriptor): string {
  return field.label ?? field.ariaLabel ?? field.placeholder ?? field.name ?? field.id ?? '이름 없는 입력란';
}

export function buildFillReport(
  details: PageDetails,
  plan: FillPlan,
  result: FillResult,
  tabId: number,
  at = new Date(),
): FillReport {
  const items = new Map(plan.items.map((i) => [i.fieldId, i]));
  const filled = new Set(result.filled.map((f) => f.fieldId));
  const failed = new Map(result.failed.map((f) => [f.fieldId, f.reason]));
  // 반복 블록처럼 같은 fingerprint가 여러 입력란에 있으면 학습 제외 (한 블록 규칙이 모든 블록에 적용되는 문제 방지)
  const fingerprints = details.fields.map(fieldFingerprint);
  const isUnique = (fp?: string) => fingerprints.indexOf(fp) === fingerprints.lastIndexOf(fp);

  const fields = details.fields.map((field, i): ReportField => {
    const hint = { widget: field.widget, placeholder: field.placeholder, maxLength: field.maxLength };
    const fingerprint = isUnique(fingerprints[i]) ? fingerprints[i] : undefined;
    const base = { fieldId: field.fieldId, label: displayLabel(field), hint, fingerprint };
    const item = items.get(field.fieldId);
    if (!item) return { ...base, status: 'unmatched' };
    const { schemaKey, source } = item;
    if (filled.has(field.fieldId)) return { ...base, status: 'filled', schemaKey, source };
    return { ...base, status: 'failed', schemaKey, reason: failed.get(field.fieldId) ?? 'not-applied' };
  });

  return { tabId, url: details.url, at: at.toISOString(), fields };
}

/** 사이드 패널 직접 입력(fillOne) 결과를 해당 입력란에 반영 */
export function applyFillOne(report: FillReport, fieldId: string, schemaKey: string, result: FillResult): FillReport {
  const failed = result.failed.find((f) => f.fieldId === fieldId);
  const fields = report.fields.map((field): ReportField => {
    if (field.fieldId !== fieldId) return field;
    const base = { fieldId, label: field.label, hint: field.hint, fingerprint: field.fingerprint, schemaKey };
    if (result.filled.some((f) => f.fieldId === fieldId)) return { ...base, status: 'filled', source: 'manual' };
    return { ...base, status: 'failed', reason: failed?.reason ?? 'not-applied' };
  });
  return { ...report, fields };
}
