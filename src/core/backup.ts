import type { LinkedSite } from '@/core/linked-sites';
import type { LearnedRule } from '@/core/mapping/learned';
import { createEmptyResume } from '@/core/schema/empty';
import { SCHEMA_VERSION, type CoverLetterEntry, type Resume, type ResumeEntry } from '@/core/schema/resume';

// 백업 파일(JSON) 생성·검증: docs/design/architecture.md 8장, resume_schema_v1.md 7장
// 포함: 이력서·자기소개서·학습 규칙·연동 사이트 / 제외: 입력 결과(session), API 키

export const BACKUP_APP = 'resume-integration';
export const BACKUP_VERSION = 2; // 2: 이력서 여러 개 (resume → resumes·activeResumeId), 1도 가져오기 가능

export interface BackupData {
  resumes: ResumeEntry[];
  activeResumeId: string | null;
  coverLetters: CoverLetterEntry[];
  learnedRules: LearnedRule[];
  linkedSites: LinkedSite[];
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

/** 자기소개서 항목: id가 있는 객체만, 누락 필드는 빈 값으로 보완 (사이드 패널·옵션 화면이 tags·answer 등을 바로 사용) */
function normalizeCoverLetters(raw: unknown): CoverLetterEntry[] {
  if (!Array.isArray(raw)) return [];
  const text = (v: unknown) => (typeof v === 'string' ? v : '');
  const list = (v: unknown) => (Array.isArray(v) ? v : []);
  return raw
    .filter((e): e is Record<string, unknown> => isObject(e) && typeof e.id === 'string')
    .map((e) => ({
      ...e,
      question: text(e.question),
      answer: text(e.answer),
      tags: list(e.tags),
      usages: list(e.usages),
      createdAt: text(e.createdAt),
      updatedAt: text(e.updatedAt),
    }) as CoverLetterEntry);
}

function isUrl(text: string): boolean {
  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
}

// origin은 학습 규칙 화면에서 URL로 파싱하므로 형식까지 확인
const isRule = (r: unknown): r is LearnedRule =>
  isObject(r) &&
  typeof r.origin === 'string' &&
  isUrl(r.origin) &&
  typeof r.fingerprint === 'string' &&
  typeof r.schemaKey === 'string';

// 연동 사이트: 열기에 쓰는 url까지 형식 확인 (이전 백업 파일에는 없음 → 빈 목록)
const isLinkedSite = (s: unknown): s is LinkedSite =>
  isObject(s) && typeof s.id === 'string' && typeof s.name === 'string' && typeof s.url === 'string' && isUrl(s.url);

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: string };

export function parseBackup(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'JSON 형식이 아닌 파일입니다.' };
  }
  if (!isObject(data) || data.app !== BACKUP_APP) return { ok: false, error: '이 확장 프로그램의 백업 파일이 아닙니다.' };

  // 백업 v1은 이력서 하나(resume) → 항목 하나로 변환
  const rawEntries = Array.isArray(data.resumes)
    ? data.resumes.filter(isObject)
    : isObject(data.resume)
      ? [{ title: '기본 이력서', resume: data.resume }]
      : [];
  const resumes: ResumeEntry[] = [];
  for (const raw of rawEntries) {
    if (!isObject(raw.resume)) continue;
    const version = isObject(raw.resume.meta) ? raw.resume.meta.schemaVersion : undefined;
    if (typeof version === 'number' && version > SCHEMA_VERSION)
      return { ok: false, error: '더 새로운 버전에서 만든 백업 파일입니다. 확장 프로그램을 업데이트해 주세요.' };
    // 스키마 v2부터 이 위치에서 마이그레이션 (resume_schema_v1.md 7장)
    resumes.push({
      id: typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID(),
      title: typeof raw.title === 'string' ? raw.title : '',
      resume: normalizeResume(raw.resume),
    });
  }
  const activeResumeId = resumes.find((e) => e.id === data.activeResumeId)?.id ?? resumes[0]?.id ?? null;

  return {
    ok: true,
    backup: {
      app: BACKUP_APP,
      backupVersion: BACKUP_VERSION,
      exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
      resumes,
      activeResumeId,
      coverLetters: normalizeCoverLetters(data.coverLetters),
      learnedRules: Array.isArray(data.learnedRules) ? data.learnedRules.filter(isRule) : [],
      linkedSites: Array.isArray(data.linkedSites) ? data.linkedSites.filter(isLinkedSite) : [],
    },
  };
}
