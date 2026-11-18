import { ErreurCompte, type DemandeEnAttente, type ServiceCompte } from './port';
import type { CompteDistantInfos } from '@/db/repositories/compte';

interface CompteStocke extends CompteDistantInfos {
  motDePasse: string;
}

/**
 * Service de comptes en mémoire : sert aux tests, et au développement tant que
 * Firebase n'est pas branché (phase 8b).
 *
 * Il reproduit volontairement les comportements qui comptent — email à
 * confirmer, activation décidée ailleurs que dans l'application, panne réseau —
 * pour que les écrans soient éprouvés contre eux avant même qu'un vrai service
 * existe. Les méthodes renvoient des promesses sans être `async` : le travail
 * est synchrone, et une erreur doit arriver en rejet, comme chez un vrai
 * service, jamais en exception levée pendant l'appel.
 */
export class FauxServiceCompte implements ServiceCompte {
  private readonly comptes = new Map<string, CompteStocke>();
  private connecte: string | null = null;

  /** Simule l'absence de réseau quand c'est `true`. */
  horsLigne = false;

  private appel<T>(travail: () => T): Promise<T> {
    try {
      if (this.horsLigne) throw new ErreurCompte('hors_ligne');
      return Promise.resolve(travail());
    } catch (erreur) {
      return Promise.reject(erreur instanceof Error ? erreur : new ErreurCompte('inconnue'));
    }
  }

  private courant(): CompteStocke {
    if (this.connecte === null) throw new ErreurCompte('non_connecte');
    const compte = this.comptes.get(this.connecte);
    if (!compte) throw new ErreurCompte('non_connecte');
    return compte;
  }

  /** Recopie champ par champ : le mot de passe ne peut pas fuiter par mégarde. */
  private static projeter(compte: CompteStocke): CompteDistantInfos {
    return {
      uid: compte.uid,
      email: compte.email,
      emailVerifie: compte.emailVerifie,
      actif: compte.actif,
      demandeLe: compte.demandeLe,
      activeLe: compte.activeLe,
    };
  }

  relire(): Promise<CompteDistantInfos | null> {
    return this.appel(() =>
      this.connecte === null ? null : FauxServiceCompte.projeter(this.courant()),
    );
  }

  sInscrire(email: string, motDePasse: string): Promise<CompteDistantInfos> {
    return this.appel(() => {
      if (this.comptes.has(email)) throw new ErreurCompte('email_deja_utilise');
      if (motDePasse.length < 6) throw new ErreurCompte('mot_de_passe_faible');

      const compte: CompteStocke = {
        uid: `uid-${String(this.comptes.size + 1)}`,
        email,
        emailVerifie: false,
        actif: false,
        demandeLe: null,
        activeLe: null,
        motDePasse,
      };
      this.comptes.set(email, compte);
      this.connecte = email;
      return FauxServiceCompte.projeter(compte);
    });
  }

  seConnecter(email: string, motDePasse: string): Promise<CompteDistantInfos> {
    return this.appel(() => {
      const compte = this.comptes.get(email);
      if (!compte || compte.motDePasse !== motDePasse) {
        throw new ErreurCompte('identifiants_invalides');
      }
      this.connecte = email;
      return FauxServiceCompte.projeter(compte);
    });
  }

  seDeconnecter(): Promise<void> {
    this.connecte = null;
    return Promise.resolve();
  }

  renvoyerVerification(): Promise<void> {
    return this.appel(() => {
      this.courant();
    });
  }

  demanderActivation(): Promise<CompteDistantInfos> {
    return this.appel(() => {
      const compte = this.courant();
      compte.demandeLe = Date.now();
      return FauxServiceCompte.projeter(compte);
    });
  }

  // ——— Administration ———

  /** Comptes autorisés à administrer, désignés comme en production : une liste à part. */
  private readonly administrateurs = new Set<string>();

  estAdministrateur(): Promise<boolean> {
    return this.appel(() => this.administrateurs.has(this.courant().uid));
  }

  listerDemandes(): Promise<DemandeEnAttente[]> {
    return this.appel(() => {
      if (!this.administrateurs.has(this.courant().uid)) throw new ErreurCompte('non_connecte');
      return [...this.comptes.values()]
        .filter((compte) => !compte.actif && compte.demandeLe !== null)
        .map((compte) => ({
          uid: compte.uid,
          email: compte.email,
          demandeLe: compte.demandeLe ?? 0,
        }))
        .sort((a, b) => a.demandeLe - b.demandeLe);
    });
  }

  activerCompte(uid: string): Promise<void> {
    return this.appel(() => {
      if (!this.administrateurs.has(this.courant().uid)) throw new ErreurCompte('non_connecte');
      for (const compte of this.comptes.values()) {
        if (compte.uid === uid) {
          compte.actif = true;
          compte.activeLe = Date.now();
          return;
        }
      }
    });
  }

  // ——— Leviers de test : ce que fait le monde extérieur ———

  /** Désigne un compte comme administrateur, comme on le ferait dans la console. */
  nommerAdministrateur(email: string): void {
    const compte = this.comptes.get(email);
    if (compte) this.administrateurs.add(compte.uid);
  }

  /** L'utilisateur a cliqué sur le lien reçu par email. */
  confirmerEmail(email: string): void {
    const compte = this.comptes.get(email);
    if (compte) compte.emailVerifie = true;
  }

  /** L'administrateur a activé le compte depuis son écran (D49). */
  activer(email: string, quand: number = Date.now()): void {
    const compte = this.comptes.get(email);
    if (compte) {
      compte.actif = true;
      compte.activeLe = quand;
    }
  }

  /** Remet le service à zéro entre deux tests. */
  reinitialiser(): void {
    this.comptes.clear();
    this.administrateurs.clear();
    this.connecte = null;
    this.horsLigne = false;
  }
}
