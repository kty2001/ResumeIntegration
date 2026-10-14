import { freeFormTitleIndex } from '@/core/coverLetter';
import { dateKind } from '@/core/format';
import { getByPath, isChoiceWidget, type KeyAssignment } from '@/core/mapping/match';
import { enumLabel, normalizeOption, optionCode } from '@/core/mapping/options';
import {
  createEmptyResume,
  emptyDesired,
  newActivity,
  newAward,
  newCertificate,
  newEducation,
  newLanguageTest,
  newProject,
  newWork,
} from '@/core/schema/empty';
import { GPA_SCALES, groupKeyOptions, ITEM_KEY_LABELS, schemaKeyLabel, SECTION_LABELS, type SectionKey } from '@/core/schema/labels';
import type { Resume } from '@/core/schema/resume';
import type { FieldDescriptor } from '@/messaging/protocol';

// 이력서 가져오기: docs/design/architecture.md 7.4
// 사이트 입력란 값 → 저장 형식 역변환(parseImport, background) → 현재 이력서와 비교(diffImport, 미리 보기) → 선택 반영(applyImport)

export type ImportValue = string | number | boolean | string[];

/** 입력란 하나에서 읽은 값. value 없음 = 저장 형식 변환 실패 (원문 raw만 표시) */
export interface ImportedItem {
  schemaKey: string;
  value?: ImportValue;
  raw: string;
}

/** session:importDraft: 페이지에서 읽은 결과 (현재 이력서와의 비교는 미리 보기 시점에 수행) */
export interface ImportDraft {
  url: string;
  at: string;
  items: ImportedItem[];
  coverLetters: { question: string; answer: string }[];
}

const PHONE_KEYS = new Set(['basics.phone.mobile', 'basics.phone.home']);
const NUMBER_KEYS = new Set(['education.*.gpa.value', 'education.*.gpa.max', 'work.*.salary', 'desired.salary.amount']);
const SALARY_KEYS = new Set(['work.*.salary', 'desired.salary.amount']);
const ARRAY_KEYS = new Set(['desired.locations', 'desired.jobs', 'desired.employmentTypes']);

const ITEM_KEY = /^(education|work|certificates|languageTests|awards|activities|projects)\.(\d+)\.(.+)$/;
const pattern = (schemaKey: string) => schemaKey.replace(/\.\d+\./, '.*.');
const pad = (n: string) => n.padStart(2, '0');

/** 날짜 텍스트 → YYYY-MM(-DD). 2자리 연도·범위 밖 값은 undefined */
export function parseDate(text: string, kind: 'date' | 'month' | 'partial'): string | undefined {
  const t = text.trim();
  let m = t.match(/^(\d{4})(\d{2})(\d{2})?$/);
  if (!m) m = t.match(/^(\d{4})\s*[.\-/년]\s*(\d{1,2})\s*(?:[.\-/월]\s*(?:(\d{1,2})\s*일?)?)?\.?$/);
  if (!m) return undefined;
  const [, year, month, day] = m;
  if (Number(month) < 1 || Number(month) > 12 || (day && (Number(day) < 1 || Number(day) > 31))) return undefined;
  const yearMonth = `${year}-${pad(month!)}`;
  if (kind === 'month') return yearMonth;
  if (day) return `${yearMonth}-${pad(day)}`;
  return kind === 'partial' ? yearMonth : undefined;
}

function parseNumber(schemaKey: string, text: string): number | undefined {
  const m = text.replace(/[,\s]/g, '').match(/\d+(?:\.\d+)?/);
  if (!m) return undefined;
  let n = Number(m[0]);
  const key = pattern(schemaKey);
  // 연봉은 만원 단위 저장: 원 단위로 보이는 큰 값은 환산
  if (SALARY_KEYS.has(key) && n >= 100000) n = Math.round(n / 10000);
  if (key === 'education.*.gpa.max' && !GPA_SCALES.includes(n as never)) return undefined;
  return n;
}

/** 입력란 텍스트(선택지는 선택지 표시 텍스트) → 저장 형식 값 */
export function convertValue(schemaKey: string, texts: string[]): ImportValue | undefined {
  const key = pattern(schemaKey);
  if (ARRAY_KEYS.has(key)) {
    const parts = texts.flatMap((t) => t.split(/[,、/]/)).map((t) => t.trim()).filter(Boolean);
    const codes = parts.map((p) => optionCode(schemaKey, p)).filter((c): c is string => !!c);
    return codes.length ? [...new Set(codes)] : undefined;
  }
  const text = texts.join(', ').trim();
  if (!text) return undefined;
  const kind = dateKind(schemaKey);
  if (kind) return parseDate(text, kind);
  if (PHONE_KEYS.has(key)) {
    const digits = text.replace(/\D/g, '');
    return digits.length >= 9 ? digits : undefined;
  }
  if (NUMBER_KEYS.has(key)) return parseNumber(schemaKey, text);
  return optionCode(schemaKey, text);
}

/** 선택형 입력란 값 → 선택지 표시 텍스트 목록 (checkbox 그룹은 JSON 배열) */
function choiceTexts(field: FieldDescriptor, raw: string): string[] {
  const textOf = (value: string) => field.options?.find((o) => o.value === value)?.text ?? value;
  if (field.widget === 'checkboxes') {
    try {
      const values: unknown = JSON.parse(raw);
      return Array.isArray(values) ? values.map((v) => textOf(String(v))) : [];
    } catch {
      return [];
    }
  }
  return field.widget === 'combobox' ? [raw] : [textOf(raw)];
}

/** 분리 입력 칸 값: select는 선택지 텍스트의 숫자 */
function partText(field: FieldDescriptor, raw: string): string {
  if (field.widget !== 'select') return raw.trim();
  const text = field.options?.find((o) => o.value === raw)?.text ?? raw;
  return text.replace(/\D/g, '') || raw.replace(/\D/g, '');
}

/**
 * 페이지 입력란 값 → 가져오기 항목 + 자기소개서 후보
 * values: fieldId → 입력란 값 (filler readValues), assignment: assignKeys 결과
 */
export function parseImport(
  fields: FieldDescriptor[],
  values: Map<string, string>,
  { keys, runOf }: Pick<KeyAssignment, 'keys' | 'runOf'>,
): Pick<ImportDraft, 'items' | 'coverLetters'> {
  const items: ImportedItem[] = [];
  const coverLetters: ImportDraft['coverLetters'] = [];
  const push = (schemaKey: string, raw: string, value: ImportValue | undefined) => {
    const item: ImportedItem = value === undefined ? { schemaKey, raw } : { schemaKey, value, raw };
    // 같은 키 입력란이 여럿이면 첫 값. 단 첫 값이 저장 형식으로 변환되지 않았으면 변환된 값으로 교체
    // (사람인 학력구분 '대학ㆍ대학원 이상 졸업' 대신 대학구분 '대학교(4년)')
    const index = items.findIndex((i) => i.schemaKey === schemaKey);
    if (index < 0) items.push(item);
    else if (!('value' in items[index]!) && value !== undefined) items[index] = item;
  };

  fields.forEach((field, i) => {
    const schemaKey = keys[i];
    const run = runOf.get(i);
    if (run) {
      if (run[0] !== i || !schemaKey) return;
      const parts = run.map((j) => partText(fields[j]!, values.get(fields[j]!.fieldId) ?? ''));
      if (parts.every((p) => !p)) return;
      const raw = parts.join(' ');
      // 전화번호 칸은 숫자 연결, 날짜 칸은 '-' 연결
      const joined = PHONE_KEYS.has(schemaKey) ? parts.join('') : parts.every(Boolean) ? parts.join('-') : '';
      push(schemaKey, raw, joined ? convertValue(schemaKey, [joined]) : undefined);
      return;
    }
    const raw = values.get(field.fieldId)?.trim();
    if (!raw || field.widget === 'file') return;
    if (!schemaKey) {
      // 이력서 항목이 아닌 서술형 입력란: 라벨 = 문항(자유형은 제목 입력란 값), 값 = 답변
      const title = freeFormTitleIndex(fields, (j) => !!keys[j], i);
      const titleValue = title === undefined ? undefined : values.get(fields[title]!.fieldId)?.trim();
      const question = titleValue || field.label || field.ariaLabel || field.placeholder;
      if (field.widget === 'textarea' && question) coverLetters.push({ question, answer: raw });
      return;
    }
    if (field.widget === 'checkbox') {
      // 체크 해제는 값 없음으로 취급 (기본값과 구분 불가)
      if (raw === 'true') push(schemaKey, raw, true);
      return;
    }
    const texts = isChoiceWidget(field.widget) ? choiceTexts(field, raw) : [raw];
    push(schemaKey, texts.join(', ') || raw, convertValue(schemaKey, texts));
  });
  return { items, coverLetters };
}

// ---- 미리 보기: 현재 이력서와 비교 ----

/** 반복 항목에서 같은 항목 판별에 쓰는 대표 항목 */
const REP_PATHS: Record<SectionKey, string> = {
  education: 'school.ko',
  work: 'company.ko',
  certificates: 'name',
  languageTests: 'exam',
  awards: 'title',
  activities: 'name',
  projects: 'name',
};

const FACTORIES: Record<SectionKey, () => object> = {
  education: newEducation,
  work: newWork,
  certificates: newCertificate,
  languageTests: newLanguageTest,
  awards: newAward,
  activities: newActivity,
  projects: newProject,
};

export interface ImportRow {
  id: string;
  path: string;             // 반복 항목은 항목 안 경로(school.ko), 그 외는 전체 키
  label: string;
  current?: string;         // 현재 값 표시
  imported: string;         // 가져온 값 표시 (변환 실패는 원문)
  value?: ImportValue;      // 변환 실패면 없음 → 선택 불가
  selected: boolean;        // 기본 선택: 현재 값이 비어 있을 때
}

export interface ImportGroup {
  id: string;
  title: string;
  section?: SectionKey;
  index?: number;           // 갱신할 기존 항목 위치 (반복 항목, 없으면 추가)
  rows: ImportRow[];
}

/** 값 표시: enum은 표시명, 배열은 ', ' 결합, boolean은 예/아니오 */
export function displayValue(schemaKey: string, value: unknown): string | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value === 'boolean') return value ? '예' : '아니오';
  if (Array.isArray(value)) {
    const list = value.map((v) => enumLabel(schemaKey, String(v)) ?? String(v)).filter(Boolean);
    return list.length ? list.join(', ') : undefined;
  }
  if (typeof value === 'object') return undefined;
  return enumLabel(schemaKey, String(value)) ?? String(value);
}

function row(id: string, path: string, label: string, schemaKey: string, item: ImportedItem, current: unknown): ImportRow | null {
  const imported = item.value === undefined ? item.raw : (displayValue(schemaKey, item.value) ?? item.raw);
  const currentText = displayValue(schemaKey, current);
  if (item.value !== undefined && currentText !== undefined && normalizeOption(currentText) === normalizeOption(imported)) return null;
  // 연월만 받는 입력란에서 읽은 값이 현재 연월일과 같은 달이면 같은 값 (왕복 시 정밀도 손실)
  if (typeof item.value === 'string' && /^\d{4}-\d{2}$/.test(item.value) && typeof current === 'string' && current.startsWith(`${item.value}-`))
    return null;
  return {
    id,
    path,
    label,
    current: currentText,
    imported,
    value: item.value,
    selected: item.value !== undefined && currentText === undefined,
  };
}

/** 가져온 항목을 현재 이력서와 비교해 묶음별 행 구성 (값이 같은 항목은 제외) */
export function diffImport(resume: Resume | null, items: ImportedItem[]): ImportGroup[] {
  const base = resume ?? createEmptyResume();
  const groups: ImportGroup[] = [];
  const basicRows = new Map<string, ImportRow[]>();
  const repeat = new Map<string, { section: SectionKey; items: { path: string; item: ImportedItem }[] }>();

  for (const item of items) {
    const m = item.schemaKey.match(ITEM_KEY);
    if (m) {
      const id = `${m[1]}.${m[2]}`;
      if (!repeat.has(id)) repeat.set(id, { section: m[1] as SectionKey, items: [] });
      repeat.get(id)!.items.push({ path: m[3]!, item });
      continue;
    }
    const [group] = groupKeyOptions([[item.schemaKey, schemaKeyLabel(item.schemaKey)]]);
    const r = row(item.schemaKey, item.schemaKey, group!.items[0]![1], item.schemaKey, item, getByPath(base, item.schemaKey));
    if (!r) continue;
    if (!basicRows.has(group!.title)) basicRows.set(group!.title, []);
    basicRows.get(group!.title)!.push(r);
  }
  for (const [title, rows] of basicRows) groups.push({ id: title, title, rows });

  for (const [id, { section, items: entries }] of repeat) {
    const rep = entries.find((e) => e.path === REP_PATHS[section])?.item.value;
    const list = base[section] as object[];
    const index =
      typeof rep === 'string'
        ? list.findIndex((it) => {
            const current = getByPath(it as Resume, REP_PATHS[section]);
            return typeof current === 'string' && normalizeOption(current) === normalizeOption(rep);
          })
        : -1;
    const target = index >= 0 ? (list[index] as Resume) : undefined;
    const rows = entries.flatMap(({ path, item }) => {
      const schemaKey = `${section}.*.${path}`;
      const r = row(`${id}:${path}`, path, ITEM_KEY_LABELS[schemaKey] ?? path, schemaKey, item, target && getByPath(target, path));
      // 대표 항목 없이 추가되는 항목은 기본 미선택
      return r ? [{ ...r, selected: r.selected && (target !== undefined || rep !== undefined) }] : [];
    });
    if (!rows.length) continue;
    const name = typeof rep === 'string' ? rep : '이름 없음';
    groups.push({
      id,
      title: `${SECTION_LABELS[section]} · ${name} (${target ? '갱신' : '추가'})`,
      section,
      ...(target && { index }),
      rows,
    });
  }
  return groups;
}

/** 점 경로에 값 설정 (중간 객체 생성. 희망 조건은 빈 목록 포함 기본값으로 생성) */
function setPath(target: Record<string, unknown>, path: string, value: ImportValue) {
  const parts = path.split('.');
  let cur = target;
  parts.slice(0, -1).forEach((part, i) => {
    if (cur[part] == null || typeof cur[part] !== 'object') {
      const prefix = parts.slice(0, i + 1).join('.');
      cur[part] = prefix === 'desired' ? emptyDesired() : prefix === 'desired.salary' ? { companyPolicy: false } : {};
    }
    cur = cur[part] as Record<string, unknown>;
  });
  cur[parts.at(-1)!] = value;
}

/** 선택한 행 반영 → 새 이력서 (원본 불변, 수정 시각은 저장 시 기록) */
export function applyImport(resume: Resume | null, groups: ImportGroup[], selected: Set<string>): Resume {
  const next = structuredClone(resume ?? createEmptyResume());
  for (const group of groups) {
    const rows = group.rows.filter((r) => selected.has(r.id) && r.value !== undefined);
    if (!rows.length) continue;
    let target = next as unknown as Record<string, unknown>;
    if (group.section) {
      const list = next[group.section] as object[];
      if (group.index === undefined) list.push(FACTORIES[group.section]());
      target = list[group.index ?? list.length - 1] as Record<string, unknown>;
    }
    for (const r of rows) setPath(target, r.path, r.value!);
  }
  return next;
}

/** 라이브러리에 같은 문항·답변이 없는 자기소개서 후보 */
export function newCoverLetterCandidates(
  existing: { question: string; answer: string }[],
  candidates: ImportDraft['coverLetters'],
): ImportDraft['coverLetters'] {
  const key = (e: { question: string; answer: string }) => `${normalizeOption(e.question)}\n${normalizeOption(e.answer)}`;
  const known = new Set(existing.map(key));
  return candidates.filter((c) => !known.has(key(c)));
}
