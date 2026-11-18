import { describe, expect, it } from 'vitest';
import {
  DOSSIERS_MULTI,
  DOSSIERS_STANDARD,
  LECONS_OFFERTES,
  accesAuJour,
  dossiersAutorises,
  peutCreerUnDossier,
  peutDemanderNiveau,
  dernierJourAccessible,
  etatCompte,
  leconsRestantes,
  peutDemanderActivation,
  type CompteEnregistre,
  type EtatCompte,
} from './access';
import { TOTAL_DAYS } from './types';

function compte(patch: Partial<CompteEnregistre> = {}): CompteEnregistre {
  return {
    email: 'kamal@example.dz',
    emailVerifie: true,
    actif: false,
    demandeLe: null,
    activeLe: null,
    ...patch,
  };
}

describe('etatCompte', () => {
  it('sans enregistrement, la personne est anonyme', () => {
    expect(etatCompte(null)).toEqual({ statut: 'anonyme' });
    expect(etatCompte(undefined)).toEqual({ statut: 'anonyme' });
  });

  it('tant que l’email n’est pas confirmé, rien d’autre ne compte', () => {
    const etat = etatCompte(compte({ emailVerifie: false, actif: true, activeLe: 10 }));
    expect(etat).toEqual({ statut: 'non_verifie', email: 'kamal@example.dz' });
  });

  it('email confirmé et rien de plus : essai', () => {
    expect(etatCompte(compte())).toEqual({ statut: 'essai', email: 'kamal@example.dz' });
  });

  it('demande envoyée', () => {
    expect(etatCompte(compte({ demandeLe: 1700 }))).toEqual({
      statut: 'demande_envoyee',
      email: 'kamal@example.dz',
      demandeLe: 1700,
    });
  });

  it('un compte activé le reste, même s’il garde la trace de sa demande', () => {
    const etat = etatCompte(compte({ actif: true, activeLe: 1800, demandeLe: 1700 }));
    expect(etat).toEqual({ statut: 'actif', email: 'kamal@example.dz', activeLe: 1800 });
  });
});

describe('accès aux leçons', () => {
  const anonyme: EtatCompte = { statut: 'anonyme' };
  const nonVerifie: EtatCompte = { statut: 'non_verifie', email: 'a@b.dz' };
  const essai: EtatCompte = { statut: 'essai', email: 'a@b.dz' };
  const demande: EtatCompte = { statut: 'demande_envoyee', email: 'a@b.dz', demandeLe: 1 };
  const actif: EtatCompte = { statut: 'actif', email: 'a@b.dz', activeLe: 1 };

  it('sans compte, même la première leçon est fermée', () => {
    expect(accesAuJour(1, anonyme)).toEqual({ ouvert: false, motif: 'compte_requis' });
  });

  it('email non confirmé : on le dit, au lieu de parler d’activation', () => {
    expect(accesAuJour(1, nonVerifie)).toEqual({ ouvert: false, motif: 'email_a_confirmer' });
  });

  it('en essai, les trois premières leçons sont ouvertes et la quatrième non', () => {
    expect(accesAuJour(1, essai)).toEqual({ ouvert: true });
    expect(accesAuJour(LECONS_OFFERTES, essai)).toEqual({ ouvert: true });
    expect(accesAuJour(LECONS_OFFERTES + 1, essai)).toEqual({
      ouvert: false,
      motif: 'activation_requise',
    });
  });

  it('une demande envoyée n’ouvre rien de plus : c’est l’activation qui ouvre', () => {
    expect(accesAuJour(LECONS_OFFERTES + 1, demande)).toEqual({
      ouvert: false,
      motif: 'activation_requise',
    });
  });

  it('un compte actif ouvre les 28 leçons', () => {
    for (const jour of [1, 4, 14, TOTAL_DAYS]) {
      expect(accesAuJour(jour, actif)).toEqual({ ouvert: true });
    }
  });

  it('le nombre de leçons offertes est réglable', () => {
    expect(accesAuJour(7, essai, 7)).toEqual({ ouvert: true });
    expect(accesAuJour(8, essai, 7)).toEqual({ ouvert: false, motif: 'activation_requise' });
  });

  it('dernierJourAccessible résume la même règle', () => {
    expect(dernierJourAccessible(anonyme)).toBe(0);
    expect(dernierJourAccessible(nonVerifie)).toBe(0);
    expect(dernierJourAccessible(essai)).toBe(LECONS_OFFERTES);
    expect(dernierJourAccessible(demande)).toBe(LECONS_OFFERTES);
    expect(dernierJourAccessible(actif)).toBe(TOTAL_DAYS);
  });

  it('dernierJourAccessible ne dépasse jamais le parcours', () => {
    expect(dernierJourAccessible(essai, 99)).toBe(TOTAL_DAYS);
  });
});

describe('leçons restantes avant le mur', () => {
  const essai: EtatCompte = { statut: 'essai', email: 'a@b.dz' };

  it('décompte les leçons déjà validées', () => {
    expect(leconsRestantes(essai, 0)).toBe(3);
    expect(leconsRestantes(essai, 2)).toBe(1);
    expect(leconsRestantes(essai, 3)).toBe(0);
  });

  it('ne descend jamais sous zéro, même si la progression dépasse l’essai', () => {
    expect(leconsRestantes(essai, 10)).toBe(0);
  });

  it('ne se pose pas pour un compte actif ni pour un anonyme', () => {
    expect(leconsRestantes({ statut: 'actif', email: 'a@b.dz', activeLe: 1 }, 0)).toBeNull();
    expect(leconsRestantes({ statut: 'anonyme' }, 0)).toBeNull();
    expect(leconsRestantes({ statut: 'non_verifie', email: 'a@b.dz' }, 0)).toBeNull();
  });
});

describe('demande d’activation', () => {
  it('a un sens en essai, et pour renvoyer une demande déjà faite', () => {
    expect(peutDemanderActivation({ statut: 'essai', email: 'a@b.dz' })).toBe(true);
    expect(
      peutDemanderActivation({ statut: 'demande_envoyee', email: 'a@b.dz', demandeLe: 1 }),
    ).toBe(true);
  });

  it('n’en a pas sans compte, sans email confirmé, ou une fois activé', () => {
    expect(peutDemanderActivation({ statut: 'anonyme' })).toBe(false);
    expect(peutDemanderActivation({ statut: 'non_verifie', email: 'a@b.dz' })).toBe(false);
    expect(peutDemanderActivation({ statut: 'actif', email: 'a@b.dz', activeLe: 1 })).toBe(false);
  });
});

describe('niveaux et nombre de dossiers', () => {
  it('ouvre un dossier au niveau de base, cinq au niveau supérieur', () => {
    expect(dossiersAutorises('standard')).toBe(DOSSIERS_STANDARD);
    expect(dossiersAutorises('multi')).toBe(DOSSIERS_MULTI);
    expect(DOSSIERS_STANDARD).toBe(1);
    expect(DOSSIERS_MULTI).toBe(5);
  });

  it('laisse créer tant qu’il reste de la place, et pas au-delà', () => {
    expect(peutCreerUnDossier('standard', 0)).toBe(true);
    expect(peutCreerUnDossier('standard', 1)).toBe(false);
    expect(peutCreerUnDossier('multi', 4)).toBe(true);
    expect(peutCreerUnDossier('multi', 5)).toBe(false);
    // Un compte qui dépasserait son plafond — niveau retiré, par exemple —
    // ne peut pas en créer d'autres, mais rien n'est effacé pour autant.
    expect(peutCreerUnDossier('standard', 3)).toBe(false);
  });

  it('ne laisse demander le niveau qu’à un compte utilisable qui ne l’a pas', () => {
    const essai: EtatCompte = { statut: 'essai', email: 'a@b.dz' };
    const actif: EtatCompte = { statut: 'actif', email: 'a@b.dz', activeLe: 1 };

    expect(peutDemanderNiveau(essai, 'standard')).toBe(true);
    expect(peutDemanderNiveau(actif, 'standard')).toBe(true);

    // Déjà au niveau supérieur : la demande n'a plus d'objet.
    expect(peutDemanderNiveau(actif, 'multi')).toBe(false);
    // Et avant d'avoir un compte utilisable, elle n'en a pas encore.
    expect(peutDemanderNiveau({ statut: 'anonyme' }, 'standard')).toBe(false);
    expect(peutDemanderNiveau({ statut: 'non_verifie', email: 'a@b.dz' }, 'standard')).toBe(false);
  });
});
