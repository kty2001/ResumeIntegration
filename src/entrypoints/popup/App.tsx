import { useEffect, useState } from 'react';
import { needsUpdate, type LinkedSite } from '@/core/linked-sites';
import type { Resume } from '@/core/schema/resume';
import { isExcluded } from '@/core/site-policy';
import { describeStartFill as describe, sendMessage } from '@/messaging/protocol';
import { CONSENT_VERSION, consentItem, copyOnlyItem, linkedSitesItem, resumeItem, settingsItem } from '@/storage/items';

// 화면 설계: docs/design/screens.md 2장 (현재: 동의 전·작성 가능·이력서 미입력(JSON 가져오기 포함)·제외 사이트·권한 필요 상태)

export default function App() {
  const [resume, setResume] = useState<Resume | null | undefined>(undefined);
  const [consented, setConsented] = useState<boolean>();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string>();
  const [tabId, setTabId] = useState<number>();
  const [tabUrl, setTabUrl] = useState<string>();
  const [excluded, setExcluded] = useState<'excluded' | 'user-excluded'>();
  const [blocked, setBlocked] = useState<string[]>([]);
  const [sites, setSites] = useState<LinkedSite[]>([]);

  useEffect(() => {
    resumeItem.getValue().then(setResume, () => setResume(null));
    linkedSitesItem.getValue().then(setSites, () => {});
    // 최초 실행 동의 전에는 옵션 화면 동의 모달로 안내 (screens.md 5장 ①)
    consentItem.getValue().then(
      (c) => setConsented(c?.version === CONSENT_VERSION),
      () => setConsented(false),
    );
    // 사이드 패널 열기는 사용자 제스처 안에서 호출해야 하므로 탭 ID를 미리 조회
    // 제외 사이트는 '작성' 전에 판정 (URL을 못 읽으면 일반 상태, 제외 검사는 background startFill에도 있음)
    Promise.all([browser.tabs.query({ active: true, currentWindow: true }), settingsItem.getValue()]).then(([[tab], settings]) => {
      setTabId(tab?.id);
      setTabUrl(tab?.url);
      if (!tab?.url) return;
      if (isExcluded(tab.url)) setExcluded('excluded');
      else if (isExcluded(tab.url, settings.excludedSites)) setExcluded('user-excluded');
    });
    // '작성' 성공 시 마지막 작성 시각이 바뀌므로 갱신 필요 개수 반영
    return linkedSitesItem.watch(setSites);
  }, []);

  // 복사 전용 모드: 페이지 조작 없이 사이드 패널만 열기 (open을 먼저 호출해 사용자 제스처 유지)
  const openCopyOnly = () => {
    if (tabId == null || !tabUrl) return;
    browser.sidePanel.open({ tabId }).catch(() => {});
    void copyOnlyItem.setValue({ tabId, url: tabUrl });
  };

  const openOptions = () => void browser.runtime.openOptionsPage();
  const openBackup = () => void browser.tabs.create({ url: browser.runtime.getURL('/options.html#backup') });
  // 연동 사이트 일괄 열기: 새 창 (로그인·'작성'은 탭별로 사용자가 진행, architecture.md 7.5)
  const openSites = () => void browser.windows.create({ url: sites.map((s) => s.url) });
  const outdated = sites.filter((s) => needsUpdate(s, resume?.meta.updatedAt)).length;

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
    <main className="popup">
      <header className="popup-head">
        <h1>이력서 자동 입력</h1>
      </header>
      <div className="popup-body">
        {resume === undefined || consented === undefined ? null : !consented ? (
          <>
            <p className="empty">시작하기 전에 데이터 처리 방식을 확인해 주세요.</p>
            <button className="btn primary lg" onClick={openOptions}>
              확인하러 가기
            </button>
          </>
        ) : resume ? (
          <>
            <div className="card compact profile">
              <b>{resume.basics.name.ko || '이름 없음'}</b>
              <small>수정 {new Date(resume.meta.updatedAt).toLocaleDateString()}</small>
            </div>
            {excluded && (
              <>
                <div className="site">
                  현재 페이지: {new URL(tabUrl!).hostname} <span className="badge warn">자동 입력 제외</span>
                </div>
                <div className="msg warn">
                  {describe({ status: excluded })} 사이드 패널에서 항목을 복사해 직접 붙여넣을 수 있습니다.
                </div>
                <button className="btn primary lg" onClick={openCopyOnly}>
                  복사 전용 모드 열기
                </button>
              </>
            )}
            <button className={excluded ? 'btn lg' : 'btn primary lg'} onClick={() => void fill()} disabled={running || !!excluded}>
              {running ? '입력 중…' : '작성'}
            </button>
            {blocked.length > 0 && (
              <div className="msg warn" role="alert">
                이 페이지의 일부 입력 영역이 다른 사이트({blocked.join(', ')})에 있습니다. 접근을 허용하면 그 영역도
                입력합니다.
                <div className="actions">
                  <button className="btn sm" onClick={() => void allow()} disabled={running}>
                    접근 허용
                  </button>
                  <button className="btn sm ghost" onClick={() => void fill(true)} disabled={running}>
                    이 페이지 부분만 입력
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="empty">저장된 이력서가 없습니다. 먼저 이력서를 입력해 주세요.</p>
            <button className="btn primary lg" onClick={openOptions}>
              이력서 입력하러 가기
            </button>
            <button className="btn lg" onClick={openBackup}>
              JSON 가져오기
            </button>
          </>
        )}
        {message && <p className="msg">{message}</p>}
      </div>
      <footer className="popup-foot">
        <button className="btn ghost sm" onClick={openOptions}>
          이력서 편집
        </button>
        {consented && sites.length > 0 && (
          <button className="btn ghost sm" onClick={openSites}>
            연동 사이트 모두 열기{outdated > 0 && ` (갱신 필요 ${outdated})`}
          </button>
        )}
      </footer>
    </main>
  );
}
