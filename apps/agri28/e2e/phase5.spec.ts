import { expect, test, type Page } from '@playwright/test';
import { passLevelTest } from './helpers';

async function createProject(page: Page) {
  await passLevelTest(page);
  await page.goto('./bienvenue');
  await page.getByLabel(/Nom du projet/).fill('Élevage ovin Aïn Defla');
  await page.getByLabel(/^Taille/).fill('60');
  await page.getByLabel(/^Wilaya/).selectOption('44');
  await page.getByLabel(/^Objectif/).fill('Vendre 40 agneaux en 12 mois');
  await page.getByRole('button', { name: 'Créer mon projet' }).click();
  await page.waitForURL(/jour\/1$/);
}

/** Déroule le jour 1 jusqu'à la validation, pour alimenter le Dossier. */
async function completeDayOne(page: Page) {
  await page.getByRole('button', { name: /Continuer/ }).click();
  await page.getByLabel(/qu'est-ce que vous voulez avoir réussi/).fill('Vendre 40 agneaux');
  await page.getByRole('button', { name: /Continuer/ }).click();
  const groups = page.getByRole('radiogroup');
  await groups
    .nth(0)
    .getByRole('radio', { name: /estimation, à confronter/ })
    .check();
  await groups
    .nth(1)
    .getByRole('radio', { name: /Rédiger la demande/ })
    .check();
  await groups
    .nth(2)
    .getByRole('radio', { name: /situation précise/ })
    .check();
  await page.getByRole('button', { name: /Continuer/ }).click();
  await page.getByRole('button', { name: 'Valider ma journée' }).click();
  await expect(page.getByText('1 / 28 jours')).toBeVisible();
}

test.describe('Dossier, carnet et exports', () => {
  test('exporte le Dossier en Word et en tableur', async ({ page }) => {
    await createProject(page);
    await completeDayOne(page);

    await page.goto('./dossier');
    await expect(page.getByRole('heading', { level: 2, name: 'Fiche projet' })).toBeVisible();

    const docx = page.waitForEvent('download');
    await page.getByRole('button', { name: /Document Word/ }).click();
    const docxFile = await docx;
    expect(docxFile.suggestedFilename()).toMatch(/\.docx$/);

    const xlsx = page.waitForEvent('download');
    await page.getByRole('button', { name: /Tableur/ }).click();
    const xlsxFile = await xlsx;
    expect(xlsxFile.suggestedFilename()).toMatch(/\.xlsx$/);
  });

  test('enregistre dans le carnet le prompt copié pendant la journée', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await createProject(page);

    await page.getByRole('button', { name: /Continuer/ }).click();
    await page.getByRole('button', { name: /Copier le prompt/ }).click();
    await expect(page.getByText('Prompt copié').first()).toBeVisible();

    await page.goto('./carnet');
    await expect(page.getByRole('heading', { level: 3 }).first()).toBeVisible();
    await expect(page.getByText(/Jour 1/).first()).toBeVisible();
  });
});

test.describe('Sauvegarde et rappel', () => {
  test('télécharge une sauvegarde puis efface les données', async ({ page }) => {
    await createProject(page);
    await page.goto('./parametres');

    const backup = page.waitForEvent('download');
    await page.getByRole('button', { name: /Exporter une sauvegarde/ }).click();
    expect((await backup).suggestedFilename()).toMatch(/\.json$/);

    await page.getByRole('button', { name: 'Tout effacer' }).click();
    await page.getByRole('button', { name: 'Confirmer' }).click();
    await expect(page.getByText('Données effacées.')).toBeVisible();

    // « Effacer toutes mes données » efface AUSSI le niveau : on repart donc
    // par le test de niveau, comme une installation neuve. C'est cohérent —
    // un effacement complet est un vrai recommencement — et c'est le
    // comportement que ce test fige.
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1, name: 'Test de niveau' })).toBeVisible();

    await passLevelTest(page);
    await page.goto('./');
    await expect(page.getByRole('link', { name: /Créer mon projet/ })).toBeVisible();
  });

  test('télécharge le rappel d’agenda', async ({ page }) => {
    await createProject(page);
    await page.goto('./parametres');

    const ics = page.waitForEvent('download');
    await page.getByRole('button', { name: /Ajouter le rappel à mon agenda/ }).click();
    expect((await ics).suggestedFilename()).toMatch(/\.ics$/);
  });
});

test.describe('Certificat', () => {
  test('produit un PDF une fois les 28 jours validés', async ({ page }) => {
    await createProject(page);

    // Les 28 jours sont écrits directement dans la base : l'objet du test est
    // la production du PDF, pas le déroulé du parcours.
    await page.evaluate(async () => {
      const projectId = await new Promise<string>((resolve, reject) => {
        const request = indexedDB.open('agri28');
        request.onerror = () => reject(new Error('ouverture impossible'));
        request.onsuccess = () => {
          const database = request.result;
          const store = database.transaction('projects', 'readonly').objectStore('projects');
          const all = store.getAll();
          all.onsuccess = () => resolve((all.result[0] as { id: string }).id);
          all.onerror = () => reject(new Error('projet introuvable'));
        };
      });

      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('agri28');
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction(['progress', 'badges'], 'readwrite');
          const progress = transaction.objectStore('progress');
          const badges = transaction.objectStore('badges');

          for (let day = 1; day <= 28; day += 1) {
            progress.put({
              id: `${projectId}:${String(day).padStart(2, '0')}`,
              projectId,
              day,
              week: Math.ceil(day / 7),
              status: 'done',
              unlocked: false,
              timeSpentSec: 900,
              sectionsDone: { concept: true, practice: true, quiz: true, review: true },
              captures: {},
              completedAt: Date.now(),
            });
          }
          for (const badge of ['week-1', 'week-2', 'week-3', 'week-4', 'final']) {
            badges.put({ id: `${projectId}:${badge}`, projectId, badge, earnedAt: Date.now() });
          }
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(new Error('écriture impossible'));
        };
        request.onerror = () => reject(new Error('ouverture impossible'));
      });
    });

    await page.goto('./badges');
    await expect(page.getByText('28 / 28 jours validés')).toBeVisible();

    const pdf = page.waitForEvent('download');
    await page.getByRole('button', { name: /Télécharger le certificat/ }).click();
    const file = await pdf;
    expect(file.suggestedFilename()).toMatch(/\.pdf$/);
  });
});
