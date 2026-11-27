// Chaque vue s'affiche sans erreur avec le dossier de test ; plan, 3D et dossier complet produisent quelque chose
const { test, expect, openCfg, loadSynthetic } = require('./helpers');

// le plan se redessine encore juste après l'ouverture (formes des projecteurs chargées à part) : on attend qu'il ne bouge plus
async function planStable(page) {
  let prev = null;
  await expect.poll(async () => {
    const h = await page.evaluate(() => { const p = document.querySelector('#planPages svg'); return p ? p.innerHTML.length + ':' + document.querySelectorAll('#planPages .pfx').length : ''; });
    const same = h && h === prev; prev = h; return same;
  }, { intervals: [300], timeout: 20000 }).toBe(true);
}

const TABS = { fixtures: ['pv', ['table', 'sheet']], plan: [], rigging: ['rv', ['points']], elec: ['ev', ['lines']], syno: ['sv', ['elec', 'net']], net: ['nv', ['console', 'univ', 'dmx', 'net']], inventory: ['iv', ['inv', 'gdtf', 'parc', 'ecart']], labels: ['lv', ['fx', 'heads', 'elec', 'dmx', 'net']], dossier: [] };

for (const [tab, [attr, subs] = []] of Object.entries(TABS)) {
  test(`vue ${tab}${subs ? ' et ses sous-vues' : ''}`, async ({ page }) => {
    await loadSynthetic(page); await openCfg(page);
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
  await loadSynthetic(page); await openCfg(page);
  await page.click('#tabs button[data-v=plan]');
  await expect(page.locator('#planPages svg')).toBeVisible();
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24, { timeout: 15000 });
  const f1 = await page.locator('#planPages .plab text').first().getAttribute('font-size');
  await page.locator('[data-pl=labSize]').fill('200'); await page.locator('[data-pl=labSize]').dispatchEvent('change');
  await expect.poll(async () => +(await page.locator('#planPages .plab text').first().getAttribute('font-size'))).toBeCloseTo(+f1 * 2, 1);
});

test('3D : la scène se construit avec les faisceaux', async ({ page }) => {
  test.setTimeout(90_000);
  await loadSynthetic(page); await openCfg(page);
  await page.click('#tabs button[data-v=v3d]');
  await expect(page.locator('#v3 canvas')).toBeVisible({ timeout: 45000 });
  const n = await page.evaluate(() => ({ items: V3.items.filter(it => it.f).length, beams: [...V3.beamInfo.values()].filter(Boolean).length }));
  expect(n.items).toBe(24); expect(n.beams).toBe(3);
});

test('dossier complet : couverture, plan, patch, accroches, inventaire', async ({ page }) => {
  await loadSynthetic(page); await openCfg(page);
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
  }); await openCfg(page);
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

test('plan : les six vues (dessus, dessous, face, lointain, jardin, cour)', async ({ page }) => {
  await loadSynthetic(page); await openCfg(page);
  await page.click('#tabs button[data-v=plan]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24, { timeout: 15000 });
  const firstX = {};
  for (const v of ['top', 'bottom', 'front', 'back', 'jardin', 'cour']) {
    await page.click(`#view [data-pvbase=${v}]`);
    await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24);
    // le projecteur 101 (le plus à jardin de la perche du lointain) : à gauche vu de dessus et de face, à droite vu de dessous et du lointain
    firstX[v] = await page.evaluate(() => { const b = document.querySelector(`#planPages .pfx[data-k="f:${state.d.fixtures[0].uid}"]`).getBBox(); return b.x + b.width / 2; });
  }
  expect(firstX.top).toBeLessThan(firstX.bottom);
  expect(firstX.front).toBeLessThan(firstX.back);
});

test('patch : la feuille de patch est dans l’onglet Patch', async ({ page }) => {
  await loadSynthetic(page); await openCfg(page);
  await page.click('#view [data-pv=sheet]');
  await expect(page.locator('#docPages .sheet').first()).toBeVisible();
  await expect(page.locator('#docPages')).toContainText('101');
  await expect(page.locator('#q')).toBeHidden();
  await page.click('#view [data-pv=table]');
  await expect(page.locator('#view tbody tr')).toHaveCount(24);
});

test('synoptiques : électrique et réseau / DMX', async ({ page }) => {
  await loadSynthetic(page, d => {
    d.lieu = { points: [], boards: [{ id: 'b1', name: 'TD1', supply: 'tri', amps: 63 }], lines: [{ id: 'l1', name: 'G1', board: 'TD1', kind: 'grada', phase: 'L1', amps: 16, dest: 'P2 Milieu' }],
      dmxLines: [{ id: 'd1', name: 'DMX A', src: 'Node 1', port: 1, universe: 1, dest: 'P1 Lointain' }, { id: 'd2', name: 'DMX B', src: 'Node 1', port: 2, universe: 2, dest: 'P3 Face' }],
      devices: [{ id: 's', name: 'SW1', kind: 'switch', ip: '2.0.0.2' }, { id: 'v1', name: 'Node 1', kind: 'node', ip: '2.0.0.10', sw: 'SW1', port: '4' }, { id: 'c', name: 'MA3', kind: 'console', ip: '2.0.0.1', sw: 'SW1', port: '1' }, { id: 'x', name: 'PC perdu', kind: 'pc', ip: '2.0.0.50' }],
      consoles: [{ id: 'k', name: 'Console principale', model: 'ma3light', device: 'MA3' }] };
    d.fixtures.forEach(f => { if (f.position === 'P1 Lointain') f.dmxLine = 'DMX A'; });
  }); await openCfg(page);
  await page.click('#tabs button[data-v=syno]');
  await page.click('#view [data-sv=elec]'); await expect(page.locator('#view .syn svg')).toHaveCount(1);
  await page.click('#view [data-sv=net]');
  const svg = page.locator('#view .nsyn svg');
  for (const txt of ['SW1', 'Node 1', 'MA3', 'DMX A', 'DMX B', 'P1 Lointain', 'port 4', 'sortie 2', '6 projecteur(s)', 'PC perdu']) await expect(svg).toContainText(txt);
  await expect(svg.locator('.box.loose')).toHaveCount(1);
  await page.click('#tabs button[data-v=net]'); await page.click('#view [data-gosyn=net]');
  await expect(page.locator('#view [data-sv=net]')).toHaveClass(/on/);
});

test('merger DMX : deux entrées, une sortie, dans le tableau et le synoptique', async ({ page }) => {
  await loadSynthetic(page, d => {
    d.lieu = { points: [], boards: [], lines: [], consoles: [],
      devices: [{ id: 'c1', name: 'MA3', kind: 'console' }, { id: 'c2', name: 'Avo', kind: 'console' }, { id: 'm', name: 'Merger 1', kind: 'merger', merge: 'ltp' }],
      dmxLines: [{ id: 'a', name: 'IN A', src: 'MA3', port: 1, universe: 1, dest: 'Merger 1' }, { id: 'b', name: 'IN B', src: 'Avo', port: 1, universe: 1, dest: 'Merger 1' },
        { id: 'o', name: 'OUT', src: 'Merger 1', port: 1, universe: 1, dest: 'P1 Lointain' }] };
  }); await openCfg(page);
  await page.click('#tabs button[data-v=net]'); await page.click('#view [data-nv=dmx]');
  await expect(page.locator('#view select[data-f=dest]').first()).toHaveValue('Merger 1');
  await page.click('#view [data-nv=net]');
  await page.click('#view [data-devtog=m]');
  await expect(page.locator('#view select[data-f=merge]')).toHaveValue('ltp');
  // les deux entrées du merger, numérotées à l'ouverture
  expect(await page.evaluate(() => state.d.lieu.dmxLines.map(l => l.destPort ?? null))).toEqual([1, 2, null]);
  await page.click('#tabs button[data-v=syno]'); await page.click('#view [data-sv=net]');
  const svg = page.locator('#view .nsyn svg');
  for (const txt of ['Merger 1', 'fusion LTP', 'IN A', 'IN B', 'OUT', 'entrée 2', 'P1 Lointain']) await expect(svg).toContainText(txt);
  // les lignes DMX sont des traits, pas des boîtes : 2 consoles, le merger et la position d'arrivée
  await expect(svg.locator('.box:not(.lg)')).toHaveCount(4);
  // renommer le merger suit dans les lignes
  await page.click('#tabs button[data-v=net]'); await page.click('#view [data-nv=net]');
  const nm = page.locator('#view input[data-o=devices][data-f=name]').nth(2); await nm.fill('Merger régie'); await nm.press('Enter');
  expect(await page.evaluate(() => state.d.lieu.dmxLines.map(l => l.dest + '|' + l.src).join(' '))).toBe('Merger régie|MA3 Merger régie|Avo P1 Lointain|Merger régie');
});

test('plan : échelle choisie, ajustée à la page avec règles, rotation', async ({ page }) => {
  await loadSynthetic(page); await openCfg(page);
  await page.click('#tabs button[data-v=plan]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24, { timeout: 15000 });
  const cart = () => page.locator('#planPages svg').first().textContent();
  await page.selectOption('[data-pl=scaleSel]', '20');
  expect(await cart()).toContain('Échelle 1:20');
  expect(await cart()).toContain('dépasse');
  await page.selectOption('[data-pl=scaleSel]', 'fit');
  expect(await cart()).toMatch(/Ajusté à la page \(≈ 1:\d+\)/);
  // règles graduées (des nombres le long du cadre)
  expect(await page.locator('#planPages svg text[font-size="2"]').count()).toBeGreaterThan(5);
  // un quart de tour : la perche du lointain (horizontale) devient verticale
  const span = async () => page.evaluate(() => { const els = state.d.fixtures.filter(f => f.position === 'P1 Lointain').map(f => document.querySelector(`#planPages .pfx[data-k="f:${f.uid}"]`).getBBox()); const xs = els.map(b => b.x), ys = els.map(b => b.y); return [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]; });
  const [w0, h0] = await span(); expect(w0).toBeGreaterThan(h0);
  await page.selectOption('[data-pl=rot]', '90');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24);
  const [w1, h1] = await span(); expect(h1).toBeGreaterThan(w1);
  await page.uncheck('[data-pl=rulers]');
  expect(await page.locator('#planPages svg text[font-size="2"]').count()).toBe(0);
});

test('plan : page en portrait, légende en bandeau', async ({ page }) => {
  await loadSynthetic(page); await openCfg(page);
  await page.click('#tabs button[data-v=plan]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24, { timeout: 15000 });
  await page.selectOption('[data-pl=orient]', 'portrait');
  await expect(page.locator('#planPages svg').first()).toHaveAttribute('viewBox', '0 0 297 420');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24);
  expect(await page.locator('#pagesize').textContent()).toContain('A3 portrait');
});

test('plan : éditeur de légende (masquer, renommer, ordre, entrée libre, notes)', async ({ page }) => {
  await loadSynthetic(page); await openCfg(page);
  await page.click('#tabs button[data-v=plan]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24, { timeout: 15000 });
  await page.click('#plLegEdit');
  const dlg = page.locator('#legDlg');
  await expect(dlg).toBeVisible();
  const sheet = page.locator('#planPages svg').first();
  // renommer le PC, masquer le PAR LED, monter la lyre en tête
  const row = name => dlg.locator('tr', { has: page.locator(`input[placeholder="${name}"]`) });
  await row('PC 1kW').locator('input[data-lg=name]').fill('PC 1 kW Juliat'); await row('PC 1kW').locator('input[data-lg=name]').press('Tab');
  await expect(sheet).toContainText('PC 1 kW Juliat');
  await row('PAR LED Test').locator('input[data-lg=show]').uncheck();
  await expect(sheet.locator('text', { hasText: /^PAR LED Test$/ })).toHaveCount(0);
  await dlg.locator('input[data-lg=title]').fill('Matériel'); await dlg.locator('input[data-lg=title]').press('Tab');
  await expect(sheet).toContainText('Matériel');
  await dlg.locator('#lgAdd').click();
  await dlg.locator('input[data-lgx=text]').fill('Câble DMX 5 broches'); await dlg.locator('input[data-lgx=text]').press('Tab');
  await expect(sheet).toContainText('Câble DMX 5 broches');
  await dlg.locator('textarea[data-lg=notes]').fill('Gélatines Lee\nFocus le 12'); await dlg.locator('textarea[data-lg=notes]').press('Tab');
  await expect(sheet).toContainText('Focus le 12');
  // ordre : la première entrée descend
  const first = await dlg.locator('tbody').first().locator('tr').first().locator('input[data-lg=name]').getAttribute('placeholder');
  await dlg.locator('tbody').first().locator('tr').first().locator('[data-lgmove="1"]').click();
  await expect(dlg.locator('tbody').first().locator('tr').nth(1).locator('input[data-lg=name]')).toHaveAttribute('placeholder', first);
  await dlg.locator('#lgClose').click();
  // gardé avec le dossier
  expect(await page.evaluate(() => [state.d.planLegend.title, state.d.planLegend.hide.length, state.d.planLegend.extra.length])).toEqual(['Matériel', 1, 1]);
});

test('légende : mode et nombre de canaux des types', async ({ page }) => {
  await loadSynthetic(page, d => { d.types['Test@Lyre'].modes = { Std: 20, Basic: 12 }; d.fixtures[0].mode = 'Basic'; d.fixtures[0].nch = 12; }); await openCfg(page);
  await page.click('#tabs button[data-v=plan]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24, { timeout: 15000 });
  const sheet = page.locator('#planPages svg').first();
  await expect(sheet.locator('text[font-size="2.1"]')).toHaveCount(0);
  await page.click('#plLegEdit');
  await page.check('#legDlg input[data-lg=showMode]');
  await expect(sheet.locator('text[font-size="2.1"]', { hasText: 'Std (5) / Basic (1)' })).toHaveCount(1);
  await page.check('#legDlg input[data-lg=showCh]');
  await expect(sheet.locator('text[font-size="2.1"]', { hasText: 'Std · 20 can. (5) / Basic · 12 can. (1)' })).toHaveCount(1);
  await expect(sheet.locator('text[font-size="2.1"]', { hasText: '8ch · 8 can.' })).toHaveCount(1);
  await page.uncheck('#legDlg input[data-lg=showMode]');
  await expect(sheet.locator('text[font-size="2.1"]', { hasText: /^1 can\.$/ })).toHaveCount(1);
});

test('étiquettes du plan : rotation par 45°, jamais perdues hors du cadre', async ({ page }) => {
  await loadSynthetic(page); await openCfg(page);
  await page.click('#tabs button[data-v=plan]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24, { timeout: 15000 });
  const lab = () => page.locator(`#planPages .plab[data-u="u-1"]`);
  await lab().click({ button: 'right' });
  await expect(lab()).toHaveAttribute('transform', /rotate\(45\)/);
  await lab().click({ button: 'right' });
  await expect(lab()).toHaveAttribute('transform', /rotate\(90\)/);
  await lab().click({ button: 'right', modifiers: ['Shift'] });
  await expect(lab()).toHaveAttribute('transform', /rotate\(45\)/);
  // glissée loin hors de la feuille : elle revient dans le cadre et reste attrapable
  const b = await lab().boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
  await page.mouse.move(b.x - 3000, b.y - 3000, { steps: 4 }); await page.mouse.up();
  await expect(lab()).toHaveAttribute('transform', /rotate\(45\)/);
  const inside = await page.evaluate(() => { const g = document.querySelector('#planPages .plab[data-u="u-1"]'), r = g.getBoundingClientRect(), s = g.ownerSVGElement.getBoundingClientRect(); return r.left >= s.left && r.top >= s.top; });
  expect(inside).toBe(true);
  await lab().click({ button: 'right' });
  await expect(lab()).toHaveAttribute('transform', /rotate\(90\)/);
  // rotation de toutes les étiquettes
  await page.selectOption('[data-pl=labRot]', '90');
  await expect(page.locator('#planPages .plab[data-u="u-2"]')).toHaveAttribute('transform', /rotate\(90\)/);
});

test('vues du plan : vues de départ, vues personnalisées enregistrées au fil des modifications, choix dans le dossier', async ({ page }) => {
  page.removeAllListeners('dialog');
  let answer = 'Face régie'; page.on('dialog', d => d.type() === 'prompt' ? d.accept(answer) : d.accept());
  await loadSynthetic(page); await openCfg(page);
  await page.click('#tabs button[data-v=plan]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24, { timeout: 15000 });
  await page.click('#view [data-pvbase=front]');
  await expect(page.locator('#view [data-pvbase=front]')).toHaveClass(/on/);
  await page.click('#view [data-pvnew]');
  await expect(page.locator('#view .pvchip.mine.on')).toHaveText('Face régie');
  // modifications gardées dans la vue sans bouton « mettre à jour »
  await page.selectOption('[data-pl=rot]', '90');
  await page.locator('#planPages .plab[data-u="u-1"]').click({ button: 'right' });
  const v = () => page.evaluate(() => { const v = state.d.views.find(x => x.name === 'Face régie'); return [v.settings.view, v.settings.rot, (v.labs['u-1'] || [])[2]]; });
  await expect.poll(v).toEqual(['front', 90, 45]);
  // retour à une vue de départ : rien n'est changé dans la vue personnalisée
  await page.click('#view [data-pvbase=top]');
  await page.selectOption('[data-pl=rot]', '180');
  await expect.poll(v).toEqual(['front', 90, 45]);
  // une deuxième vue, puis le choix dans le dossier complet
  answer = 'Dessus perso';
  await page.click('#view [data-pvnew]');
  await page.click('#view [data-pvsel]:has-text("Face régie")');
  await page.uncheck('#view [data-pvdos]');
  await page.click('#tabs button[data-v=dossier]');
  const toc = await page.locator('#dosPages').textContent();
  expect(toc).toContain('Dessus perso'); expect(toc).not.toContain('Face régie');
  await page.check('#view [data-dosv]:near(:text("Face régie"))');
  await expect(page.locator('#dosPages')).toContainText('Face régie');
});

test('plan : zone à afficher, tracée à la souris puis réglée au décimètre', async ({ page }) => {
  await loadSynthetic(page);
  await page.click('#tabs button[data-v=plan]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24, { timeout: 15000 });
  await planStable(page);
  await page.click('#plZoneDraw');
  // tracer autour de la perche du lointain seulement (projecteurs 101 à 106)
  const box = async uid => page.locator(`#planPages .pfx[data-k="f:${uid}"]`).boundingBox();
  const a = await box('u-1'), b = await box('u-6');
  await page.mouse.move(a.x - 15, a.y - 25); await page.mouse.down();
  await page.mouse.move(b.x + b.width + 15, b.y + b.height + 25, { steps: 5 }); await page.mouse.up();
  await expect(page.locator('#view .plzone')).toBeVisible();
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(6);
  const z = await page.evaluate(() => state.plan.zone);
  expect(z.x0).toBeLessThan(-2.5); expect(z.x1).toBeGreaterThan(2.5); expect(z.y0).toBeGreaterThan(3); expect(z.y1).toBeLessThan(7);
  // réglage précis : la zone descend jusqu'à la face (y = -5)
  await page.fill('#view [data-zone=x0]', '-5'); await page.locator('#view [data-zone=x0]').press('Enter');
  await page.fill('#view [data-zone=x1]', '5'); await page.locator('#view [data-zone=x1]').press('Enter');
  await page.fill('#view [data-zone=y0]', '-5'); await page.locator('#view [data-zone=y0]').press('Enter');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(20);   // lointain, milieu et face ; pas le sol (y = 6)
  await page.fill('#view [data-zone=w]', '2'); await page.locator('#view [data-zone=w]').press('Enter');
  expect(await page.evaluate(() => Math.round((state.plan.zone.x1 - state.plan.zone.x0) * 10) / 10)).toBe(2);
  await page.click('#plZoneClear');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24);
  // avec le plan tourné, la zone tracée reste juste
  await page.selectOption('[data-pl=rot]', '90');
  await page.click('#plZoneDraw');
  const a2 = await box('u-1'), b2 = await box('u-6');
  await page.mouse.move(Math.min(a2.x, b2.x) - 25, Math.min(a2.y, b2.y) - 15); await page.mouse.down();
  await page.mouse.move(Math.max(a2.x, b2.x) + 25, Math.max(a2.y, b2.y) + 25, { steps: 5 }); await page.mouse.up();
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(6);
});

test('plan : choisir une vue de départ remet tout à zéro', async ({ page }) => {
  await loadSynthetic(page); await openCfg(page);
  await page.click('#tabs button[data-v=plan]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24, { timeout: 15000 });
  await page.selectOption('[data-pl=rot]', '90');
  await page.selectOption('[data-pl=orient]', 'portrait');
  await page.selectOption('[data-pl=color]', 'layer');
  await page.selectOption('[data-pl=scaleSel]', 'fit');
  await page.uncheck('[data-pl=grid]');
  await page.evaluate(() => { state.plan.zone = { x0: -1, x1: 1, y0: 4, y1: 6 }; planHide().pos.push('P2 Milieu'); renderPlanView(); });
  await page.locator('#planPages .plab:not(.ptag)').first().click({ button: 'right' });
  await page.click('#view [data-pvbase=front]');
  const P = await page.evaluate(() => ({ ...state.plan, hide: planHide(), labs: (state.d.planLab2 || {})[planLabKey()] || {} }));
  expect([P.view, P.rot, P.orient, P.color, P.fit, P.grid, P.zone, P.hide.pos.length, Object.keys(P.labs).length]).toEqual(['front', 0, 'landscape', 'type', 'scale', true, null, 0, 0]);
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24);
});

test('plan : zone qui tient juste au cadre, pas d’alerte ; projecteurs en tête du panneau', async ({ page }) => {
  await loadSynthetic(page); await openCfg(page);
  await page.click('#tabs button[data-v=plan]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24, { timeout: 15000 });
  const grps = await page.locator('.cfg[data-cfg="plan:fix"] .grp').allTextContents();
  expect(grps[0]).toContain('Projecteurs par type');
  // A3 paysage, 1:50 : le cadre utile fait environ 324 × 261 mm, soit 16,2 × 13 m
  await page.evaluate(() => { Object.assign(state.plan, { zone: { x0: -8, x1: 8, y0: -6, y1: 6.9 }, fit: 'scale', scale: 50 }); renderPlanView(); });
  expect(await page.locator('#planPages svg').first().textContent()).not.toContain('dépasse');
  await page.evaluate(() => { state.plan.zone = { x0: -9, x1: 9, y0: -6, y1: 8 }; renderPlanView(); });
  expect(await page.locator('#planPages svg').first().textContent()).toContain('la zone dépasse du cadre à cette échelle (tient au 1:75)');
});

test('plan : projecteurs superposés, étiquettes en colonnes par type, sans chevauchement', async ({ page }) => {
  await loadSynthetic(page); await openCfg(page);
  await page.click('#tabs button[data-v=plan]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24, { timeout: 15000 });
  await page.click('#view [data-pvbase=front]');   // de face, le lointain et le milieu (même hauteur) se cachent l'un l'autre
  const boxes = await page.evaluate(() => [...document.querySelectorAll('#planPages .plab:not(.ptag)')].map(g => { const r = g.getBoundingClientRect(); return [g.dataset.u, r.left, r.top, r.right, r.bottom]; }));
  let overlaps = 0;
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) { const a = boxes[i], b = boxes[j]; if (Math.min(a[3], b[3]) - Math.max(a[1], b[1]) > 1 && Math.min(a[4], b[4]) - Math.max(a[2], b[2]) > 1) overlaps++; }
  expect(overlaps).toBe(0);
  // 101 (lyre) et 202 (PC) sont au même endroit vus de face : deux colonnes côte à côte
  const by = Object.fromEntries(boxes.map(b => [b[0], b]));
  const lyre = by['u-1'], pc = by['u-8'];
  expect(Math.abs(lyre[1] - pc[1])).toBeGreaterThan(5);
});

test('plan : colonnes d’étiquettes au-dessus des projecteurs superposés (vue de côté)', async ({ page }) => {
  await loadSynthetic(page); await openCfg(page);
  await page.click('#tabs button[data-v=plan]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24, { timeout: 15000 });
  await page.click('#view [data-pvbase=cour]');   // de côté, chaque perche se réduit à une pile
  const r = await page.evaluate(() => {
    const out = [];
    for (const pos of ['P1 Lointain', 'P2 Milieu', 'P3 Face']) {
      const fs = state.d.fixtures.filter(f => f.position === pos);
      const sym = fs.map(f => document.querySelector(`#planPages .pfx[data-k="f:${f.uid}"]`).getBoundingClientRect());
      const lab = fs.map(f => document.querySelector(`#planPages .plab[data-u="${f.uid}"]`).getBoundingClientRect());
      const sx = sym[0].left + sym[0].width / 2, top = Math.min(...sym.map(b => b.top));
      out.push({ pos, dx: Math.max(...lab.map(b => Math.abs(b.left + b.width / 2 - sx))), above: lab.every(b => b.bottom <= top + 1), w: lab[0].width });
    }
    return out;
  });
  for (const o of r) { expect(o.above, o.pos).toBe(true); expect(o.dx, o.pos).toBeLessThan(o.w * 2.5); }
});

test('plan : aucune étiquette ne chevauche une autre étiquette ni un projecteur, dans les six vues', async ({ page }) => {
  await loadSynthetic(page); await openCfg(page);
  await page.click('#tabs button[data-v=plan]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24, { timeout: 15000 });
  for (const v of ['top', 'bottom', 'front', 'back', 'jardin', 'cour']) {
    await page.click(`#view [data-pvbase=${v}]`);
    const st = await page.evaluate(() => {
      const L = [...document.querySelectorAll('#planPages .plab rect')].map(r => r.getBoundingClientRect()), S = [...document.querySelectorAll('#planPages .pfx')].map(r => r.getBoundingClientRect());
      const ov = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > .5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > .5;
      let n = 0; for (let i = 0; i < L.length; i++) { for (let j = i + 1; j < L.length; j++) if (ov(L[i], L[j])) n++; for (const s of S) if (ov(L[i], s)) n++; } return n;
    });
    expect(st, v).toBe(0);
  }
});

test('plan : masquer ou afficher des machines, par type ou une à une', async ({ page }) => {
  await loadSynthetic(page); await openCfg(page);
  await page.click('#tabs button[data-v=plan]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24, { timeout: 15000 });
  const grps = await page.locator('.cfg[data-cfg="plan:fix"] .grp').allTextContents();
  expect(grps[0]).toContain('Projecteurs par type');
  await page.uncheck('.cfg [data-plh=type][data-k="Test@PC"]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(16);
  await page.check('.cfg [data-plh=type][data-k="Test@PC"]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24);
  // une machine seule : déplier le type et décocher 101
  await page.locator('.cfg details.ly', { has: page.locator('[data-k="Test@Lyre"]') }).locator('summary .tw').click();
  await page.locator('.cfg details.ly', { has: page.locator('[data-k="Test@Lyre"]') }).locator('[data-plfx="u-1"]').uncheck();
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(23);
  await expect(page.locator('.cfg details.ly', { has: page.locator('[data-k="Test@Lyre"]') }).locator('summary small')).toHaveText('5/6');
  await page.click('.cfg [data-plall=types]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24);
});

test('3D : masquer ou afficher des machines par type ou une à une, projecteurs en tête', async ({ page }) => {
  test.setTimeout(90_000);
  await loadSynthetic(page); await openCfg(page);
  await page.click('#tabs button[data-v=v3d]');
  await expect(page.locator('#v3 canvas')).toBeVisible({ timeout: 45000 });
  const grps = await page.locator('.cfg[data-cfg="3d:elems"] .grp').allTextContents();
  expect(grps[0]).toContain('Projecteurs par type');
  const shown = () => page.evaluate(() => V3.items.filter(it => it.f && it.o.visible).length);
  await page.uncheck('#view [data-v3h=type][data-k="Test@PC"]');
  await expect.poll(shown).toBe(16);
  await page.check('#view [data-v3h=type][data-k="Test@PC"]');
  await page.locator('#view details.ly', { has: page.locator('[data-k="Test@Lyre"]') }).locator('summary .tw').click();
  await page.locator('#view details.ly', { has: page.locator('[data-k="Test@Lyre"]') }).locator('[data-v3fx="u-1"]').uncheck();
  await expect.poll(shown).toBe(23);
  await page.click('#view [data-v3all=types]');
  await expect.poll(shown).toBe(24);
  await expect(page.locator('#view [data-v3fx="u-1"]').first()).toBeChecked();
});

test('projecteurs par position : machine par machine, plan et 3D', async ({ page }) => {
  test.setTimeout(90_000);
  await loadSynthetic(page); await openCfg(page);
  await page.click('#tabs button[data-v=plan]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24, { timeout: 15000 });
  await planStable(page);
  const posRow = sel => page.locator(`${sel} details.ly`, { has: page.locator('[data-k="P2 Milieu"]') });
  await posRow('.cfg').locator('summary .tw').click();
  await posRow('.cfg').locator('[data-plfx="u-7"]').uncheck();
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(23);
  await expect(posRow('.cfg').locator('summary small')).toHaveText('7/8');
  // même machine décochée dans la liste par type
  await expect(page.locator('.cfg [data-plfx="u-7"]').first()).not.toBeChecked();
  await page.click('.cfg [data-plall=pos]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24);
  await page.click('#tabs button[data-v=v3d]');
  await expect(page.locator('#v3 canvas')).toBeVisible({ timeout: 45000 });
  await posRow('#view .cfg[data-cfg="3d:elems"]').locator('summary .tw').click();
  await posRow('#view .cfg[data-cfg="3d:elems"]').locator('[data-v3fx="u-7"]').uncheck();
  await expect.poll(() => page.evaluate(() => V3.items.filter(it => it.f && it.o.visible).length)).toBe(23);
  await expect(page.locator('#view [data-v3fx="u-7"]').first()).not.toBeChecked();
});

test('plan : déplacer le nom d’un point d’accroche', async ({ page }) => {
  await loadSynthetic(page);
  await page.click('#tabs button[data-v=plan]');
  await expect(page.locator('#planPages .plab')).toHaveCount(27, { timeout: 15000 });   // 24 projecteurs + 3 perches
  const tag = page.locator('#planPages .ptag[data-u="p:P2 Milieu"]');
  // le plan peut encore se redessiner juste après l'ouverture (formes GDTF) : on refait le geste tant qu'il n'a pas pris
  await expect(async () => {
    await page.evaluate(() => { const L = (state.d.planLab2 || {})[planLabKey()]; if (L) delete L['p:P2 Milieu']; replan(); });
    const b = await tag.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 60, b.y + b.height / 2 + 40, { steps: 5 }); await page.mouse.up();
    const b2 = await tag.boundingBox();
    expect(b2.x - b.x).toBeGreaterThan(40); expect(b2.y - b.y).toBeGreaterThan(25);
  }).toPass({ timeout: 15000 });
  expect(await page.evaluate(() => !!state.d.planLab2[planLabKey()]['p:P2 Milieu'])).toBe(true);
  await tag.click({ button: 'right' });
  await expect(tag).toHaveAttribute('transform', /rotate\(45\)/);
  await page.click('#view details[data-cfg="plan:labs"] > summary');
  await page.click('#plLabReset');
  await expect(tag).not.toHaveAttribute('transform', /rotate/);
});

test('plan : étiquettes tournées à 45°, le trait de rappel touche toujours le cadre', async ({ page }) => {
  await loadSynthetic(page); await openCfg(page);
  await page.click('#tabs button[data-v=plan]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24, { timeout: 15000 });
  for (const v of ['front', 'cour']) {
    await page.click(`#view [data-pvbase=${v}]`);
    await page.evaluate(() => { state.plan.labRot = 45; replan(); });
    const r = await page.evaluate(() => {
      const svg = document.querySelector('#planPages svg'), labs = [...svg.querySelectorAll('.plab:not(.ptag)')];
      const lines = [...svg.querySelectorAll('line[stroke-width=".12"]')];
      return { n: lines.length, bad: lines.filter(l => {
        const p = svg.createSVGPoint(); p.x = +l.getAttribute('x2'); p.y = +l.getAttribute('y2');
        return !labs.some(g => {
          const q = p.matrixTransform(g.getCTM().inverse().multiply(svg.getCTM())), rc = g.querySelector('rect');
          const x0 = +rc.getAttribute('x'), y0 = +rc.getAttribute('y'), w = +rc.getAttribute('width'), h = +rc.getAttribute('height');
          return q.x >= x0 - .05 && q.x <= x0 + w + .05 && q.y >= y0 - .05 && q.y <= y0 + h + .05;
        });
      }).length };
    });
    expect(r.n, v).toBeGreaterThan(0);
    expect(r.bad, v).toBe(0);
  }
});

test('modèles d’appareils : ports des switches et des nodes vérifiés', async ({ page }) => {
  await loadSynthetic(page, d => {
    d.lieu = { points: [], boards: [], lines: [], consoles: [],
      devices: [{ id: 's', name: 'SW1', kind: 'switch' }, { id: 'n1', name: 'Node 1', kind: 'node', sw: 'SW1', port: '3', poe: true }, { id: 'n2', name: 'Node 2', kind: 'node', sw: 'SW1', port: '12' }],
      dmxLines: [{ id: 'a', name: 'DMX A', src: 'Node 1', port: 1, universe: 1 }, { id: 'b', name: 'DMX B', src: 'Node 1', port: 5, universe: 2 }] };
  }); await openCfg(page);
  await page.click('#tabs button[data-v=net]'); await page.click('#view [data-nv=models]');
  await expect(page.locator('#view')).toContainText('Aucun modèle');
  // deux modèles : un switch 8 ports dont 2 PoE, un node 4 sorties
  await page.click('#addModel'); await page.click('#addModel');
  const cell = (i, f) => page.locator(`#view input[data-o=models][data-f=${f}]`).nth(i);
  await cell(0, 'name').fill('GigaCore 10'); await cell(0, 'name').press('Enter');
  await cell(0, 'eth').fill('8'); await cell(0, 'eth').press('Enter');
  await cell(0, 'poe').fill('2'); await cell(0, 'poe').press('Enter');
  await cell(0, 'sfp').fill('2'); await cell(0, 'sfp').press('Enter');
  await page.locator('#view select[data-o=models][data-f=kind]').nth(1).selectOption('node');
  await cell(1, 'name').fill('Node 4'); await cell(1, 'name').press('Enter');
  await cell(1, 'dmxOut').fill('4'); await cell(1, 'dmxOut').press('Enter');
  expect(await page.evaluate(() => state.d.lieu.models.map(m => [m.name, m.kind, m.eth, m.poe, m.sfp, m.dmxOut]))).toEqual([['GigaCore 10', 'switch', 8, 2, 2, null], ['Node 4', 'node', 8, null, null, 4]]);
  // rattacher les appareils
  await page.click('#view [data-nv=net]');
  const model = i => page.locator('#view select[data-o=devices][data-f=model]').nth(i);
  await model(0).selectOption('GigaCore 10'); await model(1).selectOption('Node 4');
  const iss = await page.evaluate(() => { const I = netIssues(); return Object.fromEntries(state.d.lieu.devices.map(d => [d.id, I.get(d.id) || []])); });
  expect(iss).toEqual({ s: ['portOver'], n1: ['poeNo', 'portOver'], n2: ['portOver'] });      // port 3 sans PoE ; port 12 > 8 + 2 ; sortie DMX 5 sur un node à 4 sorties
  await expect(page.locator('#view .pmdev')).toHaveCount(3);
  const blk = n => page.locator('#view .pmdev').filter({ has: page.locator('.pmh b', { hasText: new RegExp('^' + n + '$') }) }), sw = blk('SW1'), nd = blk('Node 1');
  await expect(sw.locator('.pm')).toHaveCount(11);   // 10 ports, puis le 12, en trop
  await expect(sw.locator('.pm.bad')).toHaveCount(2);  // port 3 sans PoE, port 12 inexistant
  await expect(nd.locator('.pm.dmx')).toHaveCount(5); await expect(nd.locator('.pm.dmx.bad')).toHaveCount(1);
  // sortie DMX 5 sur un node à 4 sorties
  await page.click('#view [data-nv=dmx]');
  await expect(page.locator('#view .lktab tr.bad')).toHaveCount(3);      // deux câbles Ethernet et la ligne DMX B
  await expect(page.locator('#view .lktab')).toContainText('port inexistant sur cet appareil');
  // renommer le modèle suit dans les appareils, et le lieu l'emporte
  await page.click('#view [data-nv=models]');
  await cell(1, 'name').fill('LumiNode 4'); await cell(1, 'name').press('Enter');
  expect(await page.evaluate(() => state.d.lieu.devices.find(d => d.id === 'n1').model)).toBe('LumiNode 4');
  await expect(page.locator('#view tbody tr').nth(1).locator('td.num')).toHaveText('1');
});

test('les consoles figurent dans les appareils du réseau', async ({ page }) => {
  await loadSynthetic(page, d => {
    d.lieu = { points: [], boards: [], lines: [], dmxLines: [], devices: [{ id: 'v', name: 'grandMA3 régie', kind: 'console', ip: '2.0.0.100' }],
      consoles: [{ id: 'c1', name: 'grandMA3 régie' }, { id: 'c2', name: 'onPC backup' }] };
  }); await openCfg(page);
  // la première retrouve son appareil, la seconde en reçoit un
  expect(await page.evaluate(() => state.d.lieu.devices.map(v => `${v.name}:${v.kind}`))).toEqual(['grandMA3 régie:console', 'onPC backup:console']);
  expect(await page.evaluate(() => state.d.lieu.consoles.map(c => c.device))).toEqual(['grandMA3 régie', 'onPC backup']);
  await page.click('#tabs button[data-v=net]'); await page.click('#view [data-nv=console]');
  await page.click('#addConsole');
  const nm = page.locator('#view input[data-o=consoles][data-f=name]').nth(2);
  await nm.fill('Pupitre plateau'); await nm.press('Enter');
  await page.click('#view [data-nv=net]');
  const names = page.locator('#view input[data-o=devices][data-f=name]');
  await expect(names).toHaveCount(3);
  await expect(names.nth(2)).toHaveValue('Pupitre plateau');
  await expect(page.locator('#view [data-deldev]')).toHaveCount(0);    // se suppriment avec leur console
  // pas de modèle d'appareil pour une console : il se choisit dans l'onglet Console
  await expect(page.locator('#view select[data-o=devices][data-f=model]')).toHaveCount(0);
  await page.locator('#view .dvtab button[data-nv=console]').first().click();
  await expect(page.locator('#view [data-nv=console]')).toHaveClass(/on/);
  await page.click('#view [data-nv=models]'); await page.click('#addModel');
  await expect(page.locator('#view select[data-o=models][data-f=kind] option[value=console]')).toHaveCount(0);
  await page.click('#view [data-nv=net]');
  await page.click('#view [data-nv=console]');
  await page.locator('#view [data-delcon]').nth(2).click();
  await page.click('#view [data-nv=net]');
  await expect(names).toHaveCount(2);
});

test('appareils : ports réglés dans la fiche, univers des sorties de console et de splitter', async ({ page }) => {
  await loadSynthetic(page, d => {
    d.lieu = { points: [], boards: [], lines: [], netLinks: [{ id: 'l1', kind: 'eth', a: 'SW régie', ap: 5, b: 'Node 1', bp: 1 }],
      models: [{ id: 'm', name: 'Switch 8', kind: 'switch', eth: 6, sfp: 2, poe: 4 }],
      consoles: [{ id: 'k', name: 'MA3', device: 'MA3' }],
      devices: [{ id: 'c', name: 'MA3', kind: 'console' }, { id: 'sr', name: 'SW régie', kind: 'switch', model: 'Switch 8' }, { id: 'n', name: 'Node 1', kind: 'node', poe: true }, { id: 'sp', name: 'Split', kind: 'splitter', ports: { in: 1, out: 4 } }],
      dmxLines: [{ id: 'a', name: 'DMX A', src: 'MA3', port: 2, universe: null, dest: 'Split', destPort: 1 }, { id: 'b', name: 'DMX B', src: 'Split', port: 1, dest: 'P1 Lointain' }, { id: 'c2', name: 'DMX C', src: 'Split', port: 3, dest: 'P2 Milieu' }] };
  }); await openCfg(page);
  // console : nombres de ports et univers de chaque sortie, dans l'onglet Console
  await page.click('#tabs button[data-v=net]'); await page.click('#view [data-nv=console]');
  const cf = f => page.locator(`#view input[data-o=consoles][data-f=${f}]`);
  await cf('ethPorts').fill('2'); await cf('ethPorts').press('Tab');
  await cf('dmxIn').fill('1'); await cf('dmxIn').press('Tab');
  await cf('dmxPorts').fill('4'); await cf('dmxPorts').press('Tab');
  await page.locator('#view input[data-puniv=o2][data-id=c]').fill('7'); await page.locator('#view input[data-puniv=o2][data-id=c]').press('Tab');
  // la ligne qui part de la sortie 2, et celles qui sortent du splitter, prennent l'univers 7
  expect(await page.evaluate(() => state.d.lieu.dmxLines.map(l => `${l.name}:${l.universe}`))).toEqual(['DMX A:7', 'DMX B:7', 'DMX C:7']);
  // une sortie de splitter réglée à part
  await page.click('#view [data-nv=net]');
  await page.click('#view [data-devtog=sp]');
  await expect(page.locator('#view input[data-puniv=o1][data-id=sp]')).toHaveAttribute('placeholder', '7');
  await page.locator('#view input[data-puniv=o3][data-id=sp]').fill('8'); await page.locator('#view input[data-puniv=o3][data-id=sp]').press('Tab');
  expect(await page.evaluate(() => state.d.lieu.dmxLines.map(l => `${l.name}:${l.universe}`))).toEqual(['DMX A:7', 'DMX B:7', 'DMX C:8']);
  // fiche de la console : nombres de ports repris de l'onglet Console, pas de réglage ici
  await page.click('#view [data-devtog=c]');
  await expect(page.locator('#view input[data-dport][data-id=c]')).toHaveCount(0);
  await expect(page.locator('#view tr.devsheet .ptab').first().locator('tbody tr')).toHaveCount(7);   // 2 Ethernet, 1 entrée, 4 sorties
  // switch : pas de branchement dans la fiche, mais nom et VLAN des ports ; le câble s'y lit
  await page.click('#view [data-devtog=sr]');
  await expect(page.locator('#view select[data-pconn]')).toHaveCount(0);
  await page.locator('#view input[data-pvlan=e5][data-id=sr]').fill('10'); await page.locator('#view input[data-pvlan=e5][data-id=sr]').press('Tab');
  await page.locator('#view input[data-pname=e7][data-id=sr]').fill('Uplink scène'); await page.locator('#view input[data-pname=e7][data-id=sr]').press('Tab');
  expect(await page.evaluate(() => { const v = state.d.lieu.devices.find(x => x.id === 'sr'); return [v.portVlan, v.portNames]; })).toEqual([{ e5: 10 }, { e7: 'Uplink scène' }]);
  const swRows = page.locator('#view tr.devsheet', { has: page.locator('[data-pvlan][data-id=sr]') }).locator('.ptab tbody tr');
  await expect(swRows.nth(4)).toContainText('Node 1 · port 1');
  expect(await page.evaluate(() => netIssues().get('n') || [])).toEqual(['poeNo']);    // port 5 sans PoE (4 ports PoE)
  // dans Liaisons, changer l'univers d'une ligne règle aussi la sortie de la console
  await page.click('#view [data-nv=dmx]');
  const u = page.locator('#view input[data-o=dmxLines][data-f=universe][data-id=a]');
  await u.fill('9'); await u.press('Tab');
  expect(await page.evaluate(() => [state.d.lieu.devices[0].portUniv, state.d.lieu.dmxLines.map(l => l.universe)])).toEqual([{ o2: 9 }, [9, 9, 8]]);
});

test('tableaux : tri par colonne et filtre des lignes, dans toutes les vues', async ({ page }) => {
  await loadSynthetic(page, d => {
    d.lieu = { points: [], boards: [], lines: [], consoles: [], netLinks: [{ id: 'k1', kind: 'eth', a: 'SW1', ap: 2, b: 'Node B', bp: 1 }, { id: 'k2', kind: 'eth', a: 'SW1', ap: 1, b: 'Node A', bp: 1 }],
      dmxLines: [{ id: 'x1', name: 'DMX 2', src: 'Node A', port: 1, universe: 2 }, { id: 'x2', name: 'DMX 10', src: 'Node A', port: 2, universe: 1 }],
      devices: [{ id: 's', name: 'SW1', kind: 'switch' }, { id: 'a', name: 'Node A', kind: 'node' }, { id: 'b', name: 'Node B', kind: 'node' }] };
  }); await openCfg(page);
  // accroches : le filtre ne garde que les lignes qui contiennent tous les mots, le total reste
  await page.click('#tabs button[data-v=rigging]');
  const rg = page.locator('#view table.grid').first(), rows = rg.locator('tbody tr:not([hidden])');
  await expect(rows).toHaveCount(5);                     // 4 points + total
  await page.locator('#view .tfq').first().fill('lointain');
  await expect(rows).toHaveCount(2); await expect(rows.last()).toHaveClass(/ttot/);
  await expect(page.locator('#view .tfn').first()).toHaveText('1 ligne(s) sur 4');
  await page.locator('#view .tfreset').first().click();
  await expect(rows).toHaveCount(5);
  // DMX et réseau : appareils triés par nom décroissant, la fiche ouverte suit sa ligne
  await page.click('#tabs button[data-v=net]'); await page.click('#view [data-nv=net]');
  await page.click('#view [data-devtog=a]');
  const th = page.locator('#view .dvtab th.tsort', { hasText: 'Appareil' });
  await th.click(); await th.click();
  await expect(th).toHaveClass(/desc/);
  const names = () => page.evaluate(() => [...document.querySelectorAll('#view .dvtab > tbody > tr')].map(r => r.classList.contains('devsheet') ? '[fiche]' : r.querySelector('input[data-f=name]').value));
  expect(await names()).toEqual(['SW1', 'Node B', 'Node A', '[fiche]']);
  // le tri tient après une modification (le tableau est redessiné)
  await page.locator('#view input[data-o=devices][data-f=name][data-id=b]').fill('Node Z'); await page.locator('#view input[data-o=devices][data-f=name][data-id=b]').press('Tab');
  await expect.poll(names).toEqual(['SW1', 'Node Z', 'Node A', '[fiche]']);
  await th.click(); await expect(th).not.toHaveClass(/asc|desc/);
  // liaisons : câbles et lignes DMX triés chacun dans leur groupe (ordre naturel : DMX 2 avant DMX 10)
  await page.click('#view [data-nv=dmx]');
  await page.locator('#view .lktab th.tsort', { hasText: 'Repère' }).click();
  const refs = await page.evaluate(() => [...document.querySelectorAll('#view .lktab tbody tr')].map(r => r.classList.contains('lksep') ? '|' : r.querySelector('input[data-f=name]').value || r.querySelector('select[data-f=a]').value));
  expect(refs.slice(2)).toEqual(['|', 'DMX 2', 'DMX 10']);
  await page.locator('#view .lktab th.tsort', { hasText: 'Univers' }).click();
  expect(await page.evaluate(() => [...document.querySelectorAll('#view .lktab tbody tr')].filter(r => r.querySelector('[data-o=dmxLines]')).map(r => r.querySelector('input[data-f=name]').value))).toEqual(['DMX 10', 'DMX 2']);
  // types et inventaire : filtre
  await page.click('#tabs button[data-v=inventory]');
  await page.locator('#view .tfq').first().fill('lyre');
  await expect(page.locator('#view table.grid').first().locator('tbody tr:not([hidden]):not(.ttot)')).toHaveCount(1);
});

test('univers d’une sortie de node : les projecteurs du patch se raccrochent à la ligne', async ({ page }) => {
  await loadSynthetic(page, d => {
    d.lieu = { points: [], boards: [], lines: [], consoles: [], netLinks: [],
      devices: [{ id: 'n', name: 'Node 1', kind: 'node', ports: { out: 2 } }],
      dmxLines: [{ id: 'a', name: 'DMX A', src: 'Node 1', port: 1, dest: 'P1 Lointain' }, { id: 'b', name: 'DMX B', src: 'Node 1', port: 2, dest: 'P1 Lointain' }] };
  }); await openCfg(page);
  const u1 = await page.evaluate(() => state.d.fixtures.find(f => f.position === 'P1 Lointain').univ);
  const onLine = () => page.evaluate(() => state.d.fixtures.filter(f => f.position === 'P1 Lointain').map(f => f.dmxLine || '-').join(' '));
  await page.click('#tabs button[data-v=net]'); await page.click('#view [data-nv=net]');
  await page.click('#view [data-devtog=n]');
  const port = k => page.locator(`#view input[data-puniv=${k}][data-id=n]`);
  await port('o1').fill(String(u1)); await port('o1').press('Tab');
  expect(await onLine()).toBe('DMX A DMX A DMX A DMX A DMX A DMX A');
  // l'autre sortie prend le même univers : deux lignes possibles, les projecteurs restent où ils sont
  await port('o2').fill(String(u1)); await port('o2').press('Tab');
  expect(await onLine()).toBe('DMX A DMX A DMX A DMX A DMX A DMX A');
  // la sortie 1 change d'univers : les projecteurs passent sur la ligne qui porte encore le leur
  await port('o1').fill(String(u1 + 5)); await port('o1').press('Tab');
  expect(await onLine()).toBe('DMX B DMX B DMX B DMX B DMX B DMX B');
  // dans le patch, un projecteur change d'univers : il quitte la ligne
  await page.click('#tabs button[data-v=fixtures]');
  const cell = page.locator('#view tbody tr').filter({ has: page.locator('input[data-k=fid][value="101"]') }).locator('input[data-k=patch]');
  await cell.fill(`${u1 + 9}.1`); await cell.press('Tab');
  expect(await onLine()).toBe('- DMX B DMX B DMX B DMX B DMX B');
});

test('portrait ou paysage : vues 3D et synoptiques, gardé dans le dossier complet', async ({ page }) => {
  test.setTimeout(90_000);
  await loadSynthetic(page, d => {
    d.lieu = { points: [], boards: [{ id: 'b1', name: 'TD1', supply: 'tri', amps: 63 }], lines: [{ id: 'l1', name: 'G1', board: 'TD1', kind: 'grada', phase: 'L1', amps: 16, dest: 'P2 Milieu' }],
      dmxLines: [{ id: 'd1', name: 'DMX A', src: 'Node 1', port: 1, universe: 1, dest: 'P1 Lointain' }],
      devices: [{ id: 's', name: 'SW1', kind: 'switch', ip: '2.0.0.2' }, { id: 'v1', name: 'Node 1', kind: 'node', ip: '2.0.0.10' }], consoles: [] };
  }); await openCfg(page);
  // synoptique réseau en portrait : réglage du dossier, page d'impression en portrait
  await page.click('#tabs button[data-v=syno]');
  await page.click('#view [data-sv=net]');
  await page.selectOption('#view select[data-synor=net]', 'portrait');
  await expect(page.locator('#view .synwrap.port')).toHaveCount(1);
  expect(await page.evaluate(() => [state.d.lieu.settings.synOrient, $('#pagesize').textContent])).toEqual([{ net: 'portrait' }, expect.stringContaining('A4 portrait')]);
  await page.click('#view [data-sv=elec]');
  await expect(page.locator('#view select[data-synor=elec]')).toHaveValue('landscape');
  // vue 3D en portrait : cadre à la forme de la page, réglage et image gardés dans la vue
  await page.click('#tabs button[data-v=v3d]');
  await expect(page.locator('#v3 canvas')).toBeVisible({ timeout: 45000 });
  page.on('dialog', dlg => dlg.accept('Vue 3D portrait'));
  await page.evaluate(() => { window.prompt = () => 'Vue 3D portrait'; });
  await page.click('#view [data-vnew="3d"]');
  await page.selectOption('#view select[data-v3=orient]', 'portrait');
  await expect(page.locator('#v3.port')).toHaveCount(1);
  const r = await page.locator('#v3').evaluate(el => el.clientHeight / el.clientWidth);
  expect(r).toBeGreaterThan(1.3);
  await expect.poll(() => page.evaluate(() => { const v = state.d.views.find(x => x.name === 'Vue 3D portrait'); return v && v.settings.orient; })).toBe('portrait');
  // dossier complet : page 3D et synoptique réseau en portrait, synoptique électrique en paysage
  await page.evaluate(() => { const v = state.d.views.find(x => x.name === 'Vue 3D portrait'); v.inDossier = true; });
  await page.click('#tabs button[data-v=dossier]');
  await expect(page.locator('#dosPages .v3page.port')).toHaveCount(1);
  await expect(page.locator('#dosPages .dpage.port:has(.nsyn)')).toHaveCount(1);
  await expect(page.locator('#dosPages .dpage:not(.port):has(.syn:not(.nsyn))')).toHaveCount(1);
  const w = await page.locator('#dosPages .v3page.port').evaluate(el => el.getBoundingClientRect().height / el.getBoundingClientRect().width);
  expect(w).toBeCloseTo(297 / 210, 1);
});

test('synoptique réseau : colonnes fixes (consoles, switches, nodes, splitters et mergers)', async ({ page }) => {
  await loadSynthetic(page, d => {
    d.lieu = { points: [], boards: [], lines: [],
      dmxLines: [{ id: 'd1', name: 'DMX A', src: 'Node 1', port: 1, universe: 1, dest: 'P1 Lointain' }, { id: 'd2', name: 'DMX B', src: 'MA2 secours', port: 1, universe: 2, dest: 'P3 Face' },
        { id: 'd3', name: 'DMX C', src: 'Node 1', port: 2, universe: 3, dest: 'Split 1', destPort: 1 }, { id: 'd4', name: 'DMX D', src: 'Split 1', port: 1, universe: 3, dest: 'P2 Milieu' }],
      devices: [{ id: 's', name: 'SW1', kind: 'switch' }, { id: 's2', name: 'SW2', kind: 'switch' }, { id: 'v1', name: 'Node 1', kind: 'node' }, { id: 'sp', name: 'Split 1', kind: 'splitter' }, { id: 's3', name: 'SW3', kind: 'switch' }, { id: 'v2', name: 'Node 2', kind: 'node' }, { id: 'v3', name: 'Node 3', kind: 'node' },
        { id: 'c', name: 'MA3', kind: 'console' }, { id: 'c2', name: 'MA3 backup', kind: 'console' }, { id: 'c3', name: 'MA2 secours', kind: 'console' }],
      netLinks: [{ id: 'n1', kind: 'eth', a: 'SW1', ap: 1, b: 'SW2', bp: 1 }, { id: 'n2', kind: 'eth', a: 'SW2', ap: 2, b: 'MA3', bp: 1 }, { id: 'n3', kind: 'eth', a: 'SW1', ap: 2, b: 'Node 1', bp: 1 },
        { id: 'n4', kind: 'eth', a: 'SW1', ap: 3, b: 'MA3 backup', bp: 1 }, { id: 'n5', kind: 'eth', a: 'SW2', ap: 5, b: 'SW3', bp: 1 }, { id: 'n6', kind: 'eth', a: 'SW3', ap: 2, b: 'Node 2', bp: 1 },
        { id: 'n7', kind: 'eth', a: 'Node 2', ap: 2, b: 'Node 3', bp: 1 }],
      consoles: [] };
  }); await openCfg(page);
  await page.click('#tabs button[data-v=syno]');
  await page.click('#view [data-sv=net]');
  const xs = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('#view .nsyn svg g').forEach(g => { const r = g.querySelector('.box'), tx = g.querySelector('text'); if (r && tx) out[tx.textContent] = r.getBBox().x; });
    return out;
  });
  // colonnes fixes : consoles, puis switches (même un switch derrière un switch), nodes, splitters et mergers
  const col = n => Math.round((xs[n] - 18) / 350);
  expect(['MA3', 'MA3 backup', 'MA2 secours', 'SW1', 'SW2', 'SW3', 'Node 1', 'Node 2', 'Node 3', 'Split 1'].map(col)).toEqual([0, 0, 0, 1, 1, 2, 3, 3, 3, 4]);
  await expect(page.locator('#view .nsyn svg')).toContainText('P1 Lointain');
  // une forme par type d'appareil ; noms de ports dans les boîtes, au point de connexion
  for (const k of ['console', 'switch', 'node', 'splitter']) await expect(page.locator(`#view .nsyn .box.k-${k}`).first()).toBeVisible();
  expect(await page.locator('#view .nsyn path.box.k-console').count()).toBe(3);
  const tag = await page.evaluate(() => { const t2 = [...document.querySelectorAll('#view .nsyn .ptag')].find(e => e.textContent === 'sortie 2'); const b = [...document.querySelectorAll('#view .nsyn g')].find(g => g.querySelector('text') && g.querySelector('text').textContent === 'Node 1').querySelector('.box').getBBox(); const tb = t2.getBBox(); return tb.x >= b.x && tb.x + tb.width <= b.x + b.width + 1; });
  expect(tag).toBe(true);
});

test('synoptique réseau : modifier, relier et supprimer des liaisons', async ({ page }) => {
  await loadSynthetic(page, d => {
    d.lieu = { points: [], boards: [], lines: [], consoles: [],
      dmxLines: [{ id: 'd1', name: 'DMX A', src: 'Node 1', port: 1, universe: 1, dest: 'P1 Lointain' }],
      devices: [{ id: 's', name: 'SW1', kind: 'switch', ports: { eth: 8 } }, { id: 'v1', name: 'Node 1', kind: 'node', ports: { eth: 2, out: 4 } }, { id: 'v2', name: 'Node 2', kind: 'node', ports: { eth: 2, out: 4 } },
        { id: 'c', name: 'MA3', kind: 'console', ports: { eth: 2 } }],
      netLinks: [{ id: 'n1', kind: 'eth', name: 'C1', a: 'SW1', ap: 1, b: 'Node 1', bp: 1 }] };
  });
  await page.click('#tabs button[data-v=syno]');
  await page.click('#view [data-sv=net]');
  const box = page.locator('#view details[data-cfg="syno:net:edit"]');
  await expect(box).toHaveAttribute('open', '');
  // clic sur un câble : il est sélectionné et ses champs s'ouvrent
  await page.locator('#view .nsyn .lkhit[data-lk="netLinks:n1"]').click({ force: true });
  await expect(page.locator('#view .nsyn path.lksel')).toHaveCount(1);
  await box.locator('[data-o=netLinks][data-f=length]').fill('25');
  await box.locator('[data-o=netLinks][data-f=length]').press('Tab');
  expect(await page.evaluate(() => state.d.lieu.netLinks[0].length)).toBe(25);
  await expect(page.locator('#view .nsyn')).toContainText('25 m');
  // relier la console au switch en Ethernet : deux clics, premiers ports libres
  await box.locator('[data-synmode=eth]').click();
  await page.locator('#view .nsyn [data-sdev="MA3"]').click();
  await expect(box).toContainText('départ : MA3');
  await page.locator('#view .nsyn [data-sdev="SW1"]').click();
  expect(await page.evaluate(() => state.d.lieu.netLinks.map(l => [l.a, l.ap, l.b, l.bp]))).toEqual([['SW1', 1, 'Node 1', 1], ['MA3', 1, 'SW1', 2]]);
  // une ligne DMX du node 2 vers une position
  await box.locator('[data-synmode=dmx]').click();
  await page.locator('#view .nsyn [data-sdev="Node 2"]').click();
  await box.locator('#synToPos').selectOption('P3 Face');
  expect(await page.evaluate(() => state.d.lieu.dmxLines.map(l => [l.name, l.src, l.port, l.dest]))).toEqual([['DMX A', 'Node 1', 1, 'P1 Lointain'], ['DMX 2', 'Node 2', 1, 'P3 Face']]);
  await expect(page.locator('#view .nsyn [data-spos="P3 Face"]')).toHaveCount(1);
  await expect(box.locator('[data-o=dmxLines][data-f=name]')).toHaveValue('DMX 2');
  // supprimer la liaison sélectionnée (la dernière créée)
  const n = await page.evaluate(() => state.d.lieu.netLinks.length + state.d.lieu.dmxLines.length);
  await box.locator('#synDel').click();
  expect(await page.evaluate(() => state.d.lieu.netLinks.length + state.d.lieu.dmxLines.length)).toBe(n - 1);
});
