import { useState, type ComponentType } from 'react';
import type { SectionProps } from './fields';
import { ActivitySection } from './sections/ActivitySection';
import { BackupSection } from './sections/BackupSection';
import { BasicSection } from './sections/BasicSection';
import { DesiredSection } from './sections/DesiredSection';
import { EducationSection } from './sections/EducationSection';
import { LanguageSection } from './sections/LanguageSection';
import { MilitarySection } from './sections/MilitarySection';
import { ProjectSection } from './sections/ProjectSection';
import { RulesSection } from './sections/RulesSection';
import { WorkSection } from './sections/WorkSection';
import { useResume, type SaveStatus } from './useResume';

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
  { id: 'rules', title: '학습 규칙', component: RulesSection },
  { id: 'backup', title: '백업', component: BackupSection },
];

// 팝업 'JSON 가져오기' 등에서 options.html#backup 으로 메뉴 지정
const initialSection = () => SECTIONS.find((s) => `#${s.id}` === location.hash)?.id ?? SECTIONS[0]!.id;

function statusText(status: SaveStatus, updatedAt?: string) {
  switch (status) {
    case 'loading':
      return '불러오는 중…';
    case 'saving':
      return '저장 중…';
    case 'error':
      return '저장 실패 — 다시 시도해 주세요';
    default:
      return updatedAt ? `저장됨 · ${new Date(updatedAt).toLocaleString('ko-KR')}` : '';
  }
}

export default function App() {
  const { resume, update, status } = useResume();
  const [current, setCurrent] = useState(initialSection);
  const section = SECTIONS.find((s) => s.id === current) ?? SECTIONS[0]!;
  const Section = section.component;

  return (
    <>
      <header className="top">
        <b>이력서 자동 입력 · 이력서 편집</b>
        <small className={status === 'error' ? 'error' : undefined}>{statusText(status, resume?.meta.updatedAt)}</small>
      </header>
      <div className="wrap">
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
    </>
  );
}
