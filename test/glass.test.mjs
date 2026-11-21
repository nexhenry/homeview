// 0.10.0: style: glass (Liquid Glass), the default; style: classic = the look before. The contrast table
// (a port of the designer's tools/contrast_glass.py) runs over every hue in light, dark and night with
// NO blur (a browser that says it blurs and doesn't), plus the switches and fallbacks. Made-up data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadHomeView, makeHass, El, win } from './harness.mjs';

globalThis.CSS = { supports: (p) => /backdrop-filter/.test(p) };   // a browser that can blur (asked once, before the first look)
const hv = await loadHomeView();
globalThis.ResizeObserver ??= class { observe() {} disconnect() {} };

// ---- colour maths (CSS sRGB compositing) ----------------------------------------------------------
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const Y = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const cr = (a, b) => { const [x, y] = [Y(a), Y(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const over = (top, a, bot) => top.map((t, i) => a * t + (1 - a) * bot[i]);
/** a CSS colour as [[r, g, b], alpha]: hsl(), rgb(), #hex, transparent, color-mix(in srgb, A p%, B) */
function parse(c) {
  c = String(c).trim();
  if (c === 'transparent') return [[0, 0, 0], 0];
  let m = c.match(/^hsla?\(\s*([\d.]+)[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*(?:[/,]\s*([\d.]+))?\)$/);
  if (m) return [hv.hslRgb(+m[1], +m[2], +m[3]), m[4] === undefined ? 1 : +m[4]];
  m = c.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[/,]\s*([\d.]+))?\)$/);
  if (m) return [[+m[1] / 255, +m[2] / 255, +m[3] / 255], m[4] === undefined ? 1 : +m[4]];
  m = c.match(/^#([0-9a-f]{6})$/i);
  if (m) return [[0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255), 1];
  m = c.match(/^color-mix\(in srgb,\s*(.+?)\s+([\d.]+)%,\s*(.+)\)$/);
  if (m) {
    const [a, aa] = parse(m[1]), p = +m[2] / 100;
    if (m[3].trim() === 'transparent') return [a, aa * p];
    const [b] = parse(m[3]);
    return [over(a, p, b), 1];
  }
  throw new Error(`can't parse ${c}`);
}
const rgb = (c) => parse(c)[0];
/** the wallpaper's points: its base, and each blob's colour over the base */
function wallPoints(wall) {
  const cols = wall.match(/hsl\([^)]*\)/g);
  const [base] = parse(cols.at(-1));
  return [base, ...cols.slice(0, -1).map((x) => { const [c, a] = parse(x); return over(c, a, base); })];
}
const HUES = Array.from({ length: 72 }, (_, i) => i * 5);
const BLUR = { blur: true };
function tokens(h, dark, sat = 1, night = false, look = BLUR) {
  return { ...(night ? hv.palette(28, true, 0.6) : hv.palette(h, dark, sat)), ...hv.glassPalette(night ? 28 : h, dark, night ? 0.6 : sat, night, look) };
}
function worst(fn) {   // [ratio, hue] of the lowest
  let w = [Infinity, null];
  for (const h of HUES) { const r = fn(h); if (r < w[0]) w = [r, h]; }
  return w;
}
const surf = (T, key, wall) => { const [c, a] = parse(T[key]); return over(c, a, wall); };

for (const [mode, dark] of [['light', false], ['dark', true]]) {
  test(`glass contrast, ${mode}, every hue, no blur: text 4.5 : 1, icons 3 : 1 (tiles, on tiles, pills, the wallpaper)`, () => {
    const fails = [];
    const need = (name, h, r, min) => { if (r < min) fails.push(`${name} hue ${h}: ${r.toFixed(2)} < ${min}`); };
    for (const sat of [1, 0.35]) {
      for (const h of HUES) {
        const T = tokens(h, dark, sat);
        for (const w of wallPoints(T['--g-wall'])) {
          const tile = surf(T, '--g-tile', w), on = surf(T, '--g-tile-on', w), pill = surf(T, '--g-ctl', w);
          need('fg on a tile', h, cr(rgb(T['--hv-fg']), tile), 4.5);
          need('fg2 on a tile', h, cr(rgb(T['--hv-fg2']), tile), 4.5);
          need('icon on a tile', h, cr(rgb(T['--hv-icon']), tile), 3);
          need('on-fg on an on tile', h, cr(rgb(T['--hv-on-fg']), on), 4.5);
          need('on-fg2 on an on tile', h, cr(rgb(T['--hv-on-fg2']), on), 4.5);
          need('fg on a pill', h, cr(rgb(T['--hv-fg']), pill), 4.5);
          need('fg2 on a pill', h, cr(rgb(T['--hv-fg2']), pill), 4.5);
          need('fg2 on the wallpaper', h, cr(rgb(T['--hv-fg2']), w), 4.5);
          need('white on the alert glass', h, cr([1, 1, 1], surf(T, '--g-alert', w)), 4.5);
        }
        // a sheet over unknown content (black or white under the dim), no blur; rows inside it
        for (const content of [[0, 0, 0], [1, 1, 1]]) {
          const under = surf(T, '--g-dim', content), sheet = surf(T, '--g-sheet', under), row = surf(T, '--g-row', sheet);
          need('fg2 on a sheet', h, cr(rgb(T['--hv-fg2']), sheet), 4.5);
          need('fg2 on a sheet row', h, cr(rgb(T['--hv-fg2']), row), 4.5);
        }
      }
    }
    assert.deepEqual(fails.slice(0, 8), []);
  });
}

test('glass contrast, night: warm near-black, text and icons pass on tiles and pills', () => {
  const T = tokens(28, true, 1, true);
  for (const w of wallPoints(T['--g-wall'])) {
    assert.ok(cr(rgb(T['--hv-fg']), surf(T, '--g-tile', w)) >= 4.5);
    assert.ok(cr(rgb(T['--hv-fg2']), surf(T, '--g-tile', w)) >= 4.5);
    assert.ok(cr(rgb(T['--hv-icon']), surf(T, '--g-tile', w)) >= 3);
    assert.ok(cr(rgb(T['--hv-fg']), surf(T, '--g-ctl', w)) >= 4.5);
  }
  assert.equal(T['--g-float-filter'], 'none', 'no live blur at night');
  assert.equal(T['--g-pop-filter'], 'none');
  assert.equal(T['--g-sheen'], 'none');
});

test('the floating capsule (page dots, ✕): its icon 3 : 1 over black (light) or white dimmed by its brightness(.7) (dark)', () => {
  for (const h of HUES) {
    const L = tokens(h, false), D = tokens(h, true);
    assert.ok(cr(rgb(L['--hv-fg']), surf(L, '--g-float', [0, 0, 0])) >= 3, `light ${h}`);
    assert.ok(cr(rgb(D['--hv-fg']), surf(D, '--g-float', [0.7, 0.7, 0.7])) >= 3, `dark ${h}`);
  }
});

test('the wallpaper is equally bright on every hue (luminance bands), so the guarantees above hold', () => {
  for (const h of HUES) {
    const [lb, ...lblobs] = wallPoints(hv.glassWall(h, false, 1)), [db] = wallPoints(hv.glassWall(h, true, 1));
    assert.ok(Y(lb) >= 0.69 && Y(lb) <= 0.745, `light base ${h}: ${Y(lb)}`);
    assert.ok(Y(db) >= 0.0035 && Y(db) <= 0.0065, `dark base ${h}: ${Y(db)}`);
    lblobs.forEach((b) => assert.ok(Y(b) > 0.55 && Y(b) < 0.75, `light blob ${h}: ${Y(b)}`));
  }
});

test('classic, fixed: white text on a filled accent button 4.5 : 1 on every hue (it was 1.7–3), and on the dark alert red', () => {
  const lo = worst((h) => Math.min(cr([1, 1, 1], rgb(hv.palette(h, false)['--hv-accent-fill'])), cr([1, 1, 1], rgb(hv.palette(h, true)['--hv-accent-fill']))));
  assert.ok(lo[0] >= 4.5, `white on --hv-accent-fill: ${lo[0].toFixed(2)} at hue ${lo[1]}`);
  assert.ok(cr([1, 1, 1], rgb(hv.palette(28, true)['--hv-alert-fill'])) >= 4.5);
  assert.ok(cr([1, 1, 1], rgb(hv.palette(28, false)['--hv-alert-fill'])) >= 4.5);
  // the buttons and the avatar letter use it
  for (const sel of ['.txt.primary', '.cf-btn.go', '.hb.updi']) assert.match(hv.PAGE_CSS, new RegExp(`${sel.replace(/\./g, '\\.')} \\{ background:var\\(--hv-accent-fill`));
});

// ---- the look on this screen ----------------------------------------------------------------------
test('style: glass is the default; classic, screens, live_blur, night and edit mode', () => {
  const h = makeHass();
  const l = hv.lookOf(h, {});
  assert.ok(l && l.blur && l.aura && !l.solid && !l.hc, JSON.stringify(l));
  assert.equal(hv.lookOf(h, { style: 'classic' }), null);
  assert.equal(hv.lookOf(h, { glass: { screens: ['Kitchen iPad'] } }), null, 'another login');
  assert.ok(hv.lookOf(h, { glass: { screens: ['alex'] } }), 'this login (by name)');
  assert.equal(hv.lookOf(h, { glass: { live_blur: false } }).blur, false);
  assert.equal(hv.lookOf(h, { glass: { live_blur: 'auto' } }).blur, true, 'auto: on, wall tablets included');
  const n = hv.lookOf(h, {}, true);
  assert.ok(!n.blur && !n.aura, 'night: no live blur, no photo aura');
  assert.equal(hv.lookOf(h, {}, false, true).blur, false, 'edit mode: no live blur');
  assert.equal(hv.lookOf(h, { glass: { photo_aura: false } }).aura, false);
  assert.equal(hv.lookOf(h, { glass: { wallpaper: 'plain' } }).plain, true);
});

test('reduce transparency on this screen (the settings sheet switch): solid surfaces, no live blur; a look change rebuilds', () => {
  const h = makeHass();
  let fired = 0;
  const de = globalThis.dispatchEvent; globalThis.dispatchEvent = (e) => { if (e.type === 'homeview-look') fired++; return true; };
  try {
    hv.setScreenReduced(true);
    assert.equal(hv.screenReduced(), true);
    const l = hv.lookOf(h, {});
    assert.ok(l.solid && !l.blur);
    const T = hv.glassPalette(28, false, 1, false, l);
    assert.equal(T['--g-tile'], T['--g-tile-solid']);
    assert.equal(T['--g-float-filter'], 'none');
    assert.equal(T['--g-pop-filter'], 'none');
    assert.equal(parse(T['--g-tile'])[1], 1, 'opaque');
    hv.setScreenReduced(false);
    assert.equal(hv.screenReduced(), false);
    assert.equal(fired, 2);
  } finally { globalThis.dispatchEvent = de; localStorage.removeItem(hv.REDUCE_KEY); }
});

test('increased contrast / forced colours (media queries): opaque, a visible edge, secondary text = primary, on = a ring', () => {
  const mm = globalThis.matchMedia;
  globalThis.matchMedia = (q) => ({ matches: q === '(prefers-contrast: more)', addEventListener() {} });
  try {
    const l = hv.lookOf(makeHass(), {});
    assert.ok(l.hc && !l.blur);
    const T = hv.glassPalette(28, false, 1, false, l);
    assert.equal(T['--hv-fg2'], T['--hv-fg']);
    assert.equal(T['--g-sheen'], 'none');
    assert.match(T['--g-rim'], /inset 0 0 0 1\.5px/);
    assert.match(T['--g-rim-on'], /inset 0 0 0 2\.5px/);
  } finally { globalThis.matchMedia = mm; }
});

test('a page in glass: the wallpaper and glass tokens on the page, room tints carry their own glass; classic has none', () => {
  const h = makeHass();
  const page = (options) => { const p = new hv.HomeViewPage(); p.setConfig({ page: 'home', path: 'home', order: ['home'], options }); p.hass = h; return p; };
  const g = page({});
  assert.ok(g._root.classList.contains('glass'));
  assert.match(g._root.getAttribute('style'), /--g-wall:radial-gradient/);
  assert.match(g._root.getAttribute('style'), /--g-tile:hsl/);
  const c = page({ style: 'classic' });
  assert.ok(!c._root.classList.contains('glass'));
  assert.doesNotMatch(c._root.getAttribute('style'), /--g-/);
  // a tile with its own hue (a room): its glass in that hue
  const t = c._tile({ kind: 'room', area: 'kitchen', hue: 120 }, false);
  assert.doesNotMatch(t.getAttribute('style') || '', /--g-tile/, 'classic: no glass on a room tint');
  page({});   // glass again
  const t2 = g._tile({ kind: 'room', area: 'kitchen', hue: 120 }, false);
  assert.match(t2.getAttribute('style'), /--g-tile:hsl\(120 /);
});

test('the CSS: classic keeps its values (every glass variable has the old one as fallback), no blur on tiles, the dots fade fixed', () => {
  // tiles: no backdrop-filter in glass (the edit buttons' blur goes too); classic's edit blur is a fallback
  const tileBlur = hv.TILE_CSS.match(/backdrop-filter:[^;}]+/g) || [];
  assert.ok(tileBlur.every((d) => /var\(--g-edit-filter, blur\(6px\)\)/.test(d)), tileBlur.join(' | '));
  assert.match(hv.TILE_CSS, /\.t \{[^}]*background-color:var\(--g-tile, var\(--hv-tile\)\)/);
  assert.match(hv.TILE_CSS, /border:var\(--g-border, 0\.5px solid var\(--hv-tile-border\)\)/);
  // page: the live blurs are the dots, the ✕ / full-screen button, the toast and the sheet backdrop only
  const css = hv.PAGE_CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  const glassBlur = (css.match(/[^{}]*\{[^}]*backdrop-filter:var\(--g-[a-z-]+\)/g) || []).map((r) => r.split('{')[0].trim());
  assert.deepEqual(glassBlur.map((x) => x.replace(/\s+/g, ' ')), ['.page.glass .dots .drow', '.page.glass .fsb, .page.glass .head > .xclose', '.page.glass .toast', '.page.glass .pop']);
  // the dots: their parent never fades (it would be the capsule's backdrop root)
  assert.doesNotMatch(hv.PAGE_CSS, /\.dots\.idle \{ opacity:0; \}/);
  assert.match(hv.PAGE_CSS, /\.dots\.idle \.dot, \.dots\.idle \.drow::before \{ opacity:0; \}/);
  assert.match(hv.PAGE_CSS, /\.page\.glass \.dots\.idle \.drow \{ opacity:0; \}/);
  assert.doesNotMatch(hv.PAGE_CSS.match(/\.dots \{[^}]*\}/)[0], /transition|opacity/);
});

test('Widgets photo aura: the photo drawn small into a canvas behind the board, crossfaded; nothing in classic or at night', () => {
  const drawn = [];
  const mkCanvas = () => { const c = new El('canvas'); c.getContext = () => ({ set filter(v) { this.f = v; }, clearRect() {}, drawImage: (img, ...a) => drawn.push([img, a, c]) }); return c; };
  const ce = document.createElement; document.createElement = (t) => (t === 'canvas' ? mkCanvas() : new El(t));
  const board = new El('div'); board.prepend = (c) => board.children.unshift(c);
  const tile = { closest: (sel) => (sel === '.board' ? board : null) };
  const img = { naturalWidth: 1600 };
  const ric = globalThis.requestIdleCallback; globalThis.requestIdleCallback = (f) => f();   // drawn when the browser is idle
  try {
    hv.photoAura(tile, img);
    assert.equal(drawn.length, 0, 'the board has no aura (classic, night, photo_aura: false)');
    board.classList.add('aura');
    hv.photoAura(tile, img);
    assert.equal(drawn.length, 1);
    assert.deepEqual(drawn[0][1], [-2, -2, 52, 34]);
    const cvs = board.children.filter((c) => c.localName === 'canvas');
    assert.equal(cvs.length, 2);
    assert.equal(cvs.filter((c) => c.classList.contains('on')).length, 1);
    const first = drawn[0][2];
    hv.photoAura(tile, img);   // the next photo: the other canvas, crossfaded
    assert.notEqual(drawn[1][2], first);
    assert.ok(drawn[1][2].classList.contains('on') && !first.classList.contains('on'));
  } finally { document.createElement = ce; globalThis.requestIdleCallback = ric; }
});

// ---- style: <entity> (an Admin-page switch) and this screen's own look ------------------------------
test('style: an entity — Glass / Classic in any case; unknown, unavailable or missing: glass', () => {
  const at = (state) => makeHass({ extra: state === undefined ? {} : { 'input_select.look_test': { state } } });
  const cfg = { style: 'input_select.look_test' };
  assert.equal(hv.styleOf(at('Classic'), cfg), 'classic');
  assert.equal(hv.styleOf(at('CLASSIC'), cfg), 'classic');
  assert.equal(hv.styleOf(at('Glass'), cfg), 'glass');
  assert.equal(hv.styleOf(at('unknown'), cfg), 'glass');
  assert.equal(hv.styleOf(at('unavailable'), cfg), 'glass');
  assert.equal(hv.styleOf(at(undefined), cfg), 'glass');
  assert.equal(hv.styleOf(at('x'), { style: 'Classic' }), 'classic', 'a fixed value, any case');
  assert.equal(hv.styleOf(at('x'), {}), 'glass');
  assert.equal(hv.lookOf(at('Classic'), cfg), null);
  assert.ok(hv.lookOf(at('Glass'), cfg));
});

test('which look a screen gets: its own pick first, then style: (with glass.screens); reduce transparency within glass', () => {
  const h = makeHass({ extra: { 'input_select.look_test': { state: 'Classic' } } });
  const de = globalThis.dispatchEvent; globalThis.dispatchEvent = () => true;
  try {
    assert.equal(hv.lookOf(h, { style: 'input_select.look_test' }), null);
    hv.setScreenLook('glass');
    assert.ok(hv.lookOf(h, { style: 'input_select.look_test' }), 'this screen picked glass: wins over the entity');
    assert.ok(hv.lookOf(h, { glass: { screens: ['Kitchen iPad'] } }), '…and over glass.screens');
    hv.setScreenLook('classic');
    assert.equal(hv.lookOf(makeHass(), {}), null, 'this screen picked classic');
    hv.setScreenLook('');
    assert.equal(hv.screenLook(), null);
    assert.equal(hv.lookOf(makeHass(), { glass: { screens: ['Kitchen iPad'] } }), null, 'not one of the screens: classic');
    hv.setScreenReduced(true);
    assert.ok(hv.lookOf(makeHass(), {}).solid, 'reduce transparency: still glass, solid');
  } finally { globalThis.dispatchEvent = de; localStorage.removeItem(hv.SCREEN_LOOK_KEY); localStorage.removeItem(hv.REDUCE_KEY); }
});

test('style: <entity> re-styles the page when the entity changes (a rebuild, no reload); other state changes don\'t', () => {
  const h = makeHass({ extra: { 'input_select.look_test': { state: 'Glass' } } });
  const p = new hv.HomeViewPage();
  p.setConfig({ page: 'home', path: 'home', order: ['home'], options: { style: 'input_select.look_test' } });
  p.hass = h;
  assert.ok(p._root.classList.contains('glass'));
  let builds = 0; const rb = p.rebuild.bind(p); p.rebuild = () => { builds++; rb(); };
  const states = { ...h.states, 'light.kitchen_main': { ...h.states['light.kitchen_main'], state: 'on' } };
  p.hass = { ...h, states };
  assert.equal(builds, 0, 'another entity: no rebuild');
  p.hass = { ...h, states: { ...states, 'input_select.look_test': { ...states['input_select.look_test'], state: 'Classic' } } };
  assert.equal(builds, 1);
  assert.ok(!p._root.classList.contains('glass'), 'classic now');
  assert.doesNotMatch(p._root.getAttribute('style'), /--g-wall/);
});
