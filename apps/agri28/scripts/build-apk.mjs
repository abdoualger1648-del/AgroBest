/**
 * Prépare l'application web pour l'APK, puis la copie dans le projet Android.
 *
 *   npm run apk:web
 *
 * Deux étapes seulement, et volontairement séparées de l'assemblage Gradle :
 * celui-ci demande le SDK Android, que tout le monde n'a pas, alors que cette
 * étape-ci tourne partout. L'assemblage est fait par GitHub Actions.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const racine = resolve(import.meta.dirname, '..');

function lancer(commande, arguments_) {
  const resultat = spawnSync(commande, arguments_, {
    cwd: racine,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, VITE_EDITION: 'apk' },
  });
  if (resultat.status !== 0) {
    console.error(`\nÉchec : ${commande} ${arguments_.join(' ')}`);
    process.exit(resultat.status ?? 1);
  }
}

lancer('npx', ['vite', 'build']);
lancer('npx', ['cap', 'sync', 'android']);

console.log('\nApplication web prête dans android/app/src/main/assets/public.');
console.log("Assemblage de l'APK : workflow « APK » dans GitHub Actions.");
