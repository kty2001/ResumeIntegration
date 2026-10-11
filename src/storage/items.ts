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

/** 사용자 설정 (옵션 '설정'). 항목 추가 시 fallback에 기본값 추가 */
export interface Settings {
  excludedSites: string[];  // 기본 제외 목록(site-policy) 외 사용자 추가 제외 도메인
  sensitiveAutofill?: boolean; // 민감정보(보훈·장애·취업보호·병역 면제 사유) 자동 입력 사용, 기본 꺼짐
}

export const settingsItem = storage.defineItem<Settings>('local:settings', {
  fallback: { excludedSites: [] },
});

// 사이드 패널 직접 입력으로 학습한 규칙 (매핑 1순위)
export const learnedRulesItem = storage.defineItem<LearnedRule[]>('local:learnedRules', {
  fallback: [],
});

// 마지막 자동 입력 결과 (사이드 패널이 watch로 표시, 브라우저 종료 시 소멸)
export const fillReportItem = storage.defineItem<FillReport | null>('session:fillReport', {
  fallback: null,
});

// 교차 출처 iframe 권한을 기다리는 '작성' (권한 대화상자로 팝업이 닫혀도 허용 시 background가 이어서 입력)
export const pendingPermissionItem = storage.defineItem<{ tabId: number; origins: string[] } | null>(
  'session:pendingPermission',
  { fallback: null },
);

// 제외 사이트 복사 전용 모드 (팝업 '복사 전용 모드 열기' → 사이드 패널, '작성' 시 해제)
export const copyOnlyItem = storage.defineItem<{ tabId: number; url: string } | null>('session:copyOnly', {
  fallback: null,
});
