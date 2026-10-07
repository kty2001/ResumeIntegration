import { newActivity, newAward } from '@/core/schema/empty';
import { ACTIVITY_TYPE_LABELS, toOptions } from '@/core/schema/labels';
import { MonthField, RepeatList, SelectField, setOrOmit, TextArea, TextField, type SectionProps } from '../fields';

export function ActivitySection({ resume, update }: SectionProps) {
  return (
    <>
      <h3>대외활동·교육</h3>
      <RepeatList
        items={resume.activities}
        onChange={(activities) => update((r) => ({ ...r, activities }))}
        create={newActivity}
        getKey={(a) => a.id}
        title={(a, i) => `${ACTIVITY_TYPE_LABELS[a.type]} · ${a.name || i + 1}`}
        addLabel="활동 추가"
        render={(a, set) => (
          <>
            <SelectField label="구분" required options={toOptions(ACTIVITY_TYPE_LABELS)} value={a.type} onChange={(v) => v && set({ ...a, type: v })} />
            <TextField label="활동명" required value={a.name} onChange={(v) => set({ ...a, name: v })} />
            <TextField label="기관" value={a.organization} onChange={(v) => set(setOrOmit(a, 'organization', v))} />
            <MonthField label="시작" value={a.startDate} onChange={(v) => set(setOrOmit(a, 'startDate', v))} />
            <MonthField label="종료" value={a.endDate} onChange={(v) => set(setOrOmit(a, 'endDate', v))} />
            <TextArea label="내용" value={a.description} onChange={(v) => set(setOrOmit(a, 'description', v))} />
          </>
        )}
      />

      <h3>수상</h3>
      <RepeatList
        items={resume.awards}
        onChange={(awards) => update((r) => ({ ...r, awards }))}
        create={newAward}
        getKey={(a) => a.id}
        title={(a, i) => a.title || `수상 ${i + 1}`}
        addLabel="수상 추가"
        render={(a, set) => (
          <>
            <TextField label="수상명" required value={a.title} onChange={(v) => set({ ...a, title: v })} />
            <TextField label="수여기관" value={a.awarder} onChange={(v) => set(setOrOmit(a, 'awarder', v))} />
            <MonthField label="수상일" value={a.date} onChange={(v) => set(setOrOmit(a, 'date', v))} />
            <TextArea label="내용" value={a.description} onChange={(v) => set(setOrOmit(a, 'description', v))} />
          </>
        )}
      />
    </>
  );
}
