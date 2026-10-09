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
  const schemaKeys = new Map(plan.items.map((i) => [i.fieldId, i.schemaKey]));
  const filled = new Set(result.filled.map((f) => f.fieldId));
  const failed = new Map(result.failed.map((f) => [f.fieldId, f.reason]));

  const fields = details.fields.map((field): ReportField => {
    const base = { fieldId: field.fieldId, label: displayLabel(field) };
    const schemaKey = schemaKeys.get(field.fieldId);
    if (!schemaKey) return { ...base, status: 'unmatched' };
    if (filled.has(field.fieldId)) return { ...base, status: 'filled', schemaKey };
    return { ...base, status: 'failed', schemaKey, reason: failed.get(field.fieldId) ?? 'not-applied' };
  });

  return { tabId, url: details.url, at: at.toISOString(), fields };
}

/** 사이드 패널 직접 입력(fillOne) 결과를 해당 입력란에 반영 */
export function applyFillOne(report: FillReport, fieldId: string, schemaKey: string, result: FillResult): FillReport {
  const failed = result.failed.find((f) => f.fieldId === fieldId);
  const fields = report.fields.map((field): ReportField => {
    if (field.fieldId !== fieldId) return field;
    const base = { fieldId, label: field.label, schemaKey };
    if (result.filled.some((f) => f.fieldId === fieldId)) return { ...base, status: 'filled' };
    return { ...base, status: 'failed', reason: failed?.reason ?? 'not-applied' };
  });
  return { ...report, fields };
}
