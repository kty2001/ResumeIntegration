import { useEffect, useState, type ChangeEvent } from 'react';
import { ATTACHMENT_KIND_LABELS, toOptions } from '@/core/schema/labels';
import type { AttachmentKind, AttachmentMeta } from '@/core/schema/resume';
import { deleteFile, listFileIds, putFile } from '@/storage/files';
import type { SectionProps } from '../fields';

// 화면 설계: docs/design/screens.md 4장 '첨부 파일' — 메타는 resume.attachments, 본문은 IndexedDB (storage/files.ts)
// 지원서의 파일 입력란에 구분(증명사진·이력서 등)별 첫 파일을 올림

const KIND_OPTIONS = toOptions(ATTACHMENT_KIND_LABELS);

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export function AttachmentSection({ resume, update }: SectionProps) {
  const [kind, setKind] = useState<AttachmentKind>('resume');
  const [stored, setStored] = useState<Set<string>>();
  const [message, setMessage] = useState('');

  // 백업 가져오기 등으로 메타만 있고 본문이 없는 파일 표시
  useEffect(() => {
    listFileIds().then((ids) => setStored(new Set(ids)));
  }, [resume.attachments]);

  const add = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const meta: AttachmentMeta = {
      id: crypto.randomUUID(),
      kind,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      addedAt: new Date().toISOString(),
    };
    try {
      await putFile(meta.id, file);
    } catch {
      return setMessage('파일을 저장하지 못했습니다.');
    }
    update((r) => ({
      ...r,
      attachments: [...r.attachments, meta],
      // 첫 증명사진은 기본 정보 사진으로 연결
      basics: kind === 'photo' && !r.basics.photo ? { ...r.basics, photo: meta.id } : r.basics,
    }));
    setMessage(`${file.name}을(를) 추가했습니다.`);
  };

  const remove = async (meta: AttachmentMeta) => {
    await deleteFile(meta.id);
    update((r) => {
      const { photo, ...basics } = r.basics;
      return {
        ...r,
        attachments: r.attachments.filter((a) => a.id !== meta.id),
        basics: photo === meta.id ? basics : r.basics,
      };
    });
    setMessage('');
  };

  return (
    <>
      <p className="desc">지원서의 파일 입력란(증명사진·이력서·포트폴리오 등)에 구분별 첫 파일을 올립니다. 파일은 이 브라우저에만 저장되며 백업 파일에는 포함되지 않습니다.</p>
      <div className="card">
        {resume.attachments.length ? (
          <table>
            <thead>
              <tr>
                <th>구분</th>
                <th>파일명</th>
                <th>크기</th>
                <th>추가일</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {resume.attachments.map((a) => (
                <tr key={a.id}>
                  <td>{ATTACHMENT_KIND_LABELS[a.kind]}</td>
                  <td>
                    {a.fileName}
                    {stored && !stored.has(a.id) && <small style={{ color: 'var(--err-text)' }}> (파일 없음 — 다시 추가해 주세요)</small>}
                  </td>
                  <td>{formatSize(a.size)}</td>
                  <td>{new Date(a.addedAt).toLocaleDateString('ko-KR')}</td>
                  <td>
                    <button type="button" className="btn danger" onClick={() => void remove(a)}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="desc">추가한 파일이 없습니다.</p>
        )}
        <div className="toolbar" style={{ marginTop: 12 }}>
          <select aria-label="첨부 구분" value={kind} onChange={(e) => setKind(e.target.value as AttachmentKind)}>
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input type="file" aria-label="첨부할 파일" onChange={(e) => void add(e)} />
        </div>
        {message && (
          <p className="desc" role="status">
            {message}
          </p>
        )}
      </div>
    </>
  );
}
