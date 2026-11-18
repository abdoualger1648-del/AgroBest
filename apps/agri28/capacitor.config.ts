import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Empaquetage Android (phase 8c).
 *
 * L'application web est **embarquée** dans l'APK (`webDir`), elle n'est pas
 * chargée depuis un site : elle fonctionne donc dès le premier lancement,
 * sans réseau et sans hébergement. C'est ce qui rend l'APK partageable de la
 * main à la main (D46).
 *
 * Le build web doit être fait avec `VITE_EDITION=apk` : chemin de base à la
 * racine, et pas de service worker — les fichiers sont déjà locaux.
 */
const config: CapacitorConfig = {
  appId: 'dz.agricole360.app',
  appName: 'Agricole DZ 360',
  webDir: 'dist',
  android: {
    // Les liens externes (ChatGPT, Claude…) s'ouvrent dans le navigateur du
    // téléphone, pas dans la vue web de l'application.
    allowMixedContent: false,
  },
  server: {
    // Origine locale sécurisée : IndexedDB et l'authentification Firebase
    // exigent un contexte sûr, ce que `https://localhost` fournit.
    androidScheme: 'https',
    hostname: 'localhost',
  },
};

export default config;
