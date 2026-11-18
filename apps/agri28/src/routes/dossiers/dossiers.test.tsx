import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, configure, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';
import { serviceEnMemoire } from '@/compte';
import { oublierDroits } from '@/compte/droits';
import { useCompte } from '@/store/compte';
import { useCourse } from '@/store/course';
import { db } from '@/db/db';
import { clearProfile } from '@/db/repositories/profile';
import { createProject } from '@/db/repositories/project';
import { DOSSIERS_MULTI } from '@/domain/access';

/**
 * Plusieurs dossiers (phase 9). Un dossier = une activité, avec son propre
 * parcours de 28 jours et son propre Dossier de projet. Le nombre autorisé
 * dépend du niveau du compte, et le niveau se demande comme l'activation.
 */

configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 20_000 });

const UTILISATEUR = 'kamal@example.dz';
const ADMIN = 'admin@example.dz';
const MOT_DE_PASSE = 'orge2026';

const serviceEventuel = serviceEnMemoire();
if (!serviceEventuel) throw new Error('Ce test suppose le service de comptes en mémoire.');
const service = serviceEventuel;

function compte() {
  return useCompte.getState();
}

beforeEach(async () => {
  vi.stubEnv('VITE_EDITION', 'apk');
  service.reinitialiser();
  oublierDroits();
  await Promise.all([
    clearProfile(),
    db.compte.clear(),
    db.projects.clear(),
    db.progress.clear(),
    db.dossierItems.clear(),
    db.promptEntries.clear(),
    db.badges.clear(),
  ]);
  useCompte.setState({
    etat: { statut: 'anonyme' },
    uid: null,
    niveau: 'standard',
    demandeNiveauLe: null,
    synchroniseLe: null,
    charge: false,
    enCours: false,
    derniereErreur: null,
  });
  useCourse.setState({ project: null, projects: [], progress: [], dossierCount: 0, loaded: false });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function rouvrir(route: string) {
  cleanup();
  await renderApp('fr', route);
}

async function compteActifAvecUnDossier(email = UTILISATEUR) {
  await compte().sInscrire(email, MOT_DE_PASSE);
  service.confirmerEmail(email);
  service.activer(email);
  await compte().rafraichir();
  await createProject({
    name: 'Élevage ovin Aïn Defla',
    type: 'ovin',
    scaleValue: 60,
    wilayaCode: '44',
    objective: 'Vendre 40 agneaux',
  });
  await useCourse.getState().load();
}

describe('plusieurs dossiers', () => {
  it('au niveau de base, un seul dossier et la proposition de passer au niveau supérieur', async () => {
    await compteActifAvecUnDossier();

    await rouvrir('/dossiers');
    expect(await screen.findByText('Élevage ovin Aïn Defla')).toBeInTheDocument();
    expect(screen.getByText('1 dossier(s) sur 1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nouveau dossier' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Demander le niveau supérieur' }),
    ).toBeInTheDocument();
  });

  it('le plafond tient même en allant droit à l’adresse de création', async () => {
    await compteActifAvecUnDossier();

    await rouvrir('/dossiers/nouveau');
    // Pas de formulaire : un verrou qui ne tient que dans le bouton qui y
    // mène n'est pas un verrou.
    expect(await screen.findByText(/Un seul dossier à ce niveau/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Nom du projet/)).not.toBeInTheDocument();
  });

  it('demande du niveau, accord par l’administrateur, puis second dossier', async () => {
    const user = userEvent.setup();
    await compteActifAvecUnDossier();

    await rouvrir('/dossiers');
    await user.click(await screen.findByRole('button', { name: 'Demander le niveau supérieur' }));
    await waitFor(() => {
      expect(compte().demandeNiveauLe).not.toBeNull();
    });
    expect(await screen.findByText(/Demande envoyée le/)).toBeInTheDocument();

    // L'administrateur voit la demande, et voit de quelle nature elle est.
    await compte().seDeconnecter();
    await compte().sInscrire(ADMIN, MOT_DE_PASSE);
    service.confirmerEmail(ADMIN);
    service.nommerAdministrateur(ADMIN);
    await compte().rafraichir();
    oublierDroits();

    await rouvrir('/compte/administration');
    expect(await screen.findByText(UTILISATEUR)).toBeInTheDocument();
    expect(screen.getByText('Niveau multi-dossiers')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Accorder le niveau' }));
    expect(await screen.findByText('Aucune demande en attente.')).toBeInTheDocument();

    // L'utilisateur retrouve son niveau, et peut créer un second dossier.
    await compte().seDeconnecter();
    await compte().seConnecter(UTILISATEUR, MOT_DE_PASSE);
    await waitFor(() => {
      expect(compte().niveau).toBe('multi');
    });
    await useCourse.getState().load();

    await rouvrir('/dossiers');
    expect(
      await screen.findByText(`1 dossier(s) sur ${DOSSIERS_MULTI} · Niveau multi-dossiers`),
    ).toBeInTheDocument();

    await rouvrir('/dossiers/nouveau');
    await user.type(await screen.findByLabelText(/Nom du projet/), 'Apiculture Médéa');
    await user.selectOptions(screen.getByLabelText(/Type d'activité/), 'autre');
    await user.type(screen.getByLabelText(/^Taille/), '20');
    await user.selectOptions(screen.getByLabelText(/^Wilaya/), '26');
    await user.type(screen.getByLabelText(/^Objectif/), 'Vendre 200 kg de miel');
    await user.click(screen.getByRole('button', { name: 'Créer ce dossier' }));

    await waitFor(() => {
      expect(useCourse.getState().projects).toHaveLength(2);
    });
    // Le nouveau dossier devient le dossier en cours, et il repart à zéro.
    expect(useCourse.getState().project?.name).toBe('Apiculture Médéa');
    expect(useCourse.getState().progress).toHaveLength(0);
  });

  it('chaque dossier garde sa propre progression', async () => {
    await compteActifAvecUnDossier();
    const premier = useCourse.getState().project?.id ?? '';
    await useCourse.getState().startDay(1);
    expect(useCourse.getState().progress).toHaveLength(1);

    useCompte.setState({ niveau: 'multi' });
    const second = await useCourse.getState().createProject({
      name: 'Apiculture Médéa',
      type: 'autre',
      scaleValue: 20,
      wilayaCode: '26',
      objective: 'Vendre 200 kg de miel',
    });

    expect(useCourse.getState().progress).toHaveLength(0);

    await useCourse.getState().changerDeProjet(premier);
    expect(useCourse.getState().progress).toHaveLength(1);

    await useCourse.getState().changerDeProjet(second.id);
    expect(useCourse.getState().progress).toHaveLength(0);
  });

  it('supprimer un dossier efface tout ce qui lui appartient, et rien d’autre', async () => {
    await compteActifAvecUnDossier();
    const premier = useCourse.getState().project?.id ?? '';
    await useCourse.getState().startDay(1);

    useCompte.setState({ niveau: 'multi' });
    const second = await useCourse.getState().createProject({
      name: 'Apiculture Médéa',
      type: 'autre',
      scaleValue: 20,
      wilayaCode: '26',
      objective: 'Vendre 200 kg de miel',
    });
    await useCourse.getState().startDay(1);

    await useCourse.getState().supprimerProjet(second.id);

    expect(useCourse.getState().projects).toHaveLength(1);
    // La progression du dossier supprimé a disparu, celle de l'autre non.
    expect(await db.progress.where('projectId').equals(second.id).count()).toBe(0);
    expect(await db.progress.where('projectId').equals(premier).count()).toBe(1);
    // Et l'application bascule sur le dossier restant, sans retomber sur
    // l'écran de création.
    expect(useCourse.getState().project?.id).toBe(premier);
  });
});
