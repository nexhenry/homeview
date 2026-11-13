// The page-file primitives: show_when, entity patterns (exclude_entities, tiles), times (format: /
// attribute:), confirm (tiles, customize, chips, buttons) and section defaults:. Made-up home only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadHomeView, makeHass, El } from './harness.mjs';

// the harness's stubs, then a copy of the file that also exports the primitives' helpers
await loadHomeView();
const NAMES = ['showWhen', 'whenProblems', 'whenEntities', 'entityFilter', 'IdSet', 'matchEntities', 'expandTiles', 'matchProblems',
  'parseTimeValue', 'fmtTimeValue', 'valueText', 'durText', 'confirmOf', 'confirmAsks', 'confirmProblems', 'primitiveNotes', 'chipTap',
  'buildModel', 'userSections', 'userTile', 'R', 'HomeViewPage', 'entityPill', 'customPages'];
const hv = await (async () => {
  const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'homeview.js'), 'utf8');
  const file = join(mkdtempSync(join(tmpdir(), 'homeview-prim-')), 'homeview.mjs');
  writeFileSync(file, `${src}\nexport { ${NAMES.join(', ')} };\n`);
  const info = console.info; console.info = () => {};
  try { return await import(pathToFileURL(file).href); } finally { console.info = info; }
})();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// a few more made-up things: a vacuum, room switches, helpers, a plug's LED (a settings entity), labels
function home(opts = {}) {
  const h = makeHass({ ...opts, extra: {
    'vacuum.robot': { state: 'docked', attributes: { friendly_name: 'Robot', battery_level: 85, status: 'charging' }, area: 'living_room' },
    'switch.robot_kitchen_selected': { state: 'off', attributes: { friendly_name: 'Robot Kitchen' } },
    'switch.robot_hall_selected': { state: 'on', attributes: { friendly_name: 'Robot Hall' } },
    'binary_sensor.rain_expected': { state: 'off', attributes: { friendly_name: 'Rain expected' } },
    'input_boolean.siren': { state: 'off', attributes: { friendly_name: 'Front Siren' } },
    'input_datetime.wake': { state: '06:30:00', attributes: { friendly_name: 'Wake', has_date: false, has_time: true } },
    'input_number.limit': { state: '40', attributes: { friendly_name: 'Limit' } },
    'sensor.outdoor_temp': { state: '55', attributes: { friendly_name: 'Outdoor', unit_of_measurement: '°F', device_class: 'temperature' } },
    'light.kitchen_led': { state: 'on', attributes: { friendly_name: 'Kitchen LED' }, area: 'kitchen' },
    'sensor.plug_linkquality': { state: '120', attributes: { friendly_name: 'Plug Linkquality' } },
    'sensor.lamp_linkquality': { state: '90', attributes: { friendly_name: 'Lamp Linkquality' } },
    ...(opts.extra || {}),
  } });
  h.entities['light.kitchen_led'].entity_category = 'config';
  h.entities['switch.robot_hall_selected'].labels = ['vacuum_rooms'];
  h.entities['switch.robot_kitchen_selected'].labels = ['vacuum_rooms'];
  h.entities['sensor.lamp_linkquality'].platform = 'zha';
  h.entities['switch.pump_a'].labels = [];
  h.devices.plug_b.labels = ['pond'];   // a label on the device counts for its entities
  return h;
}

// ---- show_when ---------------------------------------------------------------------------------
test('show_when: an entity alone, states, numbers, attributes, users, and / or / not, Home Assistant\'s shape', () => {
  const h = home();
  const W = (c) => hv.showWhen(h, c);
  assert.equal(W('binary_sensor.rain_expected'), false);
  assert.equal(W('light.kitchen_main'), true);          // on
  assert.equal(W('lock.front_door'), false);            // locked: not "on"
  assert.equal(W('binary_sensor.nope'), false);         // missing: not on
  assert.equal(W({ entity: 'vacuum.robot', state: ['docked', 'idle'] }), true);
  assert.equal(W({ entity: 'vacuum.robot', state_not: 'docked' }), false);
  assert.equal(W({ entity: 'light.kitchen_main', state: true }), true);   // a bare YAML on
  assert.equal(W({ entity: 'binary_sensor.nope', state: 'unavailable' }), true);   // missing reads unavailable
  assert.equal(W({ entity: 'sensor.outdoor_temp', above: 50, below: 60 }), true);
  assert.equal(W({ entity: 'sensor.outdoor_temp', above: 'input_number.limit' }), true);   // 55 > 40
  assert.equal(W({ entity: 'sensor.outdoor_temp', below: 'input_number.limit' }), false);
  assert.equal(W({ entity: 'vacuum.robot', attribute: 'battery_level', below: 20 }), false);
  assert.equal(W({ entity: 'vacuum.robot', attribute: 'status', state: 'charging' }), true);
  assert.equal(W({ entity: 'vacuum.robot', attribute: 'error' }), false);   // no such attribute
  assert.equal(W({ user: 'alex' }), true);
  assert.equal(W({ user: ['Zoe', 'person.mia'] }), false);
  assert.equal(W({ user: 'person.alex' }), true);        // the person linked to this login
  assert.equal(W({ admin: true }), true);
  assert.equal(hv.showWhen(home({ admin: false }), { admin: true }), false);
  assert.equal(W({ or: ['binary_sensor.rain_expected', { entity: 'vacuum.robot', state: 'docked' }] }), true);
  assert.equal(W({ and: ['binary_sensor.rain_expected', 'light.kitchen_main'] }), false);
  assert.equal(W({ not: 'binary_sensor.rain_expected' }), true);
  assert.equal(W(['light.kitchen_main', { admin: true }]), true);    // a list = all
  assert.equal(W({ condition: 'state', entity: 'vacuum.robot', state: 'docked' }), true);
  assert.equal(W({ condition: 'numeric_state', entity: 'sensor.outdoor_temp', below: 50 }), false);
  assert.equal(W({ condition: 'or', conditions: [{ condition: 'user', users: ['u-zoe'] }, { condition: 'state', entity: 'light.kitchen_main', state: 'on' }] }), true);
  assert.equal(W({ condition: 'not', conditions: [{ condition: 'state', entity: 'light.kitchen_main', state: 'on' }] }), false);
  // what HomeView can't read shows the tile (and admins get a note)
  assert.equal(W({ condition: 'time', after: '10:00' }), true);
  assert.equal(W(42), true);
  assert.deepEqual(hv.whenProblems({ entity: 'x.y', stat: 'on' }), ['unknown key stat']);
  assert.match(hv.whenProblems({ condition: 'time' })[0], /isn't one HomeView reads/);
  assert.match(hv.whenProblems({ or: [{ state: 'on' }] })[0], /need entity/);
  assert.deepEqual(hv.whenProblems('Rain Today'), ['“Rain Today” isn\'t an entity id']);
  assert.deepEqual(hv.whenEntities({ or: ['a.b', { entity: 'c.d', above: 'e.f' }] }), ['a.b', 'c.d', 'e.f']);
});

test('show_when on a page: tiles and sections hide and come back with the state, without a rebuild; edit mode fades them', () => {
  const h = home();
  const p = new hv.HomeViewPage();
  p.setConfig({ page: 'custom', custom: 0, path: 'vac', options: { custom_pages: [{ path: 'vac', sections: [
    { title: 'Rain', show_when: 'binary_sensor.rain_expected', tiles: [{ type: 'forecast' }] },
    { title: 'Rooms', tiles: [{ match: { label: 'vacuum_rooms', state: 'on' } }] },            // live: only the selected rooms
    { title: 'Robot', tiles: ['vacuum.robot', { entity: 'vacuum.robot', attribute: 'battery_level', name: 'Battery', show_when: { entity: 'vacuum.robot', state_not: 'docked' } }] },
  ] }] } });
  p.hass = h;
  const ws = p._whens;
  const shown = (w) => w.el.style.display !== 'none';
  p._applyWhens();
  const rain = ws.find((w) => w.c === 'binary_sensor.rain_expected');
  const hall = ws.find((w) => w.el.spec?.entity === 'switch.robot_hall_selected');
  const kitchen = ws.find((w) => w.el.spec?.entity === 'switch.robot_kitchen_selected');
  const battery = ws.find((w) => w.el.spec?.attribute === 'battery_level');
  const rooms = ws.find((w) => w.grid && w.grid.children.includes(hall.el));
  assert.ok(rain && hall && kitchen && battery && rooms);
  assert.deepEqual([shown(rain), shown(hall), shown(kitchen), shown(battery), shown(rooms)], [false, true, false, false, true]);
  const built = p._page;
  // the hall is done, the rain comes, the robot leaves the dock
  h.states['switch.robot_hall_selected'] = { ...h.states['switch.robot_hall_selected'], state: 'off' };
  h.states['binary_sensor.rain_expected'] = { ...h.states['binary_sensor.rain_expected'], state: 'on' };
  h.states['vacuum.robot'] = { ...h.states['vacuum.robot'], state: 'cleaning' };
  p._applyWhens();
  assert.deepEqual([shown(rain), shown(hall), shown(kitchen), shown(battery), shown(rooms)], [true, false, false, true, false]);   // no room selected: the section goes
  assert.equal(p._page, built);   // not rebuilt
  // edit mode: everything stays, the hidden ones faded
  sessionStorage.setItem('homeview-edit', '1');
  try {
    p.rebuild();
    p._applyWhens();
    assert.ok(p._whens.every((w) => w.el.style.display !== 'none'));
    assert.ok(p._whens.some((w) => w.el.style.opacity === '0.45'));
  } finally { sessionStorage.removeItem('homeview-edit'); }
});

test('show_when on pills: your own and a page\'s pill on Home', () => {
  const h = home();
  const p = new hv.HomeViewPage();
  p.setConfig({ page: 'home', path: 'home', options: { pills: ['lights', { entity: 'vacuum.robot', name: 'Robot', show_when: { entity: 'vacuum.robot', state: 'cleaning' } }] },
    pagePills: [{ page: 'pond', name: 'Pond', entity: 'switch.pump_a', show_when: { admin: false } }] });
  p.hass = h;
  const texts = () => p._pills.map(([, x]) => x.text);
  assert.deepEqual(texts().some((t) => /Robot/.test(t)), false);
  assert.deepEqual(texts().some((t) => /Pond/.test(t)), false);   // admins don't get it
  h.states['vacuum.robot'] = { ...h.states['vacuum.robot'], state: 'cleaning' };
  p._headKey = null; p._drawHead();
  assert.ok(texts().some((t) => /^Robot /.test(t)));
});

// ---- entity patterns ---------------------------------------------------------------------------
test('patterns: globs, filters by domain / area / label / device class / integration, not:', () => {
  const h = home();
  const M = (p) => hv.matchEntities(h, p);
  assert.deepEqual(M('sensor.*_linkquality'), ['sensor.lamp_linkquality', 'sensor.plug_linkquality']);
  assert.deepEqual(M({ domain: 'light', area: 'Kitchen' }), ['light.kitchen_light', 'light.kitchen_main']);   // area by name; the LED is a settings entity
  assert.deepEqual(M({ domain: 'light', area: 'kitchen', diagnostic: true }), ['light.kitchen_led', 'light.kitchen_light', 'light.kitchen_main']);
  assert.deepEqual(M('light.kitchen_*'), ['light.kitchen_led', 'light.kitchen_light', 'light.kitchen_main']);   // named by id: in
  assert.deepEqual(M({ label: 'Vacuum rooms' }), ['switch.robot_hall_selected', 'switch.robot_kitchen_selected']);   // the label's name
  assert.deepEqual(M({ label: 'pond' }), ['switch.pump_b']);   // a label on its device
  assert.deepEqual(M({ integration: 'zha' }), ['sensor.lamp_linkquality']);
  assert.deepEqual(M({ domain: 'binary_sensor', device_class: ['door', 'window'] }), ['binary_sensor.back_door']);
  assert.deepEqual(M({ entity_id: 'sensor.*_battery', not: '*bathroom*' }), ['sensor.kitchen_leak_battery']);
  h.entities['sensor.plug_linkquality'].hidden = true;   // hidden in Home Assistant: never
  assert.deepEqual(M('sensor.*_linkquality'), ['sensor.lamp_linkquality']);
  assert.deepEqual(hv.matchProblems({ domian: 'light' }), ['unknown key domian', 'a filter needs entity_id, domain, area, label, device_class or integration']);
  const s = new hv.IdSet(h, ['light.kitchen_main', 'sensor.*_linkquality', { label: 'vacuum_rooms' }]);
  assert.equal(s.has('light.kitchen_main'), true);
  assert.equal(s.has('sensor.plug_linkquality'), true);
  assert.equal(s.byPattern('sensor.plug_linkquality'), true);
  assert.equal(s.byPattern('light.kitchen_main'), false);
  assert.equal(s.has('switch.robot_hall_selected'), true);
  assert.equal(s.has('light.kitchen_light'), false);
  assert.equal(s.size, 3);
});

test('exclude_entities with patterns: gone from the model, the pills and explicitly listed tiles', () => {
  const h = home();
  const m = hv.buildModel(h, { exclude_entities: ['sensor.*_leak_battery', { label: 'vacuum_rooms' }] });
  assert.deepEqual(m.batteries, []);
  assert.ok(!m.byDomain.switch.includes('switch.robot_hall_selected'));
  assert.ok(m.byDomain.switch.includes('switch.pump_a'));
  // a custom page that names one: dropped too (hidden means hidden everywhere); edit mode: faded, no eye
  const p = new hv.HomeViewPage();
  const options = { exclude_entities: ['switch.robot_*'], custom_pages: [{ path: 'x', sections: [{ tiles: ['switch.robot_hall_selected', 'switch.pump_a'] }] }] };
  p.setConfig({ page: 'custom', custom: 0, path: 'x', options });
  p.hass = h;
  assert.deepEqual(p._tiles.map((t) => t.spec.entity), ['switch.pump_a']);
  sessionStorage.setItem('homeview-edit', '1');
  try {
    p.rebuild();
    const t = p._tiles.find((x) => x.spec.entity === 'switch.robot_hall_selected');
    assert.equal(t.spec.hiddenEnt, 'pattern');
    assert.equal(p._editFor(t.spec).actions.length, 0);
  } finally { sessionStorage.removeItem('homeview-edit'); }
});

// ---- section defaults: and match ----------------------------------------------------------------
test('section defaults: merged into each tile (the tile\'s own keys win); globs and match: spread one tile each', () => {
  const h = home();
  const sec = { defaults: { type: 'button', action: 'remote.send_command', target: 'remote.tv' }, layout: 'keypad',
    tiles: [{ name: 'Up', icon: 'mdi:chevron-up', data: { command: 'up' } }, '.', { name: 'Off', action: 'remote.turn_off' }] };
  const t = hv.expandTiles(sec, h);
  assert.deepEqual(t[0], { type: 'button', action: 'remote.send_command', target: 'remote.tv', name: 'Up', icon: 'mdi:chevron-up', data: { command: 'up' } });
  assert.equal(t[1], '.');
  assert.equal(t[2].action, 'remote.turn_off');
  const [secOut] = hv.userSections([sec], h, hv.buildModel(h, {}));
  assert.deepEqual(secOut.tiles.map((x) => x.kind), ['button', 'gap', 'button']);
  // strings get the defaults too; a match with tile options and a live state filter
  const t2 = hv.expandTiles({ defaults: { size: '2x1' }, tiles: ['light.kitchen_main', 'sensor.*_linkquality', { match: { label: 'vacuum_rooms', state: 'on' }, tap: 'more-info' }] }, h);
  assert.deepEqual(t2.map((x) => x.entity), ['light.kitchen_main', 'sensor.lamp_linkquality', 'sensor.plug_linkquality', 'switch.robot_hall_selected', 'switch.robot_kitchen_selected']);
  assert.ok(t2.every((x) => x.size === '2x1'));
  assert.deepEqual(t2[3].show_when, { entity: 'switch.robot_hall_selected', state: 'on' });
  assert.equal(t2[3].tap, 'more-info');
  // agenda / next_event tiles use match: for event titles: not a pattern (and no note)
  const t3 = hv.expandTiles({ tiles: [{ type: 'agenda', calendars: ['calendar.shared'], match: 'no school|break' }, { type: 'next_event', match: 'trip' }] }, h);
  assert.deepEqual(t3.map((x) => x.match), ['no school|break', 'trip']);
  assert.deepEqual(hv.primitiveNotes(h, {}, [{ tiles: [{ type: 'agenda', match: 'no school' }], defaults: { size: '2x1' } }]), []);
  // userTile carries show_when into the spec
  assert.deepEqual(hv.userTile({ entity: 'light.kitchen_main', show_when: { admin: true } }, h, hv.buildModel(h, {})).showWhen, { admin: true });
});

// ---- times -------------------------------------------------------------------------------------
test('times: parse input_datetime / ISO / dates; until, since, relative, time, date, datetime', () => {
  assert.equal(hv.parseTimeValue('06:30:00').tod, true);
  assert.equal(hv.parseTimeValue('2026-11-13').day, true);
  assert.equal(hv.parseTimeValue('2026-11-13 06:30:00').d.getHours(), 6);   // no offset: local time
  assert.equal(hv.parseTimeValue('2026-11-13T14:30:00+00:00').d.toISOString(), '2026-11-13T14:30:00.000Z');
  assert.equal(hv.parseTimeValue('soon'), null);
  const h = home();
  const now = new Date(2026, 10, 12, 20, 0).getTime();   // 8 pm
  const F = (t, f) => hv.fmtTimeValue(h, t, f, now);
  const wake = { d: new Date(2026, 10, 12, 6, 30), tod: true };
  assert.equal(F(wake, 'until'), '10 h 30 min');          // tomorrow's 6:30
  assert.equal(F(wake, 'since'), '13 h 30 min');          // this morning's
  assert.equal(F(wake, 'relative'), 'in 11 hours');
  assert.match(F(wake, 'time'), /^6:30\sAM$/);
  const later = { d: new Date(2026, 10, 12, 21, 5) };
  assert.equal(F(later, 'until'), '1 h 5 min');
  assert.equal(F({ d: new Date(2026, 10, 12, 19, 0) }, 'until'), 'now');
  assert.equal(F({ d: new Date(2026, 10, 12, 19, 57) }, 'since'), '3 min');
  assert.equal(F({ d: new Date(2026, 10, 12, 19, 57) }, 'relative'), '3 minutes ago');
  assert.equal(F({ d: new Date(2026, 10, 13), day: true }, 'relative'), 'tomorrow');
  assert.equal(F({ d: new Date(2026, 10, 16), day: true }, 'until'), '4 d');
  assert.match(F({ d: new Date(2026, 10, 14, 9, 0) }, 'datetime'), /^Sat 9:00\sAM$/);
  assert.match(F(later, 'datetime'), /^9:05\sPM$/);         // today: the time only
  assert.match(F(later, 'date'), /^Thu, Nov 12$/);
  assert.equal(hv.durText(3 * 864e5 + 4 * 36e5), '3 d 4 h');
  assert.equal(hv.durText(20e3), '< 1 min');
});

test('time and attribute values on tiles and pills (datetime pills), redrawn as time goes by', () => {
  const h = home();
  const v = (s) => hv.valueText(h, h.states[s.entity], s);
  assert.match(v({ entity: 'input_datetime.wake', format: 'until' }), /^\d+ h( \d+ min)?$|^\d+ min$/);
  assert.equal(v({ entity: 'vacuum.robot', attribute: 'battery_level', unit: '%' }), '85%');
  assert.equal(v({ entity: 'vacuum.robot', attribute: 'status' }), 'charging');
  assert.equal(v({ entity: 'vacuum.robot', attribute: 'error' }), '—');
  assert.equal(v({ entity: 'vacuum.robot', attribute: 'last_changed' }), 'now');   // relative by default
  assert.equal(v({ entity: 'switch.pump_b', format: 'since' }), 'Offline');
  assert.equal(v({ entity: 'lock.front_door' }), 'Locked');   // nothing asked: Home Assistant's words
  // a pill row: an input_datetime is a value pill (it used to show only its name)
  const pill = hv.R.entity.html(h, { kind: 'entity', entity: 'input_datetime.wake', name: 'Wake', pillish: true });
  assert.match(pill, /<b>Wake<\/b><span class="pv">06:30:00<\/span>/);
  const pill2 = hv.R.entity.html(h, { kind: 'entity', entity: 'input_datetime.wake', name: 'Wake', pillish: true, format: 'time' });
  assert.match(pill2, /<span class="pv">6:30\sAM<\/span>/);
  // userTile: a live format gets the tile's own 30 s clock; its key changes with time, not every update
  const spec = hv.userTile({ entity: 'input_datetime.wake', format: 'until' }, h, hv.buildModel(h, {}));
  assert.equal(spec.tick, 30e3);
  assert.equal(hv.userTile({ entity: 'input_datetime.wake', format: 'time' }, h, hv.buildModel(h, {})).tick, undefined);
  assert.match(hv.R.entity.key(h, spec), /\|\d+$/);
  // a header pill of your own: { entity, name, format }
  const hp = hv.entityPill(h, { entity: 'input_datetime.wake', name: 'Wake', format: 'time' });
  assert.match(hp.text, /^Wake 6:30\sAM$/);
});

// ---- confirm -----------------------------------------------------------------------------------
const page = { _hvPage: true, _root: new El() };
const tile = { getRootNode: () => ({ host: page }), dispatchEvent() {} };
/** Runs act() and answers HomeView's confirm sheet (yes / no); returns the sheet (null: none asked). */
async function answer(act, yes = true) {
  const made = [];
  const create = document.createElement;
  document.createElement = (t) => { const e = new El(t); if (t === 'div') { e._q = { '[data-no]': new El('button'), '[data-yes]': new El('button') }; made.push(e); } return e; };
  try {
    const p = act();
    await sleep(5);
    const pop = made.find((e) => e.className === 'pop cf') || null;
    if (pop) { await sleep(470); pop._q[yes ? '[data-yes]' : '[data-no]'].fire('click'); }
    await p;
    return pop;
  } finally { document.createElement = create; }
}
const sent = (h) => h._sent.filter((m) => m.type === 'call_service').map((c) => `${c.domain}.${c.service}`);

test('confirm: true / turn_on / turn_off / your question / { text, only, action }', () => {
  assert.deepEqual(hv.confirmOf(true), {});
  assert.equal(hv.confirmOf(false), null);
  assert.deepEqual(hv.confirmOf('turn_on'), { only: 'turn_on' });
  assert.deepEqual(hv.confirmOf('Sound the siren?'), { text: 'Sound the siren?' });
  assert.deepEqual(hv.confirmOf({ text: 'Stop?', only: 'turn_off', action: 'Stop' }), { text: 'Stop?', only: 'turn_off', action: 'Stop' });
  assert.equal(hv.confirmAsks({ only: 'turn_on' }, true), true);
  assert.equal(hv.confirmAsks({ only: 'turn_on' }, false), false);
  assert.deepEqual(hv.confirmProblems({ txt: 'x', only: 'on' }), ['unknown key txt', 'only: on (turn_on or turn_off)']);
});

test('customize.<entity>.confirm: asked on any page, only when turning on, with your words; off at once', async () => {
  const h = home();
  const p = new hv.HomeViewPage();
  p.setConfig({ page: 'home', path: 'home', options: { customize: { 'input_boolean.siren': { confirm: { text: 'Sound the front siren for 60 s?', only: 'turn_on', action: 'Sound' } } } } });
  p.hass = h;
  const t = p._tile({ kind: 'entity', entity: 'input_boolean.siren', size: [1, 1] });
  assert.deepEqual(t.spec.confirm, { text: 'Sound the front siren for 60 s?', only: 'turn_on', action: 'Sound' });
  // off -> on: asks (Cancel: nothing; Sound: on)
  h._sent.length = 0;
  let pop = await answer(() => hv.R.entity.action(h, t.spec, tile, 'tap'), false);
  assert.match(pop.innerHTML, /Sound the front siren for 60 s\?/);
  assert.match(pop.innerHTML, />Sound<\/button>/);
  assert.deepEqual(sent(h), []);
  await answer(() => hv.R.entity.action(h, t.spec, tile, 'tap'), true);
  assert.deepEqual(sent(h), ['homeassistant.toggle']);
  // on -> off: at once
  h.states['input_boolean.siren'] = { ...h.states['input_boolean.siren'], state: 'on' };
  h._sent.length = 0;
  pop = await answer(() => hv.R.entity.action(h, t.spec, tile, 'tap'));
  assert.equal(pop, null);
  assert.deepEqual(sent(h), ['homeassistant.toggle']);
  // a tile's own confirm wins over customize
  assert.equal(p._tile({ kind: 'entity', entity: 'input_boolean.siren', confirm: false, size: [1, 1] }).spec.confirm, false);
  // a button that toggles it picks it up too
  assert.ok(p._tile({ kind: 'button', toggle: 'input_boolean.siren', size: [1, 1] }).spec.confirm);
});

test('hold: toggle switches on a hold (tap: more-info = a stray tap can\'t), with its confirm', async () => {
  const h = home();
  const spec = { kind: 'entity', entity: 'input_boolean.siren', tap: 'more-info', hold: 'toggle', confirm: true };
  let opened = null;
  const t2 = { ...tile, dispatchEvent: (e) => { opened = e.detail?.entityId; } };
  await answer(() => hv.R.entity.action(h, spec, t2, 'tap'));
  assert.equal(opened, 'input_boolean.siren');
  assert.deepEqual(sent(h), []);
  const pop = await answer(() => hv.R.entity.action(h, spec, tile, 'hold'), true);
  assert.match(pop.innerHTML, /Turn on Front Siren\?/);
  assert.deepEqual(sent(h), ['homeassistant.toggle']);
  // a lock: your words before unlocking (confirm: turn_on = unlocking); locking still asks, in HomeView's
  // words (locks, garage doors and gates always ask)
  h._sent.length = 0;
  const lock = { kind: 'entity', entity: 'lock.front_door', confirm: { only: 'turn_on', text: 'Let the guest in?' } };
  assert.match((await answer(() => hv.R.entity.action(h, lock, tile, 'tap'), true)).innerHTML, /Let the guest in\?/);
  assert.deepEqual(sent(h), ['lock.unlock']);
  h.states['lock.front_door'] = { ...h.states['lock.front_door'], state: 'unlocked' };
  h._sent.length = 0;
  assert.match((await answer(() => hv.R.entity.action(h, lock, tile, 'tap'), true)).innerHTML, /Lock Front Door\?/);
  assert.deepEqual(sent(h), ['lock.lock']);
  // confirm: false doesn't take a lock's question away either (tap: toggle does, as before)
  assert.ok(await answer(() => hv.R.entity.action(h, { ...lock, confirm: false }, tile, 'tap'), false));
});

test('chips: customize.<entity>.confirm\'s words fill an automatic confirm: true (which still always asks); confirm: false never asks', async () => {
  const h = home();
  const node = { _hvPage: true, _root: new El(), _config: { options: { customize: { 'lock.front_door': { confirm: 'Unlock the front door for a guest?' } } } } };
  let pop = await answer(() => hv.chipTap(h, { entity: 'lock.front_door', confirm: true }, node), false);
  assert.match(pop.innerHTML, /Unlock the front door for a guest\?/);
  // customize says turn_on only: unlocking gets its words, locking still asks (the chip's confirm: true)
  const node2 = { ...node, _config: { options: { customize: { 'lock.front_door': { confirm: { only: 'turn_on', text: 'Let the guest in?' } } } } } };
  h.states['lock.front_door'] = { ...h.states['lock.front_door'], state: 'unlocked' };
  pop = await answer(() => hv.chipTap(h, { entity: 'lock.front_door', confirm: true }, node2), false);
  assert.match(pop.innerHTML, /Lock Front Door\?/);
  h.states['lock.front_door'] = { ...h.states['lock.front_door'], state: 'locked' };
  pop = await answer(() => hv.chipTap(h, { entity: 'input_boolean.siren' }, { ...node, _config: { options: { customize: { 'input_boolean.siren': { confirm: 'turn_on' } } } } }), false);
  assert.match(pop.innerHTML, /Turn on Front Siren\?/);
  h._sent.length = 0;
  pop = await answer(() => hv.chipTap(h, { entity: 'lock.front_door', confirm: false }, node));
  assert.equal(pop, null);
  assert.deepEqual(sent(h), ['lock.unlock']);
});

// ---- the admins' note ----------------------------------------------------------------------------
test('admins get a note for typos in show_when, patterns, defaults, format, confirm, section and customize keys', () => {
  const h = home();
  const notes = hv.primitiveNotes(h, {
    customize: { 'input_boolean.siren': { confrim: true }, 'lock.front_door': { confirm: { only: 'on' } } },
    exclude_entities: ['sensor.*_linkquality', { lable: 'x' }, 'Not An Id'],
    pills: [{ entity: 'vacuum.robot', show_when: 'binary_sensor.gone' }],
  }, [{ title: 'A', layout: 'pills', defualts: {}, show_when: { entity: 'x.y', stat: 'on' },
    tiles: ['light.nothing_*', { match: { domain: 'light', area: 'attic' } }, { entity: 'input_datetime.wake', format: 'untill' }] }]);
  const all = notes.join('\n');
  for (const re of [/section “A”: unknown key defualts/, /section “A” show_when: unknown key stat/, /light\.nothing_\* matches no entity/,
    /match \{"domain":"light","area":"attic"\} matches no entity/, /format: untill isn't one of/, /customize input_boolean\.siren: unknown key confrim/,
    /customize lock\.front_door confirm: only: on/, /exclude_entities: unknown key lable/, /exclude_entities: "Not An Id" isn't/,
    /show_when names x\.y, binary_sensor\.gone, not in Home Assistant/]) assert.match(all, re);
  assert.deepEqual(hv.primitiveNotes(h, { exclude_entities: ['sensor.*_linkquality'], customize: { 'light.a': { name: 'A', confirm: true } } },
    [{ title: 'B', defaults: { size: '2x1' }, show_when: 'binary_sensor.rain_expected', tiles: ['light.kitchen_*'] }]), []);
  // on the page, for admins only
  const p = new hv.HomeViewPage();
  p.setConfig({ page: 'custom', custom: 0, path: 'x', options: { custom_pages: [{ path: 'x', sections: [{ titel: 'Oops', tiles: ['light.kitchen_main'] }] }] } });
  p.hass = h;
  const noteText = () => p._root.children[0].children.filter((c) => c.className === 'note').map((c) => c.textContent).join('\n');
  assert.match(noteText(), /Page “x”: section “1”: unknown key titel/);
  p.hass = { ...home({ admin: false }) };
  p.rebuild();
  assert.doesNotMatch(noteText(), /unknown key/);
});
