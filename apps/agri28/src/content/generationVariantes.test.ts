import { beforeAll, describe, expect, it } from 'vitest';
import { loadLesson } from './loader';
import {
  ReponseInvalide,
  analyserReponse,
  cibles,
  construireInstructions,
  verifierCoherence,
} from './generationVariantes';
import type { Lesson } from './schema';

let fr: Lesson;
let ar: Lesson;

beforeAll(async () => {
  [fr, ar] = await Promise.all([loadLesson(2, 'fr'), loadLesson(2, 'ar')]);
});

describe('instructions envoyées au modèle', () => {
  it('énumère les identifiants réellement visables', () => {
    const { captures, prompts } = cibles(fr);
    const texte = construireInstructions(fr, ar, 'apiculture', 'apiculture');

    expect(captures.length).toBeGreaterThan(0);
    for (const id of [...captures, ...prompts]) expect(texte).toContain(id);
  });

  it('demande les deux langues dans le même appel', () => {
    // C'est ce qui garantit la parité AR/FR par construction, comme le
    // générateur de jours : deux appels séparés dériveraient.
    const texte = construireInstructions(fr, ar, 'apiculture', 'apiculture');
    expect(texte).toContain('"fr"');
    expect(texte).toContain('"ar"');
    expect(texte).toMatch(/mêmes clés/);
  });

  it('interdit explicitement prix, doses et textes réglementaires', () => {
    const texte = construireInstructions(fr, ar, 'apiculture', 'apiculture');
    expect(texte).toMatch(/AUCUN prix/);
    expect(texte).toMatch(/AUCUNE dose/);
    expect(texte).toMatch(/décret/);
  });
});

describe('analyse de la réponse', () => {
  const bonne = JSON.stringify({
    fr: { terrain: { label: 'Sur le terrain', text: 'Yacine conduit 40 ruches.' } },
    ar: { terrain: { label: 'من الميدان', text: 'ياسين يدير 40 خليّة.' } },
  });

  it('accepte un JSON propre', () => {
    expect(analyserReponse(bonne).fr.terrain?.text).toBe('Yacine conduit 40 ruches.');
  });

  it('tolère un bloc de code autour', () => {
    expect(analyserReponse('```json\n' + bonne + '\n```').ar.terrain?.text).toContain('ياسين');
  });

  it('refuse ce qui n’est pas du JSON', () => {
    expect(() => analyserReponse('Bien sûr ! Voici la variante :')).toThrow(ReponseInvalide);
  });

  it('refuse une réponse à une seule langue', () => {
    expect(() => analyserReponse(JSON.stringify({ fr: { terrain: { text: 'x' } } }))).toThrow(
      /« fr » et « ar »/,
    );
  });

  it('refuse un champ hors du schéma — le gabarit d’un prompt, par exemple', () => {
    // Le schéma est strict : une variante ne peut pas réécrire un gabarit,
    // donc aucune réponse du modèle ne le pourra non plus.
    const fautive = JSON.stringify({
      fr: { template: 'Tu es un conseiller…' },
      ar: { template: '…' },
    });
    expect(() => analyserReponse(fautive)).toThrow(ReponseInvalide);
  });
});

describe('cohérence avant écriture', () => {
  it('ne trouve rien à redire à une variante correcte', () => {
    const id = cibles(fr).captures[0] ?? '';
    expect(
      verifierCoherence(fr, {
        fr: { captures: { [id]: 'Question française' } },
        ar: { captures: { [id]: 'سؤال بالعربية' } },
      }),
    ).toEqual([]);
  });

  it('refuse un identifiant inventé', () => {
    const fautes = verifierCoherence(fr, {
      fr: { captures: { invente: 'x' } },
      ar: { captures: { invente: 'y' } },
    });
    expect(fautes.join(' ')).toMatch(/capture inconnue/);
  });

  it('refuse deux langues qui ne couvrent pas les mêmes champs', () => {
    const id = cibles(fr).captures[0] ?? '';
    const fautes = verifierCoherence(fr, {
      fr: { captures: { [id]: 'x' }, terrain: { text: 'y' } },
      ar: { captures: { [id]: 'z' } },
    });
    expect(fautes.join(' ')).toMatch(/mêmes champs/);
  });
});
