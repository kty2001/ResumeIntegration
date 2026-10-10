import { useEffect, useState, type ReactNode } from 'react';
import { resolveValue } from '@/core/mapping/match';
import { skipField } from '@/core/mapping/report';
import type { Resume } from '@/core/schema/resume';
import { schemaKeyLabel, schemaKeyOptions } from '@/core/schema/labels';
import { describeStartFill, sendMessage, type ActionResponse, type FillReport, type ReportField } from '@/messaging/protocol';
import { fillReportItem, resumeItem } from '@/storage/items';

// 화면 설계: docs/design/screens.md 3장 (현재: 입력 결과 목록·복사·직접 입력·선택지 직접 선택·이동·건너뛰기·다시 작성·되돌리기·위치 표시)

const REASON_LABELS: Record<string, string> = {
  'not-found': '입력란을 찾을 수 없음',
  'too-long': '글자수 제한 초과',
  'not-applied': '값이 반영되지 않음',
  'no-option': '맞는 선택지 없음',
};

const keyLabel = (schemaKey?: string) => (schemaKey ? schemaKeyLabel(schemaKey) : '');

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return <button onClick={copy}>{copied ? '복사됨' : '복사'}</button>;
}

function ValueRow({ label, note, value, children }: { label: string; note?: string; value?: string; children?: ReactNode }) {
  return (
    <li style={{ marginBottom: 6 }}>
      <strong>{label}</strong> {note}
      <br />
      {value ? <>{value} <CopyButton value={value} /></> : '이력서 값 없음'}
      {children && <div>{children}</div>}
    </li>
  );
}

type Notify = (message: string) => void;

/** 응답이 오류면 메시지 표시, 아니면 지움 */
const notifyError = (notify: Notify, r: ActionResponse) => notify(r.status === 'error' ? r.message : '');

function FocusButton({ fieldId, notify }: { fieldId: string; notify: Notify }) {
  const focus = async () => notifyError(notify, await sendMessage('focusField', { fieldId }));
  return <button onClick={focus}>이동</button>;
}

/** 이력서 항목 선택 → '입력'(fillOne) */
function FillControls({ field, options, notify }: { field: ReportField; options: [string, string][]; notify: Notify }) {
  const [schemaKey, setSchemaKey] = useState(field.schemaKey ?? '');
  const fill = async () => notifyError(notify, await sendMessage('fillOne', { fieldId: field.fieldId, schemaKey }));
  return (
    <>
      <select aria-label={`${field.label} 이력서 항목`} value={schemaKey} onChange={(e) => setSchemaKey(e.target.value)}>
        <option value="">이력서 항목 선택</option>
        {options.map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>{' '}
      <button disabled={!schemaKey} onClick={fill}>
        입력
      </button>{' '}
      <FocusButton fieldId={field.fieldId} notify={notify} />
    </>
  );
}

/** select 선택지 직접 선택 → '선택'(fillOne optionValue, 선택 결과 학습) */
function OptionControls({ field, notify }: { field: ReportField & { schemaKey: string }; notify: Notify }) {
  const [optionValue, setOptionValue] = useState('');
  const choose = async () =>
    notifyError(notify, await sendMessage('fillOne', { fieldId: field.fieldId, schemaKey: field.schemaKey, optionValue }));
  return (
    <>
      <select aria-label={`${field.label} 선택지`} value={optionValue} onChange={(e) => setOptionValue(e.target.value)}>
        <option value="">사이트 선택지 선택</option>
        {field.hint.options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.text}
          </option>
        ))}
      </select>{' '}
      <button disabled={!optionValue} onClick={choose}>
        선택
      </button>{' '}
      <FocusButton fieldId={field.fieldId} notify={notify} />
    </>
  );
}

export default function App() {
  const [resume, setResume] = useState<Resume | null>(null);
  const [report, setReport] = useState<FillReport | null>(null);
  const [notice, setNotice] = useState('');
  const [highlightOn, setHighlightOn] = useState(false);

  useEffect(() => {
    resumeItem.getValue().then(setResume);
    fillReportItem.getValue().then(setReport);
    const unwatchResume = resumeItem.watch(setResume);
    const unwatchReport = fillReportItem.watch(setReport);
    return () => {
      unwatchResume();
      unwatchReport();
    };
  }, []);

  // 결과가 바뀌면(fillOne 등) 상태 색도 갱신. 결과 초기화(undo·재작성) 시 해제는 filler가 처리
  useEffect(() => {
    if (!report) return;
    const fields = highlightOn ? report.fields.map(({ fieldId, status }) => ({ fieldId, status })) : [];
    sendMessage('highlight', { fields }).then((r) => {
      if (highlightOn && r.status === 'error') setNotice(r.message);
    });
  }, [report, highlightOn]);

  // 복사·표시용 값: enum 코드는 표시명으로
  const valueOf = (schemaKey?: string) => (resume && schemaKey ? resolveValue(resume, schemaKey, { widget: 'text' }) : undefined);
  // 확인 필요 행 값: 입력란 형식으로 변환, select는 선택지 value 대신 표시명
  const failedValue = (f: ReportField) =>
    resume && f.schemaKey ? resolveValue(resume, f.schemaKey, f.hint.widget === 'select' ? { widget: 'text' } : f.hint) : undefined;
  const byStatus = (status: ReportField['status']) => report?.fields.filter((f) => f.status === status) ?? [];
  const filled = byStatus('filled');
  const failed = byStatus('failed');
  const unmatched = byStatus('unmatched');
  const copyable = resume ? schemaKeyOptions(resume).filter(([key]) => valueOf(key)) : [];

  const undo = async () => {
    const r = await sendMessage('undo');
    setNotice(r.status === 'ok' ? `${r.restored}개 되돌림` : r.message);
  };

  // 같은 탭 재작성 (activeTab 부여가 남아 있는 같은 페이지에서만 동작)
  const refill = async (tabId: number) => {
    setNotice(describeStartFill(await sendMessage('startFill', { tabId })));
  };

  // 확인 필요 → 해당 없음 (보고서만 변경, 페이지 조작 없음)
  const skip = async (fieldId: string) => {
    const current = await fillReportItem.getValue();
    if (current) await fillReportItem.setValue(skipField(current, fieldId));
  };

  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ fontSize: 16, margin: 0 }}>입력 결과</h1>
      {notice && <p role="status">{notice}</p>}
      {report ? (
        <>
          <p>
            입력 완료 {filled.length} · 확인 필요 {failed.length} · 해당 없음 {unmatched.length}
            <br />
            <small>
              {report.url} · {new Date(report.at).toLocaleTimeString()}
            </small>
          </p>
          {report.fields.length > 0 && (
            <button onClick={() => setHighlightOn(!highlightOn)}>
              {highlightOn ? '위치 표시 끄기' : '입력 항목 위치 보기'}
            </button>
          )}{' '}
          <button onClick={() => void refill(report.tabId)}>다시 작성</button>{' '}
          {filled.length > 0 && <button onClick={undo}>되돌리기</button>}
          {highlightOn && (
            <p>
              <small>테두리: 초록 입력 완료 · 주황 확인 필요 · 회색 해당 없음</small>
            </p>
          )}

          {failed.length > 0 && (
            <section>
              <h2 style={{ fontSize: 14 }}>확인 필요</h2>
              <ul>
                {failed.map((f) => (
                  <ValueRow
                    key={f.fieldId}
                    label={f.label}
                    note={`→ ${keyLabel(f.schemaKey)} (${REASON_LABELS[f.reason ?? ''] ?? f.reason})`}
                    value={failedValue(f)}
                  >
                    {f.schemaKey && f.hint.options?.length ? (
                      <OptionControls field={{ ...f, schemaKey: f.schemaKey }} notify={setNotice} />
                    ) : (
                      <FillControls field={f} options={copyable} notify={setNotice} />
                    )}{' '}
                    <button onClick={() => void skip(f.fieldId)}>건너뛰기</button>
                  </ValueRow>
                ))}
              </ul>
            </section>
          )}

          {filled.length > 0 && (
            <section>
              <h2 style={{ fontSize: 14 }}>입력 완료</h2>
              <ul>
                {filled.map((f) => (
                  <li key={f.fieldId}>
                    {f.label} → {keyLabel(f.schemaKey)}
                    {f.source === 'learned' && ' (학습)'} <FocusButton fieldId={f.fieldId} notify={setNotice} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {unmatched.length > 0 && (
            <details>
              <summary>해당 없음 {unmatched.length}개</summary>
              <ul>
                {unmatched.map((f) => (
                  <li key={f.fieldId} style={{ marginBottom: 6 }}>
                    {f.label}
                    <div>
                      <FillControls field={f} options={copyable} notify={setNotice} />
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      ) : (
        <p>'작성'을 누르면 결과가 표시됩니다.</p>
      )}

      <section>
        <h2 style={{ fontSize: 14 }}>이력서 항목 복사</h2>
        {copyable.length > 0 ? (
          <ul>
            {copyable.map(([key, label]) => (
              <ValueRow key={key} label={label} value={valueOf(key)} />
            ))}
          </ul>
        ) : (
          <p>저장된 이력서 값이 없습니다.</p>
        )}
      </section>
    </main>
  );
}
