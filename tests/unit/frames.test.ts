import { describe, expect, it } from 'vitest';
import { globalFieldId, mergeFrames, mergeResults, planByFrame, splitFieldId } from '@/core/frames';

describe('iframe fieldId', () => {
  it('최상위 프레임은 로컬 id 그대로, iframe은 프레임id:로컬id', () => {
    expect(globalFieldId(0, '3')).toBe('3');
    expect(globalFieldId(7, '3')).toBe('7:3');
    expect(splitFieldId('3')).toEqual({ frameId: 0, localId: '3' });
    expect(splitFieldId('7:3')).toEqual({ frameId: 7, localId: '3' });
  });

  it('mergeFrames: 프레임 순서대로 합치고 id·cluster에 접두어, url은 최상위 프레임', () => {
    const merged = mergeFrames([
      { frameId: 0, details: { url: 'https://a.com/apply', fields: [{ fieldId: '0', widget: 'text', cluster: '0' }] } },
      { frameId: 5, details: { url: 'https://a.com/frame', fields: [{ fieldId: '0', widget: 'text', cluster: '0' }, { fieldId: '1', widget: 'text' }] } },
    ]);
    expect(merged.url).toBe('https://a.com/apply');
    expect(merged.fields.map((f) => [f.fieldId, f.cluster])).toEqual([['0', '0'], ['5:0', '5:0'], ['5:1', undefined]]);
  });

  it('planByFrame·mergeResults: 프레임별 로컬 id로 나누고 결과는 전체 id로', () => {
    const plan = {
      items: [
        { fieldId: '0', schemaKey: 'basics.name.ko', value: '홍길동', source: 'rule' as const },
        { fieldId: '5:1', schemaKey: 'basics.email', value: 'a@b.c', source: 'rule' as const },
      ],
      unmatched: ['5:0'],
    };
    const byFrame = planByFrame(plan);
    expect([...byFrame.keys()]).toEqual([0, 5]);
    expect(byFrame.get(5)?.items[0]?.fieldId).toBe('1');
    expect(
      mergeResults([
        { frameId: 0, result: { filled: [{ fieldId: '0', strategy: 'text' }], failed: [] } },
        { frameId: 5, result: { filled: [], failed: [{ fieldId: '1', reason: 'not-applied' }] } },
      ]),
    ).toEqual({ filled: [{ fieldId: '0', strategy: 'text' }], failed: [{ fieldId: '5:1', reason: 'not-applied' }] });
  });
});
