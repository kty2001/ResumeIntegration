import { newProject, newSkill } from '@/core/schema/empty';
import { MonthField, RepeatList, setOrOmit, TagsField, TextArea, TextField, type SectionProps } from '../fields';

export function ProjectSection({ resume, update }: SectionProps) {
  return (
    <>
      <h3>프로젝트</h3>
      <RepeatList
        items={resume.projects}
        onChange={(projects) => update((r) => ({ ...r, projects }))}
        create={newProject}
        getKey={(p) => p.id}
        title={(p, i) => p.name || `프로젝트 ${i + 1}`}
        addLabel="프로젝트 추가"
        render={(p, set) => (
          <>
            <TextField label="프로젝트명" required value={p.name} onChange={(v) => set({ ...p, name: v })} />
            <TextField label="소속·발주처" value={p.organization} onChange={(v) => set(setOrOmit(p, 'organization', v))} />
            <MonthField label="시작" value={p.startDate} onChange={(v) => set(setOrOmit(p, 'startDate', v))} />
            <MonthField label="종료" value={p.endDate} onChange={(v) => set(setOrOmit(p, 'endDate', v))} />
            <TextField label="URL" type="url" value={p.url} onChange={(v) => set(setOrOmit(p, 'url', v))} />
            <TagsField label="사용 기술" value={p.keywords} onChange={(v) => set(setOrOmit(p, 'keywords', v.length ? v : undefined))} />
            <TextArea label="내용" value={p.description} onChange={(v) => set(setOrOmit(p, 'description', v))} />
          </>
        )}
      />

      <h3>보유 기술</h3>
      <RepeatList
        items={resume.skills}
        onChange={(skills) => update((r) => ({ ...r, skills }))}
        create={newSkill}
        title={(s, i) => s.name || `기술 ${i + 1}`}
        addLabel="기술 추가"
        render={(s, set) => (
          <>
            <TextField label="기술명" required value={s.name} onChange={(v) => set({ ...s, name: v })} />
            <TextField label="수준" placeholder="상, 중, 하 …" value={s.level} onChange={(v) => set(setOrOmit(s, 'level', v))} />
            <TagsField label="세부 키워드" value={s.keywords} onChange={(v) => set(setOrOmit(s, 'keywords', v.length ? v : undefined))} />
          </>
        )}
      />
    </>
  );
}
