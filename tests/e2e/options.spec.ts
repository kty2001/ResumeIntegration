import { readFile, writeFile } from 'node:fs/promises';
import { expect, resume, test } from './extension';

// 옵션 화면 '백업' E2E: 내보내기 → 전체 삭제 → 가져오기, 팝업 'JSON 가져오기', 최초 실행 동의

declare const chrome: typeof browser;

const rule = { origin: 'http://localhost', fingerprint: '["text","","company","회사 이름"]', schemaKey: 'basics.email', updatedAt: '2026-10-10T00:00:00.000Z' };
const site = { id: 's1', name: '기본', url: 'http://localhost/basics.html', lastFilledAt: '2026-10-10T00:00:00.000Z' };

test('백업 내보내기 → 전체 삭제 → 가져오기', async ({ context, worker, extensionId }) => {
  await worker.evaluate(
    ({ value, rules, sites }) => chrome.storage.local.set({ resume: value, resume$: { v: 1 }, learnedRules: rules, linkedSites: sites }),
    { value: resume, rules: [rule], sites: [site] },
  );
  const stored = () =>
    worker.evaluate(async () => {
      const { resume: r, learnedRules, linkedSites } = await chrome.storage.local.get(['resume', 'learnedRules', 'linkedSites']);
      return {
        name: (r as typeof resume | undefined)?.basics.name.ko,
        rules: (learnedRules as unknown[] | undefined)?.length ?? 0,
        sites: (linkedSites as unknown[] | undefined)?.length ?? 0,
      };
    });

  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  const nameField = options.getByLabel('이름(한글)');
  await expect(nameField).toHaveValue('홍길동');
  await options.getByRole('button', { name: '백업' }).click();

  // 내보내기: 파일 내용 확인
  const downloading = options.waitForEvent('download');
  await options.getByRole('button', { name: '내보내기' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^resume-backup-\d{8}\.json$/);
  const file = await download.path();
  const backup = JSON.parse(await readFile(file, 'utf-8'));
  expect(backup).toMatchObject({ app: 'resume-integration', backupVersion: 1, resume: { basics: { name: { ko: '홍길동' } } }, learnedRules: [rule], linkedSites: [site] });

  // 전체 삭제: 확인 단계 후 저장소·편집 화면 비움
  await options.getByRole('button', { name: '전체 삭제' }).click();
  await options.getByRole('button', { name: '정말 삭제' }).click();
  await expect(options.getByRole('status')).toHaveText('모든 데이터를 삭제했습니다.');
  expect(await stored()).toEqual({ name: undefined, rules: 0, sites: 0 });
  await options.getByRole('button', { name: '기본 정보' }).click();
  await expect(nameField).toHaveValue('');

  // 가져오기: 미리 보기 → 덮어쓰기 → 저장소·편집 화면 복원
  await options.getByRole('button', { name: '백업' }).click();
  await options.getByLabel('백업 파일 선택').setInputFiles(file);
  await expect(options.getByText(/이름 홍길동 · .*학습 규칙 1 · 연동 사이트 1/)).toBeVisible();
  await options.getByRole('button', { name: '덮어쓰기' }).click();
  await expect(options.getByRole('status')).toHaveText('백업 파일을 가져왔습니다.');
  expect(await stored()).toEqual({ name: '홍길동', rules: 1, sites: 1 });
  await options.getByRole('button', { name: '기본 정보' }).click();
  await expect(nameField).toHaveValue('홍길동');
});

test('다른 파일 가져오기는 오류 표시', async ({ context, extensionId }, testInfo) => {
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html#backup`);
  const wrong = testInfo.outputPath('wrong.json');
  await writeFile(wrong, JSON.stringify({ hello: 1 }));
  await options.getByLabel('백업 파일 선택').setInputFiles(wrong);
  await expect(options.getByRole('status')).toHaveText('이 확장 프로그램의 백업 파일이 아닙니다.');
  await expect(options.getByRole('button', { name: '덮어쓰기' })).toHaveCount(0);
});

test('자기소개서 라이브러리: 추가·글자수·검색·복제·삭제 + 자동 저장', async ({ context, worker, extensionId }) => {
  const stored = () =>
    worker.evaluate(async () => ((await chrome.storage.local.get('coverLetters')).coverLetters as { question: string; answer: string; tags: string[]; limit?: unknown }[] | undefined) ?? []);
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html#cover`);
  await expect(options.getByText('저장된 문항이 없습니다.')).toBeVisible();

  await options.getByRole('button', { name: '+ 문항 추가' }).click();
  await options.getByLabel('문항 필수', { exact: true }).fill('지원 동기를 기술해 주십시오');
  await options.getByLabel('지원 동기').check();
  await options.getByLabel('답변 필수', { exact: true }).fill('AB 가나');
  await expect(options.getByText('공백 포함 5자 · 공백 제외 4자 · 7바이트')).toBeVisible();
  // 제한 초과 경고
  await options.getByLabel('글자수 제한').fill('4');
  await expect(options.getByText('공백 포함 4 초과', { exact: false })).toBeVisible();
  await expect.poll(stored).toMatchObject([
    { question: '지원 동기를 기술해 주십시오', answer: 'AB 가나', tags: ['motivation'], limit: { count: 4, unit: 'chars_with_space' } },
  ]);

  // 복제 → 두 번째 항목 문항 변경 → 검색·태그 필터
  await options.getByRole('button', { name: '복제' }).click();
  await options.getByLabel('문항 필수', { exact: true }).fill('성장 과정');
  await expect.poll(async () => (await stored()).map((e) => e.question)).toEqual(['지원 동기를 기술해 주십시오', '성장 과정']);
  const rows = options.getByRole('row').filter({ has: options.getByRole('button', { name: '편집' }) });
  await expect(rows).toHaveCount(2);
  await options.getByLabel('문항·답변 검색').fill('성장');
  await expect(rows).toHaveCount(1);
  await options.getByLabel('문항·답변 검색').fill('');
  await options.getByLabel('태그 필터').selectOption({ label: '성장 과정' });
  await expect(options.getByText('검색 결과가 없습니다.')).toBeVisible();
  await options.getByLabel('태그 필터').selectOption({ label: '전체 태그' });

  // 삭제
  await options.getByRole('button', { name: '삭제', exact: true }).click();
  await expect.poll(async () => (await stored()).map((e) => e.question)).toEqual(['지원 동기를 기술해 주십시오']);
});

test('설정: 자동 입력 제외 사이트 추가·중복·형식 오류·삭제', async ({ context, worker, extensionId }) => {
  const sites = () =>
    worker.evaluate(async () => ((await chrome.storage.local.get('settings')).settings as { excludedSites: string[] } | undefined)?.excludedSites ?? []);
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html#settings`);
  await expect(options.getByRole('row').filter({ hasText: 'linkedin.com' })).toContainText('기본');

  const input = options.getByLabel('제외할 사이트');
  await input.fill('https://www.Example.com/jobs');
  await input.press('Enter');
  await expect(options.getByRole('row').filter({ hasText: 'example.com' })).toContainText('직접 추가');
  await expect.poll(sites).toEqual(['example.com']);

  await input.fill('example.com');
  await options.getByRole('button', { name: '추가', exact: true }).click();
  await expect(options.getByRole('status')).toHaveText('example.com은(는) 이미 제외 목록에 있습니다.');
  await input.fill('example');
  await options.getByRole('button', { name: '추가', exact: true }).click();
  await expect(options.getByRole('status')).toHaveText('도메인 형식이 아닙니다. 예: example.com');

  await options.getByRole('row').filter({ hasText: 'example.com' }).getByRole('button', { name: '삭제' }).click();
  await expect.poll(sites).toEqual([]);

  // 민감정보 자동 입력: 기본 꺼짐 → 켜기
  const sensitive = options.getByLabel(/민감정보.*자동 입력 사용/);
  await expect(sensitive).not.toBeChecked();
  await sensitive.check();
  await expect
    .poll(() => worker.evaluate(async () => ((await chrome.storage.local.get('settings')).settings as { sensitiveAutofill?: boolean }).sensitiveAutofill))
    .toBe(true);
});

test('연동 사이트: 추가·형식 오류·중복·제외 사이트 안내·순서 변경·삭제 + 모두 열기', async ({ context, worker, extensionId }) => {
  const stored = () =>
    worker.evaluate(async () => (((await chrome.storage.local.get('linkedSites')).linkedSites as { name: string; url: string }[] | undefined) ?? []).map((s) => s.name));
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html#sites`);
  await expect(options.getByText('등록한 사이트가 없습니다.')).toBeVisible();
  await expect(options.getByRole('button', { name: '모두 열기' })).toBeDisabled();

  const name = options.getByLabel('사이트 이름');
  const url = options.getByLabel('이력서 페이지 주소');
  const add = async (n: string, u: string) => {
    await name.fill(n);
    await url.fill(u);
    await options.getByRole('button', { name: '추가', exact: true }).click();
  };
  await add('기본', 'http://localhost/basics.html');
  await add('섹션', 'http://localhost/sections.html');
  await expect.poll(stored).toEqual(['기본', '섹션']);
  await expect(options.getByRole('row').filter({ hasText: '기본' })).toContainText('갱신 필요');

  await add('', 'saramin');
  await expect(options.getByRole('status')).toHaveText('주소 형식이 아닙니다. 예: https://www.example.com/resume');
  await add('중복', 'http://localhost/basics.html');
  await expect(options.getByRole('status')).toHaveText('이미 등록한 주소입니다.');
  await add('', 'www.linkedin.com/in/me');
  await expect(options.getByRole('status')).toContainText('자동 입력 제외 사이트입니다');
  await expect.poll(stored).toEqual(['기본', '섹션', 'www.linkedin.com']);

  await options.getByRole('row').filter({ hasText: 'linkedin' }).getByRole('button', { name: '삭제' }).click();
  await options.getByRole('row').filter({ hasText: '섹션' }).getByRole('button', { name: '위로' }).click();
  await expect.poll(stored).toEqual(['섹션', '기본']);

  // 모두 열기: 새 창에 등록 사이트 탭
  await options.getByRole('button', { name: '모두 열기' }).click();
  const opened = () => context.pages().map((p) => p.url()).filter((u) => u.startsWith('http://localhost/')).sort();
  await expect.poll(opened).toEqual([
    'http://localhost/basics.html',
    'http://localhost/sections.html',
  ]);

  // 기본 추천: 등록하지 않은 추천 사이트만 버튼 표시
  await options.getByRole('button', { name: '사람인 추가' }).click();
  await expect.poll(stored).toEqual(['섹션', '기본', '사람인']);
  await expect(options.getByRole('button', { name: '사람인 추가' })).toHaveCount(0);
  await expect(options.getByRole('button', { name: '잡코리아 추가' })).toBeVisible();
});

test('이력서 가져오기: 팝업 → 미리 보기(갱신·추가) → 선택 반영 → 자기소개서 추가', async ({ context, worker, extensionId }) => {
  // 기존 이력서: 이메일 다름(기본 미선택), 예시대학교는 같은 항목으로 갱신
  const existing = {
    ...resume,
    basics: { ...resume.basics, email: 'old@example.com', phone: undefined, birthDate: undefined },
    education: [{ id: 'e1', level: 'university', school: { ko: '예시대학교' }, status: 'graduated' }],
  };
  await worker.evaluate((value) => chrome.storage.local.set({ resume: value, resume$: { v: 1 } }), existing);

  const page = await context.newPage();
  await page.goto('http://localhost/import.html');
  await page.bringToFront();
  const popupOpened = context.waitForEvent('page');
  await worker.evaluate((url) => chrome.tabs.create({ url, active: false }), `chrome-extension://${extensionId}/popup.html`);
  const popup = await popupOpened;
  const optionsOpened = context.waitForEvent('page');
  await popup.getByRole('button', { name: '이 페이지에서 가져오기' }).click();
  await expect(popup.getByText(/이력서 항목 \d+개를 읽었습니다/)).toBeVisible();
  const options = await optionsOpened;
  await expect(options).toHaveURL(/options\.html#import$/);

  // 기본 정보: 이름은 같은 값이라 생략, 이메일은 값이 달라 미선택, 휴대폰(3칸 결합)·생년월일·성별은 선택
  const basics = options.locator('.card').filter({ hasText: '기본 정보' });
  await expect(basics.getByRole('row').filter({ hasText: '이름' })).toHaveCount(0);
  await expect(options.getByLabel('기본 정보 이메일 반영')).not.toBeChecked();
  await expect(options.getByLabel('기본 정보 휴대폰 반영')).toBeChecked();
  await expect(basics.getByRole('row').filter({ hasText: '휴대폰' })).toContainText('01098765432');
  await expect(options.getByLabel('기본 정보 생년월일 반영')).toBeChecked();
  await expect(options.getByLabel('기본 정보 성별 반영')).toBeChecked();
  await expect(basics).not.toContainText('secret');
  // 학력: 기존 항목 갱신 + 새 항목 추가
  await expect(options.getByText('학력 · 예시대학교 (갱신)')).toBeVisible();
  await expect(options.getByText('학력 · 예시고등학교 (추가)')).toBeVisible();
  await expect(options.getByText('지원 동기를 작성해 주세요')).toBeVisible();

  await options.getByLabel('기본 정보 이메일 반영').check();
  await options.getByRole('button', { name: /^선택 항목 반영/ }).click();
  await expect(options.getByRole('status')).toHaveText('선택한 항목을 이력서에 반영했습니다.');

  const stored = () =>
    worker.evaluate(async () => {
      const { resume: r, coverLetters } = await chrome.storage.local.get(['resume', 'coverLetters']);
      const value = r as typeof resume;
      return {
        email: value.basics.email,
        mobile: value.basics.phone?.mobile,
        birthDate: value.basics.birthDate,
        gender: value.basics.gender,
        education: value.education.map((e) => [e.school.ko, e.startDate]),
        questions: ((coverLetters as { question: string }[] | undefined) ?? []).map((c) => c.question),
      };
    });
  await expect.poll(stored).toEqual({
    email: 'new@example.com',
    mobile: '01098765432',
    birthDate: '1995-03-15',
    gender: 'male',
    education: [
      ['예시대학교', '2014-03'],
      ['예시고등학교', '2011-03'],
    ],
    questions: ['지원 동기를 작성해 주세요'],
  });
  expect(await worker.evaluate(async () => (await chrome.storage.session.get('importDraft')).importDraft ?? null)).toBeNull();
});

test('이력서 가져오기: 이력서 없음 → 취소 시 draft 삭제 → 다시 가져오기 → 전 항목 기본 선택·반영', async ({ context, worker, extensionId }) => {
  const page = await context.newPage();
  await page.goto('http://localhost/import.html');
  await page.bringToFront();
  const popupOpened = context.waitForEvent('page');
  await worker.evaluate((url) => chrome.tabs.create({ url, active: false }), `chrome-extension://${extensionId}/popup.html`);
  const popup = await popupOpened;
  await expect(popup.getByText('저장된 이력서가 없습니다.', { exact: false })).toBeVisible();
  const draft = () => worker.evaluate(async () => (await chrome.storage.session.get('importDraft')).importDraft ?? null);
  const importPage = async () => {
    const opened = context.waitForEvent('page');
    await popup.getByRole('button', { name: '이 페이지에서 가져오기' }).click();
    const options = await opened;
    await expect(options.getByText('학력 · 예시대학교 (추가)')).toBeVisible();
    return options;
  };

  const first = await importPage();
  await first.getByRole('button', { name: '취소' }).click();
  await expect(first.getByRole('status')).toHaveText('가져온 내용을 버렸습니다.');
  expect(await draft()).toBeNull();

  // 빈 이력서: 변환된 항목 전부 기본 선택, 학력 2개 추가
  const options = await importPage();
  await expect(options.getByText('학력 · 예시고등학교 (추가)')).toBeVisible();
  const boxes = options.locator('table input[type=checkbox]:not([disabled])');
  await expect(boxes).toHaveCount(11);
  for (const box of await boxes.all()) await expect(box).toBeChecked();
  await options.getByRole('button', { name: '선택 항목 반영 (12)' }).click();
  await expect(options.getByRole('status')).toHaveText('선택한 항목을 이력서에 반영했습니다.');
  await expect
    .poll(() =>
      worker.evaluate(async () => {
        const r = (await chrome.storage.local.get('resume')).resume as typeof resume | undefined;
        return r && { name: r.basics.name.ko, mobile: r.basics.phone?.mobile, education: r.education.map((e) => [e.school.ko, e.status]) };
      }),
    )
    .toEqual({ name: '홍길동', mobile: '01098765432', education: [['예시대학교', 'graduated'], ['예시고등학교', 'graduated']] });
});

test('이력서 가져오기: ARIA 미준수 커스텀 드롭다운 선택값 읽기, 미선택(숨은 input 빈 값)은 제외', async ({ context, worker, extensionId }) => {
  await worker.evaluate((value) => chrome.storage.local.set({ resume: value, resume$: { v: 1 } }), resume);
  const page = await context.newPage();
  await page.goto('http://localhost/custom-dropdown.html');
  await page.locator('#gender button.choose').click();
  await page.locator('#gender [data-value=F]').click();
  await page.bringToFront();
  const popupOpened = context.waitForEvent('page');
  await worker.evaluate((url) => chrome.tabs.create({ url, active: false }), `chrome-extension://${extensionId}/popup.html`);
  const popup = await popupOpened;
  const optionsOpened = context.waitForEvent('page');
  await popup.getByRole('button', { name: '이 페이지에서 가져오기' }).click();
  const options = await optionsOpened;

  await expect(options.getByLabel('기본 정보 성별 반영')).toBeChecked();
  await expect(options.locator('.card').filter({ hasText: '기본 정보' }).getByRole('row').filter({ hasText: '성별' })).toContainText('여');
  await expect(options.getByText(/^학력 ·/)).toHaveCount(0);
  await expect(options.getByText('선택', { exact: true })).toHaveCount(0);
});

test('첨부 파일: 구분 선택 후 추가·증명사진 연결·삭제', async ({ context, worker, extensionId }, testInfo) => {
  const stored = () =>
    worker.evaluate(async () => {
      const r = (await chrome.storage.local.get('resume')).resume as typeof resume | undefined;
      return { files: r?.attachments.map((a) => [a.kind, a.fileName, a.size]) ?? [], photo: !!r?.basics.photo };
    });
  const pdf = testInfo.outputPath('resume.pdf');
  const jpg = testInfo.outputPath('photo.jpg');
  await writeFile(pdf, '%PDF-1.4 test');
  await writeFile(jpg, Buffer.from([0xff, 0xd8, 0xff]));

  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html#files`);
  await expect(options.getByText('추가한 파일이 없습니다.')).toBeVisible();
  await options.getByLabel('첨부할 파일').setInputFiles(pdf);
  await expect(options.getByRole('row').filter({ hasText: 'resume.pdf' })).toContainText('이력서');
  await options.getByLabel('첨부 구분').selectOption({ label: '증명사진' });
  await options.getByLabel('첨부할 파일').setInputFiles(jpg);
  await expect(options.getByRole('row').filter({ hasText: 'photo.jpg' })).toContainText('증명사진');
  await expect.poll(stored).toEqual({ files: [['resume', 'resume.pdf', 13], ['photo', 'photo.jpg', 3]], photo: true });

  await options.getByRole('row').filter({ hasText: 'photo.jpg' }).getByRole('button', { name: '삭제' }).click();
  await expect.poll(stored).toEqual({ files: [['resume', 'resume.pdf', 13]], photo: false });
});

test('팝업 이력서 없음 → JSON 가져오기 → 옵션 백업 화면', async ({ context, extensionId }) => {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  const opened = context.waitForEvent('page');
  await popup.getByRole('button', { name: 'JSON 가져오기' }).click();
  const options = await opened;
  await expect(options).toHaveURL(/options\.html#backup$/);
  await expect(options.getByRole('heading', { name: '백업' })).toBeVisible();
});

test('최초 실행 동의 전 팝업 안내 → 옵션 화면 동의 모달 → 동의 후 팝업 정상', async ({ context, worker, extensionId }) => {
  await worker.evaluate(() => chrome.storage.local.remove('consent'));
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(popup.getByText('시작하기 전에 데이터 처리 방식을 확인해 주세요.')).toBeVisible();
  await expect(popup.getByRole('button', { name: 'JSON 가져오기' })).toHaveCount(0);

  const opened = context.waitForEvent('page');
  await popup.getByRole('button', { name: '확인하러 가기' }).click();
  const options = await opened;
  const dialog = options.getByRole('dialog', { name: '시작하기 전에 확인해 주세요' });
  await expect(dialog).toBeVisible();
  const start = dialog.getByRole('button', { name: '시작하기' });
  await expect(start).toBeDisabled();
  await dialog.getByLabel('위 내용을 확인했습니다.').check();
  await start.click();
  await expect(dialog).toHaveCount(0);
  const consent = await worker.evaluate(async () => (await chrome.storage.local.get('consent')).consent as { version: number } | undefined);
  expect(consent?.version).toBe(2);

  await popup.reload();
  await expect(popup.getByRole('button', { name: 'JSON 가져오기' })).toBeVisible();
});

test('이전 버전 동의(v1) → 가져오기 안내가 추가된 동의 모달 다시 표시', async ({ context, worker, extensionId }) => {
  await worker.evaluate(() => chrome.storage.local.set({ consent: { version: 1, acceptedAt: '2026-10-01T00:00:00.000Z' } }));
  const options = await context.newPage();
  await options.goto(`chrome-extension://${extensionId}/options.html`);
  const dialog = options.getByRole('dialog', { name: '시작하기 전에 확인해 주세요' });
  await expect(dialog).toContainText("'이 페이지에서 가져오기'는 그 페이지에 작성된 이력서 값을 읽어");
});
