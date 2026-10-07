import { useState, type ReactNode } from 'react';
import type { LocalizedName, Resume } from '@/core/schema/resume';

// ---- 값 정리 헬퍼: 빈 값은 키 생략 (docs/design/resume_schema_v1.md 1장) ----

export type Updater<T> = (fn: (prev: T) => T) => void;

export interface SectionProps {
  resume: Resume;
  update: Updater<Resume>;
}

function isEmpty(value: unknown): boolean {
  return value === '' || value === undefined || (typeof value === 'number' && Number.isNaN(value));
}

export function setOrOmit<T extends object, K extends keyof T>(obj: T, key: K, value: T[K] | '' | undefined): T {
  const next = { ...obj };
  if (isEmpty(value)) delete (next as Record<PropertyKey, unknown>)[key as PropertyKey];
  else next[key] = value as T[K];
  return next;
}

/** 키가 하나도 없으면 undefined */
export function compact<T extends object>(obj: T): T | undefined {
  return Object.keys(obj).length ? obj : undefined;
}

/** 선택 입력 다국어 이름: 모든 값이 비면 undefined */
export function patchLocalized(
  name: LocalizedName | undefined,
  key: keyof LocalizedName,
  value: string,
): LocalizedName | undefined {
  const next = key === 'ko' ? { ...(name ?? { ko: '' }), ko: value } : setOrOmit(name ?? { ko: '' }, key, value);
  return next.ko || next.en || next.hanja ? next : undefined;
}

export const digitsOnly = (v: string) => v.replace(/\D/g, '');

// ---- 입력 컴포넌트 ----

interface FieldProps {
  label: string;
  required?: boolean;
  sensitive?: boolean;
  wide?: boolean;
  children: ReactNode;
}

function Field({ label, required, sensitive, wide, children }: FieldProps) {
  return (
    <label className={wide ? 'field wide' : 'field'}>
      <span className="field-label">
        {label}
        {required && <em className="req"> 필수</em>}
        {sensitive && <em className="sens"> 민감</em>}
      </span>
      {children}
    </label>
  );
}

type Common = Omit<FieldProps, 'children'> & { disabled?: boolean; placeholder?: string };

export function TextField({
  value,
  onChange,
  type = 'text',
  list,
  ...rest
}: Common & { value?: string; onChange: (v: string) => void; type?: string; list?: string }) {
  return (
    <Field {...rest}>
      <input
        type={type}
        value={value ?? ''}
        list={list}
        disabled={rest.disabled}
        placeholder={rest.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export const MonthField = (p: Common & { value?: string; onChange: (v: string) => void }) => (
  <TextField {...p} type="month" />
);

export const DateField = (p: Common & { value?: string; onChange: (v: string) => void }) => (
  <TextField {...p} type="date" />
);

export function TextArea({ value, onChange, ...rest }: Common & { value?: string; onChange: (v: string) => void }) {
  return (
    <Field {...rest} wide>
      <textarea
        value={value ?? ''}
        disabled={rest.disabled}
        placeholder={rest.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function NumberField({
  value,
  onChange,
  step,
  ...rest
}: Common & { value?: number; onChange: (v: number | undefined) => void; step?: number }) {
  return (
    <Field {...rest}>
      <input
        type="number"
        step={step}
        value={value ?? ''}
        disabled={rest.disabled}
        placeholder={rest.placeholder}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      />
    </Field>
  );
}

export function SelectField<T extends string | number>({
  value,
  onChange,
  options,
  allowEmpty,
  ...rest
}: Common & {
  value?: T;
  onChange: (v: T | undefined) => void;
  options: { value: T; label: string }[];
  allowEmpty?: boolean;
}) {
  return (
    <Field {...rest}>
      <select
        value={value === undefined ? '' : String(value)}
        disabled={rest.disabled}
        onChange={(e) => onChange(options.find((o) => String(o.value) === e.target.value)?.value)}
      >
        {allowEmpty && <option value="">선택 안 함</option>}
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function CheckField({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

const parseTags = (raw: string) =>
  raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

/** 쉼표로 구분한 목록 입력. 입력 중 쉼표가 사라지지 않도록 원문을 내부 상태로 두되, 값이 외부에서 바뀌면 값 기준으로 표시 */
export function TagsField({ value, onChange, ...rest }: Common & { value?: string[]; onChange: (v: string[]) => void }) {
  const joined = (value ?? []).join(', ');
  const [raw, setRaw] = useState(joined);
  const display = parseTags(raw).join(', ') === joined ? raw : joined;
  return (
    <Field {...rest}>
      <input
        value={display}
        disabled={rest.disabled}
        placeholder={rest.placeholder ?? '쉼표로 구분'}
        onChange={(e) => {
          setRaw(e.target.value);
          onChange(parseTags(e.target.value));
        }}
      />
    </Field>
  );
}

// ---- 반복 항목 ----

export function RepeatList<T>({
  items,
  onChange,
  create,
  title,
  render,
  getKey,
  addLabel,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  title: (item: T, index: number) => string;
  render: (item: T, update: (next: T) => void) => ReactNode;
  getKey?: (item: T, index: number) => string;
  addLabel: string;
}) {
  const replace = (index: number, next: T) => onChange(items.map((it, i) => (i === index ? next : it)));
  const move = (index: number, delta: number) => {
    const next = [...items];
    const [it] = next.splice(index, 1);
    next.splice(index + delta, 0, it as T);
    onChange(next);
  };

  return (
    <div className="repeat">
      {items.map((item, i) => (
        <div className="card" key={getKey ? getKey(item, i) : i}>
          <div className="card-head">
            <b>{title(item, i)}</b>
            <span className="card-actions">
              <button type="button" className="btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label="위로">
                ↑
              </button>
              <button
                type="button"
                className="btn"
                disabled={i === items.length - 1}
                onClick={() => move(i, 1)}
                aria-label="아래로"
              >
                ↓
              </button>
              <button type="button" className="btn danger" onClick={() => onChange(items.filter((_, j) => j !== i))}>
                삭제
              </button>
            </span>
          </div>
          <div className="grid">{render(item, (next) => replace(i, next))}</div>
        </div>
      ))}
      <button type="button" className="btn add" onClick={() => onChange([...items, create()])}>
        + {addLabel}
      </button>
    </div>
  );
}
