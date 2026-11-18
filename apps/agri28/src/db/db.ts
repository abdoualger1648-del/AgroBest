import Dexie, { type EntityTable } from 'dexie';
import type { Lang } from '@/lib/lang';
import type { ThemePreference } from '@/lib/appearance';
import type { BadgeRecord, DayProgress, DossierItem, Project, PromptEntry } from '@/domain/types';

export const DB_NAME = 'agri28';
export const SCHEMA_VERSION = 3;

/** Préférences et état de l'utilisateur. Une seule ligne, id = 1. */
export interface ProfileRecord {
  id: 1;
  lang: Lang;
  theme: ThemePreference;
  reminderEnabled: boolean;
  reminderTime: string | null;
  onboardingDone: boolean;
  activeProjectId: string | null;
  createdAt: number;
  updatedAt: number;
  schemaVersion: number;
}

/** Valeurs diverses : état du minuteur, dernier écran, version de contenu vue… */
export interface KvRecord {
  key: string;
  value: unknown;
}

export class Agri28Db extends Dexie {
  declare profile: EntityTable<ProfileRecord, 'id'>;
  declare kv: EntityTable<KvRecord, 'key'>;
  declare projects: EntityTable<Project, 'id'>;
  declare progress: EntityTable<DayProgress, 'id'>;
  declare dossierItems: EntityTable<DossierItem, 'id'>;
  declare promptEntries: EntityTable<PromptEntry, 'id'>;
  declare badges: EntityTable<BadgeRecord, 'id'>;

  constructor(name: string = DB_NAME) {
    super(name);

    // Version 1 (phase 1) : préférences uniquement.
    this.version(1).stores({
      profile: 'id',
      kv: 'key',
    });

    // Version 2 (phase 2) : projet, progression, briques du Dossier.
    this.version(2)
      .stores({
        profile: 'id',
        kv: 'key',
        projects: 'id, updatedAt',
        progress: 'id, projectId, day, status, completedAt, [projectId+day]',
        dossierItems: 'id, projectId, day, kind, updatedAt, [projectId+kind]',
      })
      .upgrade(async (transaction) => {
        await transaction
          .table<ProfileRecord>('profile')
          .toCollection()
          .modify((profile) => {
            profile.activeProjectId = null;
            profile.schemaVersion = SCHEMA_VERSION;
          });
      });

    // Version 3 (phase 5) : carnet de prompts et badges.
    this.version(3).stores({
      profile: 'id',
      kv: 'key',
      projects: 'id, updatedAt',
      progress: 'id, projectId, day, status, completedAt, [projectId+day]',
      dossierItems: 'id, projectId, day, kind, updatedAt, [projectId+kind]',
      promptEntries: 'id, projectId, day, favorite, updatedAt, *tags',
      badges: 'id, projectId, earnedAt',
    });
  }
}

export const db = new Agri28Db();
