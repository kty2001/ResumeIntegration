import { emptyDesired } from '@/core/schema/empty';
import { EMPLOYMENT_TYPE_LABELS, toOptions } from '@/core/schema/labels';
import type { Desired } from '@/core/schema/resume';
import { CheckField, DateField, NumberField, setOrOmit, TagsField, TextField, type SectionProps } from '../fields';

export function DesiredSection({ resume, update }: SectionProps) {
  const d = resume.desired ?? emptyDesired();
  const patch = (fn: (prev: Desired) => Desired) =>
    update((r) => ({ ...r, desired: fn(r.desired ?? emptyDesired()) }));
  const setSalary = (amount: number | undefined, companyPolicy: boolean) =>
    patch((x) =>
      setOrOmit(
        x,
        'salary',
        amount === undefined ? (companyPolicy ? { companyPolicy } : undefined) : { amount, companyPolicy },
      ),
    );

  return (
    <div className="card">
      <div className="grid">
        <NumberField
          label="희망 연봉(만원)"
          disabled={d.salary?.companyPolicy}
          value={d.salary?.amount}
          onChange={(v) => setSalary(v, !!d.salary?.companyPolicy)}
        />
        <CheckField
          label="회사 내규에 따름"
          checked={!!d.salary?.companyPolicy}
          onChange={(v) => setSalary(v ? undefined : d.salary?.amount, v)}
        />
        <TagsField label="희망 근무지" placeholder="서울, 경기" value={d.locations} onChange={(locations) => patch((x) => ({ ...x, locations }))} />
        <TagsField label="희망 직무" placeholder="백엔드 개발, 데이터 엔지니어" value={d.jobs} onChange={(jobs) => patch((x) => ({ ...x, jobs }))} />
        <DateField label="입사 가능일" value={d.availableFrom} onChange={(v) => patch((x) => setOrOmit(x, 'availableFrom', v))} />
        <TextField label="입사 가능일 메모" placeholder="협의 가능" value={d.availableNote} onChange={(v) => patch((x) => setOrOmit(x, 'availableNote', v))} />
      </div>
      <div className="field-label" style={{ marginTop: 12 }}>희망 고용 형태</div>
      <div className="checks">
        {toOptions(EMPLOYMENT_TYPE_LABELS).map((o) => (
          <CheckField
            key={o.value}
            label={o.label}
            checked={d.employmentTypes.includes(o.value)}
            onChange={(on) =>
              patch((x) => ({
                ...x,
                employmentTypes: on ? [...x.employmentTypes, o.value] : x.employmentTypes.filter((t) => t !== o.value),
              }))
            }
          />
        ))}
      </div>
    </div>
  );
}
