import { useState } from 'react';
import { CONSENT_VERSION, consentItem } from '@/storage/items';

// 최초 실행 동의: docs/design/screens.md 5장 ①, 목업 docs/design/mockups/consent.html
// 문구는 초안 — 개인정보처리방침 작성 시 확정하고 링크 추가 (문구 변경 시 CONSENT_VERSION 올림)

export function ConsentModal({ onAccept }: { onAccept: () => void }) {
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const accept = async () => {
    setSaving(true);
    try {
      await consentItem.setValue({ version: CONSENT_VERSION, acceptedAt: new Date().toISOString() });
      onAccept();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="consent-title">
        <h2 id="consent-title" className="modal-head">
          시작하기 전에 확인해 주세요
        </h2>
        <div className="modal-body">
          <p>이 확장 프로그램은 저장해 둔 이력서로 채용 사이트 지원서를 채워 줍니다.</p>
          <ul className="consent-list">
            <li className="yes">
              이력서는 <b>이 브라우저에만</b> 저장됩니다.
            </li>
            <li className="yes">'작성' 버튼을 누른 탭에서만 동작합니다.</li>
            <li className="yes">
              입력만 하고 <b>제출은 하지 않습니다</b>. 제출 전 꼭 확인해 주세요.
            </li>
            <li className="no">개발자 서버로 데이터를 보내지 않습니다.</li>
            <li className="no">광고·제3자에게 데이터를 제공하지 않습니다.</li>
          </ul>
          <p className="desc">보훈·장애 등 민감정보는 입력하지 않아도 되며, 입력해도 기본값은 자동 입력 꺼짐입니다.</p>
          <label className="check">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />위 내용을
            확인했습니다.
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn primary" disabled={!checked || saving} onClick={() => void accept()}>
            시작하기
          </button>
        </div>
      </div>
    </div>
  );
}
