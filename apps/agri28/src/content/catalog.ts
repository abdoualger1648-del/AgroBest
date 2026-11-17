import guardrailsFile from '../../content/guardrails.json';
import toolsFile from '../../content/tools.json';
import wilayasFile from '../../content/wilayas.json';
import {
  guardrailsFileSchema,
  toolsFileSchema,
  wilayasFileSchema,
  type Guardrail,
  type Tool,
  type Wilaya,
} from './schema';
import type { Lang } from '@/lib/lang';

/**
 * Catalogues statiques : petits, importés directement, donc disponibles
 * hors ligne dès le premier chargement. Ils sont validés une fois au démarrage
 * du module : un fichier corrompu échoue bruyamment plutôt qu'en silence.
 */
const guardrails: Guardrail[] = guardrailsFileSchema.parse(guardrailsFile).guardrails;
const tools: Tool[] = toolsFileSchema.parse(toolsFile).tools;
const wilayas: Wilaya[] = wilayasFileSchema.parse(wilayasFile).wilayas;

const guardrailsById = new Map(guardrails.map((item) => [item.id, item]));
const toolsById = new Map(tools.map((item) => [item.id, item]));
const wilayasByCode = new Map(wilayas.map((item) => [item.code, item]));

export function getGuardrail(id: string): Guardrail | undefined {
  return guardrailsById.get(id);
}

export function getGuardrailText(id: string, lang: Lang): string | undefined {
  return guardrailsById.get(id)?.text[lang];
}

export function getTool(id: string): Tool | undefined {
  return toolsById.get(id);
}

export function listTools(): readonly Tool[] {
  return tools;
}

export function getWilaya(code: string): Wilaya | undefined {
  return wilayasByCode.get(code);
}

export function wilayaName(code: string, lang: Lang): string | undefined {
  const wilaya = wilayasByCode.get(code);
  if (!wilaya) return undefined;
  return lang === 'ar' ? wilaya.name_ar : wilaya.name_fr;
}

/** Wilayas triées pour l'affichage, dans la langue demandée. */
export function listWilayas(lang: Lang): readonly Wilaya[] {
  const collator = new Intl.Collator(lang === 'ar' ? 'ar-DZ' : 'fr-DZ');
  return [...wilayas].sort((a, b) =>
    collator.compare(lang === 'ar' ? a.name_ar : a.name_fr, lang === 'ar' ? b.name_ar : b.name_fr),
  );
}
