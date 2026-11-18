import guardrailsFile from '../../content/guardrails.json';
import toolsFile from '../../content/tools.json';
import wilayasFile from '../../content/wilayas.json';
import templatesFile from '../../content/templates/templates.json';
import type { DossierBlock } from '@/domain/types';
import {
  guardrailsFileSchema,
  templatesFileSchema,
  type TemplateBlock,
  type TemplateDefinition,
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
const templates: TemplateDefinition[] = templatesFileSchema.parse(templatesFile).templates;

const guardrailsById = new Map(guardrails.map((item) => [item.id, item]));
const toolsById = new Map(tools.map((item) => [item.id, item]));
const wilayasByCode = new Map(wilayas.map((item) => [item.code, item]));

export function listTemplates(): readonly TemplateDefinition[] {
  return templates;
}

export function getTemplate(id: string): TemplateDefinition | undefined {
  return templates.find((template) => template.id === id);
}

/** Convertit un modèle bilingue en blocs de Dossier dans la langue demandée. */
export function templateBlocks(template: TemplateDefinition, lang: Lang): DossierBlock[] {
  return template.blocks.map((block: TemplateBlock): DossierBlock => {
    switch (block.type) {
      case 'heading':
        return { type: 'heading', level: block.level, text: block.text[lang] };
      case 'paragraph':
        return { type: 'paragraph', text: block.text[lang] };
      case 'note':
        return { type: 'note', variant: block.variant, text: block.text[lang] };
      case 'list':
        return {
          type: 'list',
          ordered: block.ordered,
          items: block.items.map((item) => item[lang]),
        };
      case 'kv':
        return {
          type: 'kv',
          rows: block.rows.map((row) => ({ key: row.key[lang], value: row.value[lang] })),
        };
      case 'table':
        return {
          type: 'table',
          columns: block.columns.map((column) => ({
            key: column.key,
            label: column.label[lang],
            ...(column.numeric === undefined ? {} : { numeric: column.numeric }),
          })),
          rows: block.rows,
        };
    }
  });
}

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
