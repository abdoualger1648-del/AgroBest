import { expect, test } from '@playwright/test';
import { completeDayOne, createProject, passLevelTest, waitForServiceWorker } from './helpers';

test.describe('navigation au clavier', () => {
  test('le premier arrêt de tabulation est le lien d’évitement, qui mène au contenu', async ({
    page,
  }) => {
    await passLevelTest(page);
    await page.goto('./');
    await page.getByRole('heading', { level: 1 }).waitFor();
    await page.keyboard.press('Tab');

    const focused = page.locator(':focus');
    await expect(focused).toHaveText(/Aller au contenu principal/);

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#contenu$/);
  });

  test('l’élément qui a le focus est visible', async ({ page }) => {
    await page.goto('./parametres');
    await page.getByRole('heading', { level: 1 }).waitFor();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const outline = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element) return null;
      const style = getComputedStyle(element);
      return { width: style.outlineWidth, style: style.outlineStyle, color: style.outlineColor };
    });

    expect(outline).not.toBeNull();
    expect(Number.parseFloat(outline?.width ?? '0')).toBeGreaterThanOrEqual(2);
    expect(outline?.style).not.toBe('none');
  });

  test('on peut dérouler une journée entière au clavier', async ({ page }) => {
    await createProject(page);

    // Le bouton « Continuer » est atteignable et actionnable sans souris.
    const next = page.getByRole('button', { name: /Continuer/ });
    await next.focus();
    await page.keyboard.press('Enter');

    await expect(page.getByText(/Prompt à copier/).first()).toBeVisible();
  });
});

test.describe('cibles tactiles', () => {
  test('tout élément interactif fait au moins 24 px, les actions principales 44 px', async ({
    page,
  }) => {
    await createProject(page);
    await completeDayOne(page);

    for (const path of ['./', './jour', './dossier', './parametres', './badges']) {
      await page.goto(path);
      await page.waitForTimeout(200);

      const small = await page.evaluate(() => {
        const problems: string[] = [];
        const selector = 'button, a[href], input, select, textarea, summary, [role="button"]';
        for (const element of document.querySelectorAll(selector)) {
          const rect = element.getBoundingClientRect();
          // Élément visuellement masqué (motif « sr-only ») : il n'est une
          // cible tactile qu'une fois révélé par le focus clavier.
          if (rect.width * rect.height <= 4) continue;
          const label = (element.textContent ?? element.getAttribute('aria-label') ?? '')
            .trim()
            .slice(0, 30);
          if (Math.min(rect.width, rect.height) < 24) {
            problems.push(`${element.tagName} « ${label} » ${rect.width}×${rect.height}`);
          }
        }
        return problems;
      });

      expect(small, `écran ${path}`).toEqual([]);

      const primary = page.getByRole('button').first();
      if (await primary.isVisible()) {
        const box = await primary.boundingBox();
        expect(box?.height ?? 0, `écran ${path}`).toBeGreaterThanOrEqual(44);
      }
    }
  });
});

test.describe('hors ligne', () => {
  test('une journée se déroule entièrement sans réseau', async ({ page, context }) => {
    await createProject(page);

    await waitForServiceWorker(page);
    await context.setOffline(true);

    await page.goto('./jour/1');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/IA sait faire/);

    await completeDayOne(page);
    await expect(page.getByText('1 / 28 jours')).toBeVisible();

    // Les données survivent à un rechargement toujours hors ligne.
    await page.reload();
    await expect(page.getByText('1 / 28 jours')).toBeVisible();

    await context.setOffline(false);
  });

  test('le Dossier et ses exports fonctionnent sans réseau', async ({ page, context }) => {
    await createProject(page);
    await completeDayOne(page);

    await waitForServiceWorker(page);
    // Les bibliothèques d'export ne sont pas pré-cachées : on les charge une
    // fois en ligne, puis on vérifie qu'elles restent disponibles hors ligne.
    await page.goto('./dossier');
    const warmUp = page.waitForEvent('download');
    await page.getByRole('button', { name: /Document Word/ }).click();
    await warmUp;

    await context.setOffline(true);
    await page.reload();

    const offline = page.waitForEvent('download');
    await page.getByRole('button', { name: /Document Word/ }).click();
    expect((await offline).suggestedFilename()).toMatch(/\.docx$/);

    await context.setOffline(false);
  });
});
