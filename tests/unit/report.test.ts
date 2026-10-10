import { describe, expect, it } from 'vitest';
import { applyFillOne, buildFillReport } from '@/core/mapping/report';
import type { FillPlan, FillResult, PageDetails } from '@/messaging/protocol';

const details: PageDetails = {
  url: 'https://example.com/apply',
  fields: [
    { fieldId: '0', widget: 'text', label: '성명', name: 'name' },
    { fieldId: '1', widget: 'text', placeholder: '이메일', name: 'email' },
    { fieldId: '2', widget: 'text', name: 'nickname' },
    { fieldId: '3', widget: 'text' },
  ],
};

const plan: FillPlan = {
  items: [
    { fieldId: '0', schemaKey: 'basics.name.ko', value: '홍길동', source: 'rule' },
    { fieldId: '1', schemaKey: 'basics.email', value: 'a@b.c', source: 'rule' },
  ],
  unmatched: ['2', '3'],
};

const result: FillResult = {
  filled: [{ fieldId: '0', strategy: 'text' }],
  failed: [{ fieldId: '1', reason: 'too-long' }],
};

describe('buildFillReport', () => {
  const report = buildFillReport(details, plan, result, 7, new Date('2026-10-09T00:00:00Z'));

  it('입력 완료·실패·해당 없음 분류 (페이지 순서 유지)', () => {
    expect(report.fields.map((f) => [f.fieldId, f.status])).toEqual([
      ['0', 'filled'],
      ['1', 'failed'],
      ['2', 'unmatched'],
      ['3', 'unmatched'],
    ]);
    expect(report.fields[1]).toMatchObject({ schemaKey: 'basics.email', reason: 'too-long' });
    expect(report.fields[2]?.schemaKey).toBeUndefined();
    expect(report).toMatchObject({ tabId: 7, url: details.url, at: '2026-10-09T00:00:00.000Z' });
  });

  it('표시 라벨 대체 순서', () => {
    expect(report.fields.map((f) => f.label)).toEqual(['성명', '이메일', 'nickname', '이름 없는 입력란']);
  });

  it('학습 규칙 식별자·입력 완료 출처', () => {
    expect(report.fields[0]).toMatchObject({ fingerprint: '["text","name","","성명"]', source: 'rule' });
    expect(report.fields[1]?.source).toBeUndefined();
    expect(report.fields[3]?.fingerprint).toBeUndefined();
  });

  it('페이지 안에서 겹치는 식별자는 학습 제외 (반복 블록)', () => {
    const repeated: PageDetails = {
      url: details.url,
      fields: [
        { fieldId: '0', widget: 'text', label: '학교명', name: 'school' },
        { fieldId: '1', widget: 'text', label: '학교명', name: 'school' },
        { fieldId: '2', widget: 'text', label: '전공', name: 'major' },
      ],
    };
    const r = buildFillReport(repeated, { items: [], unmatched: ['0', '1', '2'] }, { filled: [], failed: [] }, 7);
    expect(r.fields.map((f) => f.fingerprint)).toEqual([undefined, undefined, '["text","major","","전공"]']);
  });

  it('형식 변환 힌트 보존', () => {
    expect(report.fields[1]?.hint).toEqual({ widget: 'text', placeholder: '이메일', maxLength: undefined });
    const options = [{ value: '1', text: '남' }];
    const select = buildFillReport(
      { url: details.url, fields: [{ fieldId: '0', widget: 'select', label: '성별', options }] },
      { items: [], unmatched: ['0'] },
      { filled: [], failed: [] },
      7,
    );
    expect(select.fields[0]?.hint).toMatchObject({ widget: 'select', options });
  });

  it('입력 결과에 없는 계획 항목은 실패로 처리', () => {
    const r = buildFillReport(details, plan, { filled: [], failed: [] }, 7);
    expect(r.fields[0]).toMatchObject({ status: 'failed', reason: 'not-applied' });
  });
});

describe('applyFillOne', () => {
  const report = buildFillReport(details, plan, result, 7);

  it('입력 성공 시 해당 입력란만 입력 완료로 변경', () => {
    const r = applyFillOne(report, '2', 'basics.email', { filled: [{ fieldId: '2', strategy: 'text' }], failed: [] });
    expect(r.fields[2]).toMatchObject({ fieldId: '2', label: 'nickname', status: 'filled', schemaKey: 'basics.email' });
    expect(r.fields[2]?.hint).toEqual(report.fields[2]?.hint);
    expect(r.fields[2]).toMatchObject({ source: 'manual', fingerprint: report.fields[2]?.fingerprint });
    expect(r.fields.filter((f, i) => f !== report.fields[i])).toHaveLength(1);
    expect(r.tabId).toBe(7);
  });

  it('입력 실패 시 사유 반영', () => {
    const r = applyFillOne(report, '0', 'basics.name.en', { filled: [], failed: [{ fieldId: '0', reason: 'too-long' }] });
    expect(r.fields[0]).toMatchObject({ status: 'failed', schemaKey: 'basics.name.en', reason: 'too-long' });
  });
});
