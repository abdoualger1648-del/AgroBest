/**
 * Génère les icônes et l'écran de démarrage Android à partir du même dessin
 * que `favicon.svg` et que les icônes PWA.
 *
 * Comme `generate-icons.mjs`, le rendu passe par le Chromium déjà présent :
 * aucune dépendance d'image native, et le résultat est identique à celui du
 * navigateur (décision D15).
 *
 *   npm run icons:android     (après `npx cap add android`)
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const res = resolve(here, '../android/app/src/main/res');

const BG = '#2f6b46';
const INK = '#faf8f4';

/** Le dessin, identique partout : une jeune pousse. */
function pousse(taille, epaisseur) {
  return `<svg viewBox="0 0 64 64" fill="none" stroke="${INK}"
       stroke-width="${(epaisseur / taille) * 64}" stroke-linecap="round" stroke-linejoin="round"
       style="width:${taille}px;height:${taille}px">
    <path d="M32 52V28" />
    <path d="M32 30C32 20 25 13 14 13c0 10 7 17 18 17Z" />
    <path d="M32 30c0-10 7-17 18-17 0 10-7 17-18 17Z" />
  </svg>`;
}

/**
 * @param {number} taille
 * @param {'carre'|'rond'|'premier-plan'|'demarrage'} forme
 */
function page(taille, forme) {
  // Une icône adaptative fait 108 dp dont seuls les 66 dp centraux sont
  // toujours visibles : le dessin y reste, le reste peut être rogné.
  const proportions = {
    carre: { dessin: 0.62, rayon: taille * 0.22, fond: BG },
    rond: { dessin: 0.58, rayon: taille / 2, fond: BG },
    'premier-plan': { dessin: 0.42, rayon: 0, fond: 'transparent' },
    demarrage: { dessin: 0.28, rayon: 0, fond: BG },
  }[forme];

  const epaisseur = taille * proportions.dessin * 0.09;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;width:${taille}px;height:${taille}px;background:transparent}
    .cadre{width:${taille}px;height:${taille}px;border-radius:${proportions.rayon}px;
      background:${proportions.fond};display:flex;align-items:center;justify-content:center}
  </style></head><body><div class="cadre">
    ${pousse(taille * proportions.dessin, epaisseur)}
  </div></body></html>`;
}

/** Densités Android : mdpi ×1, hdpi ×1,5, xhdpi ×2, xxhdpi ×3, xxxhdpi ×4. */
const DENSITES = [
  ['mdpi', 1],
  ['hdpi', 1.5],
  ['xhdpi', 2],
  ['xxhdpi', 3],
  ['xxxhdpi', 4],
];

const navigateur = await chromium.launch();

async function rendre(chemin, taille, forme) {
  const contexte = await navigateur.newContext({
    viewport: { width: Math.round(taille), height: Math.round(taille) },
    deviceScaleFactor: 1,
  });
  const onglet = await contexte.newPage();
  await onglet.setContent(page(Math.round(taille), forme));
  const image = await onglet.screenshot({
    type: 'png',
    omitBackground: forme === 'premier-plan',
  });
  await mkdir(dirname(chemin), { recursive: true });
  await writeFile(chemin, image);
  await contexte.close();
}

try {
  for (const [densite, facteur] of DENSITES) {
    const dossier = resolve(res, `mipmap-${densite}`);
    await rendre(resolve(dossier, 'ic_launcher.png'), 48 * facteur, 'carre');
    await rendre(resolve(dossier, 'ic_launcher_round.png'), 48 * facteur, 'rond');
    await rendre(resolve(dossier, 'ic_launcher_foreground.png'), 108 * facteur, 'premier-plan');
    console.log(`mipmap-${densite} : 3 icônes`);
  }

  // Écran de démarrage : un seul fichier, étiré par Android.
  await rendre(resolve(res, 'drawable/splash.png'), 960, 'demarrage');
  for (const [densite, facteur] of DENSITES) {
    await rendre(resolve(res, `drawable-port-${densite}/splash.png`), 480 * facteur, 'demarrage');
    await rendre(resolve(res, `drawable-land-${densite}/splash.png`), 480 * facteur, 'demarrage');
  }
  console.log('écran de démarrage : 11 fichiers');

  // Le fond de l'icône adaptative doit être la couleur de la marque, pas le
  // blanc par défaut du gabarit Capacitor.
  await writeFile(
    resolve(res, 'values/ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`,
  );
  console.log(`fond de l'icône adaptative : ${BG}`);
} finally {
  await navigateur.close();
}
