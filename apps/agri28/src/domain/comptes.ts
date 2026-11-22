import type { Niveau } from './access';

/**
 * Gestion des comptes par l'administrateur (phase 13).
 *
 * Module **pur** : le filtrage, la recherche et le comptage vivent ici, loin
 * de Firebase et du DOM. L'écran ne fait que les afficher.
 *
 * `desactiveLe` n'existe QUE dans cette vue : c'est l'administrateur qui
 * regarde le compte d'un autre. Le cache local d'un utilisateur n'en a aucun
 * besoin — il lui suffit de savoir s'il est actif — et l'y ajouter aurait
 * imposé une migration IndexedDB pour rien.
 */
export interface CompteAdministre {
  uid: string;
  email: string;
  actif: boolean;
  niveau: Niveau;
  /** Date de la demande d'activation, si elle a été faite. */
  demandeLe: number | null;
  activeLe: number | null;
  /** Date du dernier retrait d'accès ; `null` si le compte est ouvert. */
  desactiveLe: number | null;
  demandeNiveauLe: number | null;
  niveauLe: number | null;
}

export const FILTRES_COMPTES = ['tous', 'en_attente', 'actifs', 'inactifs', 'multi'] as const;
export type FiltreComptes = (typeof FILTRES_COMPTES)[number];

/** Le compte attend-il une réponse de l'administrateur, sur l'un ou l'autre droit ? */
export function attendUneReponse(compte: CompteAdministre): boolean {
  const activation = compte.demandeLe !== null && !compte.actif;
  const niveau = compte.demandeNiveauLe !== null && compte.niveau !== 'multi';
  return activation || niveau;
}

function correspond(compte: CompteAdministre, filtre: FiltreComptes): boolean {
  switch (filtre) {
    case 'tous':
      return true;
    case 'en_attente':
      return attendUneReponse(compte);
    case 'actifs':
      return compte.actif;
    case 'inactifs':
      return !compte.actif;
    case 'multi':
      return compte.niveau === 'multi';
  }
}

/**
 * Normalise une adresse pour la recherche : minuscules, sans espaces autour.
 * Volontairement simple — on cherche une adresse qu'on a sous les yeux, pas
 * un mot dans un texte.
 */
function normaliser(texte: string): string {
  return texte.trim().toLocaleLowerCase('fr');
}

/**
 * Filtre et cherche, sans toucher à l'ordre d'origine : le service rend les
 * comptes triés par adresse, et c'est l'ordre que l'écran doit garder.
 */
export function filtrerComptes(
  comptes: readonly CompteAdministre[],
  filtre: FiltreComptes,
  recherche = '',
): CompteAdministre[] {
  const terme = normaliser(recherche);
  return comptes.filter(
    (compte) =>
      correspond(compte, filtre) && (terme === '' || normaliser(compte.email).includes(terme)),
  );
}

export interface ResumeComptes {
  total: number;
  actifs: number;
  enAttente: number;
  multi: number;
}

export function resumerComptes(comptes: readonly CompteAdministre[]): ResumeComptes {
  return {
    total: comptes.length,
    actifs: comptes.filter((compte) => compte.actif).length,
    enAttente: comptes.filter((compte) => attendUneReponse(compte)).length,
    multi: comptes.filter((compte) => compte.niveau === 'multi').length,
  };
}

/**
 * Actions qu'un administrateur peut mener sur un compte donné.
 *
 * Deux garde-fous, et le premier compte vraiment : **on ne se retire jamais
 * ses propres droits depuis cet écran**. L'administrateur est un compte comme
 * les autres (D74) ; sans cette règle, un clic malheureux lui fermerait les
 * leçons et, s'il se désactivait, il n'aurait plus aucune raison d'être
 * inactif que de se réactiver lui-même — mais la confusion serait totale.
 * Le second évite d'afficher une action sans effet.
 */
export interface ActionsCompte {
  activer: boolean;
  desactiver: boolean;
  accorderNiveau: boolean;
  retirerNiveau: boolean;
}

export function actionsPossibles(
  compte: CompteAdministre,
  uidAdministrateur: string | null,
): ActionsCompte {
  const soiMeme = uidAdministrateur !== null && compte.uid === uidAdministrateur;
  return {
    activer: !compte.actif,
    desactiver: compte.actif && !soiMeme,
    accorderNiveau: compte.niveau !== 'multi',
    retirerNiveau: compte.niveau === 'multi' && !soiMeme,
  };
}

/**
 * Faut-il montrer à cette personne son identifiant de compte ?
 *
 * Il ne sert qu'à **une** chose : créer le document `admins/{uid}` dans la
 * console Firestore, qui désigne un administrateur (D56, D73). Aucun
 * utilisateur ordinaire n'en a jamais besoin — une demande d'activation ou de
 * niveau s'écrit sur son propre document, et l'écran d'administration la voit
 * apparaître seule, avec l'adresse email. Personne n'a à transmettre son
 * identifiant à qui que ce soit.
 *
 * L'afficher à tout le monde n'était donc pas une fuite — chacun ne voit que
 * le sien, et un identifiant n'autorise rien — mais du bruit : 28 caractères
 * et une phrase parlant d'« administrateur » et de « droits particuliers »,
 * là où D22 demande le vocabulaire de terrain.
 *
 * Deux portes, et la seconde évite de tourner en rond : un administrateur
 * déjà désigné le voit, et la personne dont l'adresse est celle du build
 * (`VITE_EMAIL_ADMIN`) aussi — c'est elle, par construction, qui désignera le
 * tout premier administrateur, avant d'en avoir les droits.
 */
export function montrerIdentifiant(options: {
  estAdministrateur: boolean;
  /** Adresse du compte connecté. */
  email: string;
  /** Adresse fournie au build, vide si elle ne l'a pas été. */
  emailAdmin: string;
}): boolean {
  if (options.estAdministrateur) return true;
  const attendue = options.emailAdmin.trim().toLowerCase();
  // Sans adresse d'administrateur au build, cette seconde porte n'existe pas :
  // deux chaînes vides ne doivent pas ouvrir à tout le monde.
  if (attendue === '') return false;
  return options.email.trim().toLowerCase() === attendue;
}
