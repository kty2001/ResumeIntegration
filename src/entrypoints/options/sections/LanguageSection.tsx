import { newCertificate, newLanguageSkill, newLanguageTest } from '@/core/schema/empty';
import { FLUENCY_LABELS, LANGUAGE_LABELS, toOptions } from '@/core/schema/labels';
import { MonthField, RepeatList, SelectField, setOrOmit, TextField, type SectionProps } from '../fields';

const languageOptions = Object.entries(LANGUAGE_LABELS).map(([value, label]) => ({ value, label }));
const languageName = (code: string) => LANGUAGE_LABELS[code] ?? code;

export function LanguageSection({ resume, update }: SectionProps) {
  return (
    <>
      <h3>어학 시험</h3>
      <datalist id="exam-names">
        {['TOEIC', 'TOEIC Speaking', 'TOEFL', 'TEPS', 'OPIc', 'IELTS', 'JLPT', 'JPT', 'HSK'].map((x) => (
          <option key={x} value={x} />
        ))}
      </datalist>
      <RepeatList
        items={resume.languageTests}
        onChange={(languageTests) => update((r) => ({ ...r, languageTests }))}
        create={newLanguageTest}
        getKey={(t) => t.id}
        title={(t, i) => t.exam || `어학 시험 ${i + 1}`}
        addLabel="어학 시험 추가"
        render={(t, set) => (
          <>
            <SelectField label="언어" required options={languageOptions} value={t.language} onChange={(v) => v && set({ ...t, language: v })} />
            <TextField label="시험명" required list="exam-names" value={t.exam} onChange={(v) => set({ ...t, exam: v })} />
            <TextField label="점수" value={t.score} onChange={(v) => set(setOrOmit(t, 'score', v))} />
            <TextField label="등급" placeholder="IH, N1 …" value={t.grade} onChange={(v) => set(setOrOmit(t, 'grade', v))} />
            <MonthField label="취득일" value={t.date} onChange={(v) => set(setOrOmit(t, 'date', v))} />
            <MonthField label="만료일" value={t.expiresAt} onChange={(v) => set(setOrOmit(t, 'expiresAt', v))} />
            <TextField label="수험·등록 번호" value={t.registrationNo} onChange={(v) => set(setOrOmit(t, 'registrationNo', v))} />
          </>
        )}
      />

      <h3>회화 수준</h3>
      <RepeatList
        items={resume.languages}
        onChange={(languages) => update((r) => ({ ...r, languages }))}
        create={newLanguageSkill}
        title={(l) => languageName(l.language)}
        addLabel="언어 추가"
        render={(l, set) => (
          <>
            <SelectField label="언어" required options={languageOptions} value={l.language} onChange={(v) => v && set({ ...l, language: v })} />
            <SelectField label="수준" required options={toOptions(FLUENCY_LABELS)} value={l.fluency} onChange={(v) => v && set({ ...l, fluency: v })} />
          </>
        )}
      />

      <h3>자격증</h3>
      <RepeatList
        items={resume.certificates}
        onChange={(certificates) => update((r) => ({ ...r, certificates }))}
        create={newCertificate}
        getKey={(c) => c.id}
        title={(c, i) => c.name || `자격증 ${i + 1}`}
        addLabel="자격증 추가"
        render={(c, set) => (
          <>
            <TextField label="자격증명" required value={c.name} onChange={(v) => set({ ...c, name: v })} />
            <TextField label="발행기관" value={c.issuer} onChange={(v) => set(setOrOmit(c, 'issuer', v))} />
            <MonthField label="취득일" value={c.date} onChange={(v) => set(setOrOmit(c, 'date', v))} />
            <TextField label="자격번호" value={c.number} onChange={(v) => set(setOrOmit(c, 'number', v))} />
          </>
        )}
      />
    </>
  );
}
