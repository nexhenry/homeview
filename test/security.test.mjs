// Values from a config, a shared page file or an entity never break out of the markup: colours are real
// colours (cssColor), pictures real picture addresses (safeUrl), words escaped. Each sink is drawn with
// hostile values and compared with a harmless one: the same elements and attributes, no handler, no
// script, no url() in a style. Valid colours still draw as before. Made-up home only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadHomeView, makeHass, El, win } from './harness.mjs';

const hv = await loadHomeView();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tileStub = () => ({ refresher() {}, shadowRoot: new El(), visible: true });
const draw = (h, spec) => { const r = hv.R[spec.kind]; r.key(h, spec); return r.html(h, spec, tileStub()); };

// hostile colours: an attribute breakout, CSS injection, an SVG breakout, a script, a URL
const BAD_COLORS = [
  'red" onmouseover="alert(1)', "red' onmouseover='alert(1)", 'red" style="background:url(//evil.example/x)',
  'red;background:url(javascript:alert(1))', 'red;background:url(//evil.example/x)', '</svg><img src=x onerror=alert(1)>',
  '"><script>alert(1)</script>', 'javascript:alert(1)', 'expression(alert(1))', 'url(//evil.example/x)',
  'var(--x);background:url(//evil.example/x)', 'var(--x, red)', 'rgb(1,2,3);background:url(//evil.example/x)', 'rgb(1,2,3)"', '#fff" onload="alert(1)',
  '#12345', 'red\n;background:url(//evil.example/x)', 'hsl(evil)', ' ', '', 42, { a: 1 }, ['red'],
];
const GOOD_COLORS = ['#4D7DB8', '#abc', '#abcd', '#aabbccdd', 'teal', 'RebeccaPurple', 'rgb(255, 0, 0)', 'rgba(255,0,0,.5)',
  'rgb(255 0 0 / 50%)', 'hsl(200deg 50% 40%)', 'hsla(200, 50%, 40%, 0.5)', 'hsl(-20 +50% 40%)', 'var(--my-colour)', 'var(--hv-accent)'];

/** Every tag the markup makes and its attributes, as a browser's HTML tokenizer reads them. */
function tagsOf(html) {
  const out = [];
  let i = html.indexOf('<');
  while (i !== -1) {
    const m = /^<(\/?)([a-zA-Z][^\s/>]*)/.exec(html.slice(i, i + 100));
    if (!m) { i = html.indexOf('<', i + 1); continue; }
    let j = i + m[0].length;
    const attrs = [];
    for (;;) {
      while (j < html.length && /[\s/]/.test(html[j])) j++;
      if (j >= html.length || html[j] === '>') break;
      let k = j + 1;
      while (k < html.length && !/[\s/>=]/.test(html[k])) k++;
      const name = html.slice(j, k).toLowerCase();
      j = k;
      while (j < html.length && /\s/.test(html[j])) j++;
      let value = '';
      if (html[j] === '=') {
        j++;
        while (j < html.length && /\s/.test(html[j])) j++;
        const q = html[j];
        if (q === '"' || q === "'") { const e = html.indexOf(q, j + 1); value = html.slice(j + 1, e < 0 ? html.length : e); j = e < 0 ? html.length : e + 1; }
        else { let e = j; while (e < html.length && !/[\s>]/.test(html[e])) e++; value = html.slice(j, e); j = e; }
      }
      attrs.push([name, value]);
    }
    out.push({ tag: (m[1] + m[2]).toLowerCase(), attrs });
    i = html.indexOf('<', j);
  }
  return out;
}
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
/** The markup's shape: its elements and their attribute names, in order (values left out). */
const shape = (html) => tagsOf(html).map((t) => `${t.tag}[${t.attrs.map((a) => a[0]).join(',')}]`).join(' ');
/** No handler, no script, no javascript: address, no url() / expression() in a style. */
function assertNoBreakout(html, what, { imgs = 0 } = {}) {
  const tags = tagsOf(html);
  for (const t of tags) {
    assert.ok(!['script', 'iframe', 'object', 'embed', 'base', 'meta', 'link', 'form'].includes(t.tag), `${what}: <${t.tag}> in ${html}`);
    for (const [n, v] of t.attrs) {
      assert.ok(!/^on/.test(n), `${what}: a handler attribute ${n} in ${html}`);
      assert.ok(/^[a-z][a-z0-9-]*$/.test(n), `${what}: an odd attribute name ${n}`);
      const val = unesc(v);
      if (n === 'style') assert.doesNotMatch(val, /url\(|expression\(|javascript:/i, `${what}: style="${val}"`);
      if (n === 'src' || n === 'href') assert.doesNotMatch(val.replace(/[\u0000-\u0020]/g, ''), /^(javascript|vbscript|data:text)/i, `${what}: ${n}="${val}"`);
    }
  }
  assert.ok(tags.filter((t) => t.tag === 'img').length <= imgs, `${what}: an <img> that isn't HomeView's in ${html}`);
}
/** A hostile colour fell back: it isn't anywhere in the markup, not even escaped. */
function assertColourGone(html, what) {
  assert.doesNotMatch(html, /alert\(|evil\.example|onmouseover|onerror|onload|javascript|expression|&lt;|&quot;|&#39;/i, `${what}: ${html}`);
}

// ---- the validators --------------------------------------------------------------------------------
test('cssColor: real colours pass as they are; anything else is the fallback', () => {
  for (const c of GOOD_COLORS) assert.equal(hv.cssColor(c, 'FB'), c, c);
  assert.equal(hv.cssColor('  teal ', 'FB'), 'teal', 'trimmed');
  for (const c of BAD_COLORS) assert.equal(hv.cssColor(c, 'FB'), 'FB', JSON.stringify(c));
  assert.equal(hv.cssColor('x'.repeat(101), 'FB'), 'FB', 'too long');
  assert.equal(hv.cssColor('bad'), 'bad', 'letters only: a colour name (the browser ignores one it doesn\'t know)');
  assert.equal(hv.cssColor('#zzz'), null, 'no fallback: null');
  // every colour HomeView passes itself (the room page's charts, the chips' defaults) is still a colour
  for (const c of Object.values(hv.KIND_TONES)) assert.equal(hv.cssColor(c), c);
});

test('toneColor: the colour code\'s words map as before; a CSS colour passes; anything else is null', () => {
  assert.equal(hv.toneColor('green'), hv.HV_TONES.ok);
  assert.equal(hv.toneColor('amber'), hv.HV_TONES.warn);
  assert.equal(hv.toneColor('red'), hv.HV_TONES.alert);
  assert.equal(hv.toneColor('orange'), hv.HV_TONES.on);
  assert.equal(hv.toneColor('blue'), hv.HV_TONES.cool);
  assert.equal(hv.toneColor('warn'), hv.HV_TONES.warn);
  assert.equal(hv.toneColor('teal'), 'teal');
  assert.equal(hv.toneColor('#123456'), '#123456');
  assert.equal(hv.toneColor(undefined), null);
  for (const c of BAD_COLORS) assert.equal(hv.toneColor(c), null, JSON.stringify(c));
  assert.equal(hv.toneColor('constructor'), 'constructor', 'a prototype\'s key is just a word, not Object');
  assert.equal(hv.hueOf('constructor', 200), 200);
  assert.equal(hv.hueOf('toString', 200), 200);
  assert.equal(hv.hueOf(NaN, 200), 200);
  assert.equal(hv.hueOf(Infinity, 200), 200);
  assert.equal(hv.hueOf(120, 200), 120);
  assert.equal(typeof hv.hueOf('teal', 200), 'number');
});

test('safeUrl: pictures from HA, /local/ and the web pass; javascript:, vbscript:, data:text/html don\'t', () => {
  for (const u of ['/local/people/alex.jpg', '/api/camera_proxy/camera.doorstep?token=x', 'local/a.jpg', 'https://example.com/a.png',
    'http://example.com/a.png', 'HTTPS://example.com/a.png', 'data:image/png;base64,iVBORw0KGgo=', 'blob:https://example.com/1', '//example.com/a.png']) {
    assert.equal(hv.safeUrl(u), u, u);
  }
  for (const u of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'java\tscript:alert(1)', 'java\nscript:alert(1)',
    '\u0001javascript:alert(1)', 'vbscript:msgbox(1)', 'data:text/html,<script>alert(1)</script>', 'data:,x', 'file:///etc/passwd', '', null, 42, {}]) {
    assert.equal(hv.safeUrl(u), null, JSON.stringify(u));
  }
});

// ---- 1. the chart tile (reported) -------------------------------------------------------------------
const CHART_ID = 'sensor.kitchen_temperature';
async function chartHass() {
  const now = Date.now() / 1000;
  const h = makeHass({ ws: (m) => (m.type === 'history/history_during_period'
    ? { [CHART_ID]: [{ s: '69', lu: now - 7200 }, { s: '72', lu: now - 3600 }] } : m.type === 'energy/get_prefs' ? { energy_sources: [], device_consumption: [] } : null) });
  draw(h, { kind: 'chart', entity: CHART_ID, title: 'Temperature' });   // the history arrives (cached), then the line is drawn
  await sleep(5);
  return h;
}
test('chart tile: a hostile color: never leaves its four style attributes; it falls back to the page\'s accent', async () => {
  const h = await chartHass();
  const m = hv.buildModel(h, {});
  const base = draw(h, hv.userTile({ type: 'chart', entity: CHART_ID, title: 'Temperature', color: 'red' }, h, m));
  assert.equal((base.match(/(?:color|fill|stroke):red\b/g) || []).length, 4, 'the line, its fill, the title and the icon');
  for (const c of BAD_COLORS) {
    // through a page file: the tile as userTile makes it from { type: chart, color: … }
    const html = draw(h, hv.userTile({ type: 'chart', entity: CHART_ID, title: 'Temperature', color: c }, h, m));
    const what = `chart color ${JSON.stringify(c)}`;
    assertNoBreakout(html, what);
    assertColourGone(html, what);
    assert.equal(shape(html), shape(base), `${what}: the same elements and attributes`);
    assert.equal((html.match(/(?:color|fill|stroke):var\(--hv-accent\)/g) || []).length, 4, `${what}: the accent instead`);
  }
});

test('chart tile: valid colours draw as before (hex, names, rgb(), hsl(), var(--x)); no color: the accent', async () => {
  const h = await chartHass();
  for (const c of GOOD_COLORS) {
    const html = draw(h, { kind: 'chart', entity: CHART_ID, title: 'Temperature', color: c, size: [2, 1] });
    assert.equal(html.split(`color:${c}`).length - 1, 2, `${c}: the title and the icon`);
    assert.ok(html.includes(`fill:${c};opacity:.14`) && html.includes(`stroke:${c};stroke-width:2`), `${c}: the area and the line`);
  }
  const none = draw(h, { kind: 'chart', entity: CHART_ID, title: 'Temperature' });
  assert.equal((none.match(/(?:color|fill|stroke):var\(--hv-accent\)/g) || []).length, 4);
  // the room page's charts (KIND_TONES) are unchanged
  const room = draw(h, { kind: 'chart', entity: CHART_ID, title: 'Temperature', color: hv.KIND_TONES.temperature });
  assert.equal(room.split(`:${hv.KIND_TONES.temperature}`).length - 1, 4);
});

// ---- 2. the screensaver's clock (reported) ------------------------------------------------------------
function clockWith(color) {
  const ss = hv.hvScreensaver;
  const appended = []; const ap = document.body.appendChild; document.body.appendChild = (e) => { appended.push(e); return e; };
  try {
    const opts = { screensaver: color === undefined ? true : { color } };
    ss.update({ isConnected: true, _config: { page: 'home', path: 'home', order: ['home'], options: opts }, _interacting: () => false, _editing: false });
    ss._idleFor(200e3); ss._tick();
    assert.equal(appended.length, 1, 'the clock is shown');
    return appended[0].innerHTML;
  } finally { ss.update(null); document.body.appendChild = ap; }
}
test('screensaver: a hostile color: never leaves the SVG\'s fill attributes; it falls back to the default blue', () => {
  const base = clockWith('#4D7DB8');
  assert.equal((base.match(/fill="#4D7DB8"/g) || []).length, 2, 'the face and the hands\' centre');
  assert.equal(clockWith(undefined).match(/fill="#4D7DB8"/g).length, 2, 'no color: the default');
  for (const c of BAD_COLORS) {
    const svg = clockWith(c), what = `screensaver color ${JSON.stringify(c)}`;
    assertNoBreakout(svg, what);
    assertColourGone(svg, what);
    assert.equal(shape(svg), shape(base), `${what}: the same SVG`);
    assert.equal((svg.match(/fill="#4D7DB8"/g) || []).length, 2, `${what}: the default instead`);
  }
  for (const c of GOOD_COLORS) {
    const svg = clockWith(c);
    assert.equal(svg.split(`fill="${c}"`).length - 1, 2, c);
    assert.equal(shape(svg), shape(base), `${c}: the same SVG`);
  }
});

// ---- 3. every other colour a page file or config sets: buttons, faders, pills, entity tiles, chips ----------
const ctlHass = () => makeHass({ extra: {
  'input_number.volume': { state: '40', attributes: { min: 0, max: 100, unit_of_measurement: '%' } },
  'input_boolean.party': { state: 'on' },
} });
test('buttons, faders, pill tiles and entity tiles (color, color_on, color_off): a hostile colour falls back', () => {
  const h = ctlHass(), m = hv.buildModel(h, {});
  const defs = [
    (c) => ({ type: 'button', name: 'Party', toggle: 'input_boolean.party', color: c }),
    (c) => ({ type: 'button', name: 'Party', toggle: 'input_boolean.party', color: c, pillish: true }),
    (c) => ({ type: 'fader', entity: 'input_number.volume', name: 'Volume', color: c }),
    (c) => ({ entity: 'switch.pump_a', color: c, pillish: true }),
    (c) => ({ entity: 'sensor.kitchen_temperature', color: c, pillish: true }),
    (c) => ({ entity: 'light.kitchen_main', color_on: c }),
    (c) => ({ entity: 'light.kitchen_light', color_off: c }),
  ];
  for (const def of defs) {
    const tile = (c) => { const t = hv.userTile(def(c), h, m); if (def(c).pillish) t.pillish = true; return draw(h, t); };
    const base = tile('teal');
    assert.match(base, /teal/, `${JSON.stringify(def('teal'))}: the colour shows`);
    const none = tile(undefined);
    for (const c of BAD_COLORS) {
      const html = tile(c), what = `${JSON.stringify(def(c))}`;
      assertNoBreakout(html, what);
      assertColourGone(html, what);
      assert.equal(html, none, `${what}: drawn as without a colour`);
    }
    for (const c of GOOD_COLORS) assert.ok(tile(c).includes(c), `${JSON.stringify(def(c))}`);
  }
  // the colour code's words still work
  assert.match(draw(h, hv.userTile({ type: 'button', name: 'Party', toggle: 'input_boolean.party', color: 'green' }, h, m)), /--hv-ic-on:#34C759/);
  assert.match(draw(h, hv.userTile({ entity: 'light.kitchen_main', color_on: 'red' }, h, m)), /--hv-ic-on:#FF3B30/);
});

test('an entity\'s own attributes: a light\'s rgb_color is read as numbers, its unit is escaped', () => {
  const bad = ['1" onmouseover="alert(1)', 0, 0];
  const h = makeHass({ extra: {
    'light.desk': { state: 'on', attributes: { rgb_color: bad } },
    'light.lamp': { state: 'on', attributes: { rgb_color: [255, 80.4, '0'] } },
    'input_number.volume': { state: '40', attributes: { min: 0, max: 100, unit_of_measurement: '<img src=x onerror=alert(1)>' } },
  } });
  assert.equal(hv.activeColor(h.states['light.desk']), hv.HV_TONES.on, 'not a colour: the "on" colour');
  assert.equal(hv.activeColor(h.states['light.lamp']), 'rgb(255,80,0)');
  for (const spec of [{ kind: 'entity', entity: 'light.desk' }, { kind: 'entity', entity: 'light.desk', pillish: true }]) {
    const html = draw(h, spec);
    assertNoBreakout(html, JSON.stringify(spec));
    assertColourGone(html, JSON.stringify(spec));
  }
  const fader = draw(h, { kind: 'fader', entity: 'input_number.volume' });
  assertNoBreakout(fader, 'fader unit');
  assert.match(fader, /40&lt;img src=x onerror=alert\(1\)&gt;/, 'the unit as text');
});

test('home.chips[].color: a hostile colour is the chip\'s default; security / light / climate and CSS colours as before', () => {
  const h = makeHass({ extra: { 'input_boolean.auto_lights': { state: 'on' } } });
  assert.equal(hv.chipLook(h, { entity: 'input_boolean.auto_lights', color: 'light' }).color, hv.HV_TONES.on);
  assert.equal(hv.chipLook(h, { entity: 'input_boolean.auto_lights', color: 'teal' }).color, 'teal');
  assert.equal(hv.chipLook(h, { entity: 'input_boolean.auto_lights' }).color, hv.HV_TONES.ok);
  assert.equal(hv.chipLook(h, { entity: 'input_boolean.auto_lights', color: 'constructor' }).color, 'constructor');
  const head = (c) => {
    const p = new hv.HomeViewPage();
    p.setConfig({ page: 'home', path: 'home', order: ['home'], nav: [], options: { home: { chips: [{ entity: 'input_boolean.auto_lights', color: c }] } } });
    p.hass = h;
    return p._head.innerHTML;
  };
  const none = head(undefined);
  assert.match(none, /class="chp on"[^>]*style="color:#34C759"/);
  for (const c of BAD_COLORS) {
    const html = head(c), what = `chip color ${JSON.stringify(c)}`;
    assertNoBreakout(html, what, { imgs: 4 });
    assertColourGone(html, what);
    assert.equal(html, none, `${what}: as without a colour`);
  }
  assert.match(head('rgb(1, 2, 3)'), /style="color:rgb\(1, 2, 3\)"/);
});

// ---- 4. words from a page file: a calendar tile's days -------------------------------------------------
test('next_event / agenda days: written into the tile\'s words escaped', async () => {
  const warn = console.warn; console.warn = () => {};   // the made-up fetch fails on days that aren't a number
  try {
    const h = makeHass(), m = hv.buildModel(h, {});
    const days = '<img src=x onerror=alert(1)>';
    const next = hv.userTile({ type: 'next_event', calendars: ['calendar.shared'], days }, h, m);
    const agenda = hv.userTile({ type: 'agenda', calendars: ['calendar.shared'], days }, h, m);
    draw(h, next); draw(h, agenda);
    await sleep(5);
    for (const [what, spec] of [['next_event', next], ['agenda', agenda]]) {
      const html = draw(h, spec);
      assertNoBreakout(html, what);
      assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/, `${what}: shown as text`);
    }
  } finally { console.warn = warn; }
});

// ---- 5. pictures and addresses ----------------------------------------------------------------------------
test('avatars and camera stills: a javascript: picture is never used (initials / no still instead)', () => {
  const h = makeHass({ extra: {
    'person.alex': { state: 'home', attributes: { friendly_name: 'Alex', entity_picture: 'javascript:alert(1)', device_trackers: ['device_tracker.alex_phone'], user_id: 'u-alex' } },
    'person.zoe': { state: 'not_home', attributes: { friendly_name: 'Zoe', entity_picture: '/local/people/zoe.jpg', device_trackers: ['device_tracker.zoe_phone'], user_id: 'u-zoe' } },
  } });
  const page = (avatars) => {
    const p = new hv.HomeViewPage();
    p.setConfig({ page: 'home', path: 'home', order: ['home'], nav: [], options: { avatars } });
    p.hass = h;
    return p;
  };
  // an entity's picture that isn't one: the sample avatar instead (an https address); a picture that is one: as is
  let p = page(undefined);
  assert.match(hv.avatarUrl(h, 'person.alex'), /^https:\/\/api\.dicebear\.com\//);
  assert.equal(hv.avatarUrl(h, 'person.zoe'), '/local/people/zoe.jpg');
  assertNoBreakout(p._head.innerHTML, 'people chips', { imgs: 2 });
  assert.doesNotMatch(p._head.innerHTML, /javascript/i);
  // a config's picture that isn't one: initials
  const h2 = makeHass();
  p = page({ 'person.alex': 'javascript:alert(1)', 'person.zoe': '/local/people/zoe.jpg' });
  p.hass = h2;
  assert.equal(hv.avatarUrl(h2, 'person.alex'), null);
  assert.equal(hv.avatarUrl(h2, 'person.zoe'), '/local/people/zoe.jpg');
  assert.match(draw(h2, { kind: 'person', entity: 'person.alex' }), /<span[^>]*>A<\/span>/, 'initials');

  // a camera whose picture isn't an address: no still is fetched
  const made = [];
  class Img { constructor() { this.style = {}; made.push(this); } set src(v) { this._src = v; } get src() { return this._src; } }
  const img0 = globalThis.Image; globalThis.Image = Img;
  try {
    const cam = makeHass({ extra: { 'camera.sample_cam': { state: 'idle', attributes: { entity_picture: 'javascript:alert(1)' } } } });
    const tile = { shadowRoot: { querySelector: () => ({ style: {} }) }, visible: true, isConnected: true, _camAt: Date.now() };
    hv.R.camera.update(cam, { kind: 'camera', entity: 'camera.sample_cam' }, tile);
    assert.equal(made.length, 0);
    const ok = makeHass({ extra: { 'camera.sample_cam': { state: 'idle', attributes: { entity_picture: '/api/camera_proxy/camera.sample_cam?token=x' } } } });
    hv.R.camera.update(ok, { kind: 'camera', entity: 'camera.sample_cam' }, tile);
    assert.equal(made.length, 1);
    assert.match(made[0].src, /^\/api\/camera_proxy\/camera\.sample_cam\?token=x&_t=\d+$/);
  } finally { globalThis.Image = img0; }
});

test('the offer opens only a dashboard address: never another host or a javascript: URL', async () => {
  const pushed = history.pushed.length;
  const loc = globalThis.location;
  let assigned = null;
  globalThis.location = { ...loc, assign: (u) => { assigned = u; } };
  try {
    for (const u of ['/evil.example', '//evil.example', 'javascript:alert(1)', '../x', 'a b', '', null]) {
      const t0 = Date.now();
      await hv.offerOpen(u);
      assert.ok(Date.now() - t0 < 100, `${JSON.stringify(u)}: refused at once`);
    }
    assert.equal(assigned, null);
    assert.equal(history.pushed.length, pushed);
  } finally { globalThis.location = loc; }
});

// ---- 6. a whole shared page file, every tile type with every text and colour key hostile -------------------
test('a hostile page file: no tile of any type breaks out of its markup', async () => {
  const h = await chartHass();
  const m = hv.buildModel(h, {});
  const X = '"><img src=x onerror=alert(1)>';
  const C = 'red" onmouseover="alert(1)';
  const tiles = [
    { type: 'chart', entity: CHART_ID, title: X, icon: X, color: C, decimals: 1 },
    { type: 'button', name: X, name_off: X, icon: X, icon_off: X, color: C, toggle: 'input_boolean.nothing' },
    { type: 'fader', entity: 'input_number.nothing', name: X, icon: X, color: C },
    { type: 'next_event', calendars: ['calendar.shared'], title: X, icon: X },
    { type: 'agenda', calendars: ['calendar.shared'], title: X, icon: X, layout: 'list', weekday_word: X, event_icon: X, long_icon: X },
    { type: 'person', entity: 'person.alex' }, { type: 'camera', entity: 'camera.doorstep', name: X },
    { type: 'weather', entity: 'weather.home' }, { type: 'forecast', entity: 'weather.home' }, { type: 'clock' }, { type: 'date' },
    { type: 'air', entity: 'sensor.kitchen_temperature', roomName: X },
    { type: 'energy_share', name: X, numerator: 'sensor.a', denominator: 'sensor.b', caption: X, empty_text: X, severity: { green: 0 } },
    { type: 'energy_now', power: { home: 'sensor.pump_a_power' } }, { type: 'energy_flow', power: { home: 'sensor.pump_a_power' } },
    { entity: 'switch.pump_a', name: X, name_off: X, icon: X, icon_on: X, icon_off: X, color_on: C, color_off: C, color: C, unit: X, format: X },
    { entity: 'light.kitchen_main', name: X, color_on: C }, { entity: 'sensor.kitchen_temperature', name: X, attribute: 'friendly_name' },
  ];
  const secs = hv.userSections([{ title: X, icon: X, color: C, tiles }, { title: X, layout: 'pills', tiles: tiles.slice(-3) }], h, m);
  let n = 0;
  for (const sec of secs) {
    for (const t of sec.tiles) {
      if (sec.layout === 'pills') t.pillish = true;
      let html;
      try { html = draw(h, t); } catch (e) { continue; }   // a tile that can't draw shows HomeView's placeholder (escaped)
      n++;
      assertNoBreakout(html, `${t.kind} ${JSON.stringify(t).slice(0, 80)}`, { imgs: t.kind === 'person' || t.kind === 'camera' ? 1 : 0 });
      assert.doesNotMatch(html, /onmouseover|<img src=x/, `${t.kind}: ${html}`);
    }
  }
  assert.ok(n >= 18, `tiles drawn: ${n}`);
  assert.equal(secs[0].hue, undefined, 'a section colour that isn\'t a name or hue: no tint');
});
