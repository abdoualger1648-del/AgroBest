import type { Lang } from '@/lib/lang';
import type { DossierKind } from '@/content/schema';

export const TOTAL_DAYS = 28;
export const WEEKS = 4;

export const PROJECT_TYPES = [
  'ovin',
  'bovin',
  'avicole',
  'maraichage',
  'serre',
  'cereales',
  'arboriculture',
  'apiculture',
  'autre',
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const SCALE_UNITS = ['ha', 'm2', 'tete', 'sujet', 'ruche'] as const;
export type ScaleUnit = (typeof SCALE_UNITS)[number];

export const WATER_SOURCES = ['forage', 'reseau', 'pluvial', 'bassin', 'autre', 'inconnu'] as const;
export type WaterSource = (typeof WATER_SOURCES)[number];

/** Unité qui a du sens par défaut pour chaque type de projet. */
export const DEFAULT_UNIT: Record<ProjectType, ScaleUnit> = {
  ovin: 'tete',
  bovin: 'tete',
  avicole: 'sujet',
  maraichage: 'ha',
  serre: 'm2',
  cereales: 'ha',
  arboriculture: 'ha',
  apiculture: 'ruche',
  autre: 'ha',
};

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  typeOther?: string;
  scale: { value: number; unit: ScaleUnit };
  wilayaCode: string;
  commune?: string;
  objective: string;
  horizonMonths: number;
  budgetCeilingDA?: number;
  waterSource?: WaterSource;
  startMonth?: number;
  createdAt: number;
  updatedAt: number;
}

export type DayStatus = 'locked' | 'available' | 'in_progress' | 'done';

export interface QuizResult {
  answers: Record<string, string>;
  score: number;
  total: number;
  attempts: number;
}

export interface DayProgress {
  id: string;
  projectId: string;
  day: number;
  week: number;
  status: Exclude<DayStatus, 'locked'>;
  /** Ouvert manuellement alors que le jour précédent n'était pas validé. */
  unlocked: boolean;
  startedAt?: number;
  completedAt?: number;
  timeSpentSec: number;
  sectionsDone: { concept: boolean; practice: boolean; quiz: boolean; review: boolean };
  quiz?: QuizResult;
  confidence?: 1 | 2 | 3 | 4 | 5;
  captures: Record<string, string>;
  note?: string;
}

export type DossierBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'kv'; rows: { key: string; value: string }[] }
  | {
      type: 'table';
      columns: { key: string; label: string; numeric?: boolean }[];
      rows: Record<string, string | number>[];
      totalsRow?: boolean;
    }
  | { type: 'note'; variant: 'info' | 'warning'; text: string };

export interface DossierItem {
  id: string;
  projectId: string;
  day: number;
  kind: DossierKind;
  title: string;
  lang: Lang;
  blocks: DossierBlock[];
  sourceLessonId: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
  version: number;
}

/** Une entrée du carnet de prompts : un prompt copié, puis éditable. */
export interface PromptEntry {
  id: string;
  projectId: string;
  day: number;
  lessonId: string;
  promptId: string;
  title: string;
  tool: string;
  lang: Lang;
  /** Texte final, variables déjà remplacées, modifiable par l'utilisateur. */
  text: string;
  /** Texte d'origine, pour pouvoir revenir en arrière. */
  originalText: string;
  tags: string[];
  resultNote?: string;
  favorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export const BADGE_IDS = ['week-1', 'week-2', 'week-3', 'week-4', 'final'] as const;
export type BadgeId = (typeof BADGE_IDS)[number];

export interface BadgeRecord {
  /** `${projectId}:${badge}` — un badge appartient à un projet. */
  id: string;
  projectId: string;
  badge: BadgeId;
  earnedAt: number;
}

export function weekOf(day: number): number {
  return Math.min(WEEKS, Math.max(1, Math.ceil(day / 7)));
}

export function isProjectType(value: unknown): value is ProjectType {
  return typeof value === 'string' && (PROJECT_TYPES as readonly string[]).includes(value);
}
