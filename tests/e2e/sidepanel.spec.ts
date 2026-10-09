import path from 'node:path';
import { chromium, expect, test as base, type BrowserContext, type Worker } from '@playwright/test';
import type { Resume } from '@/core/schema/resume';

// 자동 입력 → 사이드 패널 결과 표시 E2E
// - e2e 빌드는 http://localhost/* 호스트 권한 보유 (wxt.config.ts) → 툴바 클릭 없이 filler 주입 가능
// - fixture는 실제 서버 없이 route로 응답
// - 사이드 패널은 탭으로 열어 확인 (Playwright로 브라우저 사이드 패널 UI 조작 불가)

// worker.evaluate 콜백은 service worker에서 실행 → WXT browser 타입으로 chrome 전역 선언
declare const chrome: typeof browser;

const EXTENSION_PATH = path.resolve('.output/chrome-mv3-e2e');
const FIXTURE_DIR = path.resolve('tests/e2e/fixtures');
const FIXTURE_URL = 'http://localhost/basics.html';

const resume: Resume = {
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

const test = base.extend<{ context: BrowserContext; worker: Worker; extensionId: string }>({
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

test('작성 → 페이지 입력 + 사이드 패널 결과·복사·재실행 갱신', async ({ context, worker, extensionId }) => {
  await worker.evaluate((value) => chrome.storage.local.set({ resume: value, resume$: { v: 1 } }), resume);

  const page = await context.newPage();
  await page.goto(FIXTURE_URL);
  await page.bringToFront();

  // 팝업을 비활성 탭으로 열어 fixture 탭이 활성 탭으로 남게 함 (팝업이 활성 탭 대상으로 동작)
  const popupOpened = context.waitForEvent('page');
  await worker.evaluate((url) => chrome.tabs.create({ url, active: false }), `chrome-extension://${extensionId}/popup.html`);
  const popup = await popupOpened;
  await popup.getByRole('button', { name: '작성' }).click();
  await expect(popup.getByText('입력 완료 9개 · 입력 실패 1개 · 해당 없음 1개')).toBeVisible();

  // 클릭 제스처 안에서 사이드 패널 열림
  const sidePanelCount = () =>
    worker.evaluate(async () => (await chrome.runtime.getContexts({ contextTypes: ['SIDE_PANEL'] })).length);
  await expect.poll(sidePanelCount).toBe(1);

  // 페이지 입력 결과
  await expect(page.locator('#nm')).toHaveValue('홍길동');
  await expect(page.locator('[name=field2]')).toHaveValue('Gildong Hong');
  await expect(page.locator('#a2')).toHaveValue('101호');
  await expect(page.locator('#intro')).toHaveValue('백엔드 개발자');
  await expect(page.locator('#zip3')).toHaveValue('');
  await expect(page.locator('#company')).toHaveValue('');

  // 사이드 패널 결과
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await expect(panel.getByText('입력 완료 9 · 확인 필요 1 · 해당 없음 1')).toBeVisible();
  await expect(panel.getByText('→ 우편번호 (글자수 제한 초과)')).toBeVisible();
  await expect(panel.getByText('성명 * → 이름')).toBeVisible();
  await panel.getByText('해당 없음 1개').click();
  await expect(panel.getByText('회사 이름')).toBeVisible();

  // 확인 필요 항목 복사 → 페이지에 붙여넣기로 클립보드 확인 (확장 출처는 클립보드 권한 부여 불가)
  await panel.bringToFront();
  const failedCopy = panel.getByRole('listitem').filter({ hasText: '우편번호 앞 3자리' }).getByRole('button');
  await failedCopy.click();
  await expect(failedCopy).toHaveText('복사됨');
  await page.bringToFront();
  await page.locator('#company').focus();
  await page.keyboard.press('Control+V');
  await expect(page.locator('#company')).toHaveValue('06236');

  // 재실행 시 사이드 패널 갱신: 글자수 제한을 풀면 확인 필요 0
  await page.locator('#zip3').evaluate((el: HTMLInputElement) => el.removeAttribute('maxlength'));
  await page.bringToFront();
  await popup.getByRole('button', { name: '작성' }).click();
  await expect(popup.getByText('입력 완료 10개 · 입력 실패 0개 · 해당 없음 1개')).toBeVisible();
  await expect(panel.getByText('입력 완료 10 · 확인 필요 0 · 해당 없음 1')).toBeVisible();
});
