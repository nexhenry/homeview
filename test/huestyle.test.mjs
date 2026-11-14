// 0.9.1 proposal: a tile's / section's tint is made once per hue and leaves out the text shades,
// which are the same for every hue and come from the page (perf pass 2026-11-13: Living's first
// visit built ~50 variables per room tile).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadHomeView } from './harness.mjs';

await loadHomeView();
const here = dirname(fileURLToPath(import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'homeview-hue-'));
writeFileSync(join(dir, 'hv.mjs'), `${readFileSync(join(here, '..', 'dist', 'homeview.js'), 'utf8')}\nexport { hueStyle, palette, nightPalette, styleVars, textTones };\n`);
const info = console.info; console.info = () => {};
const hv = await import(pathToFileURL(join(dir, 'hv.mjs')).href);
console.info = info;
const vars = (s) => Object.fromEntries(s.split(';').map((d) => [d.slice(0, d.indexOf(':')), d.slice(d.indexOf(':') + 1)]));

test('a tile\'s tint: the page palette for its hue without the text shades, the same string every time', () => {
  for (const dark of [false, true]) {
    const s = hv.hueStyle(210, dark);
    assert.equal(hv.hueStyle(210, dark), s, 'made once per hue');
    const got = vars(s), full = hv.palette(210, dark);
    for (const k of Object.keys(hv.textTones(dark))) assert.ok(!(k in got), `${k} comes from the page, not each tile`);
    for (const [k, v] of Object.entries(full)) if (!(k in hv.textTones(dark))) assert.equal(got[k], v, k);
    assert.ok(Object.keys(got).length < Object.keys(full).length / 1.5);
  }
  assert.notEqual(hv.hueStyle(210, false), hv.hueStyle(30, false));
  // the night face: the warm night palette whatever the hue
  assert.equal(vars(hv.hueStyle(210, true, true))['--hv-tile'], hv.nightPalette(1)['--hv-tile']);
});
