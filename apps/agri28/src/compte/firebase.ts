import { ErreurCompte, type DemandeEnAttente, type ServiceCompte } from './port';
import { traduireErreurFirebase } from './erreurs';
import {
  COLLECTION_ADMINS,
  COLLECTION_UTILISATEURS,
  CONFIGURATION_FIREBASE,
} from './firebase.config';
import type { CompteDistantInfos } from '@/db/repositories/compte';
// Imports de types uniquement : effacés à la compilation, ils ne font donc
// pas entrer le SDK dans le paquet initial. Le code, lui, l'importe à la
// demande dans `charger()`.
import type * as FirebaseAuth from 'firebase/auth';
import type * as FirebaseFirestore from 'firebase/firestore';

/**
 * Service de comptes adossé à Firebase Authentication et Firestore.
 *
 * Le SDK est chargé **à la demande** (`import()`), jamais au démarrage : il
 * pèse plus que toute l'application, et le cache local suffit à connaître
 * l'accès au lancement (D52). Il n'arrive donc que lorsque l'utilisateur crée
 * un compte, se connecte, ou demande une vérification.
 *
 * Ce qui est écrit dans Firestore, et rien d'autre (D48) : adresse email,
 * état d'activation, dates. Jamais le projet, les réponses ni le Dossier.
 */

interface ModulesFirebase {
  auth: typeof FirebaseAuth;
  firestore: typeof FirebaseFirestore;
  instanceAuth: FirebaseAuth.Auth;
  base: FirebaseFirestore.Firestore;
}

/** Forme du document d'un compte dans Firestore. */
interface DocumentUtilisateur {
  email?: unknown;
  actif?: unknown;
  demandeLe?: unknown;
  activeLe?: unknown;
}

/** Reconnaît un `Timestamp` Firestore sans dépendre de sa classe. */
function aToMillis(valeur: unknown): valeur is { toMillis: () => number } {
  if (typeof valeur !== 'object' || valeur === null || !('toMillis' in valeur)) return false;
  return typeof valeur.toMillis === 'function';
}

/** Firestore renvoie des `Timestamp` ; l'application ne manipule que des millisecondes. */
function enMillisecondes(valeur: unknown): number | null {
  if (typeof valeur === 'number') return valeur;
  return aToMillis(valeur) ? valeur.toMillis() : null;
}

export class ServiceFirebase implements ServiceCompte {
  private modules: Promise<ModulesFirebase> | null = null;

  private charger(): Promise<ModulesFirebase> {
    this.modules ??= (async () => {
      const [app, auth, firestore] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ]);
      const application = app.getApps().length
        ? app.getApp()
        : app.initializeApp(CONFIGURATION_FIREBASE);
      return {
        auth,
        firestore,
        instanceAuth: auth.getAuth(application),
        base: firestore.getFirestore(application),
      };
    })();
    return this.modules;
  }

  /** Toute erreur du SDK ressort en `ErreurCompte`, jamais brute. */
  private async appel<T>(travail: (modules: ModulesFirebase) => Promise<T>): Promise<T> {
    try {
      return await travail(await this.charger());
    } catch (erreur) {
      if (erreur instanceof ErreurCompte) throw erreur;
      throw new ErreurCompte(traduireErreurFirebase(erreur));
    }
  }

  /**
   * Attend que Firebase ait restauré la session. `currentUser` vaut `null`
   * juste après le chargement, même quand quelqu'un est connecté : s'y fier
   * déconnecterait l'utilisateur à chaque ouverture.
   */
  private async utilisateur(modules: ModulesFirebase): Promise<FirebaseAuth.User | null> {
    if (modules.instanceAuth.currentUser) return modules.instanceAuth.currentUser;
    return new Promise((resoudre) => {
      const arreter = modules.auth.onAuthStateChanged(modules.instanceAuth, (utilisateur) => {
        arreter();
        resoudre(utilisateur);
      });
    });
  }

  private async utilisateurConnecte(modules: ModulesFirebase): Promise<FirebaseAuth.User> {
    const utilisateur = await this.utilisateur(modules);
    if (!utilisateur) throw new ErreurCompte('non_connecte');
    return utilisateur;
  }

  /**
   * Assemble l'état du compte : l'adresse et sa confirmation viennent de
   * l'authentification, l'activation vient de Firestore. Un document absent
   * n'est pas une erreur — il est créé à la volée, pour rattraper une
   * inscription dont l'écriture n'aurait pas abouti.
   */
  private async etatComplet(
    modules: ModulesFirebase,
    utilisateur: FirebaseAuth.User,
  ): Promise<CompteDistantInfos> {
    const { firestore, base } = modules;
    const reference = firestore.doc(base, COLLECTION_UTILISATEURS, utilisateur.uid);
    const instantane = await firestore.getDoc(reference);

    if (!instantane.exists()) {
      await firestore.setDoc(reference, {
        email: utilisateur.email ?? '',
        creeLe: firestore.serverTimestamp(),
        actif: false,
        demandeLe: null,
        activeLe: null,
      });
      return {
        uid: utilisateur.uid,
        email: utilisateur.email ?? '',
        emailVerifie: utilisateur.emailVerified,
        actif: false,
        demandeLe: null,
        activeLe: null,
      };
    }

    const donnees = instantane.data() as DocumentUtilisateur;
    return {
      uid: utilisateur.uid,
      email: utilisateur.email ?? (typeof donnees.email === 'string' ? donnees.email : ''),
      emailVerifie: utilisateur.emailVerified,
      actif: donnees.actif === true,
      demandeLe: enMillisecondes(donnees.demandeLe),
      activeLe: enMillisecondes(donnees.activeLe),
    };
  }

  relire(): Promise<CompteDistantInfos | null> {
    return this.appel(async (modules) => {
      const utilisateur = await this.utilisateur(modules);
      if (!utilisateur) return null;
      // Sans ce rechargement, `emailVerified` reste à sa valeur du dernier
      // jeton : quelqu'un qui vient de cliquer sur le lien resterait bloqué.
      await utilisateur.reload();
      return this.etatComplet(modules, utilisateur);
    });
  }

  sInscrire(email: string, motDePasse: string): Promise<CompteDistantInfos> {
    return this.appel(async (modules) => {
      const { user } = await modules.auth.createUserWithEmailAndPassword(
        modules.instanceAuth,
        email,
        motDePasse,
      );
      await modules.auth.sendEmailVerification(user);
      return this.etatComplet(modules, user);
    });
  }

  seConnecter(email: string, motDePasse: string): Promise<CompteDistantInfos> {
    return this.appel(async (modules) => {
      const { user } = await modules.auth.signInWithEmailAndPassword(
        modules.instanceAuth,
        email,
        motDePasse,
      );
      return this.etatComplet(modules, user);
    });
  }

  seDeconnecter(): Promise<void> {
    return this.appel(async (modules) => {
      await modules.auth.signOut(modules.instanceAuth);
    });
  }

  renvoyerVerification(): Promise<void> {
    return this.appel(async (modules) => {
      await modules.auth.sendEmailVerification(await this.utilisateurConnecte(modules));
    });
  }

  demanderActivation(): Promise<CompteDistantInfos> {
    return this.appel(async (modules) => {
      const utilisateur = await this.utilisateurConnecte(modules);
      const { firestore, base } = modules;
      await firestore.updateDoc(firestore.doc(base, COLLECTION_UTILISATEURS, utilisateur.uid), {
        demandeLe: firestore.serverTimestamp(),
      });
      return this.etatComplet(modules, utilisateur);
    });
  }

  // ——— Administration (D49) ———

  /**
   * L'administrateur est désigné par l'existence de `admins/{uid}`, document
   * que seule la console Firebase peut créer. Aucune adresse personnelle n'a
   * donc à figurer dans le code ni dans les règles.
   */
  estAdministrateur(): Promise<boolean> {
    return this.appel(async (modules) => {
      const utilisateur = await this.utilisateur(modules);
      if (!utilisateur) return false;
      const { firestore, base } = modules;
      const instantane = await firestore.getDoc(
        firestore.doc(base, COLLECTION_ADMINS, utilisateur.uid),
      );
      return instantane.exists();
    });
  }

  listerDemandes(): Promise<DemandeEnAttente[]> {
    return this.appel(async (modules) => {
      const { firestore, base } = modules;
      // Un tri simple, et le tri de l'état côté application.
      //
      // Combiner `where('actif', '==', false)` et `orderBy('demandeLe')`
      // obligerait Firestore à un index COMPOSITE, qu'il faudrait créer à la
      // main dans la console : sans lui la requête échoue, et l'écran
      // n'afficherait qu'un « quelque chose n'a pas fonctionné » sans dire
      // quoi. Un tri sur un seul champ utilise l'index automatique, donc rien
      // à créer. Le filtrage se fait ici, sur un nombre de comptes qui reste
      // à l'échelle d'une distribution de la main à la main.
      const resultat = await firestore.getDocs(
        firestore.query(
          firestore.collection(base, COLLECTION_UTILISATEURS),
          firestore.orderBy('demandeLe', 'asc'),
        ),
      );
      return resultat.docs
        .map((document) => {
          const donnees = document.data() as DocumentUtilisateur;
          return {
            uid: document.id,
            email: typeof donnees.email === 'string' ? donnees.email : '',
            demandeLe: enMillisecondes(donnees.demandeLe) ?? 0,
            dejaActif: donnees.actif === true,
          };
        })
        .filter((demande) => demande.demandeLe > 0 && !demande.dejaActif)
        .map(({ dejaActif: _ignore, ...demande }) => demande);
    });
  }

  activerCompte(uid: string): Promise<void> {
    return this.appel(async (modules) => {
      const { firestore, base } = modules;
      await firestore.updateDoc(firestore.doc(base, COLLECTION_UTILISATEURS, uid), {
        actif: true,
        activeLe: firestore.serverTimestamp(),
      });
    });
  }
}
