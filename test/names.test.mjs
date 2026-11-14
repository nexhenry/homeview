// 0.9.1 (unreleased): cleaner names in the pills, their pop-ups and the "are you sure?" sheets.
// 1. an entity named only for its kind ("Moisture") is called by its device; 2. no state word twice;
// 3. the doors pill drops a last "Sensor" / "Contact", the locks pill a last "Lock". Made-up home.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadHomeView, makeHass } from './harness.mjs';

const hv = await loadHomeView();
// a made-up home: a leak sensor named for its kind, a door contact, a door lock, a battery, a light
function home({ fen = true } = {}) {
  const h = makeHass({ extra: {
    'binary_sensor.basement_leak_moisture': { state: 'on', attributes: { friendly_name: 'Basement Water Leak Moisture', device_class: 'moisture' }, device: 'basement', area: 'garage' },
    'binary_sensor.side_door_contact': { state: 'on', attributes: { friendly_name: 'Front Door Sensor', device_class: 'door' }, device: 'frontdoor', area: 'entry' },
    'binary_sensor.shed_door_open': { state: 'on', attributes: { friendly_name: 'Shed Door Open', device_class: 'door' }, area: 'garage' },
    'binary_sensor.lonely': { state: 'on', attributes: { friendly_name: 'Sensor', device_class: 'door' } },
    'lock.back_door': { state: 'unlocked', attributes: { friendly_name: 'Back Door Lock' }, device: 'backlock', area: 'entry' },
    'lock.gate': { state: 'unlocked', attributes: { friendly_name: 'Lock' } },
    'sensor.basement_leak_battery': { state: '12', attributes: { friendly_name: 'Basement Water Leak Battery', device_class: 'battery', unit_of_measurement: '%' }, device: 'basement', area: 'garage' },
    'sensor.fridge_power': { state: '120', attributes: { friendly_name: 'Fridge Plug Power', device_class: 'power', unit_of_measurement: 'W' }, device: 'plug' },
    'light.hall_light': { state: 'on', attributes: { friendly_name: 'Hall Ceiling Light' }, device: 'hall' },
  } });
  Object.assign(h.devices.basement, { name: 'Basement Water Leak' });
  Object.assign(h.devices.frontdoor, { name: 'Front Door Sensor' });
  Object.assign(h.devices.backlock, { name: 'Back Door' });
  Object.assign(h.devices.plug, { name: 'Fridge Plug' });
  Object.assign(h.devices.hall, { name: 'Hall Ceiling' });
  h.entities['binary_sensor.basement_leak_moisture'].has_entity_name = true; h.entities['binary_sensor.basement_leak_moisture'].name = 'Moisture';
  // Home Assistant 2025.x+: the entity's own part and the device's, as the frontend works them out
  if (fen) h.formatEntityName = (st, item) => {
    const e = h.entities[st.entity_id], d = e?.device_id && h.devices[e.device_id], dn = d ? d.name_by_user || d.name : '';
    const full = st.attributes.friendly_name;
    if (item.type === 'device') return dn;
    return dn && full.startsWith(`${dn} `) ? full.slice(dn.length + 1) : full;
  };
  return h;
}

test('rule 1: named only for its kind → its device (formatEntityName, else the registry); others keep their names', () => {
  for (const fen of [true, false]) {
    const h = home({ fen });
    assert.equal(hv.cleanName(h, 'binary_sensor.basement_leak_moisture'), 'Basement Water Leak', `moisture (${fen ? 'formatEntityName' : 'registry'})`);
    assert.equal(hv.cleanName(h, 'sensor.basement_leak_battery'), 'Basement Water Leak', 'battery');
    assert.equal(hv.cleanName(h, 'lock.back_door'), 'Back Door', 'a lock named Lock');
    assert.equal(hv.cleanName(h, 'sensor.fridge_power'), 'Fridge Plug Power', 'power is not a kind word here');
    assert.equal(hv.cleanName(h, 'light.hall_light'), 'Hall Ceiling Light', 'lights keep their names');
    assert.equal(hv.cleanName(h, 'binary_sensor.shed_door_open'), 'Shed Door Open', 'no device: as it is');
  }
  // only the registry's own name, the friendly name not starting with the device's: has_entity_name + name
  const h = home({ fen: false });
  h.states['binary_sensor.basement_leak_moisture'].attributes.friendly_name = 'Leak Moisture';
  assert.equal(hv.cleanName(h, 'binary_sensor.basement_leak_moisture'), 'Basement Water Leak');
  // a formatEntityName of another shape (throws, or no strings): the registry, never an error
  const h2 = home(); h2.formatEntityName = () => { throw new Error('old'); };
  assert.equal(hv.cleanName(h2, 'binary_sensor.basement_leak_moisture'), 'Basement Water Leak');
  const h3 = home(); h3.formatEntityName = () => undefined;
  assert.equal(hv.cleanName(h3, 'binary_sensor.basement_leak_moisture'), 'Basement Water Leak');
});

test('rule 2: no state word after a name that ends with it (any case); a word inside another stays', () => {
  assert.equal(hv.plusWord('Garage Door Open', 'open'), 'Garage Door Open');
  assert.equal(hv.plusWord('Back Door', 'open'), 'Back Door open');
  assert.equal(hv.plusWord('Side Gate UNLOCKED', 'unlocked'), 'Side Gate UNLOCKED');
  assert.equal(hv.plusWord('Reopen', 'open'), 'Reopen open');
  assert.equal(hv.plusWord('Shed Sensor', 'offline'), 'Shed Sensor offline');
});

test('rule 3 and the pills: doors drop "Sensor" / "Contact", locks drop "Lock", only when something is left', () => {
  const h = home(), cfg = {};
  const m = { openings: ['binary_sensor.side_door_contact'], byDomain: { lock: ['lock.back_door'] }, safety: ['binary_sensor.basement_leak_moisture'], batteries: ['sensor.basement_leak_battery'] };
  assert.equal(hv.PILLS.openings(h, m, cfg).text, 'Front Door open');
  assert.equal(hv.PILLS.openings(h, { ...m, openings: ['binary_sensor.shed_door_open'] }, cfg).text, 'Shed Door Open');
  assert.equal(hv.PILLS.openings(h, { ...m, openings: ['binary_sensor.lonely'] }, cfg).text, 'Sensor open');
  assert.equal(hv.PILLS.locks(h, m, cfg).text, 'Back Door unlocked');
  assert.equal(hv.PILLS.locks(h, { ...m, byDomain: { lock: ['lock.gate'] } }, cfg).text, 'Lock unlocked');
  assert.equal(hv.PILLS.safety(h, m, cfg).text, 'Basement Water Leak');
  // a name of your own (customize) is kept as you wrote it
  assert.equal(hv.PILLS.openings(h, m, { customize: { 'binary_sensor.side_door_contact': { name: 'Porch Door Contact' } } }).text, 'Porch Door Contact open');
  // offline: the same rules
  h.states['lock.back_door'] = { ...h.states['lock.back_door'], state: 'unavailable' };
  assert.equal(hv.PILLS.locks(h, m, cfg).text, 'Back Door offline');
  // the pop-ups get the cleaner names too
  assert.equal(hv.PILLS.openings(h, m, cfg).popup.clean, 'doors');
  assert.equal(hv.PILLS.locks(h, m, cfg).popup.clean, 'locks');
  assert.equal(hv.PILLS.safety(h, m, cfg).popup.clean, true);
  assert.equal(hv.PILLS.batteries(h, m, cfg).popup.clean, true);
});

test('pop-up rows: the cleaner name, less its room; a battery row by its device; other tiles unchanged', () => {
  const h = home();
  const row = (id, extra) => hv.R.entity.html(h, { kind: 'entity', entity: id, row: true, showRoom: true, ...extra });
  assert.match(row('binary_sensor.side_door_contact', { clean: 'doors', areaName: 'Entry' }), /<div class="nm">Front Door<\/div>/);
  assert.match(row('lock.back_door', { clean: 'locks', areaName: 'Entry' }), /<div class="nm">Back Door<\/div>/);
  assert.match(row('sensor.basement_leak_battery', { clean: true, areaName: 'Garage' }), /<div class="sb">Basement Water Leak · Garage<\/div>/);
  assert.match(row('binary_sensor.side_door_contact', { areaName: 'Entry' }), /<div class="nm">Front Door Sensor<\/div>/, 'without clean: as before');
});

test('the "are you sure?" sheets: the cleaner name, a lock without its "Lock"', () => {
  const h = home();
  assert.equal(hv.confirmName(h, 'lock.back_door'), 'Back Door');
  assert.equal(hv.confirmName(h, 'lock.gate'), 'Lock');
  assert.equal(hv.confirmName(h, 'light.hall_light'), 'Hall Ceiling Light');
  // both confirm sites (entity tiles, control chips) use it
  const SRC = hv.R.entity.action.toString();
  assert.match(SRC, /confirmName\(h, s\.entity\)/);
});
