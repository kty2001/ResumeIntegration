// 연동 사이트: docs/design/architecture.md 7.5
// 등록한 채용 사이트 이력서 페이지를 일괄로 열고, '작성' 성공 시 사이트별 마지막 작성 시각 기록

export interface LinkedSite {
  id: string;
  name: string;
  url: string;              // 이력서 수정 페이지
  lastFilledAt?: string;    // 마지막 '작성' 성공 시각 (ISO)
}

/** 사용자 입력 → 연동 사이트 URL. 스킴 없으면 https, http(s)만 허용, 형식이 아니면 undefined */
export function normalizeSiteUrl(input: string): string | undefined {
  let text = input.trim();
  if (!text) return undefined;
  if (!/^[a-z][a-z\d+.-]*:\/\//i.test(text)) text = `https://${text}`;
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    if (url.hostname !== 'localhost' && !url.hostname.includes('.')) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

function originOf(url: string): string | undefined {
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

/** 탭 출처와 같은 연동 사이트의 마지막 작성 시각 갱신 (해당 사이트가 없으면 같은 배열 반환) */
export function markFilled(sites: LinkedSite[], tabUrl: string, now = new Date()): LinkedSite[] {
  const origin = originOf(tabUrl);
  if (!origin || !sites.some((s) => originOf(s.url) === origin)) return sites;
  const at = now.toISOString();
  return sites.map((s) => (originOf(s.url) === origin ? { ...s, lastFilledAt: at } : s));
}

/** 갱신 필요: 작성한 적 없거나 마지막 작성 후 이력서가 수정됨 */
export function needsUpdate(site: LinkedSite, resumeUpdatedAt?: string): boolean {
  if (!site.lastFilledAt) return true;
  return !!resumeUpdatedAt && new Date(site.lastFilledAt) < new Date(resumeUpdatedAt);
}
