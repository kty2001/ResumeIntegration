import { useEffect, useMemo, useState } from 'react';
import { applyImport, diffImport, newCoverLetterCandidates, type ImportDraft } from '@/core/import';
import { newCoverLetter } from '@/core/schema/empty';
import type { CoverLetterEntry } from '@/core/schema/resume';
import { coverLettersItem, importDraftItem } from '@/storage/items';
import type { SectionProps } from '../fields';

// 화면 설계: docs/design/screens.md 4장 '가져오기 미리 보기', 흐름 architecture.md 7.4

export function ImportSection({ resume, update }: SectionProps) {
  const [draft, setDraft] = useState<ImportDraft | null>();
  const [coverLetters, setCoverLetters] = useState<CoverLetterEntry[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');

  useEffect(() => {
    importDraftItem.getValue().then(setDraft, () => setDraft(null));
    coverLettersItem.getValue().then(setCoverLetters);
    const unwatch = [importDraftItem.watch(setDraft), coverLettersItem.watch(setCoverLetters)];
    return () => unwatch.forEach((fn) => fn());
  }, []);

  // 비교는 미리 보기 시점의 이력서 기준
  const groups = useMemo(() => (draft ? diffImport(resume, draft.items) : []), [draft, resume]);
  const candidates = useMemo(
    () => (draft ? newCoverLetterCandidates(coverLetters, draft.coverLetters) : []),
    [draft, coverLetters],
  );

  // 새 가져오기 결과마다 기본 선택(현재 값이 빈 항목·자기소개서 후보)으로 초기화 (이력서 자동 저장마다 초기화하지 않도록 draft만 의존)
  useEffect(() => {
    if (!draft) return;
    const rows = diffImport(resume, draft.items).flatMap((g) => g.rows);
    setSelected(new Set([...rows.filter((r) => r.selected).map((r) => r.id), ...draft.coverLetters.map((_, i) => `cover:${i}`)]));
    setMessage('');
  }, [draft]);

  if (draft === undefined) return <p className="desc">불러오는 중…</p>;

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const apply = async () => {
    if (!draft) return;
    update((prev) => applyImport(prev, groups, selected));
    const added = draft.coverLetters
      .filter((c, i) => selected.has(`cover:${i}`) && candidates.includes(c))
      .map((c) => ({ ...newCoverLetter(), question: c.question, answer: c.answer }));
    if (added.length) await coverLettersItem.setValue([...(await coverLettersItem.getValue()), ...added]);
    await importDraftItem.setValue(null);
    setMessage('선택한 항목을 이력서에 반영했습니다.');
  };
  const cancel = async () => {
    await importDraftItem.setValue(null);
    setMessage('가져온 내용을 버렸습니다.');
  };

  const status = message && (
    <p className="desc" role="status">
      {message}
    </p>
  );

  if (!draft)
    return (
      <>
        {status}
        <p className="desc">
          채용 사이트의 이력서 수정 페이지에서 툴바 아이콘을 누르고 '이 페이지에서 가져오기'를 선택하면, 페이지에 작성된 값을 여기서
          확인한 뒤 이력서에 반영할 수 있습니다. 읽은 값은 이 브라우저에만 저장됩니다.
        </p>
      </>
    );

  const indexOf = (c: ImportDraft['coverLetters'][number]) => draft.coverLetters.indexOf(c);
  const count = groups.reduce((n, g) => n + g.rows.filter((r) => selected.has(r.id)).length, 0) +
    candidates.filter((c) => selected.has(`cover:${indexOf(c)}`)).length;
  // '확인 필요'(역변환 실패) 항목은 선택 불가라 제외
  const selectable = [
    ...groups.flatMap((g) => g.rows.filter((r) => r.value !== undefined).map((r) => r.id)),
    ...candidates.map((c) => `cover:${indexOf(c)}`),
  ];
  const selectAll = () => setSelected((prev) => new Set([...prev, ...selectable]));

  return (
    <>
      <p className="desc">
        {new URL(draft.url).host} · {new Date(draft.at).toLocaleString('ko-KR')}에 가져온 내용입니다. 비어 있던 항목은 기본 선택,
        현재 값과 다른 항목은 기본 선택 해제 상태입니다.
      </p>
      {status}
      {groups.length === 0 && candidates.length === 0 && <p className="desc">현재 이력서와 다른 항목이 없습니다.</p>}
      {groups.map((g) => (
        <div className="card" key={g.id}>
          <div className="card-head">
            <b>{g.title}</b>
          </div>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>항목</th>
                <th>현재 값</th>
                <th>가져온 값</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`${g.title} ${r.label} 반영`}
                      checked={selected.has(r.id)}
                      disabled={r.value === undefined}
                      onChange={(e) => toggle(r.id, e.target.checked)}
                    />
                  </td>
                  <td>{r.label}</td>
                  <td>{r.current ?? '-'}</td>
                  <td>
                    {r.imported}
                    {r.value === undefined && <span className="badge warn">확인 필요</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {candidates.length > 0 && (
        <div className="card">
          <div className="card-head">
            <b>자기소개서 후보</b>
          </div>
          <p className="desc">선택하면 자기소개서 라이브러리에 추가합니다.</p>
          {candidates.map((c) => {
            const id = `cover:${indexOf(c)}`;
            return (
              <label className="check" key={id}>
                <input type="checkbox" checked={selected.has(id)} onChange={(e) => toggle(id, e.target.checked)} />
                <span>
                  <b>{c.question}</b> — {c.answer.length > 80 ? `${c.answer.slice(0, 80)}…` : c.answer}
                </span>
              </label>
            );
          })}
        </div>
      )}
      <div className="card-actions">
        <button type="button" className="btn primary" disabled={count === 0} onClick={() => void apply()}>
          선택 항목 반영 ({count})
        </button>
        <button type="button" className="btn" disabled={selectable.every((id) => selected.has(id))} onClick={selectAll}>
          모두 선택
        </button>
        <button type="button" className="btn" onClick={() => void cancel()}>
          취소
        </button>
      </div>
    </>
  );
}
