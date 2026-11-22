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
  plugins: {
    FirebaseAuthentication: {
      // Le plugin ne charge que les fournisseurs nommés ici : sa valeur par
      // défaut est une liste vide, et `signInWithGoogle` échouerait sans
      // cette ligne. Facebook en est absent tant que son SDK natif n'est pas
      // configuré (voir android/variables.gradle).
      providers: ['google.com'],
      // Capital : le plugin NE doit PAS ouvrir la session lui-même. Toute
      // l'application vit dans la vue web et s'appuie sur la session du SDK
      // JavaScript — règles Firestore, `onAuthStateChanged`, écran
      // d'administration. Une session native en plus donnerait une
      // application connectée d'un côté et anonyme de l'autre. Le natif ne
      // fournit que le jeton ; notre SDK ouvre l'unique session.
      skipNativeAuth: true,
    },
  },
  server: {
    // Origine locale sécurisée : IndexedDB et l'authentification Firebase
    // exigent un contexte sûr, ce que `https://localhost` fournit.
    androidScheme: 'https',
    hostname: 'localhost',
  },
};

export default config;
