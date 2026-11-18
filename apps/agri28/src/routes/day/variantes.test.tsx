import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, configure, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';
import { db } from '@/db/db';
import { clearProfile } from '@/db/repositories/profile';
import { createProject } from '@/db/repositories/project';
import { useCourse } from '@/store/course';
import type { ProjectType } from '@/domain/types';

/**
 * Le parcours s'adapte au type d'activité, sur le contenu réel du jour 1.
 * Ce test ne fabrique rien : il lit les variantes écrites dans
 * `content/days/day-01.*.json`.
 */

configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 20_000 });

async function ouvrirLeJour1(type: ProjectType, lang: 'fr' | 'ar' = 'fr') {
  cleanup();
  await Promise.all([clearProfile(), db.projects.clear(), db.progress.clear()]);
  useCourse.setState({ project: null, projects: [], progress: [], dossierCount: 0, loaded: false });
  await createProject({
    name: 'Mon projet',
    type,
    scaleValue: 40,
    wilayaCode: '26',
    objective: 'Vendre la récolte',
  });
  await useCourse.getState().load();
  await renderApp(lang, '/jour/1');
}

beforeEach(async () => {
  await Promise.all([clearProfile(), db.projects.clear(), db.progress.clear()]);
});

describe('le parcours s’adapte au type d’activité', () => {
  it('un apiculteur lit un exemple de rucher', async () => {
    await ouvrirLeJour1('apiculture');
    expect(await screen.findByText(/Yacine conduit 40 ruches à Médéa/)).toBeInTheDocument();
    expect(screen.queryByText(/Kamel élève 60 brebis/)).not.toBeInTheDocument();
  });

  it('un maraîcher lit un exemple de maraîchage', async () => {
    await ouvrirLeJour1('maraichage');
    expect(await screen.findByText(/Nadia cultive 2 hectares de maraîchage/)).toBeInTheDocument();
  });

  it('un type sans variante garde le texte générique', async () => {
    // Le repli est le contenu générique : une variante absente n'est jamais
    // une page vide.
    await ouvrirLeJour1('ovin');
    expect(await screen.findByText(/Kamel élève 60 brebis/)).toBeInTheDocument();
  });

  it('la question posée change aussi, pas seulement l’exemple', async () => {
    const user = userEvent.setup();
    await ouvrirLeJour1('apiculture');
    await user.click(await screen.findByRole('button', { name: /Continuer/ }));

    expect(await screen.findByText(/récolte, nombre de ruches, vente/)).toBeInTheDocument();
  });

  it('la variante existe aussi en arabe', async () => {
    await ouvrirLeJour1('apiculture', 'ar');
    expect(await screen.findByText(/ياسين يدير 40 خليّة في المدية/)).toBeInTheDocument();
  });
});
