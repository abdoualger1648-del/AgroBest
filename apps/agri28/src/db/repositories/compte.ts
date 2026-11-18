import { db, type CompteRecord } from '../db';
import type { CompteEnregistre } from '@/domain/access';

const COMPTE_ID = 1 as const;

/** Lit le compte mis en cache, ou `null` si personne n'est connecté. */
export async function getCompte(): Promise<CompteRecord | null> {
  return (await db.compte.get(COMPTE_ID)) ?? null;
}

export type CompteDistantInfos = Omit<CompteRecord, 'id' | 'synchroniseLe'>;

/**
 * Écrit l'état connu du compte. `synchroniseLe` marque le moment où
 * l'information vient réellement du service distant — un `null` signifie
 * « écrit localement, pas encore confirmé ».
 */
export async function enregistrerCompte(
  infos: CompteDistantInfos,
  synchroniseLe: number | null = Date.now(),
): Promise<CompteRecord> {
  const record: CompteRecord = { id: COMPTE_ID, ...infos, synchroniseLe };
  await db.compte.put(record);
  return record;
}

/** Déconnexion : le cache local disparaît, les données du parcours restent. */
export async function oublierCompte(): Promise<void> {
  await db.compte.clear();
}

/** Projection vers la forme attendue par la logique d'accès. */
export function versCompteEnregistre(record: CompteRecord | null): CompteEnregistre | null {
  if (!record) return null;
  return {
    email: record.email,
    emailVerifie: record.emailVerifie,
    actif: record.actif,
    demandeLe: record.demandeLe,
    activeLe: record.activeLe,
  };
}
