import Dexie, { type EntityTable } from 'dexie';
import type { Lang } from '@/lib/lang';
import type { ThemePreference } from '@/lib/appearance';
import type { BadgeRecord, DayProgress, DossierItem, Project, PromptEntry } from '@/domain/types';

export const DB_NAME = 'agri28';
export const SCHEMA_VERSION = 4;

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

/**
 * Compte distant, mis en cache localement (phase 8a). Une seule ligne, id = 1.
 *
 * Ce cache est ce qui permet à l'application de rester utilisable hors ligne :
 * une fois l'activation connue, elle n'a plus jamais besoin du réseau. Il est
 * rafraîchi à chaque fois qu'une connexion est disponible.
 *
 * Décision D48 : rien d'autre que le compte ne quitte l'appareil, et rien
 * d'autre que le compte n'est stocké ici. Aucun mot de passe, jamais.
 */
export interface CompteRecord {
  id: 1;
  uid: string;
  email: string;
  emailVerifie: boolean;
  actif: boolean;
  demandeLe: number | null;
  activeLe: number | null;
  /** Dernière fois que l'état a pu être relu auprès du service distant. */
  synchroniseLe: number | null;
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
  declare compte: EntityTable<CompteRecord, 'id'>;

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

    // Version 4 (phase 8a) : cache local du compte distant.
    // Aucune donnée existante n'est touchée : la table est simplement ajoutée,
    // et une installation déjà en cours continue sans compte jusqu'à ce que
    // l'utilisateur en crée un.
    this.version(4).stores({
      profile: 'id',
      kv: 'key',
      projects: 'id, updatedAt',
      progress: 'id, projectId, day, status, completedAt, [projectId+day]',
      dossierItems: 'id, projectId, day, kind, updatedAt, [projectId+kind]',
      promptEntries: 'id, projectId, day, favorite, updatedAt, *tags',
      badges: 'id, projectId, earnedAt',
      compte: 'id',
    });
  }
}

export const db = new Agri28Db();
