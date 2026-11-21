import { z } from 'zod';
import { db, SCHEMA_VERSION } from './db';
import type { ProfileRecord } from './db';
import { buildDefaultProfile } from './repositories/profile';
import type { BadgeRecord, DayProgress, DossierItem, Project, PromptEntry } from '@/domain/types';

/**
 * Sauvegarde complète. Aucune donnée ne quitte l'appareil : l'utilisateur
 * télécharge un fichier et le range où il veut. C'est le seul rempart contre
 * un effacement des données du navigateur.
 */
export const BACKUP_APP = 'agri28' as const;

export interface BackupFile {
  app: typeof BACKUP_APP;
  schemaVersion: number;
  exportedAt: string;
  profile: ProfileRecord | null;
  projects: Project[];
  progress: DayProgress[];
  dossierItems: DossierItem[];
  promptEntries: PromptEntry[];
  badges: BadgeRecord[];
}

/** Validation d'un fichier importé : on refuse tout ce qui n'est pas une sauvegarde. */
export const backupSchema = z.object({
  app: z.literal(BACKUP_APP),
  schemaVersion: z.number().int().positive(),
  exportedAt: z.string(),
  profile: z.record(z.string(), z.unknown()).nullable(),
  projects: z.array(z.record(z.string(), z.unknown())),
  progress: z.array(z.record(z.string(), z.unknown())),
  dossierItems: z.array(z.record(z.string(), z.unknown())),
  promptEntries: z.array(z.record(z.string(), z.unknown())),
  badges: z.array(z.record(z.string(), z.unknown())),
});

export async function exportBackup(now: Date = new Date()): Promise<BackupFile> {
  const [profile, projects, progress, dossierItems, promptEntries, badges] = await Promise.all([
    db.profile.get(1),
    db.projects.toArray(),
    db.progress.toArray(),
    db.dossierItems.toArray(),
    db.promptEntries.toArray(),
    db.badges.toArray(),
  ]);

  return {
    app: BACKUP_APP,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    profile: profile ?? null,
    projects,
    progress,
    dossierItems,
    promptEntries,
    badges,
  };
}

export function backupBlob(backup: BackupFile): Blob {
  return new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
}

export interface BackupSummary {
  exportedAt: string;
  schemaVersion: number;
  projectName: string | null;
  daysDone: number;
  dossierItems: number;
  prompts: number;
}

/** Aperçu présenté avant d'écraser les données existantes. */
export function summarizeBackup(backup: BackupFile): BackupSummary {
  const firstProject = backup.projects[0];
  return {
    exportedAt: backup.exportedAt,
    schemaVersion: backup.schemaVersion,
    projectName: typeof firstProject?.name === 'string' ? firstProject.name : null,
    daysDone: backup.progress.filter((entry) => entry.status === 'done').length,
    dossierItems: backup.dossierItems.length,
    prompts: backup.promptEntries.length,
  };
}

export class InvalidBackupError extends Error {
  constructor() {
    super('Fichier de sauvegarde invalide.');
    this.name = 'InvalidBackupError';
  }
}

export function parseBackup(raw: unknown): BackupFile {
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) throw new InvalidBackupError();
  return parsed.data as unknown as BackupFile;
}

export async function readBackupFile(file: File): Promise<BackupFile> {
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text()) as unknown;
  } catch {
    throw new InvalidBackupError();
  }
  return parseBackup(raw);
}

/**
 * Pose le profil sauvegardé SUR un profil par défaut, au lieu de l'écrire tel
 * quel.
 *
 * Une sauvegarde faite avant une migration ne porte pas les champs ajoutés
 * depuis, et l'`upgrade` de Dexie ne rejoue pas sur une ligne écrite à la
 * main : elle ne se déclenche qu'au changement de version de la BASE. Le
 * champ manquant restait donc `undefined`.
 *
 * Le cas réel, trouvé en relisant ce fichier : un profil d'avant la phase 12
 * revenait sans `niveauParcours`. Ni un niveau, ni le `null` que la garde
 * attend — elle teste `=== null` — donc la personne n'était jamais envoyée au
 * test de niveau, tout en lisant « test non encore passé » dans ses réglages.
 *
 * La correction vaut pour toutes les migrations à venir, pas seulement
 * celle-là : tout champ ajouté plus tard reprendra sa valeur par défaut.
 */
export function normaliserProfil(
  sauvegarde: ProfileRecord | Record<string, unknown>,
): ProfileRecord {
  // Une clé explicitement `undefined` écraserait la valeur par défaut. Un
  // fichier JSON n'en produit jamais, mais un appel direct, si.
  const renseignes = Object.fromEntries(
    Object.entries(sauvegarde).filter(([, valeur]) => valeur !== undefined),
  );
  return {
    ...buildDefaultProfile(),
    ...renseignes,
    id: 1,
    schemaVersion: SCHEMA_VERSION,
  };
}

/** Restaure une sauvegarde en REMPLAÇANT les données actuelles. */
export async function restoreBackup(backup: BackupFile): Promise<void> {
  await db.transaction(
    'rw',
    [db.profile, db.projects, db.progress, db.dossierItems, db.promptEntries, db.badges],
    async () => {
      await Promise.all([
        db.profile.clear(),
        db.projects.clear(),
        db.progress.clear(),
        db.dossierItems.clear(),
        db.promptEntries.clear(),
        db.badges.clear(),
      ]);

      if (backup.profile) await db.profile.put(normaliserProfil(backup.profile));
      await db.projects.bulkPut(backup.projects);
      await db.progress.bulkPut(backup.progress);
      await db.dossierItems.bulkPut(backup.dossierItems);
      await db.promptEntries.bulkPut(backup.promptEntries);
      await db.badges.bulkPut(backup.badges);
    },
  );
}

/** Efface toutes les données de l'application sur cet appareil. */
export async function eraseEverything(): Promise<void> {
  await db.transaction(
    'rw',
    [db.profile, db.projects, db.progress, db.dossierItems, db.promptEntries, db.badges, db.kv],
    async () => {
      await Promise.all([
        db.profile.clear(),
        db.projects.clear(),
        db.progress.clear(),
        db.dossierItems.clear(),
        db.promptEntries.clear(),
        db.badges.clear(),
        db.kv.clear(),
      ]);
    },
  );
  try {
    localStorage.removeItem('agri28.theme');
    localStorage.removeItem('agri28.lang');
  } catch {
    /* stockage bloqué : sans conséquence */
  }
}
