// The Energy page's power-outage section: one store for the ticks (an HA label), the grid's state in
// plain words (never "grid on" unless the sensor says so), rows paired with the right switch, and
// nothing switched without asking (admins only). Every service call is captured, none is sent.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadHomeView, makeHass, El } from './harness.mjs';

const hv = await loadHomeView();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LABELS = [{ label_id: 'outage_turn_off', name: 'Outage: turn off' }, { label_id: 'outage_turn_on', name: 'Outage: turn on' }];

// a made-up home's plugs: a two-channel fridge plug (with two "mode" switches), a two-outlet strip
// whose switches aren't named like its meters, a pump whose switch is also a fan (switch_as_x), a
// kettle plug, and a heater metered on one device and switched by another
const PLUGS = {
  'switch.fridges_mode_1': { state: 'off', device: 'fridges' }, 'switch.fridges_mode_2': { state: 'off', device: 'fridges' },
  'switch.beer_fridge': { state: 'on', device: 'fridges' }, 'switch.chest_freezer': { state: 'on', device: 'fridges' },
  'sensor.beer_fridge_energy': { state: '1.2', attributes: { device_class: 'energy', unit_of_measurement: 'kWh' }, device: 'fridges' },
  'sensor.chest_freezer_energy': { state: '0.8', attributes: { device_class: 'energy', unit_of_measurement: 'kWh' }, device: 'fridges' },
  'sensor.beer_fridge_power': { state: '95', attributes: { device_class: 'power', unit_of_measurement: 'W' }, device: 'fridges' },
  'sensor.chest_freezer_power': { state: '60', attributes: { device_class: 'power', unit_of_measurement: 'W' }, device: 'fridges' },
  'switch.strip_lamp': { state: 'on', device: 'strip' }, 'switch.strip_radio': { state: 'off', device: 'strip' },
  'sensor.strip_energy_1': { state: '0.1', attributes: { device_class: 'energy', unit_of_measurement: 'kWh' }, device: 'strip' },
  'switch.pond_pump': { state: 'on', device: 'pump' }, 'fan.pond_pump': { state: 'on', device: 'pump' },
  'sensor.pond_pump_energy': { state: '3.1', attributes: { device_class: 'energy', unit_of_measurement: 'kWh' }, device: 'pump' },
  'sensor.pond_pump_power': { state: '720', attributes: { device_class: 'power', unit_of_measurement: 'W' }, device: 'pump' },
  'switch.plug_kitchen_7': { state: 'off', device: 'kplug' },
  'sensor.kettle_energy': { state: '0.3', attributes: { device_class: 'energy', unit_of_measurement: 'kWh' }, device: 'kplug' },
  'sensor.heater_energy': { state: '4.0', attributes: { device_class: 'energy', unit_of_measurement: 'kWh' }, device: 'heater_dev' },
  'switch.heater': { state: 'on' },
  'switch.pump_b': { state: 'unavailable', device: 'plug_b' },
  'sensor.pump_b_energy': { state: '0', attributes: { device_class: 'energy', unit_of_measurement: 'kWh' }, device: 'plug_b' },
};
const home = (opts = {}) => makeHass({ extra: PLUGS, ws: (m) => {
  if (m.type === 'config/label_registry/list') return opts.labels ?? LABELS;
  if (m.type === 'config/label_registry/create') return { label_id: 'outage_turn_off', name: m.name };
  return null;
}, ...opts });

test('rows pair with the switch named like the energy sensor; a device with several switches and none named like it gets none', () => {
  const h = home();
  const p = (id, sw) => hv.pairLoad(h, id, sw);
  assert.deepEqual(p('sensor.beer_fridge_energy'), { sw: 'switch.beer_fridge', alts: [], power: 'sensor.beer_fridge_power', current: null });
  assert.equal(p('sensor.chest_freezer_energy').sw, 'switch.chest_freezer');   // was the first switch on the device: a "mode" switch
  assert.equal(p('sensor.chest_freezer_energy').power, 'sensor.chest_freezer_power');
  assert.equal(p('sensor.strip_energy_1').sw, null);                // two outlets, neither named like it: no button
  assert.deepEqual(p('sensor.pond_pump_energy'), { sw: 'switch.pond_pump', alts: ['fan.pond_pump'], power: 'sensor.pond_pump_power', current: null });
  assert.equal(p('sensor.kettle_energy').sw, 'switch.plug_kitchen_7');   // the device's only switch
  assert.equal(p('sensor.heater_energy').sw, 'switch.heater');        // named like it, on another device
  assert.equal(p('sensor.kettle_energy', { 'sensor.kettle_energy': null }).sw, null);   // by hand: none
  assert.equal(p('sensor.strip_energy_1', { 'sensor.strip_energy_1': 'switch.strip_lamp' }).sw, 'switch.strip_lamp');
});

test('the grid\'s state: never "grid on" unless the sensor says so', () => {
  const g = (state, spec = {}, id = 'sensor.grid_status', attrs = {}) =>
    hv.gridState(makeHass({ extra: { [id]: { state, attributes: attrs } } }), { entity: id, ...spec }).state;
  assert.equal(g('Active'), 'up');
  assert.equal(g('Inactive'), 'down');          // a battery's "off the grid" (it used to read "grid on")
  assert.equal(g('unknown'), 'unknown');
  assert.equal(g('unavailable'), 'unknown');
  assert.equal(g('off_grid'), 'down');
  assert.equal(g('Transition'), 'odd');         // a word it doesn't know: shown as it is, in amber
  assert.equal(g('Transition', { up: ['Active'] }), 'down');   // up: given — anything else is down
  assert.equal(g('unknown', { up: ['Active'] }), 'unknown');
  assert.equal(g('Active', { down: ['islanded'] }), 'up');
  assert.equal(g('islanded', { down: ['islanded'] }), 'down');
  assert.equal(g('on', {}, 'binary_sensor.off_grid'), 'down');   // named for the outage: on = down
  assert.equal(g('on', {}, 'binary_sensor.grid_connected'), 'up');
  assert.equal(g('on', {}, 'binary_sensor.mains', { device_class: 'problem' }), 'down');
  assert.equal(hv.gridState(makeHass(), { entity: 'sensor.nope' }).state, 'missing');
  assert.equal(hv.gridState(makeHass(), null).state, 'none');
  // the header's words
  const word = (state) => {
    const h = makeHass({ extra: { 'sensor.grid_status': { state } } });
    return hv.R.energy_outage.html(h, { grid: { entity: 'sensor.grid_status' }, outage: hv.outageOpts({}), loads: [] });
  };
  assert.match(word('unknown'), /grid status unknown/);
  assert.doesNotMatch(word('unknown'), /grid on/);
  assert.doesNotMatch(word('unavailable'), /grid on/);
  assert.match(word('Inactive'), /GRID DOWN/);
  assert.match(word('Active'), /grid on/);
  assert.match(word('Transition'), /grid: Transition/);
});

// ---- switching: asked first, admins only, and through the site's script when it has one ----------
const page = { _hvPage: true, _root: new El() };
const tile = { getRootNode: () => ({ host: page }), dispatchEvent() {} };
const evAct = (act) => ({ target: { closest: () => ({ dataset: { act } }) } });
/** Runs act() and answers HomeView's confirm sheet (yes / no); returns the sheet (null: none asked). */
async function answer(act, yes) {
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
const calls = (h) => h._sent.filter((m) => m.type === 'call_service').map((c) => ({ service: `${c.domain}.${c.service}`, data: c.data, target: c.target }));
async function outageHome(outage, { admin = true } = {}) {
  const h = home({ admin });
  await hv.readLabels(h);
  h.entities['switch.pond_pump'].labels = ['outage_turn_off'];
  h.entities['switch.beer_fridge'].labels = ['outage_turn_off'];
  h.entities['switch.heater'].labels = ['outage_turn_on'];
  const o = hv.outageOpts({ outage });
  const loads = ['sensor.pond_pump_energy', 'sensor.beer_fridge_energy', 'sensor.heater_energy', 'sensor.chest_freezer_energy']
    .map((id) => ({ kind: 'energy_load', stat: id, ...hv.pairLoad(h, id), name: id.split('.')[1].replace(/_energy$/, '').replace(/_/g, ' '), outage: o, row: true }));
  h._sent.length = 0;
  return { h, spec: { kind: 'energy_outage', grid: { entity: 'sensor.nope' }, outage: o, loads, page }, loads };
}

test('"Turn off ticked" runs the site\'s script with the ticked lists (never homeassistant.turn_off), after asking', async () => {
  const { h, spec } = await outageHome({ on_label: 'Outage: turn on', off_action: { action: 'script.outage_shed', data: { reason: 'dashboard' } }, on_action: 'script.outage_restore' });
  assert.match(hv.R.energy_outage.html(h, spec), /Turn off ticked \(2\)/);
  // Cancel: nothing
  let pop = await answer(() => hv.R.energy_outage.action(h, spec, tile, 'tap', evAct('off')), false);
  assert.ok(pop, 'it asked');
  assert.match(pop.innerHTML, /Turn off 2 devices\?/);
  assert.match(pop.innerHTML, /pond pump, beer fridge/);
  assert.deepEqual(calls(h), []);
  // Turn off: the script, with the ticked switches and the "turn on" ones
  pop = await answer(() => hv.R.energy_outage.action(h, spec, tile, 'tap', evAct('off')), true);
  assert.deepEqual(calls(h), [{ service: 'script.outage_shed', data: { reason: 'dashboard', entities: ['switch.pond_pump', 'switch.beer_fridge'], on_entities: ['switch.heater'] }, target: undefined }]);
  // Turn back on: asks too, then the restore script
  h._sent.length = 0;
  pop = await answer(() => hv.R.energy_outage.action(h, spec, tile, 'tap', evAct('on')), true);
  assert.ok(pop, '"Turn back on" asks first');
  assert.match(pop.innerHTML, /Turn 2 devices back on\?/);
  assert.deepEqual(calls(h).map((c) => c.service), ['script.outage_restore']);
  assert.ok(!h._sent.some((m) => m.type === 'call_service' && m.domain === 'homeassistant'));
});

test('without a script: homeassistant.turn_off / turn_on on the ticked switches, each after asking', async () => {
  const { h, spec } = await outageHome(undefined);
  await answer(() => hv.R.energy_outage.action(h, spec, tile, 'tap', evAct('off')), true);
  assert.deepEqual(calls(h), [{ service: 'homeassistant.turn_off', data: {}, target: { entity_id: ['switch.pond_pump', 'switch.beer_fridge'] } }]);
  h._sent.length = 0;
  await answer(() => hv.R.energy_outage.action(h, spec, tile, 'tap', evAct('on')), false);
  assert.deepEqual(calls(h), []);   // "Turn back on" cancelled: nothing
  // script.turn_on: the lists go in as variables
  const s2 = { ...spec, outage: hv.outageOpts({ outage: { off_action: { action: 'script.turn_on', target: { entity_id: 'script.outage_shed' } } } }) };
  h._sent.length = 0;
  await answer(() => hv.R.energy_outage.action(h, s2, tile, 'tap', evAct('off')), true);
  assert.deepEqual(calls(h), [{ service: 'script.turn_on', data: { variables: { entities: ['switch.pond_pump', 'switch.beer_fridge'], on_entities: [] } }, target: { entity_id: 'script.outage_shed' } }]);
});

test('only admins switch: no buttons and no calls for anyone else', async () => {
  const { h, spec, loads } = await outageHome({ off_action: 'script.outage_shed' }, { admin: false });
  const html = hv.R.energy_outage.html(h, spec);
  assert.doesNotMatch(html, /data-act="off"|data-act="on"/);
  const row = hv.R.energy_load.html(h, loads[0], { refresher() {} });
  assert.doesNotMatch(row, /data-act=/);          // no tick, no On / Off button …
  assert.match(row, /class="onoff ro on">On</);   // … but the state and the tick still show
  assert.match(row, /lt-b ro tk/);
  const pop = await answer(() => hv.R.energy_outage.action(h, spec, tile, 'tap', evAct('off')), true);
  assert.equal(pop, null);
  await answer(() => hv.R.energy_load.action(h, loads[0], tile, 'tap', evAct('off')), true);
  assert.deepEqual(calls(h), []);
});

test('a row\'s On / Off asks first and says what the device draws; it turns off what it said, not a toggle', async () => {
  const { h, loads } = await outageHome(undefined);
  const pump = loads[0];
  let pop = await answer(() => hv.R.energy_load.action(h, pump, tile, 'tap', evAct('off')), false);
  assert.match(pop.innerHTML, /Turn off pond pump\?/);
  assert.match(pop.innerHTML, /On · draws 0\.72 kW/);
  assert.deepEqual(calls(h), []);
  pop = await answer(() => hv.R.energy_load.action(h, pump, tile, 'tap', evAct('off')), true);
  assert.deepEqual(calls(h), [{ service: 'homeassistant.turn_off', data: {}, target: { entity_id: 'switch.pond_pump' } }]);
  // offline: its details, nothing switched
  const off = { kind: 'energy_load', stat: 'sensor.pump_b_energy', ...hv.pairLoad(h, 'sensor.pump_b_energy'), name: 'pump b', outage: hv.outageOpts({}), row: true };
  assert.match(hv.R.energy_load.html(h, off, { refresher() {} }), /Offline/);
  h._sent.length = 0;
  pop = await answer(() => hv.R.energy_load.action(h, off, tile, 'tap', evAct('on')), true);
  assert.equal(pop, null);
  assert.deepEqual(calls(h), []);
});

test('a tick is the label on the switch (one list at most per device); nothing is switched', async () => {
  const { h, loads } = await outageHome({ on_label: 'Outage: turn on' });
  const fridge = loads[1], heater = loads[2];
  await hv.R.energy_load.action(h, fridge, tile, 'tap', evAct('tick'));    // untick
  await hv.R.energy_load.action(h, heater, tile, 'tap', evAct('tick'));    // "turn on" → "turn off"
  const upd = h._sent.filter((m) => m.type === 'config/entity_registry/update');
  assert.deepEqual(upd.map((m) => [m.entity_id, m.labels]), [['switch.beer_fridge', []], ['switch.heater', ['outage_turn_off']]]);
  assert.deepEqual(calls(h), []);
  // a pump ticked on its fan (the light / fan made from the switch) counts, and unticking clears both
  h.entities['switch.pond_pump'].labels = []; h.entities['fan.pond_pump'].labels = ['outage_turn_off'];
  assert.equal(hv.hasLabel(h, loads[0], 'outage_turn_off'), true);
  h._sent.length = 0;
  await hv.R.energy_load.action(h, loads[0], tile, 'tap', evAct('tick'));
  assert.deepEqual(h._sent.filter((m) => m.type === 'config/entity_registry/update').map((m) => [m.entity_id, m.labels]), [['fan.pond_pump', []]]);
});

test('the label: found by its id or its name; made on the first tick when missing', async () => {
  const h = home({ labels: [] });
  await hv.readLabels(h);
  assert.equal(hv.findLabel('outage_turn_off'), null);
  const o = hv.outageOpts({ outage: { label: 'outage_turn_off' } });
  const row = { kind: 'energy_load', stat: 'sensor.kettle_energy', ...hv.pairLoad(h, 'sensor.kettle_energy'), name: 'kettle', outage: o, row: true };
  await hv.R.energy_load.action(h, row, tile, 'tap', evAct('tick'));
  const made = h._sent.find((m) => m.type === 'config/label_registry/create');
  assert.equal(made.name, 'Outage turn off');   // Home Assistant gives that name the id outage_turn_off
  const h2 = home();
  await hv.readLabels(h2);
  assert.equal(hv.findLabel('outage_turn_off'), 'outage_turn_off');
  assert.equal(hv.findLabel('outage: TURN OFF'), 'outage_turn_off');
});

test('energy.outage: false — the devices without the outage part', async () => {
  const { h, loads } = await outageHome(false);
  const html = hv.R.energy_outage.html(h, { grid: null, outage: hv.outageOpts({ outage: false }), loads, more: true, total: 12 });
  assert.match(html, /Devices today/);
  assert.doesNotMatch(html, /Power outage|Turn off ticked/);
  assert.match(html, /Show all 12/);
  assert.doesNotMatch(hv.R.energy_load.html(h, { ...loads[0], outage: hv.outageOpts({ outage: false }) }, { refresher() {} }), /data-act="tick"/);
});

test('every row keeps its icon in one column: an empty slot where a row has no tick (found live 2026-11-13)', async () => {
  const slots = (html) => (html.match(/class="lt-b[ "]/g) || []).length;
  const row = (h, l) => hv.R.energy_load.html(h, l, { refresher() {} });
  // a non-admin sees marks only on the ticked rows; the others get an empty slot of the same width
  let { h, loads } = await outageHome({ off_action: 'script.outage_shed' }, { admin: false });
  const pump = row(h, loads[0]), freezer = row(h, loads[3]);
  assert.match(pump, /lt-b ro tk/);
  assert.match(freezer, /<span class="lt-b ro" aria-hidden="true"><\/span>/);
  assert.equal(slots(pump), slots(freezer));
  // an admin: a row without a switch gets as many empty slots as a row has tick buttons (one per label)
  ({ h, loads } = await outageHome({ on_label: 'Outage: turn on' }));
  const strip = { kind: 'energy_load', stat: 'sensor.strip_energy_1', ...hv.pairLoad(h, 'sensor.strip_energy_1'), name: 'strip', outage: loads[0].outage, row: true };
  assert.equal(strip.sw, null);
  assert.equal(slots(row(h, strip)), 2);
  assert.equal(slots(row(h, loads[0])), 2);
  ({ h, loads } = await outageHome(undefined));
  assert.equal(slots(row(h, { ...strip, outage: loads[0].outage })), 1);
  assert.equal(slots(row(h, loads[0])), 1);
  // energy.outage: false — no tick column at all
  assert.equal(slots(row(h, { ...loads[0], outage: hv.outageOpts({ outage: false }) })), 0);
  assert.equal(slots(row(h, { ...strip, outage: hv.outageOpts({ outage: false }) })), 0);
});

test('a value that rounds to zero has no minus sign ("-0.00 kWh" seen live on a meter that stepped back)', () => {
  assert.equal(hv.fmt(-0.0004, 2), '0.00');
  assert.equal(hv.fmt(-0.3, 0), '0');
  assert.equal(hv.fmt(-0, 1), '0.0');
  assert.equal(hv.fmt(-0.006, 2), '-0.01');   // a real negative keeps its sign
  assert.equal(hv.fmt(-12.5, 1), '-12.5');
  assert.equal(hv.fmt(0.004, 2), '0.00');
  assert.equal(hv.fmt(null), '—');
  assert.equal(hv.fmtKw(-0.2), '0.000 kW');
  assert.equal(hv.fmtKw(-1500), '-1.50 kW');   // was "-1.500 kW": every negative got three decimals
  assert.equal(hv.fmtKw(720), '0.72 kW');
  assert.equal(hv.fmtKw(5), '0.005 kW');
});
