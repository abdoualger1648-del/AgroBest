import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, configure, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';
import { serviceEnMemoire } from '@/compte';
import { useCompte } from '@/store/compte';
import { oublierDroits } from '@/compte/droits';
import { FOURNISSEURS, estAnnulation } from '@/compte/port';
import { fournisseursDisponibles } from '@/config';
import { db } from '@/db/db';
import { clearProfile } from '@/db/repositories/profile';

/**
 * Connexion par Google et Facebook (phase 14).
 *
 * Pas de WhatsApp — aucun fournisseur OAuth de ce nom n'existe. Pas de X —
 * son accès développeur est payant. Pas de téléphone — Firebase n'envoie plus
 * de SMS sans compte de facturation, et le projet est sur Spark.
 */

configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 30_000 });

const eventuel = serviceEnMemoire();
if (!eventuel) throw new Error('Ce test suppose le service de comptes en mémoire.');
const service = eventuel;

beforeEach(async () => {
  vi.stubEnv('VITE_EDITION', 'web');
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
  cleanup();
});

describe('les fournisseurs proposés', () => {
  it('n’en propose aucun dans l’APK : Google refuse l’OAuth en WebView', () => {
    vi.stubEnv('VITE_EDITION', 'apk');
    expect(fournisseursDisponibles()).toEqual([]);
  });

  it('propose Google et Facebook sur le web', () => {
    vi.stubEnv('VITE_EDITION', 'web');
    expect([...fournisseursDisponibles()]).toEqual(['google', 'facebook']);
  });

  it('ne propose ni WhatsApp, ni X, ni téléphone', () => {
    // WhatsApp n'est pas un fournisseur d'identité ; X est payant ; le SMS
    // exige un compte de facturation. Figer la liste évite qu'on les rajoute
    // sans refaire la vérification.
    expect([...FOURNISSEURS]).toEqual(['google', 'facebook']);
  });
});

describe('se connecter par un fournisseur', () => {
  it('crée le compte à la première fois, avec l’adresse déjà confirmée', async () => {
    const user = userEvent.setup();
    await renderApp('fr', '/compte');

    await user.click(await screen.findByRole('button', { name: 'Continuer avec Google' }));

    await waitFor(() => {
      expect(useCompte.getState().etat.statut).toBe('essai');
    });
    // Google et Facebook ne rendent la main qu'après avoir vérifié l'adresse
    // eux-mêmes : la personne n'a aucun email de confirmation à attendre.
    expect(screen.queryByRole('heading', { name: 'Confirmez votre adresse' })).toBeNull();
  });

  it('retrouve le même compte à la fois suivante', async () => {
    const user = userEvent.setup();
    await renderApp('fr', '/compte');
    await user.click(await screen.findByRole('button', { name: 'Continuer avec Google' }));
    await waitFor(() => {
      expect(useCompte.getState().uid).not.toBeNull();
    });
    const premier = useCompte.getState().uid;

    await useCompte.getState().seDeconnecter();
    cleanup();
    await renderApp('fr', '/compte');
    await user.click(await screen.findByRole('button', { name: 'Continuer avec Google' }));

    await waitFor(() => {
      expect(useCompte.getState().uid).toBe(premier);
    });
  });

  it('distingue Google de Facebook', async () => {
    const user = userEvent.setup();
    await renderApp('fr', '/compte');
    await user.click(await screen.findByRole('button', { name: 'Continuer avec Facebook' }));

    await waitFor(() => {
      expect(useCompte.getState().etat.statut).not.toBe('anonyme');
    });
    const etat = useCompte.getState().etat;
    expect('email' in etat ? etat.email : '').toBe('facebook@example.dz');
  });

  it('reste silencieux quand la personne ferme la fenêtre', async () => {
    // Une annulation n'est pas une panne : afficher un message rouge pour un
    // geste délibéré serait absurde.
    const user = userEvent.setup();
    service.fournisseurRefuse = 'google';
    service.motifRefus = 'connexion_annulee';
    await renderApp('fr', '/compte');

    await user.click(await screen.findByRole('button', { name: 'Continuer avec Google' }));

    await waitFor(() => {
      expect(useCompte.getState().derniereErreur).toBe('connexion_annulee');
    });
    expect(estAnnulation('connexion_annulee')).toBe(true);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('explique une adresse déjà rattachée à une autre méthode', async () => {
    const user = userEvent.setup();
    service.fournisseurRefuse = 'facebook';
    service.motifRefus = 'autre_methode';
    await renderApp('fr', '/compte');

    await user.click(await screen.findByRole('button', { name: 'Continuer avec Facebook' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/déjà un compte, créé autrement/);
  });

  it('explique un fournisseur indisponible, sans jargon', async () => {
    const user = userEvent.setup();
    service.fournisseurRefuse = 'google';
    service.motifRefus = 'fournisseur_indisponible';
    await renderApp('fr', '/compte');

    await user.click(await screen.findByRole('button', { name: 'Continuer avec Google' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/pas disponible ici/);
  });

  it('ne retire jamais l’accès sur un échec réseau', async () => {
    const user = userEvent.setup();
    await renderApp('fr', '/compte');
    await user.click(await screen.findByRole('button', { name: 'Continuer avec Google' }));
    await waitFor(() => {
      expect(useCompte.getState().uid).not.toBeNull();
    });

    service.horsLigne = true;
    const relu = await useCompte.getState().rafraichir();
    service.horsLigne = false;

    expect(relu).toBe(false);
    expect(useCompte.getState().uid).not.toBeNull();
  });
});

describe('le texte de confidentialité', () => {
  it('dit que le fournisseur apprend l’usage de l’application', async () => {
    await renderApp('fr', '/compte');
    expect(
      await screen.findByText(/cette entreprise sait que vous utilisez cette application/),
    ).toBeInTheDocument();
  });

  it('le dit aussi en arabe', async () => {
    await renderApp('ar', '/compte');
    expect(await screen.findByText(/تعلم أنّك تستعمل هذا التطبيق/)).toBeInTheDocument();
  });
});

describe('un compte créé chez un fournisseur, ouvert là où les boutons manquent', () => {
  /** Échoue une connexion par le formulaire, et rend le texte de l'écran. */
  async function connexionRatee(edition: 'apk' | 'web'): Promise<void> {
    vi.stubEnv('VITE_EDITION', edition);
    const user = userEvent.setup();
    await renderApp('fr', '/compte');

    await user.click(await screen.findByRole('tab', { name: /déjà un compte/ }));
    await user.type(screen.getByLabelText('Adresse email'), 'hamid@example.com');
    await user.type(screen.getByLabelText('Mot de passe'), 'au-hasard');
    await user.click(screen.getByRole('button', { name: 'Me connecter' }));

    await screen.findByRole('alert');
  }

  it('dans l’APK, nomme la sortie au lieu de laisser l’utilisateur bloqué', async () => {
    // Le compte a pu être créé sur le web avec Google : il n'a donc pas de
    // mot de passe, et l'APK n'offre aucun bouton de fournisseur (D113).
    await connexionRatee('apk');

    expect(screen.getByRole('alert')).toHaveTextContent('Adresse ou mot de passe incorrect.');
    expect(screen.getByText(/aucun mot de passe/)).toBeInTheDocument();
  });

  it('sur le web, se tait : le bouton du fournisseur est juste là', async () => {
    await connexionRatee('web');

    expect(screen.getByRole('alert')).toHaveTextContent('Adresse ou mot de passe incorrect.');
    expect(screen.queryByText(/aucun mot de passe/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Continuer avec Google' })).toBeInTheDocument();
  });
});
