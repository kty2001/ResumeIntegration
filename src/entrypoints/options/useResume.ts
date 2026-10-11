import { useCallback, useEffect, useRef, useState } from 'react';
import { createEmptyResume } from '@/core/schema/empty';
import type { Resume } from '@/core/schema/resume';
import { resumeItem } from '@/storage/items';

export type SaveStatus = 'loading' | 'idle' | 'saving' | 'saved' | 'error';

const SAVE_DELAY_MS = 500;

interface StoredItem<S> {
  getValue(): Promise<S>;
  setValue(value: S): Promise<void>;
  watch(callback: (value: S) => void): () => void;
}

/**
 * 저장 항목 로드 + 변경 시 디바운스 자동 저장
 * load: 저장값 → 편집값 (없으면 빈 값 등), stamp: 저장 전 수정 시각 기록. 둘 다 모듈 수준의 고정 함수로 전달
 */
export function useAutoSave<S, T extends S>(item: StoredItem<S>, load: (saved: S) => T, stamp: (next: T) => T) {
  const [value, setValue] = useState<T | null>(null);
  const [status, setStatus] = useState<SaveStatus>('loading');
  const pending = useRef<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    item
      .getValue()
      .then((saved) => {
        setValue(load(saved));
        setStatus('idle');
      })
      .catch(() => setStatus('error'));
    // 백업 가져오기·전체 삭제 등 외부 변경 반영 (대기 중인 저장이 있으면 편집 내용 우선)
    return item.watch((saved) => {
      if (!pending.current) setValue(load(saved));
    });
  }, [item, load]);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    try {
      await item.setValue(next);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, [item]);

  const update = useCallback(
    (fn: (prev: T) => T) => {
      setValue((prev) => {
        if (!prev) return prev;
        const stamped = stamp(fn(prev));
        pending.current = stamped;
        return stamped;
      });
      setStatus('saving');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
    },
    [flush, stamp],
  );

  // 탭을 닫거나 숨길 때 대기 중인 저장 즉시 실행
  useEffect(() => {
    const onHide = () => void flush();
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [flush]);

  return { value, update, status };
}

/** 저장 상태 문구 (updatedAt: 저장됨 표시 시각) */
export function saveStatusText(status: SaveStatus, updatedAt?: string): string {
  switch (status) {
    case 'loading':
      return '불러오는 중…';
    case 'saving':
      return '저장 중…';
    case 'error':
      return '저장 실패 — 다시 시도해 주세요';
    default:
      return updatedAt ? `저장됨 · ${new Date(updatedAt).toLocaleString('ko-KR')}` : '';
  }
}

const loadResume = (saved: Resume | null) => saved ?? createEmptyResume();
const stampResume = (next: Resume): Resume => ({ ...next, meta: { ...next.meta, updatedAt: new Date().toISOString() } });

/** 이력서 로드 + 변경 시 디바운스 자동 저장 */
export function useResume() {
  const { value: resume, update, status } = useAutoSave(resumeItem, loadResume, stampResume);
  return { resume, update, status };
}
