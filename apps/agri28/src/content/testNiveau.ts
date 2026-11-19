import testNiveauFile from '../../content/test-niveau.json';
import { testNiveauFileSchema, type QuestionNiveau } from './schema';
import type { Lang } from '@/lib/lang';

/**
 * Questions du test de niveau (phase 12).
 *
 * Module **à part** de `catalog.ts`, et c'est voulu : `catalog.ts` est importé
 * par presque tous les écrans, donc il atterrit dans le paquet initial. Le
 * test, lui, ne sert qu'à un écran chargé à la demande — ses quelques
 * kilo-octets voyagent avec cet écran et nulle part ailleurs.
 *
 * Validé une fois au chargement du module : un fichier corrompu échoue
 * bruyamment plutôt qu'en silence, comme les autres catalogues.
 */
const questions: readonly QuestionNiveau[] = testNiveauFileSchema.parse(testNiveauFile).questions;

export function questionsNiveau(): readonly QuestionNiveau[] {
  return questions;
}

/** Texte d'un champ bilingue dans la langue demandée. */
export function texteBilingue(champ: { fr: string; ar: string }, lang: Lang): string {
  return champ[lang];
}
