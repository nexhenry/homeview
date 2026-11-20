// 0.9.2 (unreleased): the Lights pop-up's order — on first (switched on last at the top), then off
// (used last first), offline at the bottom by name — kept while the sheet is open, but rows move only
// when a light's state or last_changed changes, and not while a finger is on the sheet. Made-up home.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadHomeView, makeHass } from './harness.mjs';

const hv = await loadHomeView();
const ago = (min) => new Date(Date.now() - min * 60e3).toISOString();
const LIGHTS = {
  'light.porch': { state: 'on', min: 30 }, 'light.desk': { state: 'on', min: 2 }, 'light.hall': { state: 'off', min: 5 },
  'light.attic': { state: 'off', min: 600 }, 'light.shed': { state: 'unavailable', min: 1 }, 'light.bar': { state: 'unknown', min: 1 },
  'light.patio_group': { state: 'on', min: 10, group: true },
};
function home() {
  const extra = {};
  for (const [id, x] of Object.entries(LIGHTS)) extra[id] = { state: x.state, attributes: { friendly_name: id.split('.')[1].replace('_', ' '), ...(x.group ? { entity_id: ['light.a', 'light.b'] } : {}) } };
  const h = makeHass({ extra });
  for (const [id, x] of Object.entries(LIGHTS)) h.states[id] = { ...h.states[id], last_changed: ago(x.min) };
  return h;
}
const IDS = Object.keys(LIGHTS);

test('on (switched on last first), then off (used last first), then offline by name; light groups alike', () => {
  assert.deepEqual(hv.lightOrder(home(), IDS),
    ['light.desk', 'light.patio_group', 'light.porch', 'light.hall', 'light.attic', 'light.bar', 'light.shed']);
  // a light that's missing from the states counts as offline
  assert.deepEqual(hv.lightOrder(home(), ['light.gone', 'light.hall']), ['light.hall', 'light.gone']);
});

test('the pill hands the pop-up its lights unsorted; the order is made when it opens (no sort on every header redraw)', () => {
  const h = home();
  const p = hv.PILLS.lights(h, { lights: IDS });
  assert.equal(p.popup.sort, 'lights');
  assert.equal(p.popup.ids.length, IDS.length);
  assert.equal(p.text, '3 on');
});

test('open pop-up: rows move only when a light\'s state or last_changed changes, and not while a finger is on the sheet', () => {
  let h = home();
  const placed = [];
  const live = hv.liveLightOrder(h, hv.lightOrder(h, IDS), (next) => placed.push(next));
  const set = (id, patch) => { h = { ...h, states: { ...h.states, [id]: { ...h.states[id], ...patch } } }; };
  // a new state object with the same state and last_changed (brightness): nothing moves
  set('light.porch', { attributes: { ...h.states['light.porch'].attributes, brightness: 40 } });
  assert.equal(live.update(h), false);
  // an unrelated entity: nothing to do
  set('sensor.kitchen_temperature', { state: '72' });
  assert.equal(live.update(h), false);
  // the attic light switched on now, while a finger is on the sheet: waits ...
  live.down();
  set('light.attic', { state: 'on', last_changed: ago(0) });
  assert.equal(live.update(h), false);
  assert.equal(placed.length, 0);
  // ... until the first update after it lifts: on top
  live.up();
  assert.equal(live.update(h), true);
  assert.equal(placed[0][0], 'light.attic');
  // the same again: no second move
  assert.equal(live.update({ ...h, states: { ...h.states } }), false);
  // a light that goes offline drops to the bottom
  set('light.desk', { state: 'unavailable', last_changed: ago(0) });
  assert.equal(live.update(h), true);
  assert.deepEqual(placed[1].slice(-3), ['light.bar', 'light.desk', 'light.shed']);
});
