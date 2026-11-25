// Patch : mode de chaque projecteur
const { test, expect, loadSynthetic } = require('./helpers');

const withModes = d => { d.types['Test@Lyre'].modes = { Std: 20, Basic: 12, Extended: 31 }; };

test('l’onglet s’appelle Patch et le mode se choisit projecteur par projecteur', async ({ page }) => {
  await loadSynthetic(page, withModes);
  await expect(page.locator('#viewTitle')).toHaveText('Patch');
  const row = page.locator('#view tbody tr').filter({ has: page.locator('input[data-k=fid][value="101"]') });
  await row.locator('select.fmode').selectOption('Basic');
  expect(await page.evaluate(() => { const f = state.d.fixtures.find(x => x.fid === '101'); return [f.mode, f.nch]; })).toEqual(['Basic', 12]);
  expect(await page.evaluate(() => state.d.fixtures.find(x => x.fid === '102').mode)).toBe('Std');
  await page.keyboard.press('Escape'); await page.locator('#viewTitle').click();
  await page.keyboard.press('Control+z');
  await expect.poll(() => page.evaluate(() => state.d.fixtures.find(x => x.fid === '101').nch)).toBe(20);
});

test('mode sur une sélection, et refus d’un mode inconnu pour un type', async ({ page }) => {
  await loadSynthetic(page, withModes);
  await page.evaluate(() => { state.d.fixtures.filter(f => ['101', '102', '201'].includes(f.fid)).forEach(f => state.sel.add(f.uid)); render(); });
  await page.selectOption('#bField', 'mode');
  await page.fill('#bValue', 'Extended');
  await page.click('#bApply');
  const r = await page.evaluate(() => ['101', '102', '201'].map(id => { const f = state.d.fixtures.find(x => x.fid === id); return `${f.mode}:${f.nch}`; }));
  expect(r).toEqual(['Extended:31', 'Extended:31', ':1']);
});

test('un mode absent du type est signalé dans la liste', async ({ page }) => {
  await loadSynthetic(page, d => { withModes(d); d.fixtures[0].mode = 'Ancien'; });
  await expect(page.locator('#view tbody select.fmode.bad')).toHaveCount(1);
});

test('feuille de patch : récapitulatif par position', async ({ page }) => {
  await loadSynthetic(page);
  await page.click('#view [data-pv=sheet]');
  const pages = page.locator('#docPages');
  await expect(pages).toContainText('Récapitulatif par position');
  await expect(pages).toContainText('6 × Lyre Test');
  for (const p of ['P1 Lointain', 'P2 Milieu', 'P3 Face', 'Sol']) await expect(pages).toContainText(p);
  // regroupé par position : un seul récapitulatif par position
  await page.click('#view [data-dgroup=position]');
  await expect(pages.locator('h2', { hasText: 'Récapitulatif par position' })).toHaveCount(1);
  await expect(page.locator('#view [data-dck=optSumPos]')).toHaveCount(0);
});

test('feuille de patch : patch par position', async ({ page }) => {
  await loadSynthetic(page);
  await page.click('#view [data-pv=sheet]');
  const pages = page.locator('#docPages');
  await expect(pages.locator('h2', { hasText: 'Patch par position' })).toHaveCount(1);
  await page.click('#view [data-dck=optPos]');
  await expect(pages.locator('h2', { hasText: 'Patch par position' })).toHaveCount(0);
  await page.click('#view [data-dck=optPos]');
  await page.click('#view [data-dgroup=position]');
  await expect(pages.locator('h2', { hasText: 'Patch par position' })).toHaveCount(1);
  await expect(page.locator('#view [data-dck=optPos]')).toHaveCount(0);
});

test('nom de machine : saisi dans le tableau, repris sur la feuille de patch et le plan', async ({ page }) => {
  await loadSynthetic(page);
  const cell = page.locator('#view tbody tr').first().locator('input.c[data-k=name]');
  await expect(cell).toHaveAttribute('placeholder', 'Lyre Test');
  await cell.fill('Lyre contre jardin'); await cell.press('Enter');
  await expect.poll(() => page.evaluate(() => state.d.fixtures.find(f => f.fid === '101').name)).toBe('Lyre contre jardin');
  await page.click('#view [data-pv=sheet]');
  await expect(page.locator('#docPages')).toContainText('Lyre contre jardin');
  await page.click('#tabs button[data-v=plan]');
  await page.selectOption('[data-pl=l2]', 'name');
  await expect(page.locator('#planPages .plab[data-u="u-1"]')).toContainText('Lyre contre jardin');
});
