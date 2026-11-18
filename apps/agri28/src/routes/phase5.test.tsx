import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';
import { db } from '@/db/db';
import { clearProfile } from '@/db/repositories/profile';
import { createProject } from '@/db/repositories/project';
import { completeDay } from '@/db/repositories/progress';
import { saveDossierDrafts } from '@/db/repositories/dossier';
import { useCourse } from '@/store/course';
import { usePreferences } from '@/store/preferences';
import { awardBadges } from '@/db/repositories/badges';
import { listProgress } from '@/db/repositories/progress';

async function reset() {
  await Promise.all([
    clearProfile(),
    db.projects.clear(),
    db.progress.clear(),
    db.dossierItems.clear(),
    db.promptEntries.clear(),
    db.badges.clear(),
  ]);
  useCourse.setState({
    project: null,
    progress: [],
    dossier: [],
    prompts: [],
    badges: [],
    freshBadges: [],
    dossierCount: 0,
    loaded: false,
  });
}

async function seedProject() {
  const project = await createProject({
    name: 'Élevage ovin Aïn Defla',
    type: 'ovin',
    scaleValue: 60,
    wilayaCode: '44',
    objective: 'Vendre 40 agneaux en 12 mois',
  });
  await useCourse.getState().load();
  return project;
}

describe('Dossier de projet', () => {
  beforeEach(reset);

  it('invite à créer le projet quand il n’y en a pas', async () => {
    await renderApp('fr', '/dossier');
    expect(await screen.findByText(/Créez votre projet/)).toBeInTheDocument();
  });

  it('annonce un Dossier vide tant qu’aucune journée n’est validée', async () => {
    await seedProject();
    await renderApp('fr', '/dossier');
    expect(await screen.findByText(/Votre Dossier est encore vide/)).toBeInTheDocument();
  });

  it('affiche les briques rangées par famille, avec leur contenu', async () => {
    const project = await seedProject();
    await saveDossierDrafts(project.id, 1, 'day-01', 'fr', [
      {
        kind: 'fiche_projet',
        title: 'Fiche projet',
        blocks: [{ type: 'kv', rows: [{ key: 'Objectif à 12 mois', value: 'Vendre 40 agneaux' }] }],
      },
    ]);
    await saveDossierDrafts(project.id, 9, 'day-09', 'fr', [
      {
        kind: 'budget',
        title: 'Budget',
        blocks: [{ type: 'list', ordered: false, items: ['Aliment', 'Transport'] }],
      },
    ]);
    await useCourse.getState().load();

    await renderApp('fr', '/dossier');

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Fiche projet' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Budget' })).toBeInTheDocument();
    expect(screen.getByText('Vendre 40 agneaux')).toBeInTheDocument();
    expect(screen.getByText('Aliment')).toBeInTheDocument();
    expect(screen.getByText(/Jour 9/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Document Word/ })).toBeInTheDocument();
  });

  it('supprime une brique après confirmation', async () => {
    const user = userEvent.setup();
    const project = await seedProject();
    await saveDossierDrafts(project.id, 1, 'day-01', 'fr', [
      {
        kind: 'fiche_projet',
        title: 'Fiche projet',
        blocks: [{ type: 'paragraph', text: 'À supprimer' }],
      },
    ]);
    await useCourse.getState().load();

    await renderApp('fr', '/dossier');
    await user.click(await screen.findByRole('button', { name: 'Supprimer cette brique' }));
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    await waitFor(() => {
      expect(useCourse.getState().dossier).toHaveLength(0);
    });
    expect(await screen.findByText(/Votre Dossier est encore vide/)).toBeInTheDocument();
  });
});

describe('Carnet de prompts', () => {
  beforeEach(reset);

  it('s’annonce vide avant toute copie', async () => {
    await seedProject();
    await renderApp('fr', '/carnet');
    expect(await screen.findByText(/Aucun prompt pour l'instant/)).toBeInTheDocument();
  });

  it('enregistre un prompt copié pendant une journée', async () => {
    const user = userEvent.setup();
    await seedProject();
    await renderApp('fr', '/jour/1');

    await user.click(await screen.findByRole('button', { name: /Continuer/ }));
    await user.click(await screen.findByRole('button', { name: /Copier le prompt/ }));

    await waitFor(() => {
      expect(useCourse.getState().prompts).toHaveLength(1);
    });
    const entry = useCourse.getState().prompts[0];
    expect(entry?.day).toBe(1);
    expect(entry?.tool).toBe('claude');
    expect(entry?.text).toContain('conseiller agricole');
    expect(entry?.text).not.toContain('{{');
  });

  it('filtre par recherche et par favori', async () => {
    const user = userEvent.setup();
    const project = await seedProject();
    await useCourse.getState().recordPrompt({
      day: 1,
      lessonId: 'day-01',
      promptId: 'p1',
      title: 'Faire relire mon projet',
      tool: 'claude',
      lang: 'fr',
      text: 'Tu es un conseiller agricole…',
    });
    await useCourse.getState().recordPrompt({
      day: 9,
      lessonId: 'day-09',
      promptId: 'p1',
      title: 'La liste des postes',
      tool: 'claude',
      lang: 'fr',
      text: 'Dresse la liste complète de mes postes de dépense.',
    });
    expect(project.id).toBeTruthy();

    await renderApp('fr', '/carnet');
    expect(await screen.findByText('Faire relire mon projet')).toBeInTheDocument();
    expect(screen.getByText('La liste des postes')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Rechercher dans mes prompts'), 'postes');
    await waitFor(() => {
      expect(screen.queryByText('Faire relire mon projet')).not.toBeInTheDocument();
    });
    expect(screen.getByText('La liste des postes')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Rechercher dans mes prompts'));
    await user.click(screen.getAllByRole('button', { name: 'Mettre en favori' })[0]!);
    await user.click(screen.getByLabelText('Favoris seulement'));

    await waitFor(() => {
      expect(screen.getAllByRole('article')).toHaveLength(1);
    });
  });

  it('modifie un prompt puis revient au texte d’origine', async () => {
    const user = userEvent.setup();
    await seedProject();
    await useCourse.getState().recordPrompt({
      day: 1,
      lessonId: 'day-01',
      promptId: 'p1',
      title: 'Faire relire mon projet',
      tool: 'claude',
      lang: 'fr',
      text: 'Texte original',
    });

    await renderApp('fr', '/carnet');
    await user.click(await screen.findByRole('button', { name: 'Modifier' }));

    const editor = screen.getByRole('textbox', { name: 'Faire relire mon projet' });
    await user.clear(editor);
    await user.type(editor, 'Ma version');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => {
      expect(useCourse.getState().prompts[0]?.text).toBe('Ma version');
    });

    await user.click(screen.getByRole('button', { name: 'Modifier' }));
    await user.click(screen.getByRole('button', { name: /texte d'origine/ }));

    await waitFor(() => {
      expect(useCourse.getState().prompts[0]?.text).toBe('Texte original');
    });
  });
});

describe('Badges et certificat', () => {
  beforeEach(reset);

  it('montre les badges verrouillés et le certificat indisponible', async () => {
    await seedProject();
    await renderApp('fr', '/badges');

    expect(await screen.findByText('0 / 28 jours validés')).toBeInTheDocument();
    expect(screen.getAllByText(/Validez les 7 jours/)).toHaveLength(4);
    expect(screen.getByText(/Le certificat devient disponible/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Télécharger le certificat/ })).toBeNull();
  });

  it('décerne le badge de la semaine 1 une fois les 7 jours validés', async () => {
    const project = await seedProject();
    for (let day = 1; day <= 7; day += 1) await completeDay(project.id, day);
    // Même chemin que la validation d'une journée dans le magasin.
    await awardBadges(project.id, await listProgress(project.id));
    await useCourse.getState().load();

    await renderApp('fr', '/badges');

    const week1 = (await screen.findByText(/Semaine 1 · Fondations/)).closest('div');
    expect(within(week1!.parentElement!).getByText(/Obtenu le/)).toBeInTheDocument();
    expect(screen.getByText('7 / 28 jours validés')).toBeInTheDocument();
  });
});

describe('Paramètres : rappel et données', () => {
  beforeEach(reset);

  it('propose le rappel d’agenda et les notifications', async () => {
    await seedProject();
    await renderApp('fr', '/parametres');

    expect(
      await screen.findByRole('button', { name: /Ajouter le rappel à mon agenda/ }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Heure du rappel')).toBeInTheDocument();
    expect(screen.getByText(/Le web ne garantit aucune notification/)).toBeInTheDocument();
  });

  it('enregistre l’heure du rappel', async () => {
    const user = userEvent.setup();
    await seedProject();
    await renderApp('fr', '/parametres');

    const time = await screen.findByLabelText('Heure du rappel');
    await user.clear(time);
    await user.type(time, '06:30');

    await waitFor(() => {
      expect(usePreferences.getState().reminderTime).toBe('06:30');
    });
  });

  it('efface toutes les données après confirmation', async () => {
    const user = userEvent.setup();
    const project = await seedProject();
    await saveDossierDrafts(project.id, 1, 'day-01', 'fr', [
      { kind: 'fiche_projet', title: 'Fiche', blocks: [{ type: 'paragraph', text: 'x' }] },
    ]);
    await useCourse.getState().load();

    await renderApp('fr', '/parametres');
    await user.click(await screen.findByRole('button', { name: 'Tout effacer' }));
    await user.click(screen.getByRole('button', { name: 'Confirmer' }));

    await waitFor(() => {
      expect(useCourse.getState().project).toBeNull();
    });
    expect(await db.dossierItems.count()).toBe(0);
    expect(await db.projects.count()).toBe(0);
  });
});
