import { describe, expect, it } from 'vitest';
import {
  fieldFingerprint,
  fingerprintLabel,
  removeRule,
  rulesForOrigin,
  upsertRule,
  type LearnedRule,
} from '@/core/mapping/learned';

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

describe('removeRule', () => {
  it('같은 origin + fingerprint만 제거', () => {
    const rules = [rule({}), rule({ origin: 'https://b.com' }), rule({ fingerprint: 'other' })];
    expect(removeRule(rules, 'https://a.com', 'fp')).toEqual([rules[1], rules[2]]);
  });
});

describe('fingerprintLabel', () => {
  it('표시 텍스트 → name → id, 해석 불가 시 원문', () => {
    expect(fingerprintLabel('["text","n","i","회사 이름"]')).toBe('회사 이름');
    expect(fingerprintLabel('["text","n","i",""]')).toBe('n');
    expect(fingerprintLabel('["text","","i",""]')).toBe('i');
    expect(fingerprintLabel('fp')).toBe('fp');
  });
});

describe('rulesForOrigin', () => {
  it('해당 origin 규칙만 fingerprint → schemaKey·선택지', () => {
    const option = { value: 'university', text: '일반대학' };
    const map = rulesForOrigin(
      [rule({ option }), rule({ origin: 'https://b.com', fingerprint: 'fp2' })],
      'https://a.com',
    );
    expect([...map]).toEqual([['fp', { schemaKey: 'basics.email', option }]]);
  });
});
