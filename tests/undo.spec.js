// Annuler / rétablir
const { test, expect, loadSynthetic } = require('./helpers');

test('annuler et rétablir une saisie dans le tableau des projecteurs', async ({ page }) => {
  await loadSynthetic(page);
  const cell = page.locator('#view tbody tr').first().locator('input.c[data-k=gel]');
  await cell.fill('L106'); await cell.press('Enter');
  await expect.poll(() => page.evaluate(() => state.d.fixtures.find(f => f.fid === '101').gel)).toBe('L106');
  await page.waitForTimeout(800);
  await page.locator('#view').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Control+z');
  await expect.poll(() => page.evaluate(() => state.d.fixtures.find(f => f.fid === '101').gel)).toBe('');
  await page.keyboard.press('Control+Shift+z');
  await expect.poll(() => page.evaluate(() => state.d.fixtures.find(f => f.fid === '101').gel)).toBe('L106');
  await expect(page.locator('#redoBtn')).toBeDisabled();
});

test('plusieurs pas, boutons de la barre, fichiers GDTF gardés', async ({ page }) => {
  await loadSynthetic(page, d => { d.types['Test@Lyre'].gdtfData = 'G'.repeat(50000); });
  for (const v of ['A', 'B', 'C']) { await page.evaluate(v => { state.d.meta.notes = v; touch(); }, v); await page.waitForTimeout(800); }
  await page.click('#undoBtn'); await page.click('#undoBtn');
  expect(await page.evaluate(() => [state.d.meta.notes, state.d.types['Test@Lyre'].gdtfData.length])).toEqual(['A', 50000]);
  await page.click('#undoBtn');
  expect(await page.evaluate(() => state.d.meta.notes)).toBe('');
  await expect(page.locator('#undoBtn')).toBeDisabled();
  await page.click('#redoBtn');
  expect(await page.evaluate(() => state.d.meta.notes)).toBe('A');
  // une nouvelle modification efface ce qui restait à rétablir
  await page.evaluate(() => { state.d.meta.notes = 'Z'; touch(); });
  await expect(page.locator('#redoBtn')).toBeDisabled();
});

test('modifications rapprochées : un seul pas', async ({ page }) => {
  await loadSynthetic(page);
  await page.evaluate(() => { for (let i = 0; i < 5; i++) { state.d.fixtures[i].notes = 'x'; touch(); } });
  await page.click('#undoBtn');
  expect(await page.evaluate(() => state.d.fixtures.slice(0, 5).every(f => f.notes === ''))).toBe(true);
});
