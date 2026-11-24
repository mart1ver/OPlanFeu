// Shows : ouvrir, enregistrer, dupliquer, retrouver
const { test, expect, loadSynthetic, tmpFile } = require('./helpers');

test('la page Shows liste les shows du navigateur et en rouvre un', async ({ page }, info) => {
  await loadSynthetic(page);
  await page.waitForTimeout(500);
  await page.setInputFiles('#file', tmpFile(info, 'autre.csv', 'Layer;Fix ID;Ch ID;Name;FixtureType;Patch;Channels\nFace;1;;PC;PC 1kW;1.001;1\n'));
  await page.waitForFunction(() => state.d && state.d.fixtures.length === 1);
  await page.waitForTimeout(500);
  await page.click('#tabs button[data-v=shows]');
  await expect(page.locator('#view .shcur h2')).toHaveText('autre');
  await expect(page.locator('#shList .shcard')).toHaveCount(2);
  await page.fill('#shQ', 'test');
  await expect(page.locator('#shList .shcard')).toHaveCount(1);
  await page.locator('#shList [data-sh=openid]').click();
  await page.waitForFunction(() => state.d.fixtures.length === 24);
  await expect(page.locator('#viewTitle')).toHaveText('Patch');
});

test('dupliquer un show', async ({ page }) => {
  await loadSynthetic(page);
  await page.waitForTimeout(500);
  await page.click('#tabs button[data-v=shows]');
  await page.click('#view [data-sh=dup]');
  await page.waitForFunction(() => state.d.meta.titre === 'Dossier de test (copie)');
  const n = await page.evaluate(async () => (await DOSDB.listDos()).length);
  expect(n).toBe(2);
});
