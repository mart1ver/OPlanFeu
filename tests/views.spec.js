// Chaque vue s'affiche sans erreur avec le dossier de test ; plan, 3D et dossier complet produisent quelque chose
const { test, expect, loadSynthetic } = require('./helpers');

const TABS = { fixtures: [], plan: [], rigging: ['rv', ['points']], elec: ['ev', ['lines', 'syno']], net: ['nv', ['console', 'univ', 'dmx', 'net', 'sheet', 'diff']], inventory: ['iv', ['inv', 'gdtf', 'parc', 'ecart']], labels: ['lv', ['fx', 'heads', 'elec', 'dmx', 'net']], dossier: [] };

for (const [tab, [attr, subs] = []] of Object.entries(TABS)) {
  test(`vue ${tab}${subs ? ' et ses sous-vues' : ''}`, async ({ page }) => {
    await loadSynthetic(page);
    await page.click(`#tabs button[data-v=${tab}]`);
    await expect(page.locator('#view')).not.toBeEmpty();
    for (const s of subs || []) {
      await page.click(`#view [data-${attr}=${s}]`);
      await expect(page.locator(`#view [data-${attr}=${s}]`)).toHaveClass(/on/);
      await expect(page.locator('#view')).not.toContainText('undefined');
    }
  });
}

test('plan : un projecteur dessiné et une étiquette par projecteur, taille des étiquettes réglable', async ({ page }) => {
  await loadSynthetic(page);
  await page.click('#tabs button[data-v=plan]');
  await expect(page.locator('#planPages svg')).toBeVisible();
  await expect(page.locator('#planPages .plab')).toHaveCount(24, { timeout: 15000 });
  const f1 = await page.locator('#planPages .plab text').first().getAttribute('font-size');
  await page.locator('[data-pl=labSize]').fill('200'); await page.locator('[data-pl=labSize]').dispatchEvent('change');
  await expect.poll(async () => +(await page.locator('#planPages .plab text').first().getAttribute('font-size'))).toBeCloseTo(+f1 * 2, 1);
});

test('3D : la scène se construit avec les faisceaux', async ({ page }) => {
  test.setTimeout(90_000);
  await loadSynthetic(page);
  await page.click('#tabs button[data-v=v3d]');
  await expect(page.locator('#v3 canvas')).toBeVisible({ timeout: 45000 });
  const n = await page.evaluate(() => ({ items: V3.items.filter(it => it.f).length, beams: [...V3.beamInfo.values()].filter(Boolean).length }));
  expect(n.items).toBe(24); expect(n.beams).toBe(3);
});

test('dossier complet : couverture, plan, patch, accroches, inventaire', async ({ page }) => {
  await loadSynthetic(page);
  await page.click('#tabs button[data-v=dossier]');
  const h = await page.locator('#dosPages h2').allTextContents();
  for (const k of ['Accroches et charges', 'Types et inventaire']) expect(h.join('|')).toContain(k);
  await expect(page.locator('#dosPages .cover')).toHaveCount(1);
  await expect(page.locator('#dosPages svg').first()).toBeVisible();
});

test('étiquettes : une par projecteur, tête de perche, lignes, réseau', async ({ page }) => {
  await loadSynthetic(page, d => {
    d.lieu = { points: [], boards: [{ id: 'b1', name: 'TD1', supply: 'tri', amps: 63 }], lines: [{ id: 'l1', name: 'G1', board: 'TD1', kind: 'grada', phase: 'L1', amps: 16, dest: 'P2 Milieu' }],
      dmxLines: [{ id: 'd1', name: 'DMX A', src: 'Node 1', port: 1, universe: 1, dest: 'P1 Lointain' }], devices: [{ id: 'v1', name: 'Node 1', kind: 'node', ip: '2.0.0.10', vlan: 10, sw: 'SW1', port: '4' }], consoles: [] };
  });
  await page.click('#tabs button[data-v=labels]');
  await page.click('#view [data-lv=fx]');
  await expect(page.locator('#docPages .lbl, #docPages [class*=lab]').first()).toBeVisible();
  await page.click('#view [data-lv=heads]'); await expect(page.locator('#rigPages .phead')).toHaveCount(3);   // le sol est exclu par défaut
  await page.click('#view [data-lv=elec]'); await expect(page.locator('#view .lab')).toHaveCount(2);
  await page.click('#view [data-lv=dmx]'); await expect(page.locator('#view .lab.dmx')).toHaveCount(2);
  await page.click('#view [data-lv=net]'); await expect(page.locator('#view .lab.net')).toContainText('2.0.0.10');
  // depuis Accroches, le lien mène aux étiquettes de tête
  await page.click('#tabs button[data-v=rigging]'); await page.click('#view [data-golab=heads]');
  await expect(page.locator('#view [data-lv=heads]')).toHaveClass(/on/);
});
