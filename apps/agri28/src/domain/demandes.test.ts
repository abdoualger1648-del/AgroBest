import { describe, expect, it } from 'vitest';
import { plusRecente, resumerDemandes } from './demandes';
import type { DemandeEnAttente } from '@/compte/port';

const demande = (
  demandeLe: number,
  nature: DemandeEnAttente['nature'] = 'activation',
): DemandeEnAttente => ({ uid: `u${String(demandeLe)}`, email: 'a@b.dz', demandeLe, nature });

describe('resumerDemandes', () => {
  it('compte le total et chaque nature', () => {
    const resume = resumerDemandes([demande(10), demande(20, 'niveau'), demande(30)], 0);
    expect(resume).toMatchObject({ total: 3, activations: 2, niveaux: 1 });
  });

  it('ne compte comme nouvelles que celles postérieures à la dernière visite', () => {
    const demandes = [demande(10), demande(20), demande(30)];
    expect(resumerDemandes(demandes, 0).nouvelles).toBe(3);
    expect(resumerDemandes(demandes, 20).nouvelles).toBe(1);
    expect(resumerDemandes(demandes, 30).nouvelles).toBe(0);
    // Une visite postérieure à tout ne remet rien en avant.
    expect(resumerDemandes(demandes, 99).nouvelles).toBe(0);
  });

  it('tient debout sans aucune demande', () => {
    expect(resumerDemandes([], 0)).toEqual({
      total: 0,
      activations: 0,
      niveaux: 0,
      nouvelles: 0,
    });
  });
});

describe('plusRecente', () => {
  it('rend la date de la demande la plus récente', () => {
    expect(plusRecente([demande(10), demande(30), demande(20)])).toBe(30);
  });

  it('rend zéro sans demande, pour ne jamais avancer le repère sans raison', () => {
    expect(plusRecente([])).toBe(0);
  });
});
