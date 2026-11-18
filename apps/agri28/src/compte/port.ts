import type { CompteDistantInfos } from '@/db/repositories/compte';

/**
 * Port vers le service de comptes. L'application ne connaît que cette
 * interface : Firebase arrive en 8b derrière elle, sans qu'une seule ligne
 * d'écran ou de logique d'accès ait à changer.
 *
 * Toutes les méthodes peuvent échouer avec une `ErreurCompte`, dont le code
 * est traduisible. Aucune ne renvoie jamais de mot de passe.
 */
/** Une demande d'activation, telle que la voit l'administrateur. */
export interface DemandeEnAttente {
  uid: string;
  email: string;
  demandeLe: number;
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
  activerCompte(uid: string): Promise<void>;
}

export interface ServiceCompte extends ServiceAdministration {
  /** Relit l'état auprès du service. `null` si personne n'est connecté. */
  relire(): Promise<CompteDistantInfos | null>;
  sInscrire(email: string, motDePasse: string): Promise<CompteDistantInfos>;
  seConnecter(email: string, motDePasse: string): Promise<CompteDistantInfos>;
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
}

export type CodeErreurCompte =
  | 'email_deja_utilise'
  | 'identifiants_invalides'
  | 'email_invalide'
  | 'mot_de_passe_faible'
  | 'hors_ligne'
  | 'trop_de_tentatives'
  | 'non_connecte'
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
