import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { completeDayOne, createProject, switchToArabic } from './helpers';

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
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
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
    await page.goto('./bienvenue');
    const results = await audit(page);
    expect(describeViolations(results)).toBe('');
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
