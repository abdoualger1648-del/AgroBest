/**
 * Vérifie l'application telle qu'elle sera DANS l'APK.
 *
 * L'assemblage Gradle demande le SDK Android, mais l'essentiel de ce qui peut
 * casser dans un APK ne vient pas de Gradle : c'est le chemin de base, un
 * service worker resté actif, ou le verrou de compte qui ne s'applique pas.
 * On sert donc les fichiers exactement comme Capacitor le fait — à la racine
 * d'une origine locale — et on regarde.
 *
 *   npm run apk:verifier     (après `npm run apk:web`)
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright';

const racine = resolve(import.meta.dirname, '../android/app/src/main/assets/public');

if (!existsSync(join(racine, 'index.html'))) {
  console.error('Rien à vérifier : lancez `npm run apk:web` d’abord.');
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

const serveur = createServer((requete, reponse) => {
  const chemin = decodeURIComponent((requete.url ?? '/').split('?')[0]);
  const fichier = join(racine, chemin === '/' ? 'index.html' : chemin.replace(/^\//, ''));
  readFile(fichier)
    .then((contenu) => {
      reponse.writeHead(200, {
        'content-type': TYPES[extname(fichier)] ?? 'application/octet-stream',
      });
      reponse.end(contenu);
    })
    .catch(() => {
      // Routage côté client : toute adresse inconnue rend la page d'entrée,
      // exactement comme la vue web de Capacitor.
      readFile(join(racine, 'index.html')).then((contenu) => {
        reponse.writeHead(200, { 'content-type': TYPES['.html'] });
        reponse.end(contenu);
      });
    });
});

await new Promise((pret) => serveur.listen(4199, '127.0.0.1', pret));
const base = 'http://127.0.0.1:4199';

const navigateur = await chromium.launch();
const echecs = [];
let contexte;

try {
  contexte = await navigateur.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
  });
  const onglet = await contexte.newPage();

  const problemes = [];
  onglet.on('console', (message) => {
    if (message.type() === 'error') problemes.push(message.text());
  });
  onglet.on('pageerror', (erreur) => problemes.push(String(erreur)));

  await onglet.goto(base, { waitUntil: 'networkidle' });

  // 1. L'application démarre, et le verrou de compte s'applique (édition APK).
  const titre = await onglet.getByRole('heading', { level: 1 }).first().textContent();
  if (titre?.trim() !== 'Votre compte') {
    echecs.push(
      `l'écran d'entrée devrait être « Votre compte », c'est « ${titre?.trim() ?? '—'} »`,
    );
  }

  // 2. Aucun service worker : les fichiers sont déjà locaux.
  const serviceWorkers = await onglet.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 0;
    return (await navigator.serviceWorker.getRegistrations()).length;
  });
  if (serviceWorkers !== 0) echecs.push(`${serviceWorkers} service worker(s) enregistré(s)`);

  // 3. Aucune ressource demandée hors de l'origine locale au démarrage :
  //    un APK doit s'ouvrir sans réseau.
  const externes = await onglet.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .map((entree) => entree.name)
      .filter((url) => !url.startsWith(location.origin)),
  );
  if (externes.length > 0) echecs.push(`ressources externes au démarrage : ${externes.join(', ')}`);

  // 4. Un lien profond fonctionne sans fichier 404.
  await onglet.goto(`${base}/compte/activation`, { waitUntil: 'networkidle' });
  if ((await onglet.locator('body').textContent())?.includes('Cannot GET')) {
    echecs.push('le routage côté client ne répond pas sur un lien profond');
  }

  if (problemes.length > 0) echecs.push(`erreurs de console : ${problemes.join(' | ')}`);

  await onglet.goto(base, { waitUntil: 'networkidle' });
  await onglet.screenshot({
    path: resolve(import.meta.dirname, '../../../docs/images/apk-accueil.png'),
  });
} finally {
  await contexte?.close();
  await navigateur.close();
  serveur.close();
}

if (echecs.length > 0) {
  console.error("L'application ne se comporte pas comme attendue dans un APK :");
  for (const echec of echecs) console.error(`  - ${echec}`);
  process.exit(1);
}
console.log('APK : écran de compte, aucun service worker, aucun appel réseau au démarrage,');
console.log('liens profonds fonctionnels. Capture : docs/images/apk-accueil.png');
