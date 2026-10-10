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
const FIXTURE_ORIGIN = 'http://localhost';
const BASICS_SUMMARY = '입력 완료 9개 · 입력 실패 1개 · 해당 없음 1개';

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

/** 이력서 저장 → fixture 열기 → 팝업 '작성' → 팝업 요약 확인 */
async function runFill(
  context: BrowserContext,
  worker: Worker,
  extensionId: string,
  fixture = 'basics.html',
  summary = BASICS_SUMMARY,
  data = resume,
) {
  await worker.evaluate((value) => chrome.storage.local.set({ resume: value, resume$: { v: 1 } }), data);

  const page = await context.newPage();
  await page.goto(`${FIXTURE_ORIGIN}/${fixture}`);
  await page.bringToFront();

  // 팝업을 비활성 탭으로 열어 fixture 탭이 활성 탭으로 남게 함 (팝업이 활성 탭 대상으로 동작)
  const popupOpened = context.waitForEvent('page');
  await worker.evaluate((url) => chrome.tabs.create({ url, active: false }), `chrome-extension://${extensionId}/popup.html`);
  const popup = await popupOpened;
  await popup.getByRole('button', { name: '작성' }).click();
  await expect(popup.getByText(summary)).toBeVisible();
  return { page, popup };
}

test('작성 → 페이지 입력 + 사이드 패널 결과·복사·재실행 갱신', async ({ context, worker, extensionId }) => {
  const { page, popup } = await runFill(context, worker, extensionId);

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
  const failedCopy = panel.getByRole('listitem').filter({ hasText: '우편번호 앞 3자리' }).getByRole('button', { name: /^복사/ });
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

test('사이드 패널 직접 입력·입력란 이동·위치 표시·되돌리기', async ({ context, worker, extensionId }) => {
  const { page } = await runFill(context, worker, extensionId);
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await expect(panel.getByText('입력 완료 9 · 확인 필요 1 · 해당 없음 1')).toBeVisible();

  // 위치 표시 (highlight): Shadow Root 안 상태별 테두리 박스 (Playwright CSS 선택자는 open shadow root 관통)
  const boxes = page.locator('[data-status]');
  await panel.getByRole('button', { name: '입력 항목 위치 보기' }).click();
  await expect(boxes).toHaveCount(11);
  await expect(page.locator('[data-status=filled]')).toHaveCount(9);
  await expect(page.locator('[data-status=failed]')).toHaveCount(1);

  // 해당 없음 입력란에 이력서 항목 골라 입력 (fillOne)
  await panel.getByText('해당 없음 1개').click();
  await panel.getByLabel('회사 이름 이력서 항목').selectOption({ label: '이메일' });
  await panel.getByRole('listitem').filter({ hasText: '회사 이름' }).getByRole('button', { name: '입력' }).click();
  await expect(panel.getByText('입력 완료 10 · 확인 필요 1 · 해당 없음 0')).toBeVisible();
  await expect(page.locator('#company')).toHaveValue('gildong@example.com');
  await expect(page.locator('[data-status=filled]')).toHaveCount(10);

  // 확인 필요 입력란으로 이동 (focusField)
  await panel.getByRole('listitem').filter({ hasText: '우편번호 앞 3자리' }).getByRole('button', { name: '이동' }).click();
  await expect(page.locator('#zip3')).toBeFocused();

  // 되돌리기 (undo): 자동 9개 + 직접 1개 복원, 결과 초기화
  await panel.getByRole('button', { name: '되돌리기' }).click();
  await expect(panel.getByRole('status')).toHaveText('10개 되돌림');
  await expect(panel.getByText("'작성'을 누르면 결과가 표시됩니다.")).toBeVisible();
  await expect(page.locator('#nm')).toHaveValue('');
  await expect(page.locator('#company')).toHaveValue('');
  await expect(page.locator('#intro')).toHaveValue('');
  await expect(boxes).toHaveCount(0);
});

test('입력란 형식 신호에 따라 날짜·전화번호 변환', async ({ context, worker, extensionId }) => {
  const { page } = await runFill(context, worker, extensionId, 'formats.html', '입력 완료 5개 · 입력 실패 0개 · 해당 없음 0개');
  await expect(page.locator('#birth-dot')).toHaveValue('1995.03.15');
  await expect(page.locator('#birth-8')).toHaveValue('19950315');
  await expect(page.locator('#birth-date')).toHaveValue('1995-03-15');
  await expect(page.locator('#phone-hyphen')).toHaveValue('010-1234-5678');
  await expect(page.locator('#phone-digits')).toHaveValue('01012345678');
});

test('섹션 문맥으로 학력·경력·자격증·어학·병역 항목 입력 + 날짜 변환 + select 선택', async ({ context, worker, extensionId }) => {
  const data: Resume = {
    ...resume,
    basics: { ...resume.basics, gender: 'male' },
    education: [
      { id: 'e1', level: 'university', school: { ko: '한국대학교' }, status: 'graduated', major: { ko: '컴퓨터공학' }, startDate: '2014-03', endDate: '2020-02', gpa: { value: 3.8, max: 4.5 } },
      { id: 'e2', level: 'master', school: { ko: '한국대학원' }, status: 'graduated', major: { ko: '인공지능' }, startDate: '2020-03', endDate: '2022-02', gpa: { value: 4.1, max: 4.5 } },
    ],
    work: [
      { id: 'w1', company: { ko: '가나다전자' }, department: '플랫폼팀', startDate: '2022-03', endDate: '2025-12', current: false, description: 'API 서버 개발', employmentType: 'full_time' },
    ],
    certificates: [{ id: 'c1', name: '정보처리기사', issuer: '한국산업인력공단', date: '2021-06-18' }],
    languageTests: [{ id: 'l1', language: 'en', exam: 'TOEIC', score: '900', date: '2023-05-20' }],
    military: { status: 'served', branch: 'army', endDate: '2016-01' },
  };
  const { page } = await runFill(context, worker, extensionId, 'sections.html', '입력 완료 31개 · 입력 실패 0개 · 해당 없음 1개', data);

  await expect(page.locator('#nm')).toHaveValue('홍길동');
  await expect(page.locator('#school-0')).toHaveValue('한국대학교');
  await expect(page.locator('#major-1')).toHaveValue('인공지능');
  await expect(page.locator('#edu-start-0')).toHaveValue('2014.03');
  await expect(page.locator('#edu-end-1')).toHaveValue('202202');
  await expect(page.locator('#gpa-1')).toHaveValue('4.1');
  await expect(page.locator('#company')).toHaveValue('가나다전자');
  await expect(page.locator('#dept')).toHaveValue('플랫폼팀');
  await expect(page.locator('#work-end')).toHaveValue('2025-12');
  await expect(page.locator('#duty')).toHaveValue('API 서버 개발');
  // 경력 섹션 안 '주소'는 기본 주소로 입력하지 않음
  await expect(page.locator('#work-addr')).toHaveValue('');
  // 자격증·어학: 연월일 값을 입력란 형식대로 (연월 입력란에는 연월만)
  await expect(page.locator('#cert-name')).toHaveValue('정보처리기사');
  await expect(page.locator('#cert-issuer')).toHaveValue('한국산업인력공단');
  await expect(page.locator('#cert-date')).toHaveValue('2021.06.18');
  await expect(page.locator('#lang-exam')).toHaveValue('TOEIC');
  await expect(page.locator('#lang-score')).toHaveValue('900');
  await expect(page.locator('#lang-date')).toHaveValue('2023.05');
  // select: 표시명·동의어로 선택지 매칭
  await expect(page.locator('#gender')).toHaveValue('M');
  await expect(page.locator('#level-0')).toHaveValue('U');
  await expect(page.locator('#level-1')).toHaveValue('M');
  await expect(page.locator('#grad-0')).toHaveValue('1');
  await expect(page.locator('#emp')).toHaveValue('FT');
  await expect(page.locator('#mil-status')).toHaveValue('1');
  await expect(page.locator('#mil-branch')).toHaveValue('A');
  await expect(page.locator('#mil-end')).toHaveValue('2016.01');

  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await expect(panel.getByText('학교명 → 학력 2 학교명')).toBeVisible();
  await expect(panel.getByText('입사년월 → 경력 1 입사 연월')).toBeVisible();
});

test('직접 입력 → 학습 규칙 저장 → 재실행 시 자동 입력', async ({ context, worker, extensionId }) => {
  const { page, popup } = await runFill(context, worker, extensionId);
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  await panel.getByText('해당 없음 1개').click();
  await panel.getByLabel('회사 이름 이력서 항목').selectOption({ label: '이메일' });
  await panel.getByRole('listitem').filter({ hasText: '회사 이름' }).getByRole('button', { name: '입력' }).click();
  await expect(panel.getByText('입력 완료 10 · 확인 필요 1 · 해당 없음 0')).toBeVisible();

  const rules = await worker.evaluate(async () => (await chrome.storage.local.get('learnedRules')).learnedRules);
  expect(rules).toMatchObject([
    { origin: 'http://localhost', fingerprint: '["text","","company","회사 이름"]', schemaKey: 'basics.email' },
  ]);

  // 값 지운 뒤 재실행 → 학습 규칙으로 입력
  await page.locator('#company').fill('');
  await page.bringToFront();
  await popup.getByRole('button', { name: '작성' }).click();
  await expect(popup.getByText('입력 완료 10개 · 입력 실패 1개 · 해당 없음 0개')).toBeVisible();
  await expect(page.locator('#company')).toHaveValue('gildong@example.com');
  await expect(panel.getByText('회사 이름 → 이메일 (학습)')).toBeVisible();

  // 옵션 화면 학습 규칙 조회·삭제
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  await options.getByRole('button', { name: '학습 규칙' }).click();
  const row = options.getByRole('row').filter({ hasText: '회사 이름' });
  await expect(row).toContainText('localhost');
  await expect(row).toContainText('이메일');
  await row.getByRole('button', { name: '삭제' }).click();
  await expect(options.getByText('학습된 규칙이 없습니다.')).toBeVisible();
  expect(await worker.evaluate(async () => (await chrome.storage.local.get('learnedRules')).learnedRules)).toEqual([]);
});
