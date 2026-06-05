export const FROM_LANDING_KEY = 'wongjra-from-landing';

export function markFromLanding(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(FROM_LANDING_KEY, '1');
}

export function isPageReload(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (nav) return nav.type === 'reload';
  const legacy = performance as Performance & { navigation?: { type?: number } };
  return legacy.navigation?.type === 1;
}

export function shouldPlayLandingIntro(): boolean {
  if (typeof window === 'undefined') return false;
  if (isPageReload()) return false;
  return sessionStorage.getItem(FROM_LANDING_KEY) === '1';
}

export function clearFromLanding(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(FROM_LANDING_KEY);
}
