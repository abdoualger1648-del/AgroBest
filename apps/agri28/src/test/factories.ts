import { weekOf, type DayProgress, type Project } from '@/domain/types';

export function makeProgress(day: number, overrides: Partial<DayProgress> = {}): DayProgress {
  return {
    id: `p:${String(day).padStart(2, '0')}`,
    projectId: 'p',
    day,
    week: weekOf(day),
    status: 'done',
    unlocked: false,
    timeSpentSec: 0,
    sectionsDone: { concept: true, practice: true, quiz: true, review: true },
    captures: {},
    completedAt: Date.UTC(2026, 10, day),
    ...overrides,
  };
}

export function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p',
    name: 'Élevage ovin Aïn Defla',
    type: 'ovin',
    scale: { value: 60, unit: 'tete' },
    wilayaCode: '44',
    objective: 'vendre 40 agneaux en 12 mois',
    horizonMonths: 12,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}
