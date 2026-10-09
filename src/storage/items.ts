import { storage } from 'wxt/utils/storage';
import type { LearnedRule } from '@/core/mapping/learned';
import { SCHEMA_VERSION, type CoverLetterEntry, type Resume } from '@/core/schema/resume';
import type { FillReport } from '@/messaging/protocol';

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

// 사이드 패널 직접 입력으로 학습한 규칙 (매핑 1순위)
export const learnedRulesItem = storage.defineItem<LearnedRule[]>('local:learnedRules', {
  fallback: [],
});

// 마지막 자동 입력 결과 (사이드 패널이 watch로 표시, 브라우저 종료 시 소멸)
export const fillReportItem = storage.defineItem<FillReport | null>('session:fillReport', {
  fallback: null,
});
