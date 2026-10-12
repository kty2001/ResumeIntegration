import type { FillPlan, FillResult, PageDetails } from '@/messaging/protocol';

// iframe(같은 출처, 주입 가능한 프레임): docs/design/architecture.md 6장
// filler는 프레임마다 따로 수집하므로 fieldId를 '프레임id:로컬id'로 전체에서 고유하게 (최상위 프레임은 로컬 id 그대로)

export function globalFieldId(frameId: number, localId: string): string {
  return frameId === 0 ? localId : `${frameId}:${localId}`;
}

export function splitFieldId(fieldId: string): { frameId: number; localId: string } {
  const m = fieldId.match(/^(\d+):(.+)$/);
  return m ? { frameId: Number(m[1]), localId: m[2]! } : { frameId: 0, localId: fieldId };
}

/** 프레임별 수집 결과 → 하나로 (프레임 순서대로, fieldId·cluster·buttonId에 프레임 접두어). url은 최상위 프레임 */
export function mergeFrames(frames: { frameId: number; details: PageDetails }[]): PageDetails {
  const top = frames.find((f) => f.frameId === 0) ?? frames[0];
  return {
    url: top?.details.url ?? '',
    fields: frames.flatMap(({ frameId, details }) =>
      details.fields.map((f) => ({
        ...f,
        fieldId: globalFieldId(frameId, f.fieldId),
        cluster: f.cluster && globalFieldId(frameId, f.cluster),
      })),
    ),
    addButtons: frames.flatMap(({ frameId, details }) =>
      (details.addButtons ?? []).map((b) => ({ ...b, buttonId: globalFieldId(frameId, b.buttonId) })),
    ),
  };
}

/** 입력 계획 → 프레임별 입력 항목 (로컬 id) */
export function planByFrame(plan: FillPlan): Map<number, FillPlan> {
  const byFrame = new Map<number, FillPlan>();
  for (const item of plan.items) {
    const { frameId, localId } = splitFieldId(item.fieldId);
    if (!byFrame.has(frameId)) byFrame.set(frameId, { items: [], unmatched: [] });
    byFrame.get(frameId)!.items.push({ ...item, fieldId: localId });
  }
  return byFrame;
}

/** 프레임별 입력 결과 → 전체 id로 합침 */
export function mergeResults(results: { frameId: number; result: FillResult }[]): FillResult {
  const merged: FillResult = { filled: [], failed: [] };
  for (const { frameId, result } of results) {
    merged.filled.push(...result.filled.map((f) => ({ ...f, fieldId: globalFieldId(frameId, f.fieldId) })));
    merged.failed.push(...result.failed.map((f) => ({ ...f, fieldId: globalFieldId(frameId, f.fieldId) })));
  }
  return merged;
}
