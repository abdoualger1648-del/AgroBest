import { ErreurCompte, type DemandeEnAttente, type Fournisseur, type ServiceCompte } from './port';
import { traduireErreurFirebase, traduireErreurNative } from './erreurs';
import { jetonNatif, type JetonFournisseur } from './natif';
import { edition } from '@/config';
import {
  COLLECTION_ADMINS,
  COLLECTION_UTILISATEURS,
  CONFIGURATION_FIREBASE,
} from './firebase.config';
import type { CompteDistantInfos } from '@/db/repositories/compte';
import type { Niveau } from '@/domain/access';
import type { CompteAdministre } from '@/domain/comptes';
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
  niveau?: unknown;
  demandeNiveauLe?: unknown;
  niveauLe?: unknown;
  /** Date du dernier retrait d'accès (phase 13). */
  desactiveLe?: unknown;
}

/** Un document écrit avant la phase 9 n'a pas de niveau : il est « standard ». */
function lireNiveau(valeur: unknown): Niveau {
  return valeur === 'multi' ? 'multi' : 'standard';
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
        niveau: 'standard',
        demandeNiveauLe: null,
        niveauLe: null,
      });
      return {
        uid: utilisateur.uid,
        email: utilisateur.email ?? '',
        emailVerifie: utilisateur.emailVerified,
        actif: false,
        demandeLe: null,
        activeLe: null,
        niveau: 'standard',
        demandeNiveauLe: null,
        niveauLe: null,
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
      niveau: lireNiveau(donnees.niveau),
      demandeNiveauLe: enMillisecondes(donnees.demandeNiveauLe),
      niveauLe: enMillisecondes(donnees.niveauLe),
    };
  }

  /**
   * Connexion par fournisseur d'identité (phase 14).
   *
   * Connecter et inscrire sont le MÊME geste ici : Firebase crée le compte
   * d'authentification à la première visite, et `etatComplet` crée le document
   * Firestore s'il manque — ce qu'il faisait déjà pour rattraper une
   * inscription interrompue.
   *
   * `signInWithPopup` ne fonctionne pas dans une WebView embarquée : Google y
   * refuse l'OAuth. C'est pourquoi `fournisseursDisponibles()` ne propose rien
   * en édition APK, où il faudra un chemin natif.
   */
  /**
   * Connexion par Google ou Facebook, par deux chemins selon l'édition.
   *
   * Sur le web, une fenêtre du navigateur. Dans l'APK, le compte du
   * téléphone via le plugin natif : Google refuse l'OAuth en WebView (D113).
   * Les deux chemins finissent au même endroit — une session du SDK
   * JavaScript — donc tout ce qui suit ignore lequel a été pris.
   */
  connecterAvecFournisseur(fournisseur: Fournisseur): Promise<CompteDistantInfos> {
    return this.appel(async (modules) => {
      const resultat =
        edition() === 'apk'
          ? await this.parFournisseurNatif(modules, fournisseur)
          : await this.parFenetreDuNavigateur(modules, fournisseur);
      return this.etatComplet(modules, resultat.user);
    });
  }

  private parFenetreDuNavigateur(
    modules: ModulesFirebase,
    fournisseur: Fournisseur,
  ): Promise<FirebaseAuth.UserCredential> {
    const { auth, instanceAuth } = modules;
    const outil =
      fournisseur === 'google' ? new auth.GoogleAuthProvider() : new auth.FacebookAuthProvider();

    // On ne demande RIEN de plus que l'identité. Pas les contacts, pas les
    // amis, pas le profil étendu : la promesse de confidentialité doit
    // rester courte et vérifiable (D48, révisée en D112).
    outil.addScope('email');

    return auth.signInWithPopup(instanceAuth, outil);
  }

  private async parFournisseurNatif(
    modules: ModulesFirebase,
    fournisseur: Fournisseur,
  ): Promise<FirebaseAuth.UserCredential> {
    const { auth, instanceAuth } = modules;

    let jeton: JetonFournisseur;
    try {
      jeton = await jetonNatif(fournisseur);
    } catch (erreur) {
      // Le plugin n'a pas les codes de Firebase : une annulation n'y est
      // qu'un message. Sans cette traduction, fermer la feuille de connexion
      // afficherait un message rouge pour un geste délibéré.
      if (erreur instanceof ErreurCompte) throw erreur;
      throw new ErreurCompte(traduireErreurNative(erreur));
    }

    const identifiant = this.identifiantDepuisJeton(modules, fournisseur, jeton);
    return auth.signInWithCredential(instanceAuth, identifiant);
  }

  private identifiantDepuisJeton(
    modules: ModulesFirebase,
    fournisseur: Fournisseur,
    jeton: JetonFournisseur,
  ): FirebaseAuth.AuthCredential {
    const { auth } = modules;
    if (fournisseur === 'google') {
      return auth.GoogleAuthProvider.credential(jeton.idToken ?? null, jeton.accessToken ?? null);
    }
    // Facebook ne renvoie qu'un jeton d'accès ; sans lui il n'y a pas
    // d'identifiant à construire.
    if (!jeton.accessToken) throw new ErreurCompte('fournisseur_indisponible');
    return auth.FacebookAuthProvider.credential(jeton.accessToken);
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

  reinitialiserMotDePasse(email: string): Promise<void> {
    return this.appel(async (modules) => {
      try {
        await modules.auth.sendPasswordResetEmail(modules.instanceAuth, email);
      } catch (erreur) {
        // Une adresse sans compte ne doit pas se distinguer d'une adresse
        // inscrite : sinon n'importe qui pourrait vérifier qui est inscrit.
        if (traduireErreurFirebase(erreur) === 'identifiants_invalides') return;
        throw erreur;
      }
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

  demanderNiveau(): Promise<CompteDistantInfos> {
    return this.appel(async (modules) => {
      const utilisateur = await this.utilisateurConnecte(modules);
      const { firestore, base } = modules;
      await firestore.updateDoc(firestore.doc(base, COLLECTION_UTILISATEURS, utilisateur.uid), {
        demandeNiveauLe: firestore.serverTimestamp(),
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
      const demandes: DemandeEnAttente[] = [];
      for (const document of resultat.docs) {
        const donnees = document.data() as DocumentUtilisateur;
        const email = typeof donnees.email === 'string' ? donnees.email : '';
        const activation = enMillisecondes(donnees.demandeLe) ?? 0;
        const niveau = enMillisecondes(donnees.demandeNiveauLe) ?? 0;

        if (activation > 0 && donnees.actif !== true) {
          demandes.push({ uid: document.id, email, demandeLe: activation, nature: 'activation' });
        }
        if (niveau > 0 && lireNiveau(donnees.niveau) !== 'multi') {
          demandes.push({ uid: document.id, email, demandeLe: niveau, nature: 'niveau' });
        }
      }
      return demandes.sort((a, b) => a.demandeLe - b.demandeLe);
    });
  }

  /**
   * Tous les comptes, triés par adresse.
   *
   * `orderBy('email')` et rien d'autre : un tri sur un seul champ utilise
   * l'index automatique (D70). Surtout, il ne faut PAS trier sur `demandeLe`
   * comme `listerDemandes` — Firestore écarte les documents dépourvus du
   * champ trié, et quelqu'un qui n'a jamais rien demandé disparaîtrait de la
   * liste des comptes, c'est-à-dire exactement de l'endroit où il doit être.
   */
  listerComptes(): Promise<CompteAdministre[]> {
    return this.appel(async (modules) => {
      const { firestore, base } = modules;
      const resultat = await firestore.getDocs(
        firestore.query(
          firestore.collection(base, COLLECTION_UTILISATEURS),
          firestore.orderBy('email', 'asc'),
        ),
      );
      return resultat.docs.map((document): CompteAdministre => {
        const donnees = document.data() as DocumentUtilisateur;
        return {
          uid: document.id,
          email: typeof donnees.email === 'string' ? donnees.email : '',
          actif: donnees.actif === true,
          niveau: lireNiveau(donnees.niveau),
          demandeLe: enMillisecondes(donnees.demandeLe),
          activeLe: enMillisecondes(donnees.activeLe),
          desactiveLe: enMillisecondes(donnees.desactiveLe),
          demandeNiveauLe: enMillisecondes(donnees.demandeNiveauLe),
          niveauLe: enMillisecondes(donnees.niveauLe),
        };
      });
    });
  }

  activerCompte(uid: string): Promise<void> {
    return this.appel(async (modules) => {
      const { firestore, base } = modules;
      await firestore.updateDoc(firestore.doc(base, COLLECTION_UTILISATEURS, uid), {
        actif: true,
        activeLe: firestore.serverTimestamp(),
        // Rouvrir un accès efface la trace du retrait : le champ décrit
        // l'état COURANT, pas l'historique.
        desactiveLe: null,
      });
    });
  }

  desactiverCompte(uid: string): Promise<void> {
    return this.appel(async (modules) => {
      const { firestore, base } = modules;
      // `activeLe` n'est pas effacé : il dit qu'un accès avait été ouvert,
      // et quand. C'est la trace que le retrait seul ne donnerait pas.
      await firestore.updateDoc(firestore.doc(base, COLLECTION_UTILISATEURS, uid), {
        actif: false,
        desactiveLe: firestore.serverTimestamp(),
      });
    });
  }

  accorderNiveau(uid: string): Promise<void> {
    return this.appel(async (modules) => {
      const { firestore, base } = modules;
      await firestore.updateDoc(firestore.doc(base, COLLECTION_UTILISATEURS, uid), {
        niveau: 'multi',
        niveauLe: firestore.serverTimestamp(),
      });
    });
  }

  retirerNiveau(uid: string): Promise<void> {
    return this.appel(async (modules) => {
      const { firestore, base } = modules;
      await firestore.updateDoc(firestore.doc(base, COLLECTION_UTILISATEURS, uid), {
        niveau: 'standard',
        niveauLe: null,
      });
    });
  }
}
