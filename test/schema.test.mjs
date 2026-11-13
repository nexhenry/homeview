// schema/options.json against the code and the docs: a new option (or a new key in a block) without a
// row in the schema fails here, and so do docs that weren't regenerated (scripts/gen-docs.sh).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadHomeView, makeHass } from './harness.mjs';
import { ROOT, loadSchema, option, nodeAt, keyOf, keysNode, itemOf, shown, isObj, validateConfig, todos } from '../scripts/schema.mjs';
import { generate } from '../scripts/gen-docs.mjs';

const DIST = join(ROOT, 'dist', 'homeview.js');
const SRC = readFileSync(DIST, 'utf8');
const schema = loadSchema();

// the lists in dist/homeview.js that name keys or words, and the schema rows that must say the same
const CODE_LISTS = ['SECTION_KEYS', 'CUSTOMIZE_KEYS', 'WHEN_KEYS', 'WHEN_TYPES', 'MATCH_KEYS', 'CONFIRM_KEYS', 'TIME_FORMATS',
  'SECTION_LAYOUTS', 'USER_TILE_TYPES', 'ALERT_RULES', 'DEFAULT_PILLS', 'DEFAULT_PAGES'];
// dist/homeview.js once more, with the names this file needs exported (the harness installs the stubs)
let more = null;
async function hv() {
  if (more) return more;
  await loadHomeView();
  const file = join(mkdtempSync(join(tmpdir(), 'homeview-schema-')), 'homeview.mjs');
  // the code's own word lists: undefined (not a load error) when one is renamed, so the test can say which
  const lists = CODE_LISTS.map((n) => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ');
  writeFileSync(file, `${SRC}\nexport { KNOWN_OPTIONS, EDITOR_DEFAULTS, editorSchema, HomeViewStrategy, customPages, userSections, oddTiles, buildModel };\nexport const CODE = { ${lists} };\n`);
  const info = console.info; console.info = () => {};
  try { more = await import(pathToFileURL(file).href); } finally { console.info = info; }
  return more;
}

// every node of the schema, with its path
function* nodes() {
  function* walk(n, path) {
    yield [n, path];
    for (const k of n.keys || []) yield* walk(k, `${path}.${k.name}`);
    if (n.entry) yield* walk(n.entry, `${path}.${n.entry.name}`);
    if (n.item && !n.item.ref) yield* walk(n.item, `${path}[]`);
  }
  for (const o of schema.options) yield* walk(o, o.name);
  for (const [id, d] of Object.entries(schema.defs)) for (const k of d.keys) yield* walk(k, `def:${id}.${k.name}`);
}

test('schema: every row is complete, names are unique, refs resolve', () => {
  const groups = new Set(schema.groups.map((g) => g.id));
  const problems = [];
  for (const o of schema.options) if (!groups.has(o.group)) problems.push(`${o.name}: unknown group ${o.group}`);
  for (const [n, path] of nodes()) {
    if (n.alias_of) continue;
    if (!n.name && !path.endsWith('[]')) problems.push(`${path}: no name`);
    if (n.todo) continue;
    if (n.name && !n.name.startsWith('<') && !path.endsWith('[]')) {
      for (const f of ['type', 'since', 'description']) if (!n[f]) problems.push(`${path}: no ${f}`);
    }
    if (n.item) try { itemOf(schema, n); } catch (e) { problems.push(`${path}: ${e.message}`); }
    if (n.keys_ref) try { keysNode(schema, n); } catch (e) { problems.push(`${path}: ${e.message}`); }
    const names = (n.keys || []).map((k) => k.name);
    const dup = names.filter((x, i) => names.indexOf(x) !== i);
    if (dup.length) problems.push(`${path}: ${dup.join(', ')} twice`);
    for (const k of (n.keys || []).filter((x) => x.alias_of)) if (!keyOf(n, k.alias_of)) problems.push(`${path}.${k.name}: alias of a missing key`);
  }
  const top = schema.options.map((o) => o.name);
  const dup = top.filter((x, i) => top.indexOf(x) !== i);
  if (dup.length) problems.push(`options twice: ${dup.join(', ')}`);
  assert.deepEqual(problems, []);
});

test('schema: the top-level options are exactly KNOWN_OPTIONS', async () => {
  const { KNOWN_OPTIONS } = await hv();
  const rows = new Map(schema.options.map((o) => [o.name, o]));
  const problems = [];
  for (const k of KNOWN_OPTIONS) {
    const r = rows.get(k);
    if (!r) problems.push(`${k}: in KNOWN_OPTIONS (dist/homeview.js) but not in schema/options.json — add a row`);
    else if (r.todo) problems.push(`${k}: the code knows it now — fill its TODO row in schema/options.json (${r.todo})`);
  }
  for (const r of schema.options) if (!r.todo && !KNOWN_OPTIONS.includes(r.name)) problems.push(`${r.name}: in the schema but not in KNOWN_OPTIONS`);
  assert.deepEqual(problems, []);
});

// the keys the code reads inside a block: a key it reads that the schema doesn't have fails, so a new
// nested option gets its row. Each scan names a stretch of dist/homeview.js and the variable it reads.
function region(start, end) {
  const i = SRC.search(start);
  if (i < 0) return null;
  const rest = SRC.slice(i), j = rest.slice(1).search(end);
  return j < 0 ? rest : rest.slice(0, j + 1);
}
const SCANS = [
  { path: 'energy', text: SRC, re: /\bec\??\.([a-z_]+)/g },
  { path: 'widgets', text: SRC, re: /\bwc\??\.([a-z_]+)/g },
  { path: 'home', text: region(/^ {2}home\(h, m, cfg\) \{$/m, /^ {2}\},?$/m), re: /\bpc\??\.([a-z_]+)/g },
  { path: 'customize.<>', text: SRC, re: /\bcz\??\.([a-z_]+)/g },
  { path: 'rooms.<>', text: SRC, re: /\brc\??\.([a-z_]+)|roomCfg\[[^\]]+\]\??\.([a-z_]+)|\brooms\?\.\[[^\]]+\]\??\.([a-z_]+)/g },
  { path: 'pages_config.<>', text: SRC, re: /pages_config\?\.\[[^\]]+\]\??\.([a-z_]+)|\bpageCfg\??\.([a-z_]+)|\bpcp\??\.([a-z_]+)|\bpc\[(?:p|c\.path)\]\??\.([a-z_]+)/g },
  { path: 'energy.outage', text: region(/^function outageOpts\(/m, /^}/m), re: /\bx\??\.([a-z_]+)/g },
  { path: 'energy.grid_status', text: region(/^function gridState\(/m, /^}/m), re: /\bspec\??\.([a-z_]+)/g },
  { path: 'energy.windows[]', text: region(/^R\.energy_window = \{/m, /const spans = /), re: /\bw\??\.([a-z_]+)|\bx\??\.([a-z_]+)/g },
  { path: 'screensaver', text: region(/const obj = opt && typeof opt === 'object'/, /enabled = on;/), re: /\bobj\??\.([a-z_]+)/g },
  { path: 'start', text: region(/^function startPage\(/m, /^}/m), re: /\bo\??\.([a-z_]+)/g },
  { path: 'night', text: region(/^function isNight\(/m, /^}/m), re: /\bn\??\.([a-z_]+)/g },
  { path: 'font', text: region(/^function fontStack\(/m, /^}/m), re: /\bd\??\.([a-z_]+)/g },
  { path: 'comfort', text: region(/^function comfortBand\(/m, /^}/m), re: /\bC\.mode\??\.([a-z_]+)/g },
  { path: 'comfort_limits', text: region(/^function comfortLimits\(/m, /^}/m), re: /\bv\('([a-z_]+)'|\bL\??\.([a-z_]+)/g },
  { path: 'members[]', text: region(/model\.members = \[\];/, /^ {2}\/\/ comfort:/m), re: /\bc\??\.([a-z_]+)|\bx\?\.([a-z_]+)/g },
  { path: 'pills[]', text: region(/^function entityPill\(/m, /^}/m), re: /\bd\??\.([a-z_]+)/g, ignore: ['alerts', 'page'] },   // a page's own pill (internal)
  { path: 'home.chips[]', text: region(/^function chipLook\(/m, /^\/\*\* The first element/m), re: /\bc\??\.([a-z_]+)/g },
  { path: 'def:section', text: region(/^const userSections = /m, /^\}\)\);$/m), re: /\bsec\??\.([a-z_]+)/g },
  { path: 'def:tile', text: region(/^function userTile\(/m, /^const VAR_RE/m), re: /\bdef\??\.([a-z_]+)/g },
  { path: 'def:page', text: region(/^ {2}custom\(h, m, cfg, opts\) \{$/m, /^ {2}\},?$/m), re: /\bd\??\.([a-z_]+)/g },
  { path: 'def:page', text: SRC, re: /\bcustom\?\.([a-z_]+)|\bc\.(admin_only|subview|pill)\b/g },
  { path: 'def:alert', text: region(/^function pageAlerts\(/m, /^}/m), re: /\ba\??\.([a-z_]+)/g },
];

test('schema: every key the code reads inside a block has a row', () => {
  const problems = [];
  for (const s of SCANS) {
    if (!s.text) { problems.push(`${s.path}: the scan's stretch of dist/homeview.js wasn't found — the code moved; update SCANS in test/schema.test.mjs`); continue; }
    const found = new Set();
    for (const m of s.text.matchAll(s.re)) for (const g of m.slice(1)) if (g && !(s.ignore || []).includes(g)) found.add(g);
    if (!found.size) { problems.push(`${s.path}: the scan found no keys — update SCANS in test/schema.test.mjs`); continue; }
    const node = nodeAt(schema, s.path);
    for (const k of found) {
      const row = keyOf(node, k);
      if (!row) problems.push(`${s.path}.${k}: dist/homeview.js reads it, schema/options.json has no row — add one`);
      else if (row.todo) problems.push(`${s.path}.${k}: the code reads it now — fill its TODO row (${row.todo})`);
    }
  }
  assert.deepEqual(problems, []);
});

test('schema: the key and word lists in the code are the schema\'s rows', async () => {
  const { CODE } = await hv();
  const keys = (path) => (nodeAt(schema, path).keys || []).filter(shown).map((k) => k.name);
  const values = (path) => nodeAt(schema, path).values || [];
  const same = (a, b) => JSON.stringify([...new Set(a)].sort()) === JSON.stringify([...new Set(b)].sort());
  const want = [
    ['SECTION_KEYS', () => keys('def:section'), 'the keys of def:section'],
    ['CUSTOMIZE_KEYS', () => keys('customize.<>'), 'the keys of customize.<entity>'],
    ['WHEN_KEYS', () => keys('def:condition'), 'the keys of def:condition'],
    ['WHEN_TYPES', () => values('def:condition.condition'), 'def:condition.condition values'],
    ['MATCH_KEYS', () => keys('def:filter'), 'the keys of def:filter'],
    ['CONFIRM_KEYS', () => keys('def:confirm'), 'the keys of def:confirm'],
    ['TIME_FORMATS', () => values('def:tile.format'), 'def:tile.format values'],
    ['TIME_FORMATS', () => values('pills[].format'), 'pills[].format values'],
    ['SECTION_LAYOUTS', () => values('def:section.layout'), 'def:section.layout values'],
    ['USER_TILE_TYPES', () => values('def:tile.type').filter((t) => !['entity', 'room'].includes(t)), 'def:tile.type values (but entity, room)'],
    ['DEFAULT_PILLS', () => nodeAt(schema, 'pills').default, 'the default of pills'],
    ['DEFAULT_PAGES', () => nodeAt(schema, 'pages').default, 'the default of pages'],
  ];
  const problems = [];
  for (const [name, get, what] of want) {
    const code = CODE[name];
    if (!Array.isArray(code)) { problems.push(`${name}: not found in dist/homeview.js — renamed? update CODE_LISTS in test/schema.test.mjs`); continue; }
    if (!same(code, get())) problems.push(`${name} [${code.join(', ')}] ≠ ${what} [${get().join(', ')}] in schema/options.json`);
  }
  // every alert rule the code checks is a key of def:alert
  for (const r of CODE.ALERT_RULES || []) if (!keyOf(nodeAt(schema, 'def:alert'), r)) problems.push(`ALERT_RULES: ${r} has no row in def:alert`);
  assert.deepEqual(problems, []);
});

test('schema: the defaults agree with the settings editor (EDITOR_DEFAULTS)', async () => {
  const { EDITOR_DEFAULTS } = await hv();
  const problems = [];
  const walk = (obj, path) => {
    for (const [k, v] of Object.entries(obj)) {
      const p = path ? `${path}.${k}` : k;
      if (isObj(v)) { walk(v, p); continue; }
      let row = null;
      try { row = nodeAt(schema, p); } catch (e) { problems.push(`${p}: in EDITOR_DEFAULTS, not in the schema`); continue; }
      if (JSON.stringify(row.default) !== JSON.stringify(v)) problems.push(`${p}: editor default ${JSON.stringify(v)}, schema ${JSON.stringify(row.default)}`);
    }
  };
  walk(EDITOR_DEFAULTS, '');
  assert.deepEqual(problems, []);
});

test('schema: the settings editor\'s fields are the rows marked editor: true', async () => {
  const { editorSchema } = await hv();
  const fields = new Set();
  const walk = (list, path) => {
    for (const f of list) {
      const p = f.name ? (path ? `${path}.${f.name}` : f.name) : path;
      if (f.schema) walk(f.schema, f.flatten ? path : p.replace(/^rooms\.[^.]+$/, 'rooms.<>'));
      else fields.add(p);
    }
  };
  walk(editorSchema({ areas: { kitchen: { area_id: 'kitchen', name: 'Kitchen' } }, states: {} }), '');
  const marked = new Set();
  for (const [n, path] of nodes()) {
    if (n.editor && !n.todo) marked.add(path.replace(/\.<area>/, '.<>'));
  }
  const missing = [...fields].filter((p) => { try { return !nodeAt(schema, p).editor; } catch (e) { return true; } });
  // a block (rooms, home, energy) is marked when the editor has a part of it
  const extra = [...marked].filter((p) => !fields.has(p) && ![...fields].some((f) => f.startsWith(`${p}.`)));
  assert.deepEqual({ missing, extra }, { missing: [], extra: [] });
});

test('schema: docs are generated from it (run scripts/gen-docs.sh after a change)', () => {
  const want = generate(schema);
  for (const [f, text] of Object.entries(want)) {
    assert.ok(readFileSync(join(ROOT, f), 'utf8') === text, `${f} is out of date: run scripts/gen-docs.sh`);
  }
});

test('schema: every since is a released version or unreleased (none left once the CHANGELOG has no Unreleased)', () => {
  const log = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8');
  const versions = new Set([...log.matchAll(/^## (\d+\.\d+\.\d+)\b/gm)].map((m) => m[1]));
  const hasUnreleased = /^## Unreleased\b/m.test(log);
  const problems = [];
  for (const [n, path] of nodes()) {
    if (!n.since) continue;
    if (n.since === 'unreleased') { if (!hasUnreleased) problems.push(`${path}: since "unreleased" — run scripts/gen-docs.sh --stamp <version>`); }
    else if (!versions.has(n.since)) problems.push(`${path}: since ${n.since} isn't a version in CHANGELOG.md`);
  }
  assert.deepEqual(problems, []);
});

test('examples/full.yaml\'s values fit the schema and build a dashboard', async () => {
  const cfg = Object.fromEntries(schema.options.filter((o) => shown(o) && !o.internal).map((o) => [o.name, exampleOf(o)]).filter(([, v]) => v !== undefined));
  assert.deepEqual(validateConfig(schema, cfg), []);
  const { HomeViewStrategy, customPages, userSections, oddTiles, buildModel, KNOWN_OPTIONS } = await hv();
  assert.deepEqual(Object.keys(cfg).filter((k) => !KNOWN_OPTIONS.includes(k)), []);
  // an admin without an access rule (the example limits Alex, so Alex wouldn't get the admin_only page)
  const hass = makeHass({ user: 'u-sam', name: 'Sam' });
  const dash = await HomeViewStrategy.generate({ ...cfg }, hass);
  const paths = dash.views.map((v) => v.path);
  for (const p of ['widgets', 'home', 'living', 'admin']) assert.ok(paths.includes(p), `no ${p} view: ${paths.join(', ')}`);
  const m = buildModel(hass, cfg);
  for (const page of customPages(cfg)) {
    assert.ok(!page.bad);
    assert.deepEqual(oddTiles(page.sections, m), []);
    assert.ok(Array.isArray(userSections(page.sections, hass, m)));
  }
});
function exampleOf(n) {
  if (n.example !== undefined) return n.example;
  if (!n.keys) return undefined;
  const o = Object.fromEntries(n.keys.filter(shown).map((k) => [k.name, exampleOf(k)]).filter(([, v]) => v !== undefined));
  return Object.keys(o).length ? o : undefined;
}

test('the validator finds typos at any depth (what a config report would list)', () => {
  const issues = validateConfig(schema, {
    titel: 'x',                                            // a top-level typo
    home: { favourites: [], max_scenes: 'eight' },         // a nested typo, a wrong kind
    rooms: { kitchen: { colour: 'green' } },               // a typo inside a map entry
    theme: 'dusk',                                         // not one of its words
    warnings: [{ text: 'x', not_on: 'switch.demo_plug', levle: 'notice' }],
    custom_pages: [{ path: 'p', sections: [{ tiles: [{ entity: 'light.demo_lamp', szie: '2x1' }] }] }],
    comfort_limits: { too_hot: 85 },                       // an alias is fine
    energy: { outage: false, grid_status: { entity: 'sensor.demo_grid', up: ['Active'] } },
  }).map((x) => x.path);
  assert.deepEqual(issues.sort(), ['custom_pages[0].sections[0].tiles[0].szie', 'home.favourites', 'home.max_scenes', 'rooms.kitchen.colour',
    'theme', 'titel', 'warnings[0].levle'].sort());
  // and inside the newer shapes: a condition, a filter, a confirm, a section's defaults
  const deep = validateConfig(schema, {
    exclude_entities: ['sensor.*_linkquality', { lable: 'x' }],
    customize: { 'lock.demo_door': { confirm: { only: 'turn_on', txt: 'Unlock?' } } },
    custom_pages: [{ path: 'p', sections: [{ show_when: { entity: 'binary_sensor.demo', sate: 'on' },
      defaults: { type: 'button', acton: 'script.demo' }, tiles: [{ match: { domain: 'light', aera: 'kitchen' } }] }] }],
  }).map((x) => x.path);
  assert.deepEqual(deep.sort(), ['custom_pages[0].sections[0].defaults.acton', 'custom_pages[0].sections[0].show_when.sate',
    'custom_pages[0].sections[0].tiles[0].match.aera', 'customize.lock.demo_door.confirm.txt', 'exclude_entities[1].lable'].sort());
});

test('TODO rows are listed (they wait for a branch; the docs leave them out)', () => {
  const list = todos(schema);
  assert.ok(list.every((t) => typeof t === 'string'));
  for (const [n, path] of nodes()) if (n.todo) assert.ok(list.some((t) => t.startsWith(path)), path);
  // guest: was a TODO row until hv-ux merged; now a real row with its keys
  assert.equal(option(schema, 'guest')?.todo, undefined);
  assert.deepEqual(option(schema, 'guest').keys.map((k) => k.name), ['entity', 'screens', 'hide', 'slideshow']);
});
