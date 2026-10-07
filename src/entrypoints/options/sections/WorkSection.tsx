import { newWork } from '@/core/schema/empty';
import { EMPLOYMENT_TYPE_LABELS, toOptions } from '@/core/schema/labels';
import type { Work } from '@/core/schema/resume';
import {
  CheckField,
  MonthField,
  NumberField,
  patchLocalized,
  RepeatList,
  SelectField,
  setOrOmit,
  TextArea,
  TextField,
  type SectionProps,
} from '../fields';

export function WorkSection({ resume, update }: SectionProps) {
  return (
    <>
      <p className="desc">신입이면 비워 둡니다.</p>
      <RepeatList
        items={resume.work}
        onChange={(work) => update((r) => ({ ...r, work }))}
        create={newWork}
        getKey={(w) => w.id}
        title={(w, i) => `경력 ${i + 1}${w.company.ko ? ` · ${w.company.ko}` : ''}`}
        addLabel="경력 추가"
        render={(w, set) => <WorkFields w={w} set={set} />}
      />
    </>
  );
}

function WorkFields({ w, set }: { w: Work; set: (next: Work) => void }) {
  return (
    <>
      <TextField label="회사명" required value={w.company.ko} onChange={(v) => set({ ...w, company: { ...w.company, ko: v } })} />
      <TextField label="회사 영문명" value={w.company.en} onChange={(v) => set({ ...w, company: setOrOmit(w.company, 'en', v) })} />
      <SelectField label="고용 형태" allowEmpty options={toOptions(EMPLOYMENT_TYPE_LABELS)} value={w.employmentType} onChange={(v) => set(setOrOmit(w, 'employmentType', v))} />
      <TextField label="부서" value={w.department} onChange={(v) => set(setOrOmit(w, 'department', v))} />
      <TextField label="직급" placeholder="사원, 대리 …" value={w.rank} onChange={(v) => set(setOrOmit(w, 'rank', v))} />
      <TextField label="직책" placeholder="팀원, 팀장 …" value={w.title} onChange={(v) => set(setOrOmit(w, 'title', v))} />
      <TextField label="직무" placeholder="백엔드 개발" value={w.role?.ko} onChange={(v) => set(setOrOmit(w, 'role', patchLocalized(w.role, 'ko', v)))} />
      <TextField label="직무 영문명" placeholder="Backend Engineer" value={w.role?.en} onChange={(v) => set(setOrOmit(w, 'role', patchLocalized(w.role, 'en', v)))} />
      <MonthField label="입사" required value={w.startDate} onChange={(v) => set({ ...w, startDate: v })} />
      <MonthField label="퇴사" disabled={w.current} value={w.endDate} onChange={(v) => set(setOrOmit(w, 'endDate', v))} />
      <CheckField
        label="재직 중"
        checked={w.current}
        onChange={(current) => set(current ? setOrOmit({ ...w, current }, 'endDate', undefined) : { ...w, current })}
      />
      <NumberField label="연봉(만원)" value={w.salary} onChange={(v) => set(setOrOmit(w, 'salary', v))} />
      <TextField label="퇴사 사유" wide value={w.leaveReason} onChange={(v) => set(setOrOmit(w, 'leaveReason', v))} />
      <TextArea label="담당 업무" value={w.description} onChange={(v) => set(setOrOmit(w, 'description', v))} />
    </>
  );
}
