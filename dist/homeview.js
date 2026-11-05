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
const HV_VERSION = '0.8.4';
// where this file was loaded from (to re-download it after an update)
const HV_URL = (() => { try { return import.meta.url; } catch (e) { return null; } })();

/* ============================================================================================
 * Constants
 * ========================================================================================== */

const PAGE_DEFS = {
  home:    { title: 'Home',    icon: 'mdi:home',                    hue: 28 },
  widgets: { title: 'Widgets', icon: 'mdi:view-dashboard-variant',  hue: 200, sat: 0.35 },
  living:  { title: 'Living',  icon: 'mdi:sofa-outline',            hue: 28 },
  people:  { title: 'People',  icon: 'mdi:account-group',           hue: 265 },
  all_rooms: { title: 'All rooms', icon: 'mdi:floor-plan',          hue: 110 },
  energy:  { title: 'Energy',  icon: 'mdi:lightning-bolt',          hue: 42 },
  cameras: { title: 'Cameras', icon: 'mdi:cctv',                    hue: 215, sat: 0.4 },
  rooms:   { title: 'Rooms',   icon: 'mdi:bed-outline',             hue: 335 },
};
// swipe order (wraps from the last back to the first). `rooms` = one page per family member's
// room (Alex, Zoe, Mia …); with no member rooms it is the all-rooms directory instead.
const DEFAULT_PAGES = ['widgets', 'home', 'living', 'rooms', 'energy', 'cameras'];
// old page names still work in `pages:`
const PAGE_ALIASES = { family: 'living', shared: 'living', members: 'rooms' };
// rooms that aren't living spaces: private, wet or outside
const PRIVATE_ROOM = /bed|bath|shower|toilet|\bwc\b|powder|closet|nursery|en.?suite/i;
const OUTDOOR_ROOM = /garden|yard|patio|deck|porch|outdoor|outside|front|back|pool|pond|koi|driveway|balcony|terrace|shed|farm/i;
const MAIN_ROOM = /living|lounge|kitchen|dining|family|great|\bden\b/i;
// phones (64 px rows): [columns, rows] per tile type; compact tiles are 1 × 1
const PHONE_SPAN = { weather: [2, 5], forecast: [2, 5], air: [2, 2], next_event: [2, 2], camera: [2, 3], agenda: [2, 6],
  person: [2, 2], chart: [2, 3], energy_flow: [2, 6], energy_today: [2, 5], slideshow: [2, 4], date: [2, 3], room: [2, 1],
  energy_now: [2, 4], energy_backup: [2, 2], energy_window: [2, 2], energy_stat: [2, 2] };
// tablet / browser columns per page (phones always get 2)
const PAGE_COLUMNS = { home: 5, member: 5, custom: 5, people: 5, living: 6, all_rooms: 6, room: 6, energy: 6, cameras: 6 };

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
  'kiosk', 'kiosk_chip', 'members', 'living_rooms', 'widgets', 'avatars', 'phone_favorites', 'access'];   // energy.* : see the energy page

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
 * Always on when HomeView opens. The Menu chip in HomeView's top bar shows them until the page
 * is reloaded or the app reopened; `?kiosk=off` in the URL opens with them shown. `kiosk: false` in the config turns full screen off for everyone. */
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
// HA rebuilds its drawer when the width crosses its phone / tablet breakpoint (an iPad turning)
// and drops our style: watch those shadow roots and the window size, and put it back at once.
let kioskOn = false;
const kioskWatched = new WeakSet();
function watchKiosk(sr) {
  if (!sr || kioskWatched.has(sr)) return;
  kioskWatched.add(sr);
  new MutationObserver(() => { if (kioskOn && !sr.querySelector(`#${KIOSK_ID}`)) applyKiosk(true); }).observe(sr, { childList: true });
}
let kioskResizeBound = false;
function bindKioskResize() {
  if (kioskResizeBound) return;
  kioskResizeBound = true;
  let t1 = null, t2 = null;
  window.addEventListener('resize', () => {
    if (!kioskOn) return;
    clearTimeout(t1); clearTimeout(t2);
    t1 = setTimeout(() => applyKiosk(true, true), 80);
    t2 = setTimeout(() => applyKiosk(true, true), 700);
  });
}
function applyKiosk(on, quiet) {
  kioskOn = on;
  bindKioskResize();
  const roots = haShadowRoots();
  if (on) Object.values(roots).forEach(watchKiosk);
  for (const [k, css] of Object.entries(KIOSK_CSS)) {
    const sr = roots[k];
    if (!sr) continue;
    let st = sr.querySelector(`#${KIOSK_ID}`);
    if (on) {
      if (!st) { st = document.createElement('style'); st.id = KIOSK_ID; sr.appendChild(st); }
      if (st.textContent !== css) st.textContent = css;
    } else st?.remove();
  }
  if (!quiet) window.dispatchEvent(new Event('resize'));
}
// 0.3–0.5 remembered "Menu" per device for good; full screen is the default again
try { localStorage.removeItem('homeview-kiosk'); sessionStorage.removeItem('homeview-kiosk'); } catch (e) { /* private mode */ }
// "Menu" lasts until the page is reloaded (kept in memory only); ?kiosk=off in the URL = menu shown
let kioskMenu = null;
function kioskWanted(cfg) {
  if (cfg?.kiosk === false) return false;
  if (kioskMenu !== null) return !kioskMenu;
  const q = new URLSearchParams(location.search).get('kiosk');
  return !(q === 'off' || q === '0' || q === 'false');
}
function setKioskWanted(on) { kioskMenu = !on; }
// pages on screen right now: kiosk styles come off when you leave HomeView for another dashboard
let hvPagesOnScreen = 0;

/**
 * After an update the browser may keep running the old file from its cache (HA serves
 * /hacsfiles/... with a month-long cache and, with YAML resources, the same URL every time).
 * Re-download this file bypassing the cache, then reload the page.
 */
async function reloadFresh() {
  try {
    if (HV_URL) await fetch(HV_URL, { cache: 'reload' });
    const base = HV_URL ? HV_URL.split('?')[0] : null;
    if (base && base !== HV_URL) await fetch(base, { cache: 'reload' });
    if ('caches' in window) {
      for (const k of await caches.keys()) {
        const c = await caches.open(k);
        for (const req of await c.keys()) if (/homeview/i.test(req.url)) await c.delete(req);
      }
    }
  } catch (e) { console.warn('HomeView: refresh failed', e); }
  location.reload();
}
const cleanVer = (v) => String(v || '').replace(/^v/i, '').trim();
/** a > b for x.y.z versions */
const newerVer = (a, b) => {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
};

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
    if (d === 'person' && asList(st.attributes.device_trackers).length && !UNAVAILABLE.includes(st.state)) model.persons.push(id);   // real people with a location
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
  // rooms worth a tile: something to control or a temperature (not just a smart plug's sensors)
  model.rooms = model.areas.filter((r) => r.temp || r.pinned?.length
    || r.entities.some((id) => ROOM_ROW_DOMAINS.includes(domainOf(id)) && !UNAVAILABLE.includes(hass.states[id]?.state)));
  for (const r of model.areas) if (r.groups.lights) r.groups.lights = r.groups.lights.filter((id) => !Array.isArray(hass.states[id]?.attributes?.entity_id));

  // ---- people, calendars, weather (config wins over discovery)
  if (cfg.people) model.persons = asList(cfg.people).filter((id) => hass.states[id]);
  if (cfg.calendars) model.calendars = asList(cfg.calendars).filter((id) => hass.states[id]);
  model.weather = cfg.weather || (model.byDomain.weather || [])[0] || null;
  model.cameras = cfg.cameras ? asList(cfg.cameras).filter((id) => hass.states[id]) : model.cameras;
  for (const k of ['byDomain']) for (const d in model[k]) model[k][d].sort();

  // family members with a room of their own: "Zoe" + an area named like "Bedroom Zoe"
  // (members: { person.zoe: { area, calendars, name } } sets them by hand; false = none)
  model.members = [];
  if (cfg.members !== false) {
    // members: [person.mia, person.alex] (that order) | { person.mia: { area, calendars, name } } | auto
    const list = Array.isArray(cfg.members) ? cfg.members.map((x) => (typeof x === 'string' ? [x, {}] : [x?.person, x || {}])).filter(([pid]) => pid)
      : cfg.members && typeof cfg.members === 'object' ? Object.entries(cfg.members).map(([pid, c]) => [pid, c || {}])
        : model.persons.map((pid) => [pid, {}]);
    for (const [pid, c] of list) {
      const st = hass.states[pid];
      if (!st) continue;
      const name = c.name || (st.attributes.friendly_name || pid.split('.')[1]).split(/\s+/)[0];
      const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!key) continue;
      const re = new RegExp(`(^|[^a-z0-9])${key}([^a-z0-9]|$)`, 'i');
      const room = c.area ? model.areaById[c.area] : model.areas.find((a) => re.test(a.name) || re.test(a.id.replace(/_/g, ' ')));
      if (!room && !c.area && !(cfg.members && typeof cfg.members === 'object')) continue;
      const cals = c.calendars ? asList(c.calendars)
        : model.calendars.filter((id) => re.test(hass.states[id]?.attributes?.friendly_name || '') || re.test(id.split('.')[1].replace(/_/g, ' ')));
      model.members.push({ person: pid, name, room: room || null, calendars: cals, slug: pid.split('.')[1], hue: room ? room.hue : 335 });
    }
  }
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

// the newest hass (fetchers run later than the call that started them)
let hvHass = null;
/** kWh per unit of an energy sensor's state (Wh, kWh, MWh …) */
const kwhFactor = (st) => ({ wh: 0.001, kwh: 1, mwh: 1000, gwh: 1e6 })[String(st?.attributes?.unit_of_measurement || 'kWh').toLowerCase()] ?? 1;

/**
 * Today's energy (kWh) of an energy statistic, kept live: the recorder's change since midnight
 * (re-read every minute; it includes the 5-minute statistics) plus how far the meter has
 * counted since that read — so the number moves with every sensor update.
 */
function getStatToday(hass, statId, onUpdate, live) {
  const day = new Date().toDateString();
  const v = cached(`st:${statId}:${day}`, 60e3, async () => {
    const r = await ws(hass, { type: 'recorder/statistic_during_period', statistic_id: statId,
      calendar: { period: 'day' }, types: ['change'] });
    const st = (hvHass || hass).states[statId];
    return { change: r?.change ?? null, at: num(st?.state), f: kwhFactor(st) };
  }, onUpdate);
  if (v === undefined) return undefined;
  if (v === null || v.change === null || v.change === undefined) return v === null ? null : null;
  const H = hvHass || hass;
  const meter = H.states[statId];
  const cur = num(meter?.state);
  // a meter only counts up; a reset or a jump back means a new day / new meter: no correction
  const delta = cur !== null && v.at !== null && cur >= v.at ? cur - v.at : 0;
  return (v.change + delta) * v.f + sinceReading(H, meter, live);
}

/**
 * Energy (kWh) since a meter's last reading, from its power sensor: meters report every few
 * minutes (polling, Zigbee reporting), power sensors far more often. live = { power, sign }:
 * sign -1 = the negative side (grid export, battery charging). Capped at 15 minutes, so a meter
 * that stopped reporting can't run away; replaced by the real number at the next reading.
 */
function sinceReading(H, meter, live) {
  if (!live?.power || !meter?.last_updated) return 0;
  const p = H.states[live.power];
  let w = num(p?.state);
  if (w === null) return 0;
  if (/^kW$/i.test(p.attributes?.unit_of_measurement || '')) w *= 1000;
  w *= live.sign || 1;
  if (w <= 0) return 0;
  const minutes = Math.min(15, Math.max(0, (Date.now() - new Date(meter.last_updated).getTime()) / 60e3));
  return (w * minutes) / 60 / 1000;
}
const statTag = (h, id) => `${tileCacheTag(`st:${id}:${new Date().toDateString()}`)}:${h.states[id]?.state}:${Math.floor(Date.now() / 60e3)}`;

/** Today's hourly `change` for several statistics: { id: [{ start, change }] } */
function getHourlyToday(hass, ids, onUpdate) {
  const now = new Date();
  return cached(`hr:${ids.join(',')}:${now.toDateString()}`, 2 * 60e3, async () => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const hourStart = new Date(); hourStart.setMinutes(0, 0, 0);
    const [hours, fives] = await Promise.all([
      ws(hass, { type: 'recorder/statistics_during_period', start_time: start.toISOString(), period: 'hour', statistic_ids: ids, types: ['change'] }),
      ws(hass, { type: 'recorder/statistics_during_period', start_time: hourStart.toISOString(), period: '5minute', statistic_ids: ids, types: ['change'] }),
    ]);
    // the hour that's still running isn't in the hourly statistics yet: add it from the 5-minute ones
    const out = {};
    for (const id of ids) {
      const f = kwhFactor((hvHass || hass).states[id]);
      const rows = (hours?.[id] || []).filter((r) => new Date(r.start) < hourStart).map((r) => ({ start: r.start, change: (r.change || 0) * f }));
      const cur = (fives?.[id] || []).reduce((a, r) => a + (r.change || 0), 0) * f;
      rows.push({ start: hourStart.getTime(), change: cur });
      out[id] = rows;
    }
    return out;
  }, onUpdate);
}

/** The mean of a statistic over the last 24 h (e.g. the house's average power). */
function getMean24(hass, id, onUpdate) {
  return cached(`mean24:${id}`, 30 * 60e3, async () => {
    const r = await ws(hass, { type: 'recorder/statistic_during_period', statistic_id: id,
      rolling_window: { duration: { hours: 24 } }, types: ['mean'] });
    return r?.mean ?? null;
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
.t.bare { background:transparent; border:none; box-shadow:none; }
.fc-hl { display:none; font-weight:600; font-size:clamp(12px, 9cqh, 18px); }
@container (max-height: 300px) { .fc-rows { display:none; } .fc-hl { display:block; } }
.ag-list { overflow:hidden; flex:1; min-height:0; -webkit-mask-image:linear-gradient(#000 78%, transparent); mask-image:linear-gradient(#000 78%, transparent); }
.t.slide { padding:0; background:#5E6E72; overflow:hidden; border-radius:var(--hv-radius, 28px); box-shadow:0 8px 22px rgba(0,0,0,.18); }
.sl { position:absolute; inset:0; }
.sl img { position:absolute; inset:0; width:100%; height:100%; display:block; object-fit:cover; object-position:50% 35%; }
.sl img.blur { filter:blur(22px) brightness(.75); transform:scale(1.15); }
.sl.fade { animation:hv-fade 1.2s ease both; }
@keyframes hv-fade { from { opacity:0; } to { opacity:1; } }
.sl-msg { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; color:#E9EEEF; text-align:center;
  padding:0 18px; font-size:15px; font-weight:500; --mdc-icon-size:44px; }
.t.bare.white { background:transparent; }
.t.card { align-items:flex-start; justify-content:center; text-align:left; padding:0 7%; gap:0; }
.t.card .hd { display:flex; align-items:center; gap:6px; }
.t.card .big { font-weight:700; font-size:clamp(18px, 19cqh, 30px); margin:3px 0 1px; }
.t.card.cw { padding:10px 12px; }
.t.card.cw .hd { align-items:flex-start; line-height:1.2; font-size:11.5px; letter-spacing:.03em; }
.t.card.cw .hd .ic { --mdc-icon-size:16px !important; }
.t.card.cw .big { font-size:26px; line-height:1.1; margin:4px 0 2px; }
.t.card.cw .sb { font-size:12.5px; line-height:1.3; margin:0; }
.sq { flex:none; width:min(44cqh, 64px); height:min(44cqh, 64px); border-radius:22%; display:flex; align-items:center; justify-content:center;
  color:#fff; --mdc-icon-size:60%; }
.ecg { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:10px; flex:1; }
.ec { background:var(--hv-pill); border-radius:16px; padding:10px 12px; display:flex; flex-direction:column; justify-content:center; gap:4px; min-width:0; }
.ec .hd { display:flex; align-items:center; gap:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ec b { font-size:clamp(15px, 5.5cqi, 24px); font-weight:700; }
.t.chart { padding:0; align-items:stretch; justify-content:space-between; text-align:left; }
.ch { display:flex; justify-content:space-between; padding:5% 6% 0; }
.ct { font-weight:600; font-size:clamp(12px, 9cqh, 16px); }
.cv { font-size:clamp(15px, 13cqh, 24px); font-weight:600; margin-top:3px; }
.cv span { font-size:.55em; color:var(--hv-fg2); margin-left:3px; font-weight:500; }
.cg { position:relative; flex:1; min-height:0; margin-top:4px; }
.cg svg { position:absolute; inset:0; width:100%; height:100%; }
.cv .rg { font-size:11px; margin-left:10px; white-space:pre; }
.cx { display:flex; justify-content:space-between; padding:2% 6% 4%; font-size:10.5px; color:var(--hv-fg2); }
.t.hero { justify-content:space-between; padding:6% 7%; }
.hh { display:flex; justify-content:space-between; align-items:baseline; width:100%; font-weight:650; font-size:clamp(14px, 5.5cqi, 22px); }
.hh .sb { margin:0; }
.hbig { font-weight:700; font-size:min(42cqh, 32cqi); line-height:1; letter-spacing:-.04em; }
.ops { display:flex; flex-direction:column; align-items:center; gap:4px; }
.op { display:flex; align-items:center; gap:8px; font-weight:600; font-size:clamp(12px, 4.6cqi, 18px); }
.hf { display:flex; gap:7%; justify-content:center; width:100%; border-top:1px solid var(--hv-line); padding-top:4%; font-weight:600; font-size:clamp(12px, 4.8cqi, 19px); }
.hf > span { display:inline-flex; align-items:center; gap:4px; }
.hf em { font-style:normal; color:#30B0C7; font-weight:650; margin-left:4px; }
.flowbox { position:relative; width:100%; height:calc(100% - 22px); }
.flowbox svg { position:absolute; inset:9% 8%; width:84%; height:82%; overflow:visible; }
.fl { fill:none; stroke-width:2; opacity:.22; }
.fl.on { opacity:1; stroke-dasharray:1.5 2.5; animation:hv-flow 1.4s linear infinite; }
.fl.rev { animation-direction:reverse; }
@keyframes hv-flow { to { stroke-dashoffset:-8; } }
.node { position:absolute; transform:translate(-50%, -50%); width:min(26cqh, 22cqw, 100px); aspect-ratio:1; border-radius:50%; border:2.5px solid;
  background:var(--hv-tile); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px;
  font-size:clamp(10px, 3.4cqh, 14px); --mdc-icon-size:min(8cqh, 26px); }
.node b { font-weight:700; white-space:nowrap; }
.node small { font-size:.8em; color:var(--hv-fg2); }
.node .nl { position:absolute; top:calc(100% + 4px); font-size:11.5px; color:var(--hv-fg2); white-space:nowrap; }
/* compact one-line tiles (room pages, lists) */
.t.flex.sect { padding:0 14px; gap:12px; border-radius:16px; }
.t.flex.sect .circ { width:36px; height:36px; --mdc-icon-size:20px; }
.t.flex.sect .badge { border-width:1.5px; }
.t.flex.sect .nm { font-size:19px; font-weight:700; }
.t.flex.sect .sb { font-size:13px; margin-top:1px; }
.t.flex.sect .rt { font-size:15px; font-weight:600; color:var(--hv-fg2); white-space:nowrap; }
.live { margin-left:auto; display:inline-flex; align-items:center; gap:6px; text-transform:none; letter-spacing:0; font-weight:600; color:#34C759; }
.live i { width:7px; height:7px; border-radius:50%; background:#34C759; animation:hv-pulse 1.6s ease-in-out infinite; }
.live.stale { color:#FF9F0A; }
.t.load { gap:10px; }
.t.load .kwh { font-size:13px; font-weight:700; white-space:nowrap; }
.lt-b, .onoff { all:unset; cursor:pointer; flex:none; display:inline-flex; align-items:center; justify-content:center; font:700 12.5px ${FONT}; }
.lt-b { width:30px; height:30px; border-radius:50%; color:var(--hv-fg2); opacity:.55; --mdc-icon-size:19px; }
.lt-b.tk { color:#FF3B30; opacity:1; background:rgba(255,59,48,.12); }
.onoff { min-width:44px; height:28px; padding:0 10px; border-radius:999px; background:var(--hv-pill); color:var(--hv-fg2); }
.onoff.on { background:#34C759; color:#fff; }
.t.outage { gap:10px; flex-wrap:wrap; padding:10px 14px; flex-direction:row !important; justify-content:flex-start !important;
  align-items:center !important; align-content:center; text-align:left !important; }
.t.outage .tx { align-items:flex-start !important; }
.grid.loads { grid-auto-rows:minmax(66px, auto); }
@media (max-width:700px) { .grid.loads > homeview-tile[style*="1 / -1"] { grid-row:span 4; } }
@container (max-width: 520px) { .t.outage { align-content:center; } .t.outage .tx { flex:1 1 calc(100% - 40px) !important; } }
.t.outage .txt { all:unset; cursor:pointer; padding:7px 12px; border-radius:999px; background:var(--hv-pill); font:650 13px ${FONT}; color:var(--hv-fg); }
.t.outage .txt[disabled] { opacity:.45; cursor:default; }
.t.flex.row-t { padding:0 14px; gap:12px; border-radius:16px; }
.t.flex.row-t .ic { --mdc-icon-size:24px; }
.t.flex.row-t .nm { font-size:15px; font-weight:650; }
.t.flex.row-t .sb { font-size:13px; }
.t.flex.row-t .up { font-size:10.5px; }
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
    if (s.section) {   // phones: a 56 px bar that starts the room's tiles (name, comfort, temp · hum)
      const tSt = h.states[r.temp];
      const f = /F/.test(tSt?.attributes?.unit_of_measurement || h.config.unit_system?.temperature || '');
      const feel = sum.t === null ? '' : sum.t < (f ? 66 : 19) ? 'Cold' : sum.t > (f ? 77 : 25) ? 'Warm' : 'Comfy';
      const hfeel = sum.hu === null ? '' : sum.hu < 30 ? 'Dry' : sum.hu > 55 ? 'Humid' : '';
      const comfort = [feel, hfeel, lightTxt].filter(Boolean).join(' · ');
      return `<div class="t flex sect${sum.lights ? ' on' : ''}" style="--hv-ic-on:#FF9F0A">
        <div class="circ"><div class="ic" style="--mdc-icon-size:inherit;color:${sum.lights ? '#FF9F0A' : 'var(--hv-accent)'}"><i data-i="${esc(r.icon)}"></i></div>${badge}</div>
        <div class="tx" style="flex:1"><div class="nm">${esc(s.name || r.name)}</div>${comfort ? `<div class="sb">${esc(comfort)}</div>` : ''}</div>
        ${climate ? `<div class="rt">${esc(climate)}</div>` : ''}</div>`;
    }
    return `<div class="t${sum.lights ? ' on' : ''}" style="--hv-ic-on:#FF9F0A">
      <div class="circ"><div class="ic" style="--mdc-icon-size:inherit;color:${sum.lights ? '#FF9F0A' : 'var(--hv-accent)'}"><i data-i="${esc(r.icon)}"></i></div>${badge}</div>
      <div class="tx"><div class="nm">${esc(r.name)}</div>
      ${climate ? `<div class="sb">${esc(climate)}</div>` : ''}${lightTxt ? `<div class="sb x">${esc(lightTxt)}</div>` : ''}</div></div>`;
  },
  // tap: the room's lights (its "all lights" group, else its main light); hold, or a room
  // without lights: the room's details page
  action(h, s, tile, kind) {
    const light = kind === 'hold' ? null : roomMainLight(h, s.room);
    if (light) return h.callService('light', 'toggle', {}, { entity_id: light });
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
    const now = new Date();
    let hi = today.temperature, lo = today.templow ?? null;
    const rain = today.precipitation_probability;
    // late in the day only tonight is left in the forecast: the current temperature counts too
    const curT = st.attributes.temperature;
    if (today.datetime && new Date(today.datetime).toDateString() === now.toDateString() && curT != null) {
      if (hi != null) hi = Math.max(hi, curT);
      if (lo != null) lo = Math.min(lo, curT);
    }
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
      ${fc[0] ? `<div class="fc-hl">H:${fmt(Math.max(fc[0].temperature ?? -99, st?.attributes?.temperature ?? -99), 0)}°&nbsp;&nbsp;L:${fmt(Math.min(fc[0].templow ?? 99, st?.attributes?.temperature ?? 99), 0)}°</div>` : ''}
      <div class="fc-rows" style="font-size:clamp(12px,4.5cqi,17px);border-top:1px solid var(--hv-line);padding-top:3%">${rows}</div></div>`;
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
      nums += `<text x="${50 + 31 * Math.cos(a)}" y="${50 + 31 * Math.sin(a) + 3.6}" text-anchor="middle" font-size="10" style="fill:var(--hv-clock-num, var(--hv-accent))">${i}</text>`;
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
      <div class="ag-list">${rows}</div></div>`;
  },
};

// ---- person ---------------------------------------------------------------------------------
// Sample avatars for people without a picture: DiceBear "Adventurer" — anime-style, by Lisa
// Wischofsky, CC BY 4.0 (credited in the README). The same face every time for a person, from a
// hash of the entity id (no names are sent). Gender by hair: man = short, woman = long.
//   avatars: samples (default) | initials (letters, no internet request)
//   avatars: { person.alex: man, person.zoe: woman, person.kai: /local/kai.jpg }
// A picture set on the person in HA always wins.
let hvAvatarMode = 'samples';
const AVATAR_HAIR = {
  man: Array.from({ length: 19 }, (_, i) => `short${String(i + 1).padStart(2, '0')}`),
  woman: Array.from({ length: 26 }, (_, i) => `long${String(i + 1).padStart(2, '0')}`),
};
const AVATAR_ALIASES = { male: 'man', boy: 'man', m: 'man', female: 'woman', girl: 'woman', w: 'woman', f: 'woman' };
const AVATAR_BG = ['ffdfbf', 'c0aede', 'd1d4f9', 'b6e3f4', 'ffd5dc'];
function seedOf(text) {
  let x = 2166136261;
  for (let i = 0; i < text.length; i++) x = Math.imul(x ^ text.charCodeAt(i), 16777619);
  return (x >>> 0).toString(36);
}
function avatarUrl(h, personId) {
  const pic = h.states[personId]?.attributes?.entity_picture;
  if (pic) return pic;
  const cfg = hvAvatarMode && typeof hvAvatarMode === 'object' ? hvAvatarMode : { mode: hvAvatarMode };
  let own = cfg[personId];
  if (typeof own === 'string') own = AVATAR_ALIASES[own.toLowerCase()] || own;
  if (typeof own === 'string' && own && !AVATAR_HAIR[own]) return own;   // a picture URL
  if (cfg.mode === false || cfg.mode === 'initials') return null;
  const hair = AVATAR_HAIR[own] ? `&hair=${AVATAR_HAIR[own].join(',')}` + (own === 'man' ? '&earringsProbability=0' : '') : '';
  return `https://api.dicebear.com/9.x/adventurer/svg?seed=hv${seedOf(personId)}${hair}&backgroundColor=${AVATAR_BG.join(',')}`;
}

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
    const pic = avatarUrl(h, s.entity);
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
// newest reading among the power sensors, and how old it is
function liveness(h, power) {
  const ts = Object.values(power).map((id) => h.states[id]?.last_updated).filter(Boolean).map((t) => new Date(t).getTime());
  if (!ts.length) return null;
  const last = Math.max(...ts);
  return { last, mins: (Date.now() - last) / 60e3 };
}
R.energy_now = {
  tick: 15e3,
  key: (h, s) => Object.values(s.power).map((id) => h.states[id]?.state + h.states[id]?.last_updated).join('|') + Math.floor(Date.now() / 30e3),
  html(h, s) {
    const p = s.power, v = (id) => (id ? num(h.states[id]?.state) : null);
    const { solar, grid, battery, soc, home } = powerValues(h, p);
    const kw = (x) => (x === null ? '—' : Math.abs(x) >= 1000 ? `${fmt(Math.abs(x) / 1000, 1)} kW` : `${fmt(Math.abs(x), 0)} W`);
    const cell = (icon, label, value, sub, color, ent) => `<div data-more="${esc(ent || '')}" style="background:var(--hv-pill);border-radius:16px;padding:8px 12px;display:flex;flex-direction:column;justify-content:center;gap:1px;min-width:0">
      <span class="up" style="display:flex;align-items:center;gap:6px"><span class="ic" style="--mdc-icon-size:1.4em;color:${color}"><i data-i="${icon}"></i></span>${label}</span>
      <span style="font-weight:700;font-size:clamp(15px,6cqi,26px)">${value}</span><span class="sb" style="margin:0;white-space:normal">${sub}</span></div>`;
    const cells = [];
    const amps = v(p.current), volts = v(p.voltage);
    const homeSub = amps !== null ? `${fmt(amps, 1)} A${volts !== null ? ` at ${fmt(volts, 0)} V` : ''}` : 'Using now';
    if (p.solar) cells.push(cell('mdi:solar-power-variant', 'Solar', kw(solar), solar > 20 ? 'Producing' : 'Not producing', '#FFB800', p.solar));
    cells.push(cell('mdi:home-lightning-bolt-outline', 'Home', kw(home), homeSub, '#30B0C7', p.home || p.current || ''));
    if (p.grid || p.grid_in) cells.push(cell('mdi:transmission-tower', 'Grid', kw(grid), grid > 20 ? 'Importing' : grid < -20 ? 'Exporting' : 'Idle', '#8E8E93', p.grid || p.grid_in));
    if (p.battery || p.battery_out || p.battery_level) cells.push(cell(soc !== null ? `mdi:battery-${clamp(Math.round(soc / 10) * 10, 10, 100) === 100 ? '' : clamp(Math.round(soc / 10) * 10, 10, 90)}`.replace(/-$/, '') : 'mdi:home-battery-outline', 'Battery',
      soc !== null ? `${fmt(soc, 0)}%` : kw(battery), battery === null ? '' : battery > 20 ? `Discharging ${kw(battery)}` : battery < -20 ? `Charging ${kw(battery)}` : 'Idle', '#34C759', p.battery_level || p.battery));
    return `<div class="t" style="cursor:default;align-items:stretch;justify-content:flex-start;padding:5%">
      <div class="up" style="margin-bottom:4%;display:flex;align-items:center;gap:8px">Right now ${(() => {
        const L = liveness(h, s.power);
        if (!L) return '';
        const stale = L.mins >= (s.stale_minutes || 10);
        const at = new Date(L.last).toLocaleTimeString(h.locale?.language, { hour: 'numeric', minute: '2-digit', second: '2-digit' });
        return stale
          ? `<span class="live stale" title="Last reading ${esc(at)}">no new reading for ${fmt(L.mins, 0)} min</span>`
          : `<span class="live" title="Last reading ${esc(at)}"><i></i>Live · ${esc(at)}</span>`;
      })()}</div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;flex:1">${cells.join('')}</div></div>`;
  },
  action(h, s, tile, kind, ev) { const id = ev?.target?.closest?.('[data-more]')?.dataset?.more; if (id) moreInfo(tile, id); },
};

// ---- battery backup time ------------------------------------------------------------------------
const hmFmt = (hours) => (hours === null || !Number.isFinite(hours) ? '—' : hours >= 48 ? `${fmt(hours / 24, 1)} days`
  : `${Math.floor(hours)} h ${String(Math.round((hours % 1) * 60)).padStart(2, '0')} min`);
R.energy_backup = {
  key: (h, s) => [s.power.battery_level, s.power.home, s.battery_energy].map((id) => h.states[id]?.state).join('|') + tileCacheTag(`mean24:${s.power.home}`),
  html(h, s, tile) {
    const P = powerValues(h, s.power);
    const st = h.states[s.battery_energy];
    let kwh = st ? num(st.state) : null;
    if (kwh !== null && /^Wh$/i.test(st.attributes.unit_of_measurement || '')) kwh /= 1000;
    if (kwh === null && s.capacity && P.soc !== null) kwh = (s.capacity * P.soc) / 100;
    const scale = /^kW$/i.test(h.states[s.power.home]?.attributes?.unit_of_measurement || '') ? 1000 : 1;
    const mean = s.power.home ? getMean24(h, s.power.home, () => tile.refresh()) : null;
    const avgW = mean != null ? mean * scale : null;
    const nowW = P.home;
    const byAvg = kwh !== null && avgW > 50 ? kwh / (avgW / 1000) : null;
    const byNow = kwh !== null && nowW > 50 ? kwh / (nowW / 1000) : null;
    const main = byAvg ?? byNow;
    const parts = [];
    if (byAvg !== null) parts.push(`At the 24 h average load (${kwFmt(avgW)})`);
    if (byNow !== null) parts.push(`${byAvg !== null ? 'now' : 'At the load now'} (${kwFmt(nowW)})${byAvg !== null ? `: ${hmFmt(byNow)}` : ''}`);
    if (kwh !== null) parts.push(`${fmt(kwh, 0)}${s.capacity ? ` of ${fmt(s.capacity, 0)}` : ''} kWh`);
    return `<div class="t card"><div class="up hd"><span class="ic" style="--mdc-icon-size:18px;color:#5856D6"><i data-i="mdi:timer-sand"></i></span>Backup time</div>
      <div class="big">${kwh === null ? '—' : hmFmt(main)}</div><div class="sb" style="white-space:normal">${esc(kwh === null ? 'Set energy.battery_energy or battery_capacity' : parts.join(' · '))}</div></div>`;
  },
  action: (h, s, tile) => moreInfo(tile, s.battery_energy || s.power.battery_level),
};

// ---- off-grid share in a time window (peak hours …), from today's hourly statistics ------------
const DAY_SETS = { weekdays: [1, 2, 3, 4, 5], weekends: [0, 6], all: [0, 1, 2, 3, 4, 5, 6], daily: [0, 1, 2, 3, 4, 5, 6] };
const DAY_NAMES = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
function windowDays(days) {
  if (!days) return DAY_SETS.all;
  if (typeof days === 'string') return DAY_SETS[days] || [DAY_NAMES[days.slice(0, 3).toLowerCase()]];
  return asList(days).map((d) => (typeof d === 'number' ? d : DAY_NAMES[String(d).slice(0, 3).toLowerCase()])).filter((d) => d !== undefined);
}
const hourOf = (t) => { const [a, b] = String(t || '0').split(':'); return Number(a) + (Number(b) || 0) / 60; };
R.energy_window = {
  tick: 60e3,
  key: (h, s) => tileCacheTag(`hr:${s.ids.join(',')}:${new Date().toDateString()}`) + `:${Math.floor(Date.now() / 60e3)}`,
  html(h, s, tile) {
    const w = s.window, now = new Date();
    const data = getHourlyToday(h, s.ids, () => tile.refresh());
    // spans: [{ start, end, days? }] — each span may have its own days (weekday vs weekend hours)
    const allSpans = asList(w.hours || [{ start: w.start, end: w.end }])
      .map((x) => ({ a: hourOf(x.start), b: hourOf(x.end) || 24, days: windowDays(x.days ?? w.days) }));
    const spans = allSpans.filter((x) => x.days.includes(now.getDay())).map((x) => [x.a, x.b]);
    const today = spans.length > 0;
    const label = (today ? spans : allSpans.map((x) => [x.a, x.b])).map(([a, b]) => `${fmtHour(a)}–${fmtHour(b)}`).join(', ');
    const inNow = today && spans.some(([a, b]) => now.getHours() + now.getMinutes() / 60 >= a && now.getHours() + now.getMinutes() / 60 < b);
    let home = 0, grid = 0, direct = 0;
    if (data && today) {
      const hours = {};
      for (const [role, ids] of Object.entries(s.roles)) {
        for (const id of ids) for (const row of data[id] || []) {
          const hr = new Date(row.start).getHours();
          (hours[hr] = hours[hr] || { gin: 0, sol: 0, gout: 0, bout: 0, bin: 0 })[role] += row.change || 0;
        }
      }
      for (const [hr, x] of Object.entries(hours)) {
        if (!spans.some(([a, b]) => Number(hr) >= Math.floor(a) && Number(hr) < Math.ceil(b))) continue;
        const use = Math.max(0, x.gin + x.sol - x.gout + x.bout - x.bin);
        home += use; grid += Math.min(x.gin, use); direct += Math.min(x.sol, use);
      }
    }
    s._direct = direct;
    if (s.mode === 'solar') {
      const pctS = home > 0.05 ? clamp(100 * s._direct / home, 0, 100) : null;
      return `<div class="t card"><div class="up hd"><span class="ic" style="--mdc-icon-size:18px;color:#FFB800"><i data-i="mdi:solar-power-variant"></i></span>Solar self-sufficiency · Today</div>
        <div class="big">${data === undefined ? '…' : pctS === null ? '—' : `${fmt(pctS, 0)}%`}</div>
        <div class="sb" style="white-space:normal">${esc(`${fmt(s._direct, 1)} of ${fmt(home, 1)} kWh of house use came straight from solar`)}</div></div>`;
    }
    s._direct = direct;
    const pct = home > 0.05 ? clamp(100 * (1 - grid / home), 0, 100) : null;
    const big = data === undefined ? '…' : !today ? '—' : pct === null ? '—' : `${fmt(pct, 0)}%`;
    const sub = !today ? `${label} — not today` : s.compact
      ? `Grid ${fmt(grid, 1)} of ${fmt(home, 1)} kWh<br>${esc(label)}${inNow ? ' · now' : ''}`
      : `${fmt(grid, 1)} of ${fmt(home, 1)} kWh from grid, ${label}${inNow ? ' (now)' : ''}`;
    return `<div class="t card${s.compact ? ' cw' : ''}"><div class="up hd"><span class="ic" style="--mdc-icon-size:18px;color:#34C759"><i data-i="mdi:home-battery-outline"></i></span>${esc(w.name || 'Window')} off‑grid${s.compact ? '' : ' · Today'}</div>
      <div class="big">${big}</div><div class="sb" style="white-space:normal">${s.compact && today ? sub : esc(sub)}</div></div>`;
  },
};
const fmtHour = (x) => { const hh = Math.floor(x) % 24, mm = Math.round((x % 1) * 60); const d = new Date(); d.setHours(hh, mm, 0, 0);
  return d.toLocaleTimeString(undefined, mm ? { hour: 'numeric', minute: '2-digit' } : { hour: 'numeric' }).replace(/\s?([AP])M/i, (m0, ap) => ap.toLowerCase() + 'm'); };

// ---- power outage: the loads list (Energy page) ------------------------------------------------
// Ticking a device gives its switch the HA label "Outage: turn off"; the buttons and the
// blueprint (blueprints/homeview_outage.yaml) act on every entity with that label.
const OUTAGE_LABEL = 'Outage: turn off';
async function outageLabelId(hass, create) {
  const labels = await ws(hass, { type: 'config/label_registry/list' });
  const found = labels.find((l) => l.name === OUTAGE_LABEL);
  if (found || !create) return found?.label_id || null;
  const made = await ws(hass, { type: 'config/label_registry/create', name: OUTAGE_LABEL, icon: 'mdi:power-plug-off-outline', color: 'red' });
  return made.label_id;
}
let outageLabel = null;   // label_id once known
function isTicked(h, id) { return !!(outageLabel && id && asList(h.entities?.[id]?.labels).includes(outageLabel)); }
R.energy_load = {
  tick: 60e3,
  key: (h, s) => [s.power, s.current, s.sw].map((id) => h.states[id]?.state).join('|') + statTag(h, s.stat) + isTicked(h, s.sw),
  html(h, s, tile) {
    const kwh = getStatToday(h, s.stat, () => tile.refresh(), s.power ? { power: s.power } : null);
    const w = s.power ? num(h.states[s.power]?.state) : null, a = s.current ? num(h.states[s.current]?.state) : null;
    const sw = s.sw ? h.states[s.sw] : null, on = sw ? sw.state === 'on' : w !== null && w > 1;
    const ticked = isTicked(h, s.sw);
    const sub = [w !== null ? `${fmt(w, 0)} W` : null, a !== null ? `${fmt(a, 2)} A` : null].filter(Boolean).join(' · ');
    return `<div class="t flex row-t load${on ? ' on' : ''}" style="--hv-ic-on:#FFB800">
      ${s.sw && s.admin ? `<button class="lt-b${ticked ? ' tk' : ''}" data-act="tick" title="${ticked ? 'Turned off in an outage — tap to keep on' : 'Tap: turn off in an outage'}"><ha-icon icon="mdi:power-plug-off-outline"></ha-icon></button>` : ''}
      <div class="ic"><i data-i="${esc(s.icon || 'mdi:power-plug-outline')}"></i></div>
      <div class="tx" style="flex:1"><div class="nm">${esc(s.name)}</div><div class="sb">${esc(sub || (sw ? hassState(h, sw) : ''))}</div></div>
      <b class="kwh">${kwh === undefined ? '…' : `${fmt(kwh || 0, 2)} kWh`}</b>
      ${sw ? `<button class="onoff${on ? ' on' : ''}" data-act="toggle">${on ? 'On' : 'Off'}</button>` : ''}</div>`;
  },
  async action(h, s, tile, kind, ev) {
    const act = ev?.target?.closest?.('[data-act]')?.dataset?.act;
    if (kind === 'hold' || !act) return moreInfo(tile, s.power || s.stat);
    if (act === 'toggle' && s.sw) return h.callService('homeassistant', 'toggle', {}, { entity_id: s.sw });
    if (act === 'tick' && s.sw && h.user?.is_admin) {
      const id = await outageLabelId(h, true);
      outageLabel = id;
      const cur = asList(h.entities?.[s.sw]?.labels);
      await ws(h, { type: 'config/entity_registry/update', entity_id: s.sw, labels: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
    }
  },
};
R.energy_outage = {
  key: (h, s) => `${h.states[s.grid]?.state}|${s.loads.map((l) => isTicked(h, l.sw) + (h.states[l.sw]?.state || '')).join('')}|${s.all}`,
  html(h, s) {
    const g = h.states[s.grid];
    const up = g ? !['off', 'off_grid', 'islanded', 'disconnected', 'down'].includes(String(g.state).toLowerCase()) : null;
    const ticked = s.loads.filter((l) => isTicked(h, l.sw));
    const onNow = ticked.filter((l) => h.states[l.sw]?.state === 'on').length;
    return `<div class="t flex row-t outage" style="cursor:default">
      <div class="ic" style="color:${up === false ? '#FF3B30' : '#34C759'}"><i data-i="${up === false ? 'mdi:transmission-tower-off' : 'mdi:transmission-tower'}"></i></div>
      <div class="tx" style="flex:1"><div class="nm">Power outage <span style="font-weight:500;color:${up === false ? '#FF3B30' : '#34C759'}">· ${up === null ? 'grid status unknown' : up ? 'grid on' : 'GRID DOWN'}</span></div>
        <div class="sb" style="white-space:normal">Tick <ha-icon icon="mdi:power-plug-off-outline" style="--mdc-icon-size:14px;vertical-align:-2px"></ha-icon> what to turn off when the grid goes down — sorted by today's energy. Automatic: the HomeView outage blueprint.</div></div>
      <button class="txt" data-act="off" ${ticked.length ? '' : 'disabled'}>Turn off ticked (${ticked.length})</button>
      <button class="txt" data-act="on" ${ticked.length ? '' : 'disabled'}>Turn back on</button>
      ${s.more ? `<button class="txt" data-act="all">${s.all ? 'Show fewer' : `Show all ${s.total}`}</button>` : ''}</div>`;
  },
  async action(h, s, tile, kind, ev) {
    const act = ev?.target?.closest?.('[data-act]')?.dataset?.act;
    const ids = s.loads.filter((l) => isTicked(h, l.sw)).map((l) => l.sw);
    if (act === 'all') return s.page.toggleAllLoads();
    if (act === 'off' && ids.length && window.confirm(`Turn off ${ids.length} device${ids.length > 1 ? 's' : ''}?`)) return h.callService('homeassistant', 'turn_off', {}, { entity_id: ids });
    if (act === 'on' && ids.length) return h.callService('homeassistant', 'turn_on', {}, { entity_id: ids });
    if (kind === 'hold' && s.grid) moreInfo(tile, s.grid);
  },
};

R.energy_stat = {
  tick: 60e3,
  key: (h, s) => s.stats.map((x) => statTag(h, x.id)).join('|'),
  html(h, s, tile) {
    const vals = s.stats.map((x) => ({ ...x, v: getStatToday(h, x.id, () => tile.refresh(), x.live) }));
    const loading = vals.some((x) => x.v === undefined);
    let value;
    let sub = s.sub || 'Today';
    if (s.compute) {
      value = s.compute(Object.fromEntries(vals.map((x) => [x.role, x.v])));
      if (value && typeof value === 'object') { sub = loading ? sub : value.sub; value = value.value; }
    } else value = vals.reduce((a, x) => a + (x.v || 0) * (x.sign || 1), 0);
    const txt = loading ? '…' : value === null || Number.isNaN(value) ? '—' : s.unit === '%' ? `${fmt(value, 0)}%` : `${fmt(value, value >= 100 ? 0 : 1)} kWh`;
    return `<div class="t card"><div class="up hd"><span class="ic" style="--mdc-icon-size:18px;color:${s.color || 'var(--hv-accent)'}"><i data-i="${s.icon}"></i></span>${esc(s.title)}</div>
      <div class="big">${txt}</div><div class="sb" style="white-space:normal">${esc(sub)}</div></div>`;
  },
};
// today's energy numbers as one card of small cells (next to the flow diagram)
R.energy_today = {
  tick: 60e3,
  key: (h, s) => s.items.flatMap((it) => it.stats.map((x) => statTag(h, x.id))).join('|'),
  html(h, s, tile) {
    const cells = s.items.map((it) => {
      const vals = it.stats.map((x) => ({ ...x, v: getStatToday(h, x.id, () => tile.refresh(), x.live) }));
      const loading = vals.some((x) => x.v === undefined);
      const value = it.compute ? it.compute(Object.fromEntries(vals.map((x) => [x.role, x.v]))) : vals.reduce((a, x) => a + (x.v || 0) * (x.sign || 1), 0);
      const txt = loading ? '…' : value === null || Number.isNaN(value) ? '—' : it.unit === '%' ? `${fmt(value, 0)}%` : `${fmt(value, value >= 100 ? 0 : 1)} kWh`;
      return `<div class="ec"><span class="up hd"><span class="ic" style="--mdc-icon-size:16px;color:${it.color}"><i data-i="${it.icon}"></i></span>${esc(it.title)}</span><b>${txt}</b></div>`;
    }).join('');
    return `<div class="t" style="cursor:default;align-items:stretch;justify-content:flex-start;padding:5%;text-align:left">
      <div class="up" style="margin-bottom:4%">Today</div><div class="ecg">${cells}</div></div>`;
  },
};

R.energy_device = {
  tick: 60e3,
  key: (h, s) => `${statTag(h, s.stat)}|${h.states[s.power]?.state}`,
  html(h, s, tile) {
    const kwh = getStatToday(h, s.stat, () => tile.refresh(), s.power ? { power: s.power } : null);
    const w = s.power ? num(h.states[s.power]?.state) : null;
    const u = s.power ? h.states[s.power]?.attributes?.unit_of_measurement || 'W' : '';
    const on = w !== null && w > 1;
    return `<div class="t flex${on ? ' on' : ''}" style="--hv-ic-on:#FFB800"><div class="ic"><i data-i="${esc(s.icon || 'mdi:power-plug-outline')}"></i></div>
      <div class="tx"><div class="nm">${esc(s.name)}</div><div class="sb">${kwh === undefined ? '…' : `${fmt(kwh || 0, 2)} kWh today`}${w !== null ? ` · ${fmt(w, 0)} ${esc(u)}` : ''}</div></div></div>`;
  },
  action: (h, s, tile) => moreInfo(tile, s.power || s.stat),
};

// ---- all the lights of one room as one tile ------------------------------------------------------
R.room_lights = {
  key: (h, s) => s.lights.map((id) => h.states[id]?.state).join(''),
  html(h, s) {
    const on = s.lights.filter((id) => h.states[id]?.state === 'on').length;
    const state = on ? (s.lights.length > 1 ? `${on} of ${s.lights.length} on` : 'On') : 'Off';
    return `<div class="t flex${on ? ' on' : ''}" style="--hv-ic-on:#FF9F0A"><div class="ic"><i data-i="${on ? 'mdi:lightbulb-group' : 'mdi:lightbulb-group-outline'}"></i></div>
      <div class="tx"><div class="nm">${esc(s.name || 'Lights')}</div><div class="sb">${esc(s.roomName)}${s.size?.[0] >= 2 ? ` · ${esc(state)}` : ''}</div></div></div>`;
  },
  action(h, s, tile, kind) {
    if (kind === 'hold') return s.noHold ? moreInfo(tile, s.lights[0]) : navigate(`room-${s.roomId}`);
    const anyOn = s.lights.some((id) => h.states[id]?.state === 'on');
    return h.callService('light', anyOn ? 'turn_off' : 'turn_on', {}, { entity_id: s.lights });
  },
};

// ---- air quality --------------------------------------------------------------------------------
const AIR_KINDS = [
  ['aqi', (v) => (v <= 50 ? 0 : v <= 100 ? 1 : 2), 'AQI', ''],
  ['pm25', (v) => (v <= 12 ? 0 : v <= 35 ? 1 : 2), 'PM2.5', 'µg/m³'],
  ['carbon_dioxide', (v) => (v <= 800 ? 0 : v <= 1200 ? 1 : 2), 'CO₂', 'ppm'],
  ['volatile_organic_compounds', (v) => (v <= 300 ? 0 : v <= 1000 ? 1 : 2), 'VOC', 'µg/m³'],
  ['volatile_organic_compounds_parts', (v) => (v <= 250 ? 0 : v <= 2000 ? 1 : 2), 'VOC', 'ppb'],
];
const AIR_LEVELS = [['Excellent', '#30D158'], ['Fair', '#FFB800'], ['Poor', '#FF3B30']];
function findAir(h, m) {
  const sensors = m.byDomain.sensor || [];
  for (const [dc] of AIR_KINDS) {
    const id = sensors.find((x) => h.states[x]?.attributes?.device_class === dc && !UNAVAILABLE.includes(h.states[x].state));
    if (id) { const room = m.areaById[entityArea(h, id)]; return { entity: id, temp: room?.temp, hum: room?.hum, roomName: room?.name }; }
  }
  return null;
}
R.air = {
  key: (h, s) => [s.entity, s.temp, s.hum].map((id) => h.states[id]?.state).join('|'),
  html(h, s) {
    const st = h.states[s.entity];
    const k = AIR_KINDS.find((x) => x[0] === st?.attributes?.device_class) || AIR_KINDS[0];
    const v = num(st?.state);
    const lvl = v === null ? null : AIR_LEVELS[k[1](v)];
    const t = num(h.states[s.temp]?.state), hu = num(h.states[s.hum]?.state);
    return `<div class="t flex"><div class="sq" style="background:${lvl ? lvl[1] : 'var(--hv-pill)'}"><ha-icon icon="mdi:air-filter"></ha-icon></div>
      <div class="tx" style="flex:1"><div class="up">Air quality${s.roomName ? ` · ${esc(s.roomName)}` : ''}</div><div class="nm">${lvl ? lvl[0] : '—'}</div>
      <div class="sb">${k[2]} ${fmt(v, 0)} ${k[3]}</div></div>
      ${t !== null ? `<div class="tx" style="align-items:flex-end;text-align:right;flex:none"><div class="nm" style="color:${lvl ? lvl[1] : 'inherit'};font-size:clamp(16px,17cqh,32px)">${fmt(t, 0)}°</div>
      ${hu !== null ? `<div class="sb">${fmt(hu, 0)}% RH</div>` : ''}</div>` : ''}</div>`;
  },
  action: (h, s, tile) => moreInfo(tile, s.entity),
};

// ---- 24-hour chart -------------------------------------------------------------------------------
function getHistory(hass, id, hours, onUpdate) {
  return cached(`hist:${id}:${hours}`, 5 * 60e3, async () => {
    const r = await ws(hass, { type: 'history/history_during_period', start_time: new Date(Date.now() - hours * 3600e3).toISOString(),
      entity_ids: [id], minimal_response: true, no_attributes: true, significant_changes_only: false });
    return (r?.[id] || []).map((p) => ({ t: (p.lu ?? p.lc ?? 0) * 1000, v: num(p.s) })).filter((p) => p.v !== null && p.t);
  }, onUpdate);
}
R.chart = {
  key: (h, s) => `${h.states[s.entity]?.state}|${tileCacheTag(`hist:${s.entity}:24`)}`,
  html(h, s, tile) {
    const st = h.states[s.entity];
    const pts = getHistory(h, s.entity, 24, () => tile.refresh()) || [];
    const unit = st?.attributes?.unit_of_measurement || '';
    const cur = num(st?.state);
    const now = Date.now(), t0 = now - 24 * 3600e3;
    const data = [...pts];
    if (cur !== null) data.push({ t: now, v: cur });
    let line = '', area = '', lo = null, hi = null;
    if (data.length > 1) {
      lo = Math.min(...data.map((p) => p.v)); hi = Math.max(...data.map((p) => p.v));
      const span = hi - lo || 1;
      const xy = data.map((p) => [((Math.max(p.t, t0) - t0) / (now - t0)) * 100, 92 - ((p.v - lo) / span) * 80]);
      line = 'M' + xy.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' L');
      area = `${line} L100,100 L0,100 Z`;
    }
    const color = s.color || 'var(--hv-accent)';
    return `<div class="t chart">
      <div class="ch"><div><div class="ct" style="color:${color}">${esc(s.title)}</div>
        <div class="cv">${cur === null ? '—' : fmt(cur, s.decimals ?? 1)}<span>${esc(unit)}</span>${hi !== null ? `<span class="rg">↑ ${fmt(hi, s.decimals ?? 1)}  ↓ ${fmt(lo, s.decimals ?? 1)}</span>` : ''}</div></div>
        <span class="ic" style="--mdc-icon-size:22px;color:${color}"><i data-i="${esc(s.icon)}"></i></span></div>
      <div class="cg"><svg viewBox="0 0 100 100" preserveAspectRatio="none">${line ? `<path d="${area}" style="fill:${color};opacity:.14"/>
        <path d="${line}" style="fill:none;stroke:${color};stroke-width:2" vector-effect="non-scaling-stroke"/>` : ''}</svg>
</div>
      <div class="cx"><span>24h</span><span>18h</span><span>12h</span><span>6h</span><span>Now</span></div></div>`;
  },
  action: (h, s, tile) => moreInfo(tile, s.entity),
};

// ---- a family member's room (hero) --------------------------------------------------------------
R.member_hero = {
  tick: 60e3,
  key: (h, s) => [s.room?.temp, s.room?.hum, ...(s.openings || [])].map((id) => h.states[id]?.state).join('|') + new Date().getDate(),
  html(h, s) {
    const r = s.room;
    const tSt = h.states[r?.temp];
    const t = num(tSt?.state), hu = num(h.states[r?.hum]?.state);
    const f = /F/.test(tSt?.attributes?.unit_of_measurement || h.config.unit_system?.temperature || '');
    const feel = t === null ? '' : t < (f ? 66 : 19) ? 'Cold' : t > (f ? 77 : 25) ? 'Warm' : 'Comfy';
    const hfeel = hu === null ? '' : hu < 30 ? 'Dry' : hu > 55 ? 'Humid' : '';
    const ops = (s.openings || []).map((id) => {
      const st = h.states[id];
      const open = isAlert(st);
      const nm = shortName(h, id, r?.name).replace(/\b(sensor|contact)\b/ig, '').trim();
      return `<div class="op"><span class="ic" style="--mdc-icon-size:1.25em;color:${open ? '#30B0C7' : 'inherit'}"><i data-e="${esc(id)}"></i></span>${esc(nm)} ${open ? (domainOf(id) === 'lock' ? 'unlocked' : 'open') : (domainOf(id) === 'lock' ? 'locked' : 'closed')}</div>`;
    }).join('');
    return `<div class="t hero">
      <div class="hh"><span>${esc(s.title)}</span><span class="sb">${esc(new Date().toLocaleDateString(h.locale?.language, { weekday: 'long', month: 'short', day: 'numeric' }))}</span></div>
      <div class="hbig">${t !== null ? `${fmt(t, 0)}°` : '—'}</div>
      <div class="ops">${ops}</div>
      <div class="hf">${t !== null ? `<span><span class="ic" style="--mdc-icon-size:1.2em;color:#30B0C7"><i data-i="mdi:thermometer"></i></span>${fmt(t, 1)}° <em>${feel}</em></span>` : ''}
        ${hu !== null ? `<span><span class="ic" style="--mdc-icon-size:1.2em;color:#30B0C7"><i data-i="mdi:water-percent"></i></span>${fmt(hu, 0)}% <em>${hfeel}</em></span>` : ''}</div></div>`;
  },
  // like every room tile: tap = the room's lights (none: the room's page), hold = the room's
  // page — on that page itself, hold = the temperature's details
  action(h, s, tile, kind) {
    if (!s.room) return null;
    if (kind === 'hold') return s.here ? (s.room.temp ? moreInfo(tile, s.room.temp) : null) : navigate(`room-${s.room.id}`);
    const light = roomMainLight(h, s.room);
    if (light) return h.callService('light', 'toggle', {}, { entity_id: light });
    return s.here ? (s.room.temp ? moreInfo(tile, s.room.temp) : null) : navigate(`room-${s.room.id}`);
  },
};

// ---- a room's power now: its power sensors added up (a device's own sensor once) -------------
R.room_power = {
  key: (h, s) => s.ids.map((id) => h.states[id]?.state).join('|'),
  html(h, s) {
    const w = s.ids.reduce((acc, id) => { const st = h.states[id]; const x = num(st?.state);
      return acc + (x === null ? 0 : x * (/^kW$/i.test(st.attributes?.unit_of_measurement || '') ? 1000 : 1)); }, 0);
    const on = s.ids.filter((id) => (num(h.states[id]?.state) || 0) > 1).length;
    return `<div class="t flex${w > 1 ? ' on' : ''}" style="--hv-ic-on:#FFB800"><div class="ic"><i data-i="mdi:flash"></i></div>
      <div class="tx"><div class="nm">${esc(kwFmt(w))}</div><div class="sb">${esc(on ? `Power · ${on} using` : 'Power')}</div></div></div>`;
  },
  action(h, s, tile) {
    const top = [...s.ids].sort((a, b) => (num(h.states[b]?.state) || 0) - (num(h.states[a]?.state) || 0))[0];
    if (top) moreInfo(tile, top);
  },
};

// ---- energy flow diagram ------------------------------------------------------------------------
function powerValues(h, p) {
  const v = (id) => (id ? num(h.states[id]?.state) : null);
  const scale = (id) => { const u = h.states[id]?.attributes?.unit_of_measurement; return u === 'kW' ? 1000 : u === 'MW' ? 1e6 : 1; };
  const w = (id) => { const x = v(id); return x === null ? null : x * scale(id); };
  const net = (one, plus, minus) => (one ? w(one) : plus || minus ? (w(plus) || 0) - (w(minus) || 0) : null);
  const solar = w(p.solar), grid = net(p.grid, p.grid_in, p.grid_out), battery = net(p.battery, p.battery_out, p.battery_in), soc = v(p.battery_level);
  let home = w(p.home);
  if (home === null && (solar !== null || grid !== null)) home = (solar || 0) + (grid || 0) + (battery || 0);
  return { solar, grid, battery, soc, home };
}
const kwFmt = (x) => (x === null ? '—' : Math.abs(x) >= 1000 ? `${fmt(Math.abs(x) / 1000, 1)} kW` : `${fmt(Math.abs(x), 0)} W`);
R.energy_flow = {
  key: (h, s) => Object.values(s.power).map((id) => h.states[id]?.state).join('|'),
  html(h, s) {
    const p = s.power, P = powerValues(h, p);
    const has = { solar: !!p.solar, battery: !!(p.battery || p.battery_out || p.battery_in || p.battery_level) };
    const act = (x) => x !== null && x > 20;
    const lines = [];
    const L = (d, color, on, rev) => lines.push(`<path class="fl${on ? ' on' : ''}${rev ? ' rev' : ''}" d="${d}" pathLength="100" style="stroke:${color}" vector-effect="non-scaling-stroke"/>`);
    L('M15,50 L85,50', '#5B8DEF', act(P.grid) || act(-P.grid), act(-P.grid));
    if (has.solar) { L('M50,16 Q50,50 85,50', '#FFB800', act(P.solar) && act(P.home)); L('M50,16 Q50,50 15,50', '#FFB800', act(-P.grid) && act(P.solar)); }
    if (has.battery) {
      L('M50,84 Q50,50 85,50', '#34C759', act(P.battery));
      if (has.solar) L('M50,16 L50,84', '#FFB800', act(-P.battery) && act(P.solar));
      L('M15,50 Q50,50 50,84', '#5B8DEF', act(-P.battery) && act(P.grid));
    }
    const node = (x, y, color, icon, value, label, extra = '') => `<div class="node" style="left:${x}%;top:${y}%;border-color:${color}">
      <ha-icon icon="${icon}" style="color:${color}"></ha-icon><b>${value}</b>${extra}<span class="nl">${label}</span></div>`;
    const batIcon = P.soc !== null ? `mdi:battery-${P.soc >= 95 ? 'high' : P.soc >= 50 ? 'medium' : P.soc >= 15 ? 'low' : 'outline'}` : 'mdi:home-battery-outline';
    return `<div class="t" style="padding:0;cursor:default"><div class="flowbox">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">${lines.join('')}</svg>
      ${has.solar ? node(50, 16, '#FFB800', 'mdi:solar-power-variant', kwFmt(P.solar), 'Solar') : ''}
      ${node(15, 50, '#5B8DEF', 'mdi:transmission-tower', kwFmt(P.grid), 'Grid', P.grid !== null ? `<small>${P.grid > 20 ? 'in' : P.grid < -20 ? 'out' : ''}</small>` : '')}
      ${node(85, 50, '#30B0C7', 'mdi:home', kwFmt(P.home), 'Home')}
      ${has.battery ? node(50, 84, '#34C759', batIcon, P.soc !== null ? `${fmt(P.soc, 0)}%` : kwFmt(P.battery), 'Battery', P.soc !== null && P.battery !== null ? `<small>${kwFmt(P.battery)}</small>` : '') : ''}
    </div></div>`;
  },
  action(h, s, tile) { moreInfo(tile, s.power.home || s.power.grid || s.power.grid_in || s.power.solar); },
};

// ---- photo slideshow from a Home Assistant media folder ----------------------------------------
// widgets: { slideshow: media-source://… | false, slideshow_interval: 60 (s),
//            slideshow_thumbnail: '{dir}/.@__thumb/s800{name}' (a smaller copy to try first) }
const PHOTO_RE = /\.(jpe?g|png|webp|gif|heic|avif)$/i;
const isPhoto = (c) => c.media_class === 'image' || PHOTO_RE.test(c.title || '') || PHOTO_RE.test(c.media_content_id || '');
const skipFolder = (c) => /^[.@#]/.test(c.title || '') || /@eaDir|\.@__thumb|\$RECYCLE|lost\+found/i.test(c.media_content_id || '');

/** The first media folder named like Photos / Pictures / Slideshow … (auto mode). */
function findPhotoFolder(hass, onUpdate) {
  return cached('slides:auto', 6 * 3600e3, async () => {
    const want = /photo|picture|slide ?show|wallpaper|gallery|album/i;
    const queue = [['media-source://media_source', 0]];
    let n = 0;
    while (queue.length && n < 80) {
      const [id, depth] = queue.shift();
      n++;
      let r;
      try { r = await ws(hass, { type: 'media_source/browse_media', media_content_id: id }); } catch (e) { continue; }
      for (const c of r?.children || []) {
        if (!c.can_expand || skipFolder(c)) continue;
        if (want.test(c.title || '')) return c.media_content_id;
        if (depth < 3) queue.push([c.media_content_id, depth + 1]);
      }
    }
    return null;
  }, onUpdate);
}

// Sample photos (Unsplash photographers, served by Lorem Picsum) when no photo folder is set
// or found — or with widgets.slideshow: samples
const SAMPLE_PHOTOS = [1015, 1016, 1018, 1019, 1036, 1039, 1043, 1044, 1047, 1050, 1056, 1067]
  .map((id) => `https://picsum.photos/id/${id}/1600/1000`);

const slideStore = {};
function slideState(folder) {
  if (!slideStore[folder]) {
    const st = { items: null, busy: false, next: 0, urls: {}, ok: {}, bad: {}, dim: {}, pending: {}, err: null };
    try { const v = JSON.parse(localStorage.getItem(`homeview-photos:${folder}`) || 'null'); if (Array.isArray(v) && v.length) st.items = v; } catch (e) { /* private mode */ }
    slideStore[folder] = st;
  }
  return slideStore[folder];
}
// a shuffle every device agrees on, different each full pass (nothing repeats within a pass)
function shuffled(n, pass) {
  let a = (pass * 2654435761 + n) >>> 0;
  const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const o = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; }
  return o;
}
R.slideshow = {
  tick: 4000,
  key: (h, s) => `slides:${s.folder}`,
  html: () => `<div class="t slide"><div class="sl-msg"><ha-icon icon="mdi:image-multiple-outline"></ha-icon><span>Loading photos…</span></div></div>`,
  update(h, s, tile) {
    const st = slideState(s.folder);
    const box = tile.shadowRoot.querySelector('.slide');
    if (!box) return;
    if (s.folder === 'samples' && !st.items) { st.items = SAMPLE_PHOTOS; st.next = Infinity; }
    // (re)scan the folder: album subfolders included (3 levels, 300 folders), hourly
    if (!st.busy && Date.now() >= st.next) {
      st.busy = true;
      (async () => {
        const items = [], queue = [[s.folder, 0]];
        let folders = 0;
        while (queue.length && folders < 300) {
          const [id, depth] = queue.shift();
          folders++;
          const r = await ws(h, { type: 'media_source/browse_media', media_content_id: id });
          for (const c of r?.children || []) {
            if (c.can_expand) { if (depth < 3 && !skipFolder(c)) queue.push([c.media_content_id, depth + 1]); } else if (isPhoto(c)) items.push(c.media_content_id);
          }
        }
        return items;
      })().then((items) => {
        st.items = items; st.err = items.length ? null : 'No photos in this folder';
        try { localStorage.setItem(`homeview-photos:${s.folder}`, JSON.stringify(items.slice(0, 5000))); } catch (e) { /* full / private */ }
        st.next = Date.now() + (st.err ? 60e3 : 3600e3);
      }, (e) => { st.err = e?.message || String(e); st.next = Date.now() + 60e3; })
        .finally(() => { st.busy = false; R.slideshow.update(h, s, tile); });
    }
    const msg = (text) => { if (!box.querySelector('img')) box.innerHTML = `<div class="sl-msg"><ha-icon icon="mdi:image-off-outline"></ha-icon><span>${esc(text)}</span></div>`; };
    if (!st.items?.length) { if (st.err) msg(st.err); return; }
    if (!tile.visible) return;
    // which photo now: one per interval, `tile._skip` moves ahead (tap)
    const n = st.items.length, ms = Math.max(5, Number(s.interval) || 60) * 1000;
    const slot = Math.floor(Date.now() / ms) + (tile._skip || 0);
    const at = (k) => { const x = slot + k; return st.items[shuffled(n, Math.floor(x / n))[((x % n) + n) % n]]; };
    const load = (id, then) => {
      const c = st.urls[id];
      if (c && c.exp > Date.now() && st.ok[c.url]) { then?.(c.url); return; }
      if (st.pending[id]) return;
      st.pending[id] = true;
      if (/^https?:/.test(id)) {   // a plain image URL (the samples)
        const img = new Image();
        img.onload = () => { st.urls[id] = { url: id, exp: Infinity }; st.ok[id] = true; st.dim[id] = img.naturalWidth / (img.naturalHeight || 1); delete st.pending[id]; then?.(id); };
        img.onerror = () => { delete st.pending[id]; };
        img.src = id;
        return;
      }
      const thumb = s.thumbnail && !st.bad[id] ? id.replace(/^(.*)\/([^/]+)$/, (m0, dir, name) => s.thumbnail.replace('{dir}', dir).replace('{name}', name)) : id;
      ws(h, { type: 'media_source/resolve_media', media_content_id: thumb, expires: 86400 })
        .then((r) => new Promise((ok, fail) => {
          if (!r?.url) { fail(); return; }
          const img = new Image();
          img.onload = () => { st.urls[id] = { url: r.url, exp: Date.now() + 82800e3 }; st.ok[r.url] = true; st.dim[r.url] = img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1.5; ok(r.url); };
          img.onerror = fail;
          img.src = r.url;
        }))
        .then((url) => then?.(url), () => { if (s.thumbnail && !st.bad[id]) st.bad[id] = true; })   // the full photo next time
        .finally(() => { delete st.pending[id]; });
    };
    const cur = at(0);
    load(at(1)); load(at(2));
    if (tile._slideId === cur && box.querySelector('img')) return;
    load(cur, (url) => {
      if (tile._slideId === cur) return;
      tile._slideId = cur;
      // cross-fade: the new photo fades in over the old one, which is removed after
      const layer = document.createElement('div');
      layer.className = 'sl fade';
      const portrait = (st.dim[url] || 1.5) < 1;
      layer.innerHTML = portrait
        ? `<img src="${url}" alt="" class="blur"><img src="${url}" alt="" style="object-fit:contain">`
        : `<img src="${url}" alt="">`;
      box.querySelector('.sl-msg')?.remove();
      box.appendChild(layer);
      const old = [...box.querySelectorAll('.sl')].slice(0, -1);
      setTimeout(() => old.forEach((x) => x.remove()), 1600);
    });
  },
  action(h, s, tile, kind) {
    if (kind !== 'tap') return;
    tile._skip = (tile._skip || 0) + 1;
    R.slideshow.update(h, s, tile);
  },
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
    const card = this._wrap.firstElementChild;
    if (card && this._spec.bare) card.classList.add('bare');
    if (card && this._spec.row && card.classList.contains('flex')) card.classList.add('row-t');
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
      box.style.cssText = 'height:100%;overflow:auto;border-radius:var(--hv-radius,22px);display:flex;flex-direction:column;justify-content:center;background:var(--hv-tile)';
      el.style.setProperty('--ha-card-background', 'transparent');
      el.style.setProperty('--ha-card-box-shadow', 'none');
      el.style.setProperty('--ha-card-border-width', '0');
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
    // a link tile opens its page on tap (room tiles are their own: tap = lights, hold = the room)
    if (this._spec.navigate && kind === 'tap' && this._spec.kind !== 'room') { navigate(this._spec.navigate); return; }
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
 * Control chips under the Home title: icon only until something needs attention
 *   (garage open, door unlocked, water shut off, alarm triggered -> red with a word;
 *   arming / opening / closing -> pulse). Tap acts (alarm: its panel), hold = details.
 * home.chips: [entity | { entity, icon_on, icon_off, name, confirm, off_warn }] or false
 * ========================================================================================== */

const isWaterValve = (id) => domainOf(id) === 'valve' || (domainOf(id) === 'switch' && /water.*(valve|shut)|(valve|shut).*water|main_water/i.test(id));

function chipsAuto(h, m) {
  const out = [];
  const add = (id, extra = {}) => { if (id && h.states[id] && !out.some((c) => c.entity === id)) out.push({ entity: id, ...extra }); };
  add((m.byDomain.alarm_control_panel || [])[0]);
  (m.byDomain.cover || []).filter((id) => ['garage', 'gate'].includes(h.states[id]?.attributes?.device_class)).forEach((id) => add(id, { confirm: true }));
  (m.byDomain.lock || []).forEach((id) => add(id, { confirm: true }));
  [...(m.byDomain.valve || []), ...(m.byDomain.switch || [])].filter(isWaterValve).slice(0, 1).forEach((id) => add(id, { confirm: true }));
  return out.filter((c) => !UNAVAILABLE.includes(h.states[c.entity]?.state)).slice(0, 6);
}

/** How a chip looks right now: { cls: '' | 'on' | 'alert' | 'warn', word, busy, icon? } */
function chipLook(h, c) {
  const st = h.states[c.entity];
  if (!st) return { cls: 'na', word: '' };
  const d = domainOf(c.entity), s = st.state;
  if (d === 'alarm_control_panel') {
    if (s === 'triggered') return { cls: 'alert', word: 'Triggered' };
    if (['arming', 'pending'].includes(s)) return { cls: 'on', busy: true, word: '' };
    return { cls: s.startsWith('armed') ? 'on' : '', word: '' };
  }
  if (d === 'cover') {
    if (['opening', 'closing'].includes(s)) return { cls: 'on', busy: true, word: '' };
    return s === 'closed' ? { cls: '', word: '' } : { cls: 'alert', word: 'Open' };
  }
  if (d === 'lock') {
    if (['locking', 'unlocking', 'opening'].includes(s)) return { cls: 'on', busy: true, word: '' };
    if (s === 'jammed') return { cls: 'alert', word: 'Jammed' };
    return s === 'locked' ? { cls: '', word: '' } : { cls: 'alert', word: 'Unlocked' };
  }
  if (isWaterValve(c.entity)) {
    // valve: closed = water off; a shut-off switch: on = water off
    const off = d === 'valve' ? s === 'closed' : s === 'on';
    return off ? { cls: 'alert', word: 'Water off', icon: 'mdi:water-off' } : { cls: '', word: '', icon: 'mdi:water' };
  }
  const on = isActive(st);
  if (!on && c.off_warn) return { cls: 'warn', word: '' };
  return { cls: on ? 'on' : '', word: '' };
}

async function chipTap(h, c, node) {
  const st = h.states[c.entity];
  if (!st) return;
  const d = domainOf(c.entity);
  if (d === 'alarm_control_panel' || c.tap === 'more-info') { moreInfo(node, c.entity); return; }
  if (c.confirm) {
    const name = c.name || shortName(h, c.entity);
    const verb = d === 'lock' ? (st.state === 'locked' ? 'Unlock' : 'Lock') : d === 'cover' ? (st.state === 'closed' ? 'Open' : 'Close')
      : isActive(st) ? 'Turn off' : 'Turn on';
    if (!window.confirm(`${verb} ${name}?`)) return;
  }
  if (d === 'cover' || d === 'valve' || d === 'lock') return runToggle(h, st);
  return h.callService('homeassistant', 'toggle', {}, { entity_id: c.entity });
}

/** tap / hold on a plain element (pointer events: iOS-safe, hold doesn't also tap) */
function bindPress(el, onTap, onHold) {
  let timer = null, held = false, down = false, x0 = 0, y0 = 0;
  el.addEventListener('pointerdown', (e) => {
    down = true; held = false; x0 = e.clientX; y0 = e.clientY;
    timer = setTimeout(() => { held = true; onHold(); }, 500);
  });
  el.addEventListener('pointermove', (e) => { if (down && Math.hypot(e.clientX - x0, e.clientY - y0) > 12) { clearTimeout(timer); down = false; } });
  el.addEventListener('pointerup', () => { clearTimeout(timer); if (down && !held) onTap(); down = false; });
  el.addEventListener('pointercancel', () => { clearTimeout(timer); down = false; });
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

/* ============================================================================================
 * Page builders: model -> { title, sections: [{ title?, hue?, tiles: [spec] }] }
 * spec = { kind, size: [w, h], ... }
 * ========================================================================================== */

/**
 * The light a room's tap toggles, in this order: a light group (most members, "all …" /
 * "… lights" first); a light named as all of them ("Bedroom Bulbs", "Main Lights" — Zigbee
 * groups don't list their members); the main light (main, then ceiling / overhead); one
 * named after the room ("Porch Light"); the only light. null (separate fixtures, say two
 * floodlights): tap opens the room instead.
 */
function roomMainLight(h, room) {
  const ids = asList(room?.groups?.lights).filter((id) => h.states[id] && !UNAVAILABLE.includes(h.states[id].state));
  const name = (id) => `${id.split('.')[1].replace(/_/g, ' ')} ${h.states[id]?.attributes?.friendly_name || ''}`;
  const members = (id) => (Array.isArray(h.states[id].attributes?.entity_id) ? h.states[id].attributes.entity_id.length : 0);
  const allish = (id) => /\ball\b|(lights|bulbs|lamps)\b/i.test(name(id));
  const groups = ids.filter(members).sort((a, b) => (allish(b) - allish(a)) || members(b) - members(a));
  const slug = (room?.id || '').toLowerCase(), rname = (room?.name || '').toLowerCase();
  return groups[0] || ids.find(allish) || ids.find((id) => /main/i.test(name(id)))
    || ids.find((id) => /ceiling|overhead/i.test(name(id)))
    || ids.find((id) => id === `light.${slug}_light` || (h.states[id].attributes?.friendly_name || '').toLowerCase() === `${rname} light`)
    || (ids.length === 1 ? ids[0] : null);
}

const roomTile = (room, size = [1, 1]) => ({ kind: 'room', room, size, hue: room.hue });
const entTile = (id, extra = {}) => ({ kind: 'entity', entity: id, size: [1, 1], ...extra });

/** The favourites strip on a phone (Living, a member's page): six, three per row. */
function phoneFavorites(h, m, cfg) {
  const pf = cfg.phone_favorites;
  const user = (h.user?.name || '').toLowerCase();
  let list = Array.isArray(pf) ? pf : pf && typeof pf === 'object'
    ? (Object.entries(pf).find(([k]) => k.toLowerCase() === user || k.toLowerCase() === user.split(' ')[0])?.[1] || pf.default) : null;
  if (!list) {
    // automatic: the main rooms' lights, then the locks
    const lights = m.rooms.filter((r) => MAIN_ROOM.test(r.name)).flatMap((r) => (r.groups.lights || []).filter((id) => !Array.isArray(h.states[id]?.attributes?.entity_id)).slice(0, 2));
    list = [...lights, ...(m.byDomain.lock || [])];
  }
  return asList(list).filter((id) => h.states[id] && !UNAVAILABLE.includes(h.states[id].state)).slice(0, 6);
}

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
  next_event: [2, 1], person: [2, 1], room: [1, 1], energy_now: [2, 2], energy_flow: [3, 2], air: [2, 1], chart: [2, 1] };

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

const rowTile = (id, extra = {}) => entTile(id, { row: true, ...extra });
const nonGroupLights = (h, ids) => asList(ids).filter((id) => !Array.isArray(h.states[id]?.attributes?.entity_id));

const PAGES = {
  // a tinted board: big date, big clock, camera, up next, weather — for a wall tablet
  widgets(h, m, cfg, opts, page) {
    const wc = cfg.widgets || {};
    const board = [{ kind: 'date', area: 'date', bare: true }, { kind: 'clock', area: 'clock', bare: true }];
    if (m.weather) board.push({ kind: 'forecast', entity: m.weather, days: 3, area: 'weather', bare: true });
    if (m.calendars.length) board.push({ kind: 'agenda', calendars: m.calendars, days: 7, max: 5, area: 'next', bare: true, title: 'Up next' });
    // the photo slideshow (the camera is on Home; widgets.camera: <entity> puts one here instead)
    if (wc.camera) {
      board.push({ kind: 'camera', entity: wc.camera, area: 'cam' });
    } else if (wc.slideshow !== false) {
      const found = wc.slideshow ? null : findPhotoFolder(h, () => page.scheduleRebuild());
      // still looking (undefined): wait; nothing found (null): the sample photos
      const folder = wc.slideshow || (found === undefined ? null : found || 'samples');
      if (folder) board.push({ kind: 'slideshow', folder, interval: wc.slideshow_interval || 60, thumbnail: wc.slideshow_thumbnail, area: 'cam' });
    }
    return { title: 'Widgets', minimalHead: true, board, sections: [] };
  },

  home(h, m, cfg) {
    const pc = cfg.home || {};
    const tiles = [];
    const later = [];   // clock and next event go last (bottom row), as on a hand-made HomeView
    if (m.weather) tiles.push({ kind: 'weather', entity: m.weather, size: [2, 2] });
    const air = pc.air !== false ? findAir(h, m) : null;
    if (air) tiles.push({ kind: 'air', ...air, size: [2, 1] });
    const cam = pc.camera !== false ? (pc.camera || m.cameras.find((id) => !UNAVAILABLE.includes(h.states[id]?.state))) : null;
    if (cam) tiles.push({ kind: 'camera', entity: cam, size: [2, 1] });
    later.push({ kind: 'clock', size: [1, 1] });
    if (m.calendars.length) later.push({ kind: 'next_event', calendars: m.calendars, size: [2, 1] });
    // favourites: 1×1 like the door and garage tiles (3 automatic ones, or your own list)
    // automatic: doors first (locks, garage / gate) — the alarm and thermostat already have pills
    const auto = () => {
      const ids = favoritesAuto(h, m).filter((id) => !UNAVAILABLE.includes(h.states[id]?.state));
      const doorish = (id) => ['lock', 'cover'].includes(domainOf(id));
      return [...ids.filter(doorish), ...ids.filter((id) => !doorish(id))].slice(0, pc.max_favorites ?? 2);
    };
    const favs = pc.favorites ? asList(pc.favorites) : auto();
    favs.forEach((id) => {
      if (!h.states[id]) return;
      const room = m.areaById[entityArea(h, id)];
      tiles.push(entTile(id, { showRoom: true, areaName: room?.name, size: [1, 1] }));
    });
    // "Lights" for the main rooms: tap = all on / off, hold = the room
    const main = /living|lounge|kitchen|dining|family|great|\bden\b/i;
    const lightRooms = (pc.light_rooms ? asList(pc.light_rooms).map((id) => m.areaById[id]).filter(Boolean)
      : m.rooms.filter((r) => nonGroupLights(h, r.groups.lights).length)
        .map((r, i) => ({ r, score: (main.test(r.name) ? 100 : 0) + nonGroupLights(h, r.groups.lights).length - i / 100 }))
        .sort((a, b) => b.score - a.score).map((x) => x.r)).slice(0, pc.max_light_rooms ?? 2);
    for (const r of lightRooms) {
      const lights = nonGroupLights(h, r.groups.lights);
      if (lights.length) tiles.push({ kind: 'room_lights', lights, roomName: r.name, roomId: r.id, size: [1, 1], hue: undefined });
    }
    const sections = [{ tiles }];
    if (pc.rooms === true && m.rooms.length) sections.push({ title: 'Rooms', link: 'rooms', tiles: m.rooms.map((r) => roomTile(r)) });
    const scenes = (m.byDomain.scene || []).slice(0, pc.max_scenes ?? 8);
    if (pc.scenes !== false && scenes.length) sections.push({ title: 'Scenes', layout: 'rows', tiles: scenes.map((id) => rowTile(id, { sub: 'Scene' })) });
    // the clock and the next event: below the scenes
    if (later.length) sections.push({ tiles: later });
    const chips = pc.chips === false ? [] : pc.chips ? asList(pc.chips).map((c) => (typeof c === 'string' ? { entity: c } : c)).filter((c) => c?.entity)
      : chipsAuto(h, m);
    return { title: cfg.title || h.config.location_name || 'Home', pills: true, people: true, chips, sections };
  },

  // the rooms everyone uses, each with its main devices (living spaces first)
  living(h, m, cfg) {
    const memberRooms = new Set(m.members.map((x) => x.room?.id).filter(Boolean));
    const list = cfg.living_rooms ? asList(cfg.living_rooms).map((id) => m.areaById[id]).filter(Boolean)
      : m.rooms.filter((r) => !memberRooms.has(r.id) && !PRIVATE_ROOM.test(r.name) && !OUTDOOR_ROOM.test(r.name))
        .map((r, i) => ({ r, k: (MAIN_ROOM.test(r.name) ? 0 : 1) * 1000 + i })).sort((a, b) => a.k - b.k).map((x) => x.r);
    const sections = list.map((r) => {
      const ids = (r.pinned || ROOM_ROW_DOMAINS.flatMap((d) => r.entities.filter((id) => domainOf(id) === d
        && !UNAVAILABLE.includes(h.states[id]?.state) && !(d === 'light' && Array.isArray(h.states[id]?.attributes?.entity_id))))).slice(0, 11);
      return { title: r.name, room: r.id, hue: r.hue, tiles: [roomTile(r), ...ids.map((id) => entTile(id, { areaName: r.name, hue: r.hue }))] };
    });
    return { title: 'Living', pills: true, greet: true, sections, compactSections: true,
      note: list.length ? null : 'No living spaces found. List them with living_rooms: [living_room, kitchen, …].' };
  },

  // every person, the members' rooms and the family calendar (optional page: pages: [..., people])
  people(h, m) {
    const sections = [];
    if (m.persons.length) sections.push({ title: 'People', tiles: m.persons.map((id) => ({ kind: 'person', entity: id, battery: personBattery(h, id), size: [2, 1] })) });
    if (m.members.some((x) => x.room)) {
      sections.push({ title: 'Their rooms', tiles: m.members.filter((x) => x.room).map((x) => ({ ...roomTile(x.room), navigate: `member-${x.slug}` })) });
    }
    if (m.calendars.length) sections.push({ title: 'Calendar', tiles: [{ kind: 'agenda', calendars: m.calendars, size: [4, 2], days: 14, max: 12, title: 'Next two weeks' }] });
    return { title: 'People', sections };
  },

  // a directory of every room (by floor when floors are set up): tap = its lights, hold = its page
  all_rooms(h, m) {
    const floors = [...new Set(m.rooms.map((r) => r.floor || ''))];
    const sections = floors.map((f) => ({ title: floors.length > 1 ? (f || 'Other rooms') : null, tiles: m.rooms.filter((r) => (r.floor || '') === f).map((r) => roomTile(r)) }));
    return { title: 'Rooms', pills: true, sections };
  },

  room(h, m, cfg, opts) {
    const r = m.areaById[opts.area];
    if (!r) return { title: 'Room', sections: [{ tiles: [] }] };
    const sections = [];
    const charts = [];
    if (r.temp) charts.push({ kind: 'chart', entity: r.temp, title: 'Temperature', icon: 'mdi:thermometer', color: '#34C759', size: [2, 1] });
    if (r.hum) charts.push({ kind: 'chart', entity: r.hum, title: 'Humidity', icon: 'mdi:water-percent', color: '#30B0C7', decimals: 0, size: [2, 1] });
    const lux = (r.groups.sensors || []).find((id) => h.states[id]?.attributes?.device_class === 'illuminance');
    if (lux) charts.push({ kind: 'chart', entity: lux, title: 'Light level', icon: 'mdi:brightness-6', color: '#8E8E93', decimals: 0, size: [2, 1] });
    // the summary: how the room is now (temperature, comfort, doors), then quick tiles
    const live = (id) => !UNAVAILABLE.includes(h.states[id]?.state);
    const dcOf = (id) => h.states[id]?.attributes?.device_class;
    const openings = r.entities.filter((id) => live(id) && ((domainOf(id) === 'binary_sensor' && OPENING_CLASSES.includes(dcOf(id))) || domainOf(id) === 'lock')).slice(0, 4);
    const top = [];
    if (r.temp || r.hum || openings.length) top.push({ kind: 'member_hero', room: r, title: 'Right now', openings, here: true, size: [2, 2] });
    const lights = nonGroupLights(h, r.groups.lights).filter(live);
    if (lights.length) top.push({ kind: 'room_lights', lights, roomName: lights.length > 1 ? `All ${lights.length}` : r.name, roomId: r.id, size: [1, 1], noHold: true });
    const presence = r.entities.find((id) => domainOf(id) === 'binary_sensor' && live(id) && ['occupancy', 'presence', 'motion'].includes(dcOf(id)));
    if (presence) top.push(entTile(presence, { areaName: r.name, size: [1, 1] }));
    // power: one sensor per device (a plug's own power, not its per-outlet copies)
    const seen = new Set();
    const power = r.entities.filter((id) => domainOf(id) === 'sensor' && dcOf(id) === 'power' && live(id) && !/mean|average|avg|_24h|_max|_min/.test(id))
      .filter((id) => { const d = h.entities?.[id]?.device_id || id; if (seen.has(d)) return false; seen.add(d); return true; });
    if (power.length) top.push({ kind: 'room_power', ids: power, size: [1, 1] });
    if (top.length) sections.push({ tiles: top });
    // charts: shorter on phones (two rows each)
    charts.forEach((c) => { c.phoneSpan = [2, 2]; });
    if (charts.length) sections.push({ title: 'Last 24 hours', tiles: charts });
    if (r.pinned) sections.push({ tiles: r.pinned.map((id) => rowTile(id, { areaName: r.name })), layout: 'rows' });
    for (const g of ROOM_GROUPS) {
      const ids = (r.groups[g.id] || []).filter((id) => !r.pinned?.includes(id) && !charts.some((c) => c.entity === id));
      if (!ids.length) continue;
      if (g.id === 'cameras') { sections.push({ title: g.title, layout: 'cams', tiles: ids.map((id) => ({ kind: 'camera', entity: id })) }); continue; }
      sections.push({ title: g.title, layout: 'rows', tiles: ids.map((id) => rowTile(id, { areaName: r.name })) });
    }
    return { title: r.name, back: true, room: r, hue: r.hue, sections };
  },

  // one family member: their room (hero), its devices, their calendar and where they are
  member(h, m, cfg, opts) {
    const mem = m.members.find((x) => x.person === opts.member);
    if (!mem) return { title: 'Member', sections: [{ tiles: [] }] };
    const r = mem.room;
    const tiles = [];
    const openings = r ? r.entities.filter((id) => {
      const dc = h.states[id]?.attributes?.device_class;
      return (domainOf(id) === 'binary_sensor' && OPENING_CLASSES.includes(dc)) || domainOf(id) === 'lock';
    }).slice(0, 3) : [];
    tiles.push({ kind: 'member_hero', room: r, title: `${mem.name}'s ${r ? 'room' : 'day'}`, openings, size: [2, 2] });
    tiles.push({ kind: 'clock', size: [1, 1] });
    if (r) {
      const ids = ROOM_ROW_DOMAINS.flatMap((d) => r.entities.filter((id) => domainOf(id) === d && !UNAVAILABLE.includes(h.states[id]?.state)
        && !(d === 'light' && Array.isArray(h.states[id]?.attributes?.entity_id)))).slice(0, 7);
      ids.forEach((id) => tiles.push(entTile(id, { areaName: r.name })));
      openings.filter((id) => domainOf(id) === 'binary_sensor').forEach((id) => tiles.push(entTile(id, { areaName: r.name })));
    }
    const cals = mem.calendars.length ? mem.calendars : m.calendars;
    if (cals.length) tiles.push({ kind: 'next_event', calendars: cals, size: [3, 1] });
    tiles.push({ kind: 'person', entity: mem.person, battery: personBattery(h, mem.person), size: [2, 1] });
    return { title: mem.name, hue: mem.hue, greet: true, member: mem, openings, sections: [{ tiles }] };
  },

  energy(h, m, cfg, opts, page) {
    const prefs = getEnergyPrefs(h, () => page.rebuild());
    const ec = cfg.energy || {};
    if (prefs === undefined) return { title: 'Energy', sections: [{ tiles: [] }], note: 'Loading energy settings…' };
    const src = prefs?.energy_sources || [];
    const grid = src.find((x) => x.type === 'grid') || {};
    const solar = src.filter((x) => x.type === 'solar');
    const bat = src.filter((x) => x.type === 'battery');
    const gridIn = [...asList(grid.flow_from).map((f) => f.stat_energy_from), grid.stat_energy_from].filter(Boolean);
    const gridOut = [...asList(grid.flow_to).map((f) => f.stat_energy_to), grid.stat_energy_to].filter(Boolean);
    const solarIds = solar.map((x) => x.stat_energy_from).filter(Boolean);
    const batOut = bat.map((x) => x.stat_energy_from).filter(Boolean);
    const batIn = bat.map((x) => x.stat_energy_to).filter(Boolean);

    // live power: config, else the energy settings' power sensors, else a guess by name
    const powerSensors = (m.byDomain.sensor || []).filter((id) => h.states[id]?.attributes?.device_class === 'power');
    // name guessing: never an average / statistic, prefer a sensor on the energy meter's own device,
    // and a net sensor (grid + import / − export, battery + discharge / − charge) over a split pair
    // (sorted ids would otherwise pick grid_export_power before grid_power)
    const devOf = (id) => h.entities?.[id]?.device_id;
    const notStat = (id) => !/mean|average|avg|_24h|daily|today|_max|_min|peak|forecast|statistic|cost|price/.test(id);
    const cands = powerSensors.filter(notStat);
    const pick = (re, near = [], not = null) => {
      const devs = near.map(devOf).filter(Boolean);
      const list = cands.filter((id) => re.test(id) && !(not && not.test(id)));
      return list.find((id) => devs.includes(devOf(id))) || list[0] || null;
    };
    const SPLIT_GRID = /import|export|from_grid|to_grid|_in$|_out$|consum|return|feed|production/;
    const SPLIT_BAT = /charg|_in$|_out$/;
    const statRate = (x) => x?.stat_rate || x?.power_config?.stat_rate || null;
    const power = {
      solar: ec.solar_power || statRate(solar[0]) || (solarIds.length ? pick(/solar|pv/, solarIds) : null),
      grid: ec.grid_power || statRate(grid) || pick(/grid/, [...gridIn, ...gridOut], SPLIT_GRID),
      battery: ec.battery_power || statRate(bat[0]) || (bat.length ? pick(/battery|powerwall/, [...batOut, ...batIn], SPLIT_BAT) : null),
      home: ec.home_power || pick(/home|house|load|consumption/, [...gridIn, ...solarIds], /grid|solar|battery|pv/),
    };
    // the home battery's charge %: on the battery meter's device, else named like it
    // (sensor.tesla_energy_live next to sensor.tesla_energy_battery_…), else by name, never a
    // gadget's own battery (sensor.door_battery_level)
    if (ec.battery_level) power.battery_level = ec.battery_level;
    else if (bat.length) {
      const pcts = (m.byDomain.sensor || []).filter((id) => h.states[id]?.attributes?.device_class === 'battery');
      const near = [power.battery, ...batOut, ...batIn].filter(Boolean);
      const devs = near.map(devOf).filter(Boolean);
      const stem = (id) => id.split('_').slice(0, 2).join('_');   // sensor.tesla_energy
      power.battery_level = pcts.find((id) => devs.includes(devOf(id)))
        || pcts.find((id) => near.some((n) => stem(n) === stem(id) && stem(id).includes('_')))
        || pcts.find((id) => /powerwall|home_battery|storage|state_of_charge|_soc\b/.test(id)) || null;
    }
    // no net sensor: a split pair, both positive (grid_in = import, battery_out = discharge)
    if (!power.grid && gridIn.length) {
      power.grid_in = ec.grid_import_power || pick(/grid/, gridIn, /export|to_grid|return|feed|production/);
      power.grid_out = ec.grid_export_power || pick(/grid/, gridOut, /import|from_grid|consum/);
      if (power.grid_in && power.grid_out === power.grid_in) delete power.grid_out;
    }
    if (!power.battery && bat.length) {
      power.battery_out = ec.battery_discharge_power || pick(/discharg/, batOut);
      power.battery_in = ec.battery_charge_power || pick(/charg/, batIn, /discharg/);
    }
    Object.keys(power).forEach((k) => { if (!power[k]) delete power[k]; });

    // Home current / voltage (the "15 A at 240 V" line): sensors on the home power sensor's device
    const onDevice = (dev, dc) => dev ? Object.values(h.entities).find((e) => e.device_id === dev && h.states[e.entity_id]?.attributes?.device_class === dc)?.entity_id : null;
    power.current = ec.home_current || onDevice(devOf(power.home || power.grid || power.grid_in), 'current') || undefined;
    power.voltage = ec.voltage || onDevice(devOf(power.home || power.grid || power.grid_in), 'voltage') || undefined;
    Object.keys(power).forEach((k) => { if (!power[k]) delete power[k]; });

    const top = [];
    if (Object.keys(power).length) {
      // the flow: Power Flow Card Plus (HACS) when it's installed, else HomeView's own
      const want = ec.flow_card || 'auto';
      const pfcp = want !== 'homeview' && customElements.get('power-flow-card-plus');
      if (!pfcp && want !== 'homeview') customElements.whenDefined('power-flow-card-plus').then(() => page.scheduleRebuild());
      if (pfcp) {
        const individual = asList(prefs?.device_consumption).map((d) => {
          const dev = devOf(d.stat_consumption);
          const pw = onDevice(dev, 'power');
          return pw ? { entity: pw, name: d.name || h.devices?.[dev]?.name_by_user || h.devices?.[dev]?.name, w: num(h.states[pw]?.state) || 0 } : null;
        }).filter(Boolean).sort((a, b) => b.w - a.w).slice(0, ec.flow_devices ?? 0).map(({ w, ...x }) => ({ ...x, display_zero: true }));
        const entities = {};
        // net sensors: grid + import / − export, battery + discharge / − charge; split pairs:
        // consumption = from the grid / into the battery, production = to the grid / out of it
        if (power.grid) entities.grid = { entity: power.grid };
        else if (power.grid_in) entities.grid = { entity: power.grid_out ? { consumption: power.grid_in, production: power.grid_out } : { consumption: power.grid_in } };
        if (power.solar) entities.solar = { entity: power.solar, display_zero_state: true };
        const batEnt = power.battery || (power.battery_in || power.battery_out ? { consumption: power.battery_in, production: power.battery_out } : undefined);
        if (batEnt || power.battery_level) entities.battery = { entity: batEnt, state_of_charge: power.battery_level };
        // home: the sensor's own value (the card otherwise adds up the sources itself)
        entities.home = power.home ? { entity: power.home, override_state: true } : {};
        if (individual.length) entities.individual = individual;
        top.push({ kind: 'card', size: ['half', 2], phoneSpan: [2, 6], card: { type: 'custom:power-flow-card-plus', entities,
          clickable_entities: true, use_new_flow_rate_model: true, w_decimals: 0, kw_decimals: 1, watt_threshold: 1000,
          display_zero_lines: { mode: 'transparency', transparency: 50 }, min_flow_rate: 0.75, max_flow_rate: 6, ...(ec.flow_card_options || {}) } });
      } else {
        top.push({ kind: 'energy_flow', power, size: ['half', 2] });
      }
      top.push({ kind: 'energy_now', power, size: ['half', 2] });
    }
    // each meter's power sensor (for the live estimate between meter readings): grid + import /
    // − export, battery + discharge / − charge (only when there's one meter for that side)
    const LIVE = { gin: power.grid ? [power.grid, 1, gridIn] : [power.grid_in, 1, gridIn],
      gout: power.grid ? [power.grid, -1, gridOut] : [power.grid_out, 1, gridOut], sol: [power.solar, 1, solarIds],
      bout: power.battery ? [power.battery, 1, batOut] : [power.battery_out, 1, batOut],
      bin: power.battery ? [power.battery, -1, batIn] : [power.battery_in, 1, batIn] };
    const liveFor = (role) => { const [pw, sign, list] = LIVE[role] || []; return pw && list.length === 1 ? { power: pw, sign } : null; };
    const S = (ids, role, sign = 1) => ids.map((id) => ({ id, role: `${role}:${id}`, sign, live: liveFor(role) }));
    const sumRole = (v, role) => Object.entries(v).filter(([k]) => k.startsWith(role + ':')).reduce((acc, [, x]) => acc + (x || 0), 0);
    const all = [...S(gridIn, 'gin'), ...S(gridOut, 'gout'), ...S(solarIds, 'sol'), ...S(batOut, 'bout'), ...S(batIn, 'bin')];
    const homeUse = (v) => sumRole(v, 'gin') + sumRole(v, 'sol') - sumRole(v, 'gout') + sumRole(v, 'bout') - sumRole(v, 'bin');

    // battery backup time
    if (bat.length || power.battery_level) {
      // energy_storage sensors: "capacity / total / full" = the battery's size, others = what's left in it
      const stores = (m.byDomain.sensor || []).filter((id) => h.states[id]?.attributes?.device_class === 'energy_storage');
      const sizeRe = /capacity|total|full|nominal|max/i;
      const battery_energy = ec.battery_energy || stores.find((id) => !sizeRe.test(id)) || null;
      const capId = stores.find((id) => sizeRe.test(id));
      const capacity = ec.battery_capacity || (capId ? num(h.states[capId].state) : null);
      top.push({ kind: 'energy_backup', power, battery_energy, capacity, size: ['half', 1] });
    }
    // time windows (peak hours …): energy.windows: [{ name, start, end, days }] (or hours: [{start, end}])
    const roles = { gin: gridIn, sol: solarIds, gout: gridOut, bout: batOut, bin: batIn };
    const ids = [...gridIn, ...solarIds, ...gridOut, ...batOut, ...batIn];
    // phones: two windows to a row (an odd last one full width), with a shorter heading
    const wins = ids.length ? asList(ec.windows).filter((w) => w && (w.start || w.hours)) : [];
    wins.forEach((w, i) => {
      const paired = wins.length > 1 && !(i === wins.length - 1 && wins.length % 2);
      top.push({ kind: 'energy_window', window: w, roles, ids, size: ['half', 1], ...(paired ? { phoneSpan: [1, 2], compact: true } : {}) });
    });
    // solar self-sufficiency: house use that came straight from solar
    // solar self-sufficiency: hour by hour, the lower of solar and house use
    if (solarIds.length) {
      top.push({ kind: 'energy_window', mode: 'solar', window: { name: 'Solar', start: '0:00', end: '24:00' }, roles, ids, size: ['half', 1] });
    }
    const items = [];
    const stat = (title, icon, color, stats, extra = {}) => items.push({ title, icon, color, stats, ...extra });
    if (gridIn.length || solarIds.length) stat('Home used', 'mdi:home-lightning-bolt-outline', '#30B0C7', all, { compute: homeUse });
    if (solarIds.length) stat('Solar', 'mdi:solar-power-variant', '#FFB800', S(solarIds, 'sol'));
    if (gridIn.length) stat('From grid', 'mdi:transmission-tower-import', '#5B8DEF', S(gridIn, 'gin'));
    if (gridOut.length) stat('To grid', 'mdi:transmission-tower-export', '#5B8DEF', S(gridOut, 'gout'));
    if (batOut.length) stat('From battery', 'mdi:home-battery-outline', '#34C759', S(batOut, 'bout'));
    if (gridIn.length && (solarIds.length || batOut.length)) {
      stat('Self-sufficiency', 'mdi:leaf', '#34C759', all, { unit: '%',
        compute: (v) => { const u = homeUse(v); return u > 0.05 ? clamp(100 * (1 - sumRole(v, 'gin') / u), 0, 100) : null; } });
    }
    if (items.length) top.push({ kind: 'energy_today', items, size: ['half', 2] });
    const sections = [{ tiles: top }];

    // power outage: every device from the Energy settings with its switch, W · A, kWh today
    const devices = asList(prefs?.device_consumption);
    if (devices.length) {
      if (outageLabel === null) cached('outage:label', 10 * 60e3, () => outageLabelId(h, false).then((id) => { outageLabel = id || ''; return id; }), () => page.scheduleRebuild());
      const loads = devices.map((d) => {
        const statId = d.stat_consumption;
        const dev = devOf(statId) && h.devices?.[devOf(statId)];
        const ents = dev ? Object.values(h.entities).filter((e) => e.device_id === dev.id) : [];
        const byDc = (dc) => ents.find((e) => h.states[e.entity_id]?.attributes?.device_class === dc)?.entity_id || null;
        const sw = ents.find((e) => ['switch', 'light', 'fan'].includes(domainOf(e.entity_id)) && !e.entity_category)?.entity_id || null;
        const name = d.name || dev?.name_by_user || dev?.name || h.states[statId]?.attributes?.friendly_name || statId;
        return { kind: 'energy_load', stat: statId, power: byDc('power'), current: byDc('current'), sw, name, admin: !!h.user?.is_admin, row: true };
      });
      // most used today first: once every number is in, the page is rebuilt in that order
      // most used today first; rebuilt only when that order actually changes (the numbers
      // themselves update in place every minute)
      const orderOf = () => [...loads].sort((a, b) => (getStatToday(hvHass || h, b.stat) || 0) - (getStatToday(hvHass || h, a.stat) || 0)).map((t) => t.stat).join('|');
      const reorder = () => { if (orderOf() !== page._loadOrder) page.scheduleRebuild(); };
      loads.forEach((t) => getStatToday(h, t.stat, reorder));
      loads.sort((a, b) => (getStatToday(h, b.stat) || 0) - (getStatToday(h, a.stat) || 0));
      page._loadOrder = loads.map((t) => t.stat).join('|');
      const limit = ec.devices || 10;
      const shown = page._allLoads ? loads : loads.slice(0, limit);
      const grid = ec.grid_status || [...(m.byDomain.binary_sensor || []), ...(m.byDomain.sensor || [])]
        .find((id) => /grid.?(status|connect|up|online|power_status)|off.?grid/i.test(id)) || null;
      sections.push({ title: null, layout: 'rows', loads: true, tiles: [
        { kind: 'energy_outage', grid, loads: loads.filter((l) => l.sw), more: loads.length > limit, all: !!page._allLoads, total: loads.length, page, full: true, row: true },
        ...shown] });
    }
    if (!src.length && !Object.keys(power).length && !devices.length) {
      return { title: 'Energy', sections: [], note: 'Set up the Energy dashboard in Home Assistant (Settings → Dashboards → Energy) and HomeView fills this page in.' };
    }
    return { title: 'Energy', sections };
  },

  cameras(h, m) {
    return { title: 'Cameras', sections: [{ layout: 'cams', tiles: m.cameras.map((id) => ({ kind: 'camera', entity: id })) }] };
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
.page { overflow-x:hidden; min-height:calc(100vh - var(--header-height, 56px)); background:var(--hv-bg); color:var(--hv-fg); font-family:${FONT};
  padding:var(--hv-pad) var(--hv-pad) calc(var(--hv-pad) * 2); -webkit-font-smoothing:antialiased; }
.head { display:flex; flex-wrap:wrap; align-items:flex-start; justify-content:space-between; gap:12px 20px; margin-bottom:calc(var(--hv-gap) * 1.2); }
.date { font-size:13px; font-weight:650; letter-spacing:.06em; text-transform:uppercase; color:var(--hv-fg2); }
.title { font-size:clamp(30px, 4vw, 34px); font-weight:750; letter-spacing:-.02em; line-height:1.15; display:flex; align-items:center; gap:10px; }
.title .sub { font-size:15px; font-weight:500; color:var(--hv-fg2); letter-spacing:0; }
.back { all:unset; cursor:pointer; width:36px; height:36px; border-radius:50%; background:var(--hv-pill); display:inline-flex;
  align-items:center; justify-content:center; --mdc-icon-size:22px; }
.pills { display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end; max-width:100%; }
@media (max-width:600px) { .pills { justify-content:flex-start; } }
.pill { all:unset; cursor:pointer; display:inline-flex; align-items:center; gap:6px; padding:7px 12px; border-radius:999px;
  background:var(--hv-pill); font-size:13.5px; font-weight:650; color:var(--hv-fg); --mdc-icon-size:17px; white-space:nowrap; }
.pill ha-icon { color:var(--hv-icon); }
.pill.active ha-icon { color:var(--hv-accent); }
.pill.alert { background:#FF3B30; color:#fff; }
.pill.alert ha-icon { color:#fff; }
.people { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
.chips { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
.chp { all:unset; box-sizing:border-box; cursor:pointer; height:38px; min-width:38px; padding:0 9px; border-radius:999px; background:var(--hv-pill);
  display:inline-flex; align-items:center; justify-content:center; gap:6px; color:var(--hv-icon); --mdc-icon-size:20px;
  -webkit-tap-highlight-color:transparent; user-select:none; -webkit-user-select:none; transition:background .2s, color .2s; }
.chp b { font:700 13px ${FONT}; }
.chp.on { background:var(--hv-tile-on); color:var(--hv-accent); }
.chp.warn { color:#FF9F0A; box-shadow:inset 0 0 0 1.5px #FF9F0A; }
.chp.alert { background:#FF3B30; color:#fff; }
.chp.na { opacity:.45; }
.chp.busy { animation:hv-pulse 1.1s ease-in-out infinite; }
@keyframes hv-pulse { 50% { opacity:.45; } }
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
.grid.favs { grid-template-columns:repeat(3, minmax(0, 1fr)); grid-auto-rows:96px; gap:10px; }
.grid.rows.loads, .grid.rows:has(> homeview-tile[style*="1 / -1"]) { grid-template-columns:repeat(auto-fill, minmax(min(100%, 380px), 1fr)); }
.grid.rows { grid-template-columns:repeat(auto-fill, minmax(min(100%, 230px), 1fr)); grid-auto-rows:66px; gap:10px; }
.grid.cams { grid-template-columns:repeat(auto-fill, minmax(min(100%, 300px), 1fr)); grid-auto-rows:auto; }
.grid.cams > homeview-tile { aspect-ratio:16 / 9; height:auto; }
.board { display:grid; gap:var(--hv-gap); padding:clamp(16px, 3vw, 40px); border-radius:34px; background:var(--hv-board); color:var(--hv-fg);
  grid-template-columns:repeat(3, minmax(0, 1fr)); grid-template-rows:repeat(3, minmax(0, 1fr));
  grid-template-areas:"date clock clock" "date clock clock" "cam next weather"; box-sizing:border-box; overflow:hidden;
  height:var(--hv-board-h, calc(100vh - 140px)); min-height:420px; }
.board > homeview-tile { min-height:0; min-width:0; }
/* phones: one screen, like a hand-made iPhone HomeView — date | clock, the photo, up next
   (the weather is on Home) */
.board.narrow { min-height:360px; gap:12px; padding:14px; border-radius:32px;
  grid-template-columns:repeat(2, minmax(0, 1fr)); grid-template-rows:minmax(0, 1fr) minmax(0, 1.3fr) minmax(0, .85fr);
  grid-template-areas:"date clock" "cam cam" "next next"; }
.board.narrow > homeview-tile.a-weather { display:none; }
img.lt { object-fit:cover; background:var(--hv-pill); }
.lt { width:20px; height:20px; border-radius:50%; background:var(--hv-accent); color:#fff; font-size:11px; font-weight:750;
  display:inline-flex; align-items:center; justify-content:center; }
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
.topbar { flex-basis:100%; min-width:0; max-width:100%; display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:-4px; }
.head.padr { padding-right:48px; }
.topbar.solo { position:absolute; top:var(--hv-pad); right:var(--hv-pad); flex-basis:auto; margin:0; z-index:3; }
.page { position:relative; }
.nav { display:flex; gap:6px; overflow-x:auto; scrollbar-width:none; min-width:0; flex:1 1 auto; }
.head > div { min-width:0; max-width:100%; }
.nav::-webkit-scrollbar { display:none; }
.nv, .chip { all:unset; cursor:pointer; display:inline-flex; align-items:center; gap:6px; padding:7px 12px; border-radius:999px; flex:none;
  font:650 13.5px ${FONT}; color:var(--hv-fg2); --mdc-icon-size:18px; }
.nv.on { background:var(--hv-pill); color:var(--hv-fg); }
.nv.on ha-icon { color:var(--hv-accent); }
.chip { background:var(--hv-pill); color:var(--hv-fg); width:36px; height:36px; padding:0; justify-content:center; --mdc-icon-size:20px; }
@media (max-width:700px) { .nv > span:not(.lt) { display:none; } .nv { padding:8px 9px; } }
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
    hvHass = h;
    if (this.isConnected && Date.now() - (this._kAt || 0) > 2500) { this._kAt = Date.now(); applyKiosk(kioskWanted(this._config?.options)); }
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
    HomeViewPage._current = this;
    this._kiosk();
    if (!this._onWinResize) { this._onWinResize = () => this._layout(); window.addEventListener('resize', this._onWinResize); }
  }
  disconnectedCallback() {
    this._ro?.disconnect(); this._ro = null;
    if (this._onWinResize) { window.removeEventListener('resize', this._onWinResize); this._onWinResize = null; }
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
    hvAvatarMode = cfg.avatars ?? 'samples';
    this._model = buildModel(h, cfg);
    const builder = PAGES[this._config.page];
    const page = builder ? builder(h, this._model, cfg, this._config, this) : { title: '?', sections: [] };
    this._page = page;
    const pd = PAGE_DEFS[this._config.page] || {};
    const titleCfg = (cfg.pages_config?.[this._config.page] || (this._config.page === 'living' ? cfg.pages_config?.family || cfg.pages_config?.shared : null))?.title;
    if (titleCfg && this._config.page !== 'room' && this._config.page !== 'member') page.title = titleCfg;
    const pageCfg = cfg.pages_config?.[this._config.page] || (this._config.page === 'living' ? cfg.pages_config?.family || cfg.pages_config?.shared : null) || {};
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
    // phones: the layout of a hand-made iPhone HomeView (see PHONE_SPAN)
    this._phone = this._isPhone();
    if (this._phone) this._phonePage(h, cfg, page);

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
    if (!page.board && !page.sections.some((x) => x.tiles.length) && !notes.length) {
      const n = document.createElement('div'); n.className = 'note';
      n.textContent = this._config.page === 'custom' ? 'This page has no tiles yet. Add some under custom_pages → sections → tiles.' : 'Nothing to show here yet.';
      frag.appendChild(n);
    }
    if (page.board) {
      const b = document.createElement('div'); b.className = 'board';
      const bh = page.hue ?? pd.hue ?? 200;
      b.setAttribute('style', styleVars({ ...palette(bh, dark, 0.3),
        '--hv-board': dark ? `hsl(${bh} 12% 15%)` : `hsl(${bh} 13% 72%)`,
        '--hv-fg': dark ? '#EEF2F3' : '#15191B', '--hv-fg2': dark ? `hsl(${bh} 8% 66%)` : `hsl(${bh} 9% 30%)`,
        '--hv-accent': dark ? '#FF9F45' : '#E8640C', '--hv-clock-num': 'var(--hv-fg)', '--hv-line': dark ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.14)',
        '--hv-tile': 'transparent', '--hv-pill': dark ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.35)' }));
      for (const spec of page.board) {
        const t = this._tile({ ...spec, size: [1, 1] }, dark);
        t._hvFree = true;
        t.style.gridArea = spec.area;
        t.classList.add(`a-${spec.area}`);
        b.appendChild(t);
      }
      frag.appendChild(b);
    }
    for (const sec of page.sections) {
      if (!sec.tiles.length) continue;
      const s = document.createElement('div');
      s.className = 'sec' + (page.compactSections && !editing && sec.layout !== 'favs' ? ' compact' : '') + (sec.hidden ? ' hidden-sec' : '');
      if (sec.title) {
        s.insertAdjacentHTML('beforeend', `<div class="sec-h">${esc(sec.title)}${sec.sub ? `<span class="sub">${esc(sec.sub)}</span>` : ''}${sec.link ? `<span class="more" data-nav="${esc(sec.link)}">See all ›</span>` : ''}</div>`);
        // a room's title: hold (or tap) = the room's details page
        if (sec.room && !editing) { const hd = s.lastElementChild; hd.style.cursor = 'pointer'; const go = () => navigate(`room-${sec.room}`);
          bindPress(hd, () => { const l = roomMainLight(this._hass, this._model.areaById[sec.room]); if (l) this._hass.callService('light', 'toggle', {}, { entity_id: l }); else go(); }, go); }
      }
      const g = document.createElement('div'); g.className = 'grid' + (sec.layout ? ` ${sec.layout}` : '') + (sec.loads ? ' loads' : '');
      if (sec.hue !== undefined) g.setAttribute('style', styleVars(palette(sec.hue, dark)));
      for (const spec of sec.tiles) {
        const t = this._tile(sec.layout === 'rows' ? { ...spec, row: true } : spec, dark);
        if (sec.layout) t._hvFree = true;
        if (spec.full) { t.style.gridColumn = '1 / -1'; if (this._phone && spec.kind === 'energy_outage') t.style.gridRow = 'span 3'; }
        g.appendChild(t);
      }
      s.appendChild(g);
      frag.appendChild(s);
    }
    this._root.replaceChildren(frag);
    this._root.querySelectorAll('[data-nav]').forEach((el) => el.addEventListener('click', () => navigate(el.dataset.nav)));
    this._renderHead();
    this._layout();
  }

  _isPhone() { return (this.clientWidth || window.innerWidth) < 600; }

  // compact 64 px tiles, rooms as section bars, a member's room as its bar, no clock,
  // the favourites strip under "Hi <name>" on Living and a member's page
  _phonePage(h, cfg, page) {
    for (const sec of page.sections) {
      const out = [];
      for (const t of sec.tiles) {
        if (t.kind === 'clock') continue;
        if (t.kind === 'member_hero' && !t.here) {
          if (t.room) {
            out.push({ kind: 'room', room: t.room, section: true, name: `${page.member?.name || ''}${page.member ? "'s room" : ''}`.trim() || t.room.name,
              navigate: `room-${t.room.id}`, hue: t.room.hue });
          }
          continue;
        }
        if (t.kind === 'room') { out.push({ ...t, section: true }); continue; }
        if (['entity', 'room_lights', 'energy_device', 'room_power'].includes(t.kind) && !sec.layout) { out.push({ ...t, row: true }); continue; }
        out.push(t);
      }
      sec.tiles = out;
    }
    if (page.greet) {
      const favs = phoneFavorites(h, this._model, cfg);
      if (favs.length) {
        page.sections.unshift({ title: 'Favorites', layout: 'favs', tiles: favs.map((id) => entTile(id, { areaName: this._model.areaById[entityArea(h, id)]?.name, showRoom: true })) });
      }
    }
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
          const sizes = [[1, 1], [2, 1], [3, 1], [2, 2]];
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

  toggleAllLoads() { this._allLoads = !this._allLoads; this.rebuild(); }

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

  // Tile grid, as on a hand-made HomeView:
  //   phone (< 600 px wide)  2 columns, square tiles, 14 px padding, 10 px gap
  //   tablet / browser       5 columns (Home, a member's room, your pages) or 6 (Living, rooms,
  //                          energy …), 2.5 vw padding, 16 px gap; square tiles, but on screens
  //                          wider than 3:2 (Pixel Tablet, laptops) 1.28 : 1 (5 columns) or
  //                          1.1 : 1 (6 columns) so the rows fit the screen; on big screens
  //                          more columns, so a tile is never wider than ~300 px
  // row height = (grid width - gaps) / columns / tile shape. tile_size / max_columns override.
  _layout() {
    const w = this.clientWidth || window.innerWidth;
    const cfg = this._config.options || {};
    const phone = w < 600;
    const pageCols = PAGE_COLUMNS[this._config.page] || 5;
    let cols, pad, gap, aspect;
    if (phone !== !!this._phone && this._page) { this._phone = phone; this.rebuild(); return; }
    if (phone) {
      cols = 2; pad = 14; gap = 10; aspect = 1;
    } else {
      pad = Math.round(clamp(w * 0.025, 16, 48)); gap = 16;
      cols = w < 800 ? Math.min(pageCols, 4) : pageCols;
      while ((w - 2 * pad - gap * (cols - 1)) / cols > 300 && cols < 12) cols++;
      const wide = window.innerWidth / Math.max(1, window.innerHeight) >= 1.5;
      aspect = wide ? (cols >= 6 ? 1.1 : 1.28) : 1;
    }
    if (cfg.tile_size) {   // the old rule: as many columns as fit tiles at least this wide
      cols = clamp(Math.floor((w - 2 * pad + gap) / (cfg.tile_size + gap)), 2, 12);
    }
    if (cfg.max_columns) cols = Math.min(cols, cfg.max_columns);
    cols = Math.max(2, cols);
    const colW = (w - 2 * pad - gap * (cols - 1)) / cols;
    const row = phone ? 64 : Math.round(colW / aspect);
    this._root.style.setProperty('--hv-cols', cols);
    this._root.style.setProperty('--hv-row', `${row}px`);
    this._root.style.setProperty('--hv-gap', `${gap}px`);
    this._root.style.setProperty('--hv-pad', `${pad}px`);
    const board = this._root.querySelector('.board');
    if (board) {
      board.classList.toggle('narrow', cols < 4);
      // fill the screen below the page bar: measured once laid out (and again after a resize)
      requestAnimationFrame(() => {
        const top = board.getBoundingClientRect().top + (window.scrollY || 0);
        if (top > 0) board.style.setProperty('--hv-board-h', `${Math.max(420, Math.round(window.innerHeight - top - pad))}px`);
      });
    }
    for (const t of this._tiles) {
      if (t._hvFree) continue;
      let [sw, sh] = t._hvSize;
      if (phone) {   // rows are 64 px: big tiles span several, compact tiles one
        const k = t.spec?.kind;
        const span = t.spec?.phoneSpan || PHONE_SPAN[k];
        if (span) [sw, sh] = span;
        else if (t.spec?.row) { sh = 1; sw = sw >= 2 ? 2 : 1; }
        else if (k === 'card') { sw = 2; sh = Math.max(2, (sh || 2) * 3); }
        else { sw = Math.min(2, sw === 'half' || sw === 'full' ? 2 : sw); sh = Math.max(1, sh * 2); }
      }
      if (sw === 'half') sw = cols >= 4 ? Math.ceil(cols / 2) : cols;
      if (sw === 'full') sw = cols;
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
    const chipAlarm = asList(page.chips).some((c) => domainOf(c.entity) === 'alarm_control_panel');
    // phones: the status pills on Home only (as on a hand-made iPhone HomeView)
    const pills = page.pills && cfg.pills !== false && (!this._phone || this._config.page === 'home')
      ? asList(cfg.pills && cfg.pills !== true ? cfg.pills : DEFAULT_PILLS).filter((id) => !(id === 'alarm' && chipAlarm))
        .map((id) => [id, PILLS[id]?.(h, m, cfg)]).filter(([, p]) => p)
      : [];
    const people = page.people && cfg.people_chips !== false ? m.persons : [];
    const today = new Date().toLocaleDateString(h.locale?.language, { weekday: 'long', month: 'long', day: 'numeric' });
    const editing = this._editing;
    const canEdit = h.user?.is_admin && cfg.edit_button !== false;
    if (this._updEnt === undefined) this._updEnt = findUpdateEntity(h);
    const upd = h.user?.is_admin && cfg.update_notice !== false && this._updEnt ? h.states[this._updEnt] : null;
    const updOn = upd?.state === 'on' && !upd.attributes.skipped_version ? upd.attributes.latest_version : null;
    // installed by HACS, but this screen still runs an older copy from the browser cache
    const instV = cleanVer(upd?.attributes?.installed_version);
    const stale = upd && /^\d+\.\d+\.\d+$/.test(instV) && newerVer(instV, HV_VERSION) ? instV : null;
    const kiosk = kioskWanted(cfg);
    const chip = cfg.kiosk !== false && cfg.kiosk_chip !== false;
    // the page bar shows with HA's sidebar (Menu); in full screen: swipe or ← / → keys
    const nav = !kiosk && !page.back ? asList(this._config.nav) : [];
    const here = this._config.path || this._config.page;
    const chips = asList(page.chips);
    const looks = chips.map((c) => chipLook(h, c));
    const key = JSON.stringify([today, page.title, editing, canEdit, updOn, stale, kiosk, here, looks, chips.map((c) => h.states[c.entity]?.state), pills.map(([id, p]) => [id, p.text, p.alert, p.active]), people.map((id) => h.states[id]?.state)]);
    if (key === this._headKey) return;
    this._headKey = key;
    const room = page.room;
    let roomSub = '';
    if (room) {
      const s = roomSummary(h, room);
      roomSub = [s.t !== null ? `${fmt(s.t, 1)}°` : null, s.hu !== null ? `${fmt(s.hu, 0)}%` : null].filter(Boolean).join(' · ');
    }
    const updBanner = stale ? `<button class="upd" data-fresh><ha-icon icon="mdi:refresh-circle"></ha-icon>
        <span><b>HomeView ${esc(stale)} is installed</b>, but this screen still runs ${esc(HV_VERSION)}. Tap to reload it.</span></button>`
      : updOn ? `<button class="upd" data-more="${esc(this._updEnt)}"><ha-icon icon="mdi:arrow-up-circle"></ha-icon>
        <span><b>HomeView ${esc(updOn)} is available</b> (you have ${esc(HV_VERSION)}). Tap to see what's new and update.</span></button>` : '';
    const solo = !(nav.length > 1) && !page.minimalHead;   // just the Menu icon: float it top right
    head.classList.toggle('padr', !!(solo && chip));
    const topbar = nav.length > 1 || chip ? `<div class="topbar${solo ? ' solo' : ''}">
        <div class="nav">${nav.length > 1 ? nav.map((v) => `<button class="nv${v.path === here ? ' on' : ''}" data-nav-to="${esc(v.path)}" title="${esc(v.title)}">${v.avatar ? `<img class="lt" src="${esc(v.avatar)}" alt="">` : v.letter ? `<span class="lt">${esc(v.letter)}</span>` : `<ha-icon icon="${esc(v.icon)}"></ha-icon>`}<span>${esc(v.title)}</span></button>`).join('') : ''}</div>
        ${chip ? `<button class="chip" data-kiosk title="${kiosk ? 'Menu: show Home Assistant\'s sidebar and header' : 'Full screen: hide Home Assistant\'s sidebar and header'}" aria-label="${kiosk ? 'Menu' : 'Full screen'}"><ha-icon icon="${kiosk ? 'mdi:dock-left' : 'mdi:fullscreen'}"></ha-icon></button>` : ''}</div>` : '';
    head.innerHTML = page.minimalHead ? `${updBanner}${topbar}` : `${updBanner}${topbar}<div>
        <div class="date">${esc(today)}</div>
        <div class="title">${page.back ? '<button class="back" data-back><ha-icon icon="mdi:chevron-left"></ha-icon></button>' : ''}${esc(this._phone && page.greet && h.user?.name ? `Hi ${h.user.name.split(' ')[0]}` : page.title)}${roomSub ? `<span class="sub">${esc(roomSub)}</span>` : ''}${canEdit && !editing ? '<button class="back pen" data-edit-on title="Edit HomeView"><ha-icon icon="mdi:pencil-outline"></ha-icon></button>' : ''}</div>
        ${editing ? `<div class="editbar"><span><b>Editing</b> · <ha-icon icon="mdi:star-outline"></ha-icon> on Home · <ha-icon icon="mdi:resize"></ha-icon> size · <ha-icon icon="mdi:rename-outline"></ha-icon> name · <ha-icon icon="mdi:eye-off-outline"></ha-icon> hide · <ha-icon icon="mdi:palette-outline"></ha-icon> room colour</span>
          <span class="eb"><button class="txt" data-settings><ha-icon icon="mdi:cog-outline"></ha-icon> Settings</button><button class="txt primary" data-edit-off>Done</button></span></div>` : ''}
        ${chips.length ? `<div class="chips">${chips.map((c, i) => {
          const L = looks[i], st = h.states[c.entity];
          const icon = (isActive(st) ? c.icon_on : c.icon_off) || c.icon || L.icon;
          return `<button class="chp ${L.cls}${L.busy ? ' busy' : ''}" data-chip="${i}" title="${esc(c.name || st?.attributes?.friendly_name || c.entity)}">
            <i data-e="${esc(c.entity)}"${icon ? ` data-i="${esc(icon)}"` : ''}></i>${L.word ? `<b>${esc(L.word)}</b>` : ''}</button>`;
        }).join('')}</div>` : ''}
        ${people.length ? `<div class="people">${people.map((id) => {
          const st = h.states[id]; if (!st) return '';
          const pic = avatarUrl(h, id), nm = st.attributes.friendly_name || id;
          return `<div class="avatar${st.state === 'home' ? ' home' : ''}" data-more="${esc(id)}" title="${esc(nm)} · ${esc(hassState(h, st))}">${pic ? `<img src="${esc(pic)}">` : esc(nm.slice(0, 1).toUpperCase())}</div>`;
        }).join('')}</div>` : ''}
      </div>
      ${pills.length ? `<div class="pills">${pills.map(([id, p]) => `<button class="pill${p.alert ? ' alert' : p.active ? ' active' : ''}" data-pill="${id}"><ha-icon icon="${p.icon}"></ha-icon>${esc(p.text)}${p.popup ? '<ha-icon icon="mdi:chevron-right" style="--mdc-icon-size:15px;opacity:.6"></ha-icon>' : ''}</button>`).join('')}</div>` : ''}`;
    head.querySelector('[data-back]')?.addEventListener('click', () => (history.length > 1 ? history.back() : navigate('living')));
    fillIcons(head, h);
    head.querySelectorAll('[data-chip]').forEach((el) => {
      const c = chips[Number(el.dataset.chip)];
      bindPress(el, () => { const p = chipTap(this._hass, c, this); if (p?.catch) p.catch((e) => console.warn('HomeView chip', e)); },
        () => moreInfo(this, c.entity));
    });
    head.querySelector('[data-edit-on]')?.addEventListener('click', () => this._setEditing(true));
    head.querySelector('[data-fresh]')?.addEventListener('click', () => reloadFresh());
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
    const g = document.createElement('div'); g.className = 'grid rows';
    const tiles = ids.map((id) => {
      const room = this._model.areaById[entityArea(h, id)];
      const t = this._tile(rowTile(id, { showRoom, areaName: room?.name }), this._dark);
      t._hvFree = true;
      return t;
    });
    tiles.forEach((t) => g.appendChild(t));
    sheet.appendChild(g); pop.appendChild(sheet);
    const close = () => { pop.remove(); this._tiles = this._tiles.filter((t) => !tiles.includes(t)); };
    pop.addEventListener('click', (e) => { if (e.target === pop) close(); });
    sheet.querySelector('[data-close]').addEventListener('click', close);
    this._root.appendChild(pop);
    this._layout();
  }

  _go(step) {
    const order = this._config.order || [];
    const i = order.indexOf(this._config.path || this._config.page);
    if (i === -1 || order.length < 2) return;
    navigate(order[(i + step + order.length) % order.length]);
  }

  // swipe left / right between the top-level pages (tablets, phones)
  _bindSwipe() {
    if (!HomeViewPage._keys) {   // ← / → on a keyboard (one listener for the whole dashboard)
      HomeViewPage._keys = true;
      window.addEventListener('keydown', (e) => {
        if (e.altKey || e.ctrlKey || e.metaKey || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
        const t = e.composedPath()[0];
        if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
        const pg = HomeViewPage._current;
        if (!pg || !pg.isConnected || pg._root.querySelector('.pop') || pg._config.options?.swipe === false) return;
        pg._go(e.key === 'ArrowRight' ? 1 : -1);
      });
    }
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
      this._go(dx < 0 ? 1 : -1);
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
  slideshow: ['Photo folder', 'A media folder, e.g. media-source://media_source/local/Photos, or "samples". Empty = the first folder named Photos, Pictures, Slideshow … under Media, else sample photos.'],
  slideshow_interval: ['Change photo every'],
  slideshow_thumbnail: ['Smaller copy to try first (optional)', 'For NAS thumbnails, e.g. {dir}/.@__thumb/s800{name} on QNAP. Falls back to the full photo.'],
  camera: ['Camera instead of photos', 'The camera is on the Home page; set one here to show it on Widgets instead of the photos.'],
  chips: ['Control chips under the title', 'Round buttons that turn red when something needs attention. Empty = automatic (alarm, garage, locks, water valve). Icons / confirm per chip: YAML.'],
  favorites: ['Favourites', 'Tiles near the top of Home. Empty = automatic (alarm, locks, garage, thermostat).'],
  rooms: ['Show rooms on Home'],
  scenes: ['Show scenes on Home'],
  max_scenes: ['Most scenes on Home'],
  people: ['People', 'Empty = everyone with a phone / tracker.'],
  calendars: ['Calendars', 'Empty = all calendars.'],
  weather: ['Weather', 'Empty = the first weather entity.'],
  cameras: ['Cameras', 'Empty = all cameras.'],
  people_chips: ['People avatars under the Home title'],
  avatars: ['Avatars for people without a picture', 'A picture set on the person in Home Assistant is always used first. Man / woman per person: YAML (avatars: { person.alex: man }).'],
  room_order: ['Room order', 'These rooms first, in this order; the rest after.'],
  hide_rooms: ['Hide rooms'],
  living_rooms: ['Living page rooms', 'The rooms on the Living page, in this order. Empty = the indoor rooms that aren\'t a bedroom or bathroom, living spaces first.'],
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
const EDITOR_DEFAULTS = { theme: 'auto', pages: DEFAULT_PAGES, swipe: true, edit_button: true, update_notice: true, kiosk: true, kiosk_chip: true, avatars: 'samples', people_chips: true, battery_low: 20,
  home: { rooms: false, scenes: true, max_scenes: 8 } };

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
        options: Object.keys(PAGE_DEFS).map((p) => ({ value: p, label: { rooms: 'Rooms (a page per family member)', all_rooms: 'All rooms (directory)' }[p] || PAGE_DEFS[p].title })) } } },
      { name: 'swipe', selector: { boolean: {} } },
      { name: 'edit_button', selector: { boolean: {} } },
      { name: 'update_notice', selector: { boolean: {} } },
      { name: 'kiosk', selector: { boolean: {} } },
      { name: 'kiosk_chip', selector: { boolean: {} } },
    ] },
    { type: 'expandable', name: 'widgets', title: 'Widgets page', icon: 'mdi:view-dashboard-variant-outline', schema: [
      { name: 'slideshow', selector: { text: {} } },
      { name: 'slideshow_interval', selector: { number: { min: 5, max: 3600, step: 5, unit_of_measurement: 's', mode: 'box' } } },
      { name: 'slideshow_thumbnail', selector: { text: {} } },
      { name: 'camera', selector: { entity: { filter: { domain: 'camera' } } } },
    ] },
    { type: 'expandable', name: 'home', title: 'Home page', icon: 'mdi:home-outline', schema: [
      { name: 'favorites', selector: { entity: { multiple: true } } },
      { name: 'chips', selector: { entity: { multiple: true } } },
      { name: 'rooms', selector: { boolean: {} } },
      { name: 'scenes', selector: { boolean: {} } },
      { name: 'max_scenes', selector: { number: { min: 0, max: 24, mode: 'box' } } },
    ] },
    { type: 'expandable', name: '', flatten: true, title: 'People, calendars, weather & cameras', icon: 'mdi:account-group-outline', schema: [
      { name: 'people', selector: { entity: { multiple: true, filter: { domain: 'person' } } } },
      { name: 'people_chips', selector: { boolean: {} } },
      { name: 'avatars', selector: { select: { mode: 'dropdown', options: [
        { value: 'samples', label: 'Anime avatars (DiceBear)' }, { value: 'initials', label: 'Initials' }] } } },
      { name: 'calendars', selector: { entity: { multiple: true, filter: { domain: 'calendar' } } } },
      { name: 'weather', selector: { entity: { filter: { domain: 'weather' } } } },
      { name: 'cameras', selector: { entity: { multiple: true, filter: { domain: 'camera' } } } },
    ] },
    { type: 'expandable', name: '', flatten: true, title: 'Rooms', icon: 'mdi:sofa-outline', schema: [
      { name: 'room_order', selector: { select: { multiple: true, reorder: true, options: areas.map((a) => ({ value: a.area_id, label: a.name })) } } },
      { name: 'hide_rooms', selector: { area: { multiple: true } } },
      { name: 'living_rooms', selector: { select: { multiple: true, reorder: true, options: areas.map((a) => ({ value: a.area_id, label: a.name })) } } },
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
    hvAvatarMode = options.avatars ?? 'samples';
    const m = buildModel(hass, options);
    const customs = asList(options.custom_pages).map((d, i) => ({ ...d, idx: i, path: String(d.path || `page-${i + 1}`) }));
    const wanted = [...new Set(asList(options.pages || DEFAULT_PAGES).map((p) => PAGE_ALIASES[p] || p))]
      .filter((p) => PAGE_DEFS[p] || customs.some((c) => c.path === p));
    let hasEnergy = false;
    if (wanted.includes('energy')) {
      try {
        const prefs = await ws(hass, { type: 'energy/get_prefs' });
        hasEnergy = !!(prefs?.energy_sources?.length || prefs?.device_consumption?.length);
      } catch (e) { hasEnergy = false; }
      if (options.energy) hasEnergy = true;
    }
    const available = {
      home: true, widgets: true, rooms: m.members.length > 0 || m.rooms.length > 0, all_rooms: m.rooms.length > 0, energy: hasEnergy,
      living: m.rooms.length > 0, people: m.persons.length > 0 || m.calendars.length > 0, cameras: m.cameras.length > 0,
    };
    const pages = [...wanted.filter((p) => !PAGE_DEFS[p] || available[p]),
      ...customs.map((c) => c.path).filter((p) => !wanted.includes(p))];
    const pc = options.pages_config || {};
    const allPaths = [...new Set(pages.flatMap((p) => (p !== 'rooms' ? [p]
      : m.members.length ? m.members.map((x) => `member-${x.slug}`) : ['all_rooms'])))];
    // who sees which pages — the dashboard is generated per viewer, so pages a viewer may not see
    // simply aren't made for them (not in their page bar or swipe order either):
    //   admins: every page;  everyone else: the shared pages + their own person page
    //   access: { <person entity or login name>: all | [page ids / paths, rooms = their own person
    //             page, all_members = every person page] }
    const me = hass.user || {};
    const mine = Object.keys(hass.states).filter((id) => id.startsWith('person.') && hass.states[id].attributes.user_id === me.id);
    const acc = options.access || {};
    const accKey = Object.keys(acc).find((k) => mine.includes(k) || k.toLowerCase() === String(me.name || '').toLowerCase());
    const rule = accKey !== undefined ? acc[accKey] : (me.is_admin ? 'all' : null);
    const memberOf = (path) => m.members.find((x) => `member-${x.slug}` === path);
    const own = (mem) => mine.includes(mem.person);
    const allowed = (path) => {
      if (rule === 'all') return true;
      const mem = memberOf(path);
      if (rule === null) return mem ? own(mem) : true;                     // default for non-admins
      const set = new Set(asList(rule).map((x) => PAGE_ALIASES[x] || x));
      if (mem) return set.has(path) || set.has('all_members') || (set.has('rooms') && own(mem));
      return set.has(path) || (path === 'all_rooms' && set.has('rooms'));
    };
    const paths = allPaths.filter(allowed);
    const views = paths.map((p) => {
      const mem = m.members.find((x) => `member-${x.slug}` === p);
      if (mem) {
        return { title: mem.name, path: p, icon: mem.room?.icon || 'mdi:account', letter: mem.name.slice(0, 1).toUpperCase(), avatar: avatarUrl(hass, mem.person), type: 'panel',
          cards: [{ type: 'custom:homeview-page', page: 'member', member: mem.person, path: p, order: paths, options }] };
      }
      const c = customs.find((x) => x.path === p);
      if (c) {
        return { title: c.title || 'Page', path: p, icon: c.icon || 'mdi:view-grid-outline', type: 'panel',
          cards: [{ type: 'custom:homeview-page', page: 'custom', custom: c.idx, path: p, order: paths, options }] };
      }
      const pcp = pc[p] || (p === 'living' ? pc.family || pc.shared : null) || {};
      return { title: pcp.title || PAGE_DEFS[p].title, path: p, icon: pcp.icon || PAGE_DEFS[p].icon, type: 'panel',
        cards: [{ type: 'custom:homeview-page', page: p, path: p, order: paths, options }] };
    });
    const nav = views.map((v) => ({ path: v.path, title: v.title, icon: v.icon, letter: v.letter, avatar: v.avatar }));
    views.forEach((v) => { v.cards[0].nav = nav; delete v.letter; delete v.avatar; });
    for (const r of m.rooms) {
      views.push({
        title: r.name, path: `room-${r.id}`, icon: r.icon, subview: true,
        back_path: paths.includes('living') ? 'living' : paths.includes('all_rooms') ? 'all_rooms' : undefined,
        type: 'panel',
        cards: [{ type: 'custom:homeview-page', page: 'room', area: r.id, order: [], options }],
      });
    }
    // the HACS "swipe-navigation" plugin acts on every dashboard unless told not to: with
    // HomeView's own swipe as well, one swipe moved two pages. swipe: false hands it back.
    return { title: options.title || 'HomeView', views, ...(options.swipe !== false ? { swipe_nav: { enable: false } } : {}) };
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
