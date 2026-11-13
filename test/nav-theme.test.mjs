// Swiping between pages, the ✕ on pop-up and room pages, and Home Assistant's own cards in HomeView's
// mode (light, dark, night). Made-up home only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadHomeView, makeHass, El, win } from './harness.mjs';

const hv = await loadHomeView();
// window key listeners (the stubs drop them; these tests want the Esc one)
const winListeners = {};
globalThis.addEventListener = (t, f) => { (winListeners[t] = winListeners[t] || []).push(f); };

const ORDER = ['widgets', 'home', 'living'];
const page = (over = {}, h = makeHass()) => {
  const p = new hv.HomeViewPage();
  p.setConfig({ page: 'home', path: 'home', order: ORDER, nav: ORDER.map((x) => ({ path: x, title: x })), options: {}, ...over });
  p.hass = h;
  return p;
};
const pushed = () => history.pushed.splice(0);
// an element on a touch's path, as getComputedStyle / layout would see it
const node = (css = {}, box = {}) => Object.assign(new El('div'), { nodeType: 1, _css: css, scrollWidth: 100, clientWidth: 100, ...box });
const withStyles = (fn) => {
  const keep = globalThis.getComputedStyle;
  globalThis.getComputedStyle = (n) => ({ touchAction: 'auto', overflowX: 'visible', ...(n?._css || {}) });
  try { return fn(); } finally { globalThis.getComputedStyle = keep; }
};
const touch = (x, y) => ({ clientX: x, clientY: y });
// a touch on the page: start at `from` on `path`, end on `endOn` (the page, or only the element it
// started on when a redraw took that element out of the page)
const swipe = (p, { from = [300, 400], to = [60, 410], ms = 200, path = null, endOn = 'page' } = {}) => {
  const at = path ? path[0] : node();
  const full = path || [at];
  p.fire('touchstart', { touches: [touch(...from)], composedPath: () => [...full, p], timeStamp: 1000 });
  const end = { changedTouches: [touch(...to)], timeStamp: 1000 + ms };
  if (endOn === 'target') at.fire('touchend', end);
  else { at.fire('touchend', end); p.fire('touchend', end); }   // bubbles: the element first, then the page
};

// ---- 1. swipes -----------------------------------------------------------------------------------
test('swipeStep: 80 px sideways, mostly sideways, within a second by the events\' own time stamps', () => {
  const s = { x: 300, y: 400, ts: 0 };
  assert.equal(hv.swipeStep(s, { x: 100, y: 410, ts: 200 }), 1);    // finger left: next page
  assert.equal(hv.swipeStep(s, { x: 500, y: 390, ts: 200 }), -1);   // finger right: previous
  assert.equal(hv.swipeStep(s, { x: 240, y: 400, ts: 200 }), 0);    // too short
  assert.equal(hv.swipeStep(s, { x: 150, y: 500, ts: 200 }), 0);    // too steep (a scroll)
  assert.equal(hv.swipeStep(s, { x: 100, y: 400, ts: 950 }), 1);    // slow but within a second
  assert.equal(hv.swipeStep(s, { x: 100, y: 400, ts: 1200 }), 0);   // a drag, not a swipe
});

test('ownsSideways: a row that scrolls sideways, a slider or drag handle keeps the swipe; plain tiles don\'t', () => withStyles(() => {
  const host = new El('homeview-page');
  const plain = node(), tile = node({ touchAction: 'manipulation' });
  assert.equal(hv.ownsSideways([plain, tile, host], host), false);
  const row = node({ overflowX: 'auto' }, { scrollWidth: 986, clientWidth: 362 });   // e.g. a card's wide table, the page bar
  assert.equal(hv.ownsSideways([plain, row, host], host), true);
  const fits = node({ overflowX: 'auto' }, { scrollWidth: 362, clientWidth: 362 });   // a row with nothing more to show
  assert.equal(hv.ownsSideways([plain, fits, host], host), false);
  assert.equal(hv.ownsSideways([node({ touchAction: 'none' }), host], host), true);     // a fader, an edit-mode drag handle
  assert.equal(hv.ownsSideways([node({ touchAction: 'pan-y' }), host], host), true);
  assert.equal(hv.ownsSideways([node({ touchAction: 'pan-x pan-y' }), host], host), false);
  assert.equal(hv.ownsSideways([Object.assign(node(), { localName: 'input', type: 'range' }), host], host), true);
  // only up to the page: what's around HomeView doesn't count
  assert.equal(hv.ownsSideways([plain, host, row], host), false);
}));

test('a swipe on Home goes to the next / previous page, also when the page is busy or the tile under the finger redraws', () => withStyles(() => {
  pushed();
  const p = page();
  swipe(p);
  assert.deepEqual(pushed(), [['push', '/test-dash/living']]);
  swipe(p, { from: [60, 400], to: [320, 380] });
  assert.deepEqual(pushed(), [['push', '/test-dash/widgets']]);
  // the touchend only reaches the element the finger went down on (a clock or header redraw took
  // it out of the page): the swipe still counts, once
  swipe(p, { endOn: 'target' });
  assert.deepEqual(pushed(), [['push', '/test-dash/living']]);
  // the gesture took 0.6 s by the events' time stamps: a swipe (the handler running late doesn't matter)
  swipe(p, { ms: 600 });
  assert.equal(pushed().length, 1);
  swipe(p, { ms: 1500 });
  assert.deepEqual(pushed(), []);
  // swipe: false
  const q = page({ options: { swipe: false } });
  swipe(q);
  assert.deepEqual(pushed(), []);
}));

test('Home has no row that scrolls sideways: the pills and the chips + people wrap (phone and tablet)', () => {
  const css = hv.PAGE_CSS;
  const rules = (sel) => [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)].filter((m) => m[1].includes(sel)).map((m) => m[2]).join(';');
  for (const sel of ['.pills', '.chips', '.people']) {
    const r = rules(sel);
    assert.doesNotMatch(r, /overflow(-x)?\s*:\s*(auto|scroll)/, sel);
    assert.doesNotMatch(r, /flex-wrap\s*:\s*nowrap/, sel);
  }
  assert.match(rules('.cprow > .chips'), /flex-wrap:wrap/);
  // a phone's Home: the pills in a .pills box that wraps, problems first
  const h = makeHass();
  win.innerWidth = 390;
  try {
    const p = page({}, h);
    assert.equal(p._head.classList.contains('ph'), true);
    assert.match(p._head.innerHTML, /<div class="pills">/);
  } finally { win.innerWidth = 1280; }
});

test('a swipe inside something that scrolls sideways moves that, not the page; an edit-mode drag doesn\'t page', () => withStyles(() => {
  pushed();
  const p = page();
  const row = node({ overflowX: 'auto' }, { scrollWidth: 986, clientWidth: 362 });
  swipe(p, { path: [node(), row] });
  assert.deepEqual(pushed(), []);
  swipe(p, { path: [node(), node({ overflowX: 'auto' })] });   // a row that fits: pages
  assert.equal(pushed().length, 1);
  // the row leaves the page during the swipe (a redraw): still the row's swipe
  const row2 = node({ overflowX: 'auto' }, { scrollWidth: 986, clientWidth: 362 }), pill = node();
  p.fire('touchstart', { touches: [touch(300, 200)], composedPath: () => [pill, row2, p], timeStamp: 0 });
  Object.assign(row2, { scrollWidth: 0, clientWidth: 0 });
  pill.fire('touchend', { changedTouches: [touch(60, 200)], timeStamp: 200 });
  assert.deepEqual(pushed(), []);
  // a tile or pill dragged in edit mode (set by the drag code during the gesture)
  const at = node();
  p.fire('touchstart', { touches: [touch(300, 400)], composedPath: () => [at, p], timeStamp: 0 });
  p._dragGesture = true;
  p.fire('touchend', { changedTouches: [touch(60, 400)], timeStamp: 300 });
  assert.deepEqual(pushed(), []);
  // the next plain swipe works again
  swipe(p);
  assert.equal(pushed().length, 1);
}));

// ---- 2. the ✕ on room details pages ------------------------------------------------------------------
test('room details page: the floating ✕ of the pop-up pages (no back arrow); ✕ and Esc go back to where it was opened', () => {
  const h = makeHass();
  pushed();
  const p = page({ page: 'room', path: 'room-kitchen', area: 'kitchen', order: ORDER }, h);
  assert.equal(p._page.close, true);
  assert.equal(p._page.back, undefined);
  const head = p._head.innerHTML;
  assert.match(head, /class="back xclose" data-close-page title="Close" aria-label="Close"/);
  assert.doesNotMatch(head, /data-back/);
  assert.equal(p._dotsEl, null);   // no page dots on a details page
  // opened from a HomeView page (navigate leaves where from in the history entry): ✕ = back
  let backs = 0;
  history.back = () => { backs++; };
  history.length = 3;
  hv.navigate('room-kitchen');
  assert.deepEqual(pushed(), [['push', '/test-dash/room-kitchen']]);
  history.state = { hvFrom: '/test-dash/living' };
  p._closePage();
  assert.equal(backs, 1);
  // opened from a link or a fresh load: to Living (rooms live there), replacing this entry
  history.state = null;
  p._closePage();
  assert.deepEqual(pushed(), [['replace', '/test-dash/living']]);
  // a pop-up page (Energy) without Living in the order: Home
  const e = page({ page: 'energy', path: 'energy', popup: true, order: ['widgets', 'home'] }, h);
  assert.equal(e._page.close, true);
  e._closePage();
  assert.deepEqual(pushed(), [['replace', '/test-dash/home']]);
  // Esc: closes a pop-up / room page on screen, but not while a sheet or one of HA's dialogs has it
  const esc = (path = []) => (winListeners.keydown || []).forEach((f) => f({ key: 'Escape', composedPath: () => path }));
  p.isConnected = true; hv.HomeViewPage._current = p;
  history.state = { hvFrom: '/test-dash/living' };
  esc();
  assert.equal(backs, 2);
  esc([new El('ha-more-info-dialog')]);
  assert.equal(backs, 2);
  p._root._q = { '.pop': new El() };
  esc();
  assert.equal(backs, 2);
  p._root._q = {};
  // Home itself has no ✕: Esc does nothing there
  const home = page();
  home.isConnected = true; hv.HomeViewPage._current = home;
  esc();
  assert.equal(backs, 2);
  history.state = null; history.length = 1; delete history.back;
});

// ---- 3. Home Assistant's cards in HomeView's mode --------------------------------------------------
const hslRgb = (h, s, l) => { s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map((n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))); };
const rgb = (c) => { if (c.startsWith('#')) return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  const [h, s, l] = c.match(/hsl\(([\d.]+) ([\d.]+)% ([\d.]+)%\)/).slice(1).map(Number); return hslRgb(h, s, l); };
const lum = (c) => { const f = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); const [r, g, b] = rgb(c).map(f); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const decl = (css) => Object.fromEntries(css.split(';').filter(Boolean).map((d) => { const i = d.indexOf(':'); return [d.slice(0, i).trim(), d.slice(i + 1).trim()]; }));

test('HA_VARS: Home Assistant\'s theme variables come from HomeView\'s palette; table rows are the card\'s colour', () => {
  const v = decl(hv.HA_VARS);
  assert.equal(v['--card-background-color'], 'var(--hv-tile)');
  assert.equal(v['--primary-text-color'], 'var(--hv-fg)');
  assert.equal(v['--secondary-text-color'], 'var(--hv-fg2)');
  assert.equal(v['--divider-color'], 'var(--hv-line)');
  assert.equal(v['--primary-color'], 'var(--hv-accent)');
  assert.equal(v['--rgb-primary-text-color'], 'var(--hv-fg-rgb)');
  for (const k of ['--data-table-background-color', '--table-row-background-color', '--table-row-alternative-background-color', '--table-header-background-color']) {
    assert.equal(v[k], 'var(--hv-tile)', k);   // uniform rows, no alternating colour
  }
  // HA's aliases are declared again (HA resolves them on <html>, in HA's colours)
  assert.equal(v['--mdc-theme-surface'], 'var(--card-background-color)');
  assert.equal(v['--mdc-text-field-fill-color'], 'var(--input-fill-color)');
  assert.equal(v['--wa-color-brand-fill-normal'], 'var(--ha-color-fill-primary-normal-resting)');
  assert.equal(v['--wa-color-brand-on-normal'], 'var(--ha-color-on-primary-normal)');
  assert.equal(v['--wa-color-surface-default'], 'var(--card-background-color)');
  // every --hv-* it reads is in the palette, in both modes
  const pal = hv.palette(200, true);
  for (const m of hv.HA_VARS.matchAll(/var\((--hv-[a-z0-9-]+)\)/g)) assert.ok(m[1] in pal, m[1]);
  assert.match(pal['--hv-fg-rgb'], /^\d+, \d+, \d+$/);
});

test('haTokens: HA\'s fills, borders, surfaces in the page\'s mode; the primary scale in the accent', () => {
  const d = decl(hv.haTokens(true)), l = decl(hv.haTokens(false));
  assert.equal(d['--ha-color-fill-primary-quiet-resting'], 'var(--ha-color-primary-05)');
  assert.equal(l['--ha-color-fill-primary-quiet-resting'], 'var(--ha-color-primary-95)');
  assert.equal(d['--ha-color-fill-neutral-quiet-active'], 'var(--ha-color-neutral-00)');
  assert.equal(d['--ha-color-fill-danger-normal-resting'], 'var(--ha-color-red-10)');
  assert.equal(l['--ha-color-fill-warning-loud-resting'], 'var(--ha-color-orange-70)');
  assert.equal(d['--ha-color-on-success-quiet'], 'var(--ha-color-green-70)');
  assert.equal(d['--ha-color-surface-default'], 'var(--ha-color-neutral-10)');
  assert.equal(l['--ha-color-surface-default'], 'var(--ha-color-white)');
  assert.equal(d['--energy-grid-return-color'], '#a280db');
  assert.equal(Object.keys(d).length, Object.keys(l).length);
  const p = hv.haPrimary(28, 0.6);
  assert.equal(p['--ha-color-primary-05'], 'hsl(28 51% 6.5%)');
  assert.equal(Object.keys(p).length, 11);
});

test('the page sets them for its mode: dark class and accent scale on the root (light, dark, night)', () => {
  const h = makeHass();
  const light = page({}, h);
  assert.equal(light._root.classList.contains('hv-dark'), false);
  assert.match(light._root.getAttribute('style'), /--ha-color-primary-50:hsl\(/);
  assert.match(light._root.getAttribute('style'), /--hv-tile-rgb:\d+, \d+, \d+/);
  const dark = page({ options: { theme: 'dark' } }, h);
  assert.equal(dark._root.classList.contains('hv-dark'), true);
  const night = page({ options: { night: { from: '00:00', to: '23:59' } } }, h);
  assert.equal(night._root.classList.contains('hv-dark') && night._root.classList.contains('night'), true);
  assert.match(night._root.getAttribute('style'), /--ha-color-primary-50:hsl\(28 51% 52%\)/);
});

test('cardHass: an embedded card gets HomeView\'s mode as themes.darkMode; the same copy per update', () => {
  const h = makeHass();   // HA light
  assert.equal(hv.cardHass(h, false), h);         // modes agree: HA's own object
  assert.equal(hv.cardHass(h, undefined), h);
  const c = hv.cardHass(h, true);
  assert.notEqual(c, h);
  assert.equal(c.themes.darkMode, true);
  assert.equal(c.states, h.states);
  assert.equal(h.themes.darkMode, false);          // HA's own untouched
  assert.equal(hv.cardHass(h, true), c);           // one copy per hass
  const h2 = { ...h, states: { ...h.states } };    // the next update, same themes
  assert.equal(hv.cardHass(h2, true).themes, c.themes);
  // a card tile made by a dark page is told so
  const p = page({ options: { theme: 'dark' } }, h);
  const t = p._tile({ kind: 'card', card: { type: 'markdown', content: 'x' } });
  assert.equal(t._hvDark, true);
});

test('cards: table and legend text 4.5 : 1 or more on the card in light, dark and night, every hue', () => {
  let worst = 99, worst2 = 99;
  for (let hue = 0; hue < 360; hue += 5) {
    for (const p of [hv.palette(hue, false), hv.palette(hue, true), hv.nightPalette()]) {
      const tile = p['--hv-tile'];
      worst = Math.min(worst, ratio(p['--hv-fg'], tile));     // table cells, legend, axis labels
      worst2 = Math.min(worst2, ratio(p['--hv-fg2'], tile));  // secondary text (a hidden series, units)
    }
  }
  assert.ok(worst >= 4.5, `primary text ${worst.toFixed(2)}`);
  assert.ok(worst2 >= 4.5, `secondary text ${worst2.toFixed(2)}`);
});

test('HA buttons and chips (e.g. Energy\'s "Now"): their text reads on their fill in the page\'s hue', () => {
  const step = (css, k) => decl(css)[`--ha-color-${k}`].match(/primary-(\d+)/)[1];
  let worst = 99;
  for (const dark of [false, true]) {
    const t = hv.haTokens(dark);
    for (const [fill, on] of [['fill-primary-normal-resting', 'on-primary-normal'], ['fill-primary-quiet-resting', 'on-primary-quiet'], ['fill-primary-quiet-hover', 'on-primary-quiet']]) {
      for (let hue = 0; hue < 360; hue += 5) {
        for (const sat of dark ? [1, 0.6] : [1]) {   // 0.6: the night face
          const p = hv.haPrimary(hue, sat);
          worst = Math.min(worst, ratio(p[`--ha-color-primary-${step(t, on)}`], p[`--ha-color-primary-${step(t, fill)}`]));
        }
      }
    }
  }
  assert.ok(worst >= 4.1, `chip text ${worst.toFixed(2)}`);   // 4.2 on a yellow page; most hues 5.8 or more
});
