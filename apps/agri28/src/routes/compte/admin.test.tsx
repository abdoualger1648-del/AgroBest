import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, configure, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';
import { serviceEnMemoire } from '@/compte';
import { oublierDroits } from '@/compte/droits';
import { useCompte } from '@/store/compte';
import { db } from '@/db/db';
import { clearProfile } from '@/db/repositories/profile';

/**
 * Écran d'administration (D49). Les règles de sécurité Firestore sont la vraie
 * protection ; ces tests vérifient le comportement de l'écran : il n'apparaît
 * que pour un administrateur, il montre les demandes, et l'activation qu'il
 * déclenche ouvre réellement l'accès du demandeur.
 */

configure({ asyncUtilTimeout: 5000 });

// Ces parcours montent l'application entière et traversent IndexedDB. La
// limite globale d'un test vaut 5 s par défaut, soit exactement l'attente
// maximale des recherches ci-dessous : les deux se télescopaient, et le test
// expirait avant que la recherche ait fini d'attendre.
vi.setConfig({ testTimeout: 20_000 });

const UTILISATEUR = 'kamal@example.dz';
const ADMIN = 'admin@example.dz';
const MOT_DE_PASSE = 'orge2026';

const serviceEventuel = serviceEnMemoire();
if (!serviceEventuel) throw new Error('Ce test suppose le service de comptes en mémoire.');
const service = serviceEventuel;

function etat() {
  return useCompte.getState();
}

beforeEach(async () => {
  vi.stubEnv('VITE_EDITION', 'apk');
  service.reinitialiser();
  oublierDroits();
  await Promise.all([clearProfile(), db.compte.clear(), db.projects.clear()]);
  useCompte.setState({
    etat: { statut: 'anonyme' },
    uid: null,
    synchroniseLe: null,
    charge: false,
    enCours: false,
    derniereErreur: null,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function rouvrir(route: string) {
  cleanup();
  await renderApp('fr', route);
}

/** Un utilisateur ordinaire qui a demandé son activation. */
async function demandeEnAttente() {
  await etat().sInscrire(UTILISATEUR, MOT_DE_PASSE);
  service.confirmerEmail(UTILISATEUR);
  await etat().rafraichir();
  await etat().demanderActivation();
  await etat().seDeconnecter();
}

/** Connecte un administrateur déjà désigné dans la base. */
async function connecterAdmin() {
  await etat().sInscrire(ADMIN, MOT_DE_PASSE);
  service.confirmerEmail(ADMIN);
  service.nommerAdministrateur(ADMIN);
  await etat().rafraichir();
  oublierDroits();
}

describe('écran d’administration', () => {
  it('reste fermé à un compte ordinaire, et le dit', async () => {
    await etat().sInscrire(UTILISATEUR, MOT_DE_PASSE);
    service.confirmerEmail(UTILISATEUR);
    await etat().rafraichir();

    await rouvrir('/compte/administration');
    expect(
      await screen.findByText("Ce compte n'a pas les droits d'administration."),
    ).toBeInTheDocument();
  });

  it('n’apparaît pas dans le menu d’un compte ordinaire', async () => {
    await etat().sInscrire(UTILISATEUR, MOT_DE_PASSE);
    service.confirmerEmail(UTILISATEUR);
    await etat().rafraichir();

    await rouvrir('/plus');
    expect(await screen.findByText('Mon compte')).toBeInTheDocument();
    expect(screen.queryByText('Administration')).not.toBeInTheDocument();
  });

  it('apparaît dans le menu de l’administrateur', async () => {
    await connecterAdmin();

    await rouvrir('/plus');
    expect(await screen.findByText('Administration')).toBeInTheDocument();
  });

  it('liste les demandes en attente', async () => {
    await demandeEnAttente();
    await connecterAdmin();

    await rouvrir('/compte/administration');
    expect(await screen.findByText(UTILISATEUR)).toBeInTheDocument();
  });

  it('ne liste pas un compte qui n’a rien demandé', async () => {
    await etat().sInscrire(UTILISATEUR, MOT_DE_PASSE);
    service.confirmerEmail(UTILISATEUR);
    await etat().seDeconnecter();
    await connecterAdmin();

    await rouvrir('/compte/administration');
    expect(await screen.findByText('Aucune demande en attente.')).toBeInTheDocument();
  });

  it('l’activation ouvre réellement l’accès du demandeur', async () => {
    const user = userEvent.setup();
    await demandeEnAttente();
    await connecterAdmin();

    await rouvrir('/compte/administration');
    await screen.findByText(UTILISATEUR);
    await user.click(screen.getByRole('button', { name: 'Activer' }));

    // La demande disparaît de la liste.
    expect(await screen.findByText('Aucune demande en attente.')).toBeInTheDocument();

    // Et le demandeur, en se reconnectant, obtient les 28 leçons.
    await etat().seDeconnecter();
    await etat().seConnecter(UTILISATEUR, MOT_DE_PASSE);
    await waitFor(() => {
      expect(etat().etat.statut).toBe('actif');
    });
  });

  it('les droits sont oubliés à la déconnexion', async () => {
    await connecterAdmin();
    await rouvrir('/plus');
    expect(await screen.findByText('Administration')).toBeInTheDocument();

    await etat().seDeconnecter();
    await etat().sInscrire(UTILISATEUR, MOT_DE_PASSE);
    service.confirmerEmail(UTILISATEUR);
    await etat().rafraichir();

    await rouvrir('/plus');
    expect(await screen.findByText('Mon compte')).toBeInTheDocument();
    expect(screen.queryByText('Administration')).not.toBeInTheDocument();
  });
  it('l’administrateur peut ouvrir son propre accès sans se faire une demande', async () => {
    const user = userEvent.setup();
    await connecterAdmin();
    expect(etat().etat.statut).toBe('essai');

    await rouvrir('/compte/administration');
    await user.click(await screen.findByRole('button', { name: 'Activer mon compte' }));

    await waitFor(() => {
      expect(etat().etat.statut).toBe('actif');
    });
    // Le bandeau disparaît une fois le compte ouvert.
    expect(screen.queryByText("Votre propre compte n'est pas activé")).not.toBeInTheDocument();
  });

  it('un compte ordinaire ne voit jamais ce bouton', async () => {
    await etat().sInscrire(UTILISATEUR, MOT_DE_PASSE);
    service.confirmerEmail(UTILISATEUR);
    await etat().rafraichir();

    await rouvrir('/compte/administration');
    await screen.findByText("Ce compte n'a pas les droits d'administration.");
    expect(screen.queryByRole('button', { name: 'Activer mon compte' })).not.toBeInTheDocument();
  });
});
