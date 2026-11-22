/**
 * Contrôle `google-services.json` avant l'assemblage de l'APK.
 *
 *   node --experimental-strip-types scripts/verifier-google-services.ts <chemin>
 *
 * La décision vit dans `src/compte/googleServices.ts`, pure et testée : ce
 * fichier ne fait que lire le fichier et rendre un code de sortie.
 */
import { readFileSync } from 'node:fs';
import { controlerGoogleServices } from '../src/compte/googleServices.ts';

const chemin = process.argv[2];
if (!chemin) {
  console.error('Usage : verifier-google-services.ts <chemin vers google-services.json>');
  process.exit(2);
}

let brut: string;
try {
  brut = readFileSync(chemin, 'utf8');
} catch {
  console.error(`Fichier introuvable : ${chemin}`);
  process.exit(2);
}

const { defaut, message } = controlerGoogleServices(brut);
if (defaut) {
  console.error(`::error::${message}`);
  process.exit(1);
}
console.log('google-services.json : application déclarée et client OAuth web présent.');
