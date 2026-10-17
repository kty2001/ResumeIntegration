import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { createEmptyResume } from '@/core/schema/empty';
import { activeResumeIdItem, activeResumeItem, migrateLegacyResume, resumesItem } from '@/storage/items';

const resume = createEmptyResume();
resume.basics.name.ko = '홍길동';
const entry = (id: string, title = id) => ({ id, title, resume });

beforeEach(() => fakeBrowser.reset());

describe('activeResumeItem', () => {
  it('선택 id 항목, 없거나 지워졌으면 첫 이력서, 목록이 비면 null', async () => {
    expect(await activeResumeItem.getValue()).toBeNull();
    await resumesItem.setValue([entry('r1'), entry('r2')]);
    expect((await activeResumeItem.getValue())?.id).toBe('r1');
    await activeResumeIdItem.setValue('r2');
    expect((await activeResumeItem.getValue())?.id).toBe('r2');
    await activeResumeIdItem.setValue('gone');
    expect((await activeResumeItem.getValue())?.id).toBe('r1');
  });

  it('setValue: id 기준 교체 (선택이 바뀌어도 다른 이력서 유지), 첫 이력서는 추가 후 선택', async () => {
    await activeResumeItem.setValue(entry('r1', '기본 이력서'));
    expect(await activeResumeIdItem.getValue()).toBe('r1');
    await resumesItem.setValue([...(await resumesItem.getValue()), entry('r2')]);
    await activeResumeIdItem.setValue('r2');
    await activeResumeItem.setValue(entry('r1', '이름 변경'));
    expect((await resumesItem.getValue()).map((e) => [e.id, e.title])).toEqual([
      ['r1', '이름 변경'],
      ['r2', 'r2'],
    ]);
    expect(await activeResumeIdItem.getValue()).toBe('r2');
  });
});

describe('migrateLegacyResume', () => {
  it('이전 local:resume → 기본 이력서 하나, 이전 키 삭제', async () => {
    await browser.storage.local.set({ resume, resume$: { v: 1 } });
    await migrateLegacyResume();
    const [first] = await resumesItem.getValue();
    expect(first).toMatchObject({ title: '기본 이력서', resume });
    expect(await activeResumeIdItem.getValue()).toBe(first?.id);
    expect(await browser.storage.local.get(['resume', 'resume$'])).toEqual({});
  });

  it('이미 이력서 목록이 있으면 덮어쓰지 않음', async () => {
    await resumesItem.setValue([entry('r1')]);
    await browser.storage.local.set({ resume: createEmptyResume() });
    await migrateLegacyResume();
    expect((await resumesItem.getValue()).map((e) => e.id)).toEqual(['r1']);
    expect((await browser.storage.local.get('resume')).resume).toBeUndefined();
  });
});
