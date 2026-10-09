// 사이트 정책: docs/design/architecture.md 9장
// linkedin.com — 이용약관상 확장 프로그램의 활동 자동화·화면 변경 금지 (docs/reports/05_privacy_and_policy.md 4.1)
export const DEFAULT_EXCLUDED_DOMAINS = ['linkedin.com'];

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
