// Show de base grandMA2 : fenêtre de la vue Shows, correspondance des types, fichiers du zip
const { test, expect, loadSynthetic } = require('./helpers');
const fs = require('fs');

test('show grandMA2 : correspondance des types, options, zip pour la clé USB', async ({ page }) => {
  await loadSynthetic(page, d => { d.fixtures[0].name = 'Lyre régie'; });
  await page.click('#tabs button[data-v=shows]');
  await page.click('#view [data-sh=ma2]');
  const dlg = page.locator('#ma2Dlg');
  await expect(dlg).toBeVisible();
  // trois fixture types ; le PC à 1 canal va sur le Dimmer d'un show neuf (n° 2), les autres à partir de 3
  const rows = dlg.locator('tbody tr');
  await expect(rows).toHaveCount(3);
  const pc = rows.filter({ hasText: 'PC 1kW' });
  await expect(pc.locator('input[data-mat=no]')).toHaveAttribute('placeholder', '2');
  await expect(pc.locator('input[data-mat=lib]')).toHaveValue('generic@dimmer@00');
  await expect(rows.filter({ hasText: 'PAR LED Test' }).locator('input[data-mat=no]')).toHaveAttribute('placeholder', '3');
  // sans GDTF du fabricant ni fichier de librairie : type provisoire (canaux sans fonction) pour que le patch s'importe
  await expect(dlg.locator('p.mawarn').first()).toContainText('2 type(s) provisoire(s)');
  await expect(rows.filter({ hasText: 'PAR LED Test' }).locator('small.mawarn')).toContainText('type provisoire de 8 canaux');
  const lyre = rows.filter({ hasText: 'Lyre Test' });
  await expect(lyre.locator('input[data-mat=lib]')).toHaveAttribute('placeholder', 'test@lyre_test@std');
  await lyre.locator('input[data-mat=lib]').fill('test@lyre_test@std.xmlp'); await lyre.locator('input[data-mat=lib]').press('Tab');
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
  // noms datés (la console garde en mémoire un fichier déjà lu sous le même nom)
  const pb = zip.match(/gma2\/plugins\/(oplanfeu_dossier_de_test_\d{8})\.lua/)[1];
  for (const f of [`gma2/plugins/${pb}.xml`, `gma2/fixture_layers/${pb}_layer.xml`, `gma2/importexport/${pb}_layout.xml`, 'oplanfeu_dossier_de_test_LISEZMOI.txt', 'gma2/library/oplanfeu@test_par_led_test@8ch.xml']) expect(zip).toContain(f);
  expect(zip).toContain(`local PLUGIN_FILE = "${pb}"`);
  expect(zip).toContain('OPF_CH8');
  // contenu : XML bien formé, patch absolu (univers 2 adresse 101 → 613), noms sans accents, type 7
  const chk = await page.evaluate(() => {
    const layer = ma2LayerXml(), layout = ma2LayoutXml(), ok = s => !new DOMParser().parseFromString(s, 'application/xml').querySelector('parsererror');
    const doc = new DOMParser().parseFromString(layer, 'application/xml'), fx = [...doc.getElementsByTagName('Fixture')];
    const f2 = state.d.fixtures.find(f => f.univ === 2), x2 = fx.find(e => e.getAttribute('fixture_id') === f2.fid);
    return { ok: ok(layer) && ok(layout), n: fx.length, first: fx[0].getAttribute('name'), no: fx[0].getElementsByTagName('No')[0].textContent,
      addr: +x2.getElementsByTagName('Address')[0].textContent, want: 512 + f2.addr, lay: new DOMParser().parseFromString(layout, 'application/xml').querySelectorAll('Group > LayoutData > SubFixtures > LayoutSubFix > Subfixture[fix_id]').length,
      lua: ma2Lua(state.d, { layer: 'a', layout: 'b' }) };
  });
  expect([chk.ok, chk.n, chk.first, chk.no, chk.addr, chk.lay]).toEqual([true, 24, 'Lyre regie', '7', chk.want, 24]);
  expect(chk.lua).toContain('{ no = 7, lib = "test@lyre_test@std"');
  expect(chk.lua).toContain('{ no = 2, lib = "generic@dimmer@00"');
  expect(chk.lua).not.toContain("f .. '.xml'");    // nom de librairie sans extension (ancienne erreur)
  expect(chk.lua).toContain("{ no = 12, name = \"P1 Lointain\", sel = { \"Fixture 101 Thru 106\" } }");
});

// GDTF de test (fabriqués ici) : une lyre LED RGBW 16 bits avec roue de gobos, et une barre de 4 pixels RGB avec gradateur général
const GDTF_LYRE = `<?xml version="1.0" encoding="UTF-8"?><GDTF DataVersion="1.1"><FixtureType Name="Lyre Test" ShortName="LyreT" Manufacturer="Test" FixtureTypeID="00000000-0000-0000-0000-000000000001">
<AttributeDefinitions><FeatureGroups><FeatureGroup Name="Position"><Feature Name="PanTilt"/></FeatureGroup><FeatureGroup Name="Control"><Feature Name="Control"/></FeatureGroup></FeatureGroups>
<Attributes><Attribute Name="Pan" Feature="Position.PanTilt"/><Attribute Name="Tilt" Feature="Position.PanTilt"/><Attribute Name="LampControl" Feature="Control.Control"/></Attributes></AttributeDefinitions>
<Wheels><Wheel Name="Gobo1"><Slot Name="Open"/><Slot Name="Etoile"/><Slot Name="Points"/></Wheel></Wheels>
<Geometries><Geometry Name="Base"><Axis Name="Yoke"><Axis Name="Head"><Beam Name="Beam" BeamType="Spot" BeamAngle="14"/></Axis></Axis></Geometry></Geometries>
<DMXModes><DMXMode Name="Std" Geometry="Base"><DMXChannels>
<DMXChannel Offset="1,2" Default="32768/2" Geometry="Yoke"><LogicalChannel Attribute="Pan"><ChannelFunction Attribute="Pan" DMXFrom="0/1" PhysicalFrom="-270" PhysicalTo="270"/></LogicalChannel></DMXChannel>
<DMXChannel Offset="3,4" Default="32768/2" Geometry="Head"><LogicalChannel Attribute="Tilt"><ChannelFunction Attribute="Tilt" DMXFrom="0/1" PhysicalFrom="-135" PhysicalTo="135"/></LogicalChannel></DMXChannel>
<DMXChannel Offset="5" Geometry="Beam"><LogicalChannel Attribute="ColorAdd_R"><ChannelFunction Attribute="ColorAdd_R" DMXFrom="0/1"/></LogicalChannel></DMXChannel>
<DMXChannel Offset="6" Geometry="Beam"><LogicalChannel Attribute="ColorAdd_G"><ChannelFunction Attribute="ColorAdd_G" DMXFrom="0/1"/></LogicalChannel></DMXChannel>
<DMXChannel Offset="7" Geometry="Beam"><LogicalChannel Attribute="ColorAdd_B"><ChannelFunction Attribute="ColorAdd_B" DMXFrom="0/1"/></LogicalChannel></DMXChannel>
<DMXChannel Offset="8" Geometry="Beam"><LogicalChannel Attribute="ColorAdd_W"><ChannelFunction Attribute="ColorAdd_W" DMXFrom="0/1"/></LogicalChannel></DMXChannel>
<DMXChannel Offset="9" Geometry="Beam"><LogicalChannel Attribute="Gobo1"><ChannelFunction Attribute="Gobo1" DMXFrom="0/1" Wheel="Gobo1"><ChannelSet Name="Open" DMXFrom="0/1" WheelSlotIndex="1"/><ChannelSet Name="" DMXFrom="10/1" WheelSlotIndex="2"/><ChannelSet Name="Points" DMXFrom="20/1" WheelSlotIndex="3"/></ChannelFunction>
<ChannelFunction Attribute="Gobo1WheelSpin" Name="Spin" DMXFrom="128/1"/></LogicalChannel></DMXChannel>
<DMXChannel Offset="10" Geometry="Beam" Highlight="20/1"><LogicalChannel Attribute="Shutter1"><ChannelFunction Attribute="Shutter1" Name="Open" DMXFrom="0/1"/><ChannelFunction Attribute="Shutter1Strobe" Name="Strobe" DMXFrom="64/1" PhysicalFrom="1" PhysicalTo="20"/></LogicalChannel></DMXChannel>
<DMXChannel Offset="11,12" Geometry="Beam"><LogicalChannel Attribute="Dimmer"><ChannelFunction Attribute="Dimmer" DMXFrom="0/1"/></LogicalChannel></DMXChannel>
<DMXChannel Offset="13" Geometry="Base"><LogicalChannel Attribute="LampControl"><ChannelFunction Attribute="LampControl" Name="Reset" DMXFrom="0/1"/></LogicalChannel></DMXChannel>
</DMXChannels></DMXMode></DMXModes></FixtureType></GDTF>`;
const px = i => ['R', 'G', 'B'].map((c, j) => `<DMXChannel Offset="${2 + i * 3 + j}" Geometry="Pixel${i + 1}"><LogicalChannel Attribute="ColorAdd_${c}"><ChannelFunction Attribute="ColorAdd_${c}" DMXFrom="0/1"/></LogicalChannel></DMXChannel>`).join('');
const GDTF_BAR = `<?xml version="1.0" encoding="UTF-8"?><GDTF DataVersion="1.1"><FixtureType Name="Barre Test" ShortName="Barre" Manufacturer="Test"><AttributeDefinitions><Attributes/></AttributeDefinitions>
<Geometries><Geometry Name="Body"/></Geometries><DMXModes><DMXMode Name="13ch" Geometry="Body"><DMXChannels>
<DMXChannel Offset="1" Geometry="Body"><LogicalChannel Attribute="Dimmer"><ChannelFunction Attribute="Dimmer" DMXFrom="0/1"/></LogicalChannel></DMXChannel>${[0, 1, 2, 3].map(px).join('')}
</DMXChannels></DMXMode></DMXModes></FixtureType></GDTF>`;

test('show grandMA2 : les GDTF sont convertis en fixture types MA2 dans le zip', async ({ page }) => {
  await loadSynthetic(page, d => {
    d.fixtures.filter(f => f.type === 'Test@Lyre').forEach(f => { f.nch = 13; });
    d.types['Test@Lyre'].modes = { Std: 13 };
    d.fixtures.filter(f => f.position === 'Sol').forEach(f => { f.type = 'Test@Barre'; f.mode = '13ch'; f.nch = 13; });
    d.types['Test@Barre'] = { name: 'Barre Test', maker: 'Test', gdtf: 'barre.gdtf', modes: { '13ch': 13 } };
  });
  await page.evaluate(([a, b]) => {
    const g = s => new Response(zipStore([['description.xml', new TextEncoder().encode(s)]])).arrayBuffer().then(buf => toB64(new Uint8Array(buf)));
    return Promise.all([g(a), g(b)]).then(([x, y]) => { state.d.types['Test@Lyre'].gdtfData = x; state.d.types['Test@Barre'].gdtfData = y; });
  }, [GDTF_LYRE, GDTF_BAR]);
  await page.click('#tabs button[data-v=shows]');
  await page.click('#view [data-sh=ma2]');
  const dlg = page.locator('#ma2Dlg');
  const lyre = dlg.locator('tbody tr').filter({ hasText: 'Lyre Test' });
  await expect(lyre.locator('.maconv')).toContainText('oplanfeu@test_lyre_test@std');
  await expect(lyre.locator('input[data-mat=lib]')).toHaveAttribute('placeholder', /GDTF, 13/);
  await expect(dlg.locator('tbody tr').filter({ hasText: 'Barre Test' }).locator('.maconv')).toBeVisible();
  // il ne reste que le PAR LED sans GDTF : type provisoire
  await expect(dlg.locator('p.mawarn').first()).toContainText('1 type(s) provisoire(s)');
  const [dl] = await Promise.all([page.waitForEvent('download'), dlg.locator('#ma2Dl').click()]);
  const zip = fs.readFileSync(await dl.path()).toString('latin1');
  expect(zip).toContain('gma2/library/oplanfeu@test_lyre_test@std.xml');
  expect(zip).toContain('gma2/library/oplanfeu@test_barre_test@13ch.xml');
  const r = await page.evaluate(() => {
    const T = ma2Types(), ly = T.find(x => x.type === 'Test@Lyre'), ba = T.find(x => x.type === 'Test@Barre');
    const doc = s => new DOMParser().parseFromString(s, 'application/xml'), A = (el, a) => el.getAttribute(a);
    const L = doc(ly.conv.xml), B = doc(ba.conv.xml);
    const ct = [...L.getElementsByTagName('ChannelType')].map(c => [A(c, 'attribute'), A(c, 'coarse'), A(c, 'fine')].filter(Boolean).join(':'));
    const gobo = [...L.getElementsByTagName('ChannelType')].find(c => A(c, 'attribute') === 'GOBO1');
    const shut = [...L.getElementsByTagName('ChannelType')].find(c => A(c, 'attribute') === 'SHUTTER');
    return { ok: !L.querySelector('parsererror') && !B.querySelector('parsererror'), ct, cls: A(L.getElementsByTagName('Module')[0], 'class'),
      pan: [...L.getElementsByTagName('ChannelFunction')].filter(f => A(f, 'attribute') === 'PAN').map(f => [A(f, 'from'), A(f, 'to')]),
      sets: [...gobo.getElementsByTagName('ChannelSet')].map(s => `${A(s, 'name')}:${A(s, 'from_dmx')}-${A(s, 'to_dmx')}:${A(s, 'slot_index')}`),
      wheel: [...L.getElementsByTagName('Slot')].map(s => A(s, 'media_name')), strobe: [...shut.getElementsByTagName('ChannelFunction')].map(f => A(f, 'subattribute')),
      hl: A(shut, 'highlight_value'), def: A([...L.getElementsByTagName('ChannelType')][0], 'default'),
      inst: [...B.getElementsByTagName('Instance')].map(i => `${A(i, 'module_index')}@${A(i, 'patch')}`), mods: B.getElementsByTagName('Module').length,
      barMod2: [...B.getElementsByTagName('Module')[1].getElementsByTagName('ChannelType')].map(c => [A(c, 'attribute'), A(c, 'coarse')].filter(Boolean).join(':')),
      lua: ma2Lua(state.d, { layer: 'a', layout: 'b' }), no: ly.no };
  });
  expect(r.ok).toBe(true);
  expect(r.ct).toEqual(['PAN:1:2', 'TILT:3:4', 'COLORRGB1:5', 'COLORRGB2:6', 'COLORRGB3:7', 'COLORRGB5:8', 'GOBO1:9', 'SHUTTER:10', 'DIM:11:12', 'LAMPCONTROL:13']);
  expect(r.cls).toBe('Headmover');
  expect(r.pan).toEqual([['-270', '270']]);
  expect(r.sets).toEqual(['Open:0-9:0', 'Etoile:10-19:1', 'Points:20-127:2']);   // nom pris sur la roue si le ChannelSet n'en a pas
  expect(r.wheel).toEqual(['Open', 'Etoile', 'Points']);
  expect(r.strobe).toEqual(['SHUTTER', 'STROBE']);
  expect([r.hl, r.def]).toEqual(['7.843', '32768']);
  // barre : module principal (gradateur) + 4 instances d'un même module pixel (RGB + gradateur virtuel)
  expect(r.mods).toBe(2);
  expect(r.inst).toEqual(['0@1', '1@2', '1@5', '1@8', '1@11']);
  expect(r.barMod2).toEqual(['COLORRGB1:1', 'COLORRGB2:2', 'COLORRGB3:3', 'DIM']);
  expect(r.lua).toContain(`{ no = ${r.no}, lib = "oplanfeu@test_lyre_test@std", name = "Lyre Test Std", conv = true }`);
  // le plugin recopie les types convertis dans la librairie interne avant de les importer
  expect(r.lua).toContain("if ty.conv then installFile('library', ty.lib) end");
  expect(r.lua).toContain("installFile('fixture_layers', LAYER_FILE)");
  // pixels décrits une seule fois puis répétés par GeometryReference (comme la plupart des GDTF de barres LED)
  const refs = await page.evaluate(() => {
    const ch = ['R', 'G', 'B'].map((c, j) => `<DMXChannel Offset="${j + 1}" DMXBreak="1" Geometry="Pixel"><LogicalChannel Attribute="ColorAdd_${c}"><ChannelFunction Attribute="ColorAdd_${c}" DMXFrom="0/1"/></LogicalChannel></DMXChannel>`).join('');
    const refs = [0, 1, 2, 3, 4, 5].map(i => `<GeometryReference Name="Pixel ${i + 1}" Geometry="Pixel"><Break DMXBreak="1" DMXOffset="${2 + i * 3}"/></GeometryReference>`).join('');
    const x = `<GDTF><FixtureType Name="Ruban" Manufacturer="Test"><Geometries><Geometry Name="Body">${refs}</Geometry><Geometry Name="Pixel"/></Geometries><DMXModes><DMXMode Name="19ch" Geometry="Body"><DMXChannels>
<DMXChannel Offset="1" DMXBreak="1" Geometry="Body"><LogicalChannel Attribute="Dimmer"><ChannelFunction Attribute="Dimmer" DMXFrom="0/1"/></LogicalChannel></DMXChannel>${ch}</DMXChannels></DMXMode></DMXModes></FixtureType></GDTF>`;
    const o = ma2FtFromGdtf(new DOMParser().parseFromString(x, 'application/xml'), '19ch'), d = new DOMParser().parseFromString(o.xml, 'application/xml');
    return { nch: o.nch, inst: [...d.getElementsByTagName('Instance')].map(i => `${i.getAttribute('module_index')}@${i.getAttribute('patch')}`) };
  });
  expect(refs).toEqual({ nch: 19, inst: ['0@1', '1@2', '1@5', '1@8', '1@11', '1@14', '1@17'] });
});
