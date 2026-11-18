import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, configure, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';
import { serviceEnMemoire } from '@/compte';
import { useCompte } from '@/store/compte';
import { useCourse } from '@/store/course';
import { db } from '@/db/db';
import { clearProfile } from '@/db/repositories/profile';
import { createProject } from '@/db/repositories/project';

/**
 * Parcours complet de l'édition APK, à travers l'interface : de l'absence de
 * compte jusqu'aux 28 leçons ouvertes. C'est le test qui prouve que la
 * phase 8a tient debout — la logique pure est éprouvée ailleurs, ici on
 * vérifie que l'utilisateur peut réellement aller d'un bout à l'autre.
 */

// Ces parcours montent l'application entière et traversent IndexedDB : la
// seconde par défaut est juste, et un test juste à la limite finit par
// échouer au hasard de la charge de la machine.
configure({ asyncUtilTimeout: 5000 });

// Ces parcours montent l'application entière et traversent IndexedDB. La
// limite globale d'un test vaut 5 s par défaut, soit exactement l'attente
// maximale des recherches ci-dessous : les deux se télescopaient, et le test
// expirait avant que la recherche ait fini d'attendre.
vi.setConfig({ testTimeout: 20_000 });

const EMAIL = 'kamal@example.dz';
const MOT_DE_PASSE = 'orge2026';

/**
 * Rouvre l'application sur une autre adresse. Le démontage est explicite :
 * sans lui, chaque appel ajouterait un arbre React, et les recherches
 * verraient en même temps l'écran d'avant et celui d'après.
 */
async function rouvrir(route: string) {
  cleanup();
  await renderApp('fr', route);
}

const serviceEventuel = serviceEnMemoire();
if (!serviceEventuel) throw new Error('Ce test suppose le service de comptes en mémoire.');
// Réaffectation : le rétrécissement de type ci-dessus ne suit pas dans les
// fonctions déclarées plus bas, qui sont remontées avant lui.
const service = serviceEventuel;

beforeEach(async () => {
  vi.stubEnv('VITE_EDITION', 'apk');
  service.reinitialiser();
  await Promise.all([clearProfile(), db.compte.clear(), db.projects.clear(), db.progress.clear()]);
  useCompte.setState({
    etat: { statut: 'anonyme' },
    uid: null,
    synchroniseLe: null,
    charge: false,
    enCours: false,
    derniereErreur: null,
  });
  useCourse.setState({ project: null, progress: [], dossierCount: 0, loaded: false });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function sInscrire(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText('Adresse email'), EMAIL);
  await user.type(screen.getByLabelText('Mot de passe'), MOT_DE_PASSE);
  await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));
  await screen.findByRole('heading', { name: 'Confirmez votre adresse' });
}

/** Inscription, confirmation de l'adresse, retour en essai. */
async function allerJusquALEssai(user: ReturnType<typeof userEvent.setup>) {
  await renderApp('fr', '/compte');
  await sInscrire(user);
  service.confirmerEmail(EMAIL);
  await user.click(screen.getByRole('button', { name: "J'ai confirmé, vérifier" }));
  await waitFor(() => {
    expect(useCompte.getState().etat.statut).toBe('essai');
  });
}

async function creerLeProjet() {
  await createProject({
    name: 'Élevage ovin',
    type: 'ovin',
    scaleValue: 60,
    wilayaCode: '44',
    objective: 'Vendre 40 agneaux',
  });
  await useCourse.getState().load();
}

describe('édition APK : accès au parcours', () => {
  it('sans compte, l’accueil renvoie vers la création de compte', async () => {
    await renderApp('fr', '/');
    expect(await screen.findByRole('heading', { name: 'Votre compte' })).toBeInTheDocument();
  });

  it('dit ce qui quitte le téléphone, sur l’écran où on crée le compte', async () => {
    await renderApp('fr', '/compte');
    expect(await screen.findByText(/Seuls votre adresse email et l'état/)).toBeInTheDocument();
  });

  it('refuse une adresse mal écrite sans appeler le service', async () => {
    const user = userEvent.setup();
    await renderApp('fr', '/compte');

    await user.type(await screen.findByLabelText('Adresse email'), 'kamal');
    await user.type(screen.getByLabelText('Mot de passe'), MOT_DE_PASSE);
    await user.click(screen.getByRole('button', { name: 'Créer mon compte' }));

    expect(
      await screen.findByText('Cette adresse ne ressemble pas à une adresse email.'),
    ).toBeInTheDocument();
    expect(useCompte.getState().etat.statut).toBe('anonyme');
  });

  it('après inscription, demande de confirmer l’adresse', async () => {
    const user = userEvent.setup();
    await renderApp('fr', '/compte');
    await sInscrire(user);

    expect(screen.getByText(new RegExp(EMAIL))).toBeInTheDocument();
  });

  it('tant que l’adresse n’est pas confirmée, la leçon 1 reste fermée', async () => {
    const user = userEvent.setup();
    await renderApp('fr', '/compte');
    await sInscrire(user);

    await rouvrir('/jour/1');
    expect(await screen.findByRole('heading', { name: 'Adresse à confirmer' })).toBeInTheDocument();
  });

  it('dit que rien n’a changé quand on vérifie avant d’avoir confirmé', async () => {
    const user = userEvent.setup();
    await renderApp('fr', '/compte');
    await sInscrire(user);

    await user.click(screen.getByRole('button', { name: "J'ai confirmé, vérifier" }));
    expect(await screen.findByText(/L'adresse n'est pas encore confirmée/)).toBeInTheDocument();
  });

  it('adresse confirmée : la leçon 1 s’ouvre, la leçon 4 non', async () => {
    const user = userEvent.setup();
    await allerJusquALEssai(user);
    await creerLeProjet();

    await rouvrir('/jour/1');
    expect(await screen.findByRole('button', { name: /Continuer/ })).toBeInTheDocument();

    await rouvrir('/jour/4');
    expect(await screen.findByRole('heading', { name: 'Leçon 4 verrouillée' })).toBeInTheDocument();
  });

  it('le verrou d’accès ne peut pas être contourné par le déverrouillage manuel', async () => {
    const user = userEvent.setup();
    await allerJusquALEssai(user);

    await rouvrir('/jour/28');

    // L'écran d'accès s'affiche, et le bouton « ouvrir quand même » du verrou
    // pédagogique n'est nulle part : il est hors d'atteinte.
    expect(
      await screen.findByRole('heading', { name: 'Leçon 28 verrouillée' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ouvrir quand même/i })).not.toBeInTheDocument();
  });

  it('demande puis activation : les 28 leçons s’ouvrent', async () => {
    const user = userEvent.setup();
    await allerJusquALEssai(user);

    await rouvrir('/compte/activation');
    await user.click(await screen.findByRole('button', { name: 'Demander mon activation' }));
    await waitFor(() => {
      expect(useCompte.getState().etat.statut).toBe('demande_envoyee');
    });
    expect(await screen.findByRole('heading', { name: 'Demande en attente' })).toBeInTheDocument();

    // L'administrateur active depuis son écran : l'application n'y est pour rien.
    service.activer(EMAIL);
    await user.click(screen.getByRole('button', { name: 'Vérifier maintenant' }));
    await waitFor(() => {
      expect(useCompte.getState().etat.statut).toBe('actif');
    });

    await creerLeProjet();
    await rouvrir('/jour/4');
    expect(screen.queryByRole('heading', { name: /verrouillée/ })).not.toBeInTheDocument();
  });

  it('sans réseau, un compte activé garde l’accès au lieu de se refermer', async () => {
    const user = userEvent.setup();
    await renderApp('fr', '/compte');
    await sInscrire(user);
    service.confirmerEmail(EMAIL);
    service.activer(EMAIL);
    await user.click(screen.getByRole('button', { name: "J'ai confirmé, vérifier" }));
    await waitFor(() => {
      expect(useCompte.getState().etat.statut).toBe('actif');
    });

    service.horsLigne = true;
    await useCompte.getState().rafraichir();

    expect(useCompte.getState().derniereErreur).toBe('hors_ligne');
    expect(useCompte.getState().etat.statut).toBe('actif');
  });
  it('la liste des jours annonce le verrou au lieu de le laisser découvrir au clic', async () => {
    const user = userEvent.setup();
    await allerJusquALEssai(user);
    await creerLeProjet();

    await rouvrir('/jour');
    const quatrieme = (await screen.findByText('Jour 4')).closest('li');
    expect(quatrieme).not.toBeNull();
    expect(quatrieme?.textContent).toContain('Activation requise');
    // La ligne reste cliquable, mais elle mène à la demande d'activation.
    expect(quatrieme?.querySelector('a')?.getAttribute('href')).toContain('/compte/activation');
  });

  it('l’accueil prévient du nombre de leçons d’essai restantes', async () => {
    const user = userEvent.setup();
    await allerJusquALEssai(user);
    await creerLeProjet();

    await rouvrir('/');
    expect(await screen.findByText(/Il vous reste 3 leçon/)).toBeInTheDocument();
  });

  it('le bandeau d’essai disparaît une fois le compte activé', async () => {
    const user = userEvent.setup();
    await allerJusquALEssai(user);
    await creerLeProjet();
    service.activer(EMAIL);
    await useCompte.getState().rafraichir();

    await rouvrir('/');
    expect(screen.queryByText(/leçon\(s\) d'essai/)).not.toBeInTheDocument();
  });
  it('affiche l’identifiant du compte, et permet de le copier', async () => {
    const user = userEvent.setup();
    await allerJusquALEssai(user);

    await rouvrir('/compte');
    const uid = useCompte.getState().uid;
    expect(uid).toBeTruthy();

    // C'est cet identifiant qui désigne un administrateur (D56) : sans cet
    // affichage, il fallait aller le chercher dans la console Firebase.
    expect(await screen.findByText('Identifiant du compte')).toBeInTheDocument();
    expect(screen.getByText(uid ?? '')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copier l'identifiant/ })).toBeInTheDocument();
  });
  it('envoie un message de réinitialisation du mot de passe', async () => {
    const user = userEvent.setup();
    // Un compte existe, mais on l'oublie : on repart de l'écran de connexion.
    await allerJusquALEssai(user);
    await useCompte.getState().seDeconnecter();

    await rouvrir('/compte');
    await user.click(await screen.findByRole('tab', { name: "J'ai déjà un compte" }));
    await user.type(screen.getByLabelText('Adresse email'), EMAIL);
    await user.click(screen.getByRole('button', { name: 'Mot de passe oublié ?' }));

    expect(await screen.findByText(/Si un compte existe pour cette adresse/)).toBeInTheDocument();
    expect(service.reinitialisationsEnvoyees).toContain(EMAIL);
  });

  it('ne révèle jamais qu’une adresse est inconnue', async () => {
    const user = userEvent.setup();
    await renderApp('fr', '/compte');

    await user.click(await screen.findByRole('tab', { name: "J'ai déjà un compte" }));
    await user.type(screen.getByLabelText('Adresse email'), 'personne@example.dz');
    await user.click(screen.getByRole('button', { name: 'Mot de passe oublié ?' }));

    // Le même message que pour une adresse inscrite : sinon n'importe qui
    // pourrait vérifier qui a un compte.
    expect(await screen.findByText(/Si un compte existe pour cette adresse/)).toBeInTheDocument();
    expect(service.reinitialisationsEnvoyees).toHaveLength(0);
  });

  it('refuse une adresse mal écrite avant d’appeler le service', async () => {
    const user = userEvent.setup();
    await renderApp('fr', '/compte');

    await user.click(await screen.findByRole('tab', { name: "J'ai déjà un compte" }));
    await user.type(screen.getByLabelText('Adresse email'), 'pas-une-adresse');
    await user.click(screen.getByRole('button', { name: 'Mot de passe oublié ?' }));

    expect(
      await screen.findByText('Cette adresse ne ressemble pas à une adresse email.'),
    ).toBeInTheDocument();
    expect(service.reinitialisationsEnvoyees).toHaveLength(0);
  });
});
