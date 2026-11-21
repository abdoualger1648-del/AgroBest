import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, configure, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';
import { serviceEnMemoire, serviceCompte } from '@/compte';
import { useCompte } from '@/store/compte';
import { useAdministration } from '@/store/administration';
import { oublierDroits } from '@/compte/droits';
import { db } from '@/db/db';
import { clearProfile } from '@/db/repositories/profile';

/**
 * Gestion des comptes par l'administrateur (phase 13), à travers l'écran.
 *
 * La logique de filtrage et de droits est éprouvée dans `src/domain/comptes`.
 * Ici on vérifie qu'un administrateur peut réellement voir tous les comptes
 * et agir dessus — y compris sur ceux qui n'ont jamais rien demandé, que la
 * liste des demandes ne montrait pas.
 */

configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 30_000 });

const ADMIN = 'admin@example.dz';
const MDP = 'orge2026';

const eventuel = serviceEnMemoire();
if (!eventuel) throw new Error('Ce test suppose le service de comptes en mémoire.');
const service = eventuel;

beforeEach(async () => {
  vi.stubEnv('VITE_EDITION', 'apk');
  service.reinitialiser();
  // Les droits d'administration sont retenus pour la durée de la session
  // (src/compte/droits.ts). L'application les oublie à la déconnexion ; ici
  // chaque cas doit repartir d'une session neuve, sinon le dernier test
  // hériterait des droits de l'administrateur du test précédent.
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
  useAdministration.setState({ phase: 'inconnu', demandes: [], comptes: [] });
});

afterEach(() => {
  vi.unstubAllEnvs();
  cleanup();
});

/** Peuple le service comme le ferait une distribution réelle, puis connecte l'administrateur. */
async function ouvrirAdministration(): Promise<void> {
  // Une personne qui a demandé son activation.
  await service.sInscrire('brahim@example.dz', MDP);
  service.confirmerEmail('brahim@example.dz');
  await service.demanderActivation();

  // Une personne déjà activée, au niveau multi-dossiers.
  await service.sInscrire('chafik@example.dz', MDP);
  service.confirmerEmail('chafik@example.dz');
  service.activer('chafik@example.dz');

  // Une personne qui s'est inscrite et n'a RIEN demandé : c'est elle que la
  // liste des demandes ne pouvait pas montrer.
  await service.sInscrire('dalila@example.dz', MDP);
  service.confirmerEmail('dalila@example.dz');

  await service.sInscrire(ADMIN, MDP);
  service.confirmerEmail(ADMIN);
  service.activer(ADMIN);
  service.nommerAdministrateur(ADMIN);

  // Le niveau multi est accordé par l'administrateur lui-même, comme en vrai.
  await service.seConnecter(ADMIN, MDP);
  const comptes = await serviceCompte.listerComptes();
  const chafik = comptes.find((compte) => compte.email === 'chafik@example.dz');
  if (chafik) await serviceCompte.accorderNiveau(chafik.uid);

  await useCompte.getState().seConnecter(ADMIN, MDP);
  await renderApp('fr', '/compte/administration');
  await screen.findByRole('heading', { name: 'Tous les comptes' });
}

/**
 * La section « Tous les comptes », et elle seule.
 *
 * Indispensable : une personne qui a une demande en attente apparaît AUSSI
 * dans la liste des demandes, au-dessus. Chercher dans la page entière
 * trouverait les deux, et le test échouerait sans rien dire de l'application.
 */
function section(): HTMLElement {
  return screen.getByRole('region', { name: 'Tous les comptes' });
}

/** La carte d'un compte dans la liste complète, repérée par son adresse. */
function carte(email: string): HTMLElement {
  const titre = within(section()).getByText(email);
  const element = titre.closest('li');
  if (!element) throw new Error(`Carte introuvable pour ${email}`);
  return element;
}

describe('liste de tous les comptes', () => {
  it('montre chaque compte inscrit, demande ou non', async () => {
    await ouvrirAdministration();

    for (const email of ['brahim@example.dz', 'chafik@example.dz', 'dalila@example.dz', ADMIN]) {
      expect(within(section()).getByText(email)).toBeInTheDocument();
    }
    // Dalila n'a jamais rien demandé : elle est invisible dans les demandes,
    // et c'est précisément ce que cette liste répare.
    expect(within(carte('dalila@example.dz')).getByText("N'a rien demandé")).toBeInTheDocument();
  });

  it('affiche l’état d’accès et le niveau de chacun', async () => {
    await ouvrirAdministration();

    expect(within(carte('brahim@example.dz')).getByText('Accès fermé')).toBeInTheDocument();
    expect(within(carte('chafik@example.dz')).getByText('Accès ouvert')).toBeInTheDocument();
    expect(within(carte('chafik@example.dz')).getByText('5 dossiers')).toBeInTheDocument();
    expect(within(carte('dalila@example.dz')).getByText('1 dossier')).toBeInTheDocument();
  });

  it('résume la population en une ligne', async () => {
    await ouvrirAdministration();
    expect(within(section()).getByText(/4 compte\(s\)/)).toBeInTheDocument();
  });

  it('filtre par état', async () => {
    const user = userEvent.setup();
    await ouvrirAdministration();

    await user.click(within(section()).getByRole('button', { name: 'Inactifs' }));
    expect(within(section()).getByText('brahim@example.dz')).toBeInTheDocument();
    expect(within(section()).queryByText('chafik@example.dz')).not.toBeInTheDocument();

    await user.click(within(section()).getByRole('button', { name: 'Multi-dossiers' }));
    expect(within(section()).getByText('chafik@example.dz')).toBeInTheDocument();
    expect(within(section()).queryByText('brahim@example.dz')).not.toBeInTheDocument();
  });

  it('cherche par adresse', async () => {
    const user = userEvent.setup();
    await ouvrirAdministration();

    await user.type(screen.getByLabelText('Rechercher une adresse'), 'DALILA');
    expect(within(section()).getByText('dalila@example.dz')).toBeInTheDocument();
    expect(within(section()).queryByText('brahim@example.dz')).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Rechercher une adresse'));
    await user.type(screen.getByLabelText('Rechercher une adresse'), 'introuvable');
    expect(
      within(section()).getByText('Aucun compte ne correspond à cette recherche.'),
    ).toBeInTheDocument();
  });
});

describe('agir sur un compte', () => {
  it('ouvre l’accès d’un compte fermé', async () => {
    const user = userEvent.setup();
    await ouvrirAdministration();

    await user.click(within(carte('brahim@example.dz')).getByRole('button', { name: 'Activer' }));
    await waitFor(() => {
      expect(within(carte('brahim@example.dz')).getByText('Accès ouvert')).toBeInTheDocument();
    });
  });

  it('ne ferme un accès qu’après confirmation, et pas avant', async () => {
    const user = userEvent.setup();
    await ouvrirAdministration();

    await user.click(
      within(carte('chafik@example.dz')).getByRole('button', { name: "Fermer l'accès" }),
    );
    // Le premier clic n'a rien fait d'autre que demander confirmation.
    expect(within(carte('chafik@example.dz')).getByText('Accès ouvert')).toBeInTheDocument();
    expect(within(section()).getByText(/Fermer l'accès de chafik@example.dz/)).toBeInTheDocument();

    await user.click(within(section()).getByRole('button', { name: 'Annuler' }));
    expect(within(section()).queryByText(/Fermer l'accès de chafik/)).not.toBeInTheDocument();
    expect(within(carte('chafik@example.dz')).getByText('Accès ouvert')).toBeInTheDocument();

    await user.click(
      within(carte('chafik@example.dz')).getByRole('button', { name: "Fermer l'accès" }),
    );
    await user.click(within(section()).getByRole('button', { name: 'Confirmer' }));

    await waitFor(() => {
      expect(within(carte('chafik@example.dz')).getByText('Accès fermé')).toBeInTheDocument();
    });
    expect(within(carte('chafik@example.dz')).getByText(/Retiré le/)).toBeInTheDocument();
    // La date d'ouverture reste : elle dit qu'un accès avait bien été donné.
    expect(within(carte('chafik@example.dz')).getByText(/Ouvert le/)).toBeInTheDocument();
  });

  it('ramène un compte au niveau d’un seul dossier, après confirmation', async () => {
    const user = userEvent.setup();
    await ouvrirAdministration();

    await user.click(
      within(carte('chafik@example.dz')).getByRole('button', { name: 'Revenir à 1 dossier' }),
    );
    await user.click(within(section()).getByRole('button', { name: 'Confirmer' }));

    await waitFor(() => {
      expect(within(carte('chafik@example.dz')).getByText('1 dossier')).toBeInTheDocument();
    });
  });

  it('accorde le niveau multi-dossiers sans confirmation : rien n’est retiré', async () => {
    const user = userEvent.setup();
    await ouvrirAdministration();

    await user.click(
      within(carte('dalila@example.dz')).getByRole('button', { name: 'Accorder le niveau' }),
    );
    await waitFor(() => {
      expect(within(carte('dalila@example.dz')).getByText('5 dossiers')).toBeInTheDocument();
    });
  });
});

describe('protection de l’administrateur', () => {
  it('ne propose jamais de retirer ses propres droits', async () => {
    await ouvrirAdministration();
    const moi = carte(ADMIN);

    expect(within(moi).getByText('Votre compte')).toBeInTheDocument();
    expect(within(moi).queryByRole('button', { name: "Fermer l'accès" })).not.toBeInTheDocument();
    expect(
      within(moi).queryByRole('button', { name: 'Revenir à 1 dossier' }),
    ).not.toBeInTheDocument();
    expect(
      within(moi).getByText('Vous ne pouvez pas retirer vos propres droits depuis cet écran.'),
    ).toBeInTheDocument();
  });

  it('laisse en revanche l’administrateur se donner le niveau multi-dossiers', async () => {
    const user = userEvent.setup();
    await ouvrirAdministration();

    await user.click(within(carte(ADMIN)).getByRole('button', { name: 'Accorder le niveau' }));
    await waitFor(() => {
      expect(within(carte(ADMIN)).getByText('5 dossiers')).toBeInTheDocument();
    });
  });
});

describe('accès à l’écran', () => {
  it('refuse la gestion à un compte ordinaire', async () => {
    await service.sInscrire('brahim@example.dz', MDP);
    service.confirmerEmail('brahim@example.dz');
    service.activer('brahim@example.dz');
    await useCompte.getState().seConnecter('brahim@example.dz', MDP);

    await renderApp('fr', '/compte/administration');

    expect(
      await screen.findByText("Ce compte n'a pas les droits d'administration."),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Tous les comptes' })).not.toBeInTheDocument();
  });
});

describe('ce qu’une fermeture fait à la personne', () => {
  /**
   * La promesse centrale de la phase 13 : un accès fermé par l'administrateur
   * se referme vraiment chez l'utilisateur. Éprouvée au niveau du store, là où
   * la décision se prend, plutôt qu'à travers deux écrans.
   */
  async function compteActifPuisFerme(): Promise<void> {
    await service.sInscrire('brahim@example.dz', MDP);
    service.confirmerEmail('brahim@example.dz');
    service.activer('brahim@example.dz');

    await service.sInscrire(ADMIN, MDP);
    service.confirmerEmail(ADMIN);
    service.nommerAdministrateur(ADMIN);
    await service.seConnecter(ADMIN, MDP);

    const comptes = await serviceCompte.listerComptes();
    const brahim = comptes.find((compte) => compte.email === 'brahim@example.dz');
    if (!brahim) throw new Error('compte introuvable');
    await serviceCompte.desactiverCompte(brahim.uid);
  }

  it('referme les leçons à la connexion suivante', async () => {
    await compteActifPuisFerme();

    // La personne se reconnecte : le service dit « inactif », et le store
    // l'applique. C'est toute la promesse de la fonctionnalité.
    await useCompte.getState().seConnecter('brahim@example.dz', MDP);
    expect(useCompte.getState().etat.statut).not.toBe('actif');
  });

  it('un échec réseau ne retire JAMAIS un accès déjà ouvert (D52)', async () => {
    await service.sInscrire('brahim@example.dz', MDP);
    service.confirmerEmail('brahim@example.dz');
    service.activer('brahim@example.dz');
    await useCompte.getState().seConnecter('brahim@example.dz', MDP);
    expect(useCompte.getState().etat.statut).toBe('actif');

    service.horsLigne = true;
    const relu = await useCompte.getState().rafraichir();
    service.horsLigne = false;

    expect(relu).toBe(false);
    expect(useCompte.getState().etat.statut).toBe('actif');
  });

  it('rouvrir rend l’accès, et efface la date de retrait', async () => {
    await compteActifPuisFerme();

    const avant = await serviceCompte.listerComptes();
    const ferme = avant.find((compte) => compte.email === 'brahim@example.dz');
    expect(ferme?.actif).toBe(false);
    expect(ferme?.desactiveLe).not.toBeNull();
    // La date d'ouverture reste : elle distingue « jamais ouvert » de
    // « ouvert puis retiré » (D102).
    expect(ferme?.activeLe).not.toBeNull();

    await serviceCompte.activerCompte(ferme!.uid);
    const apres = (await serviceCompte.listerComptes()).find(
      (compte) => compte.email === 'brahim@example.dz',
    );
    expect(apres?.actif).toBe(true);
    expect(apres?.desactiveLe).toBeNull();
  });
});
