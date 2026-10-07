import { GENDER_LABELS, toOptions } from '@/core/schema/labels';
import type { Basics } from '@/core/schema/resume';
import {
  compact,
  DateField,
  digitsOnly,
  RepeatList,
  SelectField,
  setOrOmit,
  TextArea,
  TextField,
  type SectionProps,
} from '../fields';

export function BasicSection({ resume, update }: SectionProps) {
  const b = resume.basics;
  const patch = (fn: (prev: Basics) => Basics) => update((r) => ({ ...r, basics: fn(r.basics) }));
  const setPhone = (key: 'mobile' | 'home', v: string) =>
    patch((p) => setOrOmit(p, 'phone', compact(setOrOmit(p.phone ?? {}, key, digitsOnly(v)))));
  const setAddress = (key: 'postalCode' | 'line1' | 'line2', v: string) =>
    patch((p) => setOrOmit(p, 'address', compact(setOrOmit(p.address ?? {}, key, v))));

  return (
    <>
      <div className="card">
        <div className="grid">
          <TextField label="이름(한글)" required value={b.name.ko} onChange={(v) => patch((p) => ({ ...p, name: { ...p.name, ko: v } }))} />
          <TextField label="이름(영문)" value={b.name.en} placeholder="Gildong Hong" onChange={(v) => patch((p) => ({ ...p, name: setOrOmit(p.name, 'en', v) }))} />
          <TextField label="이름(한자)" value={b.name.hanja} onChange={(v) => patch((p) => ({ ...p, name: setOrOmit(p.name, 'hanja', v) }))} />
          <DateField label="생년월일" value={b.birthDate} onChange={(v) => patch((p) => setOrOmit(p, 'birthDate', v))} />
          <SelectField label="성별" allowEmpty options={toOptions(GENDER_LABELS)} value={b.gender} onChange={(v) => patch((p) => setOrOmit(p, 'gender', v))} />
          <TextField label="이메일" type="email" value={b.email} onChange={(v) => patch((p) => setOrOmit(p, 'email', v))} />
          <TextField label="휴대폰" type="tel" placeholder="숫자만" value={b.phone?.mobile} onChange={(v) => setPhone('mobile', v)} />
          <TextField label="자택 전화" type="tel" placeholder="숫자만" value={b.phone?.home} onChange={(v) => setPhone('home', v)} />
          <TextField label="우편번호" value={b.address?.postalCode} onChange={(v) => setAddress('postalCode', v)} />
          <TextField label="기본 주소" wide value={b.address?.line1} onChange={(v) => setAddress('line1', v)} />
          <TextField label="상세 주소" wide value={b.address?.line2} onChange={(v) => setAddress('line2', v)} />
          <TextArea label="한 줄 소개" value={b.summary} onChange={(v) => patch((p) => setOrOmit(p, 'summary', v))} />
        </div>
      </div>

      <h3>URL</h3>
      <RepeatList
        items={b.urls}
        onChange={(urls) => patch((p) => ({ ...p, urls }))}
        create={() => ({ label: '', url: '' })}
        title={(u, i) => u.label || `URL ${i + 1}`}
        addLabel="URL 추가"
        render={(u, set) => (
          <>
            <TextField label="이름" placeholder="포트폴리오, GitHub, 블로그 …" value={u.label} onChange={(v) => set({ ...u, label: v })} />
            <TextField label="URL" type="url" wide value={u.url} onChange={(v) => set({ ...u, url: v })} />
          </>
        )}
      />
    </>
  );
}
