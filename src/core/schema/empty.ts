import {
  SCHEMA_VERSION,
  type Activity,
  type Award,
  type Certificate,
  type Desired,
  type Education,
  type LanguageSkill,
  type LanguageTest,
  type Project,
  type Resume,
  type Skill,
  type Work,
} from './resume';

const newId = () => crypto.randomUUID();

export function createEmptyResume(): Resume {
  return {
    meta: { schemaVersion: SCHEMA_VERSION, updatedAt: new Date().toISOString() },
    basics: { name: { ko: '' }, urls: [] },
    education: [],
    work: [],
    languageTests: [],
    languages: [],
    certificates: [],
    awards: [],
    activities: [],
    projects: [],
    skills: [],
    attachments: [],
  };
}

export const newEducation = (): Education => ({
  id: newId(),
  level: 'university',
  school: { ko: '' },
  status: 'graduated',
});

export const newWork = (): Work => ({
  id: newId(),
  company: { ko: '' },
  startDate: '',
  current: false,
});

export const newLanguageTest = (): LanguageTest => ({ id: newId(), language: 'en', exam: '' });
export const newLanguageSkill = (): LanguageSkill => ({ language: 'en', fluency: 'daily' });
export const newCertificate = (): Certificate => ({ id: newId(), name: '' });
export const newAward = (): Award => ({ id: newId(), title: '' });
export const newActivity = (): Activity => ({ id: newId(), type: 'extracurricular', name: '' });
export const newProject = (): Project => ({ id: newId(), name: '' });
export const newSkill = (): Skill => ({ name: '' });
export const emptyDesired = (): Desired => ({ locations: [], jobs: [], employmentTypes: [] });
