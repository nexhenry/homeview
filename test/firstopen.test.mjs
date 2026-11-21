// 0.9.2 (unreleased): opening the dashboard. The strategy asks for what it needs from Home Assistant at
// once; a phone opening the first page (Widgets) goes to its start page (Home) without building Widgets
// on the way; the photo frame shows the folder list this browser kept and scans the folder again an
// hour after the last scan (an older list: once the dashboard has settled). Made-up data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadHomeView, makeHass, win, El } from './harness.mjs';

const hv = await loadHomeView();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
globalThis.ResizeObserver ??= class { observe() {} disconnect() {} };

// first: the energy settings are read once per 10 minutes for the whole module (cached)
test('the strategy asks for the source dashboard, its on-screen edits and the Energy settings together', async () => {
  const waiting = [];
  const h = makeHass({ ws: (m) => new Promise((ok) => waiting.push({ m, ok })) });
  h.panels = { 'src-dash': { config: { mode: 'yaml' } } };
  const input = hv.HomeViewStrategy._input({ type: 'custom:homeview', from: 'src-dash', title_x: 1 }, h);
  await sleep(5);
  const asked = waiting.map((w) => w.m.type === 'lovelace/config' ? w.m.url_path : w.m.type).sort();
  assert.deepEqual(asked, ['energy/get_prefs', 'src-dash', 'src-dash-edits'], 'all three before any answer');
  for (const w of waiting) {
    if (w.m.type === 'energy/get_prefs') w.ok({ energy_sources: [{ type: 'grid' }], device_consumption: [] });
    else if (w.m.url_path === 'src-dash') w.ok({ strategy: { type: 'custom:homeview', pages: ['home', 'energy'], ui_edits: true } });
    else w.ok({ homeview: { pages: ['home', 'widgets', 'energy'] } });
  }
  const { options, hasEnergy } = await input;
  assert.deepEqual(options.pages, ['home', 'widgets', 'energy'], 'the edits are on top');
  assert.equal(hasEnergy, true);
});

test('a source dashboard\'s edits: not used with ui_edits: false; a failed read throws when saving (strict), not when drawing', async () => {
  const src = (strat, edits) => makeHass({ ws: async (m) => {
    if (m.url_path === 'src-dash') return { strategy: strat };
    if (m.url_path === 'src-dash-edits') { if (edits instanceof Error) throw edits; return { homeview: edits }; }
    return null;
  } });
  let h = src({ ui_edits: false, title: 'A' }, { title: 'B' }); h.panels = { 'src-dash': { config: { mode: 'yaml' } } };
  assert.equal((await hv.loadSourceOptions(h, 'src-dash')).title, 'A');
  h = src({ title: 'A' }, { title: 'B' }); h.panels = { 'src-dash': { config: { mode: 'storage' } } };
  assert.equal((await hv.loadSourceOptions(h, 'src-dash')).title, 'A', 'a storage dashboard has no companion');
  h = src({ title: 'A' }, Object.assign(new Error('Connection lost'), { code: 'unknown_error' })); h.panels = { 'src-dash': { config: { mode: 'yaml' } } };
  const warn = console.warn; console.warn = () => {};
  try { assert.equal((await hv.loadSourceOptions(h, 'src-dash')).title, 'A'); } finally { console.warn = warn; }
  await assert.rejects(hv.loadSourceOptions(h, 'src-dash', true), (e) => e.code === 'hv_unreadable');
  // the source itself unreadable while saving: that error, and the edits' read doesn't go unhandled
  const bad = makeHass({ ws: async (m) => { throw Object.assign(new Error('nope'), { code: m.url_path === 'src-dash' ? 'unknown_error' : 'x' }); } });
  bad.panels = { 'src-dash': { config: { mode: 'yaml' } } };
  await assert.rejects(hv.resolveFrom(bad, { from: 'src-dash' }, true), (e) => e.code === 'hv_unreadable' && /src-dash/.test(e.message));
});

test('domainOf: the part before the first dot', () => {
  assert.equal(hv.domainOf('light.kitchen'), 'light');
  assert.equal(hv.domainOf('sensor.a.b'), 'sensor');
  assert.equal(hv.domainOf('nodot'), 'nodot');
});

// ---- the start page ------------------------------------------------------------------------------
function opening(path, width, { first = '/test-dash' } = {}) {
  hv.HomeViewPage._startChecked = false; sessionStorage.removeItem('homeview-started:test-dash'); history.pushed.length = 0;
  hv.HomeViewPage._firstPath = first;
  const p = new hv.HomeViewPage();
  p.setConfig({ page: path, path, order: ['widgets', 'home', 'living'], options: {} });
  win.innerWidth = width;
  return p;
}
const built = (p) => !!p._page;

test('a phone opening the dashboard goes to Home without building Widgets on the way', async () => {
  const h = makeHass();
  const p = opening('widgets', 390);
  try {
    p.hass = h;   // Home Assistant hands the page the house before it's on screen
    assert.deepEqual(history.pushed, [['replace', '/test-dash/home']]);
    assert.equal(built(p), false, 'Widgets not built');
    p.hass = { ...h };   // more updates on the way: still not
    assert.equal(built(p), false);
    // put on screen for a moment, then taken off when Home Assistant follows the address
    location.pathname = '/test-dash/home';
    p.isConnected = true; p.connectedCallback();
    await sleep(20);
    assert.equal(built(p), false, 'not while the address is Home\'s');
    p.hass = { ...h };
    assert.equal(built(p), false);
    p.disconnectedCallback(); p.isConnected = false;
    await sleep(5);
    assert.equal(built(p), false, 'gone before it was drawn');
    // Home: built at once
    const q = new hv.HomeViewPage();
    q.setConfig({ page: 'home', path: 'home', order: ['widgets', 'home', 'living'], options: {} });
    q.hass = h;
    assert.equal(built(q), true);
    // swiped back to Widgets later: built then
    location.pathname = '/test-dash/widgets';
    p.isConnected = true; p.connectedCallback();
    await sleep(5);
    assert.equal(built(p), true, 'built when shown');
    assert.equal(p._page.id ?? p._config.page, 'widgets');
    p.disconnectedCallback(); p.isConnected = false;
  } finally { win.innerWidth = 1280; location.pathname = '/test-dash/home'; }
});

test('the start page doesn\'t hold a page up: a tablet, a link to a page, the address that didn\'t change', async () => {
  const h = makeHass();
  try {
    const t = opening('widgets', 1280);
    t.hass = h;
    assert.deepEqual(history.pushed, []);
    assert.equal(built(t), true, 'a tablet builds Widgets at once');
    const l = opening('widgets', 390, { first: '/test-dash/widgets' });
    l.hass = h;
    assert.equal(built(l), true, 'Widgets typed or linked');
    // the phone's Widgets stays on screen with its address (the move didn't happen): built at once
    location.pathname = '/test-dash';
    const s = opening('widgets', 390);
    s.hass = h;
    assert.equal(built(s), false);
    s.isConnected = true; s.connectedCallback();
    await sleep(5);
    assert.equal(built(s), true);
    s.disconnectedCallback(); s.isConnected = false;
    // … or on screen under Home's address for longer than Home Assistant takes to follow it: built then
    location.pathname = '/test-dash/home';
    const w = opening('widgets', 390);
    w.hass = h;
    w.isConnected = true; w.connectedCallback();
    await sleep(200);
    assert.equal(built(w), false);
    await sleep(2300);   // (1.5 s; a busy test machine runs timers late)
    assert.equal(built(w), true, 'still on screen after 1.5 s');
    w.disconnectedCallback(); w.isConnected = false;
    // once per session: the next page HA hands over is built as before
    const n = new hv.HomeViewPage();
    n.setConfig({ page: 'widgets', path: 'widgets', order: ['widgets', 'home'], options: {} });
    win.innerWidth = 390; history.pushed.length = 0;
    n.hass = h;
    assert.equal(built(n), true);
    assert.deepEqual(history.pushed, []);
  } finally { win.innerWidth = 1280; location.pathname = '/test-dash/home'; }
});

// ---- the photo frame's folder list --------------------------------------------------------------
test('slideshow: a recent kept list is used without a scan until an hour after it was made; an older one waits until the dashboard has settled', () => {
  const now = 1_800_000_000_000;
  const keep = (folder, at) => {
    localStorage.setItem(`homeview-photos:${folder}`, JSON.stringify(['media-source://media_source/local/p/a.jpg']));
    if (at != null) localStorage.setItem(`homeview-photos-at:${folder}`, String(at));
  };
  keep('f-recent', now - 10 * 60e3);
  const r = hv.slideState('f-recent', now);
  assert.equal(r.items.length, 1);
  assert.equal(r.next, now - 10 * 60e3 + hv.SLIDE_RESCAN_MS, 'an hour after the scan');
  keep('f-old', now - 2 * 3600e3);
  assert.equal(hv.slideState('f-old', now).next, now + hv.SLIDE_SETTLE_MS, 'old: once settled');
  keep('f-legacy');   // kept by an older HomeView: no time
  assert.equal(hv.slideState('f-legacy', now).next, now + hv.SLIDE_SETTLE_MS);
  assert.equal(hv.slideState('f-none', now).next, 0, 'nothing kept: scan now');
  assert.equal(hv.slideState('f-none', now).items, null);
});

test('slideshow: a scan keeps the list and when it was made; a tile with a recent list doesn\'t browse the folder', async () => {
  const browsed = [];
  const h = makeHass({ ws: async (m) => {
    if (m.type === 'media_source/browse_media') { browsed.push(m.media_content_id); return { children: [{ can_expand: false, media_class: 'image', media_content_type: 'image/jpeg', media_content_id: `${m.media_content_id}/a.jpg`, title: 'a.jpg' }] }; }
    return null;
  } });
  const box = { querySelector: () => null, appendChild() {}, set innerHTML(v) {} };
  const tile = { shadowRoot: { querySelector: () => box }, visible: false };
  const before = Date.now();
  hv.R.slideshow.update(h, { folder: 'f-scan', interval: 60 }, tile);
  await sleep(10);
  assert.deepEqual(browsed, ['f-scan']);
  assert.ok(JSON.parse(localStorage.getItem('homeview-photos:f-scan')).length === 1);
  assert.ok(Number(localStorage.getItem('homeview-photos-at:f-scan')) >= before);
  // another tab / the next visit: the kept list, no scan
  localStorage.setItem('homeview-photos:f-kept', JSON.stringify(['f-kept/b.jpg']));
  localStorage.setItem('homeview-photos-at:f-kept', String(Date.now() - 60e3));
  hv.R.slideshow.update(h, { folder: 'f-kept', interval: 60 }, tile);
  await sleep(10);
  assert.deepEqual(browsed, ['f-scan']);
});

// ---- font: geist — the WOFF2 copy first, the TTF if it isn't there ----------------------------------
test('font: geist loads Geist.woff2, else Geist.ttf (one FontFace, shown with the system font until it\'s in)', async () => {
  assert.equal(hv.fontSrc(['/local/fonts/geist/Geist.woff2', '/local/fonts/geist/Geist.ttf']),
    'url("/local/fonts/geist/Geist.woff2") format(\'woff2\'), url("/local/fonts/geist/Geist.ttf") format(\'truetype\')');
  assert.equal(hv.fontSrc('/local/fonts/my font.otf?v=2'), 'url("/local/fonts/my font.otf?v=2") format(\'opentype\')');
  assert.equal(hv.fontSrc('/local/fonts/x'), 'url("/local/fonts/x")');
  const made = [], added = [];
  const ff = globalThis.FontFace, fonts = document.fonts;
  globalThis.FontFace = class { constructor(family, src, desc) { made.push({ family, src, desc }); } load() { return Promise.resolve(this); } };
  document.fonts = { add: (f) => added.push(f) };   // at once, not once loaded (the page knows the font's name from the start)
  try {
    const stack = hv.fontStack('geist');
    assert.match(stack, /^'Geist', -apple-system/);
    hv.fontStack('Geist');   // the same font again: not loaded twice
    hv.fontStack({ family: 'Geist', url: hv.FONT_PRESETS.geist.url });
    assert.equal(made.length, 1);
    assert.equal(made[0].src, hv.fontSrc(hv.FONT_PRESETS.geist.url));
    assert.equal(made[0].desc.display, 'swap');
    assert.equal(made[0].desc.weight, '100 900');
    assert.equal(added.length, 1, 'added before it has loaded');
  } finally { globalThis.FontFace = ff; document.fonts = fonts; }
});

test('the strategy asks for the dashboard\'s font while it reads the settings, before any page is built', async () => {
  const made = [];
  const ff = globalThis.FontFace, fonts = document.fonts;
  globalThis.FontFace = class { constructor(family, src) { made.push(src); } load() { return Promise.resolve(this); } };
  document.fonts = { add() {} };
  try {
    await hv.HomeViewStrategy._input({ type: 'custom:homeview', font: { family: 'Early Font', url: '/local/fonts/early.woff2' }, widgets: { font: 'inter' } }, makeHass());
    assert.ok(made.includes(hv.fontSrc('/local/fonts/early.woff2')));
    assert.ok(made.includes(hv.fontSrc(hv.FONT_PRESETS.inter.url)));
  } finally { globalThis.FontFace = ff; document.fonts = fonts; }
});

// ---- the photo frame: the photo loaded ahead is the one shown ------------------------------------
test('slideshow: the photo loaded ahead is what\'s shown (not loaded again); a portrait one gets its blurred copy', async () => {
  const loads = [];
  class Img {
    constructor() { this.style = {}; this.isConnected = false; this.className = ''; }
    set src(v) { this._src = v; loads.push(v); setTimeout(() => this.onload?.(), 0); }
    get src() { return this._src; }
    get naturalWidth() { return this._w ?? 1600; } get naturalHeight() { return 1000; }
    cloneNode() { const c = Object.create(Img.prototype); Object.assign(c, { style: {}, isConnected: false, className: '', _src: this._src, copy: true }); return c; }
  }
  const layers = [];
  const box = { querySelector: (sel) => (sel === 'img' && layers.length ? {} : null), appendChild: (l) => { layers.push(l); }, querySelectorAll: () => layers.map((l) => ({ remove() {} })) };
  const tile = { shadowRoot: { querySelector: () => box }, visible: true };
  const ce = document.createElement, img0 = globalThis.Image, now0 = Date.now;
  globalThis.Image = Img;
  document.createElement = (t) => { if (t === 'img') return new Img(); const e = new El(t); e.append = (...c) => { e.children.push(...c); }; return e; };
  Date.now = () => 12 * 60e3 * 1000 + 5000;   // a slot at the start of a shuffle pass: this photo and the next two in one pass
  try {
    // (at a shuffle's pass boundary the next photo can be this one, still loading: the next tick shows it)
    for (let i = 0; i < 3 && !layers.length; i++) { hv.R.slideshow.update(makeHass(), { folder: 'samples', interval: 60 }, tile); await sleep(10); }
    assert.equal(layers.length, 1);
    const [shown] = layers[0].children;
    assert.ok(shown instanceof Img && !shown.copy, 'the element loaded ahead');
    assert.ok(loads.length >= 2 && loads.length <= 3, 'the current photo and the next two');
    assert.equal(new Set(loads).size, loads.length, 'each once');
    // a portrait photo: the loaded one (contain) over a blurred copy
    const st = hv.slideState('samples');
    const url = loads[0], pre = st.imgs.get(url);   // loaded first: the next photo (then the one after, then this one)
    st.dim[url] = 0.66;
    tile._skip = 1;
    hv.R.slideshow.update(makeHass(), { folder: 'samples', interval: 60 }, tile);
    await sleep(10);
    const [blur, photo] = layers.at(-1).children;
    assert.equal(photo, pre);
    assert.equal(photo.style.objectFit, 'contain');
    assert.ok(blur.copy && blur.className === 'blur');
    assert.ok(st.imgs.size <= 4);
  } finally { document.createElement = ce; globalThis.Image = img0; Date.now = now0; }
});

// ---- Home's camera: the first still once the page is on screen; the loaded still itself is shown ----
test('camera tile: the first still waits for the page to be on screen, then the loaded image replaces the old one', async () => {
  const made = [];
  class Img { constructor() { this.style = {}; made.push(this); } set src(v) { this._src = v; setTimeout(() => this.onload?.(), 0); } get src() { return this._src; } }
  const img0 = globalThis.Image; globalThis.Image = Img;
  const cur = { style: { cssText: 'position:absolute' }, replaced: null, replaceWith(n) { this.replaced = n; } };
  const tile = { shadowRoot: { querySelector: (q) => (q === 'img.cam' ? (cur.replaced ? null : cur) : null) }, visible: true, isConnected: false };
  const h = makeHass({ extra: { 'camera.sample_cam': { state: 'idle', attributes: { entity_picture: '/api/camera_proxy/camera.sample_cam?token=x' } } } });
  try {
    hv.R.camera.update(h, { kind: 'camera', entity: 'camera.sample_cam' }, tile);
    await sleep(5);
    assert.equal(made.length, 0, 'not while the page isn\'t on screen');
    tile.isConnected = true;
    await sleep(400);
    assert.equal(made.length, 1, 'once on screen');
    assert.match(made[0].src, /camera_proxy\/camera\.sample_cam\?token=x&_t=\d+/);
    await sleep(5);
    assert.equal(cur.replaced, made[0], 'the loaded image is the one shown');
    assert.equal(made[0].className, 'cam');
    assert.equal(made[0].style.cssText, 'position:absolute');
  } finally { globalThis.Image = img0; }
});
