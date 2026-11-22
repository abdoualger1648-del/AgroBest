import type { CompteDistantInfos } from '@/db/repositories/compte';
import type { CompteAdministre } from '@/domain/comptes';

export type { CompteAdministre };

/**
 * Port vers le service de comptes. L'application ne connaît que cette
 * interface : Firebase arrive en 8b derrière elle, sans qu'une seule ligne
 * d'écran ou de logique d'accès ait à changer.
 *
 * Toutes les méthodes peuvent échouer avec une `ErreurCompte`, dont le code
 * est traduisible. Aucune ne renvoie jamais de mot de passe.
 */
/**
 * Une demande en attente, telle que la voit l'administrateur. Deux natures :
 * ouvrir les 28 leçons, ou passer au niveau multi-dossiers.
 */
/**
 * Fournisseurs d'identité acceptés (phase 14).
 *
 * Pas de WhatsApp : il n'existe aucun fournisseur OAuth WhatsApp — l'entreprise
 * authentifie ses propres utilisateurs mais ne délègue rien aux applications
 * tierces. Pas de X non plus : son accès développeur est payant pour un public
 * qui ne l'utilise pas. Pas de téléphone : Firebase n'envoie plus de SMS sans
 * compte de facturation depuis septembre 2024, et le projet est sur Spark.
 */
export const FOURNISSEURS = ['google', 'facebook'] as const;
export type Fournisseur = (typeof FOURNISSEURS)[number];

export type NatureDemande = 'activation' | 'niveau';

export interface DemandeEnAttente {
  uid: string;
  email: string;
  demandeLe: number;
  nature: NatureDemande;
}

/**
 * Côté administration (D49). Séparé par clarté, mais implémenté par le même
 * service : c'est le même compte connecté qui décide des droits.
 */
export interface ServiceAdministration {
  /** Le compte connecté a-t-il le droit d'administrer ? */
  estAdministrateur(): Promise<boolean>;
  /** Demandes non encore activées, de la plus ancienne à la plus récente. */
  listerDemandes(): Promise<DemandeEnAttente[]>;
  /**
   * Tous les comptes, triés par adresse (phase 13).
   *
   * Distinct de `listerDemandes`, et pas seulement par commodité : la liste
   * des demandes s'appuie sur `orderBy('demandeLe')`, qui **écarte** les
   * documents dépourvus de ce champ. Quelqu'un qui n'a jamais rien demandé
   * n'y figure donc pas, alors qu'il doit figurer ici.
   */
  listerComptes(): Promise<CompteAdministre[]>;
  activerCompte(uid: string): Promise<void>;
  /** Ferme les 28 leçons. Le Dossier de la personne reste sur son appareil. */
  desactiverCompte(uid: string): Promise<void>;
  /** Accorde le niveau multi-dossiers à un compte. */
  accorderNiveau(uid: string): Promise<void>;
  /** Ramène un compte au niveau standard : un seul dossier. */
  retirerNiveau(uid: string): Promise<void>;
}

export interface ServiceCompte extends ServiceAdministration {
  /** Relit l'état auprès du service. `null` si personne n'est connecté. */
  relire(): Promise<CompteDistantInfos | null>;
  sInscrire(email: string, motDePasse: string): Promise<CompteDistantInfos>;
  seConnecter(email: string, motDePasse: string): Promise<CompteDistantInfos>;
  /**
   * Connecte — ou inscrit, c'est le même geste — par un fournisseur d'identité.
   *
   * Le document Firestore est créé à la volée s'il n'existe pas : `etatComplet`
   * le fait déjà pour rattraper une inscription interrompue, et une première
   * connexion par Google se trouve exactement dans ce cas.
   */
  connecterAvecFournisseur(fournisseur: Fournisseur): Promise<CompteDistantInfos>;
  seDeconnecter(): Promise<void>;
  renvoyerVerification(): Promise<void>;
  /**
   * Envoie un message de réinitialisation du mot de passe.
   *
   * Ne dit JAMAIS si l'adresse a un compte : répondre « adresse inconnue »
   * permettrait à n'importe qui de savoir qui est inscrit.
   */
  reinitialiserMotDePasse(email: string): Promise<void>;
  /** Écrit la demande d'activation. Renvoie l'état mis à jour. */
  demanderActivation(): Promise<CompteDistantInfos>;
  /** Écrit la demande de passage au niveau multi-dossiers. */
  demanderNiveau(): Promise<CompteDistantInfos>;
}

export type CodeErreurCompte =
  | 'email_deja_utilise'
  | 'identifiants_invalides'
  | 'email_invalide'
  | 'mot_de_passe_faible'
  | 'hors_ligne'
  | 'trop_de_tentatives'
  | 'non_connecte'
  // ——— fournisseurs d'identité (phase 14) ———
  /** La fenêtre du fournisseur a été fermée avant la fin. Ce n'est pas une panne. */
  | 'connexion_annulee'
  /** Cette adresse existe déjà, mais rattachée à une autre méthode de connexion. */
  | 'autre_methode'
  /** Le fournisseur n'est pas activé côté Firebase, ou pas disponible ici. */
  | 'fournisseur_indisponible'
  /**
   * L'appareil n'a aucun compte du fournisseur à proposer (phase 16).
   *
   * Distinct de `fournisseur_indisponible` parce que l'action utile n'est pas
   * la même : là il n'y a rien à faire, ici il suffit d'ajouter un compte au
   * téléphone — ou de passer par l'email et le mot de passe.
   */
  | 'aucun_compte_appareil'
  /**
   * La connexion par fournisseur n'est pas configurée correctement pour cette
   * version de l'application (phase 16) : client OAuth web absent de
   * `google-services.json`, ou empreinte de signature non déclarée dans
   * Firebase. Rien que l'utilisateur puisse corriger — mais il doit savoir
   * que la panne n'est pas de son fait, et qu'une autre voie existe.
   */
  | 'configuration_fournisseur'
  | 'inconnue';

export class ErreurCompte extends Error {
  readonly code: CodeErreurCompte;

  constructor(code: CodeErreurCompte, message?: string) {
    super(message ?? code);
    this.name = 'ErreurCompte';
    this.code = code;
  }
}

/** Vrai pour les erreurs qu'un simple nouvel essai peut résoudre. */
export function estTemporaire(code: CodeErreurCompte): boolean {
  return code === 'hors_ligne' || code === 'trop_de_tentatives';
}

/**
 * Codes qui viennent d'une connexion par fournisseur, et de nulle part ailleurs.
 *
 * L'écran de compte porte un formulaire ET des boutons de fournisseur, mais
 * le store n'a qu'une seule `derniereErreur`. Sans cette distinction, fermer
 * la fenêtre de Google affichait un message rouge sous le champ email — au
 * mauvais endroit, et pour un geste délibéré.
 */
export function estErreurFournisseur(code: CodeErreurCompte): boolean {
  return (
    code === 'connexion_annulee' ||
    code === 'autre_methode' ||
    code === 'fournisseur_indisponible' ||
    code === 'aucun_compte_appareil' ||
    code === 'configuration_fournisseur'
  );
}

/**
 * Vrai quand l'erreur affichée est probablement due à un compte créé chez un
 * fournisseur, sur un écran qui n'offre AUCUN bouton de fournisseur.
 *
 * Le cas est réel et sans issue visible : quelqu'un crée son compte sur le
 * web avec Google — ce compte n'a donc pas de mot de passe — puis installe
 * l'APK, où les boutons de fournisseur sont absents (D113). Le formulaire
 * répond alors « identifiants incorrects » à la connexion et « adresse déjà
 * utilisée » à l'inscription : deux messages contradictoires, et rien qui
 * indique la sortie. La sortie existe pourtant — « Mot de passe oublié »
 * donne un mot de passe au compte — mais il fallait le dire.
 *
 * Les deux codes ont d'autres causes bien plus fréquentes (une faute de
 * frappe, une adresse déjà prise), d'où une phrase d'aide en complément du
 * message, et jamais à sa place.
 */
export function impasseFournisseur(
  code: CodeErreurCompte,
  fournisseurs: readonly Fournisseur[],
): boolean {
  if (fournisseurs.length > 0) return false;
  return code === 'identifiants_invalides' || code === 'email_deja_utilise';
}

/**
 * Une annulation n'est pas une erreur : fermer la fenêtre du fournisseur est
 * un geste délibéré, et afficher un message rouge pour cela serait absurde.
 */
export function estAnnulation(code: CodeErreurCompte): boolean {
  return code === 'connexion_annulee';
}
