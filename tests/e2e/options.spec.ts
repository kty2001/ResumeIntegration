import { readFile, writeFile } from 'node:fs/promises';
import { expect, resume, test } from './extension';

// 옵션 화면 '백업' E2E: 내보내기 → 전체 삭제 → 가져오기, 팝업 'JSON 가져오기'

declare const chrome: typeof browser;

const rule = { origin: 'http://localhost', fingerprint: '["text","","company","회사 이름"]', schemaKey: 'basics.email', updatedAt: '2026-10-10T00:00:00.000Z' };

test('백업 내보내기 → 전체 삭제 → 가져오기', async ({ context, worker, extensionId }) => {
  await worker.evaluate(
    ({ value, rules }) => chrome.storage.local.set({ resume: value, resume$: { v: 1 }, learnedRules: rules }),
    { value: resume, rules: [rule] },
  );
  const stored = () =>
    worker.evaluate(async () => {
      const { resume: r, learnedRules } = await chrome.storage.local.get(['resume', 'learnedRules']);
      return { name: (r as typeof resume | undefined)?.basics.name.ko, rules: (learnedRules as unknown[] | undefined)?.length ?? 0 };
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
  expect(backup).toMatchObject({ app: 'resume-integration', backupVersion: 1, resume: { basics: { name: { ko: '홍길동' } } }, learnedRules: [rule] });

  // 전체 삭제: 확인 단계 후 저장소·편집 화면 비움
  await options.getByRole('button', { name: '전체 삭제' }).click();
  await options.getByRole('button', { name: '정말 삭제' }).click();
  await expect(options.getByRole('status')).toHaveText('모든 데이터를 삭제했습니다.');
  expect(await stored()).toEqual({ name: undefined, rules: 0 });
  await options.getByRole('button', { name: '기본 정보' }).click();
  await expect(nameField).toHaveValue('');

  // 가져오기: 미리 보기 → 덮어쓰기 → 저장소·편집 화면 복원
  await options.getByRole('button', { name: '백업' }).click();
  await options.getByLabel('백업 파일 선택').setInputFiles(file);
  await expect(options.getByText(/이름 홍길동 · .*학습 규칙 1/)).toBeVisible();
  await options.getByRole('button', { name: '덮어쓰기' }).click();
  await expect(options.getByRole('status')).toHaveText('백업 파일을 가져왔습니다.');
  expect(await stored()).toEqual({ name: '홍길동', rules: 1 });
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

test('팝업 이력서 없음 → JSON 가져오기 → 옵션 백업 화면', async ({ context, extensionId }) => {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  const opened = context.waitForEvent('page');
  await popup.getByRole('button', { name: 'JSON 가져오기' }).click();
  const options = await opened;
  await expect(options).toHaveURL(/options\.html#backup$/);
  await expect(options.getByRole('heading', { name: '백업' })).toBeVisible();
});
