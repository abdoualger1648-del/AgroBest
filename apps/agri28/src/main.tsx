import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import './styles/index.css';
import { initI18n } from './i18n';
import { getProfile } from './db/repositories/profile';
import { applyLang, applyTheme } from './lib/appearance';
import { usePreferences } from './store/preferences';

/**
 * Démarrage : le profil (IndexedDB) décide de la langue, de la direction et du
 * thème. index.html a déjà posé ces attributs depuis un cache localStorage,
 * donc aucun clignotement même si l'ouverture de la base prend quelques
 * millisecondes.
 */
const profile = await getProfile();
applyLang(profile.lang);
applyTheme(profile.theme);
usePreferences.getState().init(profile);
await initI18n(profile.lang);

const container = document.getElementById('root');
if (!container) throw new Error('Élément #root absent de index.html');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
