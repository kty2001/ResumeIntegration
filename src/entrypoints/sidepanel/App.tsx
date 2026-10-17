import { useEffect, useState, type ReactNode } from 'react';
import { COVER_LETTER_KEY, countLength, detectLimit, recentAnswers, recommendAnswers } from '@/core/coverLetter';
import { isSensitiveKey } from '@/core/mapping/dictionary';
import { isChoiceWidget, resolveValue } from '@/core/mapping/match';
import { skipField } from '@/core/mapping/report';
import type { CoverLetterEntry, Resume, ResumeEntry } from '@/core/schema/resume';
import { groupKeyOptions, LENGTH_UNIT_LABELS, schemaKeyLabel, schemaKeyOptions } from '@/core/schema/labels';
import { describeStartFill, sendMessage, type ActionResponse, type FillReport, type ReportField } from '@/messaging/protocol';
import { activeResumeItem, copyOnlyItem, coverLettersItem, fillReportItem, settingsItem, type Settings } from '@/storage/items';

// 화면 설계: docs/design/screens.md 3장 (현재: 입력 결과 목록·복사·직접 입력·선택지 직접 선택·이동·건너뛰기·다시 작성·되돌리기·위치 표시·자기소개서 추천·복사 전용 모드)

const REASON_LABELS: Record<string, string> = {
  'not-found': '입력란을 찾을 수 없음',
  'too-long': '글자수 제한 초과',
  'not-applied': '값이 반영되지 않음',
  'no-option': '맞는 선택지 없음',
  'no-file': '첨부 파일 없음',
};

const keyLabel = (schemaKey?: string) =>
  schemaKey === COVER_LETTER_KEY ? '자기소개서' : schemaKey ? schemaKeyLabel(schemaKey) : '';

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button className="btn sm" onClick={copy}>
      {copied ? '복사됨' : '복사'}
    </button>
  );
}

function ValueRow({
  label,
  note,
  value,
  className,
  children,
}: {
  label: string;
  note?: string;
  value?: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <li className={className}>
      <div className="item-label">{label}</div>{' '}
      {note && <div className="item-note">{note}</div>}
      <div className="item-value">
        {value ? <><span>{value}</span> <CopyButton value={value} /></> : <small>이력서 값 없음</small>}
      </div>
      {children && <div className="controls">{children}</div>}
    </li>
  );
}

type Notify = (message: string) => void;

/** 응답이 오류면 메시지 표시, 아니면 지움 */
const notifyError = (notify: Notify, r: ActionResponse) => notify(r.status === 'error' ? r.message : '');

function FocusButton({ fieldId, notify }: { fieldId: string; notify: Notify }) {
  const focus = async () => notifyError(notify, await sendMessage('focusField', { fieldId }));
  return (
    <button className="btn sm" onClick={focus}>
      이동
    </button>
  );
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
      <button className="btn sm" disabled={!schemaKey} onClick={fill}>
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
      <button className="btn sm" disabled={!optionValue} onClick={choose}>
        선택
      </button>{' '}
      <FocusButton fieldId={field.fieldId} notify={notify} />
    </>
  );
}

/** 서술형 입력란 문항과 비슷한 자기소개서 답변 추천 → 미리 보기·글자수 확인 후 '입력'(fillAnswer) */
const questionOf = (f: ReportField) => [f.label, f.hint.placeholder].filter(Boolean).join(' ');

function AnswerSuggestions({ field, answers, notify }: { field: ReportField; answers: CoverLetterEntry[]; notify: Notify }) {
  const limit = detectLimit(questionOf(field), field.hint.maxLength);
  const fill = async (coverLetterId: string) =>
    notifyError(notify, await sendMessage('fillAnswer', { fieldId: field.fieldId, coverLetterId }));
  return (
    <li className="card compact">
      <div className="item-head">
        <div>
          <div className="item-label">{field.label}</div>
          {field.titleFieldId && <div className="item-note">자유형 문항 · 제목도 함께 입력</div>}
          {limit && (
            <div className="item-note">
              ({LENGTH_UNIT_LABELS[limit.unit]} {limit.count.toLocaleString()}자 이내)
            </div>
          )}
        </div>
        <FocusButton fieldId={field.fieldId} notify={notify} />
      </div>
      <ul className="answers">
        {answers.map((a) => {
          const count = countLength(a.answer, limit?.unit ?? 'chars_with_space');
          const over = limit && count > limit.count;
          return (
            <li key={a.id}>
              <div className="item-head">
                <span>
                  {a.question}{' '}
                  <span className={over ? 'count over' : 'count'}>
                    · {count.toLocaleString()}
                    {limit && ` / ${limit.count.toLocaleString()}`}자{over && ' 초과'}
                  </span>
                </span>
                <button className="btn sm" onClick={() => void fill(a.id)}>
                  입력
                </button>
              </div>
              <details>
                <summary>미리 보기</summary>
                <p className="answer">{a.answer}</p>
              </details>
            </li>
          );
        })}
      </ul>
    </li>
  );
}

export default function App() {
  const [resume, setResume] = useState<Resume | null>(null);
  const [report, setReport] = useState<FillReport | null>(null);
  const [notice, setNotice] = useState('');
  const [highlightOn, setHighlightOn] = useState(false);

  const [coverLetters, setCoverLetters] = useState<CoverLetterEntry[]>([]);
  const [sensitive, setSensitive] = useState(false);
  const [copyOnly, setCopyOnly] = useState<{ tabId: number; url: string } | null>(null);

  useEffect(() => {
    const onResume = (e: ResumeEntry | null) => setResume(e?.resume ?? null);
    activeResumeItem.getValue().then(onResume);
    fillReportItem.getValue().then(setReport);
    coverLettersItem.getValue().then(setCoverLetters);
    const onSettings = (s: Settings) => setSensitive(!!s.sensitiveAutofill);
    settingsItem.getValue().then(onSettings);
    copyOnlyItem.getValue().then(setCopyOnly);
    const unwatchResume = activeResumeItem.watch(onResume);
    const unwatchReport = fillReportItem.watch(setReport);
    const unwatchCoverLetters = coverLettersItem.watch(setCoverLetters);
    const unwatchSettings = settingsItem.watch(onSettings);
    const unwatchCopyOnly = copyOnlyItem.watch(setCopyOnly);
    return () => {
      unwatchResume();
      unwatchReport();
      unwatchCoverLetters();
      unwatchSettings();
      unwatchCopyOnly();
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
  // 확인 필요 행 값: 입력란 형식으로 변환, select·radio는 선택지 value 대신 표시명, checkbox는 체크 여부
  const failedValue = (f: ReportField) => {
    if (!resume || !f.schemaKey) return undefined;
    const value = resolveValue(resume, f.schemaKey, isChoiceWidget(f.hint.widget) ? { widget: 'text' } : f.hint);
    if (f.hint.widget === 'file') return resume.attachments.find((a) => a.id === value)?.fileName;
    if (f.hint.widget !== 'checkbox' || !value) return value;
    return value === 'true' ? '체크' : '체크 해제';
  };
  const byStatus = (status: ReportField['status']) => report?.fields.filter((f) => f.status === status) ?? [];
  const filled = byStatus('filled');
  const failed = byStatus('failed');
  const unmatched = byStatus('unmatched');
  // 선택·복사 대상 항목: 민감정보는 설정 '민감정보 자동 입력 사용'을 켰을 때만
  const keyOptions = resume ? schemaKeyOptions(resume).filter(([key]) => sensitive || !isSensitiveKey(key)) : [];
  const copyable = keyOptions.filter(([key]) => valueOf(key));
  const copyGroups = groupKeyOptions(copyable);
  // checkbox 입력란은 boolean 값이 있는 항목만 선택 (텍스트 값 항목은 입력 불가)
  const checkable = resume ? keyOptions.filter(([key]) => resolveValue(resume, key, { widget: 'checkbox' })) : [];
  // 파일 입력란은 accept에 맞는 첨부 파일이 있는 구분만
  const fillOptions = (f: ReportField) => {
    if (f.hint.widget === 'checkbox') return checkable;
    if (f.hint.widget === 'file') return resume ? keyOptions.filter(([key]) => resolveValue(resume, key, f.hint)) : [];
    return copyable;
  };
  // 아직 입력하지 않은 서술형 입력란 중 비슷한 자기소개서 답변이 있는 것
  // 자유형(문항 제목을 직접 쓰는 입력란)은 문항 텍스트가 없으므로 비슷한 답변이 없으면 최근 수정한 답변
  const suggestions = (report?.fields ?? []).flatMap((f) => {
    if (f.hint.widget !== 'textarea' || f.status === 'filled') return [];
    let answers = recommendAnswers(coverLetters, questionOf(f));
    if (!answers.length && f.titleFieldId) answers = recentAnswers(coverLetters);
    return answers.length ? [{ field: f, answers }] : [];
  });

  // 직접 입력 행 key: 새 결과(다시 작성)에서는 fieldId가 다시 매겨지므로 선택 상자 상태 초기화
  const rowKey = (f: ReportField) => `${report?.at}:${f.fieldId}`;

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

  // 제외 사이트: 페이지 조작 없이 이력서 항목 복사만 (팝업 '복사 전용 모드 열기', '작성' 시 background가 해제)
  const copyOnlyHost = !report && copyOnly ? new URL(copyOnly.url).hostname : undefined;

  const summary = `입력 완료 ${filled.length} · 확인 필요 ${failed.length} · 해당 없음 ${unmatched.length}`;

  return (
    <main className="panel">
      <header className="panel-head">
        <h1>{copyOnlyHost ? '복사 전용 모드' : '입력 결과'}</h1>
        {copyOnlyHost && <small>{copyOnlyHost} · 자동 입력 제외 사이트</small>}
        {report && (
          <small>
            {report.url} · {new Date(report.at).toLocaleTimeString()}
          </small>
        )}
      </header>
      <div className="panel-body">
        {notice && (
          <p className="msg" role="status">
            {notice}
          </p>
        )}
        {report ? (
          <>
            <div className="summary" role="group" aria-label={summary}>
              <SummaryCard count={filled.length} label="입력 완료" tone="ok" />
              <SummaryCard count={failed.length} label="확인 필요" tone="warn" />
              <SummaryCard count={unmatched.length} label="해당 없음" />
            </div>
            <div className="actions">
              <button className="btn primary" onClick={() => void refill(report.tabId)}>
                다시 작성
              </button>
              {report.fields.length > 0 && (
                <button className="btn" onClick={() => setHighlightOn(!highlightOn)}>
                  {highlightOn ? '위치 표시 끄기' : '입력 항목 위치 보기'}
                </button>
              )}
              {filled.length > 0 && (
                <button className="btn ghost" onClick={undo}>
                  되돌리기
                </button>
              )}
            </div>
            {highlightOn && <small>테두리: 초록 입력 완료 · 주황 확인 필요 · 회색 해당 없음</small>}
            {/* 섹션별 저장(사람인)·자동 임시저장(잡코리아) 사이트 대비 (docs/reports/07_site_dom_survey.md 4장·6.1) */}
            <small>
              입력만 했습니다. 사이트의 저장 버튼(섹션별 저장 포함)을 눌러야 반영되며, 일부 사이트는 작성 중인 내용을 자동으로
              임시저장합니다. 섹션별로 저장하는 사이트에서 같은 항목을 여러 개 입력하려면 섹션을 저장한 뒤 다시 작성하세요.
            </small>

            {suggestions.length > 0 && (
              <section>
                <h2 className="sec-title">
                  자기소개서 추천 <span className="badge">{suggestions.length}</span>
                </h2>
                <ul className="stack">
                  {suggestions.map(({ field, answers }) => (
                    <AnswerSuggestions key={field.fieldId} field={field} answers={answers} notify={setNotice} />
                  ))}
                </ul>
              </section>
            )}

            {failed.length > 0 && (
              <section>
                <h2 className="sec-title">
                  확인 필요 <span className="badge warn">{failed.length}</span>
                </h2>
                <ul className="stack">
                  {failed.map((f) => (
                    <ValueRow
                      key={rowKey(f)}
                      className="card compact status-warn"
                      label={f.label}
                      note={`→ ${keyLabel(f.schemaKey)} (${REASON_LABELS[f.reason ?? ''] ?? f.reason})`}
                      value={failedValue(f)}
                    >
                      {f.schemaKey && f.hint.options?.length ? (
                        <OptionControls field={{ ...f, schemaKey: f.schemaKey }} notify={setNotice} />
                      ) : (
                        <FillControls field={f} options={fillOptions(f)} notify={setNotice} />
                      )}
                      <button className="btn sm ghost" onClick={() => void skip(f.fieldId)}>
                        건너뛰기
                      </button>
                    </ValueRow>
                  ))}
                </ul>
              </section>
            )}

            {filled.length > 0 && (
              <section>
                <h2 className="sec-title">
                  입력 완료 <span className="badge ok">{filled.length}</span>
                </h2>
                <ul className="card row-list">
                  {filled.map((f) => (
                    <li key={f.fieldId}>
                      <span className="row-text">
                        <span>
                          {f.label} → {keyLabel(f.schemaKey)}
                        </span>
                        {f.source === 'learned' && <span className="badge neutral">학습</span>}
                      </span>
                      <FocusButton fieldId={f.fieldId} notify={setNotice} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {unmatched.length > 0 && (
              <details className="card compact">
                <summary>해당 없음 {unmatched.length}개</summary>
                <ul className="row-list">
                  {unmatched.map((f) => (
                    <li key={rowKey(f)} className="stacked">
                      <div className="item-label">{f.label}</div>
                      <div className="controls">
                        <FillControls field={f} options={fillOptions(f)} notify={setNotice} />
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        ) : copyOnlyHost ? (
          <p className="msg">이 사이트에서는 페이지를 조작하지 않습니다. 항목의 '복사'를 눌러 직접 붙여넣으세요.</p>
        ) : (
          <p className="empty">'작성'을 누르면 결과가 표시됩니다.</p>
        )}

        <section>
          <h2 className="sec-title">이력서 항목 복사</h2>
          {copyGroups.length > 0 ? (
            <div className="stack">
              {copyGroups.map(({ title, items }, i) => (
                <details key={title} className="card compact" open={i === 0}>
                  <summary>{title}</summary>
                  <ul className="row-list">
                    {items.map(([key, label]) => (
                      <ValueRow key={key} className="stacked" label={label} value={valueOf(key)} />
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          ) : (
            <p className="empty">저장된 이력서 값이 없습니다.</p>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ count, label, tone }: { count: number; label: string; tone?: 'ok' | 'warn' }) {
  return (
    <div className={count ? 'card' : 'card zero'}>
      <strong>{count}</strong>
      <span>
        <i className={tone ? `dot ${tone}` : 'dot'} />
        {label}
      </span>
    </div>
  );
}
