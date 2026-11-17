import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '@/test/renderApp';
import { clearProfile } from '@/db/repositories/profile';
import { resources } from '@/i18n';

describe('application', () => {
  beforeEach(async () => {
    await clearProfile();
    localStorage.clear();
    document.documentElement.setAttribute('lang', 'fr');
    document.documentElement.setAttribute('dir', 'ltr');
  });

  it('affiche l’accueil et la navigation principale en français', async () => {
    await renderApp('fr');

    expect(
      screen.getByRole('heading', { level: 1, name: resources.fr.common.appName }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: resources.fr.common.a11y.mainNavigation }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: resources.fr.nav.home })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('passe l’interface en arabe et en écriture droite-à-gauche', async () => {
    await renderApp('ar');

    expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    expect(document.documentElement).toHaveAttribute('lang', 'ar');
    expect(
      screen.getByRole('heading', { level: 1, name: resources.ar.common.appName }),
    ).toBeInTheDocument();
  });

  it('change de langue depuis les paramètres et met à jour la direction', async () => {
    const user = userEvent.setup();
    await renderApp('fr', '/parametres');

    expect(document.documentElement).toHaveAttribute('dir', 'ltr');
    await user.click(screen.getByRole('radio', { name: resources.fr.common.languages.ar }));

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('dir', 'rtl');
    });
    expect(document.documentElement).toHaveAttribute('lang', 'ar');
    expect(localStorage.getItem('agri28.lang')).toBe('ar');
  });

  it('change de thème depuis les paramètres', async () => {
    const user = userEvent.setup();
    await renderApp('fr', '/parametres');

    await user.click(screen.getByRole('radio', { name: resources.fr.settings.theme.dark }));

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });
    expect(localStorage.getItem('agri28.theme')).toBe('dark');
  });

  it('affiche une page claire pour une adresse inconnue', async () => {
    await renderApp('fr', '/adresse-qui-nexiste-pas');

    expect(
      screen.getByRole('heading', { level: 1, name: resources.fr.screens.notFound.title }),
    ).toBeInTheDocument();
  });

  it('ouvre les écrans encore vides avec leur promesse', async () => {
    await renderApp('fr', '/dossier');

    expect(
      screen.getByRole('heading', { level: 1, name: resources.fr.screens.dossier.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(resources.fr.screens.dossier.description)).toBeInTheDocument();
  });
});
