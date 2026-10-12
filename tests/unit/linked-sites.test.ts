import { describe, expect, it } from 'vitest';
import { markFilled, needsUpdate, normalizeSiteUrl, type LinkedSite } from '@/core/linked-sites';

describe('normalizeSiteUrl', () => {
  it('스킴 없으면 https 보완, http(s)만 허용', () => {
    expect(normalizeSiteUrl(' www.saramin.co.kr/resume ')).toBe('https://www.saramin.co.kr/resume');
    expect(normalizeSiteUrl('http://localhost/basics.html')).toBe('http://localhost/basics.html');
    expect(normalizeSiteUrl('ftp://a.com')).toBeUndefined();
    expect(normalizeSiteUrl('saramin')).toBeUndefined();
    expect(normalizeSiteUrl('')).toBeUndefined();
  });
});

describe('markFilled', () => {
  const sites: LinkedSite[] = [
    { id: 'a', name: 'A', url: 'https://a.com/resume' },
    { id: 'b', name: 'B', url: 'https://b.com/resume' },
  ];
  const now = new Date('2026-10-12T00:00:00Z');

  it('탭 출처와 같은 사이트만 작성 시각 기록 (경로 무관)', () => {
    const next = markFilled(sites, 'https://a.com/other?x=1', now);
    expect(next[0]?.lastFilledAt).toBe('2026-10-12T00:00:00.000Z');
    expect(next[1]?.lastFilledAt).toBeUndefined();
  });

  it('해당 사이트 없으면 같은 배열', () => {
    expect(markFilled(sites, 'https://c.com/', now)).toBe(sites);
    expect(markFilled(sites, 'not a url', now)).toBe(sites);
  });
});

describe('needsUpdate', () => {
  const site: LinkedSite = { id: 'a', name: 'A', url: 'https://a.com', lastFilledAt: '2026-10-10T00:00:00.000Z' };

  it('작성한 적 없거나 이력서가 더 최근에 수정되면 갱신 필요', () => {
    expect(needsUpdate({ ...site, lastFilledAt: undefined }, '2026-10-01T00:00:00.000Z')).toBe(true);
    expect(needsUpdate(site, '2026-10-11T00:00:00.000Z')).toBe(true);
    expect(needsUpdate(site, '2026-10-09T00:00:00.000Z')).toBe(false);
    expect(needsUpdate(site)).toBe(false);
  });
});
