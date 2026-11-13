// HomeView's headless tests: node --test test/   (scripts/test.sh runs them, in Docker when Node isn't installed)
// One test per incident already paid for, plus the rules the dashboard relies on. Made-up home only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadHomeView, makeHass, El, win } from './harness.mjs';

const hv = await loadHomeView();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const draw = (h, spec) => { const r = hv.R[spec.kind]; r.key(h, spec); return r.html(h, spec, { refresher() {}, shadowRoot: new El(), visible: true }); };

test('version and version compare (0.8.10 is newer than 0.8.9)', () => {
  assert.match(hv.HV_VERSION, /^\d+\.\d+\.\d+$/);
  assert.equal(hv.newerVer('0.8.10', '0.8.9'), true);
  assert.equal(hv.newerVer('0.8.9', '0.8.10'), false);
  assert.equal(hv.newerVer('0.8.9', '0.8.9'), false);
  assert.equal(hv.newerVer('0.8.20', '0.8.20-dev'), false);   // a dev copy of the installed version
  assert.equal(hv.newerVer('0.8.21', '0.8.20-dev'), true);
});

test('parseSize', () => {
  assert.deepEqual(hv.parseSize('2x1'), [2, 1]);
  assert.deepEqual(hv.parseSize('full x auto'), ['full', 'auto']);
  assert.deepEqual(hv.parseSize('half'), ['half', 2]);
  assert.deepEqual(hv.parseSize([3, 2]), [3, 2]);
  assert.equal(hv.parseSize('big'), null);
});

test('vars: and custom page paths', () => {
  assert.deepEqual(hv.expandVars({ tiles: ['$tv', '$speakers'] }, { tv: 'media_player.tv', speakers: ['media_player.a', 'media_player.b'] }),
    { tiles: ['media_player.tv', 'media_player.a', 'media_player.b'] });
  assert.equal(hv.expandVars('cost $total', { total: 3 }), 'cost 3');
  const pages = hv.customPages({ custom_pages: [{ path: 'pond', vars: { p: 'switch.pump_a' }, sections: [{ tiles: ['$p'] }] }, { title: 'x' }] });
  assert.equal(pages[0].path, 'pond');
  assert.deepEqual(pages[0].sections[0].tiles, ['switch.pump_a']);
  assert.equal(pages[1].path, 'page-2');
});

test('cached() keeps one listener per stable callback (the 0.8.6 "Page isn\'t responding" loop)', async () => {
  let calls = 0, release;
  const cb = () => { calls++; };
  const fetcher = () => new Promise((r) => { release = r; });
  for (let i = 0; i < 50; i++) hv.cached('test:one-listener', 60e3, fetcher, cb);
  await sleep(1);   // the fetch starts a moment later
  for (let i = 0; i < 50; i++) hv.cached('test:one-listener', 60e3, fetcher, cb);
  release(42);
  await sleep(5);
  assert.equal(calls, 1);
  assert.equal(hv.cached('test:one-listener', 60e3, fetcher), 42);
});

test('energyPower: the net grid sensor before a split one, the home battery\'s level by its meter\'s device (0.8.3)', () => {
  const h = makeHass({ extra: {
    'sensor.grid_export_power': { state: '0', attributes: { device_class: 'power', unit_of_measurement: 'W' }, device: 'meter' },
    'sensor.grid_power': { state: '1200', attributes: { device_class: 'power', unit_of_measurement: 'W' }, device: 'meter' },
    'sensor.grid_energy_in': { state: '10', attributes: { device_class: 'energy', unit_of_measurement: 'kWh' }, device: 'meter' },
    'sensor.home_battery_power': { state: '-300', attributes: { device_class: 'power', unit_of_measurement: 'W' }, device: 'pw' },
    'sensor.home_battery_out': { state: '1', attributes: { device_class: 'energy', unit_of_measurement: 'kWh' }, device: 'pw' },
    'sensor.home_battery_level': { state: '80', attributes: { device_class: 'battery', unit_of_measurement: '%' }, device: 'pw' },
  } });
  const m = hv.buildModel(h, {});
  const prefs = { energy_sources: [{ type: 'grid', flow_from: [{ stat_energy_from: 'sensor.grid_energy_in' }] },
    { type: 'battery', stat_energy_from: 'sensor.home_battery_out' }], device_consumption: [] };
  const p = hv.energyPower(h, m, {}, prefs);
  assert.equal(p.grid, 'sensor.grid_power');
  assert.equal(p.battery, 'sensor.home_battery_power');
  assert.equal(p.battery_level, 'sensor.home_battery_level');   // not a door sensor's battery
});

test('edits: applyEdits / diffOptions round trip; a malformed companion means no edits', () => {
  const yaml = { title: 'Home', customize: { 'light.a': { name: 'A' } }, home: { favorites: ['lock.front_door'] } };
  const next = { title: 'Home', customize: { 'light.a': { name: 'A2' }, 'light.b': { size: '2x1' } }, home: {}, theme: 'dark' };
  const edits = hv.diffOptions(yaml, next);
  assert.deepEqual(hv.applyEdits(yaml, edits), { ...next, home: {} });
});

test('a malformed companion means no edits', async () => {
  const h = makeHass({ ws: () => ({ title: 'x', views: [], homeview: 'oops' }) });
  assert.deepEqual(await hv.loadEdits(h, 'test-dash-edits'), {});
});

// ---- 4: a failed read of the companion must never lead to a save --------------------------------
const yamlDash = (ws) => {
  const h = makeHass({ ws });
  h.panels['test-dash'] = { config: { mode: 'yaml' } };
  return h;
};
const YAML = { strategy: { type: 'custom:homeview', title: 'Home', home: { favorites: ['lock.front_door'] } } };
const EDITS = { title: 'HomeView edits', views: [], homeview: { customize: { __edits: { 'light.kitchen_main': { name: 'Island' } } } } };

test('loadEdits: "no such config" = no edits; any other failure throws (soft: none, for drawing)', async () => {
  const notFound = makeHass({ ws: () => { throw { code: 'config_not_found', message: 'No config found.' }; } });
  assert.deepEqual(await hv.loadEdits(notFound, 'test-dash-edits'), {});
  const broken = makeHass({ ws: () => { throw { code: 'unknown_error', message: 'Connection lost' }; } });
  await assert.rejects(hv.loadEdits(broken, 'test-dash-edits'), (e) => e.code === 'hv_unreadable');
  const warn = console.warn; console.warn = () => {};
  try { assert.deepEqual(await hv.loadEdits(broken, 'test-dash-edits', true), {}); } finally { console.warn = warn; }
});

test('saving on a YAML dashboard: a failed read of its edits saves nothing', async () => {
  const h = yamlDash((m) => {
    if (m.type === 'lovelace/config' && m.url_path === 'test-dash') return YAML;
    if (m.type === 'lovelace/config' && m.url_path === 'test-dash-edits') throw { code: 'unknown_error', message: 'Connection lost' };
    return null;
  });
  const warn = console.warn; console.warn = () => {};
  let r;
  try { r = await hv.saveStrategy(h, {}, (o) => { o.theme = 'dark'; }); } finally { console.warn = warn; }
  assert.equal(r.ok, false);
  assert.equal(r.unreadable, true);
  assert.equal(h._sent.filter((m) => m.type === 'lovelace/config/save' || m.type === 'lovelace/dashboards/create').length, 0);
});

test('saving on a YAML dashboard: earlier edits are kept, the new one added', async () => {
  const h = yamlDash((m) => {
    if (m.type === 'lovelace/config' && m.url_path === 'test-dash') return YAML;
    if (m.type === 'lovelace/config' && m.url_path === 'test-dash-edits') return EDITS;
    return null;
  });
  const r = await hv.saveStrategy(h, {}, (o) => { o.theme = 'dark'; });
  assert.equal(r.ok, true);
  const saved = h._sent.find((m) => m.type === 'lovelace/config/save');
  assert.equal(saved.url_path, 'test-dash-edits');
  assert.equal(saved.config.homeview.theme, 'dark');
  const { type: _t, ...yamlOpts } = YAML.strategy;
  assert.equal(hv.applyEdits(yamlOpts, saved.config.homeview).customize['light.kitchen_main'].name, 'Island');
});

test('Settings on a YAML dashboard starts from the YAML plus its edits (saving it no longer drops them)', async () => {
  const h = yamlDash((m) => (m.url_path === 'test-dash' ? YAML : m.url_path === 'test-dash-edits' ? EDITS : null));
  const d = await hv.settingsDraft(h, {});
  assert.equal(d.customize['light.kitchen_main'].name, 'Island');
  assert.equal(d.title, 'Home');
});

// ---- who gets which pages --------------------------------------------------------------------
test('generate(): pages per viewer (admin, member, access list, admin_only, popup)', async () => {
  const cfg = { type: 'custom:homeview', pages: ['home', 'living', 'rooms', 'cameras'], members: ['person.zoe'],
    custom_pages: [{ path: 'admin', admin_only: true, sections: [] }, { path: 'pond', sections: [] }],
    pages_config: { cameras: { popup: true } } };
  const paths = async (o) => (await hv.HomeViewStrategy.generate(cfg, makeHass(o))).views.filter((v) => !v.subview).map((v) => v.path);
  const admin = await paths({ admin: true });
  assert.ok(admin.includes('admin') && admin.includes('member-zoe') && !admin.includes('cameras'));
  const other = await paths({ admin: false, user: 'u-alex' });
  assert.ok(!other.includes('admin') && !other.includes('member-zoe') && other.includes('home') && other.includes('pond'));
  const zoe = await paths({ admin: false, user: 'u-zoe', name: 'Zoe' });
  assert.ok(zoe.includes('member-zoe'));
  const limited = await hv.HomeViewStrategy.generate({ ...cfg, access: { 'person.alex': ['home'] } }, makeHass({ admin: true }));
  assert.deepEqual(limited.views.filter((v) => !v.subview).map((v) => v.path), ['home']);
  const popup = (await hv.HomeViewStrategy.generate(cfg, makeHass())).views.find((v) => v.path === 'cameras');
  assert.equal(popup.subview, true);
});

// ---- 3: tiles that can't be drawn don't take the page down -----------------------------------
test('every tile type a page file can name draws with a missing and an offline entity (no throw)', () => {
  const h = makeHass({ extra: { 'light.gone': { state: 'unavailable' } } });
  const m = hv.buildModel(h, {});
  for (const type of hv.USER_TILE_TYPES) {
    for (const entity of [undefined, 'sensor.nope', 'light.gone']) {
      const sec = hv.userSections([{ tiles: [{ type, entity }] }], h, m)[0];
      for (const spec of sec.tiles) assert.doesNotThrow(() => draw(h, spec), `${type} with ${entity}`);
    }
  }
});

test('HomeView\'s own tile types are left out of page files, with a note for admins', () => {
  const h = makeHass();
  const m = hv.buildModel(h, {});
  const list = [{ tiles: [{ type: 'energy_outage' }, { type: 'room_power' }, { type: 'room', area: 'nowhere' }, { type: 'clock' }] }];
  const sec = hv.userSections(list, h, m)[0];
  assert.deepEqual(sec.tiles.map((t) => t.kind), ['clock']);
  assert.deepEqual(hv.oddTiles(list, m), ['type: energy_outage', 'type: room_power', 'room “nowhere” (no such area)']);
  assert.doesNotThrow(() => hv.userSections([null, 'x', { tiles: null }], h, m));
});

test('a tile whose renderer throws shows a placeholder; the page carries on', () => {
  const h = makeHass();
  hv.R.__boom = { key: () => 'k', html: () => { throw new Error('bad data'); } };
  const warn = console.warn; console.warn = () => {};
  try {
    const t = new hv.HomeViewTile();
    t.spec = { kind: '__boom' };
    assert.doesNotThrow(() => { t.hass = h; });
    assert.match(t._wrap.innerHTML, /Tile error/);
    assert.match(t._wrap.innerHTML, /bad data/);   // admins see why
  } finally { console.warn = warn; delete hv.R.__boom; }
});

test('a page whose build throws keeps the page on screen (and the first build shows a note)', () => {
  const h = makeHass();
  const warn = console.warn; console.warn = () => {};
  const homeBuilder = hv.PAGES.home;
  try {
    hv.PAGES.home = () => { throw new Error('builder broke'); };
    const p = new hv.HomeViewPage();
    p.setConfig({ page: 'home', path: 'home', options: {} });
    assert.doesNotThrow(() => { p.hass = h; });
    assert.match(p._page.note, /builder broke/);
    hv.PAGES.home = homeBuilder;
    p.rebuild();
    const good = p._page, tiles = p._tiles;
    assert.ok(tiles.length > 0);
    p._phonePage = () => { throw new Error('later step broke'); };
    win.innerWidth = 390;
    assert.doesNotThrow(() => p.rebuild());
    assert.equal(p._page, good);     // the old page stays
    assert.equal(p._tiles, tiles);   // and its tiles keep getting updates
  } finally { hv.PAGES.home = homeBuilder; console.warn = warn; win.innerWidth = 1280; }
});

// ---- 6: alert rules never fail silently ------------------------------------------------------
test('alerts: none_on, and "not reporting" when a rule can\'t be checked', () => {
  const h = makeHass({ extra: { 'switch.pump_c': { state: 'off' } } });
  const A = (rule) => hv.pageAlerts(h, [{ text: 'Both pumps off', ...rule }]);
  // none_on: off, offline and missing all count
  assert.deepEqual(A({ none_on: ['switch.pump_b', 'switch.pump_c', 'switch.nope'] }), [{ text: 'Both pumps off', level: 'critical' }]);
  assert.deepEqual(A({ none_on: ['switch.pump_a', 'switch.pump_b'] }), []);
  // all_off with one offline and the rest off: can't tell -> amber "not reporting"
  assert.deepEqual(A({ all_off: ['switch.pump_b', 'switch.pump_c'] }), [{ text: 'Pump B not reporting', level: 'notice', offline: true }]);
  // ... but one that's on settles it
  assert.deepEqual(A({ all_off: ['switch.pump_a', 'switch.pump_b'] }), []);
  assert.deepEqual(A({ off: 'switch.nope' }), [{ text: 'Can\'t check: Both pumps off', level: 'notice', offline: true }]);
  assert.deepEqual(A({ on: 'switch.pump_b', text_offline: 'Pump B offline' }), [{ text: 'Pump B offline', level: 'notice', offline: true }]);
  assert.deepEqual(A({ off: 'switch.pump_c', level: 'notice' }), [{ text: 'Both pumps off', level: 'notice' }]);
  // not_on as before: offline counts, text_offline
  assert.deepEqual(A({ not_on: 'switch.pump_b', text_offline: 'Pump B offline' }), [{ text: 'Pump B offline', level: 'critical' }]);
  // a bare YAML `on:` key arrives as "true"
  assert.deepEqual(hv.pageAlerts(h, [{ text: 'Door open', true: 'binary_sensor.back_door' }]), [{ text: 'Door open', level: 'critical' }]);
});

test('the missing-entity note covers a page\'s pill: and alerts:', () => {
  const h = makeHass();
  const miss = hv.missingEntities(h, { path: 'p', pill: { entity: 'sensor.pond_gone' }, alerts: [{ text: 'x', none_on: ['switch.pump_a', 'switch.gone'] }, { on: '$unset' }],
    sections: [{ tiles: ['light.gone'] }] });
  assert.deepEqual(miss.sort(), ['$unset', 'light.gone', 'sensor.pond_gone', 'switch.gone'].sort());
});

// ---- 7: away from its room a tile says its state and its room --------------------------------
test('cross-room tiles: "State · Room"; in the room: the state', () => {
  const h = makeHass();
  const m = hv.buildModel(h, {});
  const home = hv.PAGES.home(h, m, {});
  const lock = home.sections[0].tiles.find((t) => t.entity === 'lock.front_door');
  assert.match(draw(h, lock), /Front Door<\/div><div class="sb">Locked · Entry</);
  assert.match(draw(h, { kind: 'entity', entity: 'lock.front_door', areaName: 'Entry' }), /<div class="sb">Locked</);
  // the Batteries pop-up: two "Leak Battery" rows told apart by their room
  const b1 = draw(h, { kind: 'entity', entity: 'sensor.kitchen_leak_battery', showRoom: true, areaName: 'Kitchen', row: true });
  const b2 = draw(h, { kind: 'entity', entity: 'sensor.bathroom_leak_battery', showRoom: true, areaName: 'Bathroom', row: true });
  assert.match(b1, /Leak Battery · Kitchen/);
  assert.match(b2, /Leak Battery · Bathroom/);
  // an open door: its state word in the alert colour, then the room
  assert.match(draw(h, { kind: 'entity', entity: 'binary_sensor.back_door', showRoom: true, areaName: 'Entry' }), /class="t flex on alert".*<span class="sw">Open<\/span> · Entry/s);
  // a generic name gets its full name away from the room
  assert.match(draw(h, { kind: 'entity', entity: 'light.kitchen_light', showRoom: true, areaName: 'Kitchen' }), /Kitchen Light<\/div><div class="sb">Off · Kitchen/);
});

// ---- 9: offline devices stay, badged -----------------------------------------------------------
test('offline devices keep their place with a badge and "Offline"; scenes aren\'t offline', () => {
  const h = makeHass({ extra: { 'lock.side_door': { state: 'unavailable', attributes: { friendly_name: 'Side Door' }, area: 'entry' } } });
  const m = hv.buildModel(h, {});
  const lamp = draw(h, { kind: 'entity', entity: 'light.living_room_lamp', areaName: 'Living Room' });
  assert.match(lamp, /class="t flex na"/);
  assert.match(lamp, /class="ob"/);
  assert.match(lamp, />Offline</);
  assert.doesNotMatch(draw(h, { kind: 'entity', entity: 'scene.movie_night', sub: 'Scene' }), /\bna\b/);
  assert.equal(hv.isOffline(h.states['scene.movie_night']), false);
  assert.ok(hv.chipsAuto(h, m).some((c) => c.entity === 'lock.side_door'));
  assert.deepEqual(hv.chipLook(h, { entity: 'lock.side_door' }), { cls: 'warn', word: 'Offline', offline: true });
  const living = hv.PAGES.living(h, m, {});
  assert.ok(living.sections.some((s) => s.tiles.some((t) => t.entity === 'light.living_room_lamp')));
  // a removed device's leftover entity (restored) is not picked automatically
  const h2 = makeHass({ extra: { 'light.living_room_lamp': { state: 'unavailable', attributes: { restored: true }, area: 'living_room' } } });
  const living2 = hv.PAGES.living(h2, hv.buildModel(h2, {}), {});
  assert.ok(!living2.sections.some((s) => s.tiles.some((t) => t.entity === 'light.living_room_lamp')));
});

// ---- 8: light-mode text shades: 4.5 : 1 on every tint ----------------------------------------
const hslRgb = (h, s, l) => { s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map((n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))); };
const parse = (c) => { if (c.startsWith('#')) return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  const [h, s, l] = c.match(/hsl\(([\d.]+) ([\d.]+)% ([\d.]+)%\)/).slice(1).map(Number); return hslRgb(h, s, l); };
const lum = (rgb) => { const f = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); const [r, g, b] = rgb.map(f); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(parse(a)), lum(parse(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('light mode: coloured words, state words and the alert fill reach 4.5 : 1 on every room tint', () => {
  const hues = Array.from({ length: 360 }, (_, i) => i);   // any hue (color: 240 works too)
  let worst = Infinity;
  for (const h of hues) {
    const p = hv.palette(h, false);
    for (const k of Object.keys(hv.TEXT_TONES)) {
      for (const bg of [p['--hv-tile'], p['--hv-pill']]) { const r = ratio(p[`--hv-${k}-tx`], bg); worst = Math.min(worst, r); assert.ok(r >= 4.5, `${k} on hue ${h}: ${r.toFixed(2)}`); }
      const r = ratio(p[`--hv-${k}-tx-on`], p['--hv-tile-on']); assert.ok(r >= 4.5, `${k} on a lit tile, hue ${h}: ${r.toFixed(2)}`);
    }
    assert.ok(ratio(p['--hv-fg2'], p['--hv-tile']) >= 4.5, `fg2 hue ${h}`);
    assert.ok(ratio(p['--hv-on-fg2'], p['--hv-tile-on']) >= 4.5, `on-fg2 hue ${h}`);
    assert.ok(ratio('#FFFFFF', p['--hv-alert-fill']) >= 4.5);
  }
  assert.ok(worst >= 4.5);
});

test('dark mode keeps the bright tones', () => {
  const p = hv.palette(28, true);
  assert.equal(p['--hv-ok-tx'], '#34C759');
  assert.equal(p['--hv-alert-fill'], '#FF3B30');
});

// ---- 10: a desktop window taller than wide lays out like a landscape tablet --------------------
test('desktop_layout: tablet for non-touch windows ≥ 1000 px; touch screens and fill unchanged', () => {
  const at = (w, h, touch, cfg = {}) => { Object.assign(win, { innerWidth: w, innerHeight: h, maxTouchPoints: touch }); return [hv.desktopTablet(cfg), hv.layoutHeight(cfg)]; };
  try {
    assert.deepEqual(at(1280, 1350, 0), [true, 800]);           // the tall Edge window: the Pixel Tablet's 800
    assert.deepEqual(at(1920, 1080, 0), [true, 1080]);          // wide screens: as before
    assert.deepEqual(at(1280, 1350, 5), [false, 1350]);         // a touch screen: as before
    assert.deepEqual(at(820, 1180, 0), [false, 1180]);          // narrower than 1000: as before
    assert.deepEqual(at(1280, 1350, 0, { desktop_layout: 'fill' }), [false, 1350]);
  } finally { Object.assign(win, { innerWidth: 1280, innerHeight: 800, maxTouchPoints: 0 }); }
});

// ---- 14: HomeView's own confirm sheet, never window.confirm on a page --------------------------
test('confirm sheet: Unlock asks first; Cancel does nothing, Unlock unlocks', async () => {
  const h = makeHass();
  h.states['lock.front_door'].state = 'locked';
  const made = [];
  const create = document.createElement;
  document.createElement = (t) => { const e = new El(t); if (t === 'div') { e._q = { '[data-no]': new El('button'), '[data-yes]': new El('button') }; made.push(e); } return e; };
  const page = { _hvPage: true, _root: new El() };
  const tile = { getRootNode: () => ({ host: page }), dispatchEvent() {} };
  try {
    for (const yes of [false, true]) {
      made.length = 0; h._sent.length = 0;
      const p = hv.R.entity.action(h, { kind: 'entity', entity: 'lock.front_door', areaName: 'Entry' }, tile, 'tap');
      await sleep(5);
      const pop = made.find((e) => e.className === 'pop cf');
      assert.ok(pop, 'the sheet opened');
      assert.match(pop.innerHTML, /Unlock Front Door\?/);
      assert.match(pop.innerHTML, /Locked · Entry · since/);
      pop._q['[data-yes]'].fire('click');   // a late click right after opening doesn't count
      await sleep(470);
      pop._q[yes ? '[data-yes]' : '[data-no]'].fire('click');
      await p;
      const calls = h._sent.filter((m) => m.type === 'call_service');
      assert.deepEqual(calls.map((c) => `${c.domain}.${c.service}`), yes ? ['lock.unlock'] : []);
    }
  } finally { document.createElement = create; }
});

test('the warnings: pill uses the same rules (none_on, not reporting) and lists their entities', () => {
  const h = makeHass({ extra: { 'switch.demo_freezer': { state: 'unavailable', attributes: { friendly_name: 'Freezer' } } } });
  const m = hv.buildModel(h, {});
  const p = hv.PILLS.warnings(h, m, { warnings: [{ text: 'Freezer off', none_on: ['switch.demo_freezer'] }, { text: 'Leak', on: 'binary_sensor.kitchen_leak' }] }, null);
  assert.equal(p.text, 'Freezer off');
  assert.equal(p.alert, true);
  assert.deepEqual(p.popup.groups[0].ids, ['switch.demo_freezer']);
  const q = hv.PILLS.warnings(h, m, { warnings: [{ text: 'Freezer on', on: 'switch.demo_freezer' }] }, null);
  assert.deepEqual([q.text, q.alert, q.tone], ['Freezer not reporting', false, 'warn']);
});
