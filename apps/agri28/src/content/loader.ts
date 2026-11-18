import { lessonSchema, type Lesson } from './schema';
import type { Lang } from '@/lib/lang';

/**
 * Chargement d'une leçon à la demande : un fichier par jour et par langue,
 * dans un morceau de code séparé. Sur une connexion faible, on ne télécharge
 * que le jour qu'on ouvre.
 */
/**
 * En édition vitrine, les leçons 4 à 28 ne sont pas seulement masquées : elles
 * ne sont pas construites. Les masquer dans l'interface laisserait leurs
 * fichiers téléchargeables par quiconque regarde le trafic réseau.
 *
 * `import.meta.env.VITE_EDITION` est remplacé par sa valeur au build : la
 * branche non retenue, et les imports qu'elle contient, disparaissent.
 * `scripts/check-bundle.mjs` vérifie le résultat plutôt que de le supposer.
 */
const modules: Record<string, () => Promise<unknown>> =
  import.meta.env.VITE_EDITION === 'vitrine'
    ? import.meta.glob<unknown>('../../content/days/day-0[1-3].*.json')
    : import.meta.glob<unknown>('../../content/days/day-*.json');

function keyFor(day: number, lang: Lang): string {
  return `../../content/days/day-${String(day).padStart(2, '0')}.${lang}.json`;
}

/** Jours réellement présents dans le contenu, toutes langues confondues. */
export function availableDays(lang?: Lang): number[] {
  const days = new Set<number>();
  for (const path of Object.keys(modules)) {
    const match = /day-(\d{2})\.(fr|ar)\.json$/.exec(path);
    if (!match) continue;
    if (lang && match[2] !== lang) continue;
    days.add(Number(match[1]));
  }
  return [...days].sort((a, b) => a - b);
}

export function hasLesson(day: number, lang: Lang): boolean {
  return keyFor(day, lang) in modules;
}

export class LessonNotFoundError extends Error {
  constructor(
    readonly day: number,
    readonly lang: Lang,
  ) {
    super(`Leçon introuvable : jour ${day} en « ${lang} ».`);
    this.name = 'LessonNotFoundError';
  }
}

const cache = new Map<string, Lesson>();

/**
 * Charge et valide une leçon. La validation runtime protège d'un fichier
 * corrompu ou d'un contenu mis à jour par le service worker à mi-chemin.
 */
export async function loadLesson(day: number, lang: Lang): Promise<Lesson> {
  const key = keyFor(day, lang);
  const cached = cache.get(key);
  if (cached) return cached;

  const loader = modules[key];
  if (!loader) throw new LessonNotFoundError(day, lang);

  const module = (await loader()) as { default: unknown };
  const lesson = lessonSchema.parse(module.default);
  cache.set(key, lesson);
  return lesson;
}

/** Vide le cache mémoire (tests, et mise à jour du contenu en phase 7). */
export function clearLessonCache(): void {
  cache.clear();
}
