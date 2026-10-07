import { useCallback, useEffect, useRef, useState } from 'react';
import { createEmptyResume } from '@/core/schema/empty';
import type { Resume } from '@/core/schema/resume';
import { resumeItem } from '@/storage/items';

export type SaveStatus = 'loading' | 'idle' | 'saving' | 'saved' | 'error';

const SAVE_DELAY_MS = 500;

/** 이력서 로드 + 변경 시 디바운스 자동 저장 */
export function useResume() {
  const [resume, setResume] = useState<Resume | null>(null);
  const [status, setStatus] = useState<SaveStatus>('loading');
  const pending = useRef<Resume | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    resumeItem
      .getValue()
      .then((saved) => {
        setResume(saved ?? createEmptyResume());
        setStatus('idle');
      })
      .catch(() => setStatus('error'));
  }, []);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    try {
      await resumeItem.setValue(next);
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  }, []);

  const update = useCallback(
    (fn: (prev: Resume) => Resume) => {
      setResume((prev) => {
        if (!prev) return prev;
        const next = fn(prev);
        const stamped = { ...next, meta: { ...next.meta, updatedAt: new Date().toISOString() } };
        pending.current = stamped;
        return stamped;
      });
      setStatus('saving');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
    },
    [flush],
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

  return { resume, update, status };
}
