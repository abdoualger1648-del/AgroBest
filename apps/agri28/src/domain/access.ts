import { TOTAL_DAYS } from './types';

/**
 * Règle d'accès — distincte de la règle de progression pédagogique.
 *
 * `computeDayStatuses` (course.ts) répond à « cette leçon est-elle la suite
 * logique du parcours ? ». Ce fichier répond à « cette personne a-t-elle le
 * droit de l'ouvrir ? ». Les deux conditions doivent être vraies, et elles
 * sont tenues séparées : mélanger un verrou pédagogique et un verrou
 * commercial dans la même fonction rendrait les deux incompréhensibles.
 *
 * Décision D47 : l'essai porte sur les trois premières LEÇONS, pas sur trois
 * jours de calendrier.
 */
export const LECONS_OFFERTES = 3;

/** Ce que l'application sait du compte, sous la forme stockée localement. */
export interface CompteEnregistre {
  email: string;
  emailVerifie: boolean;
  actif: boolean;
  demandeLe: number | null;
  activeLe: number | null;
}

export type EtatCompte =
  | { statut: 'anonyme' }
  | { statut: 'non_verifie'; email: string }
  | { statut: 'essai'; email: string }
  | { statut: 'demande_envoyee'; email: string; demandeLe: number }
  | { statut: 'actif'; email: string; activeLe: number };

export type MotifBlocage = 'compte_requis' | 'email_a_confirmer' | 'activation_requise';

export type Acces = { ouvert: true } | { ouvert: false; motif: MotifBlocage };

const OUVERT: Acces = { ouvert: true };

/**
 * Traduit l'enregistrement local en état utilisable par l'interface.
 * L'ordre des tests compte : un compte activé reste activé même s'il porte
 * encore la trace d'une demande.
 */
export function etatCompte(compte: CompteEnregistre | null | undefined): EtatCompte {
  if (!compte) return { statut: 'anonyme' };
  if (!compte.emailVerifie) return { statut: 'non_verifie', email: compte.email };
  if (compte.actif) return { statut: 'actif', email: compte.email, activeLe: compte.activeLe ?? 0 };
  if (compte.demandeLe !== null) {
    return { statut: 'demande_envoyee', email: compte.email, demandeLe: compte.demandeLe };
  }
  return { statut: 'essai', email: compte.email };
}

/**
 * Droit d'ouvrir une leçon. Ne se prononce pas sur l'existence du jour ni sur
 * la progression : seulement sur l'accès.
 */
export function accesAuJour(
  jour: number,
  etat: EtatCompte,
  leconsOffertes: number = LECONS_OFFERTES,
): Acces {
  switch (etat.statut) {
    case 'anonyme':
      return { ouvert: false, motif: 'compte_requis' };
    case 'non_verifie':
      return { ouvert: false, motif: 'email_a_confirmer' };
    case 'actif':
      return OUVERT;
    case 'essai':
    case 'demande_envoyee':
      return jour <= leconsOffertes ? OUVERT : { ouvert: false, motif: 'activation_requise' };
  }
}

/** Numéro de la dernière leçon ouverte, 0 quand aucune ne l'est. */
export function dernierJourAccessible(
  etat: EtatCompte,
  leconsOffertes: number = LECONS_OFFERTES,
  totalJours: number = TOTAL_DAYS,
): number {
  switch (etat.statut) {
    case 'anonyme':
    case 'non_verifie':
      return 0;
    case 'actif':
      return totalJours;
    case 'essai':
    case 'demande_envoyee':
      return Math.min(leconsOffertes, totalJours);
  }
}

/**
 * Leçons encore offertes avant que l'activation soit demandée. Sert à prévenir
 * l'utilisateur AVANT le mur, pas au moment où il le heurte.
 * Renvoie `null` quand la question ne se pose pas (compte actif, ou pas encore
 * de compte utilisable).
 */
export function leconsRestantes(
  etat: EtatCompte,
  joursValides: number,
  leconsOffertes: number = LECONS_OFFERTES,
): number | null {
  if (etat.statut !== 'essai' && etat.statut !== 'demande_envoyee') return null;
  return Math.max(0, leconsOffertes - Math.max(0, joursValides));
}

/** Une demande d'activation a-t-elle un sens dans cet état ? */
export function peutDemanderActivation(etat: EtatCompte): boolean {
  return etat.statut === 'essai' || etat.statut === 'demande_envoyee';
}
