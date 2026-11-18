import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, configure, screen } from '@testing-library/react';
import { renderApp } from '@/test/renderApp';
import { db } from '@/db/db';
import { clearProfile } from '@/db/repositories/profile';
import { createProject } from '@/db/repositories/project';
import { useCourse } from '@/store/course';

/**
 * Édition vitrine : le site public, sans compte, limité aux trois premières
 * leçons.
 *
 * Ces tests vérifient le comportement de l'interface. Le fait que les leçons
 * 4 à 28 ne soient pas seulement masquées mais **absentes du build** se
 * vérifie ailleurs, sur `dist/` : `npm run check:bundle` avec
 * `VITE_EDITION=vitrine`, contre-épreuve comprise.
 */

configure({ asyncUtilTimeout: 5000 });

// Ces parcours montent l'application entière et traversent IndexedDB. La
// limite globale d'un test vaut 5 s par défaut, soit exactement l'attente
// maximale des recherches ci-dessous : les deux se télescopaient, et le test
// expirait avant que la recherche ait fini d'attendre.
vi.setConfig({ testTimeout: 20_000 });

beforeEach(async () => {
  vi.stubEnv('VITE_EDITION', 'vitrine');
  await Promise.all([clearProfile(), db.projects.clear(), db.progress.clear(), db.compte.clear()]);
  useCourse.setState({ project: null, progress: [], dossierCount: 0, loaded: false });
  await createProject({
    name: 'Élevage ovin Aïn Defla',
    type: 'ovin',
    scaleValue: 60,
    wilayaCode: '44',
    objective: 'Vendre 40 agneaux',
  });
  await useCourse.getState().load();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function rouvrir(route: string) {
  cleanup();
  await renderApp('fr', route);
}

describe('vitrine', () => {
  it('ne demande aucun compte : l’accueil s’ouvre directement', async () => {
    await renderApp('fr', '/');
    expect(await screen.findByText('Progression')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Votre compte' })).not.toBeInTheDocument();
  });

  it('annonce la démonstration sur l’accueil', async () => {
    await renderApp('fr', '/');
    expect(await screen.findByText('Démonstration')).toBeInTheDocument();
    expect(screen.getByText(/Les 3 premières leçons sont ouvertes ici/)).toBeInTheDocument();
  });

  it('ouvre la leçon 1 et arrête la leçon 4', async () => {
    await renderApp('fr', '/jour/1');
    expect(await screen.findByRole('button', { name: /Continuer/ })).toBeInTheDocument();

    await rouvrir('/jour/4');
    expect(
      await screen.findByRole('heading', { name: "Leçon 4 — dans l'application" }),
    ).toBeInTheDocument();
  });

  it('ne propose jamais de créer un compte', async () => {
    await renderApp('fr', '/jour/4');
    await screen.findByRole('heading', { name: "Leçon 4 — dans l'application" });
    expect(screen.getByRole('button', { name: "Télécharger l'application" })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Créer mon compte' })).not.toBeInTheDocument();

    await rouvrir('/plus');
    expect(await screen.findByText('Paramètres')).toBeInTheDocument();
    expect(screen.queryByText('Mon compte')).not.toBeInTheDocument();
  });

  it('marque les jours suivants « dans l’application » dans la liste', async () => {
    await renderApp('fr', '/jour');

    // La frontière est entre 3 et 4 : le troisième jour n'est pas marqué,
    // le quatrième l'est. Sans cette contre-épreuve, un marquage de TOUS les
    // jours passerait le test.
    const troisieme = (await screen.findByText('Jour 3')).closest('li');
    expect(troisieme?.textContent).not.toContain("Dans l'application");

    const quatrieme = screen.getByText('Jour 4').closest('li');
    expect(quatrieme?.textContent).toContain("Dans l'application");
    expect(quatrieme?.querySelector('a')?.getAttribute('href')).toContain('/telecharger');
  });

  it('dit qu’aucune version n’est publiée plutôt que d’offrir un lien mort', async () => {
    await renderApp('fr', '/telecharger');
    expect(await screen.findByText(/Aucune version n'est encore publiée/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: "Télécharger l'application" }),
    ).not.toBeInTheDocument();
  });

  it('propose le téléchargement dès qu’une adresse est fournie', async () => {
    vi.stubEnv('VITE_URL_APK', 'https://example.test/agricole-dz-360.apk');
    await renderApp('fr', '/telecharger');

    const lien = (await screen.findByRole('button', { name: "Télécharger l'application" })).closest(
      'a',
    );
    expect(lien?.getAttribute('href')).toBe('https://example.test/agricole-dz-360.apk');
    expect(screen.queryByText(/Aucune version n'est encore publiée/)).not.toBeInTheDocument();
  });

  it('prévient de l’activation avant même l’installation', async () => {
    await renderApp('fr', '/telecharger');
    expect(await screen.findByText('Après les 3 premières leçons')).toBeInTheDocument();
  });
});
