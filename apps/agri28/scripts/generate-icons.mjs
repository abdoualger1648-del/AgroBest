/**
 * Génère les icônes PNG de la PWA à partir du même dessin que favicon.svg.
 * Utilise le Chromium déjà présent dans l'environnement : aucune dépendance
 * d'image native, et le rendu est identique à celui du navigateur.
 *
 *   npm run icons
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../public/icons');

const BG = '#2f6b46';
const INK = '#faf8f4';

/** @param {number} size @param {boolean} maskable */
function page(size, maskable) {
  // Les icônes masquables gardent le dessin dans la zone sûre (80 % du cadre).
  const scale = maskable ? 0.62 : 0.78;
  const radius = maskable ? 0 : size * 0.22;
  const stroke = size * 0.07;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;width:${size}px;height:${size}px;background:${BG}}
    .box{width:${size}px;height:${size}px;border-radius:${radius}px;background:${BG};display:flex;align-items:center;justify-content:center}
    svg{width:${size * scale}px;height:${size * scale}px}
  </style></head><body><div class="box">
    <svg viewBox="0 0 64 64" fill="none" stroke="${INK}" stroke-width="${(stroke / size) * 64}"
         stroke-linecap="round" stroke-linejoin="round">
      <path d="M32 52V28" />
      <path d="M32 30C32 20 25 13 14 13c0 10 7 17 18 17Z" />
      <path d="M32 30c0-10 7-17 18-17 0 10-7 17-18 17Z" />
    </svg>
  </div></body></html>`;
}

const targets = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon-180.png', size: 180, maskable: false },
];

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
try {
  for (const { file, size, maskable } of targets) {
    const context = await browser.newContext({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    });
    const tab = await context.newPage();
    await tab.setContent(page(size, maskable));
    const buffer = await tab.screenshot({ type: 'png', omitBackground: false });
    await writeFile(resolve(outDir, file), buffer);
    await context.close();
    console.log(`écrit public/icons/${file} (${size}×${size})`);
  }
} finally {
  await browser.close();
}
