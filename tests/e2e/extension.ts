import path from 'node:path';
import { chromium, test as base, type BrowserContext, type Worker } from '@playwright/test';
import type { Resume } from '@/core/schema/resume';

// E2E 공용: 확장 프로그램 로드한 Chromium + fixture 응답 + 예시 이력서
// - e2e 빌드는 http://localhost/* 호스트 권한 보유 (wxt.config.ts) → 툴바 클릭 없이 filler 주입 가능
// - fixture는 실제 서버 없이 route로 응답

export { expect } from '@playwright/test';

const EXTENSION_PATH = path.resolve('.output/chrome-mv3-e2e');
const FIXTURE_DIR = path.resolve('tests/e2e/fixtures');
export const FIXTURE_ORIGIN = 'http://localhost';

export const resume: Resume = {
  meta: { schemaVersion: 1, updatedAt: '2026-10-09T00:00:00.000Z' },
  basics: {
    name: { ko: '홍길동', en: 'Gildong Hong' },
    birthDate: '1995-03-15',
    email: 'gildong@example.com',
    phone: { mobile: '010-1234-5678' },
    address: { postalCode: '06236', line1: '서울특별시 강남구 테헤란로 1', line2: '101호' },
    urls: [],
    summary: '백엔드 개발자',
  },
  education: [],
  work: [],
  languageTests: [],
  languages: [],
  certificates: [],
  awards: [],
  activities: [],
  projects: [],
  skills: [],
  attachments: [],
};

export const test = base.extend<{ context: BrowserContext; worker: Worker; extensionId: string }>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
    });
    await context.route('http://localhost/**', (route) =>
      route.fulfill({ path: path.join(FIXTURE_DIR, new URL(route.request().url()).pathname) }),
    );
    await use(context);
    await context.close();
  },
  worker: async ({ context }, use) => {
    await use(context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker')));
  },
  extensionId: async ({ worker }, use) => {
    await use(new URL(worker.url()).host);
  },
});
