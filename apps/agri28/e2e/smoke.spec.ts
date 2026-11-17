import { expect, test } from '@playwright/test';

test.describe('squelette de l’application', () => {
  test('affiche l’accueil et navigue avec la barre du bas', async ({ page }) => {
    await page.goto('./');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();

    await nav.getByRole('link', { name: 'Dossier' }).click();
    await expect(page).toHaveURL(/\/dossier$/);
    await expect(page.getByRole('heading', { level: 1, name: /Dossier de projet/ })).toBeVisible();
  });

  test('bascule en arabe, passe en RTL et garde le choix après rechargement', async ({ page }) => {
    await page.goto('./parametres');

    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await page.getByRole('radio', { name: 'العربية' }).check();

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { level: 1, name: 'الإعدادات' })).toBeVisible();
  });

  test('bascule en thème sombre et le conserve', async ({ page }) => {
    await page.goto('./parametres');

    await page.getByRole('radio', { name: 'Sombre' }).check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('ouvre un lien profond directement (chemin de base GitHub Pages)', async ({ page }) => {
    const response = await page.goto('./modeles');

    expect(response?.status()).toBeLessThan(400);
    await expect(
      page.getByRole('heading', { level: 1, name: /Bibliothèque de modèles/ }),
    ).toBeVisible();
  });

  test('expose un manifeste et enregistre le service worker', async ({ page }) => {
    await page.goto('./');

    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestHref).toBeTruthy();

    const manifestResponse = await page.request.get(new URL(manifestHref!, page.url()).toString());
    expect(manifestResponse.ok()).toBe(true);
    const manifest = (await manifestResponse.json()) as { name: string; icons: unknown[] };
    expect(manifest.name).toContain('28 jours');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);

    await expect
      .poll(
        () =>
          page.evaluate(
            () =>
              navigator.serviceWorker.controller !== null ||
              navigator.serviceWorker.getRegistrations().then((r) => r.length > 0),
          ),
        {
          timeout: 15_000,
        },
      )
      .toBeTruthy();
  });

  test('n’a aucun défilement horizontal en arabe sur mobile', async ({ page }) => {
    await page.goto('./parametres');
    await page.getByRole('radio', { name: 'العربية' }).check();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
