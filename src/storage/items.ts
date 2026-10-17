import { storage } from 'wxt/utils/storage';
import type { ImportDraft } from '@/core/import';
import type { LinkedSite } from '@/core/linked-sites';
import type { LearnedRule } from '@/core/mapping/learned';
import { SCHEMA_VERSION, type CoverLetterEntry, type Resume, type ResumeEntry } from '@/core/schema/resume';
import type { FillReport } from '@/messaging/protocol';

// 저장 구조: docs/design/architecture.md 8장, docs/design/resume_schema_v1.md 6·7장
// 스키마 변경 시 version을 올리고 migrations에 변환 함수 추가

export const resumesItem = storage.defineItem<ResumeEntry[]>('local:resumes', {
  fallback: [],
  version: SCHEMA_VERSION,
});

// 선택된 이력서 ('작성'·사이드 패널·가져오기 대상, 옵션 편집 대상). 없거나 지워졌으면 첫 이력서
export const activeResumeIdItem = storage.defineItem<string | null>('local:activeResumeId', {
  fallback: null,
});

const pickActive = (list: ResumeEntry[], id: string | null) => list.find((e) => e.id === id) ?? list[0] ?? null;

/** 선택된 이력서 읽기·저장·감시 (setValue는 entry.id 기준 교체 → 저장 대기 중 선택이 바뀌어도 다른 이력서를 덮어쓰지 않음) */
export const activeResumeItem = {
  async getValue(): Promise<ResumeEntry | null> {
    return pickActive(await resumesItem.getValue(), await activeResumeIdItem.getValue());
  },
  async setValue(entry: ResumeEntry | null): Promise<void> {
    if (!entry) return;
    const list = await resumesItem.getValue();
    const exists = list.some((e) => e.id === entry.id);
    await resumesItem.setValue(exists ? list.map((e) => (e.id === entry.id ? entry : e)) : [...list, entry]);
    if (!exists && !list.length) await activeResumeIdItem.setValue(entry.id);
  },
  watch(callback: (entry: ResumeEntry | null) => void): () => void {
    const emit = () => void activeResumeItem.getValue().then(callback);
    const unwatch = [resumesItem.watch(emit), activeResumeIdItem.watch(emit)];
    return () => unwatch.forEach((fn) => fn());
  },
};

// 이전 버전(이력서 1개) 저장 키: background onInstalled에서 local:resumes로 옮긴 뒤 삭제
const legacyResumeItem = storage.defineItem<Resume | null>('local:resume', {
  fallback: null,
  version: SCHEMA_VERSION,
});

export async function migrateLegacyResume(): Promise<void> {
  const legacy = await legacyResumeItem.getValue();
  if (!legacy) return;
  if (!(await resumesItem.getValue()).length) {
    const id = crypto.randomUUID();
    await resumesItem.setValue([{ id, title: '기본 이력서', resume: legacy }]);
    await activeResumeIdItem.setValue(id);
  }
  await legacyResumeItem.removeValue({ removeMeta: true });
}

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

// 최초 실행 동의 (docs/design/screens.md 5장 ①). 문구가 바뀌면 CONSENT_VERSION을 올려 다시 동의 받음
// settings와 분리: 백업 '전체 삭제'가 settings를 지워도 동의는 유지
export const CONSENT_VERSION = 2; // 2: 이력서 가져오기 안내 추가

export const consentItem = storage.defineItem<{ version: number; acceptedAt: string } | null>('local:consent', {
  fallback: null,
});

// 사이드 패널 직접 입력으로 학습한 규칙 (매핑 1순위)
export const learnedRulesItem = storage.defineItem<LearnedRule[]>('local:learnedRules', {
  fallback: [],
});

// 연동 사이트 (옵션 '연동 사이트', 일괄 열기·갱신 필요 표시)
export const linkedSitesItem = storage.defineItem<LinkedSite[]>('local:linkedSites', {
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

// 반영 전 이력서 가져오기 결과 (팝업 '이 페이지에서 가져오기' → 옵션 '가져오기' 미리 보기, 반영·취소 시 삭제)
export const importDraftItem = storage.defineItem<ImportDraft | null>('session:importDraft', {
  fallback: null,
});
