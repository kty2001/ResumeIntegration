import type { BrowserContext, Worker } from '@playwright/test';
import type { Resume } from '@/core/schema/resume';
import { expect, FIXTURE_ORIGIN, resume, test } from './extension';

// 자동 입력 → 사이드 패널 결과 표시 E2E (확장 로드·fixture 응답은 extension.ts)
// - 사이드 패널은 탭으로 열어 확인 (Playwright로 브라우저 사이드 패널 UI 조작 불가)

// worker.evaluate 콜백은 service worker에서 실행 → WXT browser 타입으로 chrome 전역 선언
declare const chrome: typeof browser;

const BASICS_SUMMARY = '입력 완료 9개 · 입력 실패 1개 · 해당 없음 1개';

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

test('설정에서 제외한 사이트는 입력하지 않음', async ({ context, worker, extensionId }) => {
  await worker.evaluate(() => chrome.storage.local.set({ settings: { excludedSites: ['localhost'] } }));
  const { page } = await runFill(context, worker, extensionId, 'basics.html', '설정에서 자동 입력을 제외한 사이트입니다.');
  await expect(page.locator('#nm')).toHaveValue('');
});

test('같은 출처 iframe: 수집·입력, 사이드 패널 직접 입력·위치 표시·되돌리기', async ({ context, worker, extensionId }) => {
  const { page } = await runFill(context, worker, extensionId, 'iframe.html', '입력 완료 3개 · 입력 실패 0개 · 해당 없음 1개');
  const frame = page.frameLocator('iframe');
  await expect(page.locator('#nm')).toHaveValue('홍길동');
  await expect(frame.locator('#email')).toHaveValue('gildong@example.com');
  await expect(frame.locator('#phone')).toHaveValue('010-1234-5678');

  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await panel.getByText('해당 없음 1개').click();
  await panel.getByLabel('회사 이름 이력서 항목').selectOption({ label: '이메일' });
  await panel.getByRole('listitem').filter({ hasText: '회사 이름' }).getByRole('button', { name: '입력' }).click();
  await expect(panel.getByText('입력 완료 4 · 확인 필요 0 · 해당 없음 0')).toBeVisible();
  await expect(frame.locator('#company')).toHaveValue('gildong@example.com');

  // 위치 표시: iframe 안 입력란도 표시
  await panel.getByRole('button', { name: '입력 항목 위치 보기' }).click();
  await expect
    .poll(() => page.frames()[1]!.evaluate(() => document.documentElement.lastElementChild?.shadowRoot?.querySelectorAll('div').length ?? 0))
    .toBe(3);

  await panel.getByRole('button', { name: '되돌리기' }).click();
  await expect(panel.getByText('4개 되돌림')).toBeVisible();
  await expect(page.locator('#nm')).toHaveValue('');
  await expect(frame.locator('#email')).toHaveValue('');
  await expect(frame.locator('#company')).toHaveValue('');
});

test('교차 출처 iframe: 권한 필요 안내 → 이 페이지 부분만 입력', async ({ context, worker, extensionId }) => {
  await context.route('http://127.0.0.1/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<meta charset="utf-8"><label for="x">이메일</label><input id="x">' }),
  );
  const { page, popup } = await runFill(context, worker, extensionId, 'crossorigin.html', '다른 사이트(http://127.0.0.1)에 있습니다');
  // 허용 여부를 고르기 전에는 입력하지 않음
  await expect(page.locator('#nm')).toHaveValue('');
  await expect(popup.getByRole('button', { name: '접근 허용' })).toBeVisible();

  await page.bringToFront();
  await popup.getByRole('button', { name: '이 페이지 부분만 입력' }).click();
  await expect(popup.getByText('입력 완료 3개 · 입력 실패 0개 · 해당 없음 1개')).toBeVisible();
  await expect(page.locator('#nm')).toHaveValue('홍길동');
  await expect(page.frameLocator('iframe[title="같은 출처"]').locator('#email')).toHaveValue('gildong@example.com');
  await expect(page.frameLocator('iframe[title="교차 출처"]').locator('#x')).toHaveValue('');
});

test('민감정보: 설정을 켰을 때만 입력', async ({ context, worker, extensionId }) => {
  const data: Resume = {
    ...resume,
    preference: { veteran: { target: true, number: '12-345' }, disability: { target: false } },
  };
  const { page, popup } = await runFill(context, worker, extensionId, 'sensitive.html', '입력 완료 0개 · 입력 실패 0개 · 해당 없음 3개', data);
  await expect(page.locator('#veteran')).not.toBeChecked();
  await expect(page.locator('#vnum')).toHaveValue('');

  await worker.evaluate(() => chrome.storage.local.set({ settings: { excludedSites: [], sensitiveAutofill: true } }));
  await page.bringToFront();
  await popup.getByRole('button', { name: '작성' }).click();
  await expect(popup.getByText('입력 완료 3개 · 입력 실패 0개 · 해당 없음 0개')).toBeVisible();
  await expect(page.locator('#veteran')).toBeChecked();
  await expect(page.locator('#vnum')).toHaveValue('12-345');
  await expect(page.locator('#disability')).not.toBeChecked();
});

test('사이드 패널 건너뛰기·다시 작성', async ({ context, worker, extensionId }) => {
  const { page } = await runFill(context, worker, extensionId);
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await expect(panel.getByText('입력 완료 9 · 확인 필요 1 · 해당 없음 1')).toBeVisible();

  // 건너뛰기: 확인 필요 → 해당 없음
  await panel.getByRole('listitem').filter({ hasText: '우편번호 앞 3자리' }).getByRole('button', { name: '건너뛰기' }).click();
  await expect(panel.getByText('입력 완료 9 · 확인 필요 0 · 해당 없음 2')).toBeVisible();
  await panel.getByText('해당 없음 2개').click();
  await expect(panel.getByRole('listitem').filter({ hasText: '우편번호 앞 3자리' })).toBeVisible();

  // 다시 작성: 같은 탭 재실행 → 지운 값 복원, 건너뛴 항목은 다시 확인 필요
  await page.locator('#nm').fill('');
  await panel.bringToFront();
  await panel.getByRole('button', { name: '다시 작성' }).click();
  await expect(panel.getByRole('status')).toHaveText('입력 완료 9개 · 입력 실패 1개 · 해당 없음 1개');
  await expect(panel.getByText('입력 완료 9 · 확인 필요 1 · 해당 없음 1')).toBeVisible();
  await expect(page.locator('#nm')).toHaveValue('홍길동');
});

test('입력란 형식 신호에 따라 날짜·전화번호 변환 + 분리 입력', async ({ context, worker, extensionId }) => {
  const { page } = await runFill(context, worker, extensionId, 'formats.html', '입력 완료 11개 · 입력 실패 0개 · 해당 없음 0개');
  await expect(page.locator('#birth-dot')).toHaveValue('1995.03.15');
  await expect(page.locator('#birth-8')).toHaveValue('19950315');
  await expect(page.locator('#birth-date')).toHaveValue('1995-03-15');
  await expect(page.locator('#phone-hyphen')).toHaveValue('010-1234-5678');
  await expect(page.locator('#phone-digits')).toHaveValue('01012345678');
  // 분리 입력: 전화번호 3칸, 연·월·일 select
  await expect(page.locator('#hp1')).toHaveValue('010');
  await expect(page.locator('#hp2')).toHaveValue('1234');
  await expect(page.locator('#hp3')).toHaveValue('5678');
  await expect(page.locator('#by')).toHaveValue('1995');
  await expect(page.locator('#bm')).toHaveValue('3');
  await expect(page.locator('#bd')).toHaveValue('15');
});

test('달력 팝업형 readonly 날짜 입력란: 날짜만 직접 설정, 주소 등은 수집 안 함', async ({ context, worker, extensionId }) => {
  const data: Resume = {
    ...resume,
    work: [{ id: 'w1', company: { ko: '가나다전자' }, startDate: '2022-03', current: false }],
  };
  const { page } = await runFill(context, worker, extensionId, 'datepicker.html', '입력 완료 3개 · 입력 실패 0개 · 해당 없음 0개', data);
  await expect(page.locator('#birth')).toHaveValue('1995-03-15');
  await expect(page.locator('#start')).toHaveValue('2022.03');
  await expect(page.locator('#start-sync')).toHaveValue('2022.03');
  await expect(page.locator('#addr')).toHaveValue('');
});

test('입력 마스크: 서식 변경 허용 + 키 입력 마스크는 문자 단위 입력', async ({ context, worker, extensionId }) => {
  const { page } = await runFill(context, worker, extensionId, 'masks.html', '입력 완료 2개 · 입력 실패 0개 · 해당 없음 0개');
  await expect(page.locator('#phone')).toHaveValue('010-1234-5678');
  await expect(page.locator('#birth')).toHaveValue('1995.03.15');
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

test('페이지에서 직접 고친 값 → 같은 값의 이력서 항목으로 결과 갱신·학습', async ({ context, worker, extensionId }) => {
  const { page } = await runFill(context, worker, extensionId);
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);

  // 해당 없음 입력란에 이메일 직접 입력
  await page.bringToFront();
  await page.locator('#company').fill('gildong@example.com');
  await page.locator('#company').press('Tab');
  await expect(panel.getByText('회사 이름 → 이메일')).toBeVisible();
  // 입력 완료 입력란(주소)을 상세 주소 값으로 수정 → 매핑 교정
  await page.locator('#a1').fill('101호');
  await page.locator('#a1').press('Tab');
  await expect(panel.getByText('주소 → 상세 주소').first()).toBeVisible();
  // 이력서와 다른 값은 학습하지 않음
  await page.locator('#a2').fill('직접 쓴 값');
  await page.locator('#a2').press('Tab');

  await expect
    .poll(async () => (await worker.evaluate(async () => (await chrome.storage.local.get('learnedRules')).learnedRules)) ?? [])
    .toHaveLength(2);
  const rules = await worker.evaluate(async () => (await chrome.storage.local.get('learnedRules')).learnedRules);
  expect(rules).toMatchObject([
    { fingerprint: '["text","","company","회사 이름"]', schemaKey: 'basics.email' },
    { fingerprint: '["text","","a1","주소"]', schemaKey: 'basics.address.line2' },
  ]);
});

test('선택지 불일치 → 사이드 패널에서 사이트 선택지 선택 → 학습 → 재실행 시 자동 선택', async ({ context, worker, extensionId }) => {
  const data: Resume = {
    ...resume,
    education: [{ id: 'e1', level: 'university', school: { ko: '한국대학교' }, status: 'graduated' }],
  };
  const { page, popup } = await runFill(context, worker, extensionId, 'options.html', '입력 완료 1개 · 입력 실패 1개 · 해당 없음 0개', data);
  await expect(page.locator('#level')).toHaveValue('');

  // 확인 필요: 저장 값(표시명)·사유 + 사이트 선택지 목록에서 직접 선택
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  const row = panel.getByRole('listitem').filter({ hasText: '맞는 선택지 없음' });
  await expect(row).toContainText('학력 구분 → 학력 1 학력 구분');
  await expect(row).toContainText('대학교(4년)');
  await panel.getByLabel('학력 구분 선택지').selectOption({ label: '일반대학' });
  await row.getByRole('button', { name: '선택' }).click();
  await expect(panel.getByText('입력 완료 2 · 확인 필요 0 · 해당 없음 0')).toBeVisible();
  await expect(page.locator('#level')).toHaveValue('30');

  // 학습 규칙: 이력서 원래 값 → 고른 선택지 텍스트
  const rules = await worker.evaluate(async () => (await chrome.storage.local.get('learnedRules')).learnedRules);
  expect(rules).toMatchObject([{ schemaKey: 'education.0.level', option: { value: 'university', text: '일반대학' } }]);

  // 값 지운 뒤 재실행 → 학습 선택지로 자동 선택
  await page.locator('#level').selectOption('');
  await page.bringToFront();
  await popup.getByRole('button', { name: '작성' }).click();
  await expect(popup.getByText('입력 완료 2개 · 입력 실패 0개 · 해당 없음 0개')).toBeVisible();
  await expect(page.locator('#level')).toHaveValue('30');

  // 옵션 화면 '선택지' 열
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  await options.getByRole('button', { name: '학습 규칙' }).click();
  await expect(options.getByRole('row').filter({ hasText: '학력 구분' })).toContainText('일반대학');
});

test('radio 그룹 자동 선택 + 선택지 불일치 직접 선택·학습 + 되돌리기', async ({ context, worker, extensionId }) => {
  const data: Resume = {
    ...resume,
    basics: { ...resume.basics, gender: 'male' },
    education: [{ id: 'e1', level: 'university', school: { ko: '한국대학교' }, status: 'graduated' }],
  };
  const { page } = await runFill(context, worker, extensionId, 'radios.html', '입력 완료 3개 · 입력 실패 1개 · 해당 없음 0개', data);

  // 숨긴 radio(label만 표시)도 선택 + change 이벤트 발생, 섹션 문맥으로 졸업 구분 선택
  await expect(page.locator('#g-m')).toBeChecked();
  await expect(page.locator('#gender-changed')).toHaveText('1');
  await expect(page.locator('input[name=grad][value="1"]')).toBeChecked();
  await expect(page.locator('input[name=level]:checked')).toHaveCount(0);

  // 확인 필요: 사이트 선택지(radio label) 목록에서 직접 선택 → 학습
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  const row = panel.getByRole('listitem').filter({ hasText: '맞는 선택지 없음' });
  await expect(row).toContainText('학력 구분 → 학력 1 학력 구분');
  await panel.getByLabel('학력 구분 선택지').selectOption({ label: '일반대학' });
  await row.getByRole('button', { name: '선택' }).click();
  await expect(panel.getByText('입력 완료 4 · 확인 필요 0 · 해당 없음 0')).toBeVisible();
  await expect(page.locator('input[name=level][value="30"]')).toBeChecked();
  const rules = await worker.evaluate(async () => (await chrome.storage.local.get('learnedRules')).learnedRules);
  expect(rules).toMatchObject([{ schemaKey: 'education.0.level', option: { value: 'university', text: '일반대학' } }]);

  // 되돌리기: 기존 선택(재학) 복원, 선택 없던 그룹은 해제
  await panel.getByRole('button', { name: '되돌리기' }).click();
  await expect(panel.getByText('4개 되돌림')).toBeVisible();
  await expect(page.locator('#nm')).toHaveValue('');
  await expect(page.locator('input[name=gender]:checked')).toHaveCount(0);
  await expect(page.locator('input[name=grad][value="3"]')).toBeChecked();
  await expect(page.locator('input[name=level]:checked')).toHaveCount(0);
});

test('ARIA 콤보박스: 열어서 선택지 수집·선택 + 선택지 불일치 직접 선택·학습', async ({ context, worker, extensionId }) => {
  const data: Resume = {
    ...resume,
    basics: { ...resume.basics, gender: 'male' },
    education: [{ id: 'e1', level: 'university', school: { ko: '한국대학교' }, status: 'graduated' }],
  };
  const { page } = await runFill(context, worker, extensionId, 'combobox.html', '입력 완료 3개 · 입력 실패 1개 · 해당 없음 0개', data);

  // portal·mousedown형, aria-controls·click형 모두 선택, 수집·입력 후 목록은 닫힘
  await expect(page.locator('#gender')).toHaveText('남성');
  await expect(page.locator('#grad')).toHaveText('졸업');
  await expect(page.locator('#level')).toHaveText('선택');
  await expect(page.locator('[role=listbox]')).toHaveCount(0);

  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  const row = panel.getByRole('listitem').filter({ hasText: '맞는 선택지 없음' });
  await expect(row).toContainText('학력 구분 → 학력 1 학력 구분');
  await panel.getByLabel('학력 구분 선택지').selectOption({ label: '일반대학' });
  await row.getByRole('button', { name: '선택' }).click();
  await expect(panel.getByText('입력 완료 4 · 확인 필요 0 · 해당 없음 0')).toBeVisible();
  await expect(page.locator('#level')).toHaveText('일반대학');
  const rules = await worker.evaluate(async () => (await chrome.storage.local.get('learnedRules')).learnedRules);
  expect(rules).toMatchObject([{ schemaKey: 'education.0.level', option: { value: 'university', text: '일반대학' } }]);
});

test('검색형 콤보박스: 입력 후 일치 후보(정확히 같음 → 포함 후보 하나) 확정', async ({ context, worker, extensionId }) => {
  const data: Resume = {
    ...resume,
    education: [{ id: 'e1', level: 'university', school: { ko: '한국대학교' }, status: 'graduated', major: { ko: '컴퓨터공학' } }],
  };
  const { page } = await runFill(context, worker, extensionId, 'searchable.html', '입력 완료 2개 · 입력 실패 0개 · 해당 없음 0개', data);
  await expect(page.locator('#school')).toHaveValue('한국대학교');
  await expect(page.locator('#school-code')).toHaveValue('K001');
  await expect(page.locator('#major')).toHaveValue('컴퓨터공학과');
  await expect(page.locator('#major-code')).toHaveValue('C10');
  await expect(page.locator('#school-list')).toBeHidden();
});

test('파일 업로드: accept에 맞는 첨부 파일 입력, 본문 없음은 확인 필요', async ({ context, worker, extensionId }) => {
  // 첨부 파일 본문은 확장 프로그램 출처 IndexedDB (storage/files.ts와 같은 DB·저장소)
  const ext = await context.newPage();
  await ext.goto(`chrome-extension://${extensionId}/options.html`);
  await ext.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('resume-files', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('files');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction('files', 'readwrite');
      tx.objectStore('files').put(new Blob(['%PDF-1.4 test'], { type: 'application/pdf' }), 'att-resume');
      tx.objectStore('files').put(new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' }), 'att-photo');
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await ext.close();

  const meta = (id: string, kind: Resume['attachments'][number]['kind'], fileName: string, mimeType: string) =>
    ({ id, kind, fileName, mimeType, size: 1, addedAt: '2026-10-01T00:00:00.000Z' });
  const data: Resume = {
    ...resume,
    attachments: [
      meta('att-resume', 'resume', 'resume.pdf', 'application/pdf'),
      meta('att-photo', 'photo', 'photo.jpg', 'image/jpeg'),
      meta('att-cert', 'certificate', 'cert.pdf', 'application/pdf'),
    ],
  };
  const { page } = await runFill(context, worker, extensionId, 'upload.html', '입력 완료 2개 · 입력 실패 1개 · 해당 없음 1개', data);

  const fileOf = (id: string) =>
    page.evaluate((sel) => {
      const f = document.querySelector<HTMLInputElement>(sel)?.files?.[0];
      return f && [f.name, f.size, f.type];
    }, id);
  expect(await fileOf('#cv')).toEqual(['resume.pdf', 13, 'application/pdf']);
  await expect(page.locator('#cv-name')).toHaveText('resume.pdf');
  expect(await fileOf('#pic')).toEqual(['photo.jpg', 3, 'image/jpeg']);
  expect(await fileOf('#cert')).toBeUndefined();

  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await expect(panel.getByRole('listitem').filter({ hasText: '첨부 파일 없음' })).toContainText('자격증 사본 → 증명서 파일');
});

test('희망 조건: 연봉·내규 checkbox·근무지·직무(배열 결합)·고용 형태 select·입사 가능일', async ({ context, worker, extensionId }) => {
  const data: Resume = {
    ...resume,
    desired: {
      salary: { amount: 5000, companyPolicy: false },
      locations: ['서울', '경기'],
      jobs: ['백엔드 개발'],
      employmentTypes: ['full_time'],
      availableFrom: '2026-11-01',
    },
  };
  const { page } = await runFill(context, worker, extensionId, 'desired.html', '입력 완료 6개 · 입력 실패 0개 · 해당 없음 0개', data);

  await expect(page.locator('#salary')).toHaveValue('5000');
  await expect(page.locator('#policy')).not.toBeChecked();
  await expect(page.locator('#loc')).toHaveValue('서울, 경기');
  await expect(page.locator('#job')).toHaveValue('백엔드 개발');
  await expect(page.locator('#emp')).toHaveValue('P');
  await expect(page.locator('#avail')).toHaveValue('2026.11.01');

  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await expect(panel.getByText('희망 근무지 → 희망 근무지')).toBeVisible();
});

test('checkbox 그룹 다중 선택 + 선택지 불일치 직접 선택·학습 + 되돌리기', async ({ context, worker, extensionId }) => {
  const data: Resume = {
    ...resume,
    desired: { locations: ['서울', '제주'], jobs: ['백엔드 개발'], employmentTypes: ['full_time', 'intern'] },
  };
  const { page } = await runFill(context, worker, extensionId, 'checkbox-groups.html', '입력 완료 2개 · 입력 실패 1개 · 해당 없음 0개', data);

  const checked = (name: string) => page.locator(`input[name=${name}]:checked`);
  await expect(checked('emp')).toHaveCount(2);
  await expect(page.locator('input[name=emp][value=P]')).toBeChecked();
  await expect(page.locator('input[name=emp][value=I]')).toBeChecked();
  await expect(checked('loc')).toHaveCount(1);
  await expect(page.locator('input[name=loc][value="11"]')).toBeChecked();
  await expect(checked('job')).toHaveCount(0);

  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  const row = panel.getByRole('listitem').filter({ hasText: '맞는 선택지 없음' });
  await expect(row).toContainText('희망 직무 → 희망 직무');
  await panel.getByLabel('희망 직무 선택지').selectOption({ label: '데이터 분석' });
  await row.getByRole('button', { name: '선택' }).click();
  await expect(panel.getByText('입력 완료 3 · 확인 필요 0 · 해당 없음 0')).toBeVisible();
  await expect(page.locator('input[name=job][value=d]')).toBeChecked();
  const rules = await worker.evaluate(async () => (await chrome.storage.local.get('learnedRules')).learnedRules);
  expect(rules).toMatchObject([{ schemaKey: 'desired.jobs', option: { value: '백엔드 개발', text: '데이터 분석' } }]);

  // 되돌리기: 기존 체크(계약직)만 남고 나머지 해제
  await panel.getByRole('button', { name: '되돌리기' }).click();
  await expect(panel.getByText('3개 되돌림')).toBeVisible();
  await expect(checked('emp')).toHaveCount(1);
  await expect(page.locator('input[name=emp][value=C]')).toBeChecked();
  await expect(checked('loc')).toHaveCount(0);
  await expect(checked('job')).toHaveCount(0);
});

test('자기소개서 추천: 문항 매칭·글자수 표시 → 입력, 제한 초과 안내', async ({ context, worker, extensionId }) => {
  const entry = (id: string, question: string, tags: string[], answer: string) => ({
    id, question, tags, answer, usages: [], createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z',
  });
  const coverLetters = [
    entry('c1', '지원 동기', ['motivation'], '데이터로 문제를 푸는 개발자'),
    entry('c2', '입사 후 포부를 쓰시오', [], '팀의 핵심 백엔드 개발자로 성장하겠습니다'),
  ];
  await worker.evaluate((value) => chrome.storage.local.set({ coverLetters: value, coverLetters$: { v: 1 } }), coverLetters);
  const { page } = await runFill(context, worker, extensionId, 'coverletter.html', '입력 완료 1개 · 입력 실패 0개 · 해당 없음 3개');

  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  const section = panel.locator('section').filter({ has: panel.getByRole('heading', { name: '자기소개서 추천' }) });
  const q1 = section.getByRole('listitem').filter({ hasText: '1. 지원 동기' }).first();
  const q2 = section.getByRole('listitem').filter({ hasText: '2. 입사 후 포부' }).first();
  await expect(q1).toContainText('(공백 포함 20자 이내)');
  await expect(q1).toContainText('지원 동기 · 15 / 20자');
  await expect(q2).toContainText('입사 후 포부를 쓰시오 · 22 / 10자 초과');
  await expect(section.getByText('3. 기타 하고 싶은 말')).toHaveCount(0);

  await q1.getByRole('button', { name: '입력' }).click();
  await expect(page.locator('#q1')).toHaveValue('데이터로 문제를 푸는 개발자');
  await expect(panel.getByText('1. 지원 동기를 작성해 주세요 (최대 20자) → 자기소개서')).toBeVisible();
  await expect(section.getByText('1. 지원 동기')).toHaveCount(0);

  // 입력란 maxlength 초과 → 안내 + 확인 필요
  await q2.getByRole('button', { name: '입력' }).click();
  await expect(panel.getByRole('status')).toHaveText('입력란 글자수 제한을 초과합니다');
  await expect(page.locator('#q2')).toHaveValue('');
  await expect(panel.getByText('입력 완료 2 · 확인 필요 1 · 해당 없음 1')).toBeVisible();
});

test('checkbox boolean 항목 체크·해제 + 직접 입력 선택 목록 + 되돌리기', async ({ context, worker, extensionId }) => {
  const data: Resume = {
    ...resume,
    work: [{ id: 'w1', company: { ko: '가나다전자' }, startDate: '2022-03', current: true }],
    education: [{ id: 'e1', level: 'university', school: { ko: '한국대학교' }, status: 'graduated', transfer: false }],
  };
  const { page } = await runFill(context, worker, extensionId, 'checkboxes.html', '입력 완료 4개 · 입력 실패 0개 · 해당 없음 1개', data);

  // 숨긴 checkbox(label만 표시) 체크, 기본 체크된 '편입'은 이력서 값 false로 해제
  await expect(page.locator('#company')).toHaveValue('가나다전자');
  await expect(page.locator('#current')).toBeChecked();
  await expect(page.locator('#school')).toHaveValue('한국대학교');
  await expect(page.locator('#transfer')).not.toBeChecked();
  await expect(page.locator('#agree')).not.toBeChecked();

  // 해당 없음 checkbox: 이력서 항목 선택 목록은 boolean 항목만
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/sidepanel.html`);
  await panel.getByText('해당 없음 1개').click();
  const select = panel.getByLabel('개인정보 수집 동의 이력서 항목');
  await expect(select.locator('option')).toHaveText(['이력서 항목 선택', '학력 1 편입', '경력 1 재직 중']);
  await select.selectOption({ label: '경력 1 재직 중' });
  await panel.getByRole('listitem').filter({ hasText: '개인정보 수집 동의' }).getByRole('button', { name: '입력' }).click();
  await expect(panel.getByText('입력 완료 5 · 확인 필요 0 · 해당 없음 0')).toBeVisible();
  await expect(page.locator('#agree')).toBeChecked();

  // 되돌리기: 입력 전 체크 상태 복원
  await panel.getByRole('button', { name: '되돌리기' }).click();
  await expect(panel.getByText('5개 되돌림')).toBeVisible();
  await expect(page.locator('#current')).not.toBeChecked();
  await expect(page.locator('#transfer')).toBeChecked();
  await expect(page.locator('#agree')).not.toBeChecked();
});
