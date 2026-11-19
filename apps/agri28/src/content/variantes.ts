import type { Lesson } from './schema';
import type { ProjectType } from '@/domain/types';
import type { NiveauParcours } from '@/domain/niveau';

/**
 * Applique à une leçon la variante correspondant au type d'activité.
 *
 * Fonction **pure** : elle ne lit ni le store, ni la base. Un type sans
 * variante — ou un projet sans type connu — rend la leçon inchangée, ce qui
 * fait du contenu générique le repli naturel : une variante absente n'est
 * jamais une page vide.
 */
export function appliquerVariante(lecon: Lesson, type: ProjectType | null | undefined): Lesson {
  const variante = type ? lecon.variantes?.[type] : undefined;
  // Une variante encore en brouillon n'est pas affichée : la relecture
  // humaine est un verrou, pas un pense-bête.
  if (!variante || variante.brouillon === true) return lecon;

  const { terrain, captures, indices } = variante;

  return {
    ...lecon,
    sections: {
      ...lecon.sections,
      concept: {
        ...lecon.sections.concept,
        body: terrain
          ? lecon.sections.concept.body.map((bloc) =>
              bloc.type === 'example'
                ? {
                    ...bloc,
                    ...(terrain.label ? { label: terrain.label } : {}),
                    text: terrain.text,
                  }
                : bloc,
            )
          : lecon.sections.concept.body,
      },
      practice: {
        ...lecon.sections.practice,
        steps: lecon.sections.practice.steps.map((etape) => {
          const libelle = etape.capture ? captures?.[etape.capture.id] : undefined;
          const indice = etape.prompt ? indices?.[etape.prompt.id] : undefined;
          if (!libelle && !indice) return etape;

          return {
            ...etape,
            ...(etape.capture && libelle ? { capture: { ...etape.capture, label: libelle } } : {}),
            // Le gabarit n'est jamais touché : seul l'indice peut varier.
            ...(etape.prompt && indice ? { prompt: { ...etape.prompt, hint: indice } } : {}),
          };
        }),
      },
    },
  };
}

/** Types pour lesquels une leçon propose une variante **relue**. */
export function typesAvecVariante(lecon: Lesson): string[] {
  return Object.entries(lecon.variantes ?? {})
    .filter(([, variante]) => variante.brouillon !== true)
    .map(([type]) => type)
    .sort();
}

/**
 * Applique à une leçon la variante correspondant au NIVEAU de l'utilisateur
 * (phase 12). Second axe, indépendant du type d'activité.
 *
 * Fonction **pure**, et volontairement plus étroite que `appliquerVariante` :
 * elle n'ajoute qu'un accompagnement (`aide`) ou une exigence (`defi`), et ne
 * remplace que les indices de prompt. Le gabarit d'un prompt reste intouché —
 * D81 vaut ici mot pour mot, et le schéma de variante de niveau ne l'expose
 * même pas.
 *
 * Un niveau sans variante rend la leçon inchangée : le contenu générique est
 * le repli naturel, jamais une page vide.
 */
export function appliquerNiveau(lecon: Lesson, niveau: NiveauParcours | null | undefined): Lesson {
  const variante = niveau ? lecon.variantesNiveau?.[niveau] : undefined;
  // Une variante encore en brouillon n'est pas affichée (D82).
  if (!variante || variante.brouillon === true) return lecon;

  const { aide, defi, indices } = variante;

  return {
    ...lecon,
    sections: {
      ...lecon.sections,
      practice: {
        ...lecon.sections.practice,
        ...(aide ? { aide } : {}),
        ...(defi ? { defi } : {}),
        steps: lecon.sections.practice.steps.map((etape) => {
          const indice = etape.prompt ? indices?.[etape.prompt.id] : undefined;
          if (!indice || !etape.prompt) return etape;
          // Le gabarit n'est jamais touché : seul l'indice peut varier.
          return { ...etape, prompt: { ...etape.prompt, hint: indice } };
        }),
      },
    },
  };
}

/**
 * Les deux axes, dans l'ordre : le métier d'abord, le niveau ensuite.
 *
 * Cet ordre a une conséquence qu'il faut connaître : si les deux variantes
 * visent le même indice de prompt, c'est celle du NIVEAU qui gagne. C'est le
 * bon arbitrage — le métier décide de quoi on parle, le niveau décide combien
 * on accompagne, et c'est l'accompagnement qui doit coller à la personne.
 */
export function appliquerVariantes(
  lecon: Lesson,
  contexte: { type?: ProjectType | null; niveau?: NiveauParcours | null },
): Lesson {
  return appliquerNiveau(appliquerVariante(lecon, contexte.type), contexte.niveau);
}

/** Niveaux pour lesquels une leçon propose une variante **relue**. */
export function niveauxAvecVariante(lecon: Lesson): string[] {
  return Object.entries(lecon.variantesNiveau ?? {})
    .filter(([, variante]) => variante.brouillon !== true)
    .map(([niveau]) => niveau)
    .sort();
}
