import Dexie, { type EntityTable } from 'dexie';
import type { Lang } from '@/lib/lang';
import type { ThemePreference } from '@/lib/appearance';
import type { BadgeRecord, DayProgress, DossierItem, Project, PromptEntry } from '@/domain/types';
import type { Niveau } from '@/domain/access';
import type { NiveauParcours, ScoresNiveau } from '@/domain/niveau';

export const DB_NAME = 'agri28';
export const SCHEMA_VERSION = 5;

/** Préférences et état de l'utilisateur. Une seule ligne, id = 1. */
export interface ProfileRecord {
  id: 1;
  lang: Lang;
  theme: ThemePreference;
  reminderEnabled: boolean;
  reminderTime: string | null;
  onboardingDone: boolean;
  activeProjectId: string | null;
  /**
   * Niveau de parcours issu du test (phase 12). `null` = test non encore
   * passé, et c'est ce qui déclenche le test au démarrage.
   *
   * Porté par le PROFIL, pas par le dossier : le test mesure la personne, pas
   * l'exploitation. Qui ouvre un second dossier (D76) ne repasse donc pas le
   * test, et son niveau s'applique aux deux parcours.
   */
  niveauParcours: NiveauParcours | null;
  /** Scores des trois axes, conservés pour l'écran de résultat. */
  niveauScores: ScoresNiveau | null;
  niveauEvalueLe: number | null;
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
  /** Niveau du compte : nombre de dossiers autorisés (phase 9). */
  niveau: Niveau;
  demandeNiveauLe: number | null;
  niveauLe: number | null;
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

    // Version 5 (phase 12) : niveau de parcours dans le profil.
    //
    // Aucune table nouvelle, seulement trois champs. L'important est la
    // migration : une installation DÉJÀ EN COURS ne doit pas se retrouver
    // devant un test obligatoire au prochain lancement, entre son jour 14 et
    // son jour 15 (D89). Elle reçoit donc « intermediaire », le cran neutre,
    // et peut passer le test quand elle veut depuis les réglages.
    this.version(5)
      .stores({
        profile: 'id',
        kv: 'key',
        projects: 'id, updatedAt',
        progress: 'id, projectId, day, status, completedAt, [projectId+day]',
        dossierItems: 'id, projectId, day, kind, updatedAt, [projectId+kind]',
        promptEntries: 'id, projectId, day, favorite, updatedAt, *tags',
        badges: 'id, projectId, earnedAt',
        compte: 'id',
      })
      .upgrade(async (transaction) => {
        // « Déjà en route » = au moins un dossier créé. C'est le seul signe
        // fiable : `onboardingDone` n'est jamais repassé à vrai dans le code.
        const dossiers = await transaction.table('projects').count();
        const dejaEnRoute = dossiers > 0;
        await transaction
          .table<ProfileRecord>('profile')
          .toCollection()
          .modify((profile) => {
            profile.niveauParcours = dejaEnRoute ? 'intermediaire' : null;
            profile.niveauScores = null;
            profile.niveauEvalueLe = null;
            profile.schemaVersion = SCHEMA_VERSION;
          });
      });
  }
}

export const db = new Agri28Db();
