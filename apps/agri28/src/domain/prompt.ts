import type { Lang } from '@/lib/lang';
import { formatDA, formatDate, formatNumber } from '@/lib/format';
import { wilayaName } from '@/content/catalog';
import type { Project, ScaleUnit } from './types';

/** Libellés des unités, utilisés dans les prompts (texte, pas interface). */
const UNIT_LABEL: Record<Lang, Record<ScaleUnit, string>> = {
  fr: { ha: 'ha', m2: 'm²', tete: 'têtes', sujet: 'sujets', ruche: 'ruches' },
  ar: { ha: 'هكتار', m2: 'م²', tete: 'رأسًا', sujet: 'وحدة', ruche: 'خلية' },
};

const TYPE_LABEL: Record<Lang, Record<string, string>> = {
  fr: {
    ovin: 'élevage ovin',
    bovin: 'élevage bovin',
    avicole: 'élevage avicole',
    maraichage: 'maraîchage',
    serre: 'culture sous serre',
    cereales: 'céréaliculture',
    arboriculture: 'arboriculture',
    apiculture: 'apiculture',
    autre: 'projet agricole',
  },
  ar: {
    ovin: 'تربية الأغنام',
    bovin: 'تربية الأبقار',
    avicole: 'تربية الدواجن',
    maraichage: 'زراعة الخضروات',
    serre: 'الزراعة تحت البيوت البلاستيكية',
    cereales: 'زراعة الحبوب',
    arboriculture: 'غراسة الأشجار المثمرة',
    apiculture: 'تربية النحل',
    autre: 'مشروع فلاحي',
  },
};

const WATER_LABEL: Record<Lang, Record<string, string>> = {
  fr: {
    forage: 'forage',
    reseau: 'réseau public',
    pluvial: 'pluvial',
    bassin: 'bassin',
    autre: 'autre',
    inconnu: 'non précisé',
  },
  ar: {
    forage: 'بئر',
    reseau: 'الشبكة العمومية',
    pluvial: 'الأمطار',
    bassin: 'حوض',
    autre: 'أخرى',
    inconnu: 'غير محدّد',
  },
};

const MISSING_LABEL: Record<Lang, string> = {
  fr: 'à compléter',
  ar: 'يُستكمل',
};

export function projectTypeLabel(project: Project, lang: Lang): string {
  if (project.type === 'autre' && project.typeOther) return project.typeOther;
  return TYPE_LABEL[lang][project.type] ?? project.type;
}

export function scaleLabel(project: Project, lang: Lang): string {
  return `${formatNumber(project.scale.value, lang)} ${UNIT_LABEL[lang][project.scale.unit]}`;
}

const MONTHS: Record<Lang, string[]> = {
  fr: [
    'janvier',
    'février',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'août',
    'septembre',
    'octobre',
    'novembre',
    'décembre',
  ],
  ar: [
    'جانفي',
    'فيفري',
    'مارس',
    'أفريل',
    'ماي',
    'جوان',
    'جويلية',
    'أوت',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ],
};

/** Valeurs disponibles pour les variables {{…}} d'un prompt. */
export function buildPromptContext(
  project: Project | null,
  lang: Lang,
  now: number = Date.now(),
): Record<string, string> {
  const context: Record<string, string> = {
    today: formatDate(new Date(now), lang),
    lang: lang === 'ar' ? 'العربية' : 'français',
  };
  if (!project) return context;

  const area =
    project.scale.unit === 'ha' || project.scale.unit === 'm2' ? scaleLabel(project, lang) : '';

  Object.assign(context, {
    'project.name': project.name,
    'project.type': projectTypeLabel(project, lang),
    'project.scale': scaleLabel(project, lang),
    'project.wilaya': wilayaName(project.wilayaCode, lang) ?? '',
    'project.objective': project.objective,
    'project.horizonMonths': formatNumber(project.horizonMonths, lang),
  });

  if (area) context['project.area'] = area;
  if (project.commune) context['project.commune'] = project.commune;
  if (project.budgetCeilingDA !== undefined) {
    context['project.budgetCeiling'] = formatDA(project.budgetCeilingDA, lang);
  }
  if (project.waterSource) {
    context['project.waterSource'] = WATER_LABEL[lang][project.waterSource] ?? project.waterSource;
  }
  if (project.startMonth !== undefined) {
    context['project.startMonth'] = MONTHS[lang][project.startMonth - 1] ?? '';
  }

  return context;
}

/**
 * Remplace les variables d'un prompt. Une variable absente devient un
 * marqueur VISIBLE : l'utilisateur voit tout de suite ce qu'il doit compléter,
 * plutôt que d'envoyer un prompt troué à l'IA.
 */
export function renderPrompt(
  template: string,
  context: Readonly<Record<string, string>>,
  lang: Lang,
): string {
  return template.replace(/\{\{([\w.]+)\}\}/g, (_match, variable: string) => {
    const value = context[variable];
    if (value !== undefined && value.trim() !== '') return value;
    return `[${MISSING_LABEL[lang]} : ${variable.replace('project.', '')}]`;
  });
}

/** Variables du template qui ne sont pas renseignées. */
export function missingVariables(
  template: string,
  context: Readonly<Record<string, string>>,
): string[] {
  const missing = new Set<string>();
  for (const match of template.matchAll(/\{\{([\w.]+)\}\}/g)) {
    const variable = match[1] ?? '';
    const value = context[variable];
    if (value === undefined || value.trim() === '') missing.add(variable);
  }
  return [...missing];
}
