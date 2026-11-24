// Sauvegarde : rien ne se perd au rechargement, à l'ouverture d'un autre fichier, et les versions se restaurent
const { test, expect, loadSynthetic, tmpFile } = require('./helpers');

test('le dossier revient après un rechargement, avec les modifications', async ({ page }) => {
  await loadSynthetic(page);
  await page.evaluate(() => { state.d.fixtures[0].gel = 'L999'; touch(); });
  await page.waitForTimeout(900);
  await page.reload();
  await page.waitForFunction(() => state.d && state.d.fixtures.length === 24);
  expect(await page.evaluate(() => state.d.fixtures[0].gel)).toBe('L999');
});

test('ouvrir un autre fichier garde le dossier précédent dans le navigateur', async ({ page }, info) => {
  await loadSynthetic(page);
  await page.waitForTimeout(500);
  await page.setInputFiles('#file', tmpFile(info, 'autre.csv', 'Layer;Fix ID;Ch ID;Name;FixtureType;Patch;Channels\nFace;1;;PC;PC 1kW;1.001;1\n'));
  await page.waitForFunction(() => state.d && state.d.fixtures.length === 1);
  await page.waitForTimeout(500);
  const list = await page.evaluate(async () => (await DOSDB.listDos()).map(r => r.titre).sort());
  expect(list).toEqual(['Dossier de test', 'autre']);
  await page.click('#bkState button');
  await page.locator('#bkDos [data-bk=dopen]').click();
  await page.waitForFunction(() => state.d.fixtures.length === 24);
});

test('versions : restaurer revient à l’état enregistré', async ({ page }) => {
  await loadSynthetic(page);
  await page.waitForTimeout(500);
  await page.evaluate(() => { state.d.fixtures[0].fid = 'MODIFIÉ'; touch(); });
  await page.waitForTimeout(700);
  await page.click('#bkState button');
  await page.locator('#bkVers [data-bk=vrest]').last().click();
  await page.waitForFunction(() => state.d.fixtures[0].fid === '101');
  const vs = await page.evaluate(async () => (await DOSDB.versions(state.d.meta.id)).map(v => v.reason));
  expect(vs).toContain('restore');
});

test('archive complète : exportée puis restaurée dans un navigateur vide', async ({ page }, info) => {
  await loadSynthetic(page);
  await page.waitForTimeout(500);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => bkExportAll())]);
  const zip = tmpFile(info, 'sauvegarde.zip'); require('fs').copyFileSync(await dl.path(), zip);
  await page.evaluate(() => DOSDB.tx(['dossiers', 'versions', 'kv'], 'readwrite', tx => { tx.objectStore('dossiers').clear(); tx.objectStore('versions').clear(); }));
  await page.setInputFiles('#file', zip);
  await expect.poll(() => page.evaluate(async () => (await DOSDB.listDos()).length)).toBe(1);
});

test('fichier lié sur le disque : réécrit après une modification', async ({ page }) => {
  await loadSynthetic(page);
  await page.evaluate(() => { window.showSaveFilePicker = async () => (await navigator.storage.getDirectory()).getFileHandle('lie.oplanfeu.json', { create: true }); });
  await page.keyboard.press('Control+s');
  await expect(page.locator('#bkState')).toContainText('lie.oplanfeu.json');
  await page.evaluate(() => { state.d.fixtures[0].notes = 'écrit sur le disque'; touch(); });
  await expect.poll(() => page.evaluate(async () => { const f = await (await (await navigator.storage.getDirectory()).getFileHandle('lie.oplanfeu.json')).getFile(); return JSON.parse(await f.text()).fixtures[0].notes; }), { timeout: 8000 }).toBe('écrit sur le disque');
});
