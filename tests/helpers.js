// Outils communs aux tests : page sans réseau, dossier de test fabriqué (aucune donnée réelle), erreurs JS relevées
const path = require('path'), fs = require('fs');
const { test: base, expect } = require('@playwright/test');

const THREE_DIR = path.resolve(__dirname, '..', 'node_modules', 'three');
const CDN = [
  ['https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', 'build/three.min.js'],
  ['https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/TDSLoader.js', 'examples/js/loaders/TDSLoader.js'],
  ['https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js', 'examples/js/loaders/GLTFLoader.js'],
];

// la page de test : CDN servis en local, polices coupées, dialogues acceptés, erreurs JS gardées
const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => d.accept());
    for (const [url, file] of CDN) await page.route(url, r => r.fulfill({ body: fs.readFileSync(path.join(THREE_DIR, file)), contentType: 'application/javascript' }));
    await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
    await page.goto('/index.html');
    await page.evaluate(() => { localStorage.clear(); localStorage.setItem('oplanfeu.lang', JSON.stringify('fr')); });
    await page.evaluate(() => new Promise(ok => { const r = indexedDB.deleteDatabase('oplanfeu-dossier'); r.onsuccess = r.onerror = r.onblocked = () => ok(); }));
    await page.reload();
    page.jsErrors = errors;
    await use(page);
    expect(errors, 'erreurs JavaScript dans la page').toEqual([]);
  },
});

// dossier de test : trois perches, un sol, trois types, deux univers ; coordonnées en mètres
function syntheticDossier() {
  const types = {
    'Test@Lyre': { name: 'Lyre Test', maker: 'Test', gdtf: '', modes: { Std: 20 }, weight: 25, power: 600, stock: 6 },
    'Test@PC': { name: 'PC 1kW', maker: 'Test', gdtf: '', modes: { '': 1 }, weight: 8, power: 1000, stock: null },
    'Test@ParLed': { name: 'PAR LED Test', maker: 'Test', gdtf: '', modes: { '8ch': 8 }, weight: 5, power: 150, stock: null },
  };
  const fixtures = [];
  let n = 0;
  const add = (pos, y, z, type, mode, nch, count, univ, firstFid) => {
    for (let i = 0; i < count; i++) {
      const x = -((count - 1) / 2) + i, addr = 1 + i * nch + (n % 3) * 100;
      fixtures.push({ uid: `u-${++n}`, fid: String(firstFid + i), unit: String(i + 1), name: '', type, mode, nch, univ, addr, layer: 'Calque ' + pos, position: pos,
        purpose: '', gel: i % 2 ? 'L201' : '', acc: '', notes: '', color: null, x, y, z, m: [1, 0, 0, 0, -1, 0, 0, 0, -1, x * 1000, y * 1000, z * 1000] });
    }
  };
  add('P1 Lointain', 5, 7, 'Test@Lyre', 'Std', 20, 6, 1, 101);
  add('P2 Milieu', 2, 7, 'Test@PC', '', 1, 8, 2, 201);
  add('P3 Face', -4, 8, 'Test@ParLed', '8ch', 8, 6, 2, 301);
  add('Sol', 6, 0.2, 'Test@ParLed', '8ch', 8, 4, 1, 401);
  fixtures.find(f => f.fid === '404').z = 0.25;
  return {
    format: 'oplanfeu', version: 2,
    meta: { titre: 'Dossier de test', kind: 'lieu', date: '2026-01-15', lieu: 'Salle de test', auteur: 'Tests', notes: '', source: 'tests', imported: '2026-01-15T10:00:00.000Z' },
    types, fixtures, structures: [], lieu: null,
  };
}
// ouvre le dossier de test dans la page (comme un .json déposé)
async function loadSynthetic(page, tweak) {
  const d = syntheticDossier(); if (tweak) tweak(d);
  await page.evaluate(d => load(checkDossier(d), 'open'), d);
  await page.waitForFunction(() => typeof state !== 'undefined' && state.d && state.d.fixtures.length > 0);
  return d;
}
// fichier temporaire pour setInputFiles
// (chemin en ASCII : un titre de test avec une apostrophe typographique casserait setInputFiles)
function tmpFile(testInfo, name, content) { const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'opf-')), p = path.join(dir, name); if (content !== undefined) fs.writeFileSync(p, content); return p; }

module.exports = { test, expect, syntheticDossier, loadSynthetic, tmpFile };
