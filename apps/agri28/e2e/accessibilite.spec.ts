import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { completeDayOne, createProject, passLevelTest, switchToArabic } from './helpers';

/** Écrans audités, une fois le projet créé et le jour 1 validé. */
const SCREENS = [
  { path: './', name: 'accueil' },
  { path: './jour', name: 'parcours' },
  { path: './jour/2', name: 'journée' },
  { path: './dossier', name: 'dossier' },
  { path: './carnet', name: 'carnet' },
  { path: './modeles', name: 'modèles' },
  { path: './badges', name: 'badges' },
  { path: './parametres', name: 'paramètres' },
  { path: './plus', name: 'plus' },
];

async function audit(page: Page) {
  return new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
}

function describeViolations(results: Awaited<ReturnType<typeof audit>>): string {
  return results.violations
    .map(
      (violation) =>
        `${violation.id} (${violation.impact ?? '?'}) : ${violation.help}\n  ` +
        violation.nodes
          .slice(0, 3)
          .map((node) => node.target.join(' '))
          .join('\n  '),
    )
    .join('\n');
}

test.describe('accessibilité', () => {
  test('aucune violation sur le parcours de création du projet', async ({ page }) => {
    // Sans franchir la garde, l'analyse porterait sur le test de niveau au
    // lieu du formulaire de projet — et passerait, en examinant le mauvais
    // écran.
    await passLevelTest(page);
    await page.goto('./bienvenue');
    const results = await audit(page);
    expect(describeViolations(results)).toBe('');
  });

  test('aucune violation sur le test de niveau : intro, question, résultat', async ({ page }) => {
    // Trois états bien distincts, et le seul écran du produit construit autour
    // de boutons radio et d'une barre de progression : il mérite son audit.
    await page.goto('./test-niveau');
    expect(describeViolations(await audit(page)), 'intro').toBe('');

    await page.getByRole('button', { name: 'Commencer le test' }).click();
    expect(describeViolations(await audit(page)), 'question').toBe('');

    await passLevelTest(page);
    expect(describeViolations(await audit(page)), 'résultat').toBe('');
  });

  test('aucune violation sur le test de niveau en arabe et en thème sombre', async ({ page }) => {
    await page.goto('./parametres');
    await page.getByRole('radio', { name: 'Sombre' }).check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await switchToArabic(page);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    await page.goto('./test-niveau');
    expect(describeViolations(await audit(page)), 'intro AR sombre').toBe('');

    await page.getByRole('button', { name: 'ابدأ الاختبار' }).click();
    await page.waitForTimeout(250);
    expect(describeViolations(await audit(page)), 'question AR sombre').toBe('');
  });

  test('aucune violation sur les écrans principaux, en français', async ({ page }) => {
    await createProject(page);
    await completeDayOne(page);

    for (const screen of SCREENS) {
      await page.goto(screen.path);
      await page.waitForTimeout(250);
      const results = await audit(page);
      expect(describeViolations(results), `écran ${screen.name}`).toBe('');
    }
  });

  test('aucune violation en arabe, en écriture droite-à-gauche', async ({ page }) => {
    await createProject(page);
    await switchToArabic(page);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    for (const screen of ['./', './jour', './jour/1', './dossier', './badges']) {
      await page.goto(screen);
      await page.waitForTimeout(250);
      const results = await audit(page);
      expect(describeViolations(results), `écran ${screen}`).toBe('');
    }
  });

  test('aucune violation en thème sombre', async ({ page }) => {
    await createProject(page);
    await page.goto('./parametres');
    await page.getByRole('radio', { name: 'Sombre' }).check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    for (const screen of ['./', './jour/1', './parametres']) {
      await page.goto(screen);
      await page.waitForTimeout(250);
      const results = await audit(page);
      expect(describeViolations(results), `écran ${screen}`).toBe('');
    }
  });
});
