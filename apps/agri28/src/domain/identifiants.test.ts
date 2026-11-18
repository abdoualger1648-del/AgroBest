import { describe, expect, it } from 'vitest';
import {
  LONGUEUR_MOT_DE_PASSE_MIN,
  normaliserEmail,
  validerEmail,
  validerMotDePasse,
} from './identifiants';

describe('validerEmail', () => {
  it('accepte une adresse ordinaire', () => {
    expect(validerEmail('kamal@example.dz')).toBeNull();
    expect(validerEmail('k.ben-ali+ferme@mail.example.com')).toBeNull();
  });

  it('ignore les espaces autour', () => {
    expect(validerEmail('  kamal@example.dz  ')).toBeNull();
  });

  it('refuse une adresse vide', () => {
    expect(validerEmail('')).toBe('vide');
    expect(validerEmail('   ')).toBe('vide');
  });

  it('refuse ce qui ne ressemble pas à une adresse', () => {
    expect(validerEmail('kamal')).toBe('format');
    expect(validerEmail('kamal@')).toBe('format');
    expect(validerEmail('kamal@example')).toBe('format');
    expect(validerEmail('@example.dz')).toBe('format');
    expect(validerEmail('kamal @example.dz')).toBe('format');
  });
});

describe('validerMotDePasse', () => {
  it('refuse le vide et le trop court', () => {
    expect(validerMotDePasse('')).toBe('vide');
    expect(validerMotDePasse('a'.repeat(LONGUEUR_MOT_DE_PASSE_MIN - 1))).toBe('trop_court');
  });

  it('accepte à partir de la longueur minimale', () => {
    expect(validerMotDePasse('a'.repeat(LONGUEUR_MOT_DE_PASSE_MIN))).toBeNull();
  });

  it('ne retire pas les espaces : ils font partie du mot de passe', () => {
    expect(validerMotDePasse('   ')).toBe('trop_court');
  });
});

describe('normaliserEmail', () => {
  it('abaisse la casse et retire les espaces', () => {
    expect(normaliserEmail('  Kamal@Example.DZ ')).toBe('kamal@example.dz');
  });
});
