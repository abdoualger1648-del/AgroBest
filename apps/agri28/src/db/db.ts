import Dexie, { type EntityTable } from 'dexie';
import type { Lang } from '@/lib/lang';
import type { ThemePreference } from '@/lib/appearance';

export const DB_NAME = 'agri28';
export const SCHEMA_VERSION = 1;

/** Préférences et état de l'utilisateur. Une seule ligne, id = 1. */
export interface ProfileRecord {
  id: 1;
  lang: Lang;
  theme: ThemePreference;
  reminderEnabled: boolean;
  reminderTime: string | null;
  onboardingDone: boolean;
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

  constructor(name: string = DB_NAME) {
    super(name);
    // Version 1 : préférences uniquement. Les tables du parcours
    // (projects, progress, dossierItems, promptEntries, badges) arrivent en phase 2.
    this.version(1).stores({
      profile: 'id',
      kv: 'key',
    });
  }
}

export const db = new Agri28Db();
