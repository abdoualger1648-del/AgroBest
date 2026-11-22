/**
 * Contrôle de `google-services.json` avant de construire l'APK (phase 16).
 *
 * Pourquoi ce fichier existe : le plugin de connexion native embarque un
 * identifiant factice — `<string name="default_web_client_id">WILL_BE_OVERRIDDEN`
 * — que le greffon Gradle de Google remplace **seulement si**
 * `google-services.json` contient un client OAuth de type **web** (`client_type: 3`).
 *
 * Ce client web n'est créé par Firebase qu'au moment où l'on active Google
 * dans Authentication. Qui télécharge le fichier AVANT cette activation
 * obtient donc un fichier sans client web. Et rien ne le signale : le build
 * Android réussit, l'APK s'installe, et c'est à l'appui sur le bouton que
 * Google reçoit l'identifiant factice et refuse — par une erreur sans code,
 * que l'application ne peut qu'afficher comme « quelque chose n'a pas
 * fonctionné ».
 *
 * C'est arrivé pour de vrai sur l'APK 1.7.0. D'où ce contrôle au build : il
 * transforme une énigme à l'exécution en une phrase au moment où on peut
 * encore agir.
 */

export type DefautGoogleServices =
  'illisible' | 'aucun_client' | 'paquet_absent' | 'aucun_client_web' | 'aucun_client_android';

export interface ControleGoogleServices {
  /** `null` quand tout va bien. */
  defaut: DefautGoogleServices | null;
  /** Message prêt à afficher, vide quand tout va bien. */
  message: string;
  /**
   * Les `client_type` réellement trouvés dans le fichier, triés.
   *
   * Dire ce qu'on a trouvé, et pas seulement ce qui manque, rend le
   * diagnostic autonome : `[1]` seul désigne un client web absent (Google
   * non activé), `[3]` seul une empreinte de signature non déclarée, `[1,3]`
   * un fichier correct — et donc un secret qui n'a pas été remplacé.
   */
  typesTrouves: readonly number[];
}

const MESSAGES: Record<DefautGoogleServices, string> = {
  illisible: "google-services.json n'est pas du JSON valide. Recollez le fichier entier.",
  aucun_client: 'google-services.json ne déclare aucune application (clé « client » vide).',
  paquet_absent:
    'google-services.json ne contient pas l’application dz.agricole360.app. ' +
    'Déclarez-la dans la console Firebase, puis téléchargez le fichier à nouveau.',
  aucun_client_web: '', // composé plus bas : le message énumère tout ce qui manque
  aucun_client_android: '',
};

/** Ce qui manque, dit en une phrase actionnable par manque. */
const MANQUES = {
  web:
    'le client OAuth « web » (client_type 3) — sans lui le plugin garde son identifiant ' +
    'factice et Google refuse. Il n’apparaît que quand « ID client Web » est renseigné dans ' +
    'Authentication → Sign-in method → Google. Un écran de consentement OAuth non configuré ' +
    'dans Google Cloud empêche Firebase de le créer, même avec Google affiché « Activé »',
  android:
    'le client OAuth « Android » (client_type 1) — il n’existe que si l’empreinte SHA-1 de la ' +
    'clé de signature est déclarée sur la fiche de l’application Android. Sans lui, Google ne ' +
    'peut pas vérifier l’application qui appelle, et refuse de la même façon',
};

/** Le paquet Android de l'application. */
export const PAQUET_ANDROID = 'dz.agricole360.app';

/** Vrai pour un client OAuth du type demandé (3 = web, 1 = Android). */
function clientDeType(entree: unknown, type: number): boolean {
  if (typeof entree !== 'object' || entree === null) return false;
  return (entree as { client_type?: unknown }).client_type === type;
}

function listeOuVide(valeur: unknown): readonly unknown[] {
  return Array.isArray(valeur) ? valeur : [];
}

export function controlerGoogleServices(brut: string): ControleGoogleServices {
  let contenu: unknown;
  try {
    contenu = JSON.parse(brut);
  } catch {
    return { defaut: 'illisible', message: MESSAGES.illisible, typesTrouves: [] };
  }

  const clients = listeOuVide((contenu as { client?: unknown })?.client);
  if (clients.length === 0) {
    return { defaut: 'aucun_client', message: MESSAGES.aucun_client, typesTrouves: [] };
  }

  const notre = clients.find((client) => {
    const info = (client as { client_info?: { android_client_info?: { package_name?: unknown } } })
      .client_info;
    return info?.android_client_info?.package_name === PAQUET_ANDROID;
  });
  if (!notre) {
    return { defaut: 'paquet_absent', message: MESSAGES.paquet_absent, typesTrouves: [] };
  }

  // Le client web peut être déclaré à deux endroits selon l'âge du fichier :
  // dans `oauth_client` de l'application, ou dans
  // `other_platform_oauth_client`. Le greffon Gradle lit les deux, donc on
  // accepte les deux.
  const candidats = [
    ...listeOuVide((notre as { oauth_client?: unknown }).oauth_client),
    ...listeOuVide(
      (notre as { services?: { appinvite_service?: { other_platform_oauth_client?: unknown } } })
        .services?.appinvite_service?.other_platform_oauth_client,
    ),
  ];
  const typesTrouves = [
    ...new Set(
      candidats
        .map((entree) => (entree as { client_type?: unknown }).client_type)
        .filter((type): type is number => typeof type === 'number'),
    ),
  ].sort((a, b) => a - b);

  const aWeb = candidats.some((entree) => clientDeType(entree, 3));
  const aAndroid = candidats.some((entree) => clientDeType(entree, 1));

  if (!aWeb || !aAndroid) {
    const manques: string[] = [];
    if (!aWeb) manques.push(MANQUES.web);
    if (!aAndroid) manques.push(MANQUES.android);
    const trouves = typesTrouves.length > 0 ? typesTrouves.join(', ') : 'aucun';
    return {
      // Le web d'abord : c'est le manque qui laisse l'identifiant factice en
      // place, donc celui qui prime quand les deux manquent.
      defaut: aWeb ? 'aucun_client_android' : 'aucun_client_web',
      message:
        `google-services.json est incomplet. Il manque ${manques.join(' ; et ')}. ` +
        `client_type présents dans le fichier : ${trouves}. ` +
        `Corrigez dans la console Firebase, retéléchargez le fichier et remplacez le secret ` +
        `GOOGLE_SERVICES_JSON — voir docs/APK.md.`,
      typesTrouves,
    };
  }

  return { defaut: null, message: '', typesTrouves };
}
