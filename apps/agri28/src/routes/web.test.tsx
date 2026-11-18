import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, configure, screen } from '@testing-library/react';
import { renderApp } from '@/test/renderApp';
import { serviceEnMemoire } from '@/compte';
import { oublierDroits } from '@/compte/droits';
import { useCompte } from '@/store/compte';
import { useCourse } from '@/store/course';
import { db } from '@/db/db';
import { clearProfile } from '@/db/repositories/profile';
import { createProject } from '@/db/repositories/project';
import { availableDays } from '@/content/loader';

/**
 * Édition web : le même produit que l'APK, servi depuis un navigateur.
 * Compte obligatoire, essai de trois leçons, activation — et, en plus,
 * l'application Android proposée au téléchargement, parce qu'elle fonctionne
 * sans réseau une fois installée.
 */

configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 20_000 });

const EMAIL = 'kamal@example.dz';
const MOT_DE_PASSE = 'orge2026';

const serviceEventuel = serviceEnMemoire();
if (!serviceEventuel) throw new Error('Ce test suppose le service de comptes en mémoire.');
const service = serviceEventuel;

beforeEach(async () => {
  vi.stubEnv('VITE_EDITION', 'web');
  service.reinitialiser();
  oublierDroits();
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

async function rouvrir(route: string) {
  cleanup();
  await renderApp('fr', route);
}

/** Amène le compte jusqu'à l'essai, et crée le projet. */
async function enEssai() {
  await useCompte.getState().sInscrire(EMAIL, MOT_DE_PASSE);
  service.confirmerEmail(EMAIL);
  await useCompte.getState().rafraichir();
  await createProject({
    name: 'Élevage ovin Aïn Defla',
    type: 'ovin',
    scaleValue: 60,
    wilayaCode: '44',
    objective: 'Vendre 40 agneaux',
  });
  await useCourse.getState().load();
}

describe('édition web', () => {
  it('exige un compte, comme l’APK', async () => {
    await renderApp('fr', '/');
    expect(await screen.findByRole('heading', { name: 'Votre compte' })).toBeInTheDocument();
  });

  it('sert bien les 28 jours, dans les deux langues', () => {
    // La limitation à trois leçons venait de l'édition vitrine : elle a
    // disparu. C'est désormais l'activation, et elle seule, qui ouvre.
    expect(availableDays('fr')).toHaveLength(28);
    expect(availableDays('ar')).toHaveLength(28);
  });

  it('ouvre les trois leçons d’essai et arrête la quatrième sur l’activation', async () => {
    await enEssai();

    await rouvrir('/jour/1');
    expect(await screen.findByRole('button', { name: /Continuer/ })).toBeInTheDocument();

    await rouvrir('/jour/4');
    expect(await screen.findByRole('heading', { name: 'Leçon 4 verrouillée' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Demander mon activation' })).toBeInTheDocument();
  });

  it('propose l’application Android depuis le menu', async () => {
    await enEssai();

    await rouvrir('/plus');
    expect(await screen.findByText("Installer l'application")).toBeInTheDocument();
  });

  it('dit qu’aucune version n’est publiée plutôt que d’offrir un lien mort', async () => {
    await enEssai();

    await rouvrir('/telecharger');
    expect(await screen.findByText(/Aucune version n'est encore publiée/)).toBeInTheDocument();
  });

  it('propose le téléchargement dès qu’une adresse est fournie', async () => {
    vi.stubEnv('VITE_URL_APK', 'https://example.test/agricole-dz-360.apk');
    await enEssai();

    await rouvrir('/telecharger');
    const lien = (await screen.findByRole('button', { name: "Télécharger l'application" })).closest(
      'a',
    );
    expect(lien?.getAttribute('href')).toBe('https://example.test/agricole-dz-360.apk');
  });
});

describe('édition APK', () => {
  it('ne se propose pas elle-même au téléchargement', async () => {
    vi.stubEnv('VITE_EDITION', 'apk');
    await enEssai();

    await rouvrir('/plus');
    expect(await screen.findByText('Mon compte')).toBeInTheDocument();
    expect(screen.queryByText("Installer l'application")).not.toBeInTheDocument();
  });
});
