// Loads dist/homeview.js in Node behind a few browser stubs, so its logic can be tested without a
// browser: the model, the page builders, every tile renderer, the alert rules, saving the edits and
// the strategy's generate(). Nothing here talks to a Home Assistant: `hass` is built from plain data.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ---- browser stubs: enough for the module to load and for tiles / pages to draw into strings ----
class ClassList {
  constructor() { this.s = new Set(); }
  add(...c) { c.forEach((x) => this.s.add(x)); }
  remove(...c) { c.forEach((x) => this.s.delete(x)); }
  contains(c) { return this.s.has(c); }
  toggle(c, on) { const want = on === undefined ? !this.s.has(c) : !!on; if (want) this.s.add(c); else this.s.delete(c); return want; }
}
export class El {
  constructor(tag = 'div') {
    this.localName = tag; this.style = { setProperty() {}, removeProperty() {} }; this.dataset = {}; this.children = [];
    this.attrs = {}; this.classList = new ClassList(); this.innerHTML = ''; this.textContent = ''; this.isConnected = false;
  }
  attachShadow() { this.shadowRoot = new El('#shadow'); this.shadowRoot.host = this; return this.shadowRoot; }
  appendChild(c) { this.children.push(c); return c; }
  replaceChildren(...c) { this.children = c; }
  remove() {}
  addEventListener(t, f) { (this._l = this._l || {})[t] = [...(this._l[t] || []), f]; }
  removeEventListener() {} dispatchEvent() { return true; }
  fire(t, e = {}) { (this._l?.[t] || []).forEach((f) => f({ target: this, composedPath: () => [this], ...e })); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  hasAttribute(k) { return k in this.attrs; }
  removeAttribute(k) { delete this.attrs[k]; }
  insertAdjacentHTML(_, html) { this.innerHTML += html; }
  querySelector(sel) { return this._q?.[sel] ?? null; }
  querySelectorAll() { return []; }
  getRootNode() { return this; }
  getBoundingClientRect() { return { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 }; }
  get firstElementChild() { return null; }
  get childElementCount() { return this.children.length; }
}
const store = () => ({ _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); }, removeItem(k) { delete this._d[k]; } });

export const win = {
  innerWidth: 1280, innerHeight: 800, scrollY: 0, maxTouchPoints: 0,
};
function installStubs() {
  globalThis.HTMLElement = El;
  globalThis.customElements = { _m: new Map(), get(n) { return this._m.get(n); }, define(n, c) { this._m.set(n, c); }, whenDefined() { return new Promise(() => {}); } };
  globalThis.window = globalThis;
  Object.defineProperty(globalThis, 'innerWidth', { get: () => win.innerWidth, configurable: true });
  Object.defineProperty(globalThis, 'innerHeight', { get: () => win.innerHeight, configurable: true });
  globalThis.scrollY = 0;
  Object.defineProperty(globalThis, 'navigator', { value: { get maxTouchPoints() { return win.maxTouchPoints; }, vibrate() {} }, configurable: true });
  globalThis.screen = { width: 1280, height: 800 };
  globalThis.document = { createElement: (t) => new El(t), createDocumentFragment: () => new El('#fragment'), querySelector: () => null,
    addEventListener() {}, visibilityState: 'visible', fonts: null, body: new El('body') };
  globalThis.location = { pathname: '/test-dash/home', search: '' };
  globalThis.localStorage = store(); globalThis.sessionStorage = store();
  globalThis.history = { length: 1, pushed: [], pushState(_, __, url) { this.pushed.push(['push', url]); }, replaceState(_, __, url) { this.pushed.push(['replace', url]); } };
  globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {}; globalThis.dispatchEvent = () => true;
  globalThis.requestAnimationFrame = (f) => setTimeout(f, 0); globalThis.cancelAnimationFrame = (t) => clearTimeout(t);
  globalThis.getComputedStyle = () => ({ marginBottom: '0', paddingBottom: '0', gridTemplateColumns: '' });
  globalThis.matchMedia = () => ({ matches: false });
  if (!globalThis.CustomEvent) globalThis.CustomEvent = class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } };
  globalThis.confirm = () => { throw new Error('window.confirm() was called'); };
}

// every top-level name the tests use; the loader appends `export { … }` to a copy of the file
const EXPORTS = ['HV_VERSION', 'buildModel', 'R', 'PILLS', 'PAGES', 'userTile', 'userSections', 'oddTiles', 'customPages', 'expandVars',
  'missingEntities', 'pageAlerts', 'applyEdits', 'diffOptions', 'loadEdits', 'saveStrategy', 'settingsDraft', 'newerVer', 'parseSize',
  'cached', 'energyPower', 'joinWeekends', 'stateText', 'comfortOf', 'palette', 'TEXT_TONES', 'ROOM_HUES', 'COLOR_HUES', 'chipsAuto',
  'chipLook', 'phoneFavorites', 'isOffline', 'USER_TILE_TYPES', 'HomeViewTile', 'HomeViewPage', 'HomeViewStrategy', 'desktopTablet',
  'layoutHeight', 'hvConfirm', 'pairLoad', 'gridState', 'outageOpts', 'readLabels', 'findLabel', 'hasLabel', 'isNight', 'isDark', 'startPage',
  'nightPalette', 'TOGGLES', 'HV_TONES', 'swipeStep', 'ownsSideways', 'cardHass', 'HA_VARS', 'haTokens', 'haPrimary', 'navigate', 'PAGE_CSS',
  'fmt', 'fmtKw', 'calendarDays', 'calendarSheetHtml', 'calendarColors', 'openCalendar', 'filterEvents', 'getEvents', 'flowCardConfig',
  'flowOutage', 'mergeOpts', 'fullscreenCapable', 'isFullscreen', 'personLocated', 'locationStaleMinutes', 'personBattery',
  'cleanName', 'nameFor', 'plusWord', 'confirmName', 'nameParts'];

let loaded = null;
export async function loadHomeView() {
  if (loaded) return loaded;
  installStubs();
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '..', 'dist', 'homeview.js'), 'utf8');
  const dir = mkdtempSync(join(tmpdir(), 'homeview-test-'));
  const file = join(dir, 'homeview.mjs');
  writeFileSync(file, `${src}\nexport { ${EXPORTS.join(', ')} };\n`);
  const info = console.info; console.info = () => {};
  try { loaded = await import(pathToFileURL(file).href); } finally { console.info = info; }
  return loaded;
}

// ---- a made-up home (no real data): areas, devices, states and the registries ----
const now = () => new Date().toISOString();
export function makeHass({ admin = true, user = 'u-alex', name = 'Alex', extra = {}, ws = null } = {}) {
  const states = {}, entities = {}, devices = {};
  const areas = {
    entry: { area_id: 'entry', name: 'Entry', floor_id: null }, kitchen: { area_id: 'kitchen', name: 'Kitchen', floor_id: null },
    living_room: { area_id: 'living_room', name: 'Living Room', floor_id: null }, bathroom: { area_id: 'bathroom', name: 'Bathroom', floor_id: null },
    garage: { area_id: 'garage', name: 'Garage', floor_id: null }, bedroom_zoe: { area_id: 'bedroom_zoe', name: 'Bedroom Zoe', floor_id: null },
  };
  const add = (id, state, attrs = {}, area = null, dev = null) => {
    states[id] = { entity_id: id, state, attributes: { friendly_name: id.split('.')[1].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), ...attrs },
      last_changed: now(), last_updated: now() };
    entities[id] = { entity_id: id, area_id: area, device_id: dev, entity_category: null, hidden: false, labels: [], platform: 'demo' };
    if (dev && !devices[dev]) devices[dev] = { id: dev, area_id: area, name: dev };
  };
  add('lock.front_door', 'locked', { friendly_name: 'Front Door' }, 'entry');
  add('cover.garage_door', 'closed', { friendly_name: 'Garage Door', device_class: 'garage' }, 'garage');
  add('light.kitchen_main', 'on', { friendly_name: 'Kitchen Main', brightness: 178 }, 'kitchen');
  add('light.kitchen_light', 'off', { friendly_name: 'Kitchen Light' }, 'kitchen');
  add('light.living_room_lamp', 'unavailable', { friendly_name: 'Living Room Lamp' }, 'living_room');
  add('light.bedroom_zoe', 'off', { friendly_name: 'Bedroom Zoe Light' }, 'bedroom_zoe');
  add('binary_sensor.back_door', 'on', { friendly_name: 'Back Door', device_class: 'door' }, 'entry');
  add('binary_sensor.kitchen_leak', 'off', { friendly_name: 'Kitchen Leak', device_class: 'moisture' }, 'kitchen');
  add('sensor.kitchen_leak_battery', '85', { friendly_name: 'Kitchen Leak Battery', device_class: 'battery', unit_of_measurement: '%' }, 'kitchen');
  add('sensor.bathroom_leak_battery', '12', { friendly_name: 'Bathroom Leak Battery', device_class: 'battery', unit_of_measurement: '%' }, 'bathroom');
  add('sensor.kitchen_temperature', '71.5', { device_class: 'temperature', unit_of_measurement: '°F' }, 'kitchen');
  add('switch.pump_a', 'on', { friendly_name: 'Pump A' }, null, 'plug_a');
  add('sensor.pump_a_power', '720', { device_class: 'power', unit_of_measurement: 'W' }, null, 'plug_a');
  add('switch.pump_b', 'unavailable', { friendly_name: 'Pump B' }, null, 'plug_b');
  add('scene.movie_night', 'unknown', { friendly_name: 'Movie Night' }, 'living_room');
  add('weather.home', 'sunny', { temperature: 64, humidity: 40 });
  add('calendar.shared', 'off', { friendly_name: 'Family' });
  add('camera.doorstep', 'idle', { friendly_name: 'Doorstep', entity_picture: '/api/camera_proxy/camera.doorstep' }, 'entry');
  add('person.alex', 'home', { friendly_name: 'Alex', device_trackers: ['device_tracker.alex_phone'], user_id: 'u-alex' });
  add('person.zoe', 'not_home', { friendly_name: 'Zoe', device_trackers: ['device_tracker.zoe_phone'], user_id: 'u-zoe' });
  add('sun.sun', 'above_horizon', { next_rising: now(), next_setting: now() });
  for (const [id, v] of Object.entries(extra)) if (v === null) { delete states[id]; delete entities[id]; } else add(id, v.state, v.attributes || {}, v.area ?? null, v.device ?? null);
  const sent = [];
  const hass = {
    states, entities, devices, areas, floors: {}, user: { id: user, name, is_admin: admin }, locale: { language: 'en' }, themes: { darkMode: false },
    config: { unit_system: { temperature: '°F' }, location_name: 'Home', state: 'RUNNING' }, panels: {},
    // Home Assistant's own state words, as far as the tests need them
    formatEntityState: (st) => {
      const dc = st.attributes?.device_class;
      if (st.entity_id.startsWith('binary_sensor.') && ['door', 'window', 'opening', 'garage_door'].includes(dc)) return st.state === 'on' ? 'Open' : 'Closed';
      if (st.entity_id.startsWith('binary_sensor.') && dc === 'moisture') return st.state === 'on' ? 'Wet' : 'Dry';
      if (st.attributes?.unit_of_measurement) return `${st.state} ${st.attributes.unit_of_measurement}`;
      return { on: 'On', off: 'Off', locked: 'Locked', unlocked: 'Unlocked', closed: 'Closed', open: 'Open' }[st.state] ?? st.state;
    },
    callService: async (domain, service, data, target) => { sent.push({ type: 'call_service', domain, service, data, target }); },
    callApi: async () => [],
    connection: { sendMessagePromise: async (m) => { sent.push(m); if (ws) return ws(m); return m.type === 'energy/get_prefs' ? { energy_sources: [], device_consumption: [] } : null; } },
    _sent: sent,
  };
  return hass;
}
