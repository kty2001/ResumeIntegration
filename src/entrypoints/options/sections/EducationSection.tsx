import {
  EDUCATION_LEVEL_LABELS,
  GPA_SCALES,
  GRADUATION_STATUS_LABELS,
  SCHOOL_LOCATION_LABELS,
  toOptions,
} from '@/core/schema/labels';
import { newEducation } from '@/core/schema/empty';
import type { Education } from '@/core/schema/resume';
import {
  CheckField,
  MonthField,
  NumberField,
  patchLocalized,
  RepeatList,
  SelectField,
  setOrOmit,
  TextField,
  type SectionProps,
} from '../fields';

export function EducationSection({ resume, update }: SectionProps) {
  return (
    <RepeatList
      items={resume.education}
      onChange={(education) => update((r) => ({ ...r, education }))}
      create={newEducation}
      getKey={(e) => e.id}
      title={(e, i) => `학력 ${i + 1}${e.school.ko ? ` · ${e.school.ko}` : ''}`}
      addLabel="학력 추가"
      render={(e, set) => <EducationFields e={e} set={set} />}
    />
  );
}

function EducationFields({ e, set }: { e: Education; set: (next: Education) => void }) {
  const setGpaValue = (value: number | undefined) =>
    set(setOrOmit(e, 'gpa', value === undefined ? undefined : { value, max: e.gpa?.max ?? 4.5 }));

  return (
    <>
      <SelectField label="학교 구분" required options={toOptions(EDUCATION_LEVEL_LABELS)} value={e.level} onChange={(v) => v && set({ ...e, level: v })} />
      <TextField label="학교명" required value={e.school.ko} onChange={(v) => set({ ...e, school: { ...e.school, ko: v } })} />
      <TextField label="학교 영문명" value={e.school.en} onChange={(v) => set({ ...e, school: setOrOmit(e.school, 'en', v) })} />
      <SelectField label="소재지" allowEmpty options={toOptions(SCHOOL_LOCATION_LABELS)} value={e.location} onChange={(v) => set(setOrOmit(e, 'location', v))} />
      <MonthField label="입학" value={e.startDate} onChange={(v) => set(setOrOmit(e, 'startDate', v))} />
      <MonthField label="졸업(예정)" value={e.endDate} onChange={(v) => set(setOrOmit(e, 'endDate', v))} />
      <SelectField label="졸업 상태" required options={toOptions(GRADUATION_STATUS_LABELS)} value={e.status} onChange={(v) => v && set({ ...e, status: v })} />
      <TextField label="전공" value={e.major?.ko} onChange={(v) => set(setOrOmit(e, 'major', patchLocalized(e.major, 'ko', v)))} />
      <TextField label="전공 영문명" value={e.major?.en} onChange={(v) => set(setOrOmit(e, 'major', patchLocalized(e.major, 'en', v)))} />
      <TextField label="부전공" value={e.minor} onChange={(v) => set(setOrOmit(e, 'minor', v))} />
      <TextField label="복수전공" value={e.doubleMajor} onChange={(v) => set(setOrOmit(e, 'doubleMajor', v))} />
      <NumberField label="학점" step={0.01} value={e.gpa?.value} onChange={setGpaValue} />
      <SelectField
        label="학점 만점"
        disabled={!e.gpa}
        options={GPA_SCALES.map((s) => ({ value: s, label: String(s) }))}
        value={e.gpa?.max ?? 4.5}
        onChange={(max) => e.gpa && max !== undefined && set({ ...e, gpa: { ...e.gpa, max } })}
      />
      <CheckField label="편입" checked={!!e.transfer} onChange={(v) => set(setOrOmit(e, 'transfer', v || undefined))} />
    </>
  );
}
