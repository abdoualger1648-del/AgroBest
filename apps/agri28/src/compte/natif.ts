import { ErreurCompte, type Fournisseur } from './port';
// Type uniquement : effacé à la compilation, il ne fait entrer aucun code.
import type { AuthCredential } from '@capacitor-firebase/authentication';

/**
 * Connexion par fournisseur **côté natif** (phase 16).
 *
 * Seul endroit qui parle au plugin Capacitor, et il n'est atteint que dans
 * l'édition APK. Pourquoi un chemin séparé : Google refuse l'OAuth depuis une
 * WebView embarquée (D113), donc la fenêtre du navigateur qui fonctionne sur
 * le web échoue dans l'APK sur un « disallowed_useragent ». Le plugin passe
 * par le compte Google du téléphone, ce que Google autorise.
 *
 * Choix central : `skipNativeAuth`. Le plugin sait ouvrir la session lui-même,
 * côté natif — mais l'application entière vit dans la vue web et s'appuie sur
 * la session du SDK JavaScript : les règles Firestore, `onAuthStateChanged`,
 * l'écran d'administration, tout. Deux sessions parallèles, l'une native et
 * l'autre web, donneraient une application connectée d'un côté et anonyme de
 * l'autre. On ne demande donc au natif QUE le jeton, et c'est notre SDK qui
 * ouvre l'unique session, exactement comme sur le web.
 */
export interface JetonFournisseur {
  /** Jeton d'identité OIDC — ce que Google renvoie. */
  idToken?: string;
  /** Jeton d'accès OAuth — ce que Facebook renvoie. */
  accessToken?: string;
}

/**
 * Le pont est déclaré ici, et non importé du paquet du plugin.
 *
 * Importer `@capacitor-firebase/authentication` ferait entrer son
 * implémentation **web** dans le paquet — or elle importe `firebase/auth` en
 * dépendance de pair *optionnelle*, que Vite remplace alors par un bouchon
 * vide : le build échoue sur 44 exports manquants. Et cette implémentation ne
 * nous sert à rien, puisque le web garde la fenêtre du navigateur.
 *
 * `registerPlugin` sans implémentation web déclare donc exactement ce dont
 * l'APK a besoin : l'appel natif. Le paquet npm reste installé — c'est lui
 * que `cap sync` lit pour embarquer le code Android — mais son JavaScript
 * n'entre dans aucun paquet. Les types, eux, viennent du paquet et sont
 * effacés à la compilation.
 */
type PontFournisseurs = {
  signInWithGoogle(options: OptionsConnexion): Promise<ResultatConnexion>;
  signInWithFacebook(options: OptionsConnexion): Promise<ResultatConnexion>;
};

type OptionsConnexion = { skipNativeAuth: boolean; scopes: string[] };
type ResultatConnexion = { credential: AuthCredential | null };

export async function jetonNatif(fournisseur: Fournisseur): Promise<JetonFournisseur> {
  // Import dynamique : `@capacitor/core` n'entre pas dans le paquet initial,
  // et il n'est chargé qu'au premier appui sur un bouton de fournisseur.
  const { registerPlugin } = await import('@capacitor/core');
  const pont = registerPlugin<PontFournisseurs>('FirebaseAuthentication');

  // On ne demande RIEN de plus que l'identité, comme sur le web : pas les
  // contacts, pas les amis, pas le profil étendu (D114).
  const options: OptionsConnexion = { skipNativeAuth: true, scopes: ['email'] };

  const resultat =
    fournisseur === 'google'
      ? await pont.signInWithGoogle(options)
      : await pont.signInWithFacebook(options);

  const jeton = resultat.credential;
  // Sans jeton il n'y a rien à faire de la suite : mieux vaut une erreur
  // nommée qu'un `signInWithCredential(null)` illisible.
  if (!jeton || (!jeton.idToken && !jeton.accessToken)) {
    throw new ErreurCompte('fournisseur_indisponible');
  }
  return { idToken: jeton.idToken, accessToken: jeton.accessToken };
}
