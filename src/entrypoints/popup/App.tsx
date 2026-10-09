import { useEffect, useState } from 'react';
import type { Resume } from '@/core/schema/resume';
import { sendMessage, type StartFillResponse } from '@/messaging/protocol';
import { resumeItem } from '@/storage/items';

// 화면 설계: docs/design/screens.md 2장 (현재: 작성 가능·이력서 미입력·제외 사이트 상태)

function describe(res: StartFillResponse): string {
  switch (res.status) {
    case 'ok':
      return `입력 완료 ${res.filled}개 · 입력 실패 ${res.failed}개 · 해당 없음 ${res.unmatched}개`;
    case 'excluded':
      return '이용약관상 자동 입력을 지원하지 않는 사이트입니다.';
    case 'no-resume':
      return '저장된 이력서가 없습니다.';
    case 'error':
      return `입력하지 못했습니다: ${res.message}`;
  }
}

export default function App() {
  const [resume, setResume] = useState<Resume | null | undefined>(undefined);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string>();
  const [tabId, setTabId] = useState<number>();

  useEffect(() => {
    resumeItem.getValue().then(setResume, () => setResume(null));
    // 사이드 패널 열기는 사용자 제스처 안에서 호출해야 하므로 탭 ID를 미리 조회
    browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => setTabId(tab?.id));
  }, []);

  const openOptions = () => void browser.runtime.openOptionsPage();

  const fill = async () => {
    if (tabId == null) {
      setMessage(describe({ status: 'error', message: '현재 탭을 찾을 수 없습니다.' }));
      return;
    }
    // 결과는 background가 session:fillReport에 저장 → 사이드 패널이 표시
    browser.sidePanel.open({ tabId }).catch(() => {});
    setRunning(true);
    setMessage(undefined);
    try {
      setMessage(describe(await sendMessage('startFill', { tabId })));
    } catch (e) {
      setMessage(describe({ status: 'error', message: e instanceof Error ? e.message : String(e) }));
    } finally {
      setRunning(false);
    }
  };

  return (
    <main style={{ width: 360, padding: 16 }}>
      <h1 style={{ fontSize: 16, margin: 0 }}>이력서 자동 입력</h1>
      {resume === undefined ? null : resume ? (
        <>
          <p>
            {resume.basics.name.ko || '이름 없음'} · 수정 {new Date(resume.meta.updatedAt).toLocaleDateString()}
          </p>
          <button onClick={fill} disabled={running}>
            {running ? '입력 중…' : '작성'}
          </button>
        </>
      ) : (
        <>
          <p>저장된 이력서가 없습니다. 먼저 이력서를 입력해 주세요.</p>
          <button onClick={openOptions}>이력서 입력하러 가기</button>
        </>
      )}
      {message && <p>{message}</p>}
      <footer style={{ marginTop: 16 }}>
        <button onClick={openOptions}>이력서 편집</button>
      </footer>
    </main>
  );
}
