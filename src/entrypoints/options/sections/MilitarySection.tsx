import {
  DISABILITY_SEVERITY_LABELS,
  DISCHARGE_TYPE_LABELS,
  MILITARY_BRANCH_LABELS,
  MILITARY_STATUS_LABELS,
  toOptions,
} from '@/core/schema/labels';
import type { Military, Preference } from '@/core/schema/resume';
import { CheckField, MonthField, SelectField, setOrOmit, TextField, type SectionProps } from '../fields';

export function MilitarySection({ resume, update }: SectionProps) {
  const m = resume.military;
  const p = resume.preference ?? {};
  const patchMilitary = (fn: (prev: Military) => Military) =>
    update((r) => (r.military ? { ...r, military: fn(r.military) } : r));
  const patchPreference = (fn: (prev: Preference) => Preference) =>
    update((r) => ({ ...r, preference: fn(r.preference ?? {}) }));
  const noService = !m || m.status === 'not_served' || m.status === 'not_applicable';

  return (
    <>
      <div className="card">
        <div className="card-head"><b>병역</b></div>
        <div className="grid">
          <SelectField
            label="병역 구분"
            allowEmpty
            options={toOptions(MILITARY_STATUS_LABELS)}
            value={m?.status}
            onChange={(status) =>
              update((r) => setOrOmit(r, 'military', status && { ...(r.military ?? {}), status }))
            }
          />
          <SelectField label="군별" allowEmpty disabled={noService} options={toOptions(MILITARY_BRANCH_LABELS)} value={m?.branch} onChange={(v) => patchMilitary((x) => setOrOmit(x, 'branch', v))} />
          <TextField label="계급" disabled={noService} value={m?.rank} onChange={(v) => patchMilitary((x) => setOrOmit(x, 'rank', v))} />
          <MonthField label="복무 시작" disabled={noService} value={m?.startDate} onChange={(v) => patchMilitary((x) => setOrOmit(x, 'startDate', v))} />
          <MonthField label="복무 종료" disabled={noService} value={m?.endDate} onChange={(v) => patchMilitary((x) => setOrOmit(x, 'endDate', v))} />
          <SelectField label="전역 구분" allowEmpty disabled={noService} options={toOptions(DISCHARGE_TYPE_LABELS)} value={m?.dischargeType} onChange={(v) => patchMilitary((x) => setOrOmit(x, 'dischargeType', v))} />
          {m?.status === 'exempted' && (
            <TextField label="면제 사유" sensitive wide value={m.exemptionReason} onChange={(v) => patchMilitary((x) => setOrOmit(x, 'exemptionReason', v))} />
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><b>취업우대</b></div>
        <div className="msg warn">
          <b>민감정보</b> · 보훈·장애 정보는 법상 민감정보입니다. 입력은 선택이며, 이 브라우저에만 저장되고 LLM으로
          전송되지 않습니다. 자동 입력은 기본적으로 사용하지 않습니다.
        </div>
        <div className="grid">
          <CheckField
            label="보훈 대상"
            checked={!!p.veteran?.target}
            onChange={(target) => patchPreference((x) => ({ ...x, veteran: target ? { ...x.veteran, target } : { target } }))}
          />
          {p.veteran?.target && (
            <>
              <TextField label="보훈 관계" sensitive value={p.veteran.relation} onChange={(v) => patchPreference((x) => ({ ...x, veteran: setOrOmit(x.veteran ?? { target: true }, 'relation', v) }))} />
              <TextField label="보훈 번호" sensitive value={p.veteran.number} onChange={(v) => patchPreference((x) => ({ ...x, veteran: setOrOmit(x.veteran ?? { target: true }, 'number', v) }))} />
            </>
          )}
          <CheckField
            label="장애 대상"
            checked={!!p.disability?.target}
            onChange={(target) => patchPreference((x) => ({ ...x, disability: target ? { ...x.disability, target } : { target } }))}
          />
          {p.disability?.target && (
            <SelectField
              label="장애 정도"
              sensitive
              allowEmpty
              options={toOptions(DISABILITY_SEVERITY_LABELS)}
              value={p.disability.severity}
              onChange={(v) => patchPreference((x) => ({ ...x, disability: setOrOmit(x.disability ?? { target: true }, 'severity', v) }))}
            />
          )}
          <CheckField
            label="취업보호대상"
            checked={!!p.employmentProtection}
            onChange={(v) => patchPreference((x) => ({ ...x, employmentProtection: v }))}
          />
        </div>
      </div>
    </>
  );
}
