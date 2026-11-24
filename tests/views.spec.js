// Chaque vue s'affiche sans erreur avec le dossier de test ; plan, 3D et dossier complet produisent quelque chose
const { test, expect, loadSynthetic } = require('./helpers');

const TABS = { fixtures: [], plan: [], rigging: ['rv', ['points', 'heads']], elec: ['ev', ['lines', 'syno', 'labels']], net: ['nv', ['console', 'univ', 'dmx', 'net', 'labels', 'sheet', 'fxlabels', 'diff']], inventory: ['iv', ['inv', 'gdtf', 'parc', 'ecart']], dossier: [] };

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
