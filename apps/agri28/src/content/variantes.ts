import type { Lesson } from './schema';
import type { ProjectType } from '@/domain/types';

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
