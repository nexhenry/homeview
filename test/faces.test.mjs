// The look: bright "on" vs recessed "off" tiles, "on" and "needs a look" told apart, the night face,
// page dots in full screen, phones opening on Home with the controls first. Made-up home only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadHomeView, makeHass, El, win } from './harness.mjs';

const hv = await loadHomeView();
const draw = (h, spec) => { const r = hv.R[spec.kind]; r.key(h, spec); return r.html(h, spec, { refresher() {}, shadowRoot: new El(), visible: true }); };

// WCAG contrast
const hslRgb = (h, s, l) => { s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map((n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))); };
const rgb = (c) => { if (Array.isArray(c)) return c; if (c.startsWith('#')) return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  const [h, s, l] = c.match(/hsl\(([\d.]+) ([\d.]+)% ([\d.]+)%\)/).slice(1).map(Number); return hslRgb(h, s, l); };
const lum = (c) => { const f = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); const [r, g, b] = rgb(c).map(f); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const mix = (a, pct, b) => rgb(a).map((v, i) => v * pct + rgb(b)[i] * (1 - pct));   // color-mix(in srgb, a pct, b)
const HUES = Array.from({ length: 72 }, (_, i) => i * 5);

test('light mode: "on" tiles bright, "off" tiles recessed, apart on every hue; words still 4.5 : 1', () => {
  let lo = Infinity;
  for (const h of HUES) {
    const p = hv.palette(h, false);
    const r = ratio(p['--hv-tile-on'], p['--hv-tile']);
    lo = Math.min(lo, r);
    assert.ok(lum(p['--hv-tile-on']) > lum(p['--hv-tile']), `on brighter than off, hue ${h}`);
    assert.ok(ratio(p['--hv-on-fg'], p['--hv-tile-on']) >= 4.5 && ratio(p['--hv-on-fg2'], p['--hv-tile-on']) >= 4.5, `text on a lit tile, hue ${h}`);
    // an alert tile is red-tinted (not the bright "on" one), and its red word still reads
    const alertTile = mix('#D70015', 0.12, p['--hv-tile']);
    assert.ok(ratio(p['--hv-alert-tx-on'], alertTile) >= 4.5, `alert word on the alert tile, hue ${h}`);
    assert.ok(ratio(p['--hv-fg'], alertTile) >= 4.5, `name and sub line on the alert tile, hue ${h}`);
    assert.match(p['--hv-alert-tile'], /^color-mix\(in srgb, #D70015 12%/);
  }
  assert.ok(lo >= 1.18, `tile-on vs tile ${lo.toFixed(2)}`);
  assert.equal(hv.palette(28, true)['--hv-alert-tile'], undefined);   // dark mode: as before
});

test('"on" and "needs a look" read apart; the offline badge stands out on any tile', () => {
  const L = hv.palette(28, false), D = hv.palette(28, true);
  assert.ok(ratio(L['--hv-on-ic'], L['--hv-warn-ic']) >= 1.7, 'light: on vs warn');   // were 1.07 : 1
  assert.ok(ratio(D['--hv-on-ic'], D['--hv-warn-ic']) >= 1.25, 'dark: on vs warn');
  for (const h of HUES) {
    const p = hv.palette(h, false), d = hv.palette(h, true);
    for (const bg of [p['--hv-tile'], p['--hv-tile-on'], p['--hv-pill']]) assert.ok(ratio(p['--hv-badge'], bg) >= 3, `badge, hue ${h}`);
    assert.ok(ratio(d['--hv-badge'], d['--hv-tile']) >= 3, `dark badge, hue ${h}`);
  }
  assert.ok(ratio(L['--hv-badge-fg'], L['--hv-badge']) >= 4.5 && ratio(D['--hv-badge-fg'], D['--hv-badge']) >= 4.5, 'the badge\'s "!"');
  assert.match(hv.HV_TONES.on, /var\(--hv-on-ic/);
  assert.match(hv.HV_TONES.warn, /var\(--hv-warn-ic/);
});

test('an offline chip keeps its icon with the badge and isn\'t lit; switch-like tiles say aria-pressed', () => {
  const h = makeHass({ extra: { 'lock.side_door': { state: 'unavailable', area: 'entry' } } });
  const p = new hv.HomeViewPage();
  p.setConfig({ page: 'home', path: 'home', order: ['home', 'living'], options: { home: { chips: ['lock.side_door', 'lock.front_door'] } } });
  p.hass = h;
  const head = p._head.innerHTML;
  assert.match(head, /class="chp warn offline" data-chip="0"[^>]*>\s*<i data-e="lock.side_door"[^>]*><\/i><span class="ob"[^>]*>!<\/span><b>Offline<\/b>/);
  // tiles: a light is a toggle button that says if it's on
  const t = new hv.HomeViewTile();
  t.spec = { kind: 'entity', entity: 'light.kitchen_main' };
  t.hass = h;
  assert.equal(t.getAttribute('aria-pressed'), 'true');
  const lock = new hv.HomeViewTile();
  lock.spec = { kind: 'entity', entity: 'lock.front_door' };
  lock.hass = h;
  assert.equal(lock.getAttribute('aria-pressed'), null);   // a lock asks first: not a plain toggle
});

test('the Air tile\'s temperature is plain text, not the air quality\'s green', () => {
  const h = makeHass({ extra: { 'sensor.kitchen_aqi': { state: '20', attributes: { device_class: 'aqi' }, area: 'kitchen' } } });
  const html = draw(h, { kind: 'air', entity: 'sensor.kitchen_aqi', temp: 'sensor.kitchen_temperature', roomName: 'Kitchen' });
  assert.match(html, />72°</);
  assert.doesNotMatch(html, /color:#34C759[^>]*>72°/);
});

// ---- the night face ----------------------------------------------------------------------------
test('night: an entity, a time window, auto; it makes the page dark and warm', () => {
  const at = (n, extra = {}) => hv.isNight(makeHass({ extra }), { night: n });
  assert.equal(at('input_boolean.night_mode', { 'input_boolean.night_mode': { state: 'on' } }), true);
  assert.equal(at('input_boolean.night_mode', { 'input_boolean.night_mode': { state: 'off' } }), false);
  assert.equal(at('input_boolean.night_mode'), false);   // missing: not night
  const d = new Date(), hm = (min) => { const x = new Date(d.getTime() + min * 60e3); return `${x.getHours()}:${String(x.getMinutes()).padStart(2, '0')}`; };
  assert.equal(at({ from: hm(-60), to: hm(60) }), true);
  assert.equal(at({ from: hm(60), to: hm(-60) }), false);   // the window across midnight that excludes now
  assert.equal(at({ from: 'x', to: hm(60) }), false);
  assert.equal(at('auto', { 'sun.sun': { state: 'above_horizon' } }), false);
  assert.equal(at(false), false);
  const h = makeHass({ extra: { 'input_boolean.night_mode': { state: 'on' } } });
  assert.equal(hv.isDark(h, { theme: 'light', night: 'input_boolean.night_mode' }), true);
  const p = new hv.HomeViewPage();
  p.setConfig({ page: 'home', path: 'home', options: { theme: 'light', night: 'input_boolean.night_mode' } });
  p.hass = h;
  assert.equal(p._root.classList.contains('night'), true);
  assert.match(p._root.getAttribute('style'), /--hv-tile:hsl\(28 /);   // every tint warm
  // turning night off rebuilds the page
  h.states['input_boolean.night_mode'] = { ...h.states['input_boolean.night_mode'], state: 'off' };
  p.hass = { ...h };
  assert.equal(p._root.classList.contains('night'), false);
});

test('night: Widgets shows "Tonight" (alarm, locks, doors, tomorrow) instead of Up next', () => {
  const h = makeHass({ extra: { 'input_boolean.night_mode': { state: 'on' }, 'alarm_control_panel.house': { state: 'armed_home', attributes: { friendly_name: 'House' } } } });
  h.formatEntityState = ((f) => (st) => (st.state === 'armed_home' ? 'Armed home' : f(st)))(h.formatEntityState);
  const m = hv.buildModel(h, {});
  const page = { rebuilder() {} };
  const night = hv.PAGES.widgets(h, m, { night: 'input_boolean.night_mode', widgets: { slideshow: false } }, {}, page);
  assert.ok(night.board.some((t) => t.kind === 'tonight') && !night.board.some((t) => t.kind === 'agenda'));
  const day = hv.PAGES.widgets(h, m, { widgets: { slideshow: false } }, {}, page);
  assert.ok(day.board.some((t) => t.kind === 'agenda'));
  const html = draw(h, night.board.find((t) => t.kind === 'tonight'));
  assert.match(html, /Tonight/);
  assert.match(html, /Armed home/);
  assert.match(html, /All locked/);
  assert.match(html, /Back Door open/);
});

// ---- full screen: page dots ----------------------------------------------------------------------
test('page dots in full screen: one per page, the current one marked; none with the page bar', () => {
  const h = makeHass();
  const p = new hv.HomeViewPage();
  const nav = [{ path: 'widgets', title: 'Widgets' }, { path: 'home', title: 'Home' }, { path: 'living', title: 'Living' }];
  p.setConfig({ page: 'home', path: 'home', order: ['widgets', 'home', 'living'], nav, options: {} });
  p.hass = h;
  const dots = p._dotsEl.innerHTML;
  assert.equal((dots.match(/data-dot="/g) || []).length, 3);
  assert.match(dots, /role="tablist"/);
  assert.match(dots, /class="dot on" role="tab" aria-selected="true" aria-label="Home"/);
  assert.equal(p._root.classList.contains('has-dots'), true);
  const q = new hv.HomeViewPage();
  q.setConfig({ page: 'home', path: 'home', order: ['widgets', 'home'], nav, options: { page_dots: false } });
  q.hass = h;
  assert.equal(q._dotsEl, null);
  const r = new hv.HomeViewPage();   // a room's page (no swipe order): none
  r.setConfig({ page: 'room', area: 'kitchen', order: [], options: {} });
  r.hass = h;
  assert.equal(r._dotsEl, null);
});

// ---- phones: open on Home, controls first, one row of pills ------------------------------------
test('start: phones open on Home, tablets on the first page; a link to another page is kept', () => {
  assert.equal(hv.startPage({}, true), 'home');
  assert.equal(hv.startPage({}, false), null);
  assert.equal(hv.startPage({ start: 'living' }, false), 'living');
  assert.equal(hv.startPage({ start: { phone: 'living', tablet: 'home' } }, false), 'home');
  const open = (path, w = 390, first = '/test-dash') => {
    hv.HomeViewPage._startChecked = false; sessionStorage.removeItem('homeview-started:test-dash'); history.pushed.length = 0;
    hv.HomeViewPage._firstPath = first;   // the address the session opened with
    const p = new hv.HomeViewPage();
    p.setConfig({ page: path, path, order: ['widgets', 'home', 'living'], options: {} });
    win.innerWidth = w;
    try { p._startPage(); } finally { win.innerWidth = 1280; }
    return history.pushed.slice();
  };
  assert.deepEqual(open('widgets'), [['replace', '/test-dash/home']]);
  assert.deepEqual(open('living'), []);           // a deep link stays
  assert.deepEqual(open('widgets', 1280), []);    // a tablet stays on Widgets
  assert.deepEqual(open('widgets', 390, '/test-dash/widgets'), []);   // Widgets typed or linked: kept
  assert.deepEqual(open('widgets', 390, '/config/dashboard'), [['replace', '/test-dash/home']]);   // from the sidebar
  // once per session
  hv.HomeViewPage._startChecked = false; history.pushed.length = 0;
  const p = new hv.HomeViewPage(); p.setConfig({ page: 'widgets', path: 'widgets', order: ['widgets', 'home'], options: {} });
  win.innerWidth = 390; try { p._startPage(); } finally { win.innerWidth = 1280; }
  assert.deepEqual(history.pushed, []);
});

test('phone Home: favourites and Lights first, then scenes two to a row, then weather (compact), camera, next event', () => {
  const h = makeHass({ extra: { 'scene.bedtime': { state: 'unknown' } } });
  const p = new hv.HomeViewPage();
  p.setConfig({ page: 'home', path: 'home', order: ['home', 'living'], options: {} });
  win.innerWidth = 390;
  try {
    p.hass = h;
    const kinds = p._page.sections.map((s) => s.tiles.map((t) => t.kind));
    assert.ok(kinds[0].every((k) => ['entity', 'room_lights', 'add'].includes(k)), JSON.stringify(kinds));
    assert.ok(p._page.sections[1].scenes && !p._page.sections[1].layout);
    assert.deepEqual(kinds[2], ['weather', 'camera', 'next_event']);
    const w = p._page.sections[2].tiles[0];
    assert.deepEqual([w.compact, w.phoneSpan], [true, [2, 3]]);
    assert.match(draw(h, w), /64°/);
    // pills on one row, problems first: the open door before the lights
    const head = p._head.innerHTML;
    assert.match(p._head.classList.contains('ph') ? 'ph' : '', /ph/);
    assert.ok(head.indexOf('1 open') < head.indexOf('1 on'), 'alert pill first');
  } finally { win.innerWidth = 1280; }
});
