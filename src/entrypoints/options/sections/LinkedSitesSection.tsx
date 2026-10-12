import { useEffect, useState, type FormEvent } from 'react';
import { needsUpdate, normalizeSiteUrl, type LinkedSite } from '@/core/linked-sites';
import { isExcluded } from '@/core/site-policy';
import { linkedSitesItem, settingsItem } from '@/storage/items';
import type { SectionProps } from '../fields';

// 화면 설계: docs/design/screens.md 4장 '연동 사이트', 흐름 architecture.md 7.5

const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleString('ko-KR') : '-');

export function LinkedSitesSection({ resume }: SectionProps) {
  const [sites, setSites] = useState<LinkedSite[] | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    linkedSitesItem.getValue().then(setSites);
    return linkedSitesItem.watch(setSites);
  }, []);

  if (!sites) return <p className="desc">불러오는 중…</p>;

  // 화면 먼저 갱신 후 저장 (SettingsSection과 같은 방식)
  const save = (next: LinkedSite[]) => {
    setSites(next);
    return linkedSitesItem.setValue(next);
  };
  const move = (index: number, delta: number) => {
    const next = [...sites];
    const [it] = next.splice(index, 1);
    next.splice(index + delta, 0, it!);
    void save(next);
  };
  const openAll = () => void browser.windows.create({ url: sites.map((s) => s.url) });

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const normalized = normalizeSiteUrl(url);
    if (!normalized) return setMessage('주소 형식이 아닙니다. 예: https://www.example.com/resume');
    if (sites.some((s) => s.url === normalized)) return setMessage('이미 등록한 주소입니다.');
    const host = new URL(normalized).hostname;
    await save([...sites, { id: crypto.randomUUID(), name: name.trim() || host, url: normalized }]);
    setName('');
    setUrl('');
    const { excludedSites } = await settingsItem.getValue();
    setMessage(
      isExcluded(normalized) || isExcluded(normalized, excludedSites)
        ? `${host}은(는) 자동 입력 제외 사이트입니다. 열기만 가능하며 복사 전용 모드로 사용할 수 있습니다.`
        : '',
    );
  };

  const outdated = sites.filter((s) => needsUpdate(s, resume.meta.updatedAt)).length;

  return (
    <>
      <p className="desc">
        이력서를 등록해 둔 채용 사이트의 이력서 수정 페이지를 등록하면 한 번에 열 수 있습니다. 로그인 후 각 탭에서 툴바 아이콘의
        '작성'을 눌러 최신 이력서로 갱신해 주세요.
      </p>
      <div className="card">
        <div className="card-head">
          <b>등록한 사이트{sites.length > 0 && ` · 갱신 필요 ${outdated}개`}</b>
          <button type="button" className="btn primary" disabled={!sites.length} onClick={openAll}>
            모두 열기
          </button>
        </div>
        {sites.length ? (
          <table>
            <thead>
              <tr>
                <th>이름</th>
                <th>주소</th>
                <th>마지막 작성</th>
                <th>상태</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sites.map((s, i) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{new URL(s.url).host}</td>
                  <td>{formatDate(s.lastFilledAt)}</td>
                  <td>
                    {needsUpdate(s, resume.meta.updatedAt) ? (
                      <span className="badge warn">갱신 필요</span>
                    ) : (
                      <span className="badge ok">최신</span>
                    )}
                  </td>
                  <td>
                    <span className="card-actions">
                      <button type="button" className="btn sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="위로">
                        ↑
                      </button>
                      <button
                        type="button"
                        className="btn sm"
                        disabled={i === sites.length - 1}
                        onClick={() => move(i, 1)}
                        aria-label="아래로"
                      >
                        ↓
                      </button>
                      <button type="button" className="btn sm" onClick={() => void browser.tabs.create({ url: s.url })}>
                        열기
                      </button>
                      <button type="button" className="btn sm danger" onClick={() => void save(sites.filter((x) => x.id !== s.id))}>
                        삭제
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="desc">등록한 사이트가 없습니다.</p>
        )}
        <form className="toolbar" style={{ marginTop: 12 }} onSubmit={(e) => void add(e)}>
          <input aria-label="사이트 이름" placeholder="이름 (예: 사람인)" value={name} onChange={(e) => setName(e.target.value)} />
          <input aria-label="이력서 페이지 주소" placeholder="이력서 수정 페이지 주소" value={url} onChange={(e) => setUrl(e.target.value)} />
          <button type="submit" className="btn">
            추가
          </button>
        </form>
        {message && (
          <p className="desc" role="status">
            {message}
          </p>
        )}
      </div>
    </>
  );
}
