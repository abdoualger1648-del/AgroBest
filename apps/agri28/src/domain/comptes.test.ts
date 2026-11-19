import { describe, expect, it } from 'vitest';
import {
  FILTRES_COMPTES,
  actionsPossibles,
  attendUneReponse,
  filtrerComptes,
  resumerComptes,
  type CompteAdministre,
} from './comptes';

function compte(override: Partial<CompteAdministre> = {}): CompteAdministre {
  return {
    uid: 'u1',
    email: 'kamel@example.com',
    actif: false,
    niveau: 'standard',
    demandeLe: null,
    activeLe: null,
    desactiveLe: null,
    demandeNiveauLe: null,
    niveauLe: null,
    ...override,
  };
}

const JEU: CompteAdministre[] = [
  compte({ uid: 'a', email: 'amel@example.com', actif: true, activeLe: 10 }),
  compte({ uid: 'b', email: 'brahim@example.com', demandeLe: 20 }),
  compte({ uid: 'c', email: 'chafik@example.com', actif: true, niveau: 'multi', niveauLe: 30 }),
  compte({ uid: 'd', email: 'dalila@example.com', actif: true, demandeNiveauLe: 40 }),
  compte({ uid: 'e', email: 'elias@example.com', actif: false, activeLe: 5, desactiveLe: 50 }),
];

describe('attendUneReponse', () => {
  it('attend quand une activation est demandée et non accordée', () => {
    expect(attendUneReponse(compte({ demandeLe: 1 }))).toBe(true);
    expect(attendUneReponse(compte({ demandeLe: 1, actif: true }))).toBe(false);
  });

  it('attend quand un niveau est demandé et non accordé', () => {
    expect(attendUneReponse(compte({ demandeNiveauLe: 1 }))).toBe(true);
    expect(attendUneReponse(compte({ demandeNiveauLe: 1, niveau: 'multi' }))).toBe(false);
  });

  it("n'attend rien quand rien n'a été demandé", () => {
    expect(attendUneReponse(compte())).toBe(false);
  });

  it('attend encore après un retrait, si la demande d’origine tient', () => {
    // Un accès retiré ne supprime pas la demande : la personne reste visible
    // comme demandeuse, ce qui est honnête.
    expect(attendUneReponse(compte({ demandeLe: 1, actif: false, desactiveLe: 9 }))).toBe(true);
  });
});

describe('filtrerComptes', () => {
  it('rend tout avec « tous »', () => {
    expect(filtrerComptes(JEU, 'tous')).toHaveLength(5);
  });

  it('isole ceux qui attendent une réponse', () => {
    expect(filtrerComptes(JEU, 'en_attente').map((c) => c.uid)).toEqual(['b', 'd']);
  });

  it('sépare actifs et inactifs', () => {
    expect(filtrerComptes(JEU, 'actifs').map((c) => c.uid)).toEqual(['a', 'c', 'd']);
    expect(filtrerComptes(JEU, 'inactifs').map((c) => c.uid)).toEqual(['b', 'e']);
  });

  it('isole le niveau multi-dossiers', () => {
    expect(filtrerComptes(JEU, 'multi').map((c) => c.uid)).toEqual(['c']);
  });

  it('cherche dans l’adresse, sans tenir compte de la casse ni des espaces', () => {
    expect(filtrerComptes(JEU, 'tous', 'BRAHIM').map((c) => c.uid)).toEqual(['b']);
    expect(filtrerComptes(JEU, 'tous', '  chafik  ').map((c) => c.uid)).toEqual(['c']);
    expect(filtrerComptes(JEU, 'tous', 'example.com')).toHaveLength(5);
  });

  it('combine le filtre et la recherche', () => {
    expect(filtrerComptes(JEU, 'actifs', 'a').map((c) => c.uid)).toEqual(['a', 'c', 'd']);
    expect(filtrerComptes(JEU, 'multi', 'brahim')).toEqual([]);
  });

  it('garde l’ordre d’origine, qui est celui du service', () => {
    const inverse = [...JEU].reverse();
    expect(filtrerComptes(inverse, 'tous').map((c) => c.uid)).toEqual(['e', 'd', 'c', 'b', 'a']);
  });

  it('rend une liste vide sans planter sur une recherche sans résultat', () => {
    expect(filtrerComptes(JEU, 'tous', 'personne')).toEqual([]);
    expect(filtrerComptes([], 'en_attente')).toEqual([]);
  });

  it('couvre les cinq filtres annoncés', () => {
    for (const filtre of FILTRES_COMPTES) {
      expect(() => filtrerComptes(JEU, filtre)).not.toThrow();
    }
  });
});

describe('resumerComptes', () => {
  it('compte le total, les actifs, les attentes et les multi', () => {
    expect(resumerComptes(JEU)).toEqual({ total: 5, actifs: 3, enAttente: 2, multi: 1 });
  });

  it('rend des zéros sur une liste vide', () => {
    expect(resumerComptes([])).toEqual({ total: 0, actifs: 0, enAttente: 0, multi: 0 });
  });
});

describe('actionsPossibles', () => {
  it('propose d’ouvrir un accès fermé, et de fermer un accès ouvert', () => {
    expect(actionsPossibles(compte({ actif: false }), 'moi').activer).toBe(true);
    expect(actionsPossibles(compte({ actif: false }), 'moi').desactiver).toBe(false);
    expect(actionsPossibles(compte({ actif: true }), 'moi').desactiver).toBe(true);
    expect(actionsPossibles(compte({ actif: true }), 'moi').activer).toBe(false);
  });

  it('propose le niveau dans un sens ou dans l’autre, jamais les deux', () => {
    const standard = actionsPossibles(compte({ niveau: 'standard' }), 'moi');
    expect([standard.accorderNiveau, standard.retirerNiveau]).toEqual([true, false]);
    const multi = actionsPossibles(compte({ niveau: 'multi' }), 'moi');
    expect([multi.accorderNiveau, multi.retirerNiveau]).toEqual([false, true]);
  });

  it('ne laisse JAMAIS l’administrateur se retirer ses propres droits', () => {
    // Le cas qui justifie la règle : un clic malheureux sur sa propre ligne
    // fermerait l'accès de celui qui administre.
    const moi = compte({ uid: 'moi', actif: true, niveau: 'multi' });
    const actions = actionsPossibles(moi, 'moi');
    expect(actions.desactiver).toBe(false);
    expect(actions.retirerNiveau).toBe(false);
  });

  it('laisse l’administrateur s’activer et se donner le niveau (D74)', () => {
    // Les règles Firestore l'y autorisent déjà, et lui imposer de s'adresser
    // une demande n'aurait servi à rien.
    const moi = compte({ uid: 'moi', actif: false, niveau: 'standard' });
    const actions = actionsPossibles(moi, 'moi');
    expect(actions.activer).toBe(true);
    expect(actions.accorderNiveau).toBe(true);
  });

  it('traite tout le monde normalement quand l’administrateur est inconnu', () => {
    const actions = actionsPossibles(compte({ actif: true, niveau: 'multi' }), null);
    expect(actions.desactiver).toBe(true);
    expect(actions.retirerNiveau).toBe(true);
  });
});
