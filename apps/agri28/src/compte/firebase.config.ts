/**
 * Configuration Firebase de l'application web (utilisée aussi dans l'APK, qui
 * embarque la même application dans une vue web).
 *
 * Ces valeurs ne sont **pas** des secrets : Google les publie dans toutes les
 * applications web, et elles ne font qu'identifier le projet. La protection
 * repose entièrement sur les règles de sécurité Firestore
 * (`firebase/firestore.rules`), qui interdisent notamment à un utilisateur de
 * modifier son propre champ `actif`.
 *
 * Chaque valeur peut être remplacée au build, pour viser un autre projet
 * Firebase sans toucher au code.
 */
export interface ConfigurationFirebase {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export const CONFIGURATION_FIREBASE: ConfigurationFirebase = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyDpsufsP8hmZaQsZCAkx9AZ8t6ocHE01yE',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'agricole360-4a470.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'agricole360-4a470',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'agricole360-4a470.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID ?? '533830695494',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:533830695494:web:7cd7cc03dc1b3bc3dc6847',
};

/** Collection des comptes, et collection qui désigne les administrateurs. */
export const COLLECTION_UTILISATEURS = 'utilisateurs';
export const COLLECTION_ADMINS = 'admins';
