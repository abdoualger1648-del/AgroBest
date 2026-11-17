import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import './styles/index.css';
import { initI18n } from './i18n';
import { getProfile, updateProfile } from './db/repositories/profile';
import { isLang } from './lib/lang';
import { applyLang, applyTheme, readCachedLang, readCachedTheme } from './lib/appearance';
import { usePreferences } from './store/preferences';
import { useCourse } from './store/course';

/**
 * Démarrage : le profil (IndexedDB) décide de la langue, de la direction et du
 * thème. index.html a déjà posé ces attributs depuis un cache localStorage,
 * donc aucun clignotement même si l'ouverture de la base prend quelques
 * millisecondes.
 */
let profile = await getProfile();

// Le cache de peinture peut être plus récent que la base : il est écrit au clic,
// l'écriture IndexedDB arrive juste après. Si l'application a été fermée entre
// les deux, on récupère le choix de l'utilisateur plutôt que de le perdre.
const cachedTheme = readCachedTheme();
const cachedLangValue = readCachedLang();
const cachedLang = isLang(cachedLangValue) ? cachedLangValue : null;

if ((cachedTheme && cachedTheme !== profile.theme) || (cachedLang && cachedLang !== profile.lang)) {
  profile = await updateProfile({
    ...(cachedTheme ? { theme: cachedTheme } : {}),
    ...(cachedLang ? { lang: cachedLang } : {}),
  });
}

applyLang(profile.lang);
applyTheme(profile.theme);
usePreferences.getState().init(profile);
await initI18n(profile.lang);
await useCourse.getState().load();

const container = document.getElementById('root');
if (!container) throw new Error('Élément #root absent de index.html');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
