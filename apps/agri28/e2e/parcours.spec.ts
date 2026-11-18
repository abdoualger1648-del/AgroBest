import { expect, test, type Page } from '@playwright/test';

async function createProject(page: Page) {
  await page.goto('./bienvenue');
  await page.getByLabel(/Nom du projet/).fill('Élevage ovin Aïn Defla');
  await page.getByLabel(/^Taille/).fill('60');
  await page.getByLabel(/^Wilaya/).selectOption('44');
  await page.getByLabel(/^Objectif/).fill('Vendre 40 agneaux en 12 mois');
  await page.getByRole('button', { name: 'Créer mon projet' }).click();
  await expect(page).toHaveURL(/\/jour\/1$/);
}

test.describe('parcours', () => {
  test('crée un projet, déroule le jour 1 et le valide', async ({ page }) => {
    await createProject(page);

    // Le minuteur de 15 minutes est visible dès l'ouverture.
    await expect(page.getByText(/^1[45]:\d{2}$/)).toBeVisible();

    await page.getByRole('button', { name: /Continuer/ }).click();

    // Le prompt est pré-rempli avec les données du projet.
    const prompt = page.locator('pre').first();
    await expect(prompt).toContainText('élevage ovin');
    await expect(prompt).toContainText('Aïn Defla');
    await expect(prompt).not.toContainText('{{');

    await page.getByLabel(/qu'est-ce que vous voulez avoir réussi/).fill('Vendre 40 agneaux');
    await page.getByRole('button', { name: /Continuer/ }).click();

    const groups = page.getByRole('radiogroup');
    await groups
      .nth(0)
      .getByRole('radio', { name: /estimation, à confronter/ })
      .check();
    await expect(page.getByText('Bonne réponse')).toBeVisible();
    await groups
      .nth(1)
      .getByRole('radio', { name: /Rédiger la demande/ })
      .check();
    await groups
      .nth(2)
      .getByRole('radio', { name: /situation précise/ })
      .check();
    await expect(page.getByText('3 bonnes réponses sur 3')).toBeVisible();

    await page.getByRole('button', { name: /Continuer/ }).click();
    await page
      .getByRole('radiogroup', { name: 'Note de confiance' })
      .getByText('4', { exact: true })
      .click();
    await page.getByRole('button', { name: 'Valider ma journée' }).click();

    // Retour à l'accueil avec la progression à jour.
    await expect(page).toHaveURL(/\/AgroBest\/$/);
    await expect(page.getByText('1 / 28 jours')).toBeVisible();
    await expect(page.getByText(/Reprendre le jour 2/)).toBeVisible();
  });

  test('conserve la progression après rechargement et hors ligne', async ({ page, context }) => {
    await createProject(page);
    await page.goto('./');
    await expect(page.getByText('0 / 28 jours')).toBeVisible();

    await page.reload();
    await expect(page.getByText(/Élevage ovin/)).toBeVisible();

    // Une fois le service worker actif, l'application se relance sans réseau.
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
      timeout: 15_000,
    });
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText(/Élevage ovin/)).toBeVisible();
    await context.setOffline(false);
  });

  test('verrouille le jour 2 puis l’ouvre à la demande', async ({ page }) => {
    await createProject(page);
    await page.goto('./jour/2');

    await expect(page.getByRole('heading', { level: 1, name: 'Jour verrouillé' })).toBeVisible();

    // Le clic peut se perdre pendant le montage de l'écran : on réessaie.
    await expect(async () => {
      await page.getByRole('button', { name: 'Ouvrir quand même' }).click();
      await expect(page.getByRole('heading', { level: 1, name: /Un bon prompt/ })).toBeVisible({
        timeout: 2000,
      });
    }).toPass({ timeout: 15_000 });
  });

  test('affiche le jour 1 en arabe, en RTL, sans débordement', async ({ page }) => {
    await createProject(page);
    await page.goto('./parametres');
    await expect(async () => {
      await page.getByRole('radio', { name: 'العربية' }).check();
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl', { timeout: 1000 });
    }).toPass({ timeout: 15_000 });

    await page.goto('./jour/1');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/[؀-ۿ]/);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
