// Registry changes (entities, devices, areas, floors): only what HomeView reads rebuilds a page or makes
// Home Assistant build the dashboard again, an open sheet isn't closed under you, and the scroll
// position survives a rebuild and Home Assistant replacing a page. Made-up home only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { loadHomeView, makeHass, El, win } from './harness.mjs';

const hv = await loadHomeView();
const S = hv.HomeViewStrategy;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// window listeners, recorded (the stubs drop them): the scroll tracker and what ends a scroll restore
const winL = {};
globalThis.addEventListener = (t, f) => { (winL[t] = winL[t] || []).push(f); };
globalThis.removeEventListener = (t, f) => { winL[t] = (winL[t] || []).filter((x) => x !== f); };
const fire = (t) => (winL[t] || []).slice().forEach((f) => f({ type: t }));
const scrolls = [];
globalThis.scrollTo = (x, y) => { scrolls.push(y); globalThis.scrollY = y; };
globalThis.ResizeObserver ??= class { observe() {} disconnect() {} };
// a room's section title is bound after it's written as HTML (Living, room pages): the stub element has
// no parsed children, so hand back a stand-in
if (!('lastElementChild' in El.prototype)) {
  Object.defineProperty(El.prototype, 'lastElementChild', { configurable: true, get() { return this.children[this.children.length - 1] || (this._last ||= new El()); } });
}

/** What Home Assistant hands out after a registry event: new registry objects (edited by `edit`). */
const clone = (o) => JSON.parse(JSON.stringify(o));
const fresh = (h, edit = () => {}) => {
  const n = { ...h, entities: clone(h.entities), devices: clone(h.devices), areas: clone(h.areas), floors: clone(h.floors) };
  edit(n);
  return n;
};
/** A state update: same registries, new states object. */
const tick = (h) => ({ ...h, states: { ...h.states } });
/** A page that counts its rebuilds after the first build. */
const mkPage = (h, over = {}) => {
  const p = new hv.HomeViewPage();
  p.setConfig({ page: 'home', path: 'home', order: ['home', 'living'], options: {}, ...over });
  p.hass = h;
  let n = 0;
  const rb = p.rebuild.bind(p);
  p.rebuild = () => { n++; rb(); };
  p.builds = () => n;
  return p;
};
const changed = (a, b) => { const p = new hv.HomeViewPage(); p.setConfig({ page: 'home', options: {} }); return p._signature(a) !== p._signature(b); };

test('a registry change that touches nothing HomeView reads rebuilds no page and regenerates nothing', async () => {
  const h0 = makeHass();
  const cfg = { type: 'custom:homeview' };
  await S.generate(cfg, h0);
  const p = mkPage(h0);
  // new objects, same content (a media player's capabilities changed, or the connection came back) …
  const h1 = fresh(h0);
  // … and fields HomeView doesn't read: precision, translation key, a label, firmware, aliases, a picture
  const h2 = fresh(h1, (n) => {
    Object.assign(n.entities['light.kitchen_main'], { translation_key: 'main', display_precision: 2, has_entity_name: true });
    n.entities['switch.pump_a'].labels = ['outage_turn_off'];
    n.devices.plug_a.sw_version = '2.0';
    Object.assign(n.areas.kitchen, { aliases: ['Cookhouse'], picture: '/local/k.jpg', labels: ['x'] });
  });
  for (const [prev, next] of [[h0, h1], [h1, h2]]) {
    assert.equal(S.shouldRegenerate(cfg, prev, next), false);
    p.hass = next;
  }
  assert.equal(p.builds(), 0);
  // Home Assistant's own rule (any new registry object) for a config this browser never built
  assert.equal(S.shouldRegenerate({ type: 'custom:homeview' }, h0, h1), true);
  assert.equal(S.shouldRegenerate({ type: 'custom:homeview' }, h1, tick(h1)), false);
});

test('every registry field the code reads rebuilds the page when it changes (labels: the outage tiles key on them)', async () => {
  // a home that exercises the readers: floors, an area's own temperature sensor, a renamed device, an
  // energy device list with an outage tick, a phone tracker with a battery, an LED on a switch,
  // HomeView's HACS update entity
  const PREFS = { energy_sources: [{ type: 'grid', flow_from: [{ stat_energy_from: 'sensor.grid_energy_in' }] }], device_consumption: [{ stat_consumption: 'sensor.pump_a_energy' }] };
  hv.cached('energy:prefs', -1, () => PREFS);   // this home's energy settings, whatever an earlier test cached
  await sleep(5);
  const base = makeHass({
    extra: {
      'sensor.pump_a_energy': { state: '3', attributes: { device_class: 'energy', unit_of_measurement: 'kWh' }, device: 'plug_a' },
      'switch.kitchen_switch': { state: 'on', area: 'kitchen', device: 'wall_switch' },
      'light.kitchen_switch_led': { state: 'on', area: 'kitchen', device: 'wall_switch' },
      'device_tracker.alex_phone': { state: 'home', device: 'alex_phone' },
      'sensor.alex_phone_battery': { state: '64', attributes: { device_class: 'battery', unit_of_measurement: '%' }, device: 'alex_phone' },
      'update.homeview_update': { state: 'off', attributes: { installed_version: '0.8.20', latest_version: '0.8.20' } },
      'sensor.grid_power': { state: '800', attributes: { device_class: 'power', unit_of_measurement: 'W' }, device: 'meter' },
      'sensor.grid_energy_in': { state: '9', attributes: { device_class: 'energy', unit_of_measurement: 'kWh' }, device: 'meter' },
    },
    ws: (m) => (m.type === 'energy/get_prefs' ? PREFS
      : m.type === 'config/label_registry/list' ? [{ label_id: 'outage_turn_off', name: 'Outage: turn off' }] : null),
  });
  base.floors = { ground: { floor_id: 'ground', name: 'Ground', level: 0 }, upstairs: { floor_id: 'upstairs', name: 'Upstairs', level: 1 } };
  base.areas.kitchen.floor_id = 'ground'; base.areas.bedroom_zoe.floor_id = 'upstairs';
  base.areas.kitchen.temperature_entity_id = 'sensor.kitchen_temperature';
  base.devices.plug_a.name_by_user = 'Pond pump plug';
  base.entities['update.homeview_update'].platform = 'hacs';
  base.entities['switch.pump_a'].labels = ['outage_turn_off'];

  const reads = { entities: new Set(), devices: new Set(), areas: new Set(), floors: new Set() };
  let on = false;
  const spy = (reg, all) => Object.fromEntries(Object.entries(all).map(([id, r]) => [id, new Proxy(r, {
    get(t, k, rcv) { if (on && typeof k === 'string') reads[reg].add(k); return Reflect.get(t, k, rcv); },
  })]));
  const h = { ...base, entities: spy('entities', base.entities), devices: spy('devices', base.devices), areas: spy('areas', base.areas), floors: spy('floors', base.floors) };
  changed(h, h);   // look at these registries once before recording (the comparison's own reads would hide a gap)
  on = true;
  await hv.readLabels(h);
  const cfg = { type: 'custom:homeview', pages: ['widgets', 'home', 'living', 'rooms', 'all_rooms', 'people', 'energy', 'cameras'],
    energy: { outage: { label: 'outage_turn_off' } }, phone_favorites: { Alex: ['light.kitchen_main'] } };
  const dash = await S.generate(cfg, h);
  const pages = dash.views.map((v) => v.cards[0]);
  const draw = (spec) => { const r = hv.R[spec.kind]; if (!r) return; try { r.key(h, spec); r.html(h, spec, { refresher() {}, shadowRoot: new El(), visible: true }); } catch (e) { /* a renderer's own test covers it */ } };
  for (const width of [1280, 390]) {   // tablet and phone builds
    win.innerWidth = width;
    try {
      for (const c of pages) {
        const p = new hv.HomeViewPage();
        p.setConfig(c);
        p.hass = h;
        assert.ok(p._page, `the ${c.page} page builds`);
        for (const sec of p._page.sections || []) for (const t of sec.tiles) draw(t);
        for (const t of p._page?.board || []) draw(t);
      }
    } finally { win.innerWidth = 1280; }
  }
  on = false;
  // the test reaches the readers it means to
  for (const [reg, f] of [['entities', 'device_id'], ['entities', 'area_id'], ['entities', 'entity_category'], ['entities', 'hidden'],
    ['entities', 'platform'], ['entities', 'labels'], ['devices', 'area_id'], ['devices', 'name_by_user'], ['areas', 'name'],
    ['areas', 'floor_id'], ['areas', 'temperature_entity_id'], ['floors', 'level'], ['floors', 'name']]) {
    assert.ok(reads[reg].has(f), `the test doesn't reach a reader of ${reg}.${f}`);
  }
  // each field read: changing it on an entry rebuilds the page
  const KEYS = { entities: 'entity_id', devices: 'id', floors: 'floor_id' };
  const bump = (v) => (typeof v === 'boolean' ? !v : typeof v === 'number' ? v + 1 : Array.isArray(v) ? [...v, 'x'] : `${v ?? ''}x`);
  for (const reg of Object.keys(reads)) {
    for (const f of reads[reg]) {
      if (f === KEYS[reg] || (reg === 'entities' && f === 'labels')) continue;   // the entry's own id; labels: below
      const id = Object.keys(base[reg]).find((k) => f in base[reg][k]) || Object.keys(base[reg])[0];
      assert.ok(changed(base, fresh(base, (n) => { n[reg][id][f] = bump(n[reg][id][f]); })), `${reg}.${f} is read but a change to it doesn't rebuild the page`);
    }
  }
  // labels: a tick changes the outage tiles' keys (they redraw) but not the page
  const ticked = fresh(base, (n) => { n.entities['switch.pump_a'].labels = []; });
  assert.equal(changed(base, ticked), false);
  const o = hv.outageOpts({ outage: { label: 'outage_turn_off' } });
  const spec = { kind: 'energy_outage', grid: null, outage: o, loads: [{ kind: 'energy_load', stat: 'sensor.pump_a_energy', ...hv.pairLoad(base, 'sensor.pump_a_energy'), name: 'pump a', outage: o, row: true }] };
  assert.notEqual(hv.R.energy_outage.key(base, spec), hv.R.energy_outage.key(ticked, spec));
  assert.notEqual(hv.R.energy_load.key(base, spec.loads[0]), hv.R.energy_load.key(ticked, spec.loads[0]));
});

test('shouldRegenerate: yes once when the views change (a room renamed or added), no for a change inside a page', async () => {
  const h0 = makeHass(), cfg = { type: 'custom:homeview' };
  await S.generate(cfg, h0);
  // a light moved to another room: the same pages (the rooms' own pages rebuild themselves)
  const h1 = fresh(h0, (n) => { n.entities['light.kitchen_light'].area_id = 'living_room'; });
  assert.equal(changed(h0, h1), true);
  assert.equal(S.shouldRegenerate(cfg, h0, h1), false);
  // a room renamed: its page's title changes. Yes once — Home Assistant builds 200 ms after the last yes
  const h2 = fresh(h1, (n) => { n.areas.kitchen.name = 'Cookhouse'; });
  assert.equal(S.shouldRegenerate(cfg, h1, h2), true);
  const h2b = tick(h2);
  assert.equal(S.shouldRegenerate(cfg, h2, h2b), false);
  assert.equal(S.shouldRegenerate(cfg, h2b, tick(h2b)), false);
  // Home Assistant builds it (a new memo); then a new room with a light: a new room page
  const dash = await S.generate(cfg, h2b);
  assert.ok(dash.views.some((v) => v.title === 'Cookhouse'));
  const h3 = fresh(h2b, (n) => { n.areas.office = { area_id: 'office', name: 'Office', floor_id: null }; n.entities['light.kitchen_light'].area_id = 'office'; });
  assert.equal(S.shouldRegenerate(cfg, h2b, h3), true);
  // the same answer for the same config object only: another dashboard's config has its own memo
  const other = { type: 'custom:homeview', pages: ['home'] };
  await S.generate(other, h3);
  assert.equal(S.shouldRegenerate(other, h3, fresh(h3)), false);
});

test('an open sheet stays open: no rebuild and no new dashboard until it closes', async () => {
  const h0 = makeHass(), cfg = { type: 'custom:homeview' };
  await S.generate(cfg, h0);
  const p = mkPage(h0, { page: 'living', path: 'living' });
  p.isConnected = true; hv.HomeViewPage._current = p;
  try {
    p._root._q = { '.pop': new El() };   // the Settings sheet, a pill's pop-up, a confirm …
    const h1 = fresh(h0, (n) => { n.areas.kitchen.name = 'Cookhouse'; });
    assert.equal(S.shouldRegenerate(cfg, h0, h1), false);
    p.hass = h1;
    const h2 = tick(h1);
    assert.equal(S.shouldRegenerate(cfg, h1, h2), false);
    p.hass = h2;
    assert.equal(p.builds(), 0);
    // closed: the next update asks Home Assistant for the new dashboard; this page, about to be
    // replaced, doesn't build itself first (once, on the new page)
    p._root._q = {};
    const h3 = tick(h2);
    assert.equal(S.shouldRegenerate(cfg, h2, h3), true);
    p.hass = h3;
    assert.equal(p.builds(), 0);
    assert.ok(p._laterT, 'it builds later if it isn\'t replaced after all');
    const dash = await S.generate(cfg, h3);
    const q = new hv.HomeViewPage();
    q.setConfig(dash.views.find((v) => v.path === 'living').cards[0]);
    q.hass = h3;
    assert.ok(q._page.sections.some((s) => s.tiles.some((t) => t.room?.name === 'Cookhouse')));
    clearTimeout(p._laterT); p._laterT = null;
    // a drag in edit mode holds a rebuild too
    p._dragging = true;
    p.hass = fresh(h3, (n) => { n.entities['light.kitchen_light'].area_id = 'living_room'; });
    assert.equal(p.builds(), 0);
    p._dragging = false;
    p.hass = tick(p._hass);
    assert.equal(p.builds(), 1);
  } finally { p.isConnected = false; hv.HomeViewPage._current = null; }
});

test('a page told it will be replaced builds itself after all when Home Assistant doesn\'t replace it', async () => {
  const h0 = makeHass(), cfg = { type: 'custom:homeview' };
  await S.generate(cfg, h0);
  const p = mkPage(h0, { page: 'living', path: 'living' });
  p.isConnected = true; hv.HomeViewPage._current = p;
  try {
    const h1 = fresh(h0, (n) => { n.areas.garage.name = 'Workshop'; });
    assert.equal(S.shouldRegenerate(cfg, h0, h1), true);
    p.hass = h1;
    assert.equal(p.builds(), 0);
    await sleep(3100);   // no new dashboard came
    assert.equal(p.builds(), 1);
    assert.ok(p._page.sections.some((s) => s.tiles.some((t) => t.room?.name === 'Workshop')));
  } finally { p.isConnected = false; hv.HomeViewPage._current = null; await S.generate(cfg, h0); }
});

test('the scroll position survives a rebuild and Home Assistant replacing the page, not a move to another page', async () => {
  const h = makeHass();
  location.pathname = '/test-dash/living';
  const open = () => {
    const p = new hv.HomeViewPage();
    p.setConfig({ page: 'living', path: 'living', order: ['home', 'living'], options: {} });
    p.isConnected = true; p.connectedCallback();
    return p;
  };
  try {
    const p = open();
    p.hass = h;
    globalThis.scrollY = 900; fire('scroll');   // scrolled down
    // 1. a rebuild in place (a light moved rooms); the new page is shorter for a moment
    scrolls.length = 0; globalThis.scrollY = 300;
    p.hass = fresh(h, (n) => { n.entities['light.kitchen_light'].area_id = 'living_room'; });
    await sleep(80);
    assert.equal(scrolls.at(-1), 900);
    fire('wheel');   // you scroll: the restore stops
    scrolls.length = 0; globalThis.scrollY = 500;
    await sleep(250);
    assert.deepEqual(scrolls, []);
    // 2. Home Assistant replaces the page (it built the dashboard again; the address is unchanged)
    globalThis.scrollY = 900; fire('scroll');
    p.disconnectedCallback(); p.isConnected = false;
    globalThis.scrollY = 0;    // the browser scrolled up while the page was gone
    const q = open();
    scrolls.length = 0;
    q.hass = h;
    await sleep(80);
    assert.equal(scrolls.at(-1), 900);
    fire('touchmove');
    // 3. a move to another page: the address changes first, and the next page opens at the top
    globalThis.scrollY = 900; fire('scroll');
    location.pathname = '/test-dash/home';
    q.disconnectedCallback(); q.isConnected = false;
    globalThis.scrollY = 0; scrolls.length = 0;
    const r = new hv.HomeViewPage();
    r.setConfig({ page: 'home', path: 'home', order: ['home', 'living'], options: {} });
    r.isConnected = true; r.connectedCallback();
    r.hass = h;
    await sleep(80);
    assert.deepEqual(scrolls, []);
    r.disconnectedCallback(); r.isConnected = false;
  } finally { location.pathname = '/test-dash/home'; globalThis.scrollY = 0; }
});

test('the registry check is cheap at a large home\'s size: nothing on a state update, little on a registry change', () => {
  const ents = {}, devs = {}, areas = {};
  for (let i = 0; i < 18; i++) areas[`area_${i}`] = { area_id: `area_${i}`, name: `Area ${i}`, icon: null, floor_id: null };
  for (let i = 0; i < 530; i++) devs[`dev_${i}`] = { id: `dev_${i}`, area_id: `area_${i % 18}`, name: `Device ${i}`, name_by_user: null };
  for (let i = 0; i < 4400; i++) {
    ents[`sensor.thing_${i}`] = { entity_id: `sensor.thing_${i}`, area_id: i % 7 ? null : `area_${i % 18}`, device_id: `dev_${i % 530}`,
      entity_category: i % 3 ? null : 'diagnostic', hidden: false, labels: [], platform: 'mqtt', name: null, icon: null };
  }
  const h = { entities: ents, devices: devs, areas, floors: {}, states: {} };
  const p = new hv.HomeViewPage(); p.setConfig({ page: 'home', options: {} });
  const time = (make) => {
    let ms = 0;
    for (let i = 0; i < 20; i++) { const n = make(); const t0 = performance.now(); p._signature(n); ms += performance.now() - t0; }
    return ms / 20;
  };
  p._signature(h);
  // Home Assistant 2026.10 after a registry event: a new object, the unchanged entries kept as they were
  const shared = time(() => ({ ...h, entities: { ...ents } }));
  // older frontends: every entry a new object
  const copied = time(() => ({ ...h, entities: Object.fromEntries(Object.entries(ents).map(([k, v]) => [k, { ...v, labels: [] }])) }));
  assert.ok(shared < 5 && copied < 25, `registry check: ${shared.toFixed(2)} ms (entries kept), ${copied.toFixed(2)} ms (all new)`);   // generous for CI
  // a state update: the same registries, nothing compared
  const t0 = performance.now();
  for (let i = 0; i < 1000; i++) p._signature({ ...h, states: h.states });
  assert.ok((performance.now() - t0) / 1000 < 0.05);
});
