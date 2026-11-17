import { describe, expect, it } from 'vitest';
import { makeProject } from '@/test/factories';
import { buildPromptContext, missingVariables, renderPrompt, scaleLabel } from './prompt';

describe('prompts pré-remplis', () => {
  const project = makeProject();

  it('remplit les variables du projet en français', () => {
    const context = buildPromptContext(project, 'fr', Date.UTC(2026, 10, 17));
    const text = renderPrompt(
      'Mon projet : {{project.type}}, {{project.scale}}, wilaya de {{project.wilaya}}. Objectif : {{project.objective}}.',
      context,
      'fr',
    );
    expect(text).toContain('élevage ovin');
    expect(text).toContain('60');
    expect(text).toContain('Aïn Defla');
    expect(text).toContain('vendre 40 agneaux en 12 mois');
    expect(text).not.toContain('{{');
  });

  it('remplit les mêmes variables en arabe', () => {
    const context = buildPromptContext(project, 'ar', Date.UTC(2026, 10, 17));
    const text = renderPrompt('{{project.type}} — {{project.wilaya}}', context, 'ar');
    expect(text).toContain('تربية الأغنام');
    expect(text).toMatch(/[؀-ۿ]/);
    expect(text).not.toContain('{{');
  });

  it('rend visible ce qui manque au lieu de laisser un trou', () => {
    const context = buildPromptContext(project, 'fr');
    const text = renderPrompt('Budget maximal : {{project.budgetCeiling}}.', context, 'fr');
    expect(text).toBe('Budget maximal : [à compléter : budgetCeiling].');
    expect(missingVariables('{{project.budgetCeiling}} {{project.type}}', context)).toEqual([
      'project.budgetCeiling',
    ]);
  });

  it('utilise le marqueur arabe quand la langue est l’arabe', () => {
    const context = buildPromptContext(project, 'ar');
    expect(renderPrompt('{{project.commune}}', context, 'ar')).toContain('يُستكمل');
  });

  it('fonctionne sans projet (jour 1 avant création)', () => {
    const context = buildPromptContext(null, 'fr', Date.UTC(2026, 10, 17));
    expect(context['today']).toContain('2026');
    expect(renderPrompt('{{project.type}}', context, 'fr')).toContain('à compléter');
  });

  it('formate la taille selon le type de projet', () => {
    expect(scaleLabel(project, 'fr')).toBe('60 têtes');
    expect(scaleLabel(makeProject({ scale: { value: 4, unit: 'ha' } }), 'fr')).toBe('4 ha');
    expect(scaleLabel(makeProject({ scale: { value: 30, unit: 'ruche' } }), 'ar')).toContain(
      'خلية',
    );
  });

  it('nomme un projet « autre » par son libellé libre', () => {
    const other = makeProject({ type: 'autre', typeOther: 'escargotière' });
    const context = buildPromptContext(other, 'fr');
    expect(context['project.type']).toBe('escargotière');
  });
});
