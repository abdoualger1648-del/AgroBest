import { describe, expect, it } from 'vitest';
import type { Lesson } from '@/content/schema';
import { blocksToPlainText, buildDossierBlocks, dossierDraftsFor } from './dossier';

const lesson = {
  id: 'day-01',
  title: 'Jour 1',
  produces: { dossierKind: 'fiche_projet', label: 'Fiche projet' },
  sections: {
    practice: {
      steps: [
        {
          id: 's1',
          instruction: 'Objectif',
          capture: {
            id: 'c1',
            type: 'textarea',
            label: 'Mon objectif',
            dossier: { kind: 'fiche_projet', block: 'kv', key: 'Objectif à 12 mois' },
          },
        },
        {
          id: 's2',
          instruction: 'Reformulation',
          capture: {
            id: 'c2',
            type: 'textarea',
            label: 'Reformulation',
            dossier: { kind: 'fiche_projet', block: 'paragraph' },
          },
        },
        {
          id: 's3',
          instruction: 'À vérifier',
          capture: {
            id: 'c3',
            type: 'textarea',
            label: 'À vérifier',
            dossier: { kind: 'risques', block: 'list' },
          },
        },
        { id: 's4', instruction: 'Sans saisie' },
      ],
    },
  },
} as unknown as Lesson;

describe('construction du Dossier', () => {
  it('range chaque saisie dans la bonne brique et le bon format', () => {
    const blocks = buildDossierBlocks(lesson, {
      c1: 'Vendre 40 agneaux',
      c2: 'Projet ovin de 60 têtes à Aïn Defla.',
      c3: 'Aide citée sans preuve\nPrix du quintal',
    });

    expect(blocks.get('fiche_projet')).toEqual([
      { type: 'kv', rows: [{ key: 'Objectif à 12 mois', value: 'Vendre 40 agneaux' }] },
      { type: 'paragraph', text: 'Projet ovin de 60 têtes à Aïn Defla.' },
    ]);
    expect(blocks.get('risques')).toEqual([
      { type: 'list', ordered: false, items: ['Aide citée sans preuve', 'Prix du quintal'] },
    ]);
  });

  it('ignore les saisies vides', () => {
    const blocks = buildDossierBlocks(lesson, { c1: '   ', c2: '' });
    expect(blocks.size).toBe(0);
  });

  it('produit une brique par type de contenu', () => {
    const drafts = dossierDraftsFor(lesson, { c1: 'Objectif', c3: 'Un risque' });
    expect(drafts.map((draft) => draft.kind).sort()).toEqual(['fiche_projet', 'risques']);
    expect(drafts[0]?.title).toBe('Fiche projet');
  });

  it('convertit les briques en texte lisible, pour le Dossier et les exports', () => {
    const text = blocksToPlainText(
      [
        { type: 'heading', level: 2, text: 'Fiche projet' },
        { type: 'kv', rows: [{ key: 'Objectif', value: 'Vendre 40 agneaux' }] },
        { type: 'list', ordered: false, items: ['Un', 'Deux'] },
      ],
      'fr',
    );
    expect(text).toContain('Fiche projet');
    expect(text).toContain('Objectif : Vendre 40 agneaux');
    expect(text).toContain('— Un');
  });
});
