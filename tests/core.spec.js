// Import, enregistrement, export, calculs : le cœur du dossier
const { test, expect, syntheticDossier, loadSynthetic, tmpFile } = require('./helpers');

test('la page s’ouvre sans dossier et sans erreur', async ({ page }) => {
  await expect(page.locator('#view .empty')).toBeVisible();
  await expect(page.locator('#tabs button')).not.toHaveCount(0);
});

test('import d’un CSV au format Give Me The Patch', async ({ page }, info) => {
  const csv = 'Layer;Fix ID;Ch ID;Name;FixtureType;Patch;Channels\nFace;1;;PC;PC 1kW;1.001;1\nFace;2;;PC;PC 1kW;1.002;1\nContre;3;;Lyre;Lyre Test Std;2.101;20\n';
  await page.setInputFiles('#file', tmpFile(info, 'patch.csv', csv));
  await page.waitForFunction(() => state.d && state.d.fixtures.length === 3);
  const r = await page.evaluate(() => state.d.fixtures.map(f => `${f.fid}:${f.univ}.${f.addr}:${f.nch}`).join(' '));
  expect(r).toBe('1:1.1:1 2:1.2:1 3:2.101:20');
  await expect(page.locator('#view tbody tr')).toHaveCount(3);
});

test('dossier .json : ouvert puis enregistré à l’identique', async ({ page }, info) => {
  const d = syntheticDossier();
  await page.setInputFiles('#file', tmpFile(info, 'test.oplanfeu.json', JSON.stringify(d)));
  await page.waitForFunction(() => state.d && state.d.fixtures.length === 24);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => bkDownload())]);
  const back = JSON.parse(require('fs').readFileSync(await dl.path(), 'utf8'));
  expect(back.fixtures.map(f => [f.fid, f.univ, f.addr, f.position, f.x, f.y, f.z])).toEqual(d.fixtures.map(f => [f.fid, f.univ, f.addr, f.position, f.x, f.y, f.z]));
  expect(back.meta.titre).toBe('Dossier de test');
});

test('export MVR puis réimport : patch, numéros, positions et coordonnées conservés', async ({ page }, info) => {
  await loadSynthetic(page);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.evaluate(() => exportMVR())]);
  const before = await page.evaluate(() => state.d.fixtures.map(f => `${f.fid}|${f.univ}.${f.addr}|${f.position}|${f.x},${f.y},${f.z}`).sort());
  await page.setInputFiles('#file', await dl.path().then(p => { const q = tmpFile(info, 'rt.mvr'); require('fs').copyFileSync(p, q); return q; }));
  await page.waitForFunction(() => state.d && state.d.meta.source === 'rt.mvr');
  const after = await page.evaluate(() => state.d.fixtures.map(f => `${f.fid}|${f.univ}.${f.addr}|${f.position}|${f.x},${f.y},${f.z}`).sort());
  expect(after).toEqual(before);
});

test('charges des points d’accroche : projecteurs + forfait accessoires', async ({ page }) => {
  await loadSynthetic(page);
  const r = await page.evaluate(() => {
    const p = state.d.lieu.points.find(x => x.name === 'P1 Lointain'); p.cmu = 190;
    const R = pointLoad(p); return { fx: R.fx, acc: R.acc, total: R.total, status: R.status };
  });
  expect(r.fx).toBe(150);              // 6 lyres × 25 kg
  expect(r.acc).toBeCloseTo(9);        // 6 × 1,5 kg
  expect(r.total).toBeCloseTo(159);
  expect(r.status).toBe('warn');       // 84 % de 190 kg : au-delà du seuil d'alerte (80 %)
});

test('électricité : puissance et charge d’une ligne graduée', async ({ page }) => {
  await loadSynthetic(page);
  const r = await page.evaluate(() => {
    state.d.lieu.boards.push({ id: uid(), name: 'TD1', supply: 'tri', amps: 63, location: '', notes: '' });
    state.d.lieu.lines.push({ id: uid(), name: 'G1', board: 'TD1', kind: 'grada', phase: 'L1', amps: 16, dest: 'P2 Milieu', dimmer: '', dmx: '', notes: '' });
    state.d.fixtures.filter(f => f.position === 'P2 Milieu').slice(0, 3).forEach(f => { f.circuit = 'G1'; });
    const R = lineLoad(state.d.lieu.lines[0]); return { w: R.w, n: R.g.length, status: R.status };
  });
  expect(r).toEqual({ w: 3000, n: 3, status: 'warn' });   // 3 000 W sur 16 A × 230 V = 82 %
});

test('univers : canaux utilisés par univers', async ({ page }) => {
  await loadSynthetic(page);
  const u = await page.evaluate(() => universes().map(r => [r.u, r.fx.length]));
  expect(u).toEqual([[1, 10], [2, 14]]);
});

test('alertes : adresse en double signalée', async ({ page }) => {
  await loadSynthetic(page, d => { d.fixtures[1].univ = d.fixtures[0].univ; d.fixtures[1].addr = d.fixtures[0].addr; });
  await expect(page.locator('#alerts')).toContainText('double');
});

test('parc du lieu : même appareil, équivalence et manque', async ({ page }) => {
  await loadSynthetic(page);
  const r = await page.evaluate(() => {
    state.d.lieu.parc = [{ id: 'a', name: 'Lyre Test', maker: 'Test', family: '', qty: 4, power: 600 }, { id: 'b', name: 'Lyre Autre', maker: '', family: 'lyre', qty: 10, power: 500 }];
    const A = parcAlloc(), L = A.rows.find(x => x.name === 'Lyre Test');
    return { take: L.take, short: L.short, sugg: L.sugg && L.sugg.name };
  });
  expect(r).toEqual({ take: 4, short: 2, sugg: 'Lyre Autre' });
  expect(await page.evaluate(() => parseParcList('12 x MAC Aura\nPAR 64 : 30'))).toEqual([{ name: 'MAC Aura', qty: 12 }, { name: 'PAR 64', qty: 30 }]);
});
