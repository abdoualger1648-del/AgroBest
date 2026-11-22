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
  'illisible' | 'aucun_client' | 'paquet_absent' | 'aucun_client_web';

export interface ControleGoogleServices {
  /** `null` quand tout va bien. */
  defaut: DefautGoogleServices | null;
  /** Message prêt à afficher, vide quand tout va bien. */
  message: string;
}

const MESSAGES: Record<DefautGoogleServices, string> = {
  illisible: "google-services.json n'est pas du JSON valide. Recollez le fichier entier.",
  aucun_client: 'google-services.json ne déclare aucune application (clé « client » vide).',
  paquet_absent:
    'google-services.json ne contient pas l’application dz.agricole360.app. ' +
    'Déclarez-la dans la console Firebase, puis téléchargez le fichier à nouveau.',
  aucun_client_web:
    'google-services.json ne contient aucun client OAuth « web » (client_type 3). ' +
    'Cela arrive quand le fichier a été téléchargé AVANT d’avoir activé Google dans ' +
    'Authentication. Activez Google, puis téléchargez le fichier à nouveau et ' +
    'remplacez le secret : sans ce client, la connexion Google échoue sur le téléphone ' +
    'alors que le build réussit.',
};

/** Le paquet Android de l'application. */
export const PAQUET_ANDROID = 'dz.agricole360.app';

/** Vrai pour un client OAuth de type web, où qu'il soit déclaré. */
function estClientWeb(entree: unknown): boolean {
  if (typeof entree !== 'object' || entree === null) return false;
  return (entree as { client_type?: unknown }).client_type === 3;
}

function listeOuVide(valeur: unknown): readonly unknown[] {
  return Array.isArray(valeur) ? valeur : [];
}

export function controlerGoogleServices(brut: string): ControleGoogleServices {
  let contenu: unknown;
  try {
    contenu = JSON.parse(brut);
  } catch {
    return { defaut: 'illisible', message: MESSAGES.illisible };
  }

  const clients = listeOuVide((contenu as { client?: unknown })?.client);
  if (clients.length === 0) return { defaut: 'aucun_client', message: MESSAGES.aucun_client };

  const notre = clients.find((client) => {
    const info = (client as { client_info?: { android_client_info?: { package_name?: unknown } } })
      .client_info;
    return info?.android_client_info?.package_name === PAQUET_ANDROID;
  });
  if (!notre) return { defaut: 'paquet_absent', message: MESSAGES.paquet_absent };

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
  if (!candidats.some(estClientWeb)) {
    return { defaut: 'aucun_client_web', message: MESSAGES.aucun_client_web };
  }

  return { defaut: null, message: '' };
}
