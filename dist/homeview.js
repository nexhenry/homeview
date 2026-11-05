/*!
 * HomeView — an Apple-Home-style dashboard for Home Assistant, generated from your home.
 * https://github.com/nexhenry/homeview · MIT License
 *
 * One file, no other cards needed. Use it as a dashboard strategy:
 *
 *   strategy:
 *     type: custom:homeview
 *
 * HomeView reads your areas, floors, devices and entities and builds the pages itself:
 * Home, Widgets, Family, Rooms (plus one page per room), Energy and Cameras. Everything is
 * optional and can be tuned in the strategy config — see README.md.
 */
const HV_VERSION = '0.3.0';

/* ============================================================================================
 * Constants
 * ========================================================================================== */

const PAGE_DEFS = {
  home:    { title: 'Home',    icon: 'mdi:home',                    hue: 28 },
  widgets: { title: 'Widgets', icon: 'mdi:view-dashboard-variant',  hue: 200, sat: 0.35 },
  family:  { title: 'Family',  icon: 'mdi:account-group',           hue: 265 },
  rooms:   { title: 'Rooms',   icon: 'mdi:sofa',                    hue: 110 },
  energy:  { title: 'Energy',  icon: 'mdi:lightning-bolt',          hue: 42 },
  cameras: { title: 'Cameras', icon: 'mdi:cctv',                    hue: 215, sat: 0.4 },
};
const DEFAULT_PAGES = ['home', 'widgets', 'family', 'rooms', 'energy', 'cameras'];

// Room tints, assigned in order to rooms without their own colour
const ROOM_HUES = [28, 110, 45, 205, 265, 335, 170, 15, 230, 80];
const COLOR_HUES = {
  red: 4, orange: 28, amber: 40, yellow: 50, lime: 80, green: 110, teal: 170, cyan: 190,
  blue: 210, indigo: 235, purple: 265, pink: 335, brown: 25, gray: 220, grey: 220,
  // Home Assistant's colour picker names
  primary: 210, accent: 28, 'deep-purple': 255, 'light-blue': 200, 'light-green': 95,
  'deep-orange': 15, 'blue-grey': 205,
};
// the order the on-dashboard editor cycles room colours in
const COLOR_CYCLE = ['orange', 'green', 'amber', 'blue', 'purple', 'pink', 'teal', 'red', 'indigo', 'lime', 'brown', 'cyan'];

// every strategy option (anything else is reported as a likely typo)
const KNOWN_OPTIONS = ['type', 'title', 'theme', 'pages', 'pages_config', 'room_order', 'hide_rooms', 'rooms',
  'exclude_entities', 'customize', 'people', 'calendars', 'weather', 'cameras', 'home', 'pills', 'battery_low',
  'people_chips', 'energy', 'tile_size', 'max_columns', 'swipe', 'custom_pages', 'edit_button', 'update_notice',
  'kiosk', 'kiosk_chip'];

// What a room page / room row shows, in this order
const ROOM_GROUPS = [
  { id: 'lights',  title: 'Lights',           domains: ['light'] },
  { id: 'climate', title: 'Climate',          domains: ['climate', 'fan', 'humidifier', 'water_heater'] },
  { id: 'secure',  title: 'Doors & Security', domains: ['lock', 'cover', 'valve', 'alarm_control_panel'] },
  { id: 'media',   title: 'Media',            domains: ['media_player'] },
  { id: 'devices', title: 'Devices',          domains: ['vacuum', 'lawn_mower', 'switch', 'input_boolean'] },
  { id: 'scenes',  title: 'Scenes',           domains: ['scene', 'script'] },
  { id: 'cameras', title: 'Cameras',          domains: ['camera'] },
  { id: 'sensors', title: 'Sensors',          domains: ['binary_sensor', 'sensor'] },
];
// Rooms rows (Rooms page) show only these
const ROOM_ROW_DOMAINS = ['light', 'climate', 'fan', 'lock', 'cover', 'media_player', 'vacuum', 'humidifier'];

const OPENING_CLASSES = ['door', 'window', 'garage_door', 'opening'];
const SAFETY_CLASSES = ['moisture', 'smoke', 'gas', 'carbon_monoxide'];
const SENSOR_CLASSES = ['temperature', 'humidity', 'illuminance', 'carbon_dioxide', 'pm25', 'aqi',
  'volatile_organic_compounds', 'power', 'motion', 'occupancy', 'presence', ...OPENING_CLASSES, ...SAFETY_CLASSES];

const ROOM_ICONS = [
  [/kitchen/i, 'mdi:countertop-outline'], [/living|lounge|family/i, 'mdi:sofa-outline'],
  [/dining/i, 'mdi:silverware-fork-knife'], [/bath|shower|toilet|wc|powder/i, 'mdi:shower'],
  [/nursery|kid|child|baby/i, 'mdi:teddy-bear'], [/bed|master|guest/i, 'mdi:bed-outline'],
  [/office|study|work/i, 'mdi:desk'], [/garage/i, 'mdi:garage'], [/laundry|utility/i, 'mdi:washing-machine'],
  [/hall|entry|foyer|stair/i, 'mdi:door'], [/garden|yard|patio|deck|porch|outdoor|pool|backyard|front/i, 'mdi:flower-outline'],
  [/basement|attic|storage/i, 'mdi:home-floor-b'], [/gym/i, 'mdi:dumbbell'], [/theater|cinema|media|tv/i, 'mdi:theater'],
];

const WEATHER = {
  'clear-night': ['Clear', 'mdi:weather-night'], cloudy: ['Cloudy', 'mdi:weather-cloudy'],
  exceptional: ['Exceptional', 'mdi:alert-circle-outline'], fog: ['Fog', 'mdi:weather-fog'],
  hail: ['Hail', 'mdi:weather-hail'], lightning: ['Lightning', 'mdi:weather-lightning'],
  'lightning-rainy': ['Thunderstorms', 'mdi:weather-lightning-rainy'], partlycloudy: ['Partly cloudy', 'mdi:weather-partly-cloudy'],
  pouring: ['Pouring', 'mdi:weather-pouring'], rainy: ['Rain', 'mdi:weather-rainy'], snowy: ['Snow', 'mdi:weather-snowy'],
  'snowy-rainy': ['Sleet', 'mdi:weather-snowy-rainy'], sunny: ['Sunny', 'mdi:weather-sunny'],
  windy: ['Windy', 'mdi:weather-windy'], 'windy-variant': ['Windy', 'mdi:weather-windy-variant'],
};

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Roboto, sans-serif";
const UNAVAILABLE = ['unavailable', 'unknown'];

/* ============================================================================================
 * Small helpers
 * ========================================================================================== */

const domainOf = (id) => id.split('.')[0];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
const fmt = (v, d = 0) => (v === null || v === undefined ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d }));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const asList = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);

/** "2x1", [2, 1] or 2 -> [w, h] */
function parseSize(v, fallback = null) {
  if (Array.isArray(v)) return [Number(v[0]) || 1, Number(v[1]) || 1];
  if (typeof v === 'number') return [v, 1];
  if (typeof v === 'string') { const m = v.trim().match(/^(\d+)\s*[x×*]\s*(\d+)$/i); if (m) return [+m[1], +m[2]]; }
  return fallback;
}

/** Drop empty strings / lists / objects so saved configs stay tidy. */
const KEEP_EMPTY = new Set(['favorites']);
function cleanConfig(v) {
  if (Array.isArray(v)) return v.map(cleanConfig).filter((x) => x !== undefined);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, x] of Object.entries(v)) {
      const c = cleanConfig(x);
      if (KEEP_EMPTY.has(k) && Array.isArray(c)) { out[k] = c; continue; }
      if (c === undefined || c === null || c === '' || (Array.isArray(c) && !c.length)
          || (typeof c === 'object' && !Array.isArray(c) && !Object.keys(c).length)) continue;
      out[k] = c;
    }
    return out;
  }
  return v;
}

/** Minimal YAML writer (for showing a config to copy into a YAML dashboard). */
function toYaml(v, ind = '') {
  const scalar = (x) => (typeof x === 'string' && (x === '' || /[:#\[\]{},&*!|>'"%@`]|^\s|\s$|^(true|false|yes|no|null|on|off|[-\d.]+)$/i.test(x)) ? JSON.stringify(x) : String(x));
  if (Array.isArray(v)) {
    if (!v.length) return ' []';
    if (v.every((x) => typeof x !== 'object' || x === null) && v.join(', ').length < 60) return ` [${v.map(scalar).join(', ')}]`;
    return v.map((x) => (typeof x === 'object' && x !== null ? `\n${ind}- ${toYaml(x, ind + '  ').trimStart()}` : `\n${ind}- ${scalar(x)}`)).join('');
  }
  if (v && typeof v === 'object') {
    const keys = Object.keys(v);
    if (!keys.length) return ' {}';
    return keys.map((k) => {
      const x = v[k];
      const body = typeof x === 'object' && x !== null ? toYaml(x, ind + '  ') : ` ${scalar(x)}`;
      return `\n${ind}${k}:${body}`;
    }).join('');
  }
  return ` ${scalar(v)}`;
}

function hueOf(color, fallback) {
  if (typeof color === 'number') return color;
  if (typeof color === 'string' && color in COLOR_HUES) return COLOR_HUES[color];
  return fallback;
}

/** CSS variables for one tint (page or room). */
function palette(h, dark, sat = 1) {
  if (!dark) {
    return {
      '--hv-bg': `linear-gradient(180deg, hsl(${h} ${70 * sat}% 98.5%) 0%, hsl(${h} ${50 * sat}% 94.5%) 100%)`,
      '--hv-tile': `hsl(${h} ${34 * sat}% 92%)`,
      '--hv-tile-border': `hsla(${h}, 40%, 25%, 0.08)`,
      '--hv-tile-on': `hsl(${h} ${72 * sat}% 86%)`,
      '--hv-icon': `hsl(${h} ${18 * sat}% 42%)`,
      '--hv-fg': `hsl(${h} 25% 16%)`,
      '--hv-fg2': `hsl(${h} 12% 46%)`,
      '--hv-on-fg': `hsl(${h} 65% 26%)`,
      '--hv-on-fg2': `hsl(${h} 40% 46%)`,
      '--hv-accent': `hsl(${h} 78% 50%)`,
      '--hv-pill': `hsl(${h} ${32 * sat}% 90%)`,
      '--hv-line': `hsla(${h}, 30%, 25%, 0.14)`,
      '--hv-card': '#ffffff',
    };
  }
  return {
    '--hv-bg': `linear-gradient(180deg, hsl(${h} ${18 * sat}% 10%) 0%, hsl(${h} ${18 * sat}% 6%) 100%)`,
    '--hv-tile': `hsl(${h} ${10 * sat}% 16%)`,
    '--hv-tile-border': `hsla(${h}, 30%, 85%, 0.06)`,
    '--hv-tile-on': `hsl(${h} ${38 * sat}% 28%)`,
    '--hv-icon': `hsl(${h} ${12 * sat}% 66%)`,
    '--hv-fg': `hsl(${h} 15% 93%)`,
    '--hv-fg2': `hsl(${h} 8% 62%)`,
    '--hv-on-fg': `hsl(${h} 80% 90%)`,
    '--hv-on-fg2': `hsl(${h} 40% 76%)`,
    '--hv-accent': `hsl(${h} 82% 62%)`,
    '--hv-pill': `hsl(${h} ${10 * sat}% 19%)`,
    '--hv-line': `hsla(${h}, 20%, 85%, 0.12)`,
    '--hv-card': `hsl(${h} 8% 20%)`,
  };
}
const styleVars = (vars) => Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';');

function isDark(hass, cfg) {
  const t = cfg?.theme || 'auto';
  if (t === 'dark') return true;
  if (t === 'light') return false;
  return !!hass?.themes?.darkMode;
}

/**
 * HomeView's own update entity from HACS (update.homeview_update or similar), so admins can be
 * told on the dashboard when a new version is out.
 */
function findUpdateEntity(hass) {
  const regs = Object.values(hass.entities || {});
  const byReg = regs.find((e) => e.entity_id.startsWith('update.') && e.platform === 'hacs' && /homeview/i.test(e.entity_id));
  if (byReg) return byReg.entity_id;
  return Object.keys(hass.states).find((id) => id.startsWith('update.') && /homeview/i.test(id + (hass.states[id].attributes.friendly_name || ''))) || null;
}

/* ---- Kiosk mode: hide Home Assistant's header and sidebar while HomeView is on screen ----
 * On by default. The chip in HomeView's top bar turns it off / on for this device
 * (remembered in the browser); `?kiosk=off` / `?kiosk=on` in the URL does the same.
 * `kiosk: false` in the config turns it off for everyone. */
const KIOSK_ID = 'homeview-kiosk';
const KIOSK_CSS = {
  main: 'ha-drawer { --mdc-drawer-width: 0px !important; } ha-sidebar { display: none !important; }',
  // newer HA: .sidebar-shell + .app-content (padding); older HA: mwc-drawer's .mdc-drawer*
  drawer: '.sidebar-shell, .mdc-drawer { display: none !important; } '
    + '.app-content { padding-left: 0 !important; padding-inline-start: 0 !important; } '
    + '.mdc-drawer-app-content { margin-left: 0 !important; margin-inline-start: 0 !important; width: 100% !important; }',
  root: '.header { display: none !important; } hui-view-container, #view { padding-top: 0 !important; min-height: 100vh !important; } :host { --header-height: 0px; }',
};
function haShadowRoots() {
  const main = document.querySelector('home-assistant')?.shadowRoot?.querySelector('home-assistant-main');
  const drawer = main?.shadowRoot?.querySelector('ha-drawer');
  const panel = main?.shadowRoot?.querySelector('partial-panel-resolver')?.querySelector('ha-panel-lovelace');
  return { main: main?.shadowRoot, drawer: drawer?.shadowRoot, root: panel?.shadowRoot?.querySelector('hui-root')?.shadowRoot };
}
function applyKiosk(on) {
  const roots = haShadowRoots();
  for (const [k, css] of Object.entries(KIOSK_CSS)) {
    const sr = roots[k];
    if (!sr) continue;
    let st = sr.querySelector(`#${KIOSK_ID}`);
    if (on) {
      if (!st) { st = document.createElement('style'); st.id = KIOSK_ID; sr.appendChild(st); }
      if (st.textContent !== css) st.textContent = css;
    } else st?.remove();
  }
  window.dispatchEvent(new Event('resize'));
}
function kioskWanted(cfg) {
  if (cfg?.kiosk === false) return false;
  try {
    const q = new URLSearchParams(location.search).get('kiosk');
    if (q === 'off' || q === '0' || q === 'false') localStorage.setItem('homeview-kiosk', 'off');
    if (q === 'on' || q === '1' || q === 'true') localStorage.removeItem('homeview-kiosk');
    return localStorage.getItem('homeview-kiosk') !== 'off';
  } catch (e) { return window.__homeviewKiosk !== false; }
}
function setKioskWanted(on) {
  try { if (on) localStorage.removeItem('homeview-kiosk'); else localStorage.setItem('homeview-kiosk', 'off'); } catch (e) { window.__homeviewKiosk = on; }
}
// pages on screen right now: kiosk styles come off when you leave HomeView for another dashboard
let hvPagesOnScreen = 0;

/** Navigate inside the dashboard (path relative to the dashboard URL). */
function navigate(path) {
  const base = '/' + location.pathname.split('/')[1];
  const url = path.startsWith('/') ? path : `${base}/${path}`;
  history.pushState(null, '', url);
  window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } }));
}

function moreInfo(node, entityId) {
  node.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId }, bubbles: true, composed: true }));
}

function relTime(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (!Number.isFinite(s)) return '';
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} d`;
}

const timeFmt = (d, hass) => d.toLocaleTimeString(hass?.locale?.language || undefined, { hour: 'numeric', minute: '2-digit' });

/* ============================================================================================
 * The home model: everything HomeView knows about the house, built from the registries
 * ========================================================================================== */

function entityArea(hass, id) {
  const e = hass.entities?.[id];
  if (!e) return null;
  if (e.area_id) return e.area_id;
  const d = e.device_id && hass.devices?.[e.device_id];
  return d?.area_id || null;
}

/** Name without the room / device prefix: "Kitchen Main Light" in Kitchen -> "Main Light". */
function shortName(hass, id, areaName) {
  const st = hass.states[id];
  const full = st?.attributes?.friendly_name || id.split('.')[1].replace(/_/g, ' ');
  if (areaName && full.toLowerCase().startsWith(areaName.toLowerCase() + ' ')) {
    const rest = full.slice(areaName.length).trim();
    if (rest) return rest.charAt(0).toUpperCase() + rest.slice(1);
  }
  return full;
}

function buildModel(hass, cfg) {
  const exclude = new Set(asList(cfg.exclude_entities));
  for (const [id, c] of Object.entries(cfg.customize || {})) if (c?.hidden) exclude.add(id);
  const roomCfg = cfg.rooms || {};
  const hiddenAreas = new Set(asList(cfg.hide_rooms));
  const model = {
    areas: [], areaById: {}, byDomain: {}, openings: [], safety: [], batteries: [], lights: [],
    persons: [], cameras: [], calendars: [], weather: null, unassigned: [],
  };

  // ---- rooms (areas), ordered by floor level, then config order, then name
  const floors = hass.floors || {};
  const order = asList(cfg.room_order);
  const areas = Object.values(hass.areas || {})
    .filter((a) => !hiddenAreas.has(a.area_id) && !(roomCfg[a.area_id]?.hidden))
    .sort((a, b) => {
      const oa = order.indexOf(a.area_id), ob = order.indexOf(b.area_id);
      if (oa !== -1 || ob !== -1) return (oa === -1 ? 999 : oa) - (ob === -1 ? 999 : ob);
      const fa = floors[a.floor_id]?.level ?? 0, fb = floors[b.floor_id]?.level ?? 0;
      return fa - fb || a.name.localeCompare(b.name);
    });
  areas.forEach((a, i) => {
    const rc = roomCfg[a.area_id] || {};
    const room = {
      id: a.area_id, name: rc.name || a.name, floor: a.floor_id ? floors[a.floor_id]?.name : null,
      icon: rc.icon || a.icon || (ROOM_ICONS.find(([re]) => re.test(a.name)) || [null, 'mdi:floor-plan'])[1],
      hue: hueOf(rc.color, ROOM_HUES[i % ROOM_HUES.length]),
      temp: rc.temperature || a.temperature_entity_id || null,
      hum: rc.humidity || a.humidity_entity_id || null,
      entities: [], groups: {}, alerts: [],
    };
    model.areas.push(room);
    model.areaById[a.area_id] = room;
  });

  // ---- entities
  for (const id of Object.keys(hass.states)) {
    if (exclude.has(id)) continue;
    const reg = hass.entities?.[id];
    if (reg?.hidden) continue;
    const st = hass.states[id];
    const d = domainOf(id);
    const dc = st.attributes.device_class;
    const diag = !!reg?.entity_category;

    // house-wide lists (some include diagnostic entities on purpose, e.g. batteries)
    if (d === 'sensor' && dc === 'battery' && st.attributes.unit_of_measurement === '%') model.batteries.push(id);
    if (diag) continue;
    (model.byDomain[d] = model.byDomain[d] || []).push(id);
    if (d === 'light' && !Array.isArray(st.attributes.entity_id)) model.lights.push(id);   // not light groups
    if (d === 'binary_sensor' && OPENING_CLASSES.includes(dc)) model.openings.push(id);
    if (d === 'cover' && ['garage', 'door', 'gate'].includes(dc)) model.openings.push(id);
    if (d === 'binary_sensor' && SAFETY_CLASSES.includes(dc)) model.safety.push(id);
    if (d === 'person' && asList(st.attributes.device_trackers).length) model.persons.push(id);   // real people, not login-only users
    if (d === 'camera') model.cameras.push(id);
    if (d === 'calendar') model.calendars.push(id);

    const room = model.areaById[entityArea(hass, id)];
    if (!room) continue;
    room.entities.push(id);
    const g = ROOM_GROUPS.find((x) => x.domains.includes(d));
    if (!g) continue;
    if (d === 'sensor' && !SENSOR_CLASSES.includes(dc)) continue;
    if (d === 'binary_sensor' && !SENSOR_CLASSES.includes(dc)) continue;
    (room.groups[g.id] = room.groups[g.id] || []).push(id);
    if (!room.temp && d === 'sensor' && dc === 'temperature') room.temp = id;
    if (!room.hum && d === 'sensor' && dc === 'humidity') room.hum = id;
    if ((d === 'binary_sensor' && (OPENING_CLASSES.includes(dc) || SAFETY_CLASSES.includes(dc))) || d === 'lock'
        || (d === 'cover' && ['garage', 'door', 'gate'].includes(dc))) room.alerts.push(id);
  }
  for (const room of model.areas) {
    const order = (cfg.rooms?.[room.id]?.entities) || null;
    if (order) room.pinned = asList(order).filter((id) => hass.states[id]);
  }
  model.rooms = model.areas.filter((r) => Object.keys(r.groups).length || r.temp);

  // ---- people, calendars, weather (config wins over discovery)
  if (cfg.people) model.persons = asList(cfg.people).filter((id) => hass.states[id]);
  if (cfg.calendars) model.calendars = asList(cfg.calendars).filter((id) => hass.states[id]);
  model.weather = cfg.weather || (model.byDomain.weather || [])[0] || null;
  model.cameras = cfg.cameras ? asList(cfg.cameras).filter((id) => hass.states[id]) : model.cameras;
  for (const k of ['byDomain']) for (const d in model[k]) model[k][d].sort();
  return model;
}

/* ============================================================================================
 * Entity state helpers
 * ========================================================================================== */

function isActive(st) {
  if (!st || UNAVAILABLE.includes(st.state)) return false;
  const s = st.state;
  switch (domainOf(st.entity_id)) {
    case 'climate': case 'water_heater': case 'humidifier': return s !== 'off';
    case 'lock': return s !== 'locked';
    case 'cover': case 'valve': return s !== 'closed';
    case 'media_player': return ['playing', 'on', 'paused', 'buffering'].includes(s);
    case 'vacuum': case 'lawn_mower': return ['cleaning', 'mowing', 'returning'].includes(s);
    case 'alarm_control_panel': return s !== 'disarmed';
    case 'person': case 'device_tracker': return s === 'home';
    case 'sensor': case 'weather': case 'camera': case 'calendar': return false;
    default: return s === 'on';
  }
}

/** True when the state needs attention (red): unlocked lock, open door, leak, triggered alarm. */
function isAlert(st) {
  if (!st) return false;
  const d = domainOf(st.entity_id), dc = st.attributes.device_class, s = st.state;
  if (d === 'lock') return ['unlocked', 'open', 'jammed', 'opening'].includes(s);
  if (d === 'cover' && ['garage', 'door', 'gate'].includes(dc)) return s !== 'closed' && !UNAVAILABLE.includes(s);
  if (d === 'binary_sensor' && (OPENING_CLASSES.includes(dc) || SAFETY_CLASSES.includes(dc))) return s === 'on';
  if (d === 'alarm_control_panel') return s === 'triggered';
  return false;
}

function stateText(hass, st) {
  if (!st) return 'Not found';
  const d = domainOf(st.entity_id), a = st.attributes;
  if (UNAVAILABLE.includes(st.state)) return 'Unavailable';
  if (d === 'light' && st.state === 'on' && a.brightness) return `${Math.round(a.brightness / 2.55)}%`;
  if (d === 'climate') {
    const mode = hass.formatEntityState ? hass.formatEntityState(st) : st.state;
    const cur = a.current_temperature != null ? ` · ${fmt(a.current_temperature, 0)}°` : '';
    if (st.state === 'off') return `Off${cur}`;
    const target = a.temperature != null ? `${fmt(a.temperature, 0)}°`
      : (a.target_temp_low != null ? `${fmt(a.target_temp_low, 0)}–${fmt(a.target_temp_high, 0)}°` : '');
    return `${mode} ${target}${cur}`.trim();
  }
  if (d === 'cover' && st.state === 'open' && a.current_position != null && a.current_position < 100) return `Open · ${a.current_position}%`;
  if (d === 'media_player' && ['playing', 'paused'].includes(st.state) && a.media_title) return a.media_title;
  if (d === 'fan' && st.state === 'on' && a.percentage) return `${a.percentage}%`;
  if (hass.formatEntityState) return hass.formatEntityState(st);
  return st.state + (a.unit_of_measurement ? ` ${a.unit_of_measurement}` : '');
}

/** Icon colour for an active entity (light colour, heating orange, cooling blue ...). */
function activeColor(st) {
  const d = domainOf(st.entity_id), a = st.attributes;
  if (isAlert(st)) return '#FF3B30';
  if (d === 'light') {
    if (Array.isArray(a.rgb_color)) {
      const [r, g, b] = a.rgb_color;
      if (!(r > 235 && g > 235 && b > 235)) return `rgb(${r},${g},${b})`;
    }
    return '#FF9F0A';
  }
  if (d === 'climate') {
    if (a.hvac_action === 'cooling' || st.state === 'cool') return '#0A84FF';
    if (a.hvac_action === 'heating' || st.state === 'heat') return '#FF7A1A';
    return '#30B0C7';
  }
  if (d === 'media_player') return '#AF52DE';
  if (d === 'fan' || d === 'humidifier') return '#30B0C7';
  if (d === 'person') return '#34C759';
  return 'var(--hv-accent)';
}

/** Default tap action per domain. */
function tapAction(st) {
  const d = domainOf(st.entity_id), dc = st.attributes.device_class;
  if (['light', 'switch', 'fan', 'input_boolean', 'automation', 'siren', 'humidifier'].includes(d)) return 'toggle';
  if (d === 'lock' || (d === 'cover' && ['garage', 'door', 'gate'].includes(dc))) return 'toggle-confirm';
  if (['cover', 'valve', 'scene', 'script', 'button', 'input_button', 'media_player', 'vacuum', 'lawn_mower'].includes(d)) return 'toggle';
  return 'more-info';
}

async function runToggle(hass, st) {
  const id = st.entity_id, d = domainOf(id), s = st.state;
  const call = (domain, service) => hass.callService(domain, service, {}, { entity_id: id });
  switch (d) {
    case 'lock': return call('lock', s === 'locked' ? 'unlock' : 'lock');
    case 'cover': return call('cover', 'toggle');
    case 'valve': return call('valve', 'toggle');
    case 'scene': return call('scene', 'turn_on');
    case 'script': return call('script', 'turn_on');
    case 'button': return call('button', 'press');
    case 'input_button': return call('input_button', 'press');
    case 'media_player': return call('media_player', 'media_play_pause');
    case 'vacuum': return call('vacuum', s === 'cleaning' ? 'return_to_base' : 'start');
    case 'lawn_mower': return call('lawn_mower', s === 'mowing' ? 'dock' : 'start_mowing');
    default: return call('homeassistant', 'toggle');
  }
}

/* ============================================================================================
 * Data that has to be fetched (forecast, calendars, statistics, energy settings) — cached
 * ========================================================================================== */

const cache = new Map();
/** Return the cached value (or undefined) and refresh it in the background when stale. */
function cached(key, ttlMs, fetcher, onUpdate) {
  let c = cache.get(key);
  if (!c) { c = { value: undefined, ts: 0, pending: null, listeners: new Set() }; cache.set(key, c); }
  if (onUpdate) c.listeners.add(onUpdate);
  if (!c.pending && Date.now() - c.ts > ttlMs) {
    c.pending = Promise.resolve().then(fetcher).then((v) => { c.value = v; }, (e) => {
      console.warn('HomeView: fetch failed', key, e); if (c.value === undefined) c.value = null;
    }).finally(() => {
      c.ts = Date.now(); c.pending = null;
      const ls = [...c.listeners]; c.listeners.clear(); ls.forEach((f) => f());
    });
  }
  return c.value;
}

const ws = (hass, msg) => hass.connection.sendMessagePromise(msg);

function getForecast(hass, entity, onUpdate) {
  return cached(`fc:${entity}`, 30 * 60e3, async () => {
    // daily if the provider has it, else twice-daily or hourly folded into days (e.g. NWS)
    const features = hass.states[entity]?.attributes?.supported_features || 0;
    const type = features & 1 ? 'daily' : features & 4 ? 'twice_daily' : features & 2 ? 'hourly' : 'daily';
    const r = await ws(hass, { type: 'call_service', domain: 'weather', service: 'get_forecasts',
      service_data: { type }, target: { entity_id: entity }, return_response: true });
    const fc = r?.response?.[entity]?.forecast || [];
    if (type === 'daily') return fc;
    const days = new Map();
    for (const f of fc) {
      const k = new Date(f.datetime).toDateString();
      const d = days.get(k) || { datetime: f.datetime, temperature: -Infinity, templow: Infinity, precipitation_probability: 0, condition: null };
      d.temperature = Math.max(d.temperature, f.temperature ?? -Infinity);
      d.templow = Math.min(d.templow, f.templow ?? f.temperature ?? Infinity);
      d.precipitation_probability = Math.max(d.precipitation_probability, f.precipitation_probability ?? 0);
      if (!d.condition || f.is_daytime || new Date(f.datetime).getHours() === 12) d.condition = f.condition;
      days.set(k, d);
    }
    return [...days.values()].map((d) => ({ ...d, templow: Number.isFinite(d.templow) ? d.templow : null,
      temperature: Number.isFinite(d.temperature) ? d.temperature : null }));
  }, onUpdate);
}

function getEvents(hass, calendars, days, onUpdate) {
  const key = `cal:${calendars.join(',')}:${days}`;
  return cached(key, 5 * 60e3, async () => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + days * 86400e3);
    const all = await Promise.all(calendars.map((c) =>
      hass.callApi('GET', `calendars/${c}?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`)
        .then((evs) => evs.map((e) => ({ ...e, calendar: c })), () => [])));
    const parse = (v) => (v.dateTime ? new Date(v.dateTime) : new Date(v.date + 'T00:00:00'));
    return all.flat().map((e) => ({ ...e, startD: parse(e.start), endD: parse(e.end), allDay: !e.start.dateTime }))
      .filter((e) => e.endD > new Date())
      .sort((a, b) => a.startD - b.startD);
  }, onUpdate);
}

function getStatToday(hass, statId, onUpdate) {
  const day = new Date().toDateString();
  return cached(`st:${statId}:${day}`, 5 * 60e3, async () => {
    const r = await ws(hass, { type: 'recorder/statistic_during_period', statistic_id: statId,
      calendar: { period: 'day' }, types: ['change'] });
    return r?.change ?? null;
  }, onUpdate);
}

function getEnergyPrefs(hass, onUpdate) {
  return cached('energy:prefs', 10 * 60e3, () => ws(hass, { type: 'energy/get_prefs' }), onUpdate);
}

/* ============================================================================================
 * Saving: the dashboard's strategy config, edited in place
 * ========================================================================================== */

/** The dashboard's url_path (null for the default dashboard). */
function dashboardPath() {
  const p = location.pathname.split('/')[1];
  return !p || p === 'lovelace' ? null : p;
}

async function loadStrategyConfig(hass) {
  try {
    const cur = await ws(hass, { type: 'lovelace/config', url_path: dashboardPath() });
    return cur && typeof cur === 'object' ? cur : null;
  } catch (e) { return null; }
}

/**
 * Apply `mutate` to the dashboard's strategy options and save them. Resolves to
 * { ok: true, config } or { ok: false, config } when the dashboard can't be saved from the
 * UI (a YAML-mode dashboard) — the caller then shows the YAML to paste.
 */
async function saveStrategy(hass, fallbackOptions, mutate) {
  const cur = await loadStrategyConfig(hass);
  const base = JSON.parse(JSON.stringify(cur?.strategy || { type: 'custom:homeview', ...(fallbackOptions || {}) }));
  mutate(base);
  const next = cleanConfig(base);
  next.type = next.type || 'custom:homeview';
  if (!cur?.strategy) return { ok: false, config: next };
  try {
    await ws(hass, { type: 'lovelace/config/save', url_path: dashboardPath(), config: { ...cur, strategy: next } });
    return { ok: true, config: next };
  } catch (e) {
    console.warn('HomeView: could not save the dashboard', e);
    return { ok: false, config: next, error: e };
  }
}

/* ============================================================================================
 * Shared tile CSS
 * ========================================================================================== */

const TILE_CSS = `
:host { display:block; height:100%; min-width:0; container-type:size; -webkit-tap-highlight-color:transparent;
  user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; }
* { box-sizing:border-box; }
.t { height:100%; border-radius:var(--hv-radius, 22px); background:var(--hv-tile); border:0.5px solid var(--hv-tile-border);
  box-shadow:0 1px 2px rgba(0,0,0,.05); color:var(--hv-fg); position:relative; overflow:hidden; cursor:pointer;
  display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;
  padding:7% 8%; transition:background .25s, transform .12s; }
.t.press { transform:scale(.97); }
.t.on { background:var(--hv-tile-on); color:var(--hv-on-fg); }
.t.na { opacity:.55; }
.t.white { background:var(--hv-card); }
.ic { color:var(--hv-icon); display:flex; align-items:center; justify-content:center; --mdc-icon-size:min(30cqh, 52px); }
.ic.big { --mdc-icon-size:min(34cqh, 60px); }
.t.on .ic { color:var(--hv-ic-on, var(--hv-accent)); }
.circ { border-radius:50%; width:min(36cqh, 64px); height:min(36cqh, 64px); background:var(--hv-pill);
  display:flex; align-items:center; justify-content:center; --mdc-icon-size:min(20cqh, 34px); position:relative; flex:none; }
.badge { position:absolute; top:-6%; right:-12%; width:44%; height:44%; border-radius:50%; background:#FF3B30; color:#fff;
  display:flex; align-items:center; justify-content:center; --mdc-icon-size:70%; border:2px solid var(--hv-tile); }
.tx { display:flex; flex-direction:column; align-items:inherit; min-width:0; max-width:100%; }
.nm { font-weight:650; font-size:clamp(12px, 8.6cqi, 20px); line-height:1.2; margin-top:min(5cqh, 10px);
  max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sb { font-size:clamp(10.5px, 7cqi, 15px); color:var(--hv-fg2); line-height:1.3; margin-top:2px;
  max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sb.x { font-weight:600; color:var(--hv-accent); }
.t.on .sb { color:var(--hv-on-fg2); }
.up { font-size:clamp(9px, 5.4cqi, 13px); letter-spacing:.06em; text-transform:uppercase; font-weight:650; color:var(--hv-fg2); }
.edit { position:absolute; inset:0; border-radius:var(--hv-radius, 22px); outline:2px dashed var(--hv-accent); outline-offset:-2px;
  display:flex; flex-wrap:wrap; align-content:flex-start; justify-content:flex-end; gap:5px; padding:7px; pointer-events:none; z-index:2;
  animation:hv-wiggle .35s ease-in-out infinite alternate; }
@keyframes hv-wiggle { from { transform:rotate(-.4deg); } to { transform:rotate(.4deg); } }
.edit button { all:unset; pointer-events:auto; cursor:pointer; width:30px; height:30px; border-radius:50%; background:rgba(20,20,20,.62);
  color:#fff; display:flex; align-items:center; justify-content:center; --mdc-icon-size:17px; backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); }
.edit button[data-edit=unfav] { background:#FF9F0A; }
.ctl { position:absolute; display:flex; gap:6px; bottom:7%; right:7%; }
.ctl button { all:unset; width:min(22cqh, 34px); height:min(22cqh, 34px); border-radius:50%; background:var(--hv-pill);
  color:var(--hv-fg); display:flex; align-items:center; justify-content:center; --mdc-icon-size:70%; cursor:pointer; }
/* wide tiles: icon left, text right */
@container (aspect-ratio > 1.75) {
  .t.flex { flex-direction:row; justify-content:flex-start; text-align:left; gap:min(5cqw, 22px); padding:0 6%; }
  .t.flex .tx { align-items:flex-start; }
  .t.flex .nm { margin-top:0; font-size:clamp(13px, 12cqh, 22px); }
  .t.flex .sb { font-size:clamp(11px, 9cqh, 16px); }
  .t.flex .up { font-size:clamp(9px, 7cqh, 13px); }
  .t.flex .ic { --mdc-icon-size:min(40cqh, 60px); }
}
`;

let tileSheet = null;
/** Give a shadow root the shared tile CSS (one constructed sheet; <style> where unsupported). */
function adopt(root) {
  try {
    if (!tileSheet) { tileSheet = new CSSStyleSheet(); tileSheet.replaceSync(TILE_CSS); }
    root.adoptedStyleSheets = [tileSheet];
  } catch (e) {
    const st = document.createElement('style'); st.textContent = TILE_CSS; root.appendChild(st);
  }
}

/** Replace <i data-e="entity"> / <i data-i="mdi:x"> placeholders with HA's icon elements. */
function fillIcons(root, hass) {
  root.querySelectorAll('i[data-e], i[data-i]').forEach((ph) => {
    let el;
    const ent = ph.dataset.e;
    if (ent && customElements.get('ha-state-icon')) {
      el = document.createElement('ha-state-icon');
      el.hass = hass; el.stateObj = hass.states[ent];
      if (ph.dataset.i) el.icon = ph.dataset.i;
    } else {
      el = document.createElement('ha-icon');
      el.icon = ph.dataset.i || hass.states[ent]?.attributes?.icon || 'mdi:help-circle-outline';
    }
    ph.replaceWith(el);
  });
}

/* ============================================================================================
 * Tile renderers. Each: key(hass, spec) -> string (re-render only when it changes),
 * html(hass, spec, tile) -> markup. Optional: tick (ms), action(hass, spec, tile, 'tap'|'hold').
 * ========================================================================================== */

const R = {};

// ---- any entity --------------------------------------------------------------------------
R.entity = {
  key: (h, s) => { const st = h.states[s.entity]; return st ? st.last_updated + st.state + (st.attributes.brightness || '') : 'x'; },
  html(h, s) {
    const st = h.states[s.entity];
    if (!st) return `<div class="t na"><div class="ic"><i data-i="mdi:help-circle-outline"></i></div><div class="tx"><div class="nm">${esc(s.name || s.entity)}</div><div class="sb">Not found</div></div></div>`;
    const on = isActive(st), alert = isAlert(st), na = UNAVAILABLE.includes(st.state);
    const d = domainOf(s.entity);
    const name = s.name || shortName(h, s.entity, s.areaName);
    let sub = s.sub !== undefined ? s.sub : (s.showRoom && s.areaName ? s.areaName : stateText(h, st));
    if (s.showRoom && (d === 'climate' || d === 'media_player' || d === 'cover')) sub = stateText(h, st);
    if (d === 'sensor' && !s.sub) {
      return `<div class="t flex${na ? ' na' : ''}"><div class="ic"><i data-e="${esc(s.entity)}"></i></div>
        <div class="tx"><div class="nm">${esc(stateText(h, st))}</div><div class="sb">${esc(name)}</div></div></div>`;
    }
    const color = on || alert ? `style="--hv-ic-on:${activeColor(st)}"` : '';
    let ctl = '';
    if (d === 'climate' && !na && st.state !== 'off' && st.attributes.temperature != null && s.size?.[0] >= 2) {
      ctl = `<div class="ctl"><button data-act="down"><ha-icon icon="mdi:minus"></ha-icon></button><button data-act="up"><ha-icon icon="mdi:plus"></ha-icon></button></div>`;
    }
    return `<div class="t flex${on || alert ? ' on' : ''}${na ? ' na' : ''}" ${color}>
      <div class="ic${alert ? ' alert' : ''}" ${alert ? 'style="color:#FF3B30"' : ''}><i data-e="${esc(s.entity)}"${s.icon ? ` data-i="${esc(s.icon)}"` : ''}></i></div>
      <div class="tx"><div class="nm">${esc(name)}</div><div class="sb">${esc(sub)}</div></div>${ctl}</div>`;
  },
  async action(h, s, tile, kind, ev) {
    const st = h.states[s.entity];
    if (!st) return;
    const act = ev?.target?.closest?.('[data-act]')?.dataset?.act;
    if (act && kind === 'tap') {
      const step = st.attributes.target_temp_step || (h.config.unit_system?.temperature === '°C' ? 0.5 : 1);
      const t = (st.attributes.temperature || 0) + (act === 'up' ? step : -step);
      return h.callService('climate', 'set_temperature', { temperature: t }, { entity_id: s.entity });
    }
    if (kind === 'hold' || s.tap === 'more-info') return moreInfo(tile, s.entity);
    const a = s.tap || tapAction(st);
    if (a === 'more-info') return moreInfo(tile, s.entity);
    if (a === 'toggle-confirm') {
      const verb = domainOf(s.entity) === 'lock' ? (st.state === 'locked' ? 'Unlock' : 'Lock')
        : (st.state === 'closed' ? 'Open' : 'Close');
      if (!window.confirm(`${verb} ${shortName(h, s.entity)}?`)) return;
    }
    return runToggle(h, st);
  },
};

// ---- room card ---------------------------------------------------------------------------
function roomSummary(h, room) {
  const lights = (room.groups.lights || []).filter((id) => h.states[id]?.state === 'on').length;
  const t = num(h.states[room.temp]?.state), hu = num(h.states[room.hum]?.state);
  const unit = h.states[room.temp]?.attributes?.unit_of_measurement || '°';
  const alerts = room.alerts.filter((id) => isAlert(h.states[id]));
  return { lights, t, hu, unit, alerts };
}
R.room = {
  key: (h, s) => JSON.stringify(roomSummary(h, s.room)),
  html(h, s) {
    const r = s.room, sum = roomSummary(h, r);
    const climate = [sum.t !== null ? `${fmt(sum.t, 1)}°` : null, sum.hu !== null ? `${fmt(sum.hu, 0)}%` : null].filter(Boolean).join(' · ');
    const lightTxt = sum.lights ? `${sum.lights} light${sum.lights > 1 ? 's' : ''} on` : '';
    const alertSt = sum.alerts.length ? h.states[sum.alerts[0]] : null;
    const badge = alertSt ? `<div class="badge"><i data-e="${esc(alertSt.entity_id)}"></i></div>` : '';
    return `<div class="t${sum.lights ? ' on' : ''}" style="--hv-ic-on:#FF9F0A">
      <div class="circ"><div class="ic" style="--mdc-icon-size:inherit;color:${sum.lights ? '#FF9F0A' : 'var(--hv-accent)'}"><i data-i="${esc(r.icon)}"></i></div>${badge}</div>
      <div class="tx"><div class="nm">${esc(r.name)}</div>
      ${climate ? `<div class="sb">${esc(climate)}</div>` : ''}${lightTxt ? `<div class="sb x">${esc(lightTxt)}</div>` : ''}</div></div>`;
  },
  action(h, s, tile, kind) {
    if (kind === 'hold' && s.room.temp) return moreInfo(tile, s.room.temp);
    navigate(`room-${s.room.id}`);
  },
};

// ---- weather (big) -----------------------------------------------------------------------
R.weather = {
  tick: 30e3,
  key: (h, s) => { const st = h.states[s.entity]; return `${st?.last_updated}|${new Date().getMinutes()}|${tileCacheTag(`fc:${s.entity}`)}`; },
  html(h, s, tile) {
    const st = h.states[s.entity];
    if (!st) return `<div class="t na"><div class="sb">No weather entity</div></div>`;
    const fc = getForecast(h, s.entity, () => tile.refresh()) || [];
    const today = fc[0] || {};
    const [cond, icon] = WEATHER[st.state] || [st.state, 'mdi:weather-partly-cloudy'];
    const unit = st.attributes.temperature_unit || '°';
    const now = new Date();
    const hi = today.temperature, lo = today.templow, rain = today.precipitation_probability;
    const big = s.size?.[1] >= 2;
    if (!big) {
      return `<div class="t flex"><div class="ic"><i data-i="${icon}"></i></div><div class="tx">
        <div class="nm">${fmt(st.attributes.temperature, 0)}° ${esc(cond)}</div>
        <div class="sb">${hi != null ? `H ${fmt(hi, 0)}° · L ${fmt(lo, 0)}°` : esc(h.states[s.entity].attributes.friendly_name)}</div></div></div>`;
    }
    return `<div class="t" style="justify-content:space-between;padding:6% 6% 5%">
      <div style="display:flex;justify-content:space-between;width:100%;align-items:baseline">
        <span style="font-weight:650;font-size:clamp(13px,6cqi,22px)">${esc(timeFmt(now, h))}</span>
        <span class="sb" style="margin:0">${esc(now.toLocaleDateString(h.locale?.language, { weekday: 'long', month: 'short', day: 'numeric' }))}</span></div>
      <div style="font-weight:700;font-size:min(42cqh, 30cqi);line-height:1;letter-spacing:-.04em">${fmt(st.attributes.temperature, 0)}°</div>
      <div style="display:flex;align-items:center;gap:8px;font-weight:600;font-size:clamp(13px,6cqi,22px)"><span class="ic" style="--mdc-icon-size:1.4em;color:inherit"><i data-i="${icon}"></i></span>${esc(cond)}</div>
      <div style="display:flex;gap:6%;justify-content:center;width:100%;border-top:1px solid var(--hv-line);padding-top:4%;font-weight:600;font-size:clamp(12px,5cqi,19px)">
        ${hi != null ? `<span>H: ${fmt(hi, 0)}°</span><span>L: ${fmt(lo, 0)}°</span>` : ''}
        ${rain != null ? `<span>💧 ${fmt(rain, 0)}%</span>` : `<span>${fmt(st.attributes.humidity, 0)}% RH</span>`}</div></div>`;
  },
  action: (h, s, tile) => moreInfo(tile, s.entity),
};
function tileCacheTag(key) { const c = cache.get(key); return c ? c.ts : 0; }

// ---- weather forecast (widgets) -----------------------------------------------------------
R.forecast = {
  key: (h, s) => `${h.states[s.entity]?.last_updated}|${tileCacheTag(`fc:${s.entity}`)}`,
  html(h, s, tile) {
    const st = h.states[s.entity];
    const fc = (getForecast(h, s.entity, () => tile.refresh()) || []).slice(0, s.days || 5);
    const [cond, icon] = WEATHER[st?.state] || ['', 'mdi:weather-partly-cloudy'];
    const loc = h.config.location_name || '';
    const rows = fc.map((f) => {
      const d = new Date(f.datetime);
      return `<div style="display:flex;align-items:center;gap:10px;padding:4px 0">
        <span style="width:3.2em;font-weight:600">${esc(d.toLocaleDateString(h.locale?.language, { weekday: 'short' }))}</span>
        <span class="ic" style="--mdc-icon-size:1.3em"><i data-i="${(WEATHER[f.condition] || [])[1] || 'mdi:weather-partly-cloudy'}"></i></span>
        <span style="margin-left:auto;color:var(--hv-fg2)">${fmt(f.templow, 0)}°</span><span style="width:2.4em;text-align:right;font-weight:600">${fmt(f.temperature, 0)}°</span></div>`;
    }).join('');
    return `<div class="t" style="align-items:stretch;justify-content:flex-start;text-align:left;padding:7%;cursor:default">
      <div class="up">${esc(loc)}</div>
      <div style="display:flex;align-items:center;gap:10px"><span style="font-size:min(24cqh,72px);font-weight:300;letter-spacing:-.04em">${fmt(st?.attributes?.temperature, 0)}°</span>
      <span class="ic" style="--mdc-icon-size:min(14cqh,44px)"><i data-i="${icon}"></i></span></div>
      <div style="font-weight:600;margin-bottom:4%">${esc(cond)}</div>
      <div style="font-size:clamp(12px,4.5cqi,17px);border-top:1px solid var(--hv-line);padding-top:3%">${rows}</div></div>`;
  },
  action: (h, s, tile) => moreInfo(tile, s.entity),
};

// ---- analog clock -------------------------------------------------------------------------
R.clock = {
  tick: 1000,
  key: () => String(Math.floor(Date.now() / 1000)),
  html() {
    const n = new Date();
    const sec = n.getSeconds(), min = n.getMinutes() + sec / 60, hr = (n.getHours() % 12) + min / 60;
    let ticks = '';
    for (let i = 0; i < 60; i++) {
      const major = i % 5 === 0;
      ticks += `<line x1="50" y1="${major ? 4 : 4.5}" x2="50" y2="${major ? 10 : 7}" stroke="currentColor" stroke-width="${major ? 1.4 : 0.5}" opacity="${major ? 0.9 : 0.5}" transform="rotate(${i * 6} 50 50)"/>`;
    }
    let nums = '';
    for (let i = 1; i <= 12; i++) {
      const a = (i * 30 - 90) * Math.PI / 180;
      nums += `<text x="${50 + 31 * Math.cos(a)}" y="${50 + 31 * Math.sin(a) + 3.6}" text-anchor="middle" font-size="10" fill="var(--hv-accent)">${i}</text>`;
    }
    const hand = (deg, len, w, color) => `<line x1="50" y1="50" x2="50" y2="${50 - len}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" transform="rotate(${deg} 50 50)"/>`;
    return `<div class="t white" style="padding:6%;cursor:default"><svg viewBox="0 0 100 100" style="width:100%;height:100%;color:var(--hv-fg)" font-family="${FONT}">
      ${ticks}${nums}${hand(hr * 30, 24, 2.6, 'currentColor')}${hand(min * 6, 36, 1.8, 'currentColor')}${hand(sec * 6, 40, 0.8, 'var(--hv-accent)')}
      <circle cx="50" cy="50" r="2" fill="var(--hv-card)" stroke="var(--hv-accent)" stroke-width="1"/></svg></div>`;
  },
};

// ---- date (widgets) ------------------------------------------------------------------------
R.date = {
  tick: 60e3,
  key: (h) => `${new Date().toDateString()}|${h.states['sun.sun']?.last_updated}`,
  html(h) {
    const n = new Date(), lang = h.locale?.language;
    const sun = h.states['sun.sun'];
    const t = (iso) => (iso ? timeFmt(new Date(iso), h) : '');
    const sunRow = sun ? `<div class="sb" style="display:flex;gap:14px;justify-content:center;font-weight:600;margin-top:6%">
      <span><span class="ic" style="display:inline-flex;--mdc-icon-size:1.2em;vertical-align:-3px"><i data-i="mdi:weather-sunset-up"></i></span> ${esc(t(sun.attributes.next_rising))}</span>
      <span><span class="ic" style="display:inline-flex;--mdc-icon-size:1.2em;vertical-align:-3px"><i data-i="mdi:weather-sunset-down"></i></span> ${esc(t(sun.attributes.next_setting))}</span></div>` : '';
    return `<div class="t" style="cursor:default;background:transparent;border:none;box-shadow:none">
      <div style="font-weight:700;font-size:min(14cqh,13cqi);letter-spacing:-.02em"><span style="color:var(--hv-accent)">${esc(n.toLocaleDateString(lang, { weekday: 'short' }))}</span>
      <span style="color:var(--hv-fg2)">${esc(n.toLocaleDateString(lang, { month: 'short' }))}</span></div>
      <div style="font-weight:700;font-size:min(48cqh,40cqi);line-height:1">${n.getDate()}</div>${sunRow}</div>`;
  },
};

// ---- calendar: next event / agenda ---------------------------------------------------------
function eventWhen(h, e) {
  const lang = h.locale?.language;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d0 = new Date(e.startD); d0.setHours(0, 0, 0, 0);
  const diff = Math.round((d0 - today) / 86400e3);
  const day = diff <= 0 ? 'Today' : diff === 1 ? 'Tomorrow'
    : e.startD.toLocaleDateString(lang, diff < 7 ? { weekday: 'long' } : { weekday: 'short', month: 'short', day: 'numeric' });
  return { day, time: e.allDay ? 'All day' : timeFmt(e.startD, h) };
}
R.next_event = {
  tick: 60e3,
  key: (h, s) => `${tileCacheTag(`cal:${s.calendars.join(',')}:14`)}|${new Date().getHours()}`,
  html(h, s, tile) {
    const evs = getEvents(h, s.calendars, 14, () => tile.refresh());
    const e = (evs || [])[0];
    const calName = e ? (h.states[e.calendar]?.attributes?.friendly_name || '') : '';
    if (!e) {
      return `<div class="t flex"><div class="ic"><i data-i="mdi:calendar-check"></i></div><div class="tx">
        <div class="up">Up next</div><div class="nm">${evs === undefined ? 'Loading…' : 'Nothing planned'}</div><div class="sb">Next 2 weeks</div></div></div>`;
    }
    const w = eventWhen(h, e);
    return `<div class="t flex"><div class="ic" style="color:var(--hv-accent)"><i data-i="mdi:calendar-heart"></i></div><div class="tx">
      <div class="up">Next on ${esc(calName)}</div><div class="nm">${esc(e.summary)}</div><div class="sb">${esc(w.day)} · ${esc(w.time)}</div></div></div>`;
  },
  action: (h, s, tile) => (s.calendars[0] ? moreInfo(tile, s.calendars[0]) : null),
};
R.agenda = {
  tick: 60e3,
  key: (h, s) => `${tileCacheTag(`cal:${s.calendars.join(',')}:${s.days || 7}`)}|${new Date().getHours()}`,
  html(h, s, tile) {
    const evs = getEvents(h, s.calendars, s.days || 7, () => tile.refresh());
    const max = s.max || 8;
    let rows = '', lastDay = '';
    for (const e of (evs || []).slice(0, max)) {
      const w = eventWhen(h, e);
      if (w.day !== lastDay) { rows += `<div class="up" style="margin:10px 0 4px;color:var(--hv-accent)">${esc(w.day)}</div>`; lastDay = w.day; }
      rows += `<div style="display:flex;gap:10px;align-items:baseline;padding:2px 0">
        <span style="width:7px;height:7px;border-radius:50%;background:var(--hv-accent);flex:none;transform:translateY(-1px)"></span>
        <span style="font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.summary)}</span>
        <span style="color:var(--hv-fg2);flex:none">${esc(w.time)}</span></div>`;
    }
    if (!rows) rows = `<div class="sb" style="margin-top:8px">${evs === undefined ? 'Loading…' : 'Nothing planned'}</div>`;
    return `<div class="t" style="align-items:stretch;justify-content:flex-start;text-align:left;padding:6% 7%;cursor:default;font-size:clamp(12px,4cqi,16px)">
      <div style="display:flex;align-items:center;gap:8px" class="up"><span class="ic" style="--mdc-icon-size:1.4em"><i data-i="mdi:calendar-month-outline"></i></span>${esc(s.title || 'Up next')}</div>
      <div style="overflow:hidden">${rows}</div></div>`;
  },
};

// ---- person ---------------------------------------------------------------------------------
function personBattery(h, personId) {
  const trackers = asList(h.states[personId]?.attributes?.device_trackers);
  for (const t of trackers) {
    const dev = h.entities?.[t]?.device_id;
    if (!dev) continue;
    const bat = Object.values(h.entities).find((e) => e.device_id === dev && e.entity_id.startsWith('sensor.')
      && h.states[e.entity_id]?.attributes?.device_class === 'battery' && h.states[e.entity_id]?.attributes?.unit_of_measurement === '%');
    if (bat) return bat.entity_id;
  }
  return null;
}
R.person = {
  tick: 60e3,
  key: (h, s) => `${h.states[s.entity]?.last_updated}|${h.states[s.battery]?.state}|${Math.floor(Date.now() / 60e3)}`,
  html(h, s) {
    const st = h.states[s.entity];
    if (!st) return `<div class="t na"><div class="sb">${esc(s.entity)}</div></div>`;
    const home = st.state === 'home';
    const pic = st.attributes.entity_picture;
    const name = st.attributes.friendly_name || s.entity;
    const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    const where = hassState(h, st);
    const bat = s.battery ? num(h.states[s.battery]?.state) : null;
    const avatar = pic ? `<img src="${esc(pic)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
      : `<span style="font-weight:700;font-size:min(14cqh,26px);color:var(--hv-accent)">${esc(initials)}</span>`;
    return `<div class="t flex${home ? ' on' : ''}">
      <div class="circ" style="width:min(56cqh,84px);height:min(56cqh,84px);box-shadow:0 0 0 3px ${home ? '#34C759' : 'var(--hv-line)'}">${avatar}</div>
      <div class="tx"><div class="nm">${esc(name)}</div><div class="sb">${esc(where)} · ${esc(relTime(st.last_changed))}</div>
      ${bat !== null ? `<div class="sb"><span style="color:${bat < 20 ? '#FF3B30' : 'inherit'}">${fmt(bat, 0)}% battery</span></div>` : ''}</div></div>`;
  },
  action: (h, s, tile) => moreInfo(tile, s.entity),
};
const hassState = (h, st) => (h.formatEntityState ? h.formatEntityState(st) : st.state);

// ---- camera ---------------------------------------------------------------------------------
R.camera = {
  tick: 10e3,
  key: (h, s) => `${h.states[s.entity]?.state}`,
  html(h, s) {
    const st = h.states[s.entity];
    const name = s.name || st?.attributes?.friendly_name || s.entity;
    const ok = st && !UNAVAILABLE.includes(st.state);
    return `<div class="t" style="padding:0;background:#000;justify-content:flex-end">
      ${ok ? `<img class="cam" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover" alt="">` : `<div class="sb" style="margin:auto;color:#aaa">Unavailable</div>`}
      <div style="position:relative;width:100%;padding:3% 5%;background:linear-gradient(transparent,rgba(0,0,0,.55));color:#fff;text-align:left;font-weight:600;font-size:clamp(12px,4.5cqi,17px)">${esc(name)}</div></div>`;
  },
  update(h, s, tile) {   // runs after render and on every tick: swap in a fresh still, no flicker
    const img = tile.shadowRoot.querySelector('img.cam');
    const pic = h.states[s.entity]?.attributes?.entity_picture;
    if (!img || !pic || !tile.visible) return;
    const url = `${pic}${pic.includes('?') ? '&' : '?'}_t=${Date.now()}`;
    const pre = new Image();
    pre.onload = () => { img.src = url; };
    pre.src = url;
  },
  action: (h, s, tile) => moreInfo(tile, s.entity),
};

// ---- energy ---------------------------------------------------------------------------------
R.energy_now = {
  key: (h, s) => Object.values(s.power).map((id) => h.states[id]?.state).join('|'),
  html(h, s) {
    const p = s.power, v = (id) => (id ? num(h.states[id]?.state) : null);
    const unitW = (id) => { const u = h.states[id]?.attributes?.unit_of_measurement; return u === 'kW' ? 1000 : u === 'MW' ? 1e6 : 1; };
    const w = (id) => { const x = v(id); return x === null ? null : x * unitW(id); };
    const solar = w(p.solar), grid = w(p.grid), battery = w(p.battery), soc = v(p.battery_level);
    let home = w(p.home);
    if (home === null && (solar !== null || grid !== null)) home = (solar || 0) + (grid || 0) + (battery || 0);
    const kw = (x) => (x === null ? '—' : Math.abs(x) >= 1000 ? `${fmt(Math.abs(x) / 1000, 1)} kW` : `${fmt(Math.abs(x), 0)} W`);
    const cell = (icon, label, value, sub, color, ent) => `<div data-more="${esc(ent || '')}" style="background:var(--hv-pill);border-radius:16px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;min-width:0">
      <span class="up" style="display:flex;align-items:center;gap:6px"><span class="ic" style="--mdc-icon-size:1.4em;color:${color}"><i data-i="${icon}"></i></span>${label}</span>
      <span style="font-weight:700;font-size:clamp(15px,6cqi,26px)">${value}</span><span class="sb" style="margin:0">${sub}</span></div>`;
    const cells = [];
    if (p.solar) cells.push(cell('mdi:solar-power-variant', 'Solar', kw(solar), solar > 20 ? 'Producing' : 'Idle', '#FFB800', p.solar));
    cells.push(cell('mdi:home-lightning-bolt-outline', 'Home', kw(home), 'Using now', 'var(--hv-accent)', p.home || ''));
    if (p.grid) cells.push(cell('mdi:transmission-tower', 'Grid', kw(grid), grid > 20 ? 'Importing' : grid < -20 ? 'Exporting' : 'Idle', '#8E8E93', p.grid));
    if (p.battery || p.battery_level) cells.push(cell(soc !== null ? `mdi:battery-${clamp(Math.round(soc / 10) * 10, 10, 100) === 100 ? '' : clamp(Math.round(soc / 10) * 10, 10, 90)}`.replace(/-$/, '') : 'mdi:home-battery-outline', 'Battery',
      soc !== null ? `${fmt(soc, 0)}%` : kw(battery), battery === null ? '' : battery > 20 ? `Discharging ${kw(battery)}` : battery < -20 ? `Charging ${kw(battery)}` : 'Idle', '#34C759', p.battery_level || p.battery));
    return `<div class="t" style="cursor:default;align-items:stretch;justify-content:flex-start;padding:5%">
      <div class="up" style="margin-bottom:4%">Right now</div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;flex:1">${cells.join('')}</div></div>`;
  },
  action(h, s, tile, kind, ev) { const id = ev?.target?.closest?.('[data-more]')?.dataset.more; if (id) moreInfo(tile, id); },
};
R.energy_stat = {
  key: (h, s) => s.stats.map((x) => tileCacheTag(`st:${x.id}:${new Date().toDateString()}`)).join('|'),
  html(h, s, tile) {
    const vals = s.stats.map((x) => ({ ...x, v: getStatToday(h, x.id, () => tile.refresh()) }));
    const loading = vals.some((x) => x.v === undefined);
    let value;
    if (s.compute) value = s.compute(Object.fromEntries(vals.map((x) => [x.role, x.v])));
    else value = vals.reduce((a, x) => a + (x.v || 0) * (x.sign || 1), 0);
    const txt = loading ? '…' : value === null || Number.isNaN(value) ? '—' : s.unit === '%' ? `${fmt(value, 0)}%` : `${fmt(value, value >= 100 ? 0 : 1)} kWh`;
    return `<div class="t flex"><div class="ic" style="color:${s.color || 'var(--hv-accent)'}"><i data-i="${s.icon}"></i></div>
      <div class="tx"><div class="up">${esc(s.title)}</div><div class="nm">${txt}</div><div class="sb">${esc(s.sub || 'Today')}</div></div></div>`;
  },
};
R.energy_device = {
  key: (h, s) => `${tileCacheTag(`st:${s.stat}:${new Date().toDateString()}`)}|${h.states[s.power]?.state}`,
  html(h, s, tile) {
    const kwh = getStatToday(h, s.stat, () => tile.refresh());
    const w = s.power ? num(h.states[s.power]?.state) : null;
    const u = s.power ? h.states[s.power]?.attributes?.unit_of_measurement || 'W' : '';
    const on = w !== null && w > 1;
    return `<div class="t flex${on ? ' on' : ''}" style="--hv-ic-on:#FFB800"><div class="ic"><i data-i="${esc(s.icon || 'mdi:power-plug-outline')}"></i></div>
      <div class="tx"><div class="nm">${esc(s.name)}</div><div class="sb">${kwh === undefined ? '…' : `${fmt(kwh || 0, 2)} kWh today`}${w !== null ? ` · ${fmt(w, 0)} ${esc(u)}` : ''}</div></div></div>`;
  },
  action: (h, s, tile) => moreInfo(tile, s.power || s.stat),
};

// ---- any Lovelace card (rendered by <homeview-tile> itself) -----------------------------------
R.card = { key: () => 'card', html: () => '' };

// ---- page link (Home: "Rooms ›" etc.) ---------------------------------------------------------
R.link = {
  key: () => 'l',
  html: (h, s) => `<div class="t flex"><div class="ic"><i data-i="${esc(s.icon)}"></i></div><div class="tx"><div class="nm">${esc(s.name)}</div><div class="sb">${esc(s.sub || '')}</div></div></div>`,
  action: (h, s) => navigate(s.path),
};

/* ============================================================================================
 * <homeview-tile>
 * ========================================================================================== */

const EDIT_ICONS = {
  fav: 'mdi:star-outline', unfav: 'mdi:star', size: 'mdi:resize', name: 'mdi:rename-outline', hide: 'mdi:eye-off-outline',
  unhide: 'mdi:eye-outline', color: 'mdi:palette-outline', 'hide-room': 'mdi:eye-off-outline', 'unhide-room': 'mdi:eye-outline',
};
const EDIT_TITLES = {
  fav: 'Add to Home', unfav: 'Remove from Home', size: 'Change size', name: 'Rename', hide: 'Hide', unhide: 'Show again',
  color: 'Change colour', 'hide-room': 'Hide room', 'unhide-room': 'Show room again',
};

class HomeViewTile extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    adopt(this.shadowRoot);
    this._wrap = document.createElement('div');
    this._wrap.style.cssText = 'height:100%;position:relative';
    this.shadowRoot.appendChild(this._wrap);
    this.visible = true;
    this._bindPress();
  }

  set spec(s) { this._spec = s; this._key = null; this._card = null; this._render(); }
  get spec() { return this._spec; }
  set hass(h) { this._hass = h; this._render(); }
  /** Edit mode: { actions: ['fav', 'size', ...], onEdit(action, spec) } or null */
  set edit(e) { this._edit = e; this._key = null; this._render(); }

  refresh() { this._key = null; this._render(); }

  connectedCallback() {
    const r = R[this._spec?.kind];
    if (r?.tick && !this._timer) {
      this._timer = setInterval(() => { this._render(); if (r.update && this._hass) r.update(this._hass, this._spec, this); }, r.tick);
    }
    if ('IntersectionObserver' in window && !this._io) {
      this._io = new IntersectionObserver((es) => { this.visible = es[0].isIntersecting; });
      this._io.observe(this);
    }
  }

  disconnectedCallback() {
    clearInterval(this._timer); this._timer = null;
    this._io?.disconnect(); this._io = null;
  }

  _render() {
    if (!this._hass || !this._spec) return;
    if (this._spec.kind === 'card') { this._renderCard(); return; }
    const r = R[this._spec.kind];
    if (!r) return;
    const key = r.key(this._hass, this._spec) + (this._edit ? '|edit' + this._edit.actions.join() : '');
    if (key === this._key) return;
    this._key = key;
    this._wrap.innerHTML = r.html(this._hass, this._spec, this) + this._editHtml();
    fillIcons(this._wrap, this._hass);
    if (r.update) r.update(this._hass, this._spec, this);
  }

  // a Lovelace card from the user's config, created once with HA's card helpers
  _renderCard() {
    if (this._card && this._card !== 'loading') {
      this._card.hass = this._hass;
      if (this._edit && !this._wrap.querySelector('.edit')) this._wrap.insertAdjacentHTML('beforeend', this._editHtml());
      if (!this._edit) this._wrap.querySelector('.edit')?.remove();
      return;
    }
    if (this._card === 'loading') return;
    this._card = 'loading';
    (async () => {
      const helpers = await window.loadCardHelpers();
      const el = helpers.createCardElement(this._spec.card);
      el.hass = this._hass;
      const box = document.createElement('div');
      box.style.cssText = 'height:100%;overflow:auto;border-radius:var(--hv-radius,22px)';
      box.appendChild(el);
      this._wrap.replaceChildren(box);
      this._wrap.style.position = 'relative';
      this._card = el;
      this._renderCard();
    })().catch((e) => { this._card = null; this._wrap.innerHTML = `<div class="t na"><div class="sb">Card error: ${esc(e.message)}</div></div>`; });
  }

  _editHtml() {
    if (!this._edit) return '';
    return `<div class="edit">${this._edit.actions.map((a) =>
      `<button data-edit="${a}" title="${EDIT_TITLES[a]}"><ha-icon icon="${EDIT_ICONS[a]}"></ha-icon></button>`).join('')}</div>`;
  }

  // Pointer events, not click: iOS cancels synthetic clicks inside HA's action handlers,
  // and a hold has to open more-info without also toggling.
  _bindPress() {
    let timer = null, held = false, x0 = 0, y0 = 0, down = false;
    const card = () => this._wrap.firstElementChild;
    const cancel = () => { clearTimeout(timer); timer = null; down = false; card()?.classList.remove('press'); };
    this.addEventListener('pointerdown', (e) => {
      if (e.button > 0 || this._spec?.kind === 'card') return;
      down = true; held = false; x0 = e.clientX; y0 = e.clientY;
      if (this._edit) return;
      card()?.classList.add('press');
      timer = setTimeout(() => { held = true; card()?.classList.remove('press'); this._act('hold', e); }, 500);
    });
    this.addEventListener('pointermove', (e) => { if (down && Math.hypot(e.clientX - x0, e.clientY - y0) > 12) cancel(); });
    this.addEventListener('pointerup', (e) => { const wasDown = down; cancel(); if (wasDown && !held) this._act('tap', e); });
    this.addEventListener('pointercancel', cancel);
    this.addEventListener('pointerleave', cancel);
    this.addEventListener('contextmenu', (e) => { if (this._spec?.kind !== 'card') e.preventDefault(); });
  }

  _act(kind, ev) {
    // events from inside the shadow root are retargeted to the host, and a tap on an icon
    // lands inside <ha-icon>'s own shadow root: find the marked element along the event path
    const path = ev?.composedPath ? ev.composedPath() : [ev?.target];
    const marked = (attr) => path.find((n) => n?.dataset?.[attr] !== undefined)?.dataset?.[attr];
    const target = { closest: (sel) => { const attr = sel.match(/\[data-([a-z]+)\]/)?.[1]; const v = attr && marked(attr);
      return v === undefined ? null : { dataset: { [attr]: v } }; } };
    if (this._edit) {
      const a = marked('edit');
      if (a && kind === 'tap') this._edit.onEdit(a, this._spec, this);
      return;
    }
    const r = R[this._spec?.kind];
    if (!r?.action || !this._hass) return;
    if (this._spec.navigate && kind === 'tap') { navigate(this._spec.navigate); return; }
    try {
      const p = r.action(this._hass, this._spec, this, kind, { target });
      if (p?.catch) p.catch((e) => console.warn('HomeView action failed', e));
      if (navigator.vibrate && kind === 'hold') navigator.vibrate(10);
    } catch (e) { console.warn('HomeView action failed', e); }
  }
}
customElements.get('homeview-tile') || customElements.define('homeview-tile', HomeViewTile);

/* ============================================================================================
 * Status pills (house-wide summaries in the page header)
 * ========================================================================================== */

const PILLS = {
  alarm(h, m) {
    const id = (m.byDomain.alarm_control_panel || [])[0];
    const st = h.states[id];
    if (!st) return null;
    const armed = st.state.startsWith('armed');
    return { icon: armed ? 'mdi:shield-lock' : st.state === 'triggered' ? 'mdi:bell-ring' : 'mdi:shield-off-outline',
      text: hassState(h, st), alert: st.state === 'triggered', active: armed, more: id };
  },
  climate(h, m) {
    const id = (m.byDomain.climate || [])[0];
    const st = h.states[id];
    if (!st) return null;
    return { icon: 'mdi:thermostat', text: stateText(h, st), active: isActive(st), more: id };
  },
  lights(h, m) {
    if (!m.lights.length) return null;
    const on = m.lights.filter((id) => h.states[id]?.state === 'on');
    return { icon: on.length ? 'mdi:lightbulb-group' : 'mdi:lightbulb-group-off-outline', text: on.length ? `${on.length} on` : 'Lights off',
      active: on.length > 0, popup: { title: 'Lights', ids: [...on, ...m.lights.filter((id) => !on.includes(id))], showRoom: true } };
  },
  locks(h, m) {
    const locks = m.byDomain.lock || [];
    if (!locks.length) return null;
    const open = locks.filter((id) => isAlert(h.states[id]));
    return { icon: open.length ? 'mdi:lock-open-variant' : 'mdi:lock', text: open.length ? `${open.length} unlocked` : 'Locked',
      alert: open.length > 0, popup: { title: 'Locks', ids: locks, showRoom: true } };
  },
  openings(h, m) {
    if (!m.openings.length) return null;
    const open = m.openings.filter((id) => isAlert(h.states[id]));
    return { icon: open.length ? 'mdi:door-open' : 'mdi:door-closed', text: open.length ? `${open.length} open` : 'All closed',
      alert: open.length > 0, popup: { title: 'Doors & Windows', ids: [...open, ...m.openings.filter((id) => !open.includes(id))], showRoom: true } };
  },
  safety(h, m) {
    if (!m.safety.length) return null;
    const bad = m.safety.filter((id) => h.states[id]?.state === 'on');
    return { icon: bad.length ? 'mdi:water-alert' : 'mdi:shield-check-outline', text: bad.length ? `${bad.length} alert${bad.length > 1 ? 's' : ''}` : 'All clear',
      alert: bad.length > 0, popup: { title: 'Leaks, smoke & gas', ids: [...bad, ...m.safety.filter((id) => !bad.includes(id))], showRoom: true } };
  },
  batteries(h, m, cfg) {
    if (!m.batteries.length) return null;
    const lowAt = cfg.battery_low ?? 20;
    const low = m.batteries.filter((id) => { const v = num(h.states[id]?.state); return v !== null && v < lowAt; });
    const off = m.batteries.filter((id) => UNAVAILABLE.includes(h.states[id]?.state));
    const parts = [low.length ? `${low.length} low` : null, off.length ? `${off.length} offline` : null].filter(Boolean);
    const sorted = [...m.batteries].sort((a, b) => (num(h.states[a]?.state) ?? -1) - (num(h.states[b]?.state) ?? -1));
    return { icon: low.length ? 'mdi:battery-alert-variant-outline' : 'mdi:battery-high', text: parts.join(' · ') || 'Batteries OK',
      alert: low.length > 0, popup: { title: 'Batteries', ids: sorted, showRoom: true } };
  },
  media(h, m) {
    const players = m.byDomain.media_player || [];
    const playing = players.filter((id) => h.states[id]?.state === 'playing');
    if (!playing.length) return null;
    return { icon: 'mdi:play-circle', text: `${playing.length} playing`, active: true, popup: { title: 'Now playing', ids: playing, showRoom: true } };
  },
};
const DEFAULT_PILLS = ['alarm', 'climate', 'lights', 'locks', 'openings', 'safety', 'batteries', 'media'];

/* ============================================================================================
 * Page builders: model -> { title, sections: [{ title?, hue?, tiles: [spec] }] }
 * spec = { kind, size: [w, h], ... }
 * ========================================================================================== */

const roomTile = (room, size = [1, 1]) => ({ kind: 'room', room, size, hue: room.hue });
const entTile = (id, extra = {}) => ({ kind: 'entity', entity: id, size: [1, 1], ...extra });

function favoritesAuto(h, m) {
  const out = [];
  const add = (ids) => ids.forEach((id) => { if (!out.includes(id)) out.push(id); });
  add((m.byDomain.alarm_control_panel || []).slice(0, 1));
  add(m.byDomain.lock || []);
  add((m.byDomain.cover || []).filter((id) => ['garage', 'gate'].includes(h.states[id]?.attributes?.device_class)));
  add((m.byDomain.climate || []).slice(0, 1));
  return out.slice(0, 6);
}

// Default sizes of the tile types a user can place
const TYPE_SIZES = { clock: [1, 1], weather: [2, 2], forecast: [2, 2], agenda: [2, 2], date: [2, 2], camera: [2, 1],
  next_event: [2, 1], person: [2, 1], room: [1, 1], energy_now: [2, 2] };

/**
 * A tile the user wrote in YAML:
 *   light.kitchen                                   an entity
 *   { entity: light.kitchen, name: Island, icon: mdi:x, size: 2x1, tap: more-info }
 *   { type: clock | weather | forecast | date | next_event | agenda | camera | person, entity?, size? }
 *   { type: room, area: kitchen }
 *   { card: { type: history-graph, entities: [...] }, size: 4x2 }   any Lovelace card
 */
function userTile(def, h, m) {
  if (typeof def === 'string') def = { entity: def };
  if (!def || typeof def !== 'object') return null;
  const size = parseSize(def.size);
  if (def.card) return { kind: 'card', card: def.card, size: size || [2, 2] };
  const t = def.type;
  if (t === 'room') {
    const r = m.areaById[def.area];
    return r ? { ...roomTile(r), size: size || [1, 1] } : null;
  }
  if (t && t !== 'entity' && R[t]) {
    const spec = { ...def, kind: t, size: size || TYPE_SIZES[t] || [1, 1] };
    delete spec.type;
    if (t === 'next_event' || t === 'agenda') spec.calendars = asList(def.calendars || m.calendars);
    if (t === 'weather' || t === 'forecast') spec.entity = def.entity || m.weather;
    if (t === 'camera') spec.entity = def.entity || m.cameras[0];
    if (t === 'person' && !spec.battery) spec.battery = personBattery(h, def.entity);
    return spec;
  }
  if (def.entity) {
    const room = m.areaById[entityArea(h, def.entity)];
    return entTile(def.entity, { name: def.name, icon: def.icon, tap: def.tap, size: size || [1, 1], showRoom: true, areaName: room?.name, user: true });
  }
  return null;
}
const userSections = (list, h, m) => asList(list).map((sec) => ({
  title: sec.title, position: sec.position, hue: sec.color !== undefined ? hueOf(sec.color, undefined) : undefined,
  tiles: asList(sec.tiles).map((t) => userTile(t, h, m)).filter(Boolean),
}));

const PAGES = {
  home(h, m, cfg) {
    const pc = cfg.home || {};
    const tiles = [];
    if (m.weather) tiles.push({ kind: 'weather', entity: m.weather, size: [2, 2] });
    if (m.calendars.length) tiles.push({ kind: 'next_event', calendars: m.calendars, size: [2, 1] });
    tiles.push({ kind: 'clock', size: [1, 1] });
    const favs = pc.favorites ? asList(pc.favorites) : favoritesAuto(h, m);
    favs.forEach((id) => {
      const st = h.states[id];
      if (!st || (!pc.favorites && UNAVAILABLE.includes(st.state))) return;
      const room = m.areaById[entityArea(h, id)];
      tiles.push(entTile(id, { showRoom: true, areaName: room?.name, size: domainOf(id) === 'climate' ? [2, 1] : [1, 1] }));
    });
    const sections = [{ tiles }];
    if (pc.rooms !== false && m.rooms.length) {
      sections.push({ title: 'Rooms', link: 'rooms', tiles: m.rooms.map((r) => roomTile(r)) });
    }
    if (pc.scenes !== false && (m.byDomain.scene || []).length) {
      sections.push({ title: 'Scenes', tiles: (m.byDomain.scene || []).slice(0, pc.max_scenes || 8).map((id) => entTile(id, { size: [2, 1], sub: 'Scene' })) });
    }
    return { title: cfg.title || h.config.location_name || 'Home', pills: true, people: true, sections };
  },

  widgets(h, m) {
    const tiles = [{ kind: 'date', size: [2, 2] }, { kind: 'clock', size: [2, 2] }];
    if (m.weather) tiles.push({ kind: 'forecast', entity: m.weather, size: [2, 2] });
    if (m.calendars.length) tiles.push({ kind: 'agenda', calendars: m.calendars, size: [2, 2], days: 7, max: 6 });
    if (m.cameras[0]) tiles.push({ kind: 'camera', entity: m.cameras[0], size: [2, 1] });
    return { title: 'Widgets', sections: [{ tiles }] };
  },

  family(h, m) {
    const sections = [];
    if (m.persons.length) sections.push({ title: 'People', tiles: m.persons.map((id) => ({ kind: 'person', entity: id, battery: personBattery(h, id), size: [2, 1] })) });
    if (m.calendars.length) {
      sections.push({ title: 'Calendar', tiles: [{ kind: 'agenda', calendars: m.calendars, size: [4, 2], days: 14, max: 12, title: 'Next two weeks' }] });
    }
    return { title: 'Family', people: false, sections };
  },

  rooms(h, m) {
    const sections = m.rooms.map((r) => {
      const ids = (r.pinned || ROOM_ROW_DOMAINS.flatMap((d) => r.entities.filter((id) => domainOf(id) === d
        && !UNAVAILABLE.includes(h.states[id]?.state)))).slice(0, 11);
      return { title: r.name, sub: r.floor, hue: r.hue,
        tiles: [roomTile(r), ...ids.map((id) => entTile(id, { areaName: r.name, hue: r.hue }))] };
    });
    return { title: 'Rooms', pills: true, sections, compactSections: true };
  },

  room(h, m, cfg, opts) {
    const r = m.areaById[opts.area];
    if (!r) return { title: 'Room', sections: [{ tiles: [] }] };
    const sections = [];
    if (r.pinned) sections.push({ tiles: r.pinned.map((id) => entTile(id, { areaName: r.name })) });
    for (const g of ROOM_GROUPS) {
      let ids = (r.groups[g.id] || []).filter((id) => !r.pinned?.includes(id));
      if (!ids.length) continue;
      if (g.id === 'cameras') { sections.push({ title: g.title, tiles: ids.map((id) => ({ kind: 'camera', entity: id, size: [2, 1] })) }); continue; }
      sections.push({ title: g.title, tiles: ids.map((id) => entTile(id, { areaName: r.name, size: domainOf(id) === 'climate' ? [2, 1] : [1, 1] })) });
    }
    return { title: r.name, back: true, room: r, hue: r.hue, sections };
  },

  energy(h, m, cfg, opts, page) {
    const prefs = getEnergyPrefs(h, () => page.rebuild());
    const ec = cfg.energy || {};
    if (prefs === undefined) return { title: 'Energy', sections: [{ tiles: [] }], note: 'Loading energy settings…' };
    const src = prefs?.energy_sources || [];
    const grid = src.find((s) => s.type === 'grid') || {};
    const solar = src.filter((s) => s.type === 'solar');
    const bat = src.filter((s) => s.type === 'battery');
    const gridIn = [...asList(grid.flow_from).map((f) => f.stat_energy_from), grid.stat_energy_from].filter(Boolean);
    const gridOut = [...asList(grid.flow_to).map((f) => f.stat_energy_to), grid.stat_energy_to].filter(Boolean);
    const solarIds = solar.map((s) => s.stat_energy_from).filter(Boolean);
    const batOut = bat.map((s) => s.stat_energy_from).filter(Boolean);
    const batIn = bat.map((s) => s.stat_energy_to).filter(Boolean);

    // live power: config, else the energy settings' power sensors, else a guess by name
    const powerSensors = (m.byDomain.sensor || []).filter((id) => h.states[id]?.attributes?.device_class === 'power');
    const guess = (re) => powerSensors.find((id) => re.test(id)) || null;
    const statRate = (s) => s?.stat_rate || s?.power_config?.stat_rate || null;
    const power = {
      solar: ec.solar_power || statRate(solar[0]) || (solarIds.length ? guess(/solar|pv/) : null),
      grid: ec.grid_power || statRate(grid) || guess(/grid/),
      battery: ec.battery_power || statRate(bat[0]) || (bat.length ? guess(/battery/) : null),
      battery_level: ec.battery_level || (bat.length ? (m.byDomain.sensor || []).find((id) => h.states[id]?.attributes?.device_class === 'battery' && /powerwall|battery_level|home_battery|storage/.test(id)) : null) || null,
      home: ec.home_power || guess(/home|house|load|consumption/),
    };
    Object.keys(power).forEach((k) => { if (!power[k]) delete power[k]; });

    const top = [];
    if (Object.keys(power).length) top.push({ kind: 'energy_now', power, size: [2, 2] });
    const stats = [];
    const S = (ids, role, sign = 1) => ids.map((id) => ({ id, role: `${role}:${id}`, sign }));
    const sumRole = (v, role) => Object.entries(v).filter(([k]) => k.startsWith(role + ':')).reduce((a, [, x]) => a + (x || 0), 0);
    const all = [...S(gridIn, 'gin'), ...S(gridOut, 'gout'), ...S(solarIds, 'sol'), ...S(batOut, 'bout'), ...S(batIn, 'bin')];
    const homeUse = (v) => sumRole(v, 'gin') + sumRole(v, 'sol') - sumRole(v, 'gout') + sumRole(v, 'bout') - sumRole(v, 'bin');
    if (gridIn.length || solarIds.length) {
      stats.push({ kind: 'energy_stat', title: 'Home used', icon: 'mdi:home-lightning-bolt-outline', stats: all, compute: homeUse, size: [2, 1] });
    }
    if (solarIds.length) stats.push({ kind: 'energy_stat', title: 'Solar produced', icon: 'mdi:solar-power-variant', color: '#FFB800', stats: S(solarIds, 'sol'), size: [2, 1] });
    if (gridIn.length) stats.push({ kind: 'energy_stat', title: 'From grid', icon: 'mdi:transmission-tower-import', color: '#8E8E93', stats: S(gridIn, 'gin'), size: [2, 1] });
    if (gridOut.length) stats.push({ kind: 'energy_stat', title: 'To grid', icon: 'mdi:transmission-tower-export', color: '#8E8E93', stats: S(gridOut, 'gout'), size: [2, 1] });
    if (batOut.length) stats.push({ kind: 'energy_stat', title: 'From battery', icon: 'mdi:home-battery-outline', color: '#34C759', stats: S(batOut, 'bout'), size: [2, 1] });
    if (gridIn.length && (solarIds.length || batOut.length)) {
      stats.push({ kind: 'energy_stat', title: 'Self-sufficiency', icon: 'mdi:leaf', color: '#34C759', unit: '%', stats: all, size: [2, 1],
        compute: (v) => { const u = homeUse(v); return u > 0.05 ? clamp(100 * (1 - sumRole(v, 'gin') / u), 0, 100) : null; } });
    }
    const sections = [{ tiles: [...top, ...stats] }];

    const devices = asList(prefs?.device_consumption);
    if (devices.length) {
      const devTiles = devices.map((d) => {
        const statId = d.stat_consumption;
        const reg = h.entities?.[statId];
        const dev = reg?.device_id && h.devices?.[reg.device_id];
        const powerId = dev ? Object.values(h.entities).find((e) => e.device_id === dev.id && h.states[e.entity_id]?.attributes?.device_class === 'power')?.entity_id : null;
        const name = d.name || dev?.name_by_user || dev?.name || h.states[statId]?.attributes?.friendly_name || statId;
        return { kind: 'energy_device', stat: statId, power: powerId, name, size: [2, 1] };
      });
      // most used today first: once every number is in, the page is rebuilt in that order
      devTiles.forEach((t) => getStatToday(h, t.stat, () => page.scheduleRebuild()));
      devTiles.sort((a, b) => (getStatToday(h, b.stat) || 0) - (getStatToday(h, a.stat) || 0));
      sections.push({ title: 'Devices today', tiles: devTiles.slice(0, ec.devices || 12) });
    }
    if (!src.length && !Object.keys(power).length && !devices.length) {
      return { title: 'Energy', sections: [], note: 'Set up the Energy dashboard in Home Assistant (Settings → Dashboards → Energy) and HomeView fills this page in.' };
    }
    return { title: 'Energy', sections };
  },

  cameras(h, m) {
    return { title: 'Cameras', sections: [{ tiles: m.cameras.map((id) => ({ kind: 'camera', entity: id, size: [2, 1] })) }] };
  },

  // custom_pages: [{ path, title, icon, color, pills, sections: [{ title, tiles: [...] }] }]
  custom(h, m, cfg, opts) {
    const d = asList(cfg.custom_pages)[opts.custom] || {};
    return { title: d.title || 'Page', hue: hueOf(d.color, 200), pills: !!d.pills, sections: [] };
  },
};

/* ============================================================================================
 * <homeview-page>: one page of the dashboard (header, sections, popups, swipe)
 * ========================================================================================== */

const PAGE_CSS = `
:host { display:block; }
* { box-sizing:border-box; }
.page { min-height:calc(100vh - var(--header-height, 56px)); background:var(--hv-bg); color:var(--hv-fg); font-family:${FONT};
  padding:var(--hv-pad) var(--hv-pad) calc(var(--hv-pad) * 2); -webkit-font-smoothing:antialiased; }
.head { display:flex; flex-wrap:wrap; align-items:flex-start; justify-content:space-between; gap:12px 20px; margin-bottom:calc(var(--hv-gap) * 1.2); }
.date { font-size:13px; font-weight:650; letter-spacing:.06em; text-transform:uppercase; color:var(--hv-fg2); }
.title { font-size:clamp(26px, 4vw, 34px); font-weight:750; letter-spacing:-.02em; line-height:1.15; display:flex; align-items:center; gap:10px; }
.title .sub { font-size:15px; font-weight:500; color:var(--hv-fg2); letter-spacing:0; }
.back { all:unset; cursor:pointer; width:36px; height:36px; border-radius:50%; background:var(--hv-pill); display:inline-flex;
  align-items:center; justify-content:center; --mdc-icon-size:22px; }
.pills { display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end; max-width:100%; }
.pill { all:unset; cursor:pointer; display:inline-flex; align-items:center; gap:6px; padding:7px 12px; border-radius:999px;
  background:var(--hv-pill); font-size:13.5px; font-weight:650; color:var(--hv-fg); --mdc-icon-size:17px; white-space:nowrap; }
.pill ha-icon { color:var(--hv-icon); }
.pill.active ha-icon { color:var(--hv-accent); }
.pill.alert { background:#FF3B30; color:#fff; }
.pill.alert ha-icon { color:#fff; }
.people { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
.avatar { width:34px; height:34px; border-radius:50%; background:var(--hv-pill); display:flex; align-items:center; justify-content:center;
  font-size:12px; font-weight:700; color:var(--hv-accent); overflow:hidden; box-shadow:0 0 0 2px var(--hv-line); cursor:pointer; }
.avatar.home { box-shadow:0 0 0 2px #34C759; }
.avatar img { width:100%; height:100%; object-fit:cover; }
.sec { margin-bottom:calc(var(--hv-gap) * 1.6); }
.sec.compact { margin-bottom:var(--hv-gap); }
.sec-h { display:flex; align-items:baseline; gap:10px; margin:0 2px 10px; font-size:19px; font-weight:700; }
.sec-h .sub { font-size:13px; color:var(--hv-fg2); font-weight:500; }
.sec-h .more { margin-left:auto; font-size:14px; font-weight:600; color:var(--hv-accent); cursor:pointer; }
.compact .sec-h { display:none; }
.grid { display:grid; grid-template-columns:repeat(var(--hv-cols), minmax(0, 1fr)); grid-auto-rows:var(--hv-row);
  gap:var(--hv-gap); grid-auto-flow:row dense; }
.note { padding:24px; border-radius:22px; background:var(--hv-tile); color:var(--hv-fg2); font-size:15px; }
.pop { position:fixed; inset:0; z-index:10; background:rgba(0,0,0,.35); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
  display:flex; align-items:flex-end; justify-content:center; }
@media (min-width:700px) { .pop { align-items:center; } }
.sheet { width:min(920px, 100%); max-height:86vh; overflow:auto; background:var(--hv-bg); border-radius:26px 26px 0 0; padding:18px var(--hv-pad) 28px; }
@media (min-width:700px) { .sheet { border-radius:26px; } }
.sheet-h { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:14px; font-size:21px; font-weight:750; position:sticky; top:-18px; background:inherit; padding:6px 0; z-index:3; }
.sheet-b { display:flex; gap:8px; align-items:center; }
.pen { width:32px; height:32px; margin-left:4px; --mdc-icon-size:18px; color:var(--hv-fg2); }
.txt { all:unset; cursor:pointer; display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:999px; background:var(--hv-pill);
  font-size:14px; font-weight:650; color:var(--hv-fg); --mdc-icon-size:17px; font-family:${FONT}; }
.txt.primary { background:var(--hv-accent); color:#fff; }
.editbar { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:10px; margin-top:12px; padding:10px 12px 10px 16px;
  border-radius:16px; background:var(--hv-pill); font-size:13.5px; color:var(--hv-fg2); --mdc-icon-size:15px; }
.editbar ha-icon { vertical-align:-2px; }
.editbar b { color:var(--hv-fg); }
.eb { display:flex; gap:8px; }
.hidden-sec .sec-h { color:var(--hv-fg2); }
.topbar { flex-basis:100%; display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:-4px; }
.nav { display:flex; gap:6px; overflow-x:auto; scrollbar-width:none; min-width:0; }
.nav::-webkit-scrollbar { display:none; }
.nv, .chip { all:unset; cursor:pointer; display:inline-flex; align-items:center; gap:6px; padding:7px 12px; border-radius:999px; flex:none;
  font:650 13.5px ${FONT}; color:var(--hv-fg2); --mdc-icon-size:18px; }
.nv.on { background:var(--hv-pill); color:var(--hv-fg); }
.nv.on ha-icon { color:var(--hv-accent); }
.chip { background:var(--hv-pill); color:var(--hv-fg); }
@media (max-width:700px) { .nv span { display:none; } .nv { padding:8px 10px; } }
.upd { all:unset; cursor:pointer; flex-basis:100%; display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:16px;
  background:var(--hv-accent); color:#fff; font:500 14px ${FONT}; --mdc-icon-size:22px; box-sizing:border-box; }
.upd b { font-weight:700; }
.hint { color:var(--hv-fg2); font-size:14px; line-height:1.45; margin:0 0 12px; }
.yaml { background:var(--hv-tile); border-radius:14px; padding:14px 16px; font-size:13px; line-height:1.5; overflow:auto; white-space:pre;
  font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color:var(--hv-fg); user-select:text; -webkit-user-select:text; }
.toast { position:fixed; left:50%; bottom:28px; transform:translateX(-50%); z-index:20; background:rgba(20,20,20,.85); color:#fff;
  padding:10px 18px; border-radius:999px; font:600 14px ${FONT}; }
homeview-strategy-editor { display:block; }
`;

class HomeViewPage extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const st = document.createElement('style'); st.textContent = PAGE_CSS;
    this.shadowRoot.appendChild(st);
    this._root = document.createElement('div');
    this._root.className = 'page';
    this.shadowRoot.appendChild(this._root);
    this._tiles = [];
    this._bindSwipe();
  }

  setConfig(config) {
    if (!config?.page) throw new Error('homeview-page: `page` is required');
    this._config = config;
    this._sig = null;
  }

  getCardSize() { return 12; }

  set hass(h) {
    this._hass = h;
    const sig = this._signature(h);
    if (sig !== this._sig) { this._sig = sig; this.rebuild(); return; }
    this._tiles.forEach((t) => { t.hass = h; });
    this._renderHead();
  }

  connectedCallback() {
    if (!this._ro) {
      this._ro = new ResizeObserver(() => this._layout());
      this._ro.observe(this);
    }
    hvPagesOnScreen++;
    this._kiosk();
  }
  disconnectedCallback() {
    this._ro?.disconnect(); this._ro = null;
    hvPagesOnScreen = Math.max(0, hvPagesOnScreen - 1);
    // switching between HomeView pages reconnects at once; leaving HomeView doesn't
    setTimeout(() => { if (!hvPagesOnScreen) applyKiosk(false); }, 600);
  }

  _kiosk() {
    if (!this._config) return;
    const on = kioskWanted(this._config.options);
    applyKiosk(on);
    // HA renders its header after the first card on a fresh load: apply once more then
    if (on && !this._kioskRetry) { this._kioskRetry = setTimeout(() => { this._kioskRetry = null; if (this.isConnected) applyKiosk(kioskWanted(this._config.options)); }, 1200); }
  }

  // rebuild the page when entities / areas / devices change (not on every state change)
  _signature(h) {
    if (this._ents !== h.entities || this._areas !== h.areas || this._devs !== h.devices || this._nStates !== Object.keys(h.states).length
        || this._dark !== isDark(h, this._config.options)) {
      this._ents = h.entities; this._areas = h.areas; this._devs = h.devices; this._nStates = Object.keys(h.states).length;
      this._dark = isDark(h, this._config.options);
      this._gen = (this._gen || 0) + 1;
    }
    return this._gen;
  }

  rebuild() {
    const h = this._hass;
    if (!h) return;
    const cfg = this._config.options || {};
    this._model = buildModel(h, cfg);
    const builder = PAGES[this._config.page];
    const page = builder ? builder(h, this._model, cfg, this._config, this) : { title: '?', sections: [] };
    this._page = page;
    const pd = PAGE_DEFS[this._config.page] || {};
    const pageCfg = cfg.pages_config?.[this._config.page] || {};
    const hue = hueOf(pageCfg.color, page.hue ?? pd.hue ?? 28);
    const dark = isDark(h, cfg);
    this._dark = dark;
    this._root.setAttribute('style', styleVars(palette(hue, dark, pd.sat ?? 1)));

    // the user's own sections (pages_config.<page>.sections, rooms.<area>.sections, custom_pages)
    const extra = this._config.page === 'custom' ? asList(cfg.custom_pages)[this._config.custom]?.sections
      : this._config.page === 'room' ? cfg.rooms?.[this._config.area]?.sections : pageCfg.sections;
    for (const sec of userSections(extra, h, this._model)) {
      if (sec.position === 'top') page.sections.unshift(sec); else page.sections.push(sec);
    }
    const editing = this._editing;
    if (editing) page.sections.push(...this._hiddenSections());

    this._tiles = [];
    const frag = document.createDocumentFragment();
    const head = document.createElement('div'); head.className = 'head';
    frag.appendChild(head);
    this._head = head; this._headKey = null;
    const notes = [];
    if (page.note) notes.push(page.note);
    if (h.user?.is_admin) {
      const unknown = Object.keys(cfg).filter((k) => !KNOWN_OPTIONS.includes(k));
      if (unknown.length) notes.push(`HomeView: unknown option${unknown.length > 1 ? 's' : ''} ${unknown.join(', ')} — check the spelling (README → Configuration). Only admins see this.`);
    }
    for (const t of notes) { const n = document.createElement('div'); n.className = 'note'; n.textContent = t; frag.appendChild(n); }
    if (!page.sections.some((x) => x.tiles.length) && !notes.length) {
      const n = document.createElement('div'); n.className = 'note';
      n.textContent = this._config.page === 'custom' ? 'This page has no tiles yet. Add some under custom_pages → sections → tiles.' : 'Nothing to show here yet.';
      frag.appendChild(n);
    }
    for (const sec of page.sections) {
      if (!sec.tiles.length) continue;
      const s = document.createElement('div');
      s.className = 'sec' + (page.compactSections && !editing ? ' compact' : '') + (sec.hidden ? ' hidden-sec' : '');
      if (sec.title) {
        s.insertAdjacentHTML('beforeend', `<div class="sec-h">${esc(sec.title)}${sec.sub ? `<span class="sub">${esc(sec.sub)}</span>` : ''}${sec.link ? `<span class="more" data-nav="${esc(sec.link)}">See all ›</span>` : ''}</div>`);
      }
      const g = document.createElement('div'); g.className = 'grid';
      if (sec.hue !== undefined) g.setAttribute('style', styleVars(palette(sec.hue, dark)));
      for (const spec of sec.tiles) g.appendChild(this._tile(spec, dark));
      s.appendChild(g);
      frag.appendChild(s);
    }
    this._root.replaceChildren(frag);
    this._root.querySelectorAll('[data-nav]').forEach((el) => el.addEventListener('click', () => navigate(el.dataset.nav)));
    this._renderHead();
    this._layout();
  }

  /* ---------------- edit mode ---------------- */

  get _editing() {
    try { return sessionStorage.getItem('homeview-edit') === '1'; } catch (e) { return !!window.__homeviewEdit; }
  }

  _setEditing(on) {
    try { if (on) sessionStorage.setItem('homeview-edit', '1'); else sessionStorage.removeItem('homeview-edit'); } catch (e) { window.__homeviewEdit = on; }
    this.rebuild();
  }

  _favorites() {
    const f = this._config.options?.home?.favorites;
    return f !== undefined ? asList(f) : favoritesAuto(this._hass, this._model);
  }

  // what you can do to a tile in edit mode
  _editFor(spec) {
    if (!this._editing || !this._hass?.user?.is_admin) return null;
    const onEdit = (a, s) => this._onEdit(a, s);
    if (spec.hiddenRoom) return { actions: ['unhide-room'], onEdit };
    if (spec.hiddenEnt) return { actions: ['unhide'], onEdit };
    if (spec.kind === 'room') return { actions: ['color', 'hide-room'], onEdit };
    if (spec.kind === 'entity' && !spec.user) {
      return { actions: [this._favorites().includes(spec.entity) ? 'unfav' : 'fav', 'size', 'name', 'hide'], onEdit };
    }
    return null;
  }

  // hidden entities / rooms, shown faded at the bottom in edit mode so they can come back
  _hiddenSections() {
    const h = this._hass, cfg = this._config.options || {}, m = this._model;
    const page = this._config.page;
    if (!['home', 'rooms', 'room'].includes(page)) return [];
    let ents = [...new Set([...asList(cfg.exclude_entities),
      ...Object.entries(cfg.customize || {}).filter(([, c]) => c?.hidden).map(([id]) => id)])].filter((id) => h.states[id]);
    if (page === 'room') ents = ents.filter((id) => entityArea(h, id) === this._config.area);
    const rooms = page === 'room' ? [] : asList(cfg.hide_rooms).map((id) => h.areas?.[id]).filter(Boolean)
      .map((a) => ({ id: a.area_id, name: a.name, icon: a.icon || 'mdi:floor-plan', hue: 220, groups: {}, alerts: [], entities: [] }));
    if (!ents.length && !rooms.length) return [];
    return [{ title: 'Hidden', sub: 'tap the eye to show again', hidden: true, tiles: [
      ...rooms.map((r) => ({ ...roomTile(r), hiddenRoom: true })),
      ...ents.map((id) => entTile(id, { hiddenEnt: true, showRoom: true, areaName: m.areaById[entityArea(h, id)]?.name })),
    ] }];
  }

  async _onEdit(a, spec) {
    const h = this._hass, id = spec.entity;
    let name = null;
    if (a === 'name') {
      const cur = this._config.options?.customize?.[id]?.name ?? shortName(h, id, spec.areaName);
      name = window.prompt('Tile name (leave empty for the automatic name)', cur);
      if (name === null) return;
    }
    const autoFavs = this._favorites();
    await this._save((o) => {
      o.customize = o.customize || {};
      o.home = o.home || {};
      const cz = id ? (o.customize[id] = o.customize[id] || {}) : {};
      const favs = () => asList(o.home.favorites ?? autoFavs);
      switch (a) {
        case 'fav': o.home.favorites = [...favs().filter((x) => x !== id), id]; break;
        case 'unfav': o.home.favorites = favs().filter((x) => x !== id); break;
        case 'size': {
          const sizes = [[1, 1], [2, 1], [2, 2]];
          const curS = spec.size || [1, 1];
          const i = sizes.findIndex((x) => x[0] === curS[0] && x[1] === curS[1]);
          const nx = sizes[(i + 1) % sizes.length];
          cz.size = `${nx[0]}x${nx[1]}`;
          break;
        }
        case 'name': if (name.trim()) cz.name = name.trim(); else delete cz.name; break;
        case 'hide':
          o.exclude_entities = [...new Set([...asList(o.exclude_entities), id])];
          if (o.home.favorites) o.home.favorites = asList(o.home.favorites).filter((x) => x !== id);
          break;
        case 'unhide': o.exclude_entities = asList(o.exclude_entities).filter((x) => x !== id); delete cz.hidden; break;
        case 'color': {
          o.rooms = o.rooms || {};
          const rc = (o.rooms[spec.room.id] = o.rooms[spec.room.id] || {});
          rc.color = COLOR_CYCLE[(COLOR_CYCLE.indexOf(rc.color) + 1) % COLOR_CYCLE.length];
          break;
        }
        case 'hide-room': o.hide_rooms = [...new Set([...asList(o.hide_rooms), spec.room.id])]; break;
        case 'unhide-room': o.hide_rooms = asList(o.hide_rooms).filter((x) => x !== spec.room.id); break;
        default: break;
      }
    });
  }

  // save, then show the result right away (HA also reloads the dashboard after a save)
  async _save(mutate) {
    this._toast('Saving…');
    const r = await saveStrategy(this._hass, this._config.options, mutate);
    if (r.ok) {
      const { type, ...opts } = r.config;
      this._config = { ...this._config, options: opts };
      this._toast('Saved');
      this.rebuild();
    } else {
      this._toast('');
      this._yamlSheet(r.config, true);
    }
    return r;
  }

  _toast(text) {
    let t = this.shadowRoot.querySelector('.toast');
    if (!text) { t?.remove(); return; }
    if (!t) { t = document.createElement('div'); t.className = 'toast'; this.shadowRoot.appendChild(t); }
    t.textContent = text;
    clearTimeout(this._toastT);
    if (text !== 'Saving…') this._toastT = setTimeout(() => t.remove(), 1600);
  }

  _sheet(title, buttons = '') {
    const pop = document.createElement('div'); pop.className = 'pop';
    const sheet = document.createElement('div'); sheet.className = 'sheet';
    sheet.innerHTML = `<div class="sheet-h"><span>${esc(title)}</span><span class="sheet-b">${buttons}<button class="back" data-close title="Close"><ha-icon icon="mdi:close"></ha-icon></button></span></div>`;
    pop.appendChild(sheet);
    const close = () => pop.remove();
    pop.addEventListener('click', (e) => { if (e.target === pop) close(); });
    sheet.querySelector('[data-close]').addEventListener('click', close);
    this._root.appendChild(pop);
    return { pop, sheet, close };
  }

  _yamlSheet(config, failed) {
    const yaml = `strategy:${toYaml(config, '  ')}\n`;
    const { sheet } = this._sheet(failed ? 'Paste this into your dashboard' : 'HomeView YAML', '<button class="txt" data-copy>Copy</button>');
    sheet.insertAdjacentHTML('beforeend', `${failed ? `<p class="hint">This dashboard is set up in YAML, so HomeView can't save it from here. Copy this into the dashboard's YAML file (or its raw configuration editor) instead.</p>` : '<p class="hint">Your dashboard configuration. Edit it in the raw configuration editor, or keep it as a backup.</p>'}<pre class="yaml"></pre>`);
    sheet.querySelector('pre').textContent = yaml;
    sheet.querySelector('[data-copy]').addEventListener('click', async (e) => {
      try { await navigator.clipboard.writeText(yaml); e.target.textContent = 'Copied'; } catch (err) { e.target.textContent = 'Select and copy'; }
    });
  }

  async _settings() {
    const h = this._hass;
    const cur = await loadStrategyConfig(h);
    let draft = cur?.strategy || { type: 'custom:homeview', ...(this._config.options || {}) };
    const { sheet, close } = this._sheet('HomeView settings', '<button class="txt" data-yaml>YAML</button><button class="txt primary" data-save>Save</button>');
    const ed = document.createElement('homeview-strategy-editor');
    ed.hass = h;
    ed.setConfig(draft);
    ed.addEventListener('config-changed', (e) => { e.stopPropagation(); draft = e.detail.config; });
    sheet.appendChild(ed);
    sheet.querySelector('[data-yaml]').addEventListener('click', () => this._yamlSheet(cleanConfig(draft), false));
    sheet.querySelector('[data-save]').addEventListener('click', async () => {
      const r = await this._save((o) => { Object.keys(o).forEach((k) => delete o[k]); Object.assign(o, JSON.parse(JSON.stringify(draft))); });
      if (r.ok) close();
    });
  }

  scheduleRebuild() {
    clearTimeout(this._rb);
    this._rb = setTimeout(() => this.rebuild(), 400);
  }

  _tile(spec, dark) {
    // customize: per-entity name / icon / size / tap from the config
    const cz = spec.entity && this._config.options?.customize?.[spec.entity];
    if (cz && ['entity', 'camera', 'person'].includes(spec.kind)) {
      spec = { ...spec, name: cz.name ?? spec.name, icon: cz.icon ?? spec.icon, tap: cz.tap ?? spec.tap, size: parseSize(cz.size, spec.size) };
    }
    const t = document.createElement('homeview-tile');
    t.spec = spec;
    t.hass = this._hass;
    const edit = this._editFor(spec);
    if (edit) t.edit = edit;
    if (spec.hue !== undefined) t.setAttribute('style', styleVars(palette(spec.hue, dark)));
    if (spec.hiddenEnt || spec.hiddenRoom) t.style.opacity = '0.6';
    t._hvSize = spec.size || [1, 1];
    this._tiles.push(t);
    return t;
  }

  // columns from the width: iPhone 2, iPad portrait 4, iPad landscape / tablets 6, desktop up to 8
  _layout() {
    const w = this.clientWidth || window.innerWidth;
    const cfg = this._config.options || {};
    const pad = w < 500 ? 16 : w < 900 ? 22 : Math.round(clamp(w * 0.025, 24, 40));
    const gap = w < 500 ? 12 : 16;
    const minTile = cfg.tile_size || (w < 500 ? 150 : 175);
    const cols = clamp(Math.floor((w - 2 * pad + gap) / (minTile + gap)), 2, cfg.max_columns || 8);
    const colW = (w - 2 * pad - gap * (cols - 1)) / cols;
    const ratio = window.innerWidth > window.innerHeight * 1.45 ? 1.2 : 1.05;   // wider tiles on wide screens
    const row = Math.round(colW / ratio);
    this._root.style.setProperty('--hv-cols', cols);
    this._root.style.setProperty('--hv-row', `${row}px`);
    this._root.style.setProperty('--hv-gap', `${gap}px`);
    this._root.style.setProperty('--hv-pad', `${pad}px`);
    for (const t of this._tiles) {
      const [sw, sh] = t._hvSize;
      t.style.gridColumn = `span ${Math.min(sw, cols)}`;
      t.style.gridRow = `span ${sh}`;
    }
    this._cols = cols;
  }

  _renderHead() {
    const h = this._hass, page = this._page, head = this._head;
    if (!h || !page || !head) return;
    const cfg = this._config.options || {};
    const m = this._model;
    const pills = page.pills && cfg.pills !== false
      ? asList(cfg.pills && cfg.pills !== true ? cfg.pills : DEFAULT_PILLS).map((id) => [id, PILLS[id]?.(h, m, cfg)]).filter(([, p]) => p)
      : [];
    const people = page.people && cfg.people_chips !== false ? m.persons : [];
    const today = new Date().toLocaleDateString(h.locale?.language, { weekday: 'long', month: 'long', day: 'numeric' });
    const editing = this._editing;
    const canEdit = h.user?.is_admin && cfg.edit_button !== false;
    if (this._updEnt === undefined) this._updEnt = findUpdateEntity(h);
    const upd = h.user?.is_admin && cfg.update_notice !== false && this._updEnt ? h.states[this._updEnt] : null;
    const updOn = upd?.state === 'on' && !upd.attributes.skipped_version ? upd.attributes.latest_version : null;
    const kiosk = kioskWanted(cfg);
    const chip = cfg.kiosk !== false && cfg.kiosk_chip !== false;
    const nav = kiosk && !page.back ? asList(this._config.nav) : [];
    const here = this._config.path || this._config.page;
    const key = JSON.stringify([today, page.title, editing, canEdit, updOn, kiosk, here, pills.map(([id, p]) => [id, p.text, p.alert, p.active]), people.map((id) => h.states[id]?.state)]);
    if (key === this._headKey) return;
    this._headKey = key;
    const room = page.room;
    let roomSub = '';
    if (room) {
      const s = roomSummary(h, room);
      roomSub = [s.t !== null ? `${fmt(s.t, 1)}°` : null, s.hu !== null ? `${fmt(s.hu, 0)}%` : null].filter(Boolean).join(' · ');
    }
    const updBanner = updOn ? `<button class="upd" data-more="${esc(this._updEnt)}"><ha-icon icon="mdi:arrow-up-circle"></ha-icon>
        <span><b>HomeView ${esc(updOn)} is available</b> (you have ${esc(HV_VERSION)}). Tap to see what's new and update.</span></button>` : '';
    const topbar = nav.length > 1 || chip ? `<div class="topbar">
        <div class="nav">${nav.length > 1 ? nav.map((v) => `<button class="nv${v.path === here ? ' on' : ''}" data-nav-to="${esc(v.path)}" title="${esc(v.title)}"><ha-icon icon="${esc(v.icon)}"></ha-icon><span>${esc(v.title)}</span></button>`).join('') : ''}</div>
        ${chip ? `<button class="chip" data-kiosk title="${kiosk ? 'Show the Home Assistant menu and header' : 'Full screen: hide the Home Assistant menu and header'}"><ha-icon icon="${kiosk ? 'mdi:dock-left' : 'mdi:fullscreen'}"></ha-icon>${kiosk ? 'Menu' : 'Full screen'}</button>` : ''}</div>` : '';
    head.innerHTML = `${updBanner}${topbar}<div>
        <div class="date">${esc(today)}</div>
        <div class="title">${page.back ? '<button class="back" data-back><ha-icon icon="mdi:chevron-left"></ha-icon></button>' : ''}${esc(page.title)}${roomSub ? `<span class="sub">${esc(roomSub)}</span>` : ''}${canEdit && !editing ? '<button class="back pen" data-edit-on title="Edit HomeView"><ha-icon icon="mdi:pencil-outline"></ha-icon></button>' : ''}</div>
        ${editing ? `<div class="editbar"><span><b>Editing</b> · <ha-icon icon="mdi:star-outline"></ha-icon> on Home · <ha-icon icon="mdi:resize"></ha-icon> size · <ha-icon icon="mdi:rename-outline"></ha-icon> name · <ha-icon icon="mdi:eye-off-outline"></ha-icon> hide · <ha-icon icon="mdi:palette-outline"></ha-icon> room colour</span>
          <span class="eb"><button class="txt" data-settings><ha-icon icon="mdi:cog-outline"></ha-icon> Settings</button><button class="txt primary" data-edit-off>Done</button></span></div>` : ''}
        ${people.length ? `<div class="people">${people.map((id) => {
          const st = h.states[id]; if (!st) return '';
          const pic = st.attributes.entity_picture, nm = st.attributes.friendly_name || id;
          return `<div class="avatar${st.state === 'home' ? ' home' : ''}" data-more="${esc(id)}" title="${esc(nm)} · ${esc(hassState(h, st))}">${pic ? `<img src="${esc(pic)}">` : esc(nm.slice(0, 1).toUpperCase())}</div>`;
        }).join('')}</div>` : ''}
      </div>
      ${pills.length ? `<div class="pills">${pills.map(([id, p]) => `<button class="pill${p.alert ? ' alert' : p.active ? ' active' : ''}" data-pill="${id}"><ha-icon icon="${p.icon}"></ha-icon>${esc(p.text)}${p.popup ? '<ha-icon icon="mdi:chevron-right" style="--mdc-icon-size:15px;opacity:.6"></ha-icon>' : ''}</button>`).join('')}</div>` : ''}`;
    head.querySelector('[data-back]')?.addEventListener('click', () => (history.length > 1 ? history.back() : navigate(cfg.rooms_path || 'rooms')));
    head.querySelector('[data-edit-on]')?.addEventListener('click', () => this._setEditing(true));
    head.querySelectorAll('[data-nav-to]').forEach((el) => el.addEventListener('click', () => navigate(el.dataset.navTo)));
    head.querySelector('[data-kiosk]')?.addEventListener('click', () => { setKioskWanted(!kiosk); applyKiosk(!kiosk); this._headKey = null; this._renderHead(); });
    head.querySelector('[data-edit-off]')?.addEventListener('click', () => this._setEditing(false));
    head.querySelector('[data-settings]')?.addEventListener('click', () => this._settings());
    head.querySelectorAll('[data-more]').forEach((el) => el.addEventListener('click', () => moreInfo(this, el.dataset.more)));
    head.querySelectorAll('[data-pill]').forEach((el) => el.addEventListener('click', () => {
      const p = PILLS[el.dataset.pill](h, m, cfg);
      if (p.popup) this._popup(p.popup); else if (p.more) moreInfo(this, p.more);
    }));
  }

  _popup({ title, ids, showRoom }) {
    const h = this._hass;
    const pop = document.createElement('div'); pop.className = 'pop';
    const sheet = document.createElement('div'); sheet.className = 'sheet';
    sheet.innerHTML = `<div class="sheet-h">${esc(title)}<button class="back" data-close><ha-icon icon="mdi:close"></ha-icon></button></div>`;
    const g = document.createElement('div'); g.className = 'grid';
    const tiles = ids.map((id) => {
      const room = this._model.areaById[entityArea(h, id)];
      return this._tile(entTile(id, { showRoom, areaName: room?.name }), this._dark);
    });
    tiles.forEach((t) => g.appendChild(t));
    sheet.appendChild(g); pop.appendChild(sheet);
    const close = () => { pop.remove(); this._tiles = this._tiles.filter((t) => !tiles.includes(t)); };
    pop.addEventListener('click', (e) => { if (e.target === pop) close(); });
    sheet.querySelector('[data-close]').addEventListener('click', close);
    this._root.appendChild(pop);
    this._layout();
  }

  // swipe left / right between the top-level pages (tablets, phones)
  _bindSwipe() {
    let x0 = null, y0 = 0, t0 = 0;
    this.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1 || this._root.querySelector('.pop')) { x0 = null; return; }
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now();
    }, { passive: true });
    this.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      const cfg = this._config.options || {};
      if (cfg.swipe === false || Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 2 || Date.now() - t0 > 700) return;
      const order = this._config.order || [];
      const i = order.indexOf(this._config.path || this._config.page);
      if (i === -1 || order.length < 2) return;
      navigate(order[(i + (dx < 0 ? 1 : -1) + order.length) % order.length]);
    }, { passive: true });
  }
}
customElements.get('homeview-page') || customElements.define('homeview-page', HomeViewPage);

/* ============================================================================================
 * <homeview-strategy-editor>: the visual editor (HA's "Edit dashboard" dialog and the
 * Settings sheet in HomeView's own edit mode). Built from HA's <ha-form> and selectors.
 * ========================================================================================== */

const EDITOR_LABELS = {
  title: ['Title', 'The Home page heading. Empty = your home\'s name.'],
  theme: ['Theme'],
  pages: ['Pages', 'Which pages to show, in swipe order. Pages with nothing to show are skipped.'],
  swipe: ['Swipe between pages'],
  edit_button: ['Show the edit (pencil) button', 'Admins only.'],
  update_notice: ['Tell me when a HomeView update is out', 'A banner for admins when HACS has a newer version.'],
  kiosk: ['Full screen (kiosk mode)', 'Hide Home Assistant\'s header and sidebar while HomeView is open. Each device can still switch it with the Menu chip.'],
  kiosk_chip: ['Show the Menu / Full screen chip', 'Turn off on a wall tablet so nobody leaves full screen by accident (?kiosk=off in the URL still works).'],
  favorites: ['Favourites', 'Tiles near the top of Home. Empty = automatic (alarm, locks, garage, thermostat).'],
  rooms: ['Show rooms on Home'],
  scenes: ['Show scenes on Home'],
  max_scenes: ['Most scenes on Home'],
  people: ['People', 'Empty = everyone with a phone / tracker.'],
  calendars: ['Calendars', 'Empty = all calendars.'],
  weather: ['Weather', 'Empty = the first weather entity.'],
  cameras: ['Cameras', 'Empty = all cameras.'],
  people_chips: ['People avatars under the Home title'],
  room_order: ['Room order', 'These rooms first, in this order; the rest after.'],
  hide_rooms: ['Hide rooms'],
  name: ['Name'], icon: ['Icon'], color: ['Colour'],
  entities: ['Show first', 'These entities first, in this order (instead of the automatic pick on the Rooms page).'],
  temperature: ['Temperature sensor'], humidity: ['Humidity sensor'],
  exclude_entities: ['Hide entities', 'Never show these anywhere.'],
  pills: ['Status pills', 'Empty = all of them.'],
  battery_low: ['Low battery below'],
  solar_power: ['Solar power'], grid_power: ['Grid power', '+ import, − export'],
  battery_power: ['Battery power', '+ discharge, − charge'], battery_level: ['Battery level'],
  home_power: ['Home power', 'Empty = solar + grid + battery.'], devices: ['Devices listed'],
  tile_size: ['Smallest tile width', 'Columns are fitted to the screen with tiles at least this wide.'],
  max_columns: ['Most columns'],
};

const PILL_NAMES = { alarm: 'Alarm', climate: 'Climate', lights: 'Lights on', locks: 'Locks', openings: 'Doors & windows',
  safety: 'Leaks, smoke & gas', batteries: 'Batteries', media: 'Now playing' };

// What HomeView does when an option is not set: shown in the editor, left out when saving
const EDITOR_DEFAULTS = { theme: 'auto', pages: DEFAULT_PAGES, swipe: true, edit_button: true, update_notice: true, kiosk: true, kiosk_chip: true, people_chips: true, battery_low: 20,
  home: { rooms: true, scenes: true, max_scenes: 8 } };

function withDefaults(o, d = EDITOR_DEFAULTS) {
  const out = { ...o };
  for (const [k, v] of Object.entries(d)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = withDefaults(o[k] || {}, v);
    else if (out[k] === undefined) out[k] = v;
  }
  return out;
}
function withoutDefaults(o, d = EDITOR_DEFAULTS) {
  const out = { ...o };
  for (const [k, v] of Object.entries(d)) {
    if (out[k] === undefined) continue;
    if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = withoutDefaults(out[k] || {}, v);
    else if (JSON.stringify(out[k]) === JSON.stringify(v)) delete out[k];
  }
  return out;
}

function editorSchema(hass) {
  const areas = Object.values(hass.areas || {}).sort((a, b) => a.name.localeCompare(b.name));
  const sensor = (dc) => ({ entity: { filter: { domain: 'sensor', device_class: dc } } });
  return [
    { type: 'expandable', name: '', flatten: true, title: 'General', icon: 'mdi:cog-outline', expanded: true, schema: [
      { name: 'title', selector: { text: {} } },
      { name: 'theme', selector: { select: { mode: 'dropdown', options: [
        { value: 'auto', label: 'Follow Home Assistant' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }] } } },
      { name: 'pages', selector: { select: { multiple: true, reorder: true,
        options: DEFAULT_PAGES.map((p) => ({ value: p, label: PAGE_DEFS[p].title })) } } },
      { name: 'swipe', selector: { boolean: {} } },
      { name: 'edit_button', selector: { boolean: {} } },
      { name: 'update_notice', selector: { boolean: {} } },
      { name: 'kiosk', selector: { boolean: {} } },
      { name: 'kiosk_chip', selector: { boolean: {} } },
    ] },
    { type: 'expandable', name: 'home', title: 'Home page', icon: 'mdi:home-outline', schema: [
      { name: 'favorites', selector: { entity: { multiple: true } } },
      { name: 'rooms', selector: { boolean: {} } },
      { name: 'scenes', selector: { boolean: {} } },
      { name: 'max_scenes', selector: { number: { min: 0, max: 24, mode: 'box' } } },
    ] },
    { type: 'expandable', name: '', flatten: true, title: 'People, calendars, weather & cameras', icon: 'mdi:account-group-outline', schema: [
      { name: 'people', selector: { entity: { multiple: true, filter: { domain: 'person' } } } },
      { name: 'people_chips', selector: { boolean: {} } },
      { name: 'calendars', selector: { entity: { multiple: true, filter: { domain: 'calendar' } } } },
      { name: 'weather', selector: { entity: { filter: { domain: 'weather' } } } },
      { name: 'cameras', selector: { entity: { multiple: true, filter: { domain: 'camera' } } } },
    ] },
    { type: 'expandable', name: '', flatten: true, title: 'Rooms', icon: 'mdi:sofa-outline', schema: [
      { name: 'room_order', selector: { select: { multiple: true, reorder: true, options: areas.map((a) => ({ value: a.area_id, label: a.name })) } } },
      { name: 'hide_rooms', selector: { area: { multiple: true } } },
      { type: 'expandable', name: 'rooms', title: 'Each room: name, icon, colour, what to show first', icon: 'mdi:floor-plan', schema:
        areas.map((a) => ({ type: 'expandable', name: a.area_id, title: a.name, icon: a.icon || 'mdi:floor-plan', schema: [
          { name: 'name', selector: { text: {} } },
          { name: 'icon', selector: { icon: {} } },
          { name: 'color', selector: { ui_color: {} } },
          { name: 'entities', selector: { entity: { multiple: true } } },
          { name: 'temperature', selector: sensor('temperature') },
          { name: 'humidity', selector: sensor('humidity') },
        ] })) },
    ] },
    { type: 'expandable', name: '', flatten: true, title: 'Hide things', icon: 'mdi:eye-off-outline', schema: [
      { name: 'exclude_entities', selector: { entity: { multiple: true } } },
      { name: 'pills', selector: { select: { multiple: true, options: DEFAULT_PILLS.map((p) => ({ value: p, label: PILL_NAMES[p] })) } } },
      { name: 'battery_low', selector: { number: { min: 5, max: 60, step: 5, unit_of_measurement: '%', mode: 'slider' } } },
    ] },
    { type: 'expandable', name: 'energy', title: 'Energy', icon: 'mdi:lightning-bolt-outline', schema: [
      { name: 'solar_power', selector: sensor('power') },
      { name: 'grid_power', selector: sensor('power') },
      { name: 'battery_power', selector: sensor('power') },
      { name: 'battery_level', selector: sensor('battery') },
      { name: 'home_power', selector: sensor('power') },
      { name: 'devices', selector: { number: { min: 0, max: 40, mode: 'box' } } },
    ] },
    { type: 'expandable', name: '', flatten: true, title: 'Layout', icon: 'mdi:view-grid-outline', schema: [
      { name: 'tile_size', selector: { number: { min: 110, max: 280, step: 5, unit_of_measurement: 'px', mode: 'slider' } } },
      { name: 'max_columns', selector: { number: { min: 2, max: 12, mode: 'box' } } },
    ] },
  ];
}

/** Make sure <ha-form> is defined (HA loads it lazily with the card editors). */
async function ensureHaForm(hass) {
  if (customElements.get('ha-form')) return true;
  try {
    const helpers = await window.loadCardHelpers();
    const any = Object.keys(hass.states)[0];
    const card = await helpers.createCardElement({ type: 'tile', entity: any });
    await card.constructor.getConfigElement?.();
  } catch (e) { /* fall through to the wait */ }
  await Promise.race([customElements.whenDefined('ha-form'), new Promise((r) => setTimeout(r, 4000))]);
  return !!customElements.get('ha-form');
}

class HomeViewStrategyEditor extends HTMLElement {
  set hass(h) { this._hass = h; if (this._form) this._form.hass = h; else this._render(); }
  setConfig(config) {
    this._config = config || { type: 'custom:homeview' };
    if (this._form) this._form.data = this._data(); else this._render();
  }

  _data() {
    const { type, ...o } = this._config;
    return withDefaults(o);
  }

  async _render() {
    if (!this._hass || !this._config || this._busy) return;
    this._busy = true;
    const ok = await ensureHaForm(this._hass);
    this._busy = false;
    if (this._form) return;
    if (!ok) {
      this.innerHTML = '<p style="padding:8px 0">The visual editor needs Home Assistant 2024.8 or newer. Use the code editor instead (see the HomeView README).</p>';
      return;
    }
    this.innerHTML = `<p style="margin:0 0 12px;color:var(--secondary-text-color);font-size:14px;line-height:1.45">
      HomeView builds every page from your areas and devices. Everything here is optional.
      To rename, resize, hide or pin a single tile, use the pencil on the dashboard itself.
      Your own tiles, cards and pages go in YAML (README → Your own tiles and pages).</p>`;
    const f = document.createElement('ha-form');
    f.hass = this._hass;
    f.schema = editorSchema(this._hass);
    f.data = this._data();
    f.computeLabel = (s) => EDITOR_LABELS[s.name]?.[0] ?? s.title ?? s.name;
    f.computeHelper = (s) => EDITOR_LABELS[s.name]?.[1];
    f.addEventListener('value-changed', (e) => {
      e.stopPropagation();
      const keep = Object.fromEntries(Object.entries(this._config).filter(([k]) => !(k in e.detail.value) && !this._formKeys().has(k)));
      const config = cleanConfig(withoutDefaults({ type: this._config.type || 'custom:homeview', ...keep, ...e.detail.value }));
      this._config = config;
      this.dispatchEvent(new CustomEvent('config-changed', { detail: { config }, bubbles: true, composed: true }));
    });
    this.appendChild(f);
    this._form = f;
  }

  // top-level keys the form owns (anything else, e.g. customize / custom_pages, is kept as is)
  _formKeys() {
    const keys = new Set();
    const walk = (schema) => schema.forEach((s) => { if (s.type === 'expandable' && s.flatten) walk(s.schema); else if (s.name) keys.add(s.name); });
    walk(editorSchema(this._hass));
    return keys;
  }
}
customElements.get('homeview-strategy-editor') || customElements.define('homeview-strategy-editor', HomeViewStrategyEditor);

/* ============================================================================================
 * The dashboard strategy: builds the list of views
 * ========================================================================================== */

class HomeViewStrategy extends HTMLElement {
  static async generate(config, hass) {
    const { type, ...options } = config || {};
    const m = buildModel(hass, options);
    const customs = asList(options.custom_pages).map((d, i) => ({ ...d, idx: i, path: String(d.path || `page-${i + 1}`) }));
    const wanted = asList(options.pages || DEFAULT_PAGES).filter((p) => PAGE_DEFS[p] || customs.some((c) => c.path === p));
    let hasEnergy = false;
    if (wanted.includes('energy')) {
      try {
        const prefs = await ws(hass, { type: 'energy/get_prefs' });
        hasEnergy = !!(prefs?.energy_sources?.length || prefs?.device_consumption?.length);
      } catch (e) { hasEnergy = false; }
      if (options.energy) hasEnergy = true;
    }
    const available = {
      home: true, widgets: true, rooms: m.rooms.length > 0, energy: hasEnergy,
      family: m.persons.length > 0 || m.calendars.length > 0, cameras: m.cameras.length > 0,
    };
    const pages = [...wanted.filter((p) => !PAGE_DEFS[p] || available[p]),
      ...customs.map((c) => c.path).filter((p) => !wanted.includes(p))];
    const pc = options.pages_config || {};
    const views = pages.map((p) => {
      const c = customs.find((x) => x.path === p);
      if (c) {
        return { title: c.title || 'Page', path: p, icon: c.icon || 'mdi:view-grid-outline', type: 'panel',
          cards: [{ type: 'custom:homeview-page', page: 'custom', custom: c.idx, path: p, order: pages, options }] };
      }
      return { title: pc[p]?.title || PAGE_DEFS[p].title, path: p, icon: pc[p]?.icon || PAGE_DEFS[p].icon, type: 'panel',
        cards: [{ type: 'custom:homeview-page', page: p, path: p, order: pages, options }] };
    });
    const nav = views.map((v) => ({ path: v.path, title: v.title, icon: v.icon }));
    views.forEach((v) => { v.cards[0].nav = nav; });
    for (const r of m.rooms) {
      views.push({
        title: r.name, path: `room-${r.id}`, icon: r.icon, subview: true, back_path: pages.includes('rooms') ? 'rooms' : undefined,
        type: 'panel',
        cards: [{ type: 'custom:homeview-page', page: 'room', area: r.id, order: [], options }],
      });
    }
    return { title: options.title || 'HomeView', views };
  }

  // the visual editor in HA's "Edit dashboard" dialog
  static async getConfigElement() {
    return document.createElement('homeview-strategy-editor');
  }
}
customElements.get('ll-strategy-dashboard-homeview') || customElements.define('ll-strategy-dashboard-homeview', HomeViewStrategy);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'homeview-page')) {
  window.customCards.push({ type: 'homeview-page', name: 'HomeView page', description: 'One HomeView page (home, widgets, family, rooms, room, energy, cameras).' });
}

console.info(`%c HOMEVIEW %c ${HV_VERSION} `, 'color:#fff;background:#E07A2E;font-weight:700;border-radius:4px 0 0 4px;padding:2px 4px',
  'color:#E07A2E;background:#FBF1E6;font-weight:700;border-radius:0 4px 4px 0;padding:2px 4px');
