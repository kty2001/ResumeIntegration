import { storage } from 'wxt/utils/storage';
import { SCHEMA_VERSION, type CoverLetterEntry, type Resume } from '@/core/schema/resume';

// 저장 구조: docs/design/architecture.md 8장, docs/design/resume_schema_v1.md 6·7장
// 스키마 변경 시 version을 올리고 migrations에 변환 함수 추가

export const resumeItem = storage.defineItem<Resume | null>('local:resume', {
  fallback: null,
  version: SCHEMA_VERSION,
});

export const coverLettersItem = storage.defineItem<CoverLetterEntry[]>('local:coverLetters', {
  fallback: [],
  version: SCHEMA_VERSION,
});
