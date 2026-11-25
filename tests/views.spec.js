// Chaque vue s'affiche sans erreur avec le dossier de test ; plan, 3D et dossier complet produisent quelque chose
const { test, expect, loadSynthetic } = require('./helpers');

const TABS = { fixtures: ['pv', ['table', 'sheet', 'diff']], plan: [], rigging: ['rv', ['points']], elec: ['ev', ['lines']], syno: ['sv', ['elec', 'net']], net: ['nv', ['console', 'univ', 'dmx', 'net']], inventory: ['iv', ['inv', 'gdtf', 'parc', 'ecart']], labels: ['lv', ['fx', 'heads', 'elec', 'dmx', 'net']], dossier: [] };

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
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24, { timeout: 15000 });
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

test('plan : les six vues (dessus, dessous, face, lointain, jardin, cour)', async ({ page }) => {
  await loadSynthetic(page);
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
  await loadSynthetic(page);
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
  });
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
  });
  await page.click('#tabs button[data-v=net]'); await page.click('#view [data-nv=dmx]');
  await expect(page.locator('#view select[data-f=dest]').first()).toHaveValue('Merger 1');
  await page.click('#view [data-nv=net]');
  await expect(page.locator('#view select[data-f=merge]')).toHaveValue('ltp');
  await page.click('#tabs button[data-v=syno]'); await page.click('#view [data-sv=net]');
  const svg = page.locator('#view .nsyn svg');
  for (const txt of ['Merger 1', 'fusion LTP', 'IN A', 'IN B', 'OUT', 'entrée 2', 'P1 Lointain']) await expect(svg).toContainText(txt);
  // renommer le merger suit dans les lignes
  await page.click('#tabs button[data-v=net]'); await page.click('#view [data-nv=net]');
  const nm = page.locator('#view input[data-o=devices][data-f=name]').nth(2); await nm.fill('Merger régie'); await nm.press('Enter');
  expect(await page.evaluate(() => state.d.lieu.dmxLines.map(l => l.dest + '|' + l.src).join(' '))).toBe('Merger régie|MA3 Merger régie|Avo P1 Lointain|Merger régie');
});

test('plan : échelle choisie, ajustée à la page avec règles, rotation', async ({ page }) => {
  await loadSynthetic(page);
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
  await loadSynthetic(page);
  await page.click('#tabs button[data-v=plan]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24, { timeout: 15000 });
  await page.selectOption('[data-pl=orient]', 'portrait');
  await expect(page.locator('#planPages svg').first()).toHaveAttribute('viewBox', '0 0 297 420');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24);
  expect(await page.locator('#pagesize').textContent()).toContain('A3 portrait');
});

test('plan : éditeur de légende (masquer, renommer, ordre, entrée libre, notes)', async ({ page }) => {
  await loadSynthetic(page);
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
  await loadSynthetic(page, d => { d.types['Test@Lyre'].modes = { Std: 20, Basic: 12 }; d.fixtures[0].mode = 'Basic'; d.fixtures[0].nch = 12; });
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
  await loadSynthetic(page);
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
  await loadSynthetic(page);
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
  await loadSynthetic(page);
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
  await loadSynthetic(page);
  await page.click('#tabs button[data-v=plan]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24, { timeout: 15000 });
  const grps = await page.locator('.plpanel .grp').allTextContents();
  expect(grps[0]).toContain('Projecteurs par type');
  // A3 paysage, 1:50 : le cadre utile fait environ 324 × 261 mm, soit 16,2 × 13 m
  await page.evaluate(() => { Object.assign(state.plan, { zone: { x0: -8, x1: 8, y0: -6, y1: 6.9 }, fit: 'scale', scale: 50 }); renderPlanView(); });
  expect(await page.locator('#planPages svg').first().textContent()).not.toContain('dépasse');
  await page.evaluate(() => { state.plan.zone = { x0: -9, x1: 9, y0: -6, y1: 8 }; renderPlanView(); });
  expect(await page.locator('#planPages svg').first().textContent()).toContain('la zone dépasse du cadre à cette échelle (tient au 1:75)');
});

test('plan : projecteurs superposés, étiquettes en colonnes par type, sans chevauchement', async ({ page }) => {
  await loadSynthetic(page);
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
  await loadSynthetic(page);
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
  await loadSynthetic(page);
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
  await loadSynthetic(page);
  await page.click('#tabs button[data-v=plan]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24, { timeout: 15000 });
  const grps = await page.locator('.plpanel .grp').allTextContents();
  expect(grps[0]).toContain('Projecteurs par type');
  await page.uncheck('.plpanel [data-plh=type][data-k="Test@PC"]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(16);
  await page.check('.plpanel [data-plh=type][data-k="Test@PC"]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24);
  // une machine seule : déplier le type et décocher 101
  await page.locator('.plpanel details.ly', { has: page.locator('[data-k="Test@Lyre"]') }).locator('summary .tw').click();
  await page.locator('.plpanel details.ly', { has: page.locator('[data-k="Test@Lyre"]') }).locator('[data-plfx="u-1"]').uncheck();
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(23);
  await expect(page.locator('.plpanel details.ly', { has: page.locator('[data-k="Test@Lyre"]') }).locator('summary small')).toHaveText('5/6');
  await page.click('.plpanel [data-plall=types]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24);
});

test('3D : masquer ou afficher des machines par type ou une à une, projecteurs en tête', async ({ page }) => {
  test.setTimeout(90_000);
  await loadSynthetic(page);
  await page.click('#tabs button[data-v=v3d]');
  await expect(page.locator('#v3 canvas')).toBeVisible({ timeout: 45000 });
  const grps = await page.locator('#v3 .v3panel .grp').allTextContents();
  expect(grps[0]).toContain('Projecteurs par type');
  const shown = () => page.evaluate(() => V3.items.filter(it => it.f && it.o.visible).length);
  await page.uncheck('#v3 [data-v3h=type][data-k="Test@PC"]');
  await expect.poll(shown).toBe(16);
  await page.check('#v3 [data-v3h=type][data-k="Test@PC"]');
  await page.locator('#v3 details.ly', { has: page.locator('[data-k="Test@Lyre"]') }).locator('summary .tw').click();
  await page.locator('#v3 details.ly', { has: page.locator('[data-k="Test@Lyre"]') }).locator('[data-v3fx="u-1"]').uncheck();
  await expect.poll(shown).toBe(23);
  await page.click('#v3 [data-v3all=types]');
  await expect.poll(shown).toBe(24);
  await expect(page.locator('#v3 [data-v3fx="u-1"]').first()).toBeChecked();
});

test('projecteurs par position : machine par machine, plan et 3D', async ({ page }) => {
  test.setTimeout(90_000);
  await loadSynthetic(page);
  await page.click('#tabs button[data-v=plan]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24, { timeout: 15000 });
  const posRow = sel => page.locator(`${sel} details.ly`, { has: page.locator('[data-k="P2 Milieu"]') });
  await posRow('.plpanel').locator('summary .tw').click();
  await posRow('.plpanel').locator('[data-plfx="u-7"]').uncheck();
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(23);
  await expect(posRow('.plpanel').locator('summary small')).toHaveText('7/8');
  // même machine décochée dans la liste par type
  await expect(page.locator('.plpanel [data-plfx="u-7"]').first()).not.toBeChecked();
  await page.click('.plpanel [data-plall=pos]');
  await expect(page.locator('#planPages .plab:not(.ptag)')).toHaveCount(24);
  await page.click('#tabs button[data-v=v3d]');
  await expect(page.locator('#v3 canvas')).toBeVisible({ timeout: 45000 });
  await posRow('#v3').locator('summary .tw').click();
  await posRow('#v3').locator('[data-v3fx="u-7"]').uncheck();
  await expect.poll(() => page.evaluate(() => V3.items.filter(it => it.f && it.o.visible).length)).toBe(23);
  await expect(page.locator('#v3 [data-v3fx="u-7"]').first()).not.toBeChecked();
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
  await page.click('#plLabReset');
  await expect(tag).not.toHaveAttribute('transform', /rotate/);
});

test('plan : étiquettes tournées à 45°, le trait de rappel touche toujours le cadre', async ({ page }) => {
  await loadSynthetic(page);
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
  });
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
  const iss = await page.evaluate(() => Object.fromEntries([...netIssues()].map(([id, v]) => [id, v])));
  expect(iss).toEqual({ n1: ['poeNo'], n2: ['portOver'] });      // port 3 sans PoE ; port 12 > 8 + 2
  await expect(page.locator('#view .pmdev')).toHaveCount(2);
  const blk = n => page.locator('#view .pmdev').filter({ has: page.locator('.pmh b', { hasText: new RegExp('^' + n + '$') }) }), sw = blk('SW1'), nd = blk('Node 1');
  await expect(sw.locator('.pm')).toHaveCount(11);   // 10 ports, puis le 12, en trop
  await expect(sw.locator('.pm.bad')).toHaveCount(2);  // port 3 sans PoE, port 12 inexistant
  await expect(nd.locator('.pm')).toHaveCount(5); await expect(nd.locator('.pm.bad')).toHaveCount(1);
  // sortie DMX 5 sur un node à 4 sorties
  await page.click('#view [data-nv=dmx]');
  await expect(page.locator('#view')).toContainText('le node n’a que 4 sortie(s) DMX');
  // renommer le modèle suit dans les appareils, et le lieu l'emporte
  await page.click('#view [data-nv=models]');
  await cell(1, 'name').fill('LumiNode 4'); await cell(1, 'name').press('Enter');
  expect(await page.evaluate(() => state.d.lieu.devices.find(d => d.id === 'n1').model)).toBe('LumiNode 4');
  await expect(page.locator('#view tbody tr').nth(1).locator('td.num')).toHaveText('1');
});
