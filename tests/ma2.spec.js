// Show de base grandMA2 : fenêtre de la vue Shows, correspondance des types, fichiers du zip
const { test, expect, loadSynthetic } = require('./helpers');
const fs = require('fs');

test('show grandMA2 : correspondance des types, options, zip pour la clé USB', async ({ page }) => {
  await loadSynthetic(page, d => { d.fixtures[0].name = 'Lyre régie'; });
  await page.click('#tabs button[data-v=shows]');
  await page.click('#view [data-sh=ma2]');
  const dlg = page.locator('#ma2Dlg');
  await expect(dlg).toBeVisible();
  // trois fixture types ; le PC à 1 canal devient le Dimmer de la console (type 1)
  const rows = dlg.locator('tbody tr');
  await expect(rows).toHaveCount(3);
  const pc = rows.filter({ hasText: 'PC 1kW' });
  await expect(pc.locator('input[data-mat=no]')).toHaveAttribute('placeholder', '1');
  await expect(dlg.locator('.mawarn').first()).toContainText('2 type(s) sans fichier');
  const lyre = rows.filter({ hasText: 'Lyre Test' });
  await expect(lyre.locator('input[data-mat=lib]')).toHaveAttribute('placeholder', 'test@lyre_test@std');
  await lyre.locator('input[data-mat=lib]').fill('test@lyre_test@std.xml'); await lyre.locator('input[data-mat=lib]').press('Tab');
  await dlg.locator('tbody tr').filter({ hasText: 'Lyre Test' }).locator('input[data-mat=no]').fill('7');
  await dlg.locator('tbody tr').filter({ hasText: 'Lyre Test' }).locator('input[data-mat=no]').press('Tab');
  expect(await page.evaluate(() => state.d.ma2.types['Test@Lyre\u0001Std'])).toEqual({ lib: 'test@lyre_test@std', no: 7 });
  // options : pas de groupes par type, premier groupe 11
  await dlg.locator('input[data-ma=gType]').uncheck();
  await dlg.locator('input[data-ma=groupStart]').fill('11'); await dlg.locator('input[data-ma=groupStart]').press('Tab');
  const g = await page.evaluate(() => ma2Groups().map(x => `${x.no}:${x.name}`));
  expect(g).toEqual(['11:Tous', '12:P1 Lointain', '13:P2 Milieu', '14:P3 Face', '15:Sol']);
  // téléchargement : plugin, calque, layout, mode d'emploi
  const [dl] = await Promise.all([page.waitForEvent('download'), dlg.locator('#ma2Dl').click()]);
  expect(dl.suggestedFilename()).toBe('oplanfeu_dossier_de_test_grandMA2.zip');
  const zip = fs.readFileSync(await dl.path()).toString('latin1');
  for (const f of ['gma2/plugins/oplanfeu_dossier_de_test.xml', 'gma2/plugins/oplanfeu_dossier_de_test.lua', 'gma2/importexport/oplanfeu_dossier_de_test_layer.xml', 'gma2/importexport/oplanfeu_dossier_de_test_layout.xml', 'oplanfeu_dossier_de_test_LISEZMOI.txt']) expect(zip).toContain(f);
  // contenu : XML bien formé, patch absolu (univers 2 adresse 101 → 613), noms sans accents, type 7
  const chk = await page.evaluate(() => {
    const layer = ma2LayerXml(), layout = ma2LayoutXml(), ok = s => !new DOMParser().parseFromString(s, 'application/xml').querySelector('parsererror');
    const doc = new DOMParser().parseFromString(layer, 'application/xml'), fx = [...doc.getElementsByTagName('Fixture')];
    const f2 = state.d.fixtures.find(f => f.univ === 2), x2 = fx.find(e => e.getAttribute('fixture_id') === f2.fid);
    return { ok: ok(layer) && ok(layout), n: fx.length, first: fx[0].getAttribute('name'), no: fx[0].getElementsByTagName('No')[0].textContent,
      addr: +x2.getElementsByTagName('Address')[0].textContent, want: 512 + f2.addr, lay: new DOMParser().parseFromString(layout, 'application/xml').getElementsByTagName('LayoutSubFix').length,
      lua: ma2Lua(state.d, { layer: 'a', layout: 'b' }) };
  });
  expect([chk.ok, chk.n, chk.first, chk.no, chk.addr, chk.lay]).toEqual([true, 24, 'Lyre regie', '7', chk.want, 24]);
  expect(chk.lua).toContain('{ no = 7, lib = "test@lyre_test@std"');
  expect(chk.lua).toContain("{ no = 12, name = \"P1 Lointain\", sel = { \"Fixture 101 Thru 106\" } }");
});
