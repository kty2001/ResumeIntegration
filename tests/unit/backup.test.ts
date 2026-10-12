import { describe, expect, it } from 'vitest';
import { backupFileName, createBackup, parseBackup } from '@/core/backup';
import { createEmptyResume } from '@/core/schema/empty';

const resume = createEmptyResume();
resume.basics.name.ko = '홍길동';
const rule = { origin: 'https://a.com', fingerprint: 'fp', schemaKey: 'basics.email', updatedAt: '2026-10-09T00:00:00.000Z' };
const site = { id: 's1', name: '사람인', url: 'https://www.saramin.co.kr/resume', lastFilledAt: '2026-10-10T00:00:00.000Z' };

describe('createBackup·backupFileName', () => {
  it('앱 표식·버전·백업 시각 포함', () => {
    const backup = createBackup({ resume, coverLetters: [], learnedRules: [rule], linkedSites: [site] }, new Date('2026-10-11T03:00:00Z'));
    expect(backup).toMatchObject({ app: 'resume-integration', backupVersion: 1, exportedAt: '2026-10-11T03:00:00.000Z' });
    expect(backup.resume?.basics.name.ko).toBe('홍길동');
  });

  it('파일명은 로컬 날짜', () => {
    expect(backupFileName(new Date(2026, 0, 5))).toBe('resume-backup-20260105.json');
  });
});

describe('parseBackup', () => {
  const text = (data: object) => JSON.stringify(data);

  it('내보낸 파일 그대로 복원', () => {
    const backup = createBackup({ resume, coverLetters: [], learnedRules: [rule], linkedSites: [site] });
    const result = parseBackup(JSON.stringify(backup));
    expect(result).toEqual({ ok: true, backup });
  });

  it('JSON 아님·다른 앱·새 스키마 버전은 오류', () => {
    expect(parseBackup('{oops')).toEqual({ ok: false, error: 'JSON 형식이 아닌 파일입니다.' });
    expect(parseBackup(text({ app: 'other', resume }))).toMatchObject({ ok: false, error: '이 확장 프로그램의 백업 파일이 아닙니다.' });
    expect(parseBackup('[]')).toMatchObject({ ok: false });
    const newer = { ...resume, meta: { ...resume.meta, schemaVersion: 2 } };
    expect(parseBackup(text({ app: 'resume-integration', resume: newer }))).toMatchObject({ ok: false });
  });

  it('이력서 누락 필드는 빈 이력서 기본값으로 보완', () => {
    const result = parseBackup(text({ app: 'resume-integration', resume: { basics: { email: 'a@b.c' }, education: 'x' } }));
    expect(result.ok).toBe(true);
    const r = result.ok ? result.backup.resume : null;
    expect(r?.basics).toMatchObject({ name: { ko: '' }, email: 'a@b.c', urls: [] });
    expect(r?.education).toEqual([]);
    expect(r?.work).toEqual([]);
    expect(r?.meta.schemaVersion).toBe(1);
  });

  it('이력서 없음·잘못된 학습 규칙·누락 목록 처리', () => {
    const result = parseBackup(text({ app: 'resume-integration', learnedRules: [rule, { origin: 1 }, 'x'] }));
    expect(result).toMatchObject({ ok: true, backup: { resume: null, coverLetters: [], learnedRules: [rule], linkedSites: [] } });
  });

  it('연동 사이트: 주소가 URL이 아니거나 필드가 빠진 항목 제외', () => {
    const linkedSites = [site, { ...site, url: 'saramin' }, { id: 's2', url: 'https://a.com' }, 'x'];
    const result = parseBackup(text({ app: 'resume-integration', linkedSites }));
    expect(result.ok && result.backup.linkedSites).toEqual([site]);
  });

  it('URL이 아닌 origin의 학습 규칙은 제외', () => {
    const result = parseBackup(text({ app: 'resume-integration', learnedRules: [rule, { ...rule, origin: 'a.com' }] }));
    expect(result.ok && result.backup.learnedRules).toEqual([rule]);
  });

  it('자기소개서: id 없는 항목 제외, 누락·잘못된 필드는 빈 값으로 보완', () => {
    const coverLetters = [{ id: 'c1', question: '지원 동기', tags: 'x' }, { question: 'id 없음' }, 'x'];
    const result = parseBackup(text({ app: 'resume-integration', coverLetters }));
    expect(result.ok && result.backup.coverLetters).toEqual([
      { id: 'c1', question: '지원 동기', answer: '', tags: [], usages: [], createdAt: '', updatedAt: '' },
    ]);
  });
});
