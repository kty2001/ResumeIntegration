import { useState } from 'react';
import { countLength, filterCoverLetters } from '@/core/coverLetter';
import { newCoverLetter } from '@/core/schema/empty';
import { COVER_LETTER_TAG_LABELS, LENGTH_UNIT_LABELS, toOptions } from '@/core/schema/labels';
import type { CoverLetterEntry, CoverLetterTag } from '@/core/schema/resume';
import { coverLettersItem } from '@/storage/items';
import { CheckField, MonthField, NumberField, RepeatList, SelectField, setOrOmit, TextArea, TextField } from '../fields';
import { saveStatusText, useAutoSave } from '../useResume';

// 화면 설계: docs/design/screens.md 4장 '자기소개서' — 문항·답변 라이브러리 (local:coverLetters, 이력서와 별도 저장)

const TAG_OPTIONS = toOptions(COVER_LETTER_TAG_LABELS);
const loadEntries = (saved: CoverLetterEntry[]) => saved;
const keepEntries = (next: CoverLetterEntry[]) => next;

/** 목록 글자수: 제한이 있으면 '현재 / 제한'(제한 기준), 없으면 공백 포함 */
function lengthSummary(e: CoverLetterEntry): string {
  const count = countLength(e.answer, e.limit?.unit ?? 'chars_with_space');
  return e.limit ? `${count.toLocaleString()} / ${e.limit.count.toLocaleString()}` : count.toLocaleString();
}

function Editor({ entry, set }: { entry: CoverLetterEntry; set: (next: CoverLetterEntry) => void }) {
  const over = entry.limit && countLength(entry.answer, entry.limit.unit) > entry.limit.count;
  const setLimit = (count: number | undefined, unit = entry.limit?.unit ?? 'chars_with_space') =>
    set(setOrOmit(entry, 'limit', count === undefined ? undefined : { count, unit }));
  return (
    <div className="grid">
      <TextField label="문항" required wide value={entry.question} onChange={(v) => set({ ...entry, question: v })} />
      <NumberField label="글자수 제한" value={entry.limit?.count} onChange={(v) => setLimit(v)} />
      <SelectField
        label="글자수 기준"
        options={toOptions(LENGTH_UNIT_LABELS)}
        disabled={!entry.limit}
        value={entry.limit?.unit ?? 'chars_with_space'}
        onChange={(unit) => unit && setLimit(entry.limit?.count, unit)}
      />
      <div className="field wide">
        <span className="field-label">태그</span>
        <div className="checks">
          {TAG_OPTIONS.map((o) => (
            <CheckField
              key={o.value}
              label={o.label}
              checked={entry.tags.includes(o.value)}
              onChange={(on) =>
                set({ ...entry, tags: on ? [...entry.tags, o.value] : entry.tags.filter((t) => t !== o.value) })
              }
            />
          ))}
        </div>
      </div>
      <TextArea label="답변" required value={entry.answer} onChange={(v) => set({ ...entry, answer: v })} />
      <p className={over ? 'count over' : 'count'} role="status">
        공백 포함 {countLength(entry.answer, 'chars_with_space').toLocaleString()}자 · 공백 제외{' '}
        {countLength(entry.answer, 'chars_without_space').toLocaleString()}자 ·{' '}
        {countLength(entry.answer, 'bytes').toLocaleString()}바이트
        {over && ` · ${LENGTH_UNIT_LABELS[entry.limit!.unit]} ${entry.limit!.count.toLocaleString()} 초과`}
      </p>
      <div className="field wide">
        <span className="field-label">사용처</span>
        <RepeatList
          items={entry.usages}
          onChange={(usages) => set({ ...entry, usages })}
          create={(): CoverLetterEntry['usages'][number] => ({ company: '' })}
          title={(u, i) => u.company || `사용처 ${i + 1}`}
          addLabel="사용처 추가"
          render={(u, setUsage) => (
            <>
              <TextField label="기업" value={u.company} onChange={(v) => setUsage({ ...u, company: v })} />
              <MonthField label="사용 시기" value={u.date} onChange={(v) => setUsage(setOrOmit(u, 'date', v))} />
            </>
          )}
        />
      </div>
    </div>
  );
}

export function CoverLetterSection() {
  const { value: entries, update, status } = useAutoSave(coverLettersItem, loadEntries, keepEntries);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<CoverLetterTag | undefined>();
  const [selectedId, setSelectedId] = useState<string>();
  if (!entries) return <p className="desc">{saveStatusText(status)}</p>;

  const visible = filterCoverLetters(entries, query, tag);
  const selected = entries.find((e) => e.id === selectedId);
  const replace = (next: CoverLetterEntry) =>
    update((list) => list.map((e) => (e.id === next.id ? { ...next, updatedAt: new Date().toISOString() } : e)));
  const add = (base?: CoverLetterEntry) => {
    const entry = newCoverLetter();
    const copy = base ? { ...entry, question: base.question, tags: [...base.tags], answer: base.answer, limit: base.limit } : entry;
    update((list) => [...list, copy]);
    setSelectedId(copy.id);
  };
  const remove = (id: string) => {
    update((list) => list.filter((e) => e.id !== id));
    setSelectedId(undefined);
  };

  return (
    <>
      <p className="desc">
        작성했던 문항과 답변을 모아 둡니다. {status !== 'idle' && <small>{saveStatusText(status, selected?.updatedAt)}</small>}
      </p>
      <div className="card">
        <div className="toolbar">
          <input aria-label="문항·답변 검색" placeholder="문항·답변 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select
            aria-label="태그 필터"
            value={tag ?? ''}
            onChange={(e) => setTag((e.target.value || undefined) as CoverLetterTag | undefined)}
          >
            <option value="">전체 태그</option>
            {TAG_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        {visible.length ? (
          <table>
            <thead>
              <tr>
                <th>태그</th>
                <th>문항</th>
                <th>사용처</th>
                <th>글자수</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((e) => (
                <tr key={e.id} className={e.id === selectedId ? 'on' : undefined}>
                  <td>{e.tags.map((t) => COVER_LETTER_TAG_LABELS[t]).join(', ')}</td>
                  <td>{e.question || '(문항 없음)'}</td>
                  <td>{e.usages.map((u) => [u.company, u.date].filter(Boolean).join(' · ')).join(', ')}</td>
                  <td>{lengthSummary(e)}</td>
                  <td>
                    <button type="button" className="btn" onClick={() => setSelectedId(e.id)}>
                      편집
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="desc">{entries.length ? '검색 결과가 없습니다.' : '저장된 문항이 없습니다.'}</p>
        )}
      </div>
      <button type="button" className="btn add" onClick={() => add()}>
        + 문항 추가
      </button>

      {selected && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-head">
            <b>답변 편집</b>
            <span className="card-actions">
              <button type="button" className="btn" onClick={() => add(selected)}>
                복제
              </button>
              <button type="button" className="btn danger" onClick={() => remove(selected.id)}>
                삭제
              </button>
            </span>
          </div>
          <Editor entry={selected} set={replace} />
        </div>
      )}
    </>
  );
}
