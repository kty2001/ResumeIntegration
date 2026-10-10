import { useState, type ChangeEvent } from 'react';
import { backupFileName, createBackup, parseBackup, type Backup } from '@/core/backup';
import { coverLettersItem, fillReportItem, learnedRulesItem, resumeItem } from '@/storage/items';

// 화면 설계: docs/design/screens.md 4장 '백업' (JSON 내보내기/가져오기, 전체 삭제)
// 확인 단계는 window.confirm 대신 화면 내 버튼

function download(fileName: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  // 다운로드 시작 전에 해제되지 않도록 지연
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleString('ko-KR') : '-');

export function BackupSection() {
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<Backup | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const exportBackup = async () => {
    const backup = createBackup({
      resume: await resumeItem.getValue(),
      coverLetters: await coverLettersItem.getValue(),
      learnedRules: await learnedRulesItem.getValue(),
    });
    download(backupFileName(), JSON.stringify(backup, null, 2));
    setMessage('백업 파일을 저장했습니다.');
  };

  const selectFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const result = parseBackup(await file.text());
    setPreview(result.ok ? result.backup : null);
    setMessage(result.ok ? '' : result.error);
  };

  const applyBackup = async (backup: Backup) => {
    await resumeItem.setValue(backup.resume);
    await coverLettersItem.setValue(backup.coverLetters);
    await learnedRulesItem.setValue(backup.learnedRules);
    setPreview(null);
    setMessage('백업 파일을 가져왔습니다.');
  };

  const deleteAll = async () => {
    await Promise.all([
      resumeItem.removeValue(),
      coverLettersItem.removeValue(),
      learnedRulesItem.removeValue(),
      fillReportItem.removeValue(),
    ]);
    setConfirmDelete(false);
    setMessage('모든 데이터를 삭제했습니다.');
  };

  return (
    <>
      <p className="desc">이력서·자기소개서·학습 규칙을 JSON 파일로 저장하거나 불러옵니다. 데이터는 이 브라우저에만 저장됩니다.</p>
      {message && (
        <p className="desc" role="status">
          {message}
        </p>
      )}

      <div className="card">
        <div className="card-head">
          <b>내보내기</b>
          <button type="button" className="btn" onClick={() => void exportBackup()}>
            내보내기
          </button>
        </div>
        <p className="desc">파일에 개인정보가 들어 있으므로 안전한 곳에 보관해 주세요.</p>
      </div>

      <div className="card">
        <div className="card-head">
          <b>가져오기</b>
          <input type="file" accept=".json,application/json" aria-label="백업 파일 선택" onChange={(e) => void selectFile(e)} />
        </div>
        {preview ? (
          <>
            <p className="desc">
              이름 {preview.resume?.basics.name.ko || '-'} · 이력서 수정 {formatDate(preview.resume?.meta.updatedAt)} · 학력{' '}
              {preview.resume?.education.length ?? 0} · 경력 {preview.resume?.work.length ?? 0} · 학습 규칙 {preview.learnedRules.length} ·
              백업 {formatDate(preview.exportedAt)}
            </p>
            <p className="desc">현재 데이터를 이 파일 내용으로 덮어씁니다.</p>
            <div className="card-actions">
              <button type="button" className="btn danger" onClick={() => void applyBackup(preview)}>
                덮어쓰기
              </button>
              <button type="button" className="btn" onClick={() => setPreview(null)}>
                취소
              </button>
            </div>
          </>
        ) : (
          <p className="desc">이 확장 프로그램에서 내보낸 백업 파일을 선택해 주세요.</p>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <b>전체 삭제</b>
          {confirmDelete ? (
            <div className="card-actions">
              <button type="button" className="btn danger" onClick={() => void deleteAll()}>
                정말 삭제
              </button>
              <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>
                취소
              </button>
            </div>
          ) : (
            <button type="button" className="btn danger" onClick={() => setConfirmDelete(true)}>
              전체 삭제
            </button>
          )}
        </div>
        <p className="desc">이력서·자기소개서·학습 규칙·입력 결과를 모두 지웁니다. 되돌릴 수 없습니다.</p>
      </div>
    </>
  );
}
