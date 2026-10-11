import { useEffect, useState } from 'react';
import type { Resume } from '@/core/schema/resume';
import { describeStartFill as describe, sendMessage } from '@/messaging/protocol';
import { resumeItem } from '@/storage/items';

// 화면 설계: docs/design/screens.md 2장 (현재: 작성 가능·이력서 미입력(JSON 가져오기 포함)·제외 사이트·권한 필요 상태)

export default function App() {
  const [resume, setResume] = useState<Resume | null | undefined>(undefined);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string>();
  const [tabId, setTabId] = useState<number>();
  const [blocked, setBlocked] = useState<string[]>([]);

  useEffect(() => {
    resumeItem.getValue().then(setResume, () => setResume(null));
    // 사이드 패널 열기는 사용자 제스처 안에서 호출해야 하므로 탭 ID를 미리 조회
    browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => setTabId(tab?.id));
  }, []);

  const openOptions = () => void browser.runtime.openOptionsPage();
  const openBackup = () => void browser.tabs.create({ url: browser.runtime.getURL('/options.html#backup') });

  /** partial: 권한 없는 교차 출처 iframe은 건너뜀 ('이 페이지 부분만 입력') */
  const fill = async (partial = false) => {
    if (tabId == null) {
      setMessage(describe({ status: 'error', message: '현재 탭을 찾을 수 없습니다.' }));
      return;
    }
    // 결과는 background가 session:fillReport에 저장 → 사이드 패널이 표시
    browser.sidePanel.open({ tabId }).catch(() => {});
    setRunning(true);
    setMessage(undefined);
    setBlocked([]);
    try {
      const res = await sendMessage('startFill', { tabId, partial });
      if (res.status === 'needs-permission') setBlocked(res.origins);
      else setMessage(describe(res));
    } catch (e) {
      setMessage(describe({ status: 'error', message: e instanceof Error ? e.message : String(e) }));
    } finally {
      setRunning(false);
    }
  };

  // 권한 요청은 사용자 클릭 처리 안에서 바로 호출
  // 권한 대화상자가 뜨면 팝업이 닫히므로 허용 후 입력은 background(permissions.onAdded)가 실행
  const allow = async () => {
    const granted = await browser.permissions.request({ origins: blocked.map((o) => `${o}/*`) }).catch(() => false);
    if (granted) setBlocked([]);
    setMessage(
      granted
        ? '접근을 허용했습니다. 입력 결과는 사이드 패널에서 확인해 주세요.'
        : '접근을 허용하지 않았습니다. 이 페이지 부분만 입력할 수 있습니다.',
    );
  };

  return (
    <main style={{ width: 360, padding: 16 }}>
      <h1 style={{ fontSize: 16, margin: 0 }}>이력서 자동 입력</h1>
      {resume === undefined ? null : resume ? (
        <>
          <p>
            {resume.basics.name.ko || '이름 없음'} · 수정 {new Date(resume.meta.updatedAt).toLocaleDateString()}
          </p>
          <button onClick={() => void fill()} disabled={running}>
            {running ? '입력 중…' : '작성'}
          </button>
          {blocked.length > 0 && (
            <div role="alert">
              <p>
                이 페이지의 일부 입력 영역이 다른 사이트({blocked.join(', ')})에 있습니다. 접근을 허용하면 그 영역도
                입력합니다.
              </p>
              <button onClick={() => void allow()} disabled={running}>
                접근 허용
              </button>{' '}
              <button onClick={() => void fill(true)} disabled={running}>
                이 페이지 부분만 입력
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <p>저장된 이력서가 없습니다. 먼저 이력서를 입력해 주세요.</p>
          <button onClick={openOptions}>이력서 입력하러 가기</button>{' '}
          <button onClick={openBackup}>JSON 가져오기</button>
        </>
      )}
      {message && <p>{message}</p>}
      <footer style={{ marginTop: 16 }}>
        <button onClick={openOptions}>이력서 편집</button>
      </footer>
    </main>
  );
}
