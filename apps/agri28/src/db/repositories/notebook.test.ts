import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { listPrompts, recordPrompt, updatePrompt, deletePrompt, countPrompts } from './notebook';
import { awardBadges, listBadges } from './badges';
import { makeProgress } from '@/test/factories';
import { earnedBadges, newlyEarned } from '@/domain/badges';

const prompt = {
  projectId: 'p',
  day: 2,
  lessonId: 'day-02',
  promptId: 'p1',
  title: 'La question vague',
  tool: 'claude',
  lang: 'fr' as const,
  text: 'Comment améliorer mon élevage ovin ?',
};

describe('carnet de prompts', () => {
  beforeEach(async () => {
    await db.promptEntries.clear();
  });

  it('enregistre un prompt copié', async () => {
    const entry = await recordPrompt(prompt);

    expect(entry.id).toBe('p:day-02:p1');
    expect(entry.text).toBe(prompt.text);
    expect(entry.originalText).toBe(prompt.text);
    expect(entry.favorite).toBe(false);
    expect(await countPrompts('p')).toBe(1);
  });

  it('ne crée pas de doublon quand on recopie le même prompt', async () => {
    await recordPrompt(prompt);
    await recordPrompt(prompt);
    expect(await countPrompts('p')).toBe(1);
  });

  it('préserve les modifications et les favoris quand le prompt est recopié', async () => {
    const entry = await recordPrompt(prompt);
    await updatePrompt(entry.id, { text: 'Ma version personnalisée', favorite: true });

    const again = await recordPrompt({ ...prompt, text: 'Texte régénéré' });

    expect(again.text).toBe('Ma version personnalisée');
    expect(again.originalText).toBe('Texte régénéré');
    expect(again.favorite).toBe(true);
  });

  it('permet de revenir au texte d’origine', async () => {
    const entry = await recordPrompt(prompt);
    await updatePrompt(entry.id, { text: 'autre' });
    const restored = await updatePrompt(entry.id, { text: entry.originalText });
    expect(restored.text).toBe(prompt.text);
  });

  it('enregistre une note de résultat', async () => {
    const entry = await recordPrompt(prompt);
    const updated = await updatePrompt(entry.id, { resultNote: 'Réponse trop générale' });
    expect(updated.resultNote).toBe('Réponse trop générale');
  });

  it('trie par jour et supprime à la demande', async () => {
    await recordPrompt({ ...prompt, day: 5, promptId: 'p9', lessonId: 'day-05' });
    await recordPrompt(prompt);

    const entries = await listPrompts('p');
    expect(entries.map((entry) => entry.day)).toEqual([2, 5]);

    await deletePrompt(entries[0]!.id);
    expect(await countPrompts('p')).toBe(1);
  });
});

describe('badges', () => {
  beforeEach(async () => {
    await db.badges.clear();
  });

  const week = (from: number) =>
    Array.from({ length: 7 }, (_, index) => makeProgress(from + index));

  it('ne décerne rien tant qu’une semaine n’est pas complète', () => {
    expect(earnedBadges(week(1).slice(0, 6))).toEqual([]);
  });

  it('décerne le badge de la semaine une fois ses 7 jours validés', () => {
    expect(earnedBadges(week(1))).toEqual(['week-1']);
  });

  it('décerne le badge final au bout des 28 jours', () => {
    const all = [...week(1), ...week(8), ...week(15), ...week(22)];
    expect(earnedBadges(all)).toEqual(['week-1', 'week-2', 'week-3', 'week-4', 'final']);
  });

  it('ne renvoie que les badges nouvellement mérités', () => {
    expect(newlyEarned(week(1), ['week-1'])).toEqual([]);
    expect(newlyEarned([...week(1), ...week(8)], ['week-1'])).toEqual(['week-2']);
  });

  it('enregistre les badges sans doublon', async () => {
    const progress = week(1);
    expect(await awardBadges('p', progress)).toEqual(['week-1']);
    expect(await awardBadges('p', progress)).toEqual([]);

    const badges = await listBadges('p');
    expect(badges).toHaveLength(1);
    expect(badges[0]?.badge).toBe('week-1');
    expect(badges[0]?.earnedAt).toBeGreaterThan(0);
  });
});
