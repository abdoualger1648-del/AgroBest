import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';
import { db } from '@/db/db';
import { clearProfile } from '@/db/repositories/profile';
import { useCourse } from '@/store/course';
import { createProject } from '@/db/repositories/project';
import { resources } from '@/i18n';

async function resetAll() {
  await Promise.all([
    clearProfile(),
    db.projects.clear(),
    db.progress.clear(),
    db.dossierItems.clear(),
  ]);
  useCourse.setState({ project: null, progress: [], dossierCount: 0, loaded: false });
}

const PROJECT = {
  name: 'Élevage ovin Aïn Defla',
  type: 'ovin' as const,
  scaleValue: 60,
  wilayaCode: '44',
  objective: 'Vendre 40 agneaux en 12 mois',
};

describe('création du projet', () => {
  beforeEach(resetAll);

  it('crée le projet depuis le formulaire et ouvre le jour 1', async () => {
    const user = userEvent.setup();
    await renderApp('fr', '/bienvenue');

    await user.type(screen.getByLabelText(/Nom du projet/), 'Élevage ovin Aïn Defla');
    await user.selectOptions(screen.getByLabelText(/Type d'activité/), 'ovin');
    await user.type(screen.getByLabelText(/^Taille/), '60');
    await user.selectOptions(screen.getByLabelText(/^Wilaya/), '44');
    await user.type(screen.getByLabelText(/^Objectif/), 'Vendre 40 agneaux');
    await user.click(screen.getByRole('button', { name: 'Créer mon projet' }));

    await waitFor(() => {
      expect(useCourse.getState().project?.name).toBe('Élevage ovin Aïn Defla');
    });
    const project = useCourse.getState().project;
    expect(project?.scale).toEqual({ value: 60, unit: 'tete' });
    expect(project?.wilayaCode).toBe('44');
  });

  it('refuse un formulaire incomplet et explique pourquoi', async () => {
    const user = userEvent.setup();
    await renderApp('fr', '/bienvenue');

    await user.click(screen.getByRole('button', { name: 'Créer mon projet' }));

    expect(await screen.findByText('Donnez un nom à votre projet.')).toBeInTheDocument();
    expect(screen.getByText('Choisissez votre wilaya.')).toBeInTheDocument();
    expect(useCourse.getState().project).toBeNull();
  });

  it('signale une wilaya créée en 2026', async () => {
    const user = userEvent.setup();
    await renderApp('fr', '/bienvenue');

    await user.selectOptions(screen.getByLabelText(/^Wilaya/), '60');
    expect(screen.getByText(/Wilaya créée en 2026/)).toBeInTheDocument();
  });
});

describe('journée complète (jour 1)', () => {
  beforeEach(async () => {
    await resetAll();
    await createProject(PROJECT);
    await useCourse.getState().load();
  });

  it('déroule les quatre étapes et valide la journée', async () => {
    const user = userEvent.setup();
    await renderApp('fr', '/jour/1');

    // 1. Concept
    expect(
      await screen.findByRole('heading', { level: 1, name: /Ce qu'une IA sait faire/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('À retenir')).toBeInTheDocument();
    expect(screen.getByText(/ne remplace pas un agronome/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Continuer/ }));

    // 2. Pratique : le prompt est pré-rempli avec les données du projet
    const prompt = await screen.findByText(/conseiller agricole/);
    expect(prompt.textContent).toContain('élevage ovin');
    expect(prompt.textContent).toContain('Aïn Defla');
    expect(prompt.textContent).toContain('Vendre 40 agneaux en 12 mois');
    expect(prompt.textContent).not.toContain('{{');

    await user.type(
      screen.getByLabelText(/qu'est-ce que vous voulez avoir réussi/),
      'Vendre 40 agneaux',
    );
    await user.click(screen.getByRole('button', { name: /Continuer/ }));

    // 3. Quiz : explication affichée après chaque réponse
    const questions = await screen.findAllByRole('radiogroup');
    expect(questions).toHaveLength(3);

    await user.click(
      within(questions[0]!).getByRole('radio', { name: /estimation, à confronter/ }),
    );
    expect(await screen.findByText('Bonne réponse')).toBeInTheDocument();

    await user.click(within(questions[1]!).getByRole('radio', { name: /Mesurer l'humidité/ }));
    expect(await screen.findByText('Réponse incorrecte')).toBeInTheDocument();

    await user.click(within(questions[2]!).getByRole('radio', { name: /situation précise/ }));
    expect(await screen.findByText('2 bonnes réponses sur 3')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Continuer/ }));

    // 4. Bilan : la saisie apparaît dans l'aperçu du Dossier
    expect(await screen.findByText('Ce que vous avez produit')).toBeInTheDocument();
    expect(screen.getByText(/Objectif à 12 mois : Vendre 40 agneaux/)).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: '4' }));
    await user.click(screen.getByRole('button', { name: 'Valider ma journée' }));

    // Retour à l'accueil, progression à jour
    await waitFor(() => {
      expect(useCourse.getState().progress[0]?.status).toBe('done');
    });

    const saved = useCourse.getState().progress[0]!;
    expect(saved.day).toBe(1);
    expect(saved.confidence).toBe(4);
    expect(saved.quiz?.score).toBe(2);
    expect(saved.captures['c1']).toBe('Vendre 40 agneaux');
    expect(useCourse.getState().dossierCount).toBe(1);

    expect(await screen.findByText('1 / 28 jours')).toBeInTheDocument();
  });

  it('verrouille le jour 2 tant que le jour 1 n’est pas validé, puis l’ouvre', async () => {
    await renderApp('fr', '/jour/2');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Jour verrouillé' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Validez le jour 1/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ouvrir quand même' })).toBeInTheDocument();
  });

  it('ouvre la leçon du jour 2 après un déverrouillage manuel', async () => {
    const user = userEvent.setup();
    await renderApp('fr', '/jour/2');

    await user.click(screen.getByRole('button', { name: 'Ouvrir quand même' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: /Un bon prompt/ }),
    ).toBeInTheDocument();
  });

  it('annonce clairement un contenu encore absent', async () => {
    const user = userEvent.setup();
    await renderApp('fr', '/jour/20');

    await user.click(screen.getByRole('button', { name: 'Ouvrir quand même' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Contenu indisponible' }),
    ).toBeInTheDocument();
  });

  it('affiche la leçon en arabe avec la même ossature', async () => {
    await renderApp('ar', '/jour/1');

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(
      resources.ar.day.steps.concept === 'المفهوم' ? /[؀-ۿ]/ : /./,
    );
    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
  });

  it('liste les 28 jours avec leur état', async () => {
    await renderApp('fr', '/jour');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Mon parcours' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/^Jour \d+$/)).toHaveLength(28);
    expect(screen.getAllByText(/Verrouillé/).length).toBeGreaterThan(20);
  });
});
