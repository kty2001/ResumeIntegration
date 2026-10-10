import { useEffect, useState } from 'react';
import { fingerprintLabel, removeRule, type LearnedRule } from '@/core/mapping/learned';
import { schemaKeyLabel } from '@/core/schema/labels';
import { learnedRulesItem } from '@/storage/items';

// 화면 설계: docs/design/screens.md 4장 '학습 규칙'

export function RulesSection() {
  const [rules, setRules] = useState<LearnedRule[]>([]);

  useEffect(() => {
    learnedRulesItem.getValue().then(setRules);
    return learnedRulesItem.watch(setRules);
  }, []);

  const remove = async (rule: LearnedRule) =>
    learnedRulesItem.setValue(removeRule(await learnedRulesItem.getValue(), rule.origin, rule.fingerprint));

  return (
    <>
      <p className="desc">사이드 패널에서 직접 고른 결과입니다. 같은 사이트 재방문 시 우선 적용됩니다.</p>
      <div className="card">
        {rules.length ? (
          <table>
            <thead>
              <tr>
                <th>사이트</th>
                <th>입력란</th>
                <th>이력서 항목</th>
                <th>선택지</th>
                <th>수정일</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={`${r.origin} ${r.fingerprint}`}>
                  <td>{new URL(r.origin).host}</td>
                  <td>{fingerprintLabel(r.fingerprint)}</td>
                  <td>{schemaKeyLabel(r.schemaKey)}</td>
                  <td>{r.option?.text}</td>
                  <td>{new Date(r.updatedAt).toLocaleDateString('ko-KR')}</td>
                  <td>
                    <button type="button" className="btn danger" onClick={() => void remove(r)}>
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="desc">학습된 규칙이 없습니다.</p>
        )}
      </div>
    </>
  );
}
