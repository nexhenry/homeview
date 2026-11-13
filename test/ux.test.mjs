// Small code items (keys, timers, caches, batching) and the designer's leftovers: pills (order, words,
// wrap), the guest view, rename sheet, hero, weather, chips, camera wall. Made-up home only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadHomeView, makeHass, El, win } from './harness.mjs';

// the harness installs the browser stubs; this file loads its own copy of the module with the names it
// needs (the harness's export list is shared by every test file)
await loadHomeView();
const NAMES = ['buildModel', 'R', 'PILLS', 'PAGES', 'HomeViewPage', 'HomeViewStrategy', 'customPages', 'expandVars', 'missingEntities',
  'cached', 'cache', 'sweepCache', 'getStatToday', 'getEnergyPrefs', 'energyPrefsNow', 'applyKiosk', 'trimSlides', 'SLIDE_KEEP',
  'availSig', 'sharedModel', 'deviceIndex', 'pairLoad', 'hvPrompt', 'isGuest', 'guestHidden', 'chipList', 'comfortKey', 'HV_TONES', 'KIND_TONES'];
const here = dirname(fileURLToPath(import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'homeview-ux-'));
writeFileSync(join(dir, 'hv.mjs'), `${readFileSync(join(here, '..', 'dist', 'homeview.js'), 'utf8')}\nexport { ${NAMES.join(', ')} };\n`);
const info = console.info; console.info = () => {};
const hv = await import(pathToFileURL(join(dir, 'hv.mjs')).href);
console.info = info;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const draw = (h, spec) => { const r = hv.R[spec.kind]; r.key(h, spec); return r.html(h, spec, { refresher() {}, shadowRoot: new El(), visible: true }); };
const page = (cfg, h, over = {}) => {
  const p = new hv.HomeViewPage();
  p.setConfig({ page: 'home', path: 'home', order: ['widgets', 'home', 'living'], nav: [], options: {}, ...cfg, ...over });
  p.hass = h;
  return p;
};
const set = (h, id, state, attrs) => ({ ...h, states: { ...h.states, [id]: { ...h.states[id], state, ...(attrs ? { attributes: { ...h.states[id].attributes, ...attrs } } : {}), last_updated: new Date().toISOString() } } });

// ---- architect F11: keys ------------------------------------------------------------------------
test('a room page\'s header temperature follows the sensor (it was missing from the header key)', () => {
  const h = makeHass({ extra: { 'sensor.kitchen_humidity': { state: '40', attributes: { device_class: 'humidity', unit_of_measurement: '%' }, area: 'kitchen' } } });
  const p = page({ page: 'room', area: 'kitchen', path: undefined, order: [] }, h);
  assert.match(p._head.innerHTML, /71\.5° · 40%/);
  p.hass = set(h, 'sensor.kitchen_temperature', '68.2');
  p._renderHead();
  assert.match(p._head.innerHTML, /68\.2° · 40%/);
});

test('comfort words follow the comfort settings\' own entities (the room and hero keys see them)', () => {
  const h = makeHass({ extra: { 'input_number.cold_below': { state: '60' } } });
  const cfg = { comfort: { cold: 'input_number.cold_below', warm: 80 } };
  const m = hv.buildModel(h, cfg);
  const room = m.areaById.kitchen;
  const k1 = hv.R.room.key(h, { kind: 'room', room });
  const h2 = set(h, 'input_number.cold_below', '72');
  assert.notEqual(hv.R.room.key(h2, { kind: 'room', room }), k1);
  assert.match(draw(h2, { kind: 'room', room }), />Cold</);   // 71.5 °F under 72: Cold
  const hero = { kind: 'member_hero', room, title: 'Right now', openings: [] };
  assert.notEqual(hv.R.member_hero.key(h, hero), hv.R.member_hero.key(h2, hero));
});

test('kiosk check: a resize event only when a style really came or went (it fired every 2.5 s)', () => {
  const kids = [];
  const sr = { querySelector: (sel) => kids.find((k) => `#${k.id}` === sel) || null,
    appendChild: (el) => { el.remove = () => kids.splice(kids.indexOf(el), 1); kids.push(el); return el; } };
  const host = { shadowRoot: { querySelector: (sel) => (sel === 'home-assistant-main' ? main : null) } };
  const main = { shadowRoot: Object.assign(Object.create(sr), { querySelector: (sel) => (sel === 'ha-drawer' ? { shadowRoot: sr2 } : sr.querySelector(sel)) }) };
  const kids2 = [];
  const sr2 = { querySelector: (sel) => kids2.find((k) => `#${k.id}` === sel) || null, appendChild: (el) => { el.remove = () => kids2.splice(kids2.indexOf(el), 1); kids2.push(el); return el; } };
  const keepQ = document.querySelector, keepD = globalThis.dispatchEvent, keepMO = globalThis.MutationObserver;
  let resizes = 0;
  document.querySelector = (sel) => (sel === 'home-assistant' ? host : null);
  globalThis.dispatchEvent = (e) => { if (e.type === 'resize') resizes++; return true; };
  globalThis.MutationObserver = class { observe() {} };
  if (!globalThis.Event) globalThis.Event = class { constructor(t) { this.type = t; } };
  try {
    assert.equal(hv.applyKiosk(true), true);
    assert.equal(resizes, 1);
    for (let i = 0; i < 5; i++) assert.equal(hv.applyKiosk(true), false);   // the periodic check
    assert.equal(resizes, 1);
    assert.equal(hv.applyKiosk(false), true);                                // Menu: the header comes back
    assert.equal(resizes, 2);
  } finally { document.querySelector = keepQ; globalThis.dispatchEvent = keepD; globalThis.MutationObserver = keepMO; }
});

test('state-based picks: a person or thermostat going offline rebuilds the model and the page (debounced)', async () => {
  const h = makeHass();
  const cfg = {};
  const m1 = hv.sharedModel(h, cfg);
  assert.deepEqual(m1.persons, ['person.alex', 'person.zoe']);
  const h2 = set(h, 'person.zoe', 'unavailable');
  const m2 = hv.sharedModel(h2, cfg);
  assert.notEqual(m2, m1, 'a new model');
  assert.deepEqual(m2.persons, ['person.alex']);
  assert.equal(hv.sharedModel(h2, cfg), m2, 'and kept while nothing changes');
  // the page: rebuilds 2 s after the change settles, not on every update
  const p = page({}, h);
  p.isConnected = true;
  let builds = 0; const rb = p.rebuild.bind(p); p.rebuild = () => { builds++; rb(); };
  p.hass = h2; p.hass = { ...h2 };
  assert.equal(builds, 0);
  await sleep(2100);
  assert.equal(builds, 1);
});

test('the offline check runs at most once a second, and still sees a change inside the second (perf pass 2026-11-13)', async () => {
  const h = makeHass();
  const p = page({}, h);
  p.isConnected = true;
  // count how often the watch list is read (availSig walks it)
  let reads = 0;
  const watch = { get off() { reads++; return ['person.zoe']; }, gone: [] };
  p._watch = watch; p._watchSig = hv.availSig(h, watch); p._availAt = 0;
  reads = 0;
  for (let i = 0; i < 6; i++) p.hass = { ...h, states: { ...h.states } };   // a burst of updates
  assert.equal(reads, 1, 'one check for the burst (was one per update)');
  assert.equal(p._availT, null);
  p.hass = set(h, 'person.zoe', 'unavailable');   // inside the same second
  assert.equal(reads, 1);
  await sleep(1100);
  assert.equal(reads, 2, 'the trailing check looked at the last update');
  assert.ok(p._availT, 'and saw the change (the rebuild follows when it has settled)');
  clearTimeout(p._availT); p._availT = null;
});

test('putting the first page on screen doesn\'t ask where the window is scrolled (a forced layout of the whole dashboard)', async () => {
  globalThis.ResizeObserver ??= class { observe() {} disconnect() {} };
  let reads = 0, y = 0;
  const desc = Object.getOwnPropertyDescriptor(globalThis, 'scrollY');
  Object.defineProperty(globalThis, 'scrollY', { get() { reads++; return y; }, set(v) { y = v; }, configurable: true });
  try {
    hv.HomeViewPage._scrolls = false;
    const p = page({}, makeHass());
    reads = 0;   // (building the page lays it out: those reads are the layout's own)
    p.isConnected = true; p.connectedCallback();
    assert.equal(reads, 0, 'not while Home Assistant puts the page in (it was read here: ~150 ms at 4× on a cold load)');
    await sleep(30);
    assert.equal(reads, 1, 'once, after the frame');
    p.disconnectedCallback(); p.isConnected = false;
  } finally {
    if (desc) Object.defineProperty(globalThis, 'scrollY', desc); else globalThis.scrollY = 0;
  }
});

test('a room\'s comfort key reads the comfort settings\' entities once per update, not once per room', () => {
  const extra = { 'input_number.too_hot': { state: '80' }, 'input_number.margin': { state: '2' } };
  const h = makeHass({ extra });
  hv.buildModel(h, { comfort_margin: 'input_number.margin', comfort_limits: { hot: 'input_number.too_hot' } });   // sets the comfort settings
  let reads = 0;
  const counted = (hh) => { const st = { ...hh.states }; const v = st['input_number.too_hot']; Object.defineProperty(st, 'input_number.too_hot', { get() { reads++; return v; }, enumerable: true }); return { ...hh, states: st }; };
  const h1 = counted(h);
  const rooms = ['kitchen', 'living_room', 'bathroom', 'garage'].map((id) => ({ id, thermostat: null }));
  const keys = rooms.map((r) => hv.comfortKey(h1, r));
  assert.equal(reads, 1);
  assert.equal(new Set(keys).size, 1);
  assert.match(keys[0], /\|80\b/);
  // the next update reads it again, and the key follows the helper
  const h2 = counted(set(h, 'input_number.too_hot', '82'));
  assert.notEqual(hv.comfortKey(h2, rooms[0]), keys[0]);
  assert.equal(hv.comfortKey(h2, rooms[1]), hv.comfortKey(h2, rooms[0]));
  assert.equal(reads, 2);
});

// ---- caches and timers ---------------------------------------------------------------------------
test('the cache drops entries nobody asked for in a day (keys with the date in them piled up)', () => {
  hv.cached('st:test.old:Mon Jan 01 2024', 60e3, async () => 1);
  hv.cached('st:test.new', 60e3, async () => 2);
  hv.cache.get('st:test.old:Mon Jan 01 2024').used = Date.now() - 2 * 864e5;
  hv.cache.get('st:test.old:Mon Jan 01 2024').pending = null;
  hv.cache.get('st:test.new').pending = null;
  hv.sweepCache();
  assert.equal(hv.cache.has('st:test.old:Mon Jan 01 2024'), false);
  assert.equal(hv.cache.has('st:test.new'), true);
});

test('the slideshow keeps the addresses and sizes of the last 50 photos only', () => {
  const st = { urls: {}, ok: {}, dim: {}, bad: {} };
  for (let i = 0; i < 300; i++) { const u = `/media/p${i}.jpg?sig=${i}`; st.urls[`photo${i}`] = { url: u, exp: 1 }; st.ok[u] = true; st.dim[u] = 1.5; }
  for (let i = 0; i < 260; i++) st.bad[`bad${i}`] = true;
  hv.trimSlides(st);
  assert.equal(Object.keys(st.urls).length, hv.SLIDE_KEEP);
  assert.ok(st.urls.photo299 && !st.urls.photo0, 'the newest kept');
  assert.equal(Object.keys(st.ok).length, hv.SLIDE_KEEP);
  assert.equal(Object.keys(st.dim).length, hv.SLIDE_KEEP);
  assert.equal(Object.keys(st.bad).length, 200);
});

test('the clock tile draws once a minute; its hands turn by CSS (reduce motion: they stand, no seconds hand)', () => {
  const k = hv.R.clock.key();
  assert.equal(k, String(Math.floor(Date.now() / 60e3)));
  const html = draw(makeHass(), { kind: 'clock' });
  assert.equal((html.match(/class="hand/g) || []).length, 3);
  assert.match(html, /class="hand sec" style="transform:rotate\([\d.]+deg\);animation-duration:60s;animation-delay:-[\d.]+s"/);
  assert.match(html, /animation-duration:43200s/);
  assert.ok(hv.R.clock.tick >= 5000);
});

// ---- energy: one settings read, statistics in two reads ---------------------------------------
test('the Energy settings are read once for the pages, the strategy and the device count', async () => {
  const h = makeHass({ ws: (m) => (m.type === 'energy/get_prefs' ? { energy_sources: [{ type: 'grid', flow_from: [] }], device_consumption: [{ stat_consumption: 'sensor.a' }] } : null) });
  hv.cache.delete('energy:prefs');
  const a = hv.energyPrefsNow(h), b = hv.energyPrefsNow(h);
  assert.equal(hv.getEnergyPrefs(h), undefined);
  await Promise.all([a, b]);
  assert.equal((await a).device_consumption.length, 1);
  await hv.HomeViewStrategy.generate({ pages: ['home', 'energy'] }, h);
  assert.equal(h._sent.filter((m) => m.type === 'energy/get_prefs').length, 1);
});

test('today\'s energy: every statistic in one hourly + one 5-minute read, the running hour from the 5-minute rows', async () => {
  const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
  const hour = new Date(); hour.setMinutes(0, 0, 0);
  const hours = [];
  for (let t = midnight.getTime(); t < hour.getTime(); t += 3600e3) hours.push(t);
  const h = makeHass({ ws: (m) => {
    if (m.type !== 'recorder/statistics_during_period') return null;
    const out = {};
    for (const id of m.statistic_ids) {
      out[id] = m.period === 'hour' ? hours.map((start) => ({ start, change: 1 }))
        : [{ start: hour.getTime() - 300e3, change: 9 }, { start: hour.getTime(), change: 0.25 }, { start: hour.getTime() + 300e3, change: 0.25 }];
    }
    return out;
  } });
  const ids = ['sensor.e1', 'sensor.e2', 'sensor.e3'];
  ids.forEach((id) => { h.states[id] = { entity_id: id, state: '10', attributes: { unit_of_measurement: 'kWh' }, last_updated: new Date().toISOString() }; });
  ids.forEach((id) => hv.getStatToday(h, id));
  await sleep(60);
  const reads = h._sent.filter((m) => m.type.startsWith('recorder/'));
  assert.equal(reads.length, 2);
  assert.deepEqual(reads.map((r) => r.period).sort(), ['5minute', 'hour']);
  assert.deepEqual(reads[0].statistic_ids, ids);
  // the hours since midnight (1 each) + the running hour's 5-minute rows (the one before the hour is in the hourly rows)
  const want = hours.length + (hours.length ? 0.5 : 9.5);
  for (const id of ids) assert.equal(Math.round(hv.getStatToday(h, id) * 100) / 100, want);
});

test('device lookups use one index per entity registry (the Energy page scanned every entity per device)', () => {
  const h = makeHass();
  const ix = hv.deviceIndex(h);
  assert.deepEqual(ix.plug_a, ['switch.pump_a', 'sensor.pump_a_power']);
  assert.equal(hv.deviceIndex(h), ix, 'made once');
  assert.notEqual(hv.deviceIndex({ ...h, entities: { ...h.entities } }), ix, 'a new registry: a new index');
});

// ---- page files ----------------------------------------------------------------------------------
test('$$ is a plain $ in page files, never an unset var; a page without path: gets an admin note', () => {
  assert.equal(hv.expandVars('Price: $$5 · $x', { x: 3 }), 'Price: $5 · 3');
  const cfg = { custom_pages: [{ path: 'shop', vars: { tv: 'media_player.tv' }, sections: [{ tiles: [{ card: { type: 'markdown', content: 'Cost in $$USD, $tv, $nope' } }] }] },
    { title: 'No path', sections: [{ tiles: ['light.kitchen_main'] }] }] };
  const [shop, nopath] = hv.customPages(cfg);
  assert.equal(shop.sections[0].tiles[0].card.content, 'Cost in $USD, media_player.tv, $nope');
  assert.deepEqual(hv.missingEntities(makeHass(), shop), ['$nope']);
  assert.equal(nopath.path, 'page-2');
  const h = makeHass();
  const p = page({ page: 'custom', custom: 1, path: 'page-2', options: cfg }, h);
  const texts = (el) => [el.textContent || '', ...(el.children || []).flatMap(texts)];
  assert.ok(texts(p._root).some((t) => /no path: in its file/.test(t)), 'the admin note');
  const shopPage = page({ page: 'custom', custom: 0, path: 'shop', options: cfg }, h);
  assert.ok(!texts(shopPage._root).some((t) => /no path:/.test(t)));
});

// ---- pills ------------------------------------------------------------------------------------------
test('pills: problems first on every screen (red, then amber, then the rest); edit mode keeps the order', () => {
  const h = makeHass({ extra: { 'lock.side_door': { state: 'unavailable', area: 'entry', attributes: { friendly_name: 'Side Door' } } } });
  const order = (p) => [...p._head.innerHTML.matchAll(/data-pill="(\d+)"/g)].map((x) => Number(x[1]));
  const cfg = { pills: ['lights', 'locks', 'openings', 'batteries'] };
  for (const w of [1280, 390]) {
    win.innerWidth = w;
    try {
      const p = page({ options: cfg }, h);
      const texts = [...p._head.innerHTML.matchAll(/<span class="pt">([^<]*)</g)].map((x) => x[1]);
      // openings (Back Door open) and batteries (low) are red, locks (offline) amber, lights plain
      assert.deepEqual(texts, ['Back Door open', '1 battery low', 'Side Door offline', '1 on'], `width ${w}`);
      assert.deepEqual(order(p), [2, 3, 1, 0]);
    } finally { win.innerWidth = 1280; }
  }
  sessionStorage.setItem('homeview-edit', '1');
  // (edit mode adds the Warnings pill for admins, to add warnings: first, as saved)
  try { assert.deepEqual(order(page({ options: cfg }, h)), [0, 1, 2, 3, 4]); } finally { sessionStorage.removeItem('homeview-edit'); }
});

test('pill words: the one thing by name, several by count and noun; the thermostat: 70° · Heating', () => {
  const extra = { 'binary_sensor.garage_window': { state: 'on', area: 'garage', attributes: { friendly_name: 'Garage Window', device_class: 'window' } },
    'lock.side_door': { state: 'unavailable', area: 'entry' }, 'lock.shed': { state: 'unavailable' },
    'sensor.door_battery': { state: 'unavailable', attributes: { device_class: 'battery', unit_of_measurement: '%' } },
    'climate.house': { state: 'heat_cool', attributes: { current_temperature: 70.4, hvac_action: 'heating', target_temp_low: 68, target_temp_high: 76 } } };
  const h = makeHass({ extra });
  const m = hv.buildModel(h, {});
  assert.equal(hv.PILLS.openings(h, m, {}).text, '2 open');
  assert.equal(hv.PILLS.locks(h, m, {}).text, '2 locks offline');
  assert.equal(hv.PILLS.batteries(h, m, {}).text, '1 battery low · 1 offline');
  assert.equal(hv.PILLS.climate(h, m).text, '70° · Heating');
  const idle = set(h, 'climate.house', 'heat_cool', { hvac_action: 'idle' });
  assert.equal(hv.PILLS.climate(idle, hv.buildModel(idle, {})).text, '70°');
  const one = makeHass({ extra: { 'binary_sensor.kitchen_leak': { state: 'on', area: 'kitchen', attributes: { friendly_name: 'Kitchen Leak', device_class: 'moisture' } } } });
  assert.equal(hv.PILLS.safety(one, hv.buildModel(one, {}), {}).text, 'Kitchen Leak');
  // the pop-ups in groups, worst first
  const g = hv.PILLS.openings(h, m, {}).popup.groups;
  assert.deepEqual(g.map((x) => x.title), ['Open', 'Closed'].filter((t) => g.some((x) => x.title === t)));
  assert.equal(g[0].tone, 'red');
});

test('phones: the pills and chips wrap (no row that scrolls sideways: a sideways drag is a page swipe)', () => {
  const css = readFileSync(join(here, '..', 'dist', 'homeview.js'), 'utf8');
  assert.doesNotMatch(css, /\.head\.ph[^{]*> \.pills \{[^}]*overflow-x:auto/);
  assert.doesNotMatch(css, /\.cprow > \.chips \{[^}]*overflow-x:auto/);
  assert.doesNotMatch(css, /\.pills \{[^}]*nowrap/);
});

test('edit mode: the edit bar is its own row after the pills, not inside the title block', () => {
  sessionStorage.setItem('homeview-edit', '1');
  try {
    const p = page({ options: { pills: ['lights'] } }, makeHass());
    const html = p._head.innerHTML;
    const tb = html.indexOf('class="tblock"'), pills = html.indexOf('class="pills"'), bar = html.indexOf('class="editbar"');
    assert.ok(tb >= 0 && pills > tb && bar > pills, 'tblock, then pills, then the edit bar');
  } finally { sessionStorage.removeItem('homeview-edit'); }
});

// ---- chips --------------------------------------------------------------------------------------------
test('chips: label: shows a word on tablets; \'|\' makes a gap that moves with the chip after it', () => {
  assert.deepEqual(hv.chipList(['lock.front_door', '|', { entity: 'input_boolean.auto_lights', label: 'Auto lights' }, '|', '|']),
    [{ entity: 'lock.front_door' }, { entity: 'input_boolean.auto_lights', label: 'Auto lights', gapBefore: true }]);
  const h = makeHass({ extra: { 'input_boolean.auto_lights': { state: 'on' } } });
  const p = page({ options: { home: { chips: ['lock.front_door', '|', { entity: 'input_boolean.auto_lights', label: 'Auto lights' }] } } }, h);
  assert.match(p._head.innerHTML, /class="chp on gap lbl"[^>]*>[\s\S]*?<b class="cl">Auto lights<\/b>/);
  let saved = null;
  p._save = (f) => { const o = {}; f(o); saved = o.home.chips; };
  p._saveChipOrder(p._page.chips, ['1', '0']);
  assert.deepEqual(saved, [{ entity: 'input_boolean.auto_lights', label: 'Auto lights' }, 'lock.front_door']);   // first now: no gap before it
});

// ---- tiles ----------------------------------------------------------------------------------------------
test('Home\'s weather tile names the place instead of repeating the time and date; Up next · <calendar>', () => {
  const h = makeHass();
  const m = hv.buildModel(h, {});
  const home = hv.PAGES.home(h, m, {});
  const w = home.sections[0].tiles.find((t) => t.kind === 'weather');
  assert.equal(w.place, true);
  const html = draw(h, w);
  assert.match(html, />Home</);   // location_name
  assert.doesNotMatch(html, /\d:\d\d/);
  hv.cache.set('cal:calendar.shared:14', { value: [{ summary: 'Dinner', calendar: 'calendar.shared', start: {}, end: {}, startD: new Date(Date.now() + 3600e3), endD: new Date(Date.now() + 7200e3), allDay: false }], ts: Date.now(), pending: null, listeners: new Set(), used: Date.now() });
  assert.match(draw(h, { kind: 'next_event', calendars: ['calendar.shared'] }), /Up next · Family/);
});

test('person hero: where they are instead of the date; the temperature once (big), the footer how it feels', () => {
  const h = makeHass({ extra: { 'sensor.bedroom_zoe_temperature': { state: '71.6', attributes: { device_class: 'temperature', unit_of_measurement: '°F' }, area: 'bedroom_zoe' },
    'sensor.bedroom_zoe_humidity': { state: '45', attributes: { device_class: 'humidity', unit_of_measurement: '%' }, area: 'bedroom_zoe' } } });
  h.formatEntityState = ((f) => (st) => (st.state === 'not_home' ? 'Away' : f(st)))(h.formatEntityState);
  const m = hv.buildModel(h, {});
  const pg = hv.PAGES.member(h, m, {}, { member: 'person.zoe' });
  const hero = pg.sections[0].tiles.find((t) => t.kind === 'member_hero');
  assert.equal(hero.person, 'person.zoe');
  const html = draw(h, hero);
  assert.match(html, /class="pres">Away · now</);
  assert.match(html, /class="hbig">72°/);
  assert.doesNotMatch(html, /71\.6°/);   // not again in the footer
  assert.match(html, /45%/);
});

test('room tiles: a › opens the room\'s page; a tap elsewhere is still its lights', () => {
  const h = makeHass();
  const m = hv.buildModel(h, {});
  const s = { kind: 'room', room: m.areaById.kitchen };
  assert.match(draw(h, s), /class="rgo" data-open/);
  history.pushed.length = 0;
  hv.R.room.action(h, s, null, 'tap', { target: { closest: (sel) => (sel === '[data-open]' ? {} : null) } });
  assert.deepEqual(history.pushed.at(-1), ['push', '/test-dash/room-kitchen']);
  h._sent.length = 0;
  hv.R.room.action(h, s, null, 'tap', { target: { closest: () => null } });
  assert.equal(h._sent.at(-1)?.service, 'toggle');
});

test('an offline camera: dark tile, the amber badge and "Offline"; the camera wall is marked to fit', () => {
  const h = makeHass({ extra: { 'camera.yard': { state: 'unavailable' } } });
  const html = draw(h, { kind: 'camera', entity: 'camera.yard' });
  assert.match(html, /mdi:cctv-off/);
  assert.match(html, /class="ob"/);
  assert.match(html, />Offline</);
  assert.equal(hv.PAGES.cameras(h, hv.buildModel(h, {})).sections[0].fit, true);
});

test('away avatars are faded with a pin (not by colour alone) and are buttons', () => {
  const p = page({}, makeHass());
  assert.match(p._head.innerHTML, /class="avatar away"[^>]*role="button"[^>]*>[\s\S]*?class="aw"/);
  assert.match(p._head.innerHTML, /class="avatar home"/);
});

// ---- the rename sheet -------------------------------------------------------------------------------
test('rename: HomeView\'s own sheet, never window.prompt; Cancel = null, Save = the text', async () => {
  const keep = globalThis.prompt;
  globalThis.prompt = () => { throw new Error('window.prompt() was called'); };
  const made = [];
  const create = document.createElement;
  document.createElement = (t) => { const e = new El(t); if (t === 'div') { e._q = { '[data-no]': new El('button'), '[data-yes]': new El('button'), '.cf-in': Object.assign(new El('input'), { value: 'Island' }) }; made.push(e); } return e; };
  const pg = { _hvPage: true, _root: new El() };
  const from = { getRootNode: () => ({ host: pg }) };
  try {
    for (const [btn, want] of [['[data-no]', null], ['[data-yes]', 'Island Light']]) {
      made.length = 0;
      const p = hv.hvPrompt(from, { title: 'Tile name', value: 'Island' });
      const pop = made.find((e) => e.className === 'pop cf');
      assert.match(pop.innerHTML, /Tile name/);
      assert.match(pop.innerHTML, /class="cf-in" type="text"[^>]*value="Island"/);
      pop._q['.cf-in'].value = '  Island Light ';
      await sleep(470);
      pop._q[btn].fire('click');
      assert.equal(await p, want);
    }
  } finally { document.createElement = create; globalThis.prompt = keep; }
  const src = readFileSync(join(here, '..', 'dist', 'homeview.js'), 'utf8');
  assert.equal((src.match(/window\.prompt\(/g) || []).length, 1, 'only hvPrompt\'s fallback (no page to show a sheet on)');
});

// ---- the guest view ---------------------------------------------------------------------------------
test('guest: on an entity, for everyone but admins (or the screens listed; no entity = always there)', () => {
  const extra = { 'input_boolean.guests_here': { state: 'on' }, 'person.wall': { state: 'unknown', attributes: { user_id: 'u-wall' } } };
  const kid = makeHass({ admin: false, user: 'u-zoe', name: 'Zoe', extra });
  const admin = makeHass({ admin: true, extra });
  const wall = makeHass({ admin: true, user: 'u-wall', name: 'Wall', extra });
  assert.equal(hv.isGuest(kid, { guest: 'input_boolean.guests_here' }), true);
  assert.equal(hv.isGuest(admin, { guest: 'input_boolean.guests_here' }), false);
  assert.equal(hv.isGuest(set(kid, 'input_boolean.guests_here', 'off'), { guest: 'input_boolean.guests_here' }), false);
  assert.equal(hv.isGuest(wall, { guest: { entity: 'input_boolean.guests_here', screens: ['person.wall'] } }), true);
  assert.equal(hv.isGuest(kid, { guest: { entity: 'input_boolean.guests_here', screens: ['person.wall'] } }), false);
  assert.equal(hv.isGuest(wall, { guest: { screens: ['Wall'] } }), true);
  assert.equal(hv.isGuest(kid, { guest: {} }), false);
  assert.equal(hv.isGuest(kid, {}), false);
  const cfg = { guest: { entity: 'input_boolean.guests_here', hide: ['media'] }, custom_pages: [{ path: 'admin', admin_only: true }, { path: 'media' }, { path: 'pond' }] };
  assert.deepEqual(['member-zoe', 'people', 'cameras', 'admin', 'media', 'pond', 'home', 'energy'].filter((x) => hv.guestHidden(x, cfg)),
    ['member-zoe', 'people', 'cameras', 'admin', 'media']);
});

test('guest view: no person pages in the swipe order, no people, camera or calendar on Home; a Guest label', () => {
  const extra = { 'input_boolean.guests_here': { state: 'on' } };
  const h = makeHass({ admin: false, user: 'u-zoe', name: 'Zoe', extra });
  const cfg = { guest: 'input_boolean.guests_here', pages_config: { home: { hold: 'admin' } }, custom_pages: [{ path: 'admin', admin_only: true }] };
  const order = ['widgets', 'home', 'living', 'member-zoe', 'cameras'];
  const p = page({ options: cfg, order, nav: order.map((x) => ({ path: x, title: x })) }, h);
  assert.deepEqual(p._config.order, ['widgets', 'home', 'living']);
  assert.deepEqual(p._config.nav.map((v) => v.path), ['widgets', 'home', 'living']);
  const kinds = p._page.sections.flatMap((s) => s.tiles.map((t) => t.kind));
  assert.ok(!kinds.includes('camera') && !kinds.includes('next_event'), kinds.join());
  assert.match(p._head.innerHTML, /class="gchip"/);
  assert.doesNotMatch(p._head.innerHTML, /class="avatar/);
  assert.doesNotMatch(p._head.innerHTML, /data-title-hold/);   // the title's hold went to Admin
  // guests leave: everything is back, the same page element
  p.hass = set(h, 'input_boolean.guests_here', 'off');
  assert.deepEqual(p._config.order, order);
  assert.match(p._head.innerHTML, /class="avatar/);
  assert.doesNotMatch(p._head.innerHTML, /class="gchip"/);
});

test('guest view: a hidden page says so; Widgets has no agenda and shows the sample photos', () => {
  const extra = { 'input_boolean.guests_here': { state: 'on' } };
  const h = makeHass({ admin: false, user: 'u-zoe', name: 'Zoe', extra });
  const cfg = { guest: 'input_boolean.guests_here', widgets: { slideshow: 'media-source://family' } };
  const cams = page({ page: 'cameras', path: 'cameras', options: cfg, order: ['home', 'cameras'] }, h);
  assert.equal(cams._page.note, 'This page is hidden while guests are here.');
  const m = hv.buildModel(h, cfg);
  const w = hv.PAGES.widgets(h, m, cfg, {}, { _guest: true, rebuilder() {} });
  assert.ok(!w.board.some((t) => t.kind === 'agenda'));
  assert.equal(w.board.find((t) => t.kind === 'slideshow').folder, 'samples');
  assert.equal(w.boardClass, 'noagenda');
  const off = hv.PAGES.widgets(h, m, { ...cfg, guest: { entity: 'input_boolean.guests_here', slideshow: false } }, {}, { _guest: true, rebuilder() {} });
  assert.ok(!off.board.some((t) => t.kind === 'slideshow'));
});
