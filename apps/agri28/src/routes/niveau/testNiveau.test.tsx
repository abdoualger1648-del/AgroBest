import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, configure, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';
import { db } from '@/db/db';
import { clearProfile, getProfile } from '@/db/repositories/profile';
import { createProject } from '@/db/repositories/project';
import { useCourse } from '@/store/course';
import { usePreferences } from '@/store/preferences';
import { questionsNiveau } from '@/content/testNiveau';
import type { NiveauParcours } from '@/domain/niveau';

/**
 * Test de niveau (phase 12) : la garde, le parcours du test, l'enregistrement
 * du résultat, et l'effet réel sur une leçon.
 */

configure({ asyncUtilTimeout: 5000 });
vi.setConfig({ testTimeout: 30_000 });

const questions = questionsNiveau();

async function repartirDeZero() {
  cleanup();
  await Promise.all([clearProfile(), db.projects.clear(), db.progress.clear()]);
  useCourse.setState({ project: null, projects: [], progress: [], dossierCount: 0, loaded: false });
  usePreferences.setState({ niveauParcours: null, niveauScores: null, niveauEvalueLe: null });
}

/** Répond à toutes les questions en visant le haut ou le bas du barème. */
async function repondreTout(user: ReturnType<typeof userEvent.setup>, sens: 'min' | 'max') {
  for (const [index, question] of questions.entries()) {
    const trie = [...question.options].sort((a, b) =>
      sens === 'min' ? a.points - b.points : b.points - a.points,
    );
    const choisie = trie[0]!;
    await user.click(await screen.findByLabelText(choisie.label.fr));
    const dernier = index === questions.length - 1;
    await user.click(screen.getByRole('button', { name: dernier ? 'Voir mon niveau' : 'Suivant' }));
  }
}

beforeEach(repartirDeZero);

describe('la garde de niveau', () => {
  it('renvoie vers le test tant qu’il n’a pas été passé', async () => {
    await renderApp('fr', '/', { niveau: null });
    expect(await screen.findByRole('heading', { name: 'Test de niveau' })).toBeInTheDocument();
    expect(screen.queryByText('Mon tableau de bord')).not.toBeInTheDocument();
  });

  it('barre aussi la création d’un dossier : l’adresse directe ne contourne rien', async () => {
    // Même raisonnement que D78 : un verrou qui ne tient que dans le bouton
    // n'est pas un verrou. Personne ne doit créer de dossier sans niveau,
    // sinon les variantes de niveau n'auraient aucune valeur à lire.
    await renderApp('fr', '/bienvenue', { niveau: null });
    expect(await screen.findByRole('heading', { name: 'Test de niveau' })).toBeInTheDocument();
  });

  it('laisse les réglages atteignables sans niveau', async () => {
    // Changer de langue ou se déconnecter ne doit jamais exiger de répondre
    // à huit questions d'abord.
    await renderApp('fr', '/parametres', { niveau: null });
    expect(await screen.findByRole('heading', { name: 'Paramètres' })).toBeInTheDocument();
    expect(screen.getByText('Test non encore passé')).toBeInTheDocument();
  });

  it('laisse passer dès qu’un niveau est connu', async () => {
    await renderApp('fr', '/', { niveau: 'intermediaire' });
    expect(screen.queryByRole('heading', { name: 'Test de niveau' })).not.toBeInTheDocument();
  });
});

describe('passer le test', () => {
  it('va de l’introduction au résultat, et enregistre le niveau', async () => {
    const user = userEvent.setup();
    await renderApp('fr', '/test-niveau', { niveau: null });

    await user.click(await screen.findByRole('button', { name: 'Commencer le test' }));
    expect(screen.getByText(`Question 1 sur ${String(questions.length)}`)).toBeInTheDocument();

    await repondreTout(user, 'min');

    expect(await screen.findByRole('heading', { name: 'Votre niveau' })).toBeInTheDocument();
    expect(screen.getByText('Débutant')).toBeInTheDocument();

    // Le niveau est écrit dans le profil, pas seulement dans l'état d'écran :
    // fermer l'application ne doit pas le perdre.
    await waitFor(async () => {
      expect((await getProfile()).niveauParcours).toBe('debutant');
    });
    expect((await getProfile()).niveauEvalueLe).not.toBeNull();
  });

  it('donne « avancé » au haut du barème, et le détail des trois axes', async () => {
    const user = userEvent.setup();
    await renderApp('fr', '/test-niveau', { niveau: null });
    await user.click(await screen.findByRole('button', { name: 'Commencer le test' }));
    await repondreTout(user, 'max');

    expect(await screen.findByText('Avancé')).toBeInTheDocument();
    expect(screen.getByText("Aisance avec l'IA")).toBeInTheDocument();
    expect(screen.getByText('Avancement du projet')).toBeInTheDocument();
    expect(screen.getByText('Suivi déjà en place')).toBeInTheDocument();
  });

  it('interdit d’avancer sans avoir répondu', async () => {
    const user = userEvent.setup();
    await renderApp('fr', '/test-niveau', { niveau: null });
    await user.click(await screen.findByRole('button', { name: 'Commencer le test' }));
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeDisabled();

    await user.click(screen.getByLabelText(questions[0]!.options[0]!.label.fr));
    expect(screen.getByRole('button', { name: 'Suivant' })).toBeEnabled();
  });

  it('revient en arrière sans perdre la réponse déjà donnée', async () => {
    const user = userEvent.setup();
    await renderApp('fr', '/test-niveau', { niveau: null });
    await user.click(await screen.findByRole('button', { name: 'Commencer le test' }));

    const premiere = questions[0]!.options[1]!;
    await user.click(screen.getByLabelText(premiere.label.fr));
    await user.click(screen.getByRole('button', { name: 'Suivant' }));
    expect(screen.getByText(`Question 2 sur ${String(questions.length)}`)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Précédent' }));
    expect(screen.getByLabelText(premiere.label.fr)).toBeChecked();
  });

  it('s’affiche en arabe, en écriture droite-à-gauche', async () => {
    await renderApp('ar', '/test-niveau', { niveau: null });
    expect(await screen.findByRole('heading', { name: 'اختبار المستوى' })).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('rtl');
  });
});

describe('refaire le test depuis les réglages', () => {
  it('montre le niveau actuel et mène au test', async () => {
    const user = userEvent.setup();
    await renderApp('fr', '/parametres', { niveau: 'avance' });

    expect(await screen.findByText('Avancé')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Refaire le test' }));
    expect(await screen.findByRole('heading', { name: 'Test de niveau' })).toBeInTheDocument();
  });
});

describe('effet du niveau sur une leçon', () => {
  async function ouvrirLeJour1(niveau: NiveauParcours) {
    await repartirDeZero();
    await createProject({
      name: 'Mon projet',
      type: 'ovin',
      scaleValue: 40,
      wilayaCode: '26',
      objective: 'Vendre la récolte',
    });
    await useCourse.getState().load();
    await renderApp('fr', '/jour/1', { niveau });
    const user = userEvent.setup();
    await screen.findByRole('heading', { level: 1 });
    // On avance du concept vers la pratique comme un utilisateur : par le
    // bouton « Continuer », exactement comme dayFlow.test.tsx.
    await user.click(await screen.findByRole('button', { name: /Continuer/ }));
    // La section « Pratique » porte un titre lisible par les lecteurs
    // d'écran : c'est l'ancre stable qui dit que l'étape est bien affichée.
    await screen.findByRole('heading', { name: 'Pratique' });
  }

  it('un débutant reçoit l’aide pas-à-pas, et aucun défi', async () => {
    await ouvrirLeJour1('debutant');
    expect(await screen.findByText('Pas à pas')).toBeInTheDocument();
    expect(screen.getByText(/appuyez sur le bouton « Copier »/i)).toBeInTheDocument();
    expect(screen.queryByText('Pour aller plus loin')).not.toBeInTheDocument();
  });

  it('un avancé reçoit le défi, et aucune aide', async () => {
    await ouvrirLeJour1('avance');
    expect(await screen.findByText('Pour aller plus loin')).toBeInTheDocument();
    expect(screen.queryByText('Pas à pas')).not.toBeInTheDocument();
  });

  it('un intermédiaire garde le parcours standard, sans aide ni défi', async () => {
    await ouvrirLeJour1('intermediaire');
    expect(screen.queryByText('Pas à pas')).not.toBeInTheDocument();
    expect(screen.queryByText('Pour aller plus loin')).not.toBeInTheDocument();
  });
});
