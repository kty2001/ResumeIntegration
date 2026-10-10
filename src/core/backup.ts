import type { LearnedRule } from '@/core/mapping/learned';
import { createEmptyResume } from '@/core/schema/empty';
import { SCHEMA_VERSION, type CoverLetterEntry, type Resume } from '@/core/schema/resume';

// 백업 파일(JSON) 생성·검증: docs/design/architecture.md 8장, resume_schema_v1.md 7장
// 포함: 이력서·자기소개서·학습 규칙 / 제외: 입력 결과(session), API 키

export const BACKUP_APP = 'resume-integration';
export const BACKUP_VERSION = 1;

export interface BackupData {
  resume: Resume | null;
  coverLetters: CoverLetterEntry[];
  learnedRules: LearnedRule[];
}

export interface Backup extends BackupData {
  app: typeof BACKUP_APP;
  backupVersion: typeof BACKUP_VERSION;
  exportedAt: string;       // ISO 시각
}

export function createBackup(data: BackupData, now = new Date()): Backup {
  return { app: BACKUP_APP, backupVersion: BACKUP_VERSION, exportedAt: now.toISOString(), ...data };
}

/** resume-backup-YYYYMMDD.json (로컬 날짜) */
export function backupFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `resume-backup-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.json`;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** 누락 필드는 빈 이력서 기본값으로 보완 (배열 섹션·basics) */
function normalizeResume(raw: Record<string, unknown>): Resume {
  const empty = createEmptyResume();
  const merged = { ...empty, ...raw } as Resume;
  const basics = isObject(raw.basics) ? raw.basics : {};
  merged.basics = { ...empty.basics, ...basics, name: { ...empty.basics.name, ...(isObject(basics.name) ? basics.name : {}) } };
  for (const key of Object.keys(empty) as (keyof Resume)[]) {
    if (Array.isArray(empty[key]) && !Array.isArray(merged[key])) (merged as unknown as Record<string, unknown>)[key] = [];
  }
  return merged;
}

const isRule = (r: unknown): r is LearnedRule =>
  isObject(r) && typeof r.origin === 'string' && typeof r.fingerprint === 'string' && typeof r.schemaKey === 'string';

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string };

export function parseBackup(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'JSON 형식이 아닌 파일입니다.' };
  }
  if (!isObject(data) || data.app !== BACKUP_APP) return { ok: false, error: '이 확장 프로그램의 백업 파일이 아닙니다.' };

  let resume: Resume | null = null;
  if (isObject(data.resume)) {
    const version = isObject(data.resume.meta) ? data.resume.meta.schemaVersion : undefined;
    if (typeof version === 'number' && version > SCHEMA_VERSION)
      return { ok: false, error: '더 새로운 버전에서 만든 백업 파일입니다. 확장 프로그램을 업데이트해 주세요.' };
    // 스키마 v2부터 이 위치에서 마이그레이션 (resume_schema_v1.md 7장)
    resume = normalizeResume(data.resume);
  }

  return {
    ok: true,
    backup: {
      app: BACKUP_APP,
      backupVersion: BACKUP_VERSION,
      exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
      resume,
      coverLetters: Array.isArray(data.coverLetters) ? (data.coverLetters as CoverLetterEntry[]) : [],
      learnedRules: Array.isArray(data.learnedRules) ? data.learnedRules.filter(isRule) : [],
    },
  };
}
