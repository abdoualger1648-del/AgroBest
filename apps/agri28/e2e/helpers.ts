import { expect, type Page } from '@playwright/test';

/** Crée le projet de test et laisse l'application sur le jour 1. */
export async function createProject(page: Page): Promise<void> {
  await page.goto('./bienvenue');
  await page.getByLabel(/Nom du projet/).fill('Élevage ovin Aïn Defla');
  await page.getByLabel(/^Taille/).fill('60');
  await page.getByLabel(/^Wilaya/).selectOption('44');
  await page.getByLabel(/^Objectif/).fill('Vendre 40 agneaux en 12 mois');
  await page.getByRole('button', { name: 'Créer mon projet' }).click();
  await page.waitForURL(/jour\/1$/);
}

/** Déroule le jour 1 jusqu'à la validation. */
export async function completeDayOne(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Continuer/ }).click();
  await page.getByLabel(/qu'est-ce que vous voulez avoir réussi/).fill('Vendre 40 agneaux');
  await page.getByRole('button', { name: /Continuer/ }).click();
  const groups = page.getByRole('radiogroup');
  await groups.nth(0).getByRole('radio', { name: /estimation, à confronter/ }).check();
  await groups.nth(1).getByRole('radio', { name: /Rédiger la demande/ }).check();
  await groups.nth(2).getByRole('radio', { name: /situation précise/ }).check();
  await page.getByRole('button', { name: /Continuer/ }).click();
  await page
    .getByRole('radiogroup', { name: 'Note de confiance' })
    .getByText('4', { exact: true })
    .click();
  await page.getByRole('button', { name: 'Valider ma journée' }).click();

  // L'écriture en base est asynchrone : on attend le retour à l'accueil avec la
  // progression à jour avant de rendre la main, sinon un rechargement immédiat
  // peut interrompre l'enregistrement du Dossier.
  await expect(page.getByText('1 / 28 jours')).toBeVisible();
}

/** Bascule l'interface en arabe depuis les paramètres. */
export async function switchToArabic(page: Page): Promise<void> {
  await page.goto('./parametres');
  await page.getByRole('radio', { name: 'العربية' }).check();
}

/**
 * Attend que le service worker contrôle la page. Avec `clientsClaim: false`,
 * il ne prend la main qu'à la navigation suivant son activation : on attend
 * donc son installation, puis on recharge.
 */
export async function waitForServiceWorker(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  if (!(await page.evaluate(() => navigator.serviceWorker.controller !== null))) {
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, {
      timeout: 20_000,
    });
  }
}
