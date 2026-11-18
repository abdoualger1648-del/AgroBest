/**
 * Captures d'écran du README, prises sur le build de production.
 *
 * Prérequis : `npm run build` puis `npm run preview` dans un autre terminal.
 * Usage : `npm run screenshots`
 *
 * Les images servent à la documentation : elles sont prises en densité 2
 * (rendu d'un vrai téléphone) et sur un projet de démonstration identique à
 * celui des tests, pour qu'une capture ne dépende jamais d'un état local.
 */
import { chromium, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.PREVIEW_URL ?? 'http://127.0.0.1:4173/WinBest/';
const OUT = path.resolve(import.meta.dirname, '..', '..', '..', 'docs', 'images');

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

/** Crée le projet de démonstration et laisse l'application sur le jour 1. */
async function seed(page) {
  await page.goto(`${BASE}bienvenue`);
  await page.getByLabel(/Nom du projet/).fill('Élevage ovin Aïn Defla');
  await page.getByLabel(/^Taille/).fill('60');
  await page.getByLabel(/^Wilaya/).selectOption('44');
  await page.getByLabel(/^Objectif/).fill('Vendre 40 agneaux en 12 mois');
  await page.getByRole('button', { name: 'Créer mon projet' }).click();
  await page.waitForURL(/jour\/1$/);
}

async function shot(name, { lang = 'fr', route = '', theme = 'light' } = {}) {
  const context = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await context.newPage();
  await seed(page);

  if (theme === 'dark') {
    await page.goto(`${BASE}parametres`);
    await page.getByRole('radio', { name: 'Sombre' }).check();
  }
  if (lang === 'ar') {
    await page.goto(`${BASE}parametres`);
    await page.getByRole('radio', { name: 'العربية' }).check();
  }

  await page.goto(BASE + route);
  // Laisse le temps au contenu du jour (chargé en `import()`) de s'afficher.
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(`docs/images/${name}.png`);
  await context.close();
}

await shot('accueil-fr');
await shot('jour-fr', { route: 'jour/1' });
await shot('accueil-ar', { lang: 'ar' });
await shot('jour-ar', { lang: 'ar', route: 'jour/1' });
await shot('accueil-sombre', { theme: 'dark' });

await browser.close();
