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
  // plus de « regrouper par », de langue ni de cartouche à ce niveau
  await expect(page.locator('#view [data-dgroup]')).toHaveCount(0);
  await expect(page.locator('#view [data-dopt=plang]')).toHaveCount(0);
  await expect(page.locator('#view [data-dnote]')).toHaveCount(0);
});

test('feuille de patch : patch par position', async ({ page }) => {
  await loadSynthetic(page);
  await page.click('#view [data-pv=sheet]');
  const pages = page.locator('#docPages');
  await expect(pages.locator('h2', { hasText: 'Patch par position' })).toHaveCount(1);
  await page.click('#view [data-dck=optPos]');
  await expect(pages.locator('h2', { hasText: 'Patch par position' })).toHaveCount(0);
  await page.click('#view [data-dck=optPos]');
  await expect(pages.locator('h2', { hasText: 'Patch par position' })).toHaveCount(1);
});

test('feuille de patch : vues de départ, vue personnalisée reprise dans le dossier, cartouche du dossier complet', async ({ page }) => {
  await loadSynthetic(page);
  await page.click('#view [data-pv=sheet]');
  const pages = page.locator('#docPages');
  // vue de départ « Par univers » : seulement les univers
  await page.click('#view [data-svbase=univ]');
  await expect(pages.locator('h2', { hasText: 'Patch par position' })).toHaveCount(0);
  await expect(page.locator('#view [data-dck=optUniv]')).toBeChecked();
  await expect(page.locator('#view [data-dck=optPos]')).not.toBeChecked();
  // vue personnalisée : partie de « Par position », en A4, retenue au fil des modifications
  await page.click('#view [data-svbase=pos]');
  await page.evaluate(() => { window.prompt = () => 'Patch jardin'; });
  await page.click('#view [data-svnew]');
  await page.selectOption('#view select[data-dopt=fmt]', 'A4');
  await page.click('#view [data-dck=optSumType]');
  const v = await page.evaluate(() => state.d.views.find(x => x.kind === 'sheet'));
  expect([v.name, v.base, v.inDossier, v.settings.fmt, v.settings.chk.optPos, v.settings.chk.optSumType, v.settings.chk.optUniv]).toEqual(['Patch jardin', 'pos', true, 'A4', true, false, false]);
  // revenir à une vue de départ remet tout à zéro ; rouvrir la vue rend ses réglages
  await page.click('#view [data-svbase=full]');
  expect(await page.evaluate(() => [DOC.fmt, DOC.chk.optUniv])).toEqual(['A3', true]);
  await page.click(`#view [data-svsel="${v.id}"]`);
  expect(await page.evaluate(() => [DOC.fmt, DOC.chk.optUniv, DOC.chk.optSumType])).toEqual(['A4', false, false]);
  // dossier complet : la vue y figure ; le cartouche s'y édite et revient sur la feuille
  await page.click('#tabs button[data-v=dossier]');
  await expect(page.locator('#view [data-dosv]')).toHaveCount(1);
  await page.click('#view .cartedit summary');
  await page.locator('#view input[data-cnote="0"]').fill('Version 3 — régie lumière'); await page.locator('#view input[data-cnote="0"]').press('Tab');
  await page.locator('#view input[data-cmeta=auteur]').fill('Martin'); await page.locator('#view input[data-cmeta=auteur]').press('Tab');
  await page.selectOption('#view select[data-cplang]', 'en');
  expect(await page.evaluate(() => [state.d.docs.note[0], state.d.meta.auteur, DOC.plang])).toEqual(['Version 3 — régie lumière', 'Martin', 'en']);
  await expect(page.locator('#dosPages')).toContainText('Version 3 — régie lumière');
  await page.click('#tabs button[data-v=fixtures]'); await page.click('#view [data-pv=sheet]');
  await expect(pages).toContainText('Version 3 — régie lumière');
  await expect(pages).toContainText('Patch by position');
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

test('numéroter les noms d’une sélection, dans l’ordre du tableau', async ({ page }) => {
  await loadSynthetic(page);
  expect(await page.evaluate(() => [nameSeries('Lyre 1', 3), nameSeries('Face 09', 3), nameSeries('Contre # jardin', 2), nameSeries('Douche', 2), nameSeries('L##', 2)]))
    .toEqual([['Lyre 1', 'Lyre 2', 'Lyre 3'], ['Face 09', 'Face 10', 'Face 11'], ['Contre 1 jardin', 'Contre 2 jardin'], ['Douche 1', 'Douche 2'], ['L01', 'L02']]);
  await page.evaluate(() => { state.d.fixtures.filter(f => ['101', '102', '103'].includes(f.fid)).forEach(f => state.sel.add(f.uid)); render(); });
  await page.evaluate(() => { window.prompt = () => 'Spot 01'; });
  await page.click('#bRename');
  expect(await page.evaluate(() => ['101', '102', '103'].map(id => state.d.fixtures.find(x => x.fid === id).name))).toEqual(['Spot 01', 'Spot 02', 'Spot 03']);
});
