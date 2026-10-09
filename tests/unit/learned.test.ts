import { describe, expect, it } from 'vitest';
import { fieldFingerprint, rulesForOrigin, upsertRule, type LearnedRule } from '@/core/mapping/learned';

const rule = (props: Partial<LearnedRule>): LearnedRule => ({
  origin: 'https://a.com',
  fingerprint: 'fp',
  schemaKey: 'basics.email',
  updatedAt: '2026-10-09T00:00:00.000Z',
  ...props,
});

describe('fieldFingerprint', () => {
  it('widget·name·id·표시 텍스트 조합, 텍스트는 label → ariaLabel → placeholder', () => {
    expect(fieldFingerprint({ widget: 'text', name: 'n', id: 'i', label: '회사', placeholder: 'p' })).toBe('["text","n","i","회사"]');
    expect(fieldFingerprint({ widget: 'text', ariaLabel: '회사', placeholder: 'p' })).toBe('["text","","","회사"]');
    expect(fieldFingerprint({ widget: 'textarea', placeholder: 'p' })).toBe('["textarea","","","p"]');
  });

  it('식별 정보 없으면 undefined', () => {
    expect(fieldFingerprint({ widget: 'text' })).toBeUndefined();
  });
});

describe('upsertRule', () => {
  it('같은 origin + fingerprint는 교체, 그 외는 추가', () => {
    const rules = [rule({}), rule({ origin: 'https://b.com' })];
    const replaced = upsertRule(rules, rule({ schemaKey: 'basics.name.ko' }));
    expect(replaced).toHaveLength(2);
    expect(replaced.find((r) => r.origin === 'https://a.com')?.schemaKey).toBe('basics.name.ko');
    expect(upsertRule(rules, rule({ fingerprint: 'other' }))).toHaveLength(3);
  });
});

describe('rulesForOrigin', () => {
  it('해당 origin 규칙만 fingerprint → schemaKey', () => {
    const map = rulesForOrigin([rule({}), rule({ origin: 'https://b.com', fingerprint: 'fp2' })], 'https://a.com');
    expect([...map]).toEqual([['fp', 'basics.email']]);
  });
});
