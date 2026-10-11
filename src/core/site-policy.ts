// 사이트 정책: docs/design/architecture.md 9장
// linkedin.com — 이용약관상 확장 프로그램의 활동 자동화·화면 변경 금지 (docs/reports/05_privacy_and_policy.md 4.1)
export const DEFAULT_EXCLUDED_DOMAINS = ['linkedin.com'];

/**
 * 사용자 입력(도메인 또는 URL) → 제외 목록용 도메인. 'https://www.example.com/jobs' → 'example.com'
 * 형식이 아니면 undefined
 */
export function normalizeDomain(input: string): string | undefined {
  let text = input.trim().toLowerCase();
  if (/^[a-z][a-z\d+.-]*:\/\//.test(text)) {
    try {
      text = new URL(text).hostname;
    } catch {
      return undefined;
    }
  }
  text = text.split(/[/?#:]/)[0]!.replace(/^www\./, '').replace(/\.$/, '');
  return text === 'localhost' || /^(?:[a-z\d-]+\.)+[a-z\d-]{2,}$/.test(text) ? text : undefined;
}

// 출처가 호스트 권한 패턴('https://*/*', 'http://127.0.0.1/*', 'https://*.example.com/*')에 해당하는지
export function matchesHostPattern(origin: string, pattern: string): boolean {
  const m = pattern.match(/^(\*|https?):\/\/([^/]+)\//);
  if (!m) return false;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  const scheme = m[1]!;
  const host = m[2]!;
  if (scheme !== '*' && `${scheme}:` !== url.protocol) return false;
  if (host === '*') return true;
  if (host.startsWith('*.')) return url.hostname === host.slice(2) || url.hostname.endsWith(host.slice(1));
  return url.hostname === host;
}

/** 제외 도메인 또는 그 서브도메인이면 true */
export function isExcluded(url: string, domains: string[] = DEFAULT_EXCLUDED_DOMAINS): boolean {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return false;
  }
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
}
