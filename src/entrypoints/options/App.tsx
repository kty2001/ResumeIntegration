import { useEffect, useState, type ComponentType } from 'react';
import { CONSENT_VERSION, consentItem } from '@/storage/items';
import { ConsentModal } from './ConsentModal';
import type { SectionProps } from './fields';
import { ActivitySection } from './sections/ActivitySection';
import { AttachmentSection } from './sections/AttachmentSection';
import { BackupSection } from './sections/BackupSection';
import { BasicSection } from './sections/BasicSection';
import { CoverLetterSection } from './sections/CoverLetterSection';
import { DesiredSection } from './sections/DesiredSection';
import { EducationSection } from './sections/EducationSection';
import { LanguageSection } from './sections/LanguageSection';
import { LinkedSitesSection } from './sections/LinkedSitesSection';
import { MilitarySection } from './sections/MilitarySection';
import { ProjectSection } from './sections/ProjectSection';
import { RulesSection } from './sections/RulesSection';
import { SettingsSection } from './sections/SettingsSection';
import { WorkSection } from './sections/WorkSection';
import { saveStatusText as statusText, useResume } from './useResume';

// 화면 설계: docs/design/screens.md 4장
const SECTIONS: { id: string; title: string; component: ComponentType<SectionProps> }[] = [
  { id: 'basic', title: '기본 정보', component: BasicSection },
  { id: 'education', title: '학력', component: EducationSection },
  { id: 'work', title: '경력', component: WorkSection },
  { id: 'military', title: '병역·취업우대', component: MilitarySection },
  { id: 'language', title: '어학·자격증', component: LanguageSection },
  { id: 'activity', title: '활동·수상', component: ActivitySection },
  { id: 'project', title: '프로젝트·기술', component: ProjectSection },
  { id: 'desired', title: '희망 조건', component: DesiredSection },
  { id: 'cover', title: '자기소개서', component: CoverLetterSection },
  { id: 'files', title: '첨부 파일', component: AttachmentSection },
  { id: 'sites', title: '연동 사이트', component: LinkedSitesSection },
  { id: 'rules', title: '학습 규칙', component: RulesSection },
  { id: 'settings', title: '설정', component: SettingsSection },
  { id: 'backup', title: '백업', component: BackupSection },
];

// 팝업 'JSON 가져오기' 등에서 options.html#backup 으로 메뉴 지정
const initialSection = () => SECTIONS.find((s) => `#${s.id}` === location.hash)?.id ?? SECTIONS[0]!.id;

export default function App() {
  const { resume, update, status } = useResume();
  const [current, setCurrent] = useState(initialSection);
  const section = SECTIONS.find((s) => s.id === current) ?? SECTIONS[0]!;
  const Section = section.component;
  // 미동의(최초 실행)면 동의 모달, 조회 전(undefined)은 표시 안 함
  const [consented, setConsented] = useState<boolean>();

  useEffect(() => {
    consentItem.getValue().then(
      (c) => setConsented(c?.version === CONSENT_VERSION),
      () => setConsented(false),
    );
  }, []);

  return (
    <>
      <header className="top" inert={consented === false}>
        <b>이력서 자동 입력 · 이력서 편집</b>
        <small className={status === 'error' ? 'error' : undefined}>{statusText(status, resume?.meta.updatedAt)}</small>
      </header>
      <div className="wrap" inert={consented === false}>
        <nav>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={s.id === current ? 'on' : undefined}
              onClick={() => setCurrent(s.id)}
            >
              {s.title}
            </button>
          ))}
        </nav>
        <main>
          <h2>{section.title}</h2>
          {resume ? <Section resume={resume} update={update} /> : <p className="desc">{statusText(status)}</p>}
        </main>
      </div>
      {consented === false && <ConsentModal onAccept={() => setConsented(true)} />}
    </>
  );
}
