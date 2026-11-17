import { db, SCHEMA_VERSION, type ProfileRecord } from '../db';
import { detectDeviceLang } from '@/lib/lang';

const PROFILE_ID = 1 as const;

export function buildDefaultProfile(now: number = Date.now()): ProfileRecord {
  return {
    id: PROFILE_ID,
    lang: detectDeviceLang(),
    theme: 'system',
    reminderEnabled: false,
    reminderTime: null,
    onboardingDone: false,
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
  };
}

/** Lit le profil ; le crée avec les valeurs de l'appareil s'il n'existe pas encore. */
export async function getProfile(): Promise<ProfileRecord> {
  const existing = await db.profile.get(PROFILE_ID);
  if (existing) return existing;
  const created = buildDefaultProfile();
  await db.profile.put(created);
  return created;
}

export type ProfilePatch = Partial<Omit<ProfileRecord, 'id' | 'createdAt' | 'schemaVersion'>>;

export async function updateProfile(patch: ProfilePatch): Promise<ProfileRecord> {
  const current = await getProfile();
  const next: ProfileRecord = { ...current, ...patch, updatedAt: Date.now() };
  await db.profile.put(next);
  return next;
}

/** Utilisé par les tests et par la réinitialisation (phase 5). */
export async function clearProfile(): Promise<void> {
  await db.profile.clear();
}
