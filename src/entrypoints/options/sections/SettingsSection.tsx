import { useEffect, useState, type FormEvent } from 'react';
import { DEFAULT_EXCLUDED_DOMAINS, normalizeDomain } from '@/core/site-policy';
import { settingsItem, type Settings } from '@/storage/items';
import { CheckField } from '../fields';

// 화면 설계: docs/design/screens.md 4장 '설정' (현재: 민감정보 자동 입력 사용 여부, 자동 입력 제외 사이트)

export function SettingsSection() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [input, setInput] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    settingsItem.getValue().then(setSettings);
    return settingsItem.watch(setSettings);
  }, []);

  if (!settings) return <p className="desc">불러오는 중…</p>;

  const save = (excludedSites: string[]) => settingsItem.setValue({ ...settings, excludedSites });

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const domain = normalizeDomain(input);
    if (!domain) return setMessage('도메인 형식이 아닙니다. 예: example.com');
    if ([...DEFAULT_EXCLUDED_DOMAINS, ...settings.excludedSites].includes(domain))
      return setMessage(`${domain}은(는) 이미 제외 목록에 있습니다.`);
    await save([...settings.excludedSites, domain]);
    setInput('');
    setMessage('');
  };

  return (
    <>
      <div className="card">
        <div className="card-head">
          <b>민감정보</b>
        </div>
        <CheckField
          label="민감정보(보훈·장애·취업보호 대상, 병역 면제 사유) 자동 입력 사용"
          checked={!!settings.sensitiveAutofill}
          onChange={(on) => void settingsItem.setValue({ ...settings, sensitiveAutofill: on })}
        />
        <p className="desc">끄면 자동 입력·사이드 패널 목록·직접 고친 값 학습에서 민감정보 항목을 쓰지 않습니다. 기본값은 사용 안 함입니다.</p>
      </div>

      <div className="card">
        <div className="card-head">
          <b>자동 입력 제외 사이트</b>
        </div>
        <p className="desc">목록의 사이트(하위 도메인 포함)에서는 '작성'을 눌러도 입력하지 않습니다.</p>
        <table>
          <tbody>
            {DEFAULT_EXCLUDED_DOMAINS.map((d) => (
              <tr key={d}>
                <td>{d}</td>
                <td>기본 · 이용약관상 자동 입력 금지</td>
                <td></td>
              </tr>
            ))}
            {settings.excludedSites.map((d) => (
              <tr key={d}>
                <td>{d}</td>
                <td>직접 추가</td>
                <td>
                  <button type="button" className="btn danger" onClick={() => void save(settings.excludedSites.filter((s) => s !== d))}>
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <form className="toolbar" style={{ marginTop: 12 }} onSubmit={(e) => void add(e)}>
          <input aria-label="제외할 사이트" placeholder="example.com 또는 주소" value={input} onChange={(e) => setInput(e.target.value)} />
          <button type="submit" className="btn">
            추가
          </button>
        </form>
        {message && (
          <p className="desc" role="status">
            {message}
          </p>
        )}
      </div>
    </>
  );
}
