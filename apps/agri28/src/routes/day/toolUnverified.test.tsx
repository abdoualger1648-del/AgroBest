import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type * as CatalogModule from '@/content/catalog';

/**
 * Depuis que la disponibilité des quatre outils est confirmée, plus aucune
 * entrée de `tools.json` ne porte `availabilityDZ: 'a_verifier'` : l'encart
 * d'avertissement n'est donc plus atteignable par le contenu réel. La branche
 * doit rester couverte, car un outil ajouté demain repartira de ce statut.
 * On simule donc le catalogue, comme pour l'écran « contenu indisponible ».
 */
const availability: { current: 'a_verifier' | 'oui' } = vi.hoisted(() => ({
  current: 'a_verifier',
}));

vi.mock('@/content/catalog', async (importOriginal) => {
  const actual = await importOriginal<typeof CatalogModule>();
  return {
    ...actual,
    getTool: (id: string) => {
      const tool = actual.getTool(id);
      return tool ? { ...tool, availabilityDZ: availability.current } : tool;
    },
  };
});

const { renderApp } = await import('@/test/renderApp');
const { db } = await import('@/db/db');
const { clearProfile } = await import('@/db/repositories/profile');
const { createProject } = await import('@/db/repositories/project');
const { useCourse } = await import('@/store/course');

const AVERTISSEMENT = /Disponibilité de cet outil en Algérie non confirmée/i;

async function ouvrirLaPratique() {
  const user = userEvent.setup();
  await renderApp('fr', '/jour/1');
  await user.click(await screen.findByRole('button', { name: /Continuer/ }));
  return user;
}

describe('outil à la disponibilité non confirmée', () => {
  beforeEach(async () => {
    await Promise.all([clearProfile(), db.projects.clear(), db.progress.clear()]);
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

  it('avertit quand la disponibilité en Algérie n’est pas confirmée', async () => {
    availability.current = 'a_verifier';
    await ouvrirLaPratique();
    expect(await screen.findByText(AVERTISSEMENT)).toBeInTheDocument();
  });

  it('n’affiche rien quand la disponibilité est confirmée', async () => {
    availability.current = 'oui';
    await ouvrirLaPratique();
    expect(await screen.findByRole('button', { name: /Copier/ })).toBeInTheDocument();
    expect(screen.queryByText(AVERTISSEMENT)).not.toBeInTheDocument();
  });
});
