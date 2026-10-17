import { useEffect, useState } from 'react';
import type { Resume, ResumeEntry } from '@/core/schema/resume';
import { deleteFile, getFile, putFile } from '@/storage/files';
import { activeResumeIdItem, resumesItem } from '@/storage/items';
import type { Updater } from './fields';
import { newResumeEntry } from './useResume';

// 이력서 여러 개: 선택(= '작성' 대상)·이름 변경·새 이력서·복제·삭제 (screens.md 4장)
// 첨부 파일은 이력서별 → 복제 시 본문을 새 id로 복사, 삭제 시 본문도 삭제

interface Props {
  entry: ResumeEntry;
  updateEntry: Updater<ResumeEntry>;
  flush: () => Promise<void>;
}

/** 첨부 파일 본문을 새 id로 복사한 이력서 (본문이 없는 파일은 메타만 새 id) */
async function copyAttachments(resume: Resume): Promise<Resume> {
  const ids = new Map<string, string>();
  for (const a of resume.attachments) {
    const id = crypto.randomUUID();
    const blob = await getFile(a.id);
    if (blob) await putFile(id, blob);
    ids.set(a.id, id);
  }
  const photo = resume.basics.photo && ids.get(resume.basics.photo);
  return {
    ...resume,
    attachments: resume.attachments.map((a) => ({ ...a, id: ids.get(a.id)! })),
    basics: photo ? { ...resume.basics, photo } : resume.basics,
  };
}

export function ResumeSwitcher({ entry, updateEntry, flush }: Props) {
  const [list, setList] = useState<ResumeEntry[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    resumesItem.getValue().then(setList);
    return resumesItem.watch(setList);
  }, []);

  // 아직 저장 전인 첫 이력서도 표시, 현재 이력서 이름은 편집 중인 값
  const items = list.some((e) => e.id === entry.id) ? list : [...list, entry];

  const select = async (id: string) => {
    await flush();
    setConfirmDelete(false);
    await activeResumeIdItem.setValue(id);
  };

  const add = async (next: ResumeEntry) => {
    await flush();
    // 저장 전인 첫 이력서(편집 없음)도 목록에 남김
    const saved = await resumesItem.getValue();
    const base = saved.some((e) => e.id === entry.id) ? saved : [...saved, entry];
    await resumesItem.setValue([...base, next]);
    await select(next.id);
  };

  const addEmpty = () => add(newResumeEntry(`이력서 ${items.length + 1}`));

  const duplicate = async () =>
    add(newResumeEntry(`${entry.title} 복사본`, await copyAttachments(structuredClone(entry.resume))));

  const remove = async () => {
    await flush();
    await Promise.all(entry.resume.attachments.map((a) => deleteFile(a.id)));
    const rest = (await resumesItem.getValue()).filter((e) => e.id !== entry.id);
    await resumesItem.setValue(rest);
    await activeResumeIdItem.setValue(rest[0]?.id ?? null);
    setConfirmDelete(false);
  };

  return (
    <div className="resume-switcher">
      <select aria-label="이력서 선택" value={entry.id} onChange={(e) => void select(e.target.value)}>
        {items.map((e) => (
          <option key={e.id} value={e.id}>
            {(e.id === entry.id ? entry.title : e.title) || '이름 없음'}
          </option>
        ))}
      </select>
      <input
        aria-label="이력서 이름"
        placeholder="이력서 이름"
        value={entry.title}
        onChange={(e) => updateEntry((prev) => ({ ...prev, title: e.target.value }))}
      />
      <button type="button" className="btn sm" onClick={() => void addEmpty()}>
        새 이력서
      </button>
      <button type="button" className="btn sm" aria-label="이력서 복제" onClick={() => void duplicate()}>
        복제
      </button>
      {confirmDelete ? (
        <>
          <button type="button" className="btn sm danger" onClick={() => void remove()}>
            정말 삭제
          </button>
          <button type="button" className="btn sm" onClick={() => setConfirmDelete(false)}>
            취소
          </button>
        </>
      ) : (
        <button type="button" className="btn sm danger" aria-label="이력서 삭제" onClick={() => setConfirmDelete(true)}>
          삭제
        </button>
      )}
    </div>
  );
}
