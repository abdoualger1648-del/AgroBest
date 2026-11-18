import { beforeEach, describe, expect, it } from 'vitest';
import { creerStoreCompte } from './compte';
import { FauxServiceCompte } from '@/compte/faux';
import { accesAuJour, LECONS_OFFERTES } from '@/domain/access';
import { db } from '@/db/db';
import { makeProject } from '@/test/factories';

const EMAIL = 'kamal@example.dz';
const MOT_DE_PASSE = 'orge2026';

const service = new FauxServiceCompte();
const useCompte = creerStoreCompte(service);

function etat() {
  return useCompte.getState();
}

beforeEach(async () => {
  service.reinitialiser();
  await db.compte.clear();
  useCompte.setState({
    etat: { statut: 'anonyme' },
    synchroniseLe: null,
    charge: false,
    enCours: false,
    derniereErreur: null,
  });
});

/** Le parcours complet, de l'inscription à l'activation. */
async function allerJusquA(etape: 'inscrit' | 'verifie' | 'demande' | 'actif') {
  await etat().sInscrire(EMAIL, MOT_DE_PASSE);
  if (etape === 'inscrit') return;
  service.confirmerEmail(EMAIL);
  await etat().rafraichir();
  if (etape === 'verifie') return;
  await etat().demanderActivation();
  if (etape === 'demande') return;
  service.activer(EMAIL, 1800);
  await etat().rafraichir();
}

describe('enchaînement d’activation', () => {
  it('après inscription, l’email reste à confirmer', async () => {
    await allerJusquA('inscrit');
    expect(etat().etat).toEqual({ statut: 'non_verifie', email: EMAIL });
    expect(accesAuJour(1, etat().etat)).toEqual({ ouvert: false, motif: 'email_a_confirmer' });
  });

  it('email confirmé : les trois premières leçons s’ouvrent, la quatrième non', async () => {
    await allerJusquA('verifie');
    expect(etat().etat).toEqual({ statut: 'essai', email: EMAIL });
    expect(accesAuJour(LECONS_OFFERTES, etat().etat).ouvert).toBe(true);
    expect(accesAuJour(LECONS_OFFERTES + 1, etat().etat)).toEqual({
      ouvert: false,
      motif: 'activation_requise',
    });
  });

  it('la demande est enregistrée mais n’ouvre rien : c’est l’administrateur qui ouvre', async () => {
    await allerJusquA('demande');
    expect(etat().etat.statut).toBe('demande_envoyee');
    expect(accesAuJour(LECONS_OFFERTES + 1, etat().etat).ouvert).toBe(false);
  });

  it('une fois activé, les 28 leçons sont ouvertes', async () => {
    await allerJusquA('actif');
    expect(etat().etat).toEqual({ statut: 'actif', email: EMAIL, activeLe: 1800 });
    expect(accesAuJour(28, etat().etat)).toEqual({ ouvert: true });
  });
});

describe('hors ligne', () => {
  it('un compte activé garde son accès quand le réseau disparaît', async () => {
    await allerJusquA('actif');

    service.horsLigne = true;
    const rafraichi = await etat().rafraichir();

    expect(rafraichi).toBe(false);
    expect(etat().derniereErreur).toBe('hors_ligne');
    // L'essentiel : l'échec réseau n'a RIEN retiré.
    expect(etat().etat.statut).toBe('actif');
    expect(accesAuJour(28, etat().etat)).toEqual({ ouvert: true });
  });

  it('au redémarrage sans réseau, le cache local fait foi', async () => {
    await allerJusquA('actif');

    // Nouveau store : comme une application qu'on rouvre, hors ligne.
    const auRedemarrage = creerStoreCompte(service);
    service.horsLigne = true;
    await auRedemarrage.getState().charger();

    expect(auRedemarrage.getState().etat).toEqual({
      statut: 'actif',
      email: EMAIL,
      activeLe: 1800,
    });
  });

  it('sans réseau, on ne peut pas s’inscrire, et on le dit', async () => {
    service.horsLigne = true;
    const reussi = await etat().sInscrire(EMAIL, MOT_DE_PASSE);
    expect(reussi).toBe(false);
    expect(etat().derniereErreur).toBe('hors_ligne');
    expect(etat().etat).toEqual({ statut: 'anonyme' });
  });
});

describe('erreurs', () => {
  it('signale une adresse déjà utilisée sans toucher à l’état', async () => {
    await allerJusquA('verifie');
    await etat().seDeconnecter();

    const reussi = await etat().sInscrire(EMAIL, 'autre-mot-de-passe');
    expect(reussi).toBe(false);
    expect(etat().derniereErreur).toBe('email_deja_utilise');
  });

  it('signale un mot de passe erroné à la connexion', async () => {
    await allerJusquA('verifie');
    await etat().seDeconnecter();

    expect(await etat().seConnecter(EMAIL, 'faux')).toBe(false);
    expect(etat().derniereErreur).toBe('identifiants_invalides');
  });

  it('oublie l’erreur quand on le lui demande, et à l’opération suivante', async () => {
    service.horsLigne = true;
    await etat().sInscrire(EMAIL, MOT_DE_PASSE);
    expect(etat().derniereErreur).toBe('hors_ligne');

    etat().oublierErreur();
    expect(etat().derniereErreur).toBeNull();

    service.horsLigne = false;
    await etat().sInscrire(EMAIL, MOT_DE_PASSE);
    expect(etat().derniereErreur).toBeNull();
  });

  it('ne laisse jamais « enCours » bloqué après un échec', async () => {
    service.horsLigne = true;
    await etat().sInscrire(EMAIL, MOT_DE_PASSE);
    expect(etat().enCours).toBe(false);
  });
});

describe('déconnexion', () => {
  it('efface le compte du cache local', async () => {
    await allerJusquA('actif');
    await etat().seDeconnecter();

    expect(etat().etat).toEqual({ statut: 'anonyme' });
    expect(await db.compte.get(1)).toBeUndefined();
  });

  it('ne touche pas aux données du parcours', async () => {
    await allerJusquA('actif');
    await db.projects.put(makeProject({ id: 'p1' }));

    await etat().seDeconnecter();

    expect(await db.projects.get('p1')).toBeDefined();
  });

  it('la connexion retrouve le compte tel qu’il était', async () => {
    await allerJusquA('actif');
    await etat().seDeconnecter();

    expect(await etat().seConnecter(EMAIL, MOT_DE_PASSE)).toBe(true);
    expect(etat().etat.statut).toBe('actif');
  });
});
