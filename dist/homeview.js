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
const HV_VERSION = '0.8.18';
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
// rows a page should fit on one tablet / browser screen (the tile formula in _layout; default 4,
// as a hand-made HomeView's "4 rows of 6 fill the Pixel"). Option rows_on_screen: a number for
// every page, or { page: n }
const ROWS_ON_SCREEN = {};
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
  'kiosk', 'kiosk_chip', 'members', 'living_rooms', 'widgets', 'avatars', 'phone_favorites', 'access',
  'comfort', 'comfort_thermostat', 'comfort_margin', 'comfort_limits', 'screensaver', 'rows_on_screen', 'ui_edits', 'from', 'edits', 'font', 'warnings'];   // energy.* : see the energy page

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
/**
 * font: a font of your own instead of each screen's system font (SF Pro on Apple, Roboto on
 * Android …), so every screen looks the same. Served from your Home Assistant, nothing from the
 * internet. `font:` = the whole dashboard; `widgets: { font: … }` = the Widgets page only. The clock
 * always keeps the system font.
 *   font: geist                                   /config/www/fonts/geist/Geist.ttf (closest to SF Pro)
 *   font: inter                                   /config/www/fonts/inter/InterVariable.woff2
 *   font: { family: Inter, url: /local/fonts/inter/InterVariable.woff2, weight: 100 900 }
 *   font: Georgia                                 a font the screens already have
 */
const FONT_PRESETS = {
  inter: { family: 'Inter', url: '/local/fonts/inter/InterVariable.woff2', weight: '100 900' },
  // Geist: the closest free match for SF Pro's digits (the 6's straight, flat-cut top; round bowls)
  geist: { family: 'Geist', url: '/local/fonts/geist/Geist.ttf', weight: '100 900' },
};
const _fontLoads = new Map();
function fontStack(spec) {
  if (!spec) return null;
  const d = typeof spec === 'string' ? (FONT_PRESETS[spec.toLowerCase()] || { family: spec }) : spec;
  if (!d || !d.family) return null;
  if (d.url && !_fontLoads.has(d.url) && window.FontFace && document.fonts) {
    const ff = new FontFace(String(d.family), `url(${d.url})`, { weight: String(d.weight || '100 900'), display: 'swap' });
    _fontLoads.set(d.url, ff.load().then((f) => { document.fonts.add(f); return true; },
      (e) => { console.warn(`HomeView: couldn't load the font ${d.url}`, e); return false; }));
  }
  return `'${String(d.family).replace(/['"]/g, '')}', ${FONT}`;
}
const UNAVAILABLE = ['unavailable', 'unknown'];

/* ============================================================================================
 * Small helpers
 * ========================================================================================== */

const domainOf = (id) => id.split('.')[0];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
// one number format per decimal count (toLocaleString with options builds a new one each call,
// and numbers are formatted on every header / tile redraw)
const _numFmts = new Map();
const numFmt = (d) => { let f = _numFmts.get(d); if (!f) { f = new Intl.NumberFormat(undefined, { maximumFractionDigits: d, minimumFractionDigits: d }); _numFmts.set(d, f); } return f; };
const fmt = (v, d = 0) => (v === null || v === undefined ? '—' : numFmt(d).format(Number(v)));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const asList = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);

/** "2x1", [2, 1] or 2 -> [w, h] */
function parseSize(v, fallback = null) {
  if (Array.isArray(v)) return [Number(v[0]) || 1, Number(v[1]) || 1];
  if (typeof v === 'number') return [v, 1];
  if (typeof v === 'string') {
    // 2x1, or full / half (the width of the grid / half of it) with an optional height: full x 3
    // a height of "auto" (cards): as many rows as the card needs, measured
    const m = v.trim().match(/^(\d+|full|half)\s*(?:[x×*]\s*(\d+|auto))?$/i);
    const hgt = (x) => (x && x.toLowerCase() === 'auto' ? 'auto' : x ? +x : null);
    if (m && (m[2] || isNaN(m[1]))) return [isNaN(m[1]) ? m[1].toLowerCase() : +m[1], hgt(m[2]) ?? (isNaN(m[1]) ? 2 : 1)];
  }
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
// kioskOn: true = full screen (header + sidebar hidden), 'menu' = HA's header hidden only (the
// sidebar and HomeView's own page bar show — HA's header would repeat the page tabs), false = off
let kioskOn = false;
const kioskWatched = new WeakSet();
const kioskWants = (mode, k) => mode === true || (mode === 'menu' && k === 'root');
function watchKiosk(sr) {
  if (!sr || kioskWatched.has(sr)) return;
  kioskWatched.add(sr);
  // quiet (no resize event): a resize makes HA lay its drawer out again, which could drop the style
  // again and the two would chase each other without the page ever getting a free moment ("Page
  // isn't responding"); and at most 5 re-applies a second, as a safety net
  let n = 0, since = 0;
  new MutationObserver(() => {
    if (!kioskOn || sr.querySelector(`#${KIOSK_ID}`)) return;
    const k = Object.entries(haShadowRoots()).find(([, r]) => r === sr)?.[0];
    if (!k || !kioskWants(kioskOn, k)) return;
    const t = Date.now();
    if (t - since > 1000) { since = t; n = 0; }
    if (++n > 5) { setTimeout(() => { if (kioskOn) applyKiosk(kioskOn, true); }, 1000); return; }
    applyKiosk(kioskOn, true);
  }).observe(sr, { childList: true });
}
let kioskResizeBound = false;
function bindKioskResize() {
  if (kioskResizeBound) return;
  kioskResizeBound = true;
  let t1 = null, t2 = null;
  window.addEventListener('resize', () => {
    if (!kioskOn) return;
    clearTimeout(t1); clearTimeout(t2);
    t1 = setTimeout(() => applyKiosk(kioskOn, true), 80);
    t2 = setTimeout(() => applyKiosk(kioskOn, true), 700);
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
    if (kioskWants(on, k)) {
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
/** Full screen (true), menu mode — HA's header hidden, sidebar and page bar shown ('menu') — or
 *  Home Assistant's normal header (false: kiosk: false in the config). */
function kioskMode(cfg) { return cfg?.kiosk === false ? false : kioskWanted(cfg) ? true : 'menu'; }
/**
 * Keep the scroll position across an edit: saving rebuilds the page (and Home Assistant reloads
 * the dashboard after a save), which used to jump back to the top. keepScroll() before the change,
 * restoreScroll() after each rebuild — a few times, as tiles take their size.
 */
let hvScrollKeep = null;
function keepScroll() { hvScrollKeep = { path: location.pathname, y: window.scrollY, at: Date.now() }; }
function restoreScroll() {
  const k = hvScrollKeep;
  if (!k || k.path !== location.pathname || Date.now() - k.at > 15000 || !k.y) return;
  for (const ms of [0, 60, 200, 500, 1000, 1800]) {
    setTimeout(() => { if (hvScrollKeep === k && Math.abs(window.scrollY - k.y) > 2) window.scrollTo(0, k.y); }, ms);
  }
  setTimeout(() => { if (hvScrollKeep === k) hvScrollKeep = null; }, 2500);
}
/**
 * On phones and iPads HA's sidebar is a drawer behind its own ☰: after Menu shows the header,
 * open the drawer too, so Settings, the integrations' panels and the profile are one tap away.
 * (A wide screen docks the sidebar, which comes back with the header.)
 */
/**
 * Screensaver: a big analog clock that fills the screen after a while without a touch — for a
 * wall tablet (after the hand-made Slopeview HomeView's WallPanel clock). Built in, no plugin.
 * screensaver: auto (default) = touch tablets only (a touch screen whose smaller side is ≥ 600
 * px), never phones or desktops | true | false | { idle: 120, pages: [...], color: '#4D7DB8' }.
 * Not on Cameras or while editing. Any touch closes it, and that touch doesn't reach the page.
 */
const hvScreensaver = (() => {
  let enabled = false, idleMs = 120e3, color = '#4D7DB8', last = Date.now(), el = null, blockUntil = 0, timer = null, minute = null;
  const now = () => Date.now();
  const wake = () => { last = now(); };
  const clockSvg = () => {
    const d = new Date();
    const sec = d.getHours() % 12 * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;
    // fills the screen either way up: landscape grows the drawing wider, portrait taller (the
    // clock itself stays 100 × 100 in the middle — nothing is cropped off the sides)
    const ar = (window.innerWidth || 1180) / (window.innerHeight || 820);
    const W = Math.max(100, 100 * ar), H = Math.max(100, 100 / ar), cx = W / 2, cy = H / 2;
    const num = (t, x, y) => `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" fill="#0B0B0C" font-size="56" font-weight="300" letter-spacing="-3">${t}</text>`;
    const spin = (period) => `transform-origin:${cx}px ${cy}px;animation:hvss ${period}s linear infinite;animation-delay:-${(sec % period).toFixed(2)}s`;
    const hand = (len, w, period) => `<g style="${spin(period)}"><line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 6}" stroke="#FFF" stroke-width="1.3" stroke-linecap="round"/><line x1="${cx}" y1="${cy - 6}" x2="${cx}" y2="${cy - len}" stroke="#FFF" stroke-width="${w}" stroke-linecap="round"/></g>`;
    const wd = d.toLocaleDateString(hvHass?.locale?.language, { weekday: 'short' }).toUpperCase();
    const dx = Math.min(36, 30 + (W - 100) * 0.15);
    return `<svg viewBox="0 0 ${W.toFixed(2)} ${H.toFixed(2)}" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block;font-family:${FONT}">
      <style>@keyframes hvss{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}</style>
      <rect x="0" y="0" width="${W}" height="${H}" fill="${color}"/>
      ${num('12', cx, cy - 25)}${num('9', cx - dx, cy + 1)}${num('3', cx + dx, cy + 1)}${num('6', cx + 2, cy + 27)}
      <text x="5" y="${(H - 6).toFixed(2)}" fill="#0B0B0C" font-size="4.6" font-weight="700" letter-spacing="0.2">${esc(wd)} ${d.getDate()}</text>
      <g style="filter:drop-shadow(0 0.4px 0.8px rgba(0,0,0,0.35))">${hand(25, 3.2, 43200)}${hand(39, 3.2, 3600)}</g>
      <g style="${spin(60)}"><line x1="${cx}" y1="${cy + 8}" x2="${cx}" y2="3" stroke="#FFF" stroke-width="0.45" stroke-linecap="round"/></g>
      <circle cx="${cx}" cy="${cy}" r="2.1" fill="#FFF"/><circle cx="${cx}" cy="${cy}" r="0.9" fill="${color}"/></svg>`;
  };
  const hide = () => {
    if (!el) return;
    el.remove(); el = null; clearInterval(minute); minute = null; wake();
  };
  const show = () => {
    if (el) return;
    el = document.createElement('div');
    el.id = 'homeview-screensaver';
    el.style.cssText = 'position:fixed;inset:0;z-index:2147483000;opacity:0;transition:opacity 2s;cursor:none;touch-action:none';
    el.innerHTML = clockSvg();
    // the touch that closes it must not press what's underneath
    const close = (e) => { e.preventDefault(); e.stopPropagation(); blockUntil = now() + 700; hide(); };
    el.addEventListener('pointerdown', close, { capture: true });
    el.addEventListener('touchstart', close, { capture: true, passive: false });
    document.body.appendChild(el);
    requestAnimationFrame(() => { if (el) el.style.opacity = '1'; });
    minute = setInterval(() => { if (el) el.innerHTML = clockSvg(); }, 60e3);   // the date; the hands run by themselves
  };
  // anything the person does counts as activity; right after closing, swallow the rest of that touch
  const swallow = (e) => { if (now() < blockUntil) { e.preventDefault(); e.stopPropagation(); } };
  let bound = false;
  const bind = () => {
    if (bound) return; bound = true;
    for (const ev of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']) window.addEventListener(ev, wake, { capture: true, passive: true });
    for (const ev of ['click', 'pointerup', 'touchend', 'mouseup']) window.addEventListener(ev, swallow, { capture: true });
    document.addEventListener('visibilitychange', wake);
  };
  const tick = () => {
    if (!enabled || el || document.visibilityState !== 'visible') return;
    if (now() - last >= idleMs) show();
  };
  return {
    /** page: the HomeView page on screen (null = none). */
    update(page) {
      const o = page?.isConnected ? page._config?.options || {} : null;
      const opt = o ? (o.screensaver ?? 'auto') : false;
      const pageId = page?._config?.path || page?._config?.page;
      const obj = opt && typeof opt === 'object' ? opt : {};
      const tablet = (navigator.maxTouchPoints || 0) > 0 && Math.min(screen.width, screen.height) >= 600;
      const on = !!o && opt !== false && obj.enabled !== false && (opt === 'auto' ? tablet : true)
        && !page._editing && (obj.pages ? asList(obj.pages).includes(pageId) : pageId !== 'cameras');
      idleMs = Math.max(10, num(obj.idle) ?? 120) * 1000;
      color = typeof obj.color === 'string' ? obj.color : '#4D7DB8';
      if (on && !enabled) wake();
      enabled = on;
      if (!on) hide();
      if (on) { bind(); if (!timer) timer = setInterval(tick, 2000); }
      else if (timer) { clearInterval(timer); timer = null; }
    },
  };
})();

function openHaSidebar() {
  setTimeout(() => {
    const main = document.querySelector('home-assistant')?.shadowRoot?.querySelector('home-assistant-main');
    const drawer = main?.shadowRoot?.querySelector('ha-drawer');
    if (drawer && drawer.type === 'modal' && !drawer.open) {
      main.dispatchEvent(new CustomEvent('hass-toggle-menu', { detail: { open: true }, bubbles: true, composed: true }));
    }
  }, 150);
}
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

// Pages are built one by one as you swipe, each from the same entities / areas / devices and the
// same settings: build the model once and share it (rebuilt when any of those change)
let _modelCache = null;
function sharedModel(hass, cfg) {
  const c = _modelCache;
  const n = hvStateCount(hass);
  if (c && c.cfg === cfg && c.ents === hass.entities && c.areas === hass.areas && c.devs === hass.devices && c.n === n && c.floors === hass.floors) return c.model;
  const model = buildModel(hass, cfg);
  _modelCache = { cfg, ents: hass.entities, areas: hass.areas, devs: hass.devices, floors: hass.floors, n, model };
  return model;
}
// how many states there are (entities added / removed): counted at most once a second — every state
// change sends a new hass, and counting a thousand keys each time adds up
let _stateCount = { states: null, n: 0, at: 0 };
function hvStateCount(hass) {
  const sc = _stateCount;
  if (sc.states !== hass.states && Date.now() - sc.at > 1000) { sc.states = hass.states; sc.n = Object.keys(hass.states).length; sc.at = Date.now(); }
  return sc.n;
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

  // A device's indicator light is not a room light: a switch's status LED, a speaker's LED ring.
  // Name says LED / indicator / status / ring (not a strip / tape / bar / panel) and the device
  // also has a real load (another light, a switch, a fan, a speaker …). Shown under Devices on its
  // room's page, left out of the Lights tiles, the lights-on pill and a room's on-count.
  const byDevice = {};
  for (const [eid, r] of Object.entries(hass.entities || {})) if (r.device_id) (byDevice[r.device_id] = byDevice[r.device_id] || []).push(eid);
  const LOADS = ['light', 'switch', 'fan', 'media_player', 'humidifier', 'climate', 'assist_satellite', 'cover', 'lock', 'vacuum'];
  const indicatorLight = (id) => {
    const nm = `${id.split('.')[1]} ${hass.states[id]?.attributes?.friendly_name || ''}`;
    if (!/(^|[\s_.-])(led|leds|indicator|status|ring)([\s_.-]|$)/i.test(nm) || /strip|tape|bar|panel|bulb/i.test(nm)) return false;
    const dev = hass.entities?.[id]?.device_id;
    return !!dev && (byDevice[dev] || []).some((o) => o !== id && LOADS.includes(domainOf(o)) && !hass.entities?.[o]?.entity_category);
  };
  model.indicatorLights = [];

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
    const indicator = d === 'light' && indicatorLight(id);
    if (indicator) model.indicatorLights.push(id);
    if (d === 'light' && !indicator && !Array.isArray(st.attributes.entity_id)) model.lights.push(id);   // not light groups
    if (d === 'binary_sensor' && OPENING_CLASSES.includes(dc)) model.openings.push(id);
    if (d === 'cover' && ['garage', 'door', 'gate'].includes(dc)) model.openings.push(id);
    if (d === 'binary_sensor' && SAFETY_CLASSES.includes(dc)) model.safety.push(id);
    if (d === 'person' && asList(st.attributes.device_trackers).length && !UNAVAILABLE.includes(st.state)) model.persons.push(id);   // real people with a location
    if (d === 'camera') model.cameras.push(id);
    if (d === 'calendar') model.calendars.push(id);

    const room = model.areaById[entityArea(hass, id)];
    if (!room) continue;
    room.entities.push(id);
    const g = indicator ? ROOM_GROUPS.find((x) => x.id === 'devices') : ROOM_GROUPS.find((x) => x.domains.includes(d));
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
    // a hidden entity (exclude_entities / customize.hidden) leaves a room's own list too
    if (order) room.pinned = asList(order).filter((id) => hass.states[id] && !exclude.has(id));
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
  // comfort: each room's thermostat (its own climate entity, else the house's) and the options
  const climates = Object.keys(hass.states).filter((id) => domainOf(id) === 'climate' && !exclude.has(id)
    && !UNAVAILABLE.includes(hass.states[id].state));
  const hasSet = (id) => { const a = hass.states[id]?.attributes || {}; return a.target_temp_low != null || a.temperature != null; };
  const house = cfg.comfort_thermostat || climates.find(hasSet) || null;
  for (const r of model.areas) r.thermostat = r.entities.find((id) => domainOf(id) === 'climate' && hasSet(id)) || house;
  HV_COMFORT = { mode: cfg.comfort ?? 'thermostat', margin: cfg.comfort_margin, limits: cfg.comfort_limits || {} };
  return model;
}

/* ============================================================================================
 * Entity state helpers
 * ========================================================================================== */

function isActive(st) {
  if (!st || UNAVAILABLE.includes(st.state)) return false;
  const s = st.state;
  switch (domainOf(st.entity_id)) {
    // a thermostat is "working" while it heats / cools … (hvac_action), not just because a mode is
    // set: heat_cool + idle is not on. Without hvac_action: any mode but off, as before
    case 'climate':
      if (st.attributes?.hvac_action !== undefined && st.attributes.hvac_action !== null) {
        return ['heating', 'cooling', 'drying', 'fan', 'preheating', 'defrosting'].includes(st.attributes.hvac_action);
      }
      return s !== 'off';
    case 'water_heater': case 'humidifier': return s !== 'off';
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
/**
 * One colour code everywhere (chips, pills, tiles, popups), as on a hand-made HomeView:
 *   green  ok      secured / safe: locked, closed, water on, no leak, batteries fine
 *   amber  warn    needs a look: offline (never shown as fine), arming, moving, getting low, heating
 *   red    alert   act now: unlocked, open, leak, water off, triggered (chips / pills: filled red)
 *   red    armed   the alarm is live (a red icon, not a filled chip)
 *   orange on      on / in use: lights, power drawn, media playing
 *   blue   cool    climate: cooling, fans
 */
const HV_TONES = { ok: '#34C759', warn: '#FF9500', alert: '#FF3B30', armed: '#FF3B30', on: '#FF9F0A', cool: '#56BDE1', heat: '#FF9500' };

/** The tone of a security-type entity (lock, garage / door / gate, water valve, door / window / leak
 *  sensor, alarm), or null for anything else. */
function secureTone(st) {
  if (!st) return null;
  const id = st.entity_id, d = domainOf(id), dc = st.attributes.device_class, s = st.state;
  const kind = d === 'lock' ? 'lock' : d === 'alarm_control_panel' ? 'alarm'
    : d === 'cover' && ['garage', 'door', 'gate'].includes(dc) ? 'cover' : isWaterValve(id) ? 'valve'
      : d === 'binary_sensor' && (OPENING_CLASSES.includes(dc) || SAFETY_CLASSES.includes(dc)) ? 'sensor' : null;
  if (!kind) return null;
  if (UNAVAILABLE.includes(s)) return 'warn';
  if (kind === 'alarm') return s === 'triggered' ? 'alert' : ['arming', 'pending', 'disarming'].includes(s) ? 'warn' : s.startsWith('armed') ? 'armed' : null;
  if (kind === 'lock') return s === 'locked' ? 'ok' : ['locking', 'unlocking'].includes(s) ? 'warn' : 'alert';
  if (kind === 'cover') return s === 'closed' ? 'ok' : ['opening', 'closing'].includes(s) ? 'warn' : 'alert';
  if (kind === 'valve') return waterOff(st) ? 'alert' : 'ok';
  return s === 'on' ? 'alert' : 'ok';
}

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
  if (isAlert(st)) return HV_TONES.alert;
  if (d === 'light') {
    if (Array.isArray(a.rgb_color)) {
      const [r, g, b] = a.rgb_color;
      if (!(r > 235 && g > 235 && b > 235)) return `rgb(${r},${g},${b})`;
    }
    return '#FF9F0A';
  }
  if (d === 'climate') {
    if (a.hvac_action === 'cooling' || st.state === 'cool') return HV_TONES.cool;
    if (a.hvac_action === 'heating' || st.state === 'heat') return HV_TONES.heat;
    return HV_TONES.cool;
  }
  if (d === 'media_player') return '#AF52DE';
  if (d === 'fan' || d === 'humidifier') return HV_TONES.cool;
  if (d === 'person') return HV_TONES.ok;
  return HV_TONES.on;   // switches, fans … on: the one "on" colour on every page
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

/**
 * UI edits on a YAML dashboard (custom_pages from files, everything else editable): HA can't save a
 * YAML dashboard, so HomeView keeps the settings changed in edit mode / Settings in a hidden UI
 * dashboard next to it, "<dashboard>-edits", and lays them over the YAML when it builds the views.
 * Only top-level keys that differ from the YAML are kept (null = removed); custom_pages always comes
 * from the YAML. Option ui_edits: false = the old way (show the YAML to paste).
 */
const editsPath = () => `${dashboardPath() || 'homeview'}-edits`;
const isYamlDash = (hass) => hass?.panels?.[dashboardPath() || 'lovelace']?.config?.mode === 'yaml';
async function loadEdits(hass, path = editsPath()) {
  try {
    const c = await ws(hass, { type: 'lovelace/config', url_path: path });
    return c?.homeview && typeof c.homeview === 'object' ? c.homeview : {};
  } catch (e) { return {}; }   // none yet
}
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
// an edit to a block (customize, rooms, home, pages_config …) is kept per entry: { __edits: { key: value | null } }
function applyEdits(options, edits) {
  const out = { ...options };
  for (const [k, v] of Object.entries(edits || {})) {
    if (k === 'custom_pages' || k === 'type') continue;
    if (v === null) delete out[k];
    else if (isObj(v) && isObj(v.__edits)) {
      const blk = isObj(out[k]) ? { ...out[k] } : {};
      for (const [kk, vv] of Object.entries(v.__edits)) { if (vv === null) delete blk[kk]; else blk[kk] = vv; }
      out[k] = blk;
    } else out[k] = v;
  }
  return out;
}
/** What `next` changes against `base`, per top-level key and per entry of a block (applyEdits' format). */
function diffOptions(base, next) {
  const edits = {};
  const keys = new Set([...Object.keys(base || {}), ...Object.keys(next)]);
  for (const k of keys) {
    if (k === 'custom_pages' || k === 'type') continue;
    const y = base?.[k], n = next[k];
    if (JSON.stringify(y ?? null) === JSON.stringify(n ?? null)) continue;
    if (isObj(y) && isObj(n)) {   // a block: only the entries that changed
      const sub = {};
      for (const kk of new Set([...Object.keys(y), ...Object.keys(n)])) {
        if (JSON.stringify(y[kk] ?? null) !== JSON.stringify(n[kk] ?? null)) sub[kk] = n[kk] === undefined ? null : n[kk];
      }
      edits[k] = { __edits: sub };
    } else edits[k] = n === undefined ? null : n;
  }
  return edits;
}
/**
 * from: <dashboard> — this dashboard shows another HomeView dashboard's settings and pages (its
 * YAML, page files and UI edits, read when the dashboard loads), e.g. a test or kiosk copy. Its
 * own changes (edit mode, Settings) are kept in its strategy as `edits:` (the companion format), so
 * they never touch the other dashboard.
 */
async function loadSourceOptions(hass, from) {
  const src = await loadStrategyConfig(hass, from);
  const { type: _t, from: _f, ...o } = src?.strategy || {};
  const yaml = hass?.panels?.[from]?.config?.mode === 'yaml';
  return yaml && o.ui_edits !== false ? applyEdits(o, await loadEdits(hass, `${from}-edits`)) : o;
}
async function resolveFrom(hass, strat) {
  const { from, edits, ...own } = strat;
  const src = await loadSourceOptions(hass, from);
  return { src, merged: applyEdits({ ...src, ...own }, edits) };
}
async function saveEdits(hass, yamlOptions, next) {
  const edits = diffOptions(yamlOptions, next);
  const url = editsPath();
  const save = () => ws(hass, { type: 'lovelace/config/save', url_path: url,
    config: { title: 'HomeView edits', views: [], homeview: edits } });
  try { await save(); } catch (e) {
    // first save: make the companion dashboard (out of the sidebar), then save again
    await ws(hass, { type: 'lovelace/dashboards/create', url_path: url, title: 'HomeView edits', mode: 'storage',
      icon: 'mdi:pencil-box-outline', show_in_sidebar: false, require_admin: true });
    await save();
  }
}

async function loadStrategyConfig(hass, path = dashboardPath()) {
  try {
    const cur = await ws(hass, { type: 'lovelace/config', url_path: path });
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
  // from: <dashboard> — the change goes into this dashboard's own `edits:`, against the source
  if (cur?.strategy?.from) {
    const { type: t, ...strat } = cur.strategy;
    const { src, merged } = await resolveFrom(hass, strat);
    const base = JSON.parse(JSON.stringify(merged));
    mutate(base);
    const next = cleanConfig(base);
    delete next.type; delete next.from; delete next.edits;
    const edits = diffOptions(src, next);
    const strategy = { type: t, from: strat.from, ...(Object.keys(edits).length ? { edits } : {}) };
    try {
      await ws(hass, { type: 'lovelace/config/save', url_path: dashboardPath(), config: { ...cur, strategy } });
      return { ok: true, config: { type: t, ...next } };
    } catch (e) {
      console.warn('HomeView: could not save the dashboard', e);
      return { ok: false, config: { type: t, ...next }, error: e };
    }
  }
  // a YAML dashboard: edit the YAML + the UI edits, save the difference to "<dashboard>-edits"
  if (cur?.strategy && isYamlDash(hass) && cur.strategy.ui_edits !== false) {
    const { type: _t, ...yamlOpts } = cur.strategy;
    const merged = applyEdits(yamlOpts, await loadEdits(hass));
    const base = JSON.parse(JSON.stringify({ type: 'custom:homeview', ...merged }));
    mutate(base);
    const next = cleanConfig(base);
    next.type = 'custom:homeview';
    try {
      await saveEdits(hass, yamlOpts, next);
      // the YAML dashboard rebuilds its views with the new edits (every open screen follows)
      HomeViewPage._current?.dispatchEvent(new CustomEvent('config-refresh', { bubbles: true, composed: true }));
      return { ok: true, config: next };
    } catch (e) {
      console.warn('HomeView: could not save the UI edits', e);
      return { ok: false, config: next, error: e };
    }
  }
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
@keyframes hv-alert-pulse { 0%, 100% { box-shadow:0 0 0 0 rgba(255,59,48,.55); } 50% { box-shadow:0 0 0 8px rgba(255,59,48,0); } }
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
/* the Widgets board's Up next: natural height (centred in its area), the board's text size */
.ag-list.ag-bare { flex:none !important; overflow:visible; }
.ag-rows { display:flex; flex-direction:column; gap:8px; margin-top:12px; }
.ag-row { display:flex; align-items:center; gap:12px; padding:11px 14px; border-radius:16px; background:color-mix(in srgb, var(--hv-fg) 5%, transparent); }
.ag-row.on { background:color-mix(in srgb, #34C759 16%, transparent); box-shadow:inset 0 0 0 1.5px #34C759; }
.ag-t { flex:1; min-width:0; display:flex; flex-direction:column; }
.ag-t b { font-weight:650; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ag-t span, .ag-n { color:var(--hv-fg2); font-size:.92em; }
.ag-n { flex:none; font-weight:600; display:flex; flex-direction:column; align-items:flex-end; }
.ag-n span { font-weight:500; font-size:.9em; }
.ag-list.ag-bare .sb, .ag-list.ag-bare .up { font-size:inherit; }
.edit { position:absolute; inset:0; border-radius:var(--hv-radius, 22px); outline:2px dashed var(--hv-accent); outline-offset:-2px;
  display:flex; flex-wrap:wrap; align-content:flex-start; justify-content:flex-end; gap:5px; padding:7px; pointer-events:none; z-index:2;
  animation:hv-wiggle .35s ease-in-out infinite alternate; }
@keyframes hv-wiggle { from { transform:rotate(-.4deg); } to { transform:rotate(.4deg); } }
.edit button { all:unset; pointer-events:auto; cursor:pointer; width:30px; height:30px; border-radius:50%; background:rgba(20,20,20,.62);
  color:#fff; display:flex; align-items:center; justify-content:center; --mdc-icon-size:17px; backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); }
.edit button[data-edit=unfav] { background:#FF9F0A; }
.edit.rowed { align-content:center; padding:0 12px; }
.t.bare { background:transparent; border:none; box-shadow:none; }
/* pills (layout: pills / keypad) */
.t.pl { height:auto; min-height:40px; display:flex; flex-direction:row; align-items:center; justify-content:center; gap:7px; padding:9px 14px;
  border-radius:999px; background:var(--hv-pill, var(--hv-tile)); border:none; box-shadow:none; font-size:14.5px; white-space:nowrap; cursor:pointer; }
.t.pl .ic { --mdc-icon-size:20px; color:var(--hv-fg2); display:flex; }
.t.pl b { font-weight:650; }
.t.pl .pv { color:var(--hv-fg2); font-weight:500; }
.t.pl.on { background:color-mix(in srgb, var(--pc) 22%, var(--hv-tile)); }
.t.pl.on .ic, .t.pl.dim .ic { color:var(--pc); }
.t.pl.dim { box-shadow:inset 0 0 0 1.5px var(--pc); }
.t.pl.io { height:100%; border-radius:18px; padding:0; }
.t.pl.io .ic { --mdc-icon-size:24px; color:var(--hv-fg); }
.t.pl.io.on .ic { color:var(--pc); }
.t.pl.na { opacity:.55; }
.t.gap { background:transparent; border:none; box-shadow:none; cursor:default; }
/* faders */
.t.fader { height:100%; display:flex; flex-direction:row; align-items:center; justify-content:flex-start; text-align:left; gap:12px; padding:6px 8px; border-radius:999px; cursor:default; }
.fd-ic { flex:none; width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer;
  --mdc-icon-size:20px; color:var(--fc); background:color-mix(in srgb, var(--fc) 18%, transparent); }
.fd-tx { flex:0 0 34%; min-width:0; display:flex; flex-direction:column; line-height:1.25; }
.fd-tx b { font-size:14.5px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.fd-tx span { font-size:12.5px; color:var(--hv-fg2); font-variant-numeric:tabular-nums; }
.fd-bar { position:relative; flex:1; height:36px; border-radius:10px; overflow:hidden; cursor:pointer; touch-action:none;
  background:color-mix(in srgb, var(--fc) 22%, transparent); }
.fd-fill { position:absolute; inset:0 auto 0 0; background:var(--fc); border-radius:10px 0 0 10px; }
.fd-m { position:absolute; top:4px; right:6px; font-size:10px; font-weight:700; letter-spacing:.05em; padding:2px 7px; border-radius:999px;
  background:color-mix(in srgb, var(--hv-fg) 30%, transparent); color:#fff; }
.t.fader.muted { opacity:.6; }
.t.fader.muted .fd-ic, .t.fader.muted .fd-fill { filter:grayscale(1); }
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
@container (max-width:300px) {
.t.card.cw { padding:10px 12px; }
.t.card.cw .hd { align-items:flex-start; line-height:1.2; font-size:11.5px; letter-spacing:.03em; }
.t.card.cw .hd .ic { --mdc-icon-size:16px !important; }
.t.card.cw .big { font-size:26px; line-height:1.1; margin:4px 0 2px; }
.t.card.cw .sb { font-size:12.5px; line-height:1.3; margin:0; }
}
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
.live.stale { color:${HV_TONES.warn}; }
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

/** The icon elements a redraw is about to replace, by what they show: fillIcons reuses them.
 *  A tile redraws on every change of its entity and the header on every pill change; a new
 *  ha-icon looks its icon up again (async, HA's icon store) each time, a reused one doesn't. */
function iconPool(root) {
  const pool = new Map();
  root.querySelectorAll?.('[data-hvk]').forEach((el) => { const k = el.dataset.hvk; if (!pool.has(k)) pool.set(k, []); pool.get(k).push(el); });
  return pool;
}
/** Replace <i data-e="entity"> / <i data-i="mdi:x"> placeholders with HA's icon elements
 *  (from `pool`, the previous draw's, when one shows the same thing). */
function fillIcons(root, hass, pool) {
  root.querySelectorAll('i[data-e], i[data-i]').forEach((ph) => {
    const ent = ph.dataset.e, ic = ph.dataset.i || '';
    const k = `${ent || ''}|${ic}`;
    let el = pool?.get(k)?.pop();
    if (el) {
      if (el.localName === 'ha-state-icon') { el.hass = hass; el.stateObj = hass.states[ent]; }
    } else if (ent && customElements.get('ha-state-icon')) {
      el = document.createElement('ha-state-icon');
      el.hass = hass; el.stateObj = hass.states[ent];
      if (ic) el.icon = ic;
    } else {
      el = document.createElement('ha-icon');
      el.icon = ic || hass.states[ent]?.attributes?.icon || 'mdi:help-circle-outline';
    }
    el.dataset.hvk = k;
    ph.replaceWith(el);
  });
}

/* ============================================================================================
 * Tile renderers. Each: key(hass, spec) -> string (re-render only when it changes),
 * html(hass, spec, tile) -> markup. Optional: tick (ms), action(hass, spec, tile, 'tap'|'hold').
 * ========================================================================================== */

const R = {};

// ---- any entity --------------------------------------------------------------------------
R.add = {
  key: () => 'add',
  html: () => `<div class="t flex add" data-edit="add" style="border:1.5px dashed var(--hv-line);background:transparent;cursor:pointer">
    <div class="ic" style="color:var(--hv-accent)"><i data-i="mdi:plus"></i></div><div class="tx"><div class="nm">Add</div><div class="sb">a tile here</div></div></div>`,
};
// ---- power, pills, buttons, faders (custom pages) -------------------------------------------
/** How many devices the Energy settings track (cached a few minutes). */
function energyDeviceCount(hass) {
  return new Promise((resolve) => {
    const v = cached('energy-device-count', 5 * 60e3, async () => {
      const p = await ws(hass, { type: 'energy/get_prefs' });
      return (p?.device_consumption || []).length;
    }, () => resolve(cached('energy-device-count', 5 * 60e3, async () => null)));
    if (v !== undefined) resolve(v);
  });
}
/** A power sensor's value in W (W / kW / MW), or null. */
function toWatts(st) {
  const v = num(st?.state);
  if (v === null) return null;
  const u = String(st.attributes?.unit_of_measurement || 'W').toLowerCase();
  return v * ({ w: 1, kw: 1000, mw: 1e6 }[u] ?? 1);
}
/** 720 -> "0.72 kW", 2 -> "0.002 kW", 1015 -> "1.02 kW" */
const fmtKw = (w) => { const k = w / 1000; return `${numFmt(k < 0.01 ? 3 : 2).format(k)} kW`; };
const NAMED_TONES = () => ({ green: HV_TONES.ok, amber: HV_TONES.warn, red: HV_TONES.alert, orange: HV_TONES.on, blue: HV_TONES.cool });
const toneColor = (c) => (c ? NAMED_TONES()[c] || HV_TONES[c] || c : null);
/** A pill-shaped tile (layout: pills / keypad): icon, name and (info pills) the state. */
function pillHtml({ icon, entity, name, value, color, active, dim, iconOnly, na }) {
  const c = color || 'var(--hv-accent)';
  return `<div class="t pl${active ? ' on' : ''}${dim ? ' dim' : ''}${iconOnly ? ' io' : ''}${na ? ' na' : ''}" style="--pc:${esc(c)}">
    <span class="ic">${entity ? `<i data-e="${esc(entity)}"${icon ? ` data-i="${esc(icon)}"` : ''}></i>` : `<i data-i="${esc(icon || 'mdi:circle-small')}"></i>`}</span>${iconOnly ? '' : `<b>${esc(name || '')}</b>`}${value !== undefined && !iconOnly ? `<span class="pv">${esc(value)}</span>` : ''}</div>`;
}
function entityPillTile(h, s) {
  const st = h.states[s.entity];
  if (!st) return pillHtml({ icon: 'mdi:help-circle-outline', name: s.name || s.entity, value: 'Not found', na: true });
  const d = domainOf(s.entity), na = UNAVAILABLE.includes(st.state);
  const info = ['sensor', 'binary_sensor', 'weather', 'sun', 'input_number', 'number', 'input_select', 'select', 'input_text'].includes(d);
  const on = isActive(st);
  const icon = (on ? s.icon_on : s.icon_off) || s.icon || null;   // none: the entity's own (data-e)
  const name = (!on && s.name_off) || s.name || shortName(h, s.entity, s.areaName);
  const w = s.unit && ['w', 'kw'].includes(String(s.unit).toLowerCase()) ? toWatts(st) : null;   // unit: kW
  const value = w !== null ? (String(s.unit).toLowerCase() === 'kw' ? fmtKw(w) : `${fmt(w, 0)} W`) : stateText(h, st);
  return pillHtml({ icon, entity: s.entity, name, value: info ? value : undefined, color: toneColor(s.color) || activeColor(st), active: !info && on, iconOnly: s.iconOnly, na });
}
// type: button — a pill that runs an action: { type: button, name, icon, color, action: script.x |
// domain.service, data, target, toggle: entity (tap toggles it, lit while on), watch + when (lit while
// that entity is in that state; attribute: watch one of its attributes), dim (a lit pill shows only an outline while this entity is off),
// name_off / icon_off (while not lit), confirm, hold: a page | { action, data, target } }
R.button = {
  key: (h, s) => [s.watch, s.toggle, s.dim].map((id) => (id ? h.states[id]?.state ?? '' : '')).join('|') + (s.attribute ? `|${h.states[s.watch]?.attributes?.[s.attribute]}` : ''),
  lit(h, s) {
    // attribute: source — watch an attribute of `watch` (a TV's source …) instead of its state
    if (s.watch) return asList(s.when ?? 'on').map(String).includes(String(s.attribute ? h.states[s.watch]?.attributes?.[s.attribute] : h.states[s.watch]?.state));
    if (s.toggle) return isActive(h.states[s.toggle]);
    return false;
  },
  html(h, s) {
    const lit = R.button.lit(h, s);
    const dim = lit && s.dim && h.states[s.dim]?.state !== 'on';
    const icon = (!lit && s.icon_off) || s.icon || 'mdi:gesture-tap-button';
    const name = (!lit && s.name_off) || s.name || '';
    if (!s.pillish) {
      return `<div class="t flex${lit ? ' on' : ''}" style="--hv-ic-on:${esc(toneColor(s.color) || 'var(--hv-accent)')}"><div class="ic"><i data-i="${esc(icon)}"></i></div>
        <div class="tx"><div class="nm">${esc(name)}</div></div></div>`;
    }
    return pillHtml({ icon, name, color: toneColor(s.color), active: lit && !dim, dim, iconOnly: s.iconOnly });
  },
  action(h, s, tile, kind) {
    if (kind === 'hold') {
      const hd = s.hold;
      if (hd && typeof hd === 'object' && hd.action) return callAction(h, hd.action, hd.data, hd.target);
      const id = s.toggle || s.watch;
      return id ? moreInfo(tile, id) : null;
    }
    if (s.confirm && !window.confirm(`${s.name || 'Run this'}?`)) return null;
    if (s.action) return callAction(h, s.action, s.data, s.target);
    if (s.toggle) return h.callService('homeassistant', 'toggle', {}, { entity_id: s.toggle });
    return null;
  },
};
/** "script.x" / "light.turn_on" with data and a target (entity id(s) or { entity_id, area_id … }) */
function callAction(h, action, data, target) {
  const [dom, svc] = String(action).split('.');
  if (!dom || !svc) return null;
  const tg = target ? (typeof target === 'object' && !Array.isArray(target) ? target : { entity_id: target }) : undefined;
  return h.callService(dom, svc, data || {}, tg);
}
// an empty cell (keypad layouts: '.')
R.gap = { key: () => 'gap', html: () => '<div class="t gap"></div>' };
// type: fader — { type: fader, entity: input_number.x | number.x, mute: input_boolean.x, name, icon,
// color }: slide the bar to set the level, tap the icon to mute / unmute (greyed, MUTED, while muted)
R.fader = {
  key: (h, s) => `${h.states[s.entity]?.state}|${s.mute ? h.states[s.mute]?.state : ''}`,
  html(h, s) {
    const st = h.states[s.entity];
    const a = st?.attributes || {};
    const v = num(st?.state), min = Number(a.min ?? 0), max = Number(a.max ?? 100);
    const pct = v === null ? 0 : clamp(((v - min) / ((max - min) || 1)) * 100, 0, 100);
    const muted = !!s.mute && h.states[s.mute]?.state === 'on';
    const unit = a.unit_of_measurement || '';
    return `<div class="t fader${muted ? ' muted' : ''}${!st ? ' na' : ''}" style="--fc:${esc(toneColor(s.color) || 'var(--hv-accent)')}">
      <span class="fd-ic" data-act="mute" title="${muted ? 'Unmute' : 'Mute'}"><i data-i="${esc(s.icon || 'mdi:tune-vertical-variant')}"></i></span>
      <span class="fd-tx"><b>${esc(s.name || a.friendly_name || s.entity)}</b><span>${v === null ? '—' : `${fmt(v, Number.isInteger(v) ? 0 : 1)}${unit}`}</span></span>
      <span class="fd-bar" data-act="bar"><span class="fd-fill" style="width:${pct}%"></span>${muted ? '<span class="fd-m">MUTED</span>' : ''}</span></div>`;
  },
  // the bar: drag (or tap) sets the level, sent once on release
  update(h, s, tile) {
    const bar = tile.shadowRoot?.querySelector('.fd-bar');
    if (!bar || bar._hv) return;
    bar._hv = true;
    const st = () => (hvHass || h).states[s.entity];
    const valAt = (x) => {
      const r = bar.getBoundingClientRect(), a = st()?.attributes || {};
      const min = Number(a.min ?? 0), max = Number(a.max ?? 100), step = Number(a.step ?? 1) || 1;
      const v = min + clamp((x - r.left) / r.width, 0, 1) * (max - min);
      return Math.round(v / step) * step;
    };
    bar.addEventListener('pointerdown', (e) => {
      if (e.button > 0) return;
      e.stopPropagation(); e.preventDefault();
      bar.setPointerCapture?.(e.pointerId);
      const fill = bar.querySelector('.fd-fill'), a = st()?.attributes || {};
      const min = Number(a.min ?? 0), max = Number(a.max ?? 100);
      let v = valAt(e.clientX);
      const show = () => { fill.style.width = `${clamp(((v - min) / ((max - min) || 1)) * 100, 0, 100)}%`; };
      show();
      const move = (ev) => { v = valAt(ev.clientX); show(); };
      const up = () => {
        bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); bar.removeEventListener('pointercancel', up);
        const dom = domainOf(s.entity);
        (hvHass || h).callService(dom === 'number' ? 'number' : 'input_number', 'set_value', { value: v }, { entity_id: s.entity });
      };
      bar.addEventListener('pointermove', move); bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
    });
  },
  action(h, s, tile, kind, ev) {
    if (kind === 'hold') return moreInfo(tile, s.entity);
    if (ev?.target?.closest?.('[data-act]')?.dataset?.act === 'mute' && s.mute) return h.callService('homeassistant', 'toggle', {}, { entity_id: s.mute });
    return null;
  },
};

R.entity = {
  key: (h, s) => { const st = h.states[s.entity]; return (st ? st.last_updated + st.state + (st.attributes.brightness || '') : 'x') + (s.power ? `|${h.states[s.power]?.state}` : ''); },
  html(h, s) {
    if (s.pillish) return entityPillTile(h, s);
    const st = h.states[s.entity];
    if (!st) return `<div class="t na"><div class="ic"><i data-i="mdi:help-circle-outline"></i></div><div class="tx"><div class="nm">${esc(s.name || s.entity)}</div><div class="sb">Not found</div></div></div>`;
    const on = isActive(st), alert = isAlert(st), na = UNAVAILABLE.includes(st.state);
    const d = domainOf(s.entity);
    const name = s.name || shortName(h, s.entity, s.areaName);
    let sub = s.sub !== undefined ? s.sub : (s.showRoom && s.areaName ? s.areaName : stateText(h, st));
    if (s.showRoom && (d === 'climate' || d === 'media_player' || d === 'cover')) sub = stateText(h, st);
    // power: sensor.x — "On · 0.72 kW" while it draws power
    if (s.power && s.sub === undefined) { const w = toWatts(h.states[s.power]); sub = stateText(h, st) + (w !== null && w >= 1 ? ` · ${fmtKw(w)}` : ''); }
    // a sensor that isn't reporting: its name, and a dash
    if (d === 'sensor' && !s.sub && na) {
      return `<div class="t flex na"><div class="ic"><i data-e="${esc(s.entity)}"${s.icon ? ` data-i="${esc(s.icon)}"` : ''}></i></div>
        <div class="tx"><div class="nm">${esc(name)}</div><div class="sb">—</div></div></div>`;
    }
    if (d === 'sensor' && !s.sub) {
      return `<div class="t flex${na ? ' na' : ''}"><div class="ic"><i data-e="${esc(s.entity)}"></i></div>
        <div class="tx"><div class="nm">${esc(stateText(h, st))}</div><div class="sb">${esc(name)}</div></div></div>`;
    }
    const tone = secureTone(st);
    if (s.icon_on || s.icon_off) s = { ...s, icon: (on || st.state === 'open' ? s.icon_on : s.icon_off) || s.icon };   // icon_on / icon_off
    // color_on / color_off: the icon's colour by state — green / amber / red / orange / blue (the colour code) or any CSS colour
    const named = { green: HV_TONES.ok, amber: HV_TONES.warn, red: HV_TONES.alert, orange: HV_TONES.on, blue: HV_TONES.cool };
    const pick = on || st.state === 'open' ? s.color_on : s.color_off;
    const own = pick ? named[pick] || HV_TONES[pick] || pick : null;
    if (own) return `<div class="t flex${on ? ' on' : ''}${na ? ' na' : ''}" style="--hv-ic-on:${esc(own)}">
      <div class="ic" style="color:${esc(own)}"><i data-e="${esc(s.entity)}"${s.icon ? ` data-i="${esc(s.icon)}"` : ''}></i></div>
      <div class="tx"><div class="nm">${esc(name)}</div><div class="sb">${esc(sub)}</div></div></div>`;
    const color = tone ? `style="--hv-ic-on:${HV_TONES[tone]}"` : on || alert ? `style="--hv-ic-on:${activeColor(st)}"` : '';
    let ctl = '';
    if (d === 'climate' && !na && st.state !== 'off' && st.attributes.temperature != null && s.size?.[0] >= 2) {
      ctl = `<div class="ctl"><button data-act="down"><ha-icon icon="mdi:minus"></ha-icon></button><button data-act="up"><ha-icon icon="mdi:plus"></ha-icon></button></div>`;
    }
    return `<div class="t flex${on || alert ? ' on' : ''}${na ? ' na' : ''}" ${color}>
      <div class="ic${alert ? ' alert' : ''}" ${tone ? `style="color:${HV_TONES[tone]}"` : alert ? `style="color:${HV_TONES.alert}"` : ''}><i data-e="${esc(s.entity)}"${s.icon ? ` data-i="${esc(s.icon)}"` : ''}></i></div>
      <div class="tx"><div class="nm">${esc(name)}</div><div class="sb">${esc(sub)}</div></div>${ctl}</div>`;
  },
  async action(h, s, tile, kind, ev) {
    const st = h.states[s.entity];
    if (!st) return;
    // confirm: true — ask before switching (pumps …)
    if (kind === 'tap' && s.confirm && s.tap !== 'more-info' && !window.confirm(`${isActive(st) ? 'Turn off' : 'Turn on'} ${s.name || shortName(h, s.entity)}?`)) return;
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
  const ta = h.states[room.thermostat]?.attributes || {};
  const band = [h.states[room.thermostat]?.state, ta.target_temp_low, ta.target_temp_high, ta.temperature].join('|');
  return { lights, t, hu, unit, alerts, band };
}
/**
 * Comfort words for a room's temperature / humidity, the same on every tile (see comfortOf):
 * Too cold · Cold · Comfy · Warm · Hot, and Too dry · Dry · Comfy · Humid · Too humid.
 * -> { t: {word, color}, h: {word, color}, html } (html = coloured "Comfy · Humid")
 */
let HV_COMFORT = { mode: 'thermostat' };
/**
 * The comfortable band for a room: { lo, hi }. comfort: thermostat (default) follows the room's
 * thermostat (its own, else the house's): heat_cool / auto = its heat setting − margin … its cool
 * setting + margin; heat = setting − margin … the fixed top; cool = the fixed bottom … setting +
 * margin; off / none = fixed. comfort: fixed, or { cold, warm }, sets it by hand. Fixed: 66–77 °F
 * (19–25 °C); margin 1 °F (0.5 °C), comfort_margin to change it.
 */
// a comfort setting: a number, or an entity whose state is one (an input_number / a sensor)
const comfortNum = (h, v) => (typeof v === 'string' && v.includes('.') ? num(h.states[v]?.state) : num(v));

function comfortBand(h, room) {
  const f = /F/.test(h.states[room?.temp]?.attributes?.unit_of_measurement || h.config.unit_system?.temperature || '');
  const C = HV_COMFORT || {};
  const fixed = { lo: f ? 66 : 19, hi: f ? 77 : 25 };
  // comfort: { cold, warm } — numbers or entities (e.g. your own schedule's sensors)
  if (C.mode && typeof C.mode === 'object') return { lo: comfortNum(h, C.mode.cold) ?? fixed.lo, hi: comfortNum(h, C.mode.warm ?? C.mode.hot) ?? fixed.hi };
  if (C.mode === 'fixed') return fixed;
  const st = h.states[room?.thermostat];
  if (!st || UNAVAILABLE.includes(st.state) || st.state === 'off') return fixed;
  const a = st.attributes || {}, m = comfortNum(h, C.margin) ?? (f ? 1 : 0.5);
  const lo = num(a.target_temp_low), hi = num(a.target_temp_high), one = num(a.temperature);
  if (lo !== null && hi !== null) return { lo: lo - m, hi: hi + m };
  if (one !== null && st.state === 'heat') return { lo: one - m, hi: Math.max(fixed.hi, one + m) };
  if (one !== null && st.state === 'cool') return { lo: Math.min(fixed.lo, one - m), hi: one + m };
  if (one !== null) return { lo: one - m, hi: one + m };
  return fixed;
}

/**
 * Comfort grades, as on a hand-made HomeView (one scale, the same words and colours everywhere):
 *   temperature  Too cold · Cold · Comfy · Warm · Hot
 *     Cold below / Warm above: the band above (the thermostat's settings ± margin, or comfort:
 *     { cold, warm }); Too cold below / Hot above: comfort_limits.too_cold / hot (65 / 83 °F,
 *     18 / 28 °C), never closer than 3 °F (1.5 °C) to the band
 *   humidity     Too dry · Dry · Comfy · Humid · Too humid — below 30 / 40 %, above 55 / 65 %
 *     "Comfy" only when both are (shown once); otherwise only what's off: "Warm", "Dry", "Warm · Dry"
 *   comfort_limits: { too_cold, hot, too_dry, dry, humid, too_humid } — numbers or entities
 */
const COMFORT_T = { '-2': ['Too cold', '#007AFF'], '-1': ['Cold', '#32ADE6'], 0: ['Comfy', HV_TONES.ok], 1: ['Warm', HV_TONES.warn], 2: ['Hot', HV_TONES.alert] };
const COMFORT_H = { '-2': ['Too dry', '#A0612B'], '-1': ['Dry', '#C69C3E'], 0: ['Comfy', HV_TONES.ok], 1: ['Humid', '#30B0C7'], 2: ['Too humid', '#5856D6'] };
const comfortGrade = (x, tooLo, lo, hi, tooHi) => (x < tooLo ? -2 : x < lo ? -1 : x > tooHi ? 2 : x > hi ? 1 : 0);
function comfortLimits(h, room) {
  const f = /F/.test(h.states[room?.temp]?.attributes?.unit_of_measurement || h.config.unit_system?.temperature || '');
  const L = HV_COMFORT?.limits || {}, b = comfortBand(h, room), gap = f ? 3 : 1.5;
  const v = (k, d) => comfortNum(h, L[k]) ?? d;
  return { tooCold: Math.min(v('too_cold', f ? 65 : 18), b.lo - gap), lo: b.lo, hi: b.hi, tooHot: Math.max(comfortNum(h, L.hot) ?? v('too_hot', f ? 83 : 28), b.hi + gap),
    tooDry: v('too_dry', 30), dry: v('dry', 40), humid: v('humid', 55), tooHumid: v('too_humid', 65) };
}
function comfortOf(h, room, t, hu) {
  const L = comfortLimits(h, room);
  const tg = t === null ? null : comfortGrade(t, L.tooCold, L.lo, L.hi, L.tooHot);
  const hg = hu === null ? null : comfortGrade(hu, L.tooDry, L.dry, L.humid, L.tooHumid);
  // "Comfy" only when temperature and humidity both are — once (on the temperature); otherwise
  // only the words that are off: "Warm", "Dry", "Warm · Dry"
  const ok = !tg && !hg && (tg !== null || hg !== null);
  const tw = tg ? COMFORT_T[tg] : ok ? COMFORT_T[0] : null;
  const hw = hg ? COMFORT_H[hg] : null;
  const parts = [tw, hw].filter(Boolean);
  return { t: tw ? { word: tw[0], color: tw[1] } : null, h: hw ? { word: hw[0], color: hw[1] } : null,
    text: parts.map((x) => x[0]).join(' · '),
    html: parts.map((x) => `<span style="color:${x[1]}">${x[0]}</span>`).join(' · ') };
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
      const cf = comfortOf(h, r, sum.t, sum.hu);
      // the comfort words in their colours (as on the room tiles), then the lights
      const comfort = [cf.html ? `<span style="font-weight:600">${cf.html}</span>` : '', esc(lightTxt)].filter(Boolean).join(' · ');
      return `<div class="t flex sect${sum.lights ? ' on' : ''}" style="--hv-ic-on:#FF9F0A">
        <div class="circ"><div class="ic" style="--mdc-icon-size:inherit;color:${sum.lights ? '#FF9F0A' : 'var(--hv-accent)'}"><i data-i="${esc(r.icon)}"></i></div>${badge}</div>
        <div class="tx" style="flex:1"><div class="nm">${esc(s.name || r.name)}</div>${comfort ? `<div class="sb">${comfort}</div>` : ''}</div>
        ${climate ? `<div class="rt">${esc(climate)}</div>` : ''}</div>`;
    }
    return `<div class="t${sum.lights ? ' on' : ''}" style="--hv-ic-on:#FF9F0A">
      <div class="circ"><div class="ic" style="--mdc-icon-size:inherit;color:${sum.lights ? '#FF9F0A' : 'var(--hv-accent)'}"><i data-i="${esc(r.icon)}"></i></div>${badge}</div>
      <div class="tx"><div class="nm">${esc(r.name)}</div>
      ${climate ? `<div class="sb">${esc(climate)}</div>` : ''}${(() => { const cf = comfortOf(h, r, sum.t, sum.hu); return cf.html ? `<div class="sb" style="font-weight:600">${cf.html}</div>` : ''; })()}${lightTxt ? `<div class="sb x">${esc(lightTxt)}</div>` : ''}</div></div>`;
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
    const fc = getForecast(h, s.entity, tile.refresher) || [];
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
    const fc = (getForecast(h, s.entity, tile.refresher) || []).slice(0, s.days || 5);
    const [cond, icon] = WEATHER[st?.state] || ['', 'mdi:weather-partly-cloudy'];
    const loc = h.config.location_name || '';
    const rows = fc.map((f) => {
      const d = new Date(f.datetime);
      return `<div style="display:flex;align-items:center;gap:10px;padding:4px 0">
        <span style="width:3.2em;font-weight:600">${esc(d.toLocaleDateString(h.locale?.language, { weekday: 'short' }))}</span>
        <span class="ic" style="--mdc-icon-size:1.3em"><i data-i="${(WEATHER[f.condition] || [])[1] || 'mdi:weather-partly-cloudy'}"></i></span>
        <span style="margin-left:auto;color:var(--hv-fg2)">${fmt(f.templow, 0)}°</span><span style="width:2.4em;text-align:right;font-weight:600">${fmt(f.temperature, 0)}°</span></div>`;
    }).join('');
    if (s.bare) {   // the Widgets board: a hand-made HomeView's proportions
      // centred in its area, like the date beside it; the ° hangs outside the centring so the
      // digits sit in the middle
      return `<div class="t" style="align-items:center;justify-content:center;text-align:center;padding:0 5.7cqi;gap:1.8cqh;cursor:default">
        <div style="font-weight:600;font-size:min(8.9cqh,5.2cqi)">${esc(loc)}</div>
        <div style="font-size:min(46cqh,27cqi);font-weight:500;letter-spacing:-.04em;line-height:.95">${fmt(st?.attributes?.temperature, 0)}<span style="margin-right:-.32em">°</span></div>
        <div style="display:flex;align-items:center;gap:.4em;font-weight:600;font-size:min(8.9cqh,5.2cqi)"><span class="ic" style="display:inline-flex;--mdc-icon-size:1.3em"><i data-i="${icon}"></i></span>${esc(cond)}</div>
        ${fc[0] ? `<div style="font-weight:500;font-size:min(8cqh,4.7cqi)">H:${fmt(Math.max(fc[0].temperature ?? -99, st?.attributes?.temperature ?? -99), 0)}°&nbsp;&nbsp;L:${fmt(Math.min(fc[0].templow ?? 99, st?.attributes?.temperature ?? 99), 0)}°</div>` : ''}</div>`;
    }
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
  html(h, s) {
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
    return `<div class="t white" style="padding:${s.bare ? '0' : '6%'};cursor:default"><svg viewBox="${s.bare ? '3 3 94 94' : '0 0 100 100'}" style="width:100%;height:100%;color:var(--hv-fg)" font-family="${FONT}">
      ${ticks}${nums}${hand(hr * 30, 24, 2.6, 'currentColor')}${hand(min * 6, 36, 1.8, 'currentColor')}${hand(sec * 6, 40, 0.8, 'var(--hv-accent)')}
      <circle cx="50" cy="50" r="2" fill="var(--hv-card)" stroke="var(--hv-accent)" stroke-width="1"/></svg></div>`;
  },
};

// ---- date (widgets) ------------------------------------------------------------------------
R.date = {
  tick: 60e3,
  key: (h) => `${new Date().toDateString()}|${h.states['sun.sun']?.last_updated}`,
  html(h, s = {}) {
    const n = new Date(), lang = h.locale?.language;
    const sun = h.states['sun.sun'];
    if (s.bare) {   // the Widgets board: a hand-made HomeView's proportions, top-aligned
      const t2 = (iso) => (iso ? timeFmt(new Date(iso), h).replace(/\s?[AP]M$/i, '') : '');
      const item = (iso, ic) => `<span style="display:inline-flex;align-items:center;gap:.25em;white-space:nowrap"><span class="ic" style="display:inline-flex;--mdc-icon-size:1.2em"><i data-i="${ic}"></i></span>${esc(t2(iso))}</span>`;
      return `<div class="t" style="cursor:default;background:transparent;border:none;box-shadow:none;justify-content:flex-start;padding:4.7cqh 6.8cqi">
        <div style="font-weight:700;font-size:min(11.5cqh,14cqi);letter-spacing:-.01em;line-height:1.05;white-space:nowrap"><span style="color:var(--hv-accent)">${esc(n.toLocaleDateString(lang, { weekday: 'short' }))}</span>
        <span style="color:var(--hv-fg2)">${esc(n.toLocaleDateString(lang, { month: 'short' }))}</span></div>
        <div style="font-weight:700;font-size:min(47cqh,57cqi);line-height:.92;letter-spacing:-.045em;margin-top:3.8cqh">${n.getDate()}</div>
        ${sun ? `<div style="display:flex;gap:.6em;justify-content:center;font-weight:600;font-size:min(4.7cqh,5.7cqi);margin-top:3cqh;color:var(--hv-fg2)">${item(sun.attributes.next_rising, 'mdi:weather-sunset-up')}${item(sun.attributes.next_setting, 'mdi:weather-sunset-down')}</div>` : ''}</div>`;
    }
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
// Calendar tiles' filters (next_event, agenda):
//   match: 'no school|break'   only events whose title matches (case-insensitive; a regex, or plain text)
//   all_day: true              only all-day events
//   strip: ' - No School'      removed from the titles shown (case-insensitive; a regex, or plain text)
const ciRegex = (v) => { try { return new RegExp(v, 'i'); } catch (e) { return new RegExp(String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); } };
function filterEvents(evs, s) {
  if (!evs) return evs;
  const re = s.match ? ciRegex(s.match) : null;
  const out = evs.filter((e) => (!re || re.test(e.summary || '')) && (!s.all_day || e.allDay));
  return s.join_weekends ? joinWeekends(out, s) : out;
}
//   join_weekends: true   an all-day event takes in the weekend right before / after it (a Monday off
//                         runs Sat–Mon, a Mon–Fri break Sat–Sun, 9 days), and events that then touch
//                         or overlap become one ("Semester Break, New Year's Day"); `weekdays` = the
//                         working / school days in it. A midweek day off stays one day.
function joinWeekends(evs, s) {
  const day = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const wkend = (d) => d.getDay() === 0 || d.getDay() === 6;
  const spans = evs.map((e) => {
    if (!e.allDay) return { ...e };
    let a = new Date(e.startD), b = new Date(e.endD);            // b: exclusive
    while (wkend(day(a, -1))) a = day(a, -1);
    while (wkend(b)) b = day(b, 1);
    return { ...e, startD: a, endD: b, titles: [eventTitle(e, s)] };
  }).sort((x, y) => x.startD - y.startD);
  const out = [];
  for (const e of spans) {
    const last = out[out.length - 1];
    if (last && last.allDay && e.allDay && e.startD <= last.endD) {
      if (e.endD > last.endD) last.endD = e.endD;
      for (const t of e.titles) if (!last.titles.includes(t)) last.titles.push(t);
    } else out.push(e);
  }
  for (const e of out) {
    if (!e.allDay) continue;
    e.summary = e.titles.join(', ');
    let n = 0; for (let d = new Date(e.startD); d < e.endD; d = day(d, 1)) if (!wkend(d)) n++;
    e.weekdays = n;
  }
  return out.filter((e) => e.endD > new Date());
}
const eventTitle = (e, s) => {
  const t = s.strip ? String(e.summary || '').replace(new RegExp(ciRegex(s.strip).source, 'gi'), '').trim() : e.summary;
  return t || e.summary || '';
};
// an event's dates in a few words: "Sat, Nov 21 – Sun, Nov 29" (all-day ends are exclusive), its length in days
function eventSpan(h, e) {
  const lang = h.locale?.language;
  const d = (x) => x.toLocaleDateString(lang, { weekday: 'short', month: 'short', day: 'numeric' });
  if (!e.allDay) {
    const same = e.startD.toDateString() === e.endD.toDateString();
    return { span: `${d(e.startD)} · ${timeFmt(e.startD, h)}${same ? '' : ` – ${d(e.endD)}`}`, days: Math.max(1, Math.round((e.endD - e.startD) / 86400e3)) };
  }
  const last = new Date(e.endD.getTime() - 86400e3);
  const days = Math.max(1, Math.round((e.endD - e.startD) / 86400e3));
  return { span: days === 1 ? d(e.startD) : `${d(e.startD)} – ${d(last)}`, days };
}
R.next_event = {
  tick: 60e3,
  key: (h, s) => `${tileCacheTag(`cal:${s.calendars.join(',')}:${s.days || 14}`)}|${new Date().getHours()}`,
  html(h, s, tile) {
    const days = s.days || 14;
    const evs = filterEvents(getEvents(h, s.calendars, days, tile.refresher), s);
    const e = (evs || [])[0];
    const calName = e ? (h.states[e.calendar]?.attributes?.friendly_name || '') : '';
    if (!e) {
      return `<div class="t flex"><div class="ic"><i data-i="${esc(s.icon || 'mdi:calendar-check')}"></i></div><div class="tx">
        <div class="up">${esc(s.title || 'Up next')}</div><div class="nm">${evs === undefined ? 'Loading…' : 'Nothing planned'}</div><div class="sb">${days === 14 ? 'Next 2 weeks' : `Next ${days} days`}</div></div></div>`;
    }
    const w = eventWhen(h, e);
    const sp = (s.match || s.all_day) && e.allDay ? eventSpan(h, e) : null;   // a filtered list (days off …): its dates
    const now = e.startD <= new Date();
    return `<div class="t flex"><div class="ic" style="color:var(--hv-accent)"><i data-i="${esc(s.icon || 'mdi:calendar-heart')}"></i></div><div class="tx">
      <div class="up">${esc(s.title || `Next on ${calName}`)}</div><div class="nm">${now && sp ? 'Now: ' : ''}${esc(eventTitle(e, s))}</div><div class="sb">${sp ? `${esc(sp.span)} · ${sp.days === 1 ? '1 day' : `${sp.days} days`}` : `${esc(w.day)} · ${esc(w.time)}`}</div></div></div>`;
  },
  action: (h, s, tile) => (s.calendars[0] ? moreInfo(tile, s.calendars[0]) : null),
};
R.agenda = {
  tick: 60e3,
  key: (h, s) => `${tileCacheTag(`cal:${s.calendars.join(',')}:${s.days || 7}`)}|${new Date().getHours()}`,
  html(h, s, tile) {
    const evs = filterEvents(getEvents(h, s.calendars, s.days || 7, tile.refresher), s);
    if (s.layout === 'list') return R.agenda.list(h, s, evs);
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
    const span = (s.days || 7) === 14 ? 'the next 2 weeks' : (s.days || 7) === 7 ? 'the next week' : `the next ${s.days} days`;
    if (!rows) rows = `<div class="sb" style="margin-top:8px">${evs === undefined ? 'Loading…' : `Nothing in ${span}`}</div>`;
    // the Widgets board: centred in its area, a hand-made HomeView's 16–17 px on a tablet
    return `<div class="t" style="align-items:stretch;justify-content:${s.bare ? 'center' : 'flex-start'};text-align:left;padding:${s.bare ? '0 5.7cqi' : '6% 7%'};cursor:default;font-size:${s.bare ? 'clamp(13px,4.4cqi,17px)' : 'clamp(12px,4cqi,16px)'}">
      <div style="display:flex;align-items:center;gap:8px${s.bare ? ';font-size:.94em;letter-spacing:.04em;font-weight:700' : ''}" class="up"><span class="ic" style="--mdc-icon-size:1.4em"><i data-i="mdi:calendar-month-outline"></i></span>${esc(s.title || 'Up next')}</div>
      <div class="ag-list${s.bare ? ' ag-bare' : ''}">${rows}</div></div>`;
  },
  // layout: list — one row per event: its title, dates and length; the one under way first and
  // marked (days off, holidays, bin days … with match:). Events of a week or more get long_icon.
  list(h, s, evs) {
    const max = s.max || 30;
    const list = (evs || []).slice(0, max);
    const nowD = new Date();
    const rows = list.map((e) => {
      const sp = eventSpan(h, e), on = e.startD <= nowD;
      const icon = sp.days >= 7 ? (s.long_icon || 'mdi:calendar-range') : (s.event_icon || 'mdi:calendar-blank-outline');
      return `<div class="ag-row${on ? ' on' : ''}"><span class="ic" style="--mdc-icon-size:24px;color:${sp.days >= 7 ? 'var(--hv-accent)' : 'var(--hv-fg2)'}"><i data-i="${esc(icon)}"></i></span>
        <span class="ag-t"><b>${on ? 'Now: ' : ''}${esc(eventTitle(e, s))}</b><span>${esc(sp.span)}</span></span><span class="ag-n">${sp.days === 1 ? '1 day' : `${sp.days} days`}${e.weekdays !== undefined && e.weekdays !== sp.days ? `<span>${e.weekdays} ${esc(s.weekday_word || 'school')} day${e.weekdays === 1 ? '' : 's'}</span>` : ''}</span></div>`;
    }).join('');
    // with join_weekends: the school (working) days off, as the rows count them
    const wk = list.some((e) => e.weekdays !== undefined);
    const total = list.reduce((n, e) => n + (wk ? (e.weekdays ?? eventSpan(h, e).days) : eventSpan(h, e).days), 0);
    const head = evs === undefined ? 'Loading…' : !list.length ? 'Nothing on the calendar'
      : `${list.length} coming · ${total}${wk ? ` ${s.weekday_word || 'school'}` : ''} day${total === 1 ? '' : 's'}${wk ? ' off' : ''}`;
    return `<div class="t" style="align-items:stretch;justify-content:flex-start;text-align:left;padding:18px;cursor:default;font-size:15px">
      <div style="display:flex;align-items:center;gap:8px" class="up"><span class="ic" style="--mdc-icon-size:1.4em"><i data-i="${esc(s.icon || 'mdi:calendar-month-outline')}"></i></span>${esc(s.title || 'Coming up')}<span style="margin-left:auto;text-transform:none;letter-spacing:0;font-weight:500">${esc(head)}</span></div>
      <div class="ag-rows">${rows}</div></div>`;
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
    const mean = s.power.home ? getMean24(h, s.power.home, tile.refresher) : null;
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
    const data = getHourlyToday(h, s.ids, tile.refresher);
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
    const kwh = getStatToday(h, s.stat, tile.refresher, s.power ? { power: s.power } : null);
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
    const vals = s.stats.map((x) => ({ ...x, v: getStatToday(h, x.id, tile.refresher, x.live) }));
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
      const vals = it.stats.map((x) => ({ ...x, v: getStatToday(h, x.id, tile.refresher, x.live) }));
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
    const kwh = getStatToday(h, s.stat, tile.refresher, s.power ? { power: s.power } : null);
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
const AIR_LEVELS = [['Excellent', HV_TONES.ok], ['Fair', HV_TONES.warn], ['Poor', HV_TONES.alert]];
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
    const pts = getHistory(h, s.entity, 24, tile.refresher) || [];
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
    const cf = comfortOf(h, r, t, hu), feel = cf.t?.word || '', hfeel = cf.h?.word || '';
    const ops = (s.openings || []).map((id) => {
      const st = h.states[id];
      const open = isAlert(st), tone = secureTone(st);
      const nm = shortName(h, id, r?.name).replace(/\b(sensor|contact)\b/ig, '').trim();
      return `<div class="op"><span class="ic" style="--mdc-icon-size:1.25em;color:${tone ? HV_TONES[tone] : 'inherit'}"><i data-e="${esc(id)}"></i></span>${esc(nm)} ${open ? (domainOf(id) === 'lock' ? 'unlocked' : 'open') : (domainOf(id) === 'lock' ? 'locked' : 'closed')}</div>`;
    }).join('');
    return `<div class="t hero">
      <div class="hh"><span>${esc(s.title)}</span><span class="sb">${esc(new Date().toLocaleDateString(h.locale?.language, { weekday: 'long', month: 'short', day: 'numeric' }))}</span></div>
      <div class="hbig">${t !== null ? `${fmt(t, 0)}°` : '—'}</div>
      <div class="ops">${ops}</div>
      <div class="hf">${t !== null ? `<span><span class="ic" style="--mdc-icon-size:1.2em;color:#30B0C7"><i data-i="mdi:thermometer"></i></span>${fmt(t, 1)}° <em style="color:${cf.t?.color || 'inherit'}">${feel}</em></span>` : ''}
        ${hu !== null ? `<span><span class="ic" style="--mdc-icon-size:1.2em;color:#30B0C7"><i data-i="mdi:water-percent"></i></span>${fmt(hu, 0)}% <em style="color:${cf.h?.color || 'inherit'}">${hfeel}</em></span>` : ''}</div></div>`;
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
  icon: 'mdi:shape-outline', remove: 'mdi:minus-circle-outline', menu: 'mdi:dots-horizontal',
  unhide: 'mdi:eye-outline', color: 'mdi:palette-outline', 'hide-room': 'mdi:eye-off-outline', 'unhide-room': 'mdi:eye-outline',
};
const EDIT_TITLES = {
  fav: 'Add to Home', unfav: 'Remove from Home', size: 'Change size', name: 'Rename', hide: 'Hide', unhide: 'Show again',
  icon: 'Change the icon', remove: 'Remove from this room', menu: 'Edit this tile',
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

  /** Redraw with fresh data: requests in the same frame make one redraw (a fetch finishing can
   *  call this many times at once). */
  refresh() {
    this._key = null;
    if (this._rq) return;
    this._rq = true;
    const run = () => { this._rq = false; this._render(); };
    if (document.visibilityState === 'hidden') setTimeout(run, 0); else requestAnimationFrame(run);
  }
  /** The one callback a tile hands to cached(): the same function every time, so a cache entry
   *  keeps one per tile however often the tile draws (a new closure per draw piled up and made
   *  each finished fetch redraw tiles exponentially — "Page isn't responding", 0.8.5). */
  get refresher() { return this._refresher || (this._refresher = () => this.refresh()); }

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
    const pool = iconPool(this._wrap);
    this._wrap.innerHTML = r.html(this._hass, this._spec, this) + this._editHtml();
    const card = this._wrap.firstElementChild;
    if (card && this._spec.bare) card.classList.add('bare');
    if (card && this._spec.row && card.classList.contains('flex')) card.classList.add('row-t');
    fillIcons(this._wrap, this._hass, pool);
    if (r.update) r.update(this._hass, this._spec, this);
    // size: … x auto on a HomeView widget (an agenda list …): the rows its content needs, measured
    // after drawing (as cards are); grows with the content, never clipped
    if (card && ((this._spec.size || [])[1] === 'auto' || (this._spec.phoneSpan || [])[1] === 'auto')) {
      requestAnimationFrame(() => { const hh = Math.ceil(card.scrollHeight); if (hh && hh !== this._hvAutoH) { this._hvAutoH = hh; this._hvAuto?.(); } });
    }
  }

  // a Lovelace card from the user's config, created once with HA's card helpers
  _renderCard() {
    if (this._card && this._card !== 'loading') {
      this._card.hass = this._hass;
      // a card showing an error alert (e.g. a markdown card's <ha-alert alert-type="error">) pulses red
      clearTimeout(this._pulseT);
      this._pulseT = setTimeout(() => {
        const err = !!deepFind(this._card, 'ha-alert[alert-type="error"]', 6);
        if (this._cardBox) this._cardBox.style.animation = err ? 'hv-alert-pulse 1.6s ease-in-out infinite' : '';
      }, 600);
      if (this._edit && !this._wrap.querySelector('.edit')) this._wrap.insertAdjacentHTML('beforeend', this._editHtml());
      if (!this._edit) this._wrap.querySelector('.edit')?.remove();
      if (this._spec.legend_more === false) this._hideLegendMore();
      return;
    }
    if (this._card === 'loading') return;
    this._card = 'loading';
    (async () => {
      const helpers = await window.loadCardHelpers();
      // more: — the expanded settings while "Show all" is on
      let conf = this._spec.card;
      if (this._expanded && this._spec.more && typeof this._spec.more === 'object') {
        conf = { ...conf, ...this._spec.more };
        for (const [k, v] of Object.entries(this._spec.more)) if (v === null) delete conf[k];
      }
      const el = helpers.createCardElement(conf);
      el.hass = this._hass;
      const box = document.createElement('div');
      box.style.cssText = 'height:100%;overflow:auto;border-radius:var(--hv-radius,22px);display:flex;flex-direction:column;justify-content:safe center;background:var(--hv-tile)';
      el.style.setProperty('--ha-card-background', 'transparent');
      // Home Assistant's cards in HomeView's look: its icon / text colours, font and header size
      for (const [k, v] of [['--state-icon-color', 'var(--hv-icon)'], ['--paper-item-icon-color', 'var(--hv-icon)'],
        ['--primary-text-color', 'var(--hv-fg)'], ['--secondary-text-color', 'var(--hv-fg2)'], ['--ha-card-header-color', 'var(--hv-fg)'],
        ['--ha-card-header-font-size', '17px'], ['--mdc-typography-font-family', FONT], ['--ha-font-family-body', FONT],
        ['--tile-color', HV_TONES.on], ['font-family', FONT]]) el.style.setProperty(k, v);
      el.style.setProperty('--ha-card-box-shadow', 'none');
      el.style.setProperty('--ha-card-border-width', '0');
      box.appendChild(el);
      this._wrap.replaceChildren(box);
      this._wrap.style.position = 'relative';
      if (this._spec.more) {   // the Show all / Show less button, top left (HA's card buttons sit top right)
        const b = document.createElement('button');
        b.textContent = this._expanded ? (this._spec.less_label || 'Show less') : (this._spec.more_label || 'Show all');
        // {energy_devices}: how many devices the Energy settings track (e.g. "More (41)")
        if (/\{energy_devices\}/.test(b.textContent)) {
          const label = b.textContent;
          b.textContent = label.replace('{energy_devices}', '…');
          energyDeviceCount(this._hass).then((n) => { b.textContent = label.replace('{energy_devices}', n ?? '?'); });
        }
        b.style.cssText = 'all:unset;position:absolute;top:12px;left:14px;z-index:2;cursor:pointer;padding:6px 12px;border-radius:999px;background:var(--hv-pill);color:var(--hv-fg);font:inherit;font-size:13.5px;font-weight:650';
        b.addEventListener('click', (e) => { e.stopPropagation(); this._expanded = !this._expanded; this._card = null; this._hvAutoH = null; this._renderCard(); });
        this._wrap.appendChild(b);
      }
      this._card = el;
      this._cardBox = box;
      // size: … x auto — natural height, measured: the page gives the tile that many rows
      if ((this._spec.size || [])[1] === 'auto' || (this._spec.phoneSpan || [])[1] === 'auto') {
        const inner = document.createElement('div'); inner.style.cssText = 'flex:none';
        box.replaceChildren(inner); inner.appendChild(el);
        new ResizeObserver(() => { const hh = Math.ceil(inner.getBoundingClientRect().height); if (hh && hh !== this._hvAutoH) { this._hvAutoH = hh; this._hvAuto?.(); } }).observe(inner);
      }
      this._renderCard();
    })().catch((e) => { this._card = null; this._wrap.innerHTML = `<div class="t na"><div class="sb">Card error: ${esc(e.message)}</div></div>`; });
  }

  /** legend_more: false — hide HA's "More (n)" chip at the end of a chart's legend (ha-chart-base),
   *  on every draw (switching bar / pie can draw a new chart) */
  _hideLegendMore() {
    clearTimeout(this._legendT);
    this._legendT = setTimeout(() => {
      const base = deepFind(this._card, 'ha-chart-base', 6);
      const sr = base?.shadowRoot;
      if (sr && !sr.querySelector('style[data-hv-legend]')) {
        const st = document.createElement('style'); st.dataset.hvLegend = '';
        st.textContent = '.chart-legend li:has(ha-assist-chip) { display:none !important; }';
        sr.appendChild(st);
      }
    }, 300);
  }

  _editHtml() {
    if (!this._edit) return '';
    // a list row (66 px) has no room for a button per action: one ⋯ that opens them as a sheet
    if (this._spec?.row && this._edit.actions.length > 2) {
      return `<div class="edit rowed"><button data-edit="menu" title="${EDIT_TITLES.menu}"><ha-icon icon="${EDIT_ICONS.menu}"></ha-icon></button></div>`;
    }
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
    // tap: / hold: <page path> (custom_pages, customize): open that page; none: do nothing
    if (this._spec.kind !== 'room' && this._spec[kind] === 'none') return;
    const link = this._spec.kind !== 'room' && pageLink(this._spec[kind]);
    if (link) { if (navigator.vibrate && kind === 'hold') navigator.vibrate(10); navigate(link); return; }
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
  // warnings: [{ text, level: critical | notice, not_on | on | off | all_off, text_offline, entities }]
  // (the same rules as a custom page's alerts:). Shows only while one is active: red for a critical
  // one, amber for notices; tap = a pop-up with each warning's entities to switch or open.
  warnings(h, m, cfg, el) {
    const list = asList(cfg.warnings).filter((w) => w && typeof w === 'object');
    const active = list.map((w) => ({ w, a: pageAlerts(h, [w])[0] })).filter((x) => x.a);
    // edit mode (admins): always shown — tap it to add / remove warnings
    if (el?._editing && h.user?.is_admin && !active.length) return { icon: 'mdi:alert-outline', text: list.length ? `Warnings · ${list.length}` : '+ Warnings' };
    if (!active.length) return null;
    const crit = active.some((x) => x.a.level === 'critical');
    const idsOf = (w) => asList(w.entities || [w.not_on, w.on, w.off, ...asList(w.all_off)]).filter((id) => id && h.states[id]);
    return {
      icon: crit ? 'mdi:alert-circle' : 'mdi:alert', alert: crit, tone: crit ? null : 'warn',
      text: active.length === 1 ? active[0].a.text : `${active.length} warnings`,
      popup: { title: 'Warnings', showRoom: true,
        groups: active.map(({ w, a }) => ({ title: a.text, ids: idsOf(w), tone: a.level === 'critical' ? 'red' : 'amber' })) },
    };
  },
  alarm(h, m) {
    const id = (m.byDomain.alarm_control_panel || [])[0];
    const st = h.states[id];
    if (!st) return null;
    const armed = st.state.startsWith('armed');
    return { icon: armed ? 'mdi:shield-lock' : st.state === 'triggered' ? 'mdi:bell-ring' : 'mdi:shield-off-outline',
      text: hassState(h, st), alert: st.state === 'triggered', tone: secureTone(st), more: id };
  },
  climate(h, m) {
    const id = (m.byDomain.climate || [])[0];
    const st = h.states[id];
    if (!st) return null;
    // heating amber, cooling / fan blue, idle / off grey
    const act = st.attributes.hvac_action;
    const tone = UNAVAILABLE.includes(st.state) ? 'warn' : act === 'heating' ? 'heat' : act === 'cooling' || act === 'fan' ? 'cool'
      : !act && st.state === 'heat' ? 'heat' : !act && st.state === 'cool' ? 'cool' : null;
    return { icon: 'mdi:thermostat', text: stateText(h, st), tone, more: id };
  },
  lights(h, m) {
    if (!m.lights.length) return null;
    const on = m.lights.filter((id) => h.states[id]?.state === 'on');
    return { icon: on.length ? 'mdi:lightbulb-group' : 'mdi:lightbulb-group-off-outline', text: on.length ? `${on.length} on` : 'Lights off',
      tone: on.length ? 'on' : null, popup: { title: 'Lights', ids: [...on, ...m.lights.filter((id) => !on.includes(id))], showRoom: true } };
  },
  locks(h, m) {
    const locks = m.byDomain.lock || [];
    if (!locks.length) return null;
    const open = locks.filter((id) => isAlert(h.states[id]));
    const off = locks.filter((id) => UNAVAILABLE.includes(h.states[id]?.state));
    return { icon: open.length ? 'mdi:lock-open-variant' : off.length ? 'mdi:lock-question' : 'mdi:lock',
      text: open.length ? `${open.length} unlocked` : off.length ? `${off.length} offline` : 'Locked',
      alert: open.length > 0, tone: off.length ? 'warn' : 'ok', popup: { title: 'Locks', ids: locks, showRoom: true } };
  },
  openings(h, m) {
    if (!m.openings.length) return null;
    const open = m.openings.filter((id) => isAlert(h.states[id]));
    const off = m.openings.filter((id) => UNAVAILABLE.includes(h.states[id]?.state));
    return { icon: open.length ? 'mdi:door-open' : 'mdi:door-closed', text: open.length ? `${open.length} open` : off.length ? `${off.length} offline` : 'All closed',
      alert: open.length > 0, tone: off.length ? 'warn' : 'ok', popup: { title: 'Doors & Windows', ids: [...open, ...m.openings.filter((id) => !open.includes(id))], showRoom: true } };
  },
  safety(h, m) {
    if (!m.safety.length) return null;
    const bad = m.safety.filter((id) => h.states[id]?.state === 'on');
    const off = m.safety.filter((id) => UNAVAILABLE.includes(h.states[id]?.state));
    return { icon: bad.length ? 'mdi:water-alert' : 'mdi:shield-check-outline',
      text: bad.length ? `${bad.length} alert${bad.length > 1 ? 's' : ''}` : off.length ? `${off.length} offline` : 'All clear',
      alert: bad.length > 0, tone: off.length ? 'warn' : 'ok', popup: { title: 'Leaks, smoke & gas', ids: [...bad, ...m.safety.filter((id) => !bad.includes(id))], showRoom: true } };
  },
  batteries(h, m, cfg) {
    if (!m.batteries.length) return null;
    const lowAt = cfg.battery_low ?? 20;
    const low = m.batteries.filter((id) => { const v = num(h.states[id]?.state); return v !== null && v < lowAt; });
    const off = m.batteries.filter((id) => UNAVAILABLE.includes(h.states[id]?.state));
    const parts = [low.length ? `${low.length} low` : null, off.length ? `${off.length} offline` : null].filter(Boolean);
    const lvl = (id) => num(h.states[id]?.state);
    const sorted = [...m.batteries].sort((a, b) => (lvl(a) ?? -1) - (lvl(b) ?? -1));
    // the popup in groups, worst first: low (red), offline (faded), getting low (amber), OK
    const soonAt = Math.min(50, lowAt * 2);
    const soon = sorted.filter((id) => { const v = lvl(id); return v !== null && v >= lowAt && v < soonAt; });
    const ok = sorted.filter((id) => !low.includes(id) && !off.includes(id) && !soon.includes(id));
    const groups = [
      { title: `Low · below ${lowAt}%`, ids: sorted.filter((id) => low.includes(id)), tone: 'red' },
      { title: 'Offline', ids: off, tone: 'off' },
      { title: `Getting low · below ${soonAt}%`, ids: soon, tone: 'amber' },
      { title: 'OK', ids: ok },
    ].filter((g) => g.ids.length);
    return { icon: low.length ? 'mdi:battery-alert-variant-outline' : 'mdi:battery-high', text: parts.join(' · ') || 'Batteries OK',
      alert: low.length > 0, tone: off.length || soon.length ? 'warn' : 'ok', popup: { title: 'Batteries', ids: sorted, groups, showRoom: true } };
  },
  // live power at home (the energy settings' sensors, as on the Energy page); tap = the Energy page
  energy(h, m, cfg, el) {
    const prefs = getEnergyPrefs(h, el?.headRefresher);
    if (prefs === undefined || !el) return null;
    // the header redraws on every state change: pick the sensors once per model / settings
    if (el._pillPower?.m !== m || el._pillPower?.prefs !== prefs) el._pillPower = { m, prefs, pw: energyPower(h, m, cfg, prefs) };
    const pw = el._pillPower.pw;
    const P = powerValues(h, pw);
    if (P.home === null && P.grid === null) return null;
    const exporting = P.grid !== null && P.grid < -20;
    const text = exporting ? `${kwFmt(P.home)} · ${kwFmt(P.grid)} out` : kwFmt(P.home ?? P.grid);
    const hasPage = asList(el?._config?.nav).some((v) => v.path === 'energy') || asList(el?._config?.popups).includes('energy');
    // sending power to the grid: green; drawing power: orange (in use)
    return { icon: exporting ? 'mdi:transmission-tower-export' : 'mdi:home-lightning-bolt-outline', text,
      tone: exporting ? 'ok' : (P.home ?? P.grid) > 100 ? 'on' : null,
      ...(hasPage ? { go: 'energy' } : { more: pw.home || pw.grid || pw.grid_in }) };
  },
  media(h, m) {
    const players = m.byDomain.media_player || [];
    const playing = players.filter((id) => h.states[id]?.state === 'playing');
    if (!playing.length) return null;
    return { icon: 'mdi:play-circle', text: `${playing.length} playing`, tone: 'on', popup: { title: 'Now playing', ids: playing, showRoom: true } };
  },
};
const DEFAULT_PILLS = ['alarm', 'climate', 'energy', 'lights', 'locks', 'openings', 'safety', 'batteries', 'media'];
/** A pill of your own: { entity, name?, icon?, alert?: [states], tap?, hold? } — its state, tap = more-info. */
/**
 * A custom page's alerts: [{ text, level: critical | notice, all_off: [ids] (every one off),
 * on: id (on), off: id (off), not_on: id (anything but on; text_offline when it isn't reporting) }]
 * -> the ones active now: [{ text, level }]. They show at the top of the page and colour its pill
 * (critical: red, notice: amber), as the other pills warn.
 */
function pageAlerts(h, list) {
  const st = (id) => h.states[id]?.state;
  const out = [];
  for (const a of asList(list)) {
    if (!a || typeof a !== 'object') continue;
    let on = false, text = a.text || 'Check this';
    if (a.all_off) on = asList(a.all_off).length > 0 && asList(a.all_off).every((id) => st(id) === 'off');
    else if (a.not_on) {
      const s = st(a.not_on);
      on = s !== 'on';
      if (on && (s === undefined || UNAVAILABLE.includes(s)) && a.text_offline) text = a.text_offline;
    } else if (a.on) on = st(a.on) === 'on';
    else if (a.off) on = st(a.off) === 'off';
    if (on) out.push({ text, level: a.level === 'notice' ? 'notice' : 'critical' });
  }
  return out;
}
function entityPill(h, d) {
  const warn = pageAlerts(h, d.alerts);
  const crit = warn.some((a) => a.level === 'critical');
  if (!d.entity && d.page) return { icon: d.icon || 'mdi:view-grid-outline', text: d.name || d.page, alert: crit, tone: warn.length ? 'warn' : null };   // a page's pill without an entity
  const st = h.states[d.entity];
  if (!st) return null;
  const alert = asList(d.alert).map(String).includes(st.state) || crit;
  // unit: kW (or W / MW) — a power sensor's value in that unit
  const u = String(d.unit || '').toLowerCase();
  const w = u && ['w', 'kw', 'mw'].includes(u) ? toWatts(st) : null;
  const val = w === null ? hassState(h, st) : u === 'kw' ? fmtKw(w) : u === 'mw' ? `${fmt(w / 1e6, 2)} MW` : `${fmt(w, 0)} W`;
  return { icon: d.icon || st.attributes.icon || 'mdi:information-outline', text: `${d.name ? `${d.name} ` : ''}${val}`,
    alert, tone: warn.length ? 'warn' : secureTone(st) || (UNAVAILABLE.includes(st.state) ? 'warn' : isActive(st) ? 'on' : null), more: d.entity };
}

/* ============================================================================================
 * Control chips under the Home title: icon only until something needs attention
 *   (garage open, door unlocked, water shut off, alarm triggered -> red with a word;
 *   arming / opening / closing -> pulse). Tap acts (alarm: its panel), hold = details.
 * home.chips: [entity | { entity, icon_on, icon_off, name, confirm, off_warn }] or false
 * ========================================================================================== */

/** Water off? valve: closed; a switch named "shut…" (a shut-off): on; any other water valve switch
 *  (e.g. a template "Water Valve" over a normally-open shut-off): off. */
function waterOff(st) {
  const id = st.entity_id, d = domainOf(id), s = st.state;
  if (d === 'valve') return s === 'closed';
  return /shut/i.test(id) ? s === 'on' : s === 'off';
}
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
// chips in the shared colour code (HV_TONES): green = secured, amber = offline / moving, red = alert
// (filled, with a word), red icon = alarm armed; a switch chip while on: color: security (green,
// the default), light (orange), climate (blue) or any CSS colour; off_warn: amber while off
const CHIP_ON = { security: HV_TONES.ok, light: HV_TONES.on, climate: HV_TONES.cool };
function chipLook(h, c) {
  const st = h.states[c.entity];
  if (!st) return { cls: 'na', word: '' };
  const d = domainOf(c.entity), s = st.state;
  const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
  if (UNAVAILABLE.includes(s)) return { cls: 'warn', word: 'Offline' };
  if (d === 'alarm_control_panel') {
    if (s === 'triggered') return { cls: 'alert', word: 'Triggered', busy: true };
    if (['arming', 'pending', 'disarming'].includes(s)) return { cls: 'warn', busy: true, word: cap(s) };
    return { cls: s.startsWith('armed') ? 'armed' : '', word: '' };
  }
  if (d === 'cover') {
    if (['opening', 'closing'].includes(s)) return { cls: 'warn', busy: true, word: cap(s) };
    return s === 'closed' ? { cls: 'ok', word: '' } : { cls: 'alert', word: 'Open' };
  }
  if (d === 'lock') {
    if (['locking', 'unlocking', 'opening'].includes(s)) return { cls: 'warn', busy: true, word: cap(s) };
    if (s === 'jammed') return { cls: 'alert', word: 'Jammed' };
    return s === 'locked' ? { cls: 'ok', word: '' } : { cls: 'alert', word: 'Unlocked' };
  }
  if (isWaterValve(c.entity)) {
    // valve: closed = water off; a shut-off switch: on = water off; any other valve switch: on = open
    const off = waterOff(st);
    return off ? { cls: 'alert', word: 'Water off', icon: 'mdi:water-off' } : { cls: 'ok', word: '', icon: 'mdi:water' };
  }
  const on = isActive(st);
  if (!on) return { cls: c.off_warn ? 'warn' : '', word: '' };
  const col = CHIP_ON[c.color] || c.color || (d === 'light' ? HV_TONES.on : d === 'climate' || d === 'fan' ? HV_TONES.cool : HV_TONES.ok);
  return { cls: 'on', word: '', color: col };
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

/** The first element matching sel inside root, through open shadow roots, up to depth levels. */
function deepFind(root, sel, depth = 5) {
  if (!root || depth < 0) return null;
  const scope = root.shadowRoot || root;
  const hit = scope.querySelector?.(sel);
  if (hit) return hit;
  for (const el of scope.querySelectorAll?.('*') || []) {
    if (el.shadowRoot) { const x = deepFind(el, sel, depth - 1); if (x) return x; }
  }
  return null;
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
/** "+ Add" at the end of a room's tiles, in edit mode only: add any entity to the room's list. */
const addTile = (room, roomIds, row = false) => ({ kind: 'add', room, roomIds: [...roomIds], size: [1, 1], editOnly: true, ...(row ? { row: true } : {}) });
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
  const t0 = userTileBase(def, h, m);
  // phone_size: 2x3 — columns (of 2) x rows (64 px) on phones, instead of the size worked out
  const ps = t0 && parseSize(def.phone_size);
  return ps ? { ...t0, phoneSpan: [Math.min(2, ps[0] === 'full' || ps[0] === 'half' ? 2 : ps[0]), ps[1]] } : t0;   // ps[1] may be 'auto'
}
function userTileBase(def, h, m) {
  const size = parseSize(def.size);
  // more: { … } — a "Show all" button on the card that switches it to these settings (null removes
  // one), e.g. { max_devices: null }; more_label / less_label for the button's words
  // legend_more: false — hide a chart card's own "More (n)" legend chip (HA's), e.g. when more: gives
  // a better "show all"; the legend keeps the names that fit
  if (def.card) return { kind: 'card', card: def.card, size: size || [2, 2], more: def.more, more_label: def.more_label, less_label: def.less_label, legend_more: def.legend_more };
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
    return entTile(def.entity, { name: def.name, icon: def.icon, icon_on: def.icon_on, icon_off: def.icon_off, color_on: def.color_on, color_off: def.color_off, tap: def.tap, hold: def.hold, size: size || [1, 1], showRoom: def.show_room !== false, areaName: room?.name, user: true,
      power: def.power, color: def.color, confirm: def.confirm, name_off: def.name_off, unit: def.unit });
  }
  return null;
}
/**
 * custom_pages: a page may start with `vars:` — the entities it uses, so a shared page file works
 * after editing only that block. "$tv" (a whole value) becomes the var as is (a list stays a
 * list, and a list in a tiles list is spread into it); "$tv" inside longer text is replaced too.
 */
const VAR_RE = /\$([A-Za-z_][A-Za-z0-9_]*)/g;
function expandVars(v, vars) {
  if (typeof v === 'string') {
    const whole = v.match(/^\$([A-Za-z_][A-Za-z0-9_]*)$/);
    if (whole && whole[1] in vars) return vars[whole[1]];
    return v.replace(VAR_RE, (all, k) => (k in vars && typeof vars[k] !== 'object' ? String(vars[k]) : all));
  }
  if (Array.isArray(v)) return v.flatMap((x) => { const e = expandVars(x, vars); return typeof x === 'string' && Array.isArray(e) ? e : [e]; });
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, expandVars(x, vars)]));
  return v;
}
const _customCache = new WeakMap();
/** custom_pages, each with its vars filled in and a path (path: or page-<n>). */
function customPages(cfg) {
  const list = asList(cfg?.custom_pages);
  if (_customCache.has(list)) return _customCache.get(list);
  const out = list.map((d, i) => {
    if (!d || typeof d !== 'object') return { idx: i, path: `page-${i + 1}`, bad: true };
    const { vars, ...rest } = d;
    const page = vars && typeof vars === 'object' ? expandVars(rest, vars) : rest;
    return { ...page, idx: i, path: String(page.path || `page-${i + 1}`) };
  });
  _customCache.set(list, out);
  return out;
}
/** Entity ids a custom page refers to that this Home Assistant doesn't have (or $vars left unset). */
function missingEntities(h, page) {
  const ids = new Set(), unset = new Set();
  const isId = (x) => typeof x === 'string' && /^[a-z_]+\.[a-z0-9_]+$/.test(x);
  const walk = (v, key) => {
    if (typeof v === 'string') {
      for (const [, k] of v.matchAll(VAR_RE)) unset.add(`$${k}`);
      if (isId(v) && (key === 'entity' || key === 'entities' || key === 'tile' || key === 'entity_id')) ids.add(v);
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, key === 'tiles' ? 'tile' : key));
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, k));
  };
  walk(page.sections, 'sections');
  asList(page.pills).forEach((p) => walk(p, 'pill'));
  return [...[...ids].filter((id) => !h.states[id]), ...unset];
}
/** tap: / hold: values: more-info, toggle, none — anything else is a page to open (its path). */
const ACTION_WORDS = ['more-info', 'toggle', 'none', 'default', 'lights', 'room'];
const pageLink = (v) => (typeof v === 'string' && v && !ACTION_WORDS.includes(v) ? v : null);

// a section of your own: layout: pills (compact pills in a row) | keypad (icon buttons in
// `columns` columns; '.' = an empty cell, e.g. a TV remote) | faders (sliders, two per row on
// tablets) | rows (a list); width: half (two sections side by side on tablets); icon: by the title
const SECTION_LAYOUTS = ['pills', 'keypad', 'faders', 'rows'];
const userSections = (list, h, m) => asList(list).map((sec) => ({
  title: sec.title, position: sec.position, hue: sec.color !== undefined ? hueOf(sec.color, undefined) : undefined,
  layout: SECTION_LAYOUTS.includes(sec.layout) ? sec.layout : undefined, half: sec.width === 'half', icon: sec.icon,
  keyCols: Number(sec.columns) || 4, iconsOnly: !!sec.icons_only,
  tiles: asList(sec.tiles).map((t) => (t === '.' || t === null ? { kind: 'gap', size: [1, 1] } : userTile(t, h, m))).filter(Boolean),
}));

const rowTile = (id, extra = {}) => entTile(id, { row: true, ...extra });
const nonGroupLights = (h, ids) => asList(ids).filter((id) => !Array.isArray(h.states[id]?.attributes?.entity_id));

/** The live power sensors (W / kW): energy.* config, else the energy settings' power sensors,
 *  else a guess by name. Shared by the Energy page and the Energy pill. */
function energyPower(h, m, cfg, prefs) {
  const ec = cfg.energy || {};
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
  return power;
}

const PAGES = {
  // a tinted board: big date, big clock, camera, up next, weather — for a wall tablet
  widgets(h, m, cfg, opts, page) {
    const wc = cfg.widgets || {};
    const board = [{ kind: 'date', area: 'date', bare: true }, { kind: 'clock', area: 'clock', bare: true }];
    if (m.weather) board.push({ kind: 'forecast', entity: m.weather, days: 3, area: 'weather', bare: true });
    // the same 2 weeks as Home's Next tile, so the two never disagree (7 days missed an event 8 days out)
    if (m.calendars.length) board.push({ kind: 'agenda', calendars: m.calendars, days: 14, max: 5, area: 'next', bare: true, title: 'Up next' });
    // the photo slideshow (the camera is on Home; widgets.camera: <entity> puts one here instead)
    if (wc.camera) {
      board.push({ kind: 'camera', entity: wc.camera, area: 'cam' });
    } else if (wc.slideshow !== false) {
      const found = wc.slideshow ? null : findPhotoFolder(h, page.rebuilder);
      // still looking (undefined): wait; nothing found (null): the sample photos
      const folder = wc.slideshow || (found === undefined ? null : found || 'samples');
      if (folder) board.push({ kind: 'slideshow', folder, interval: wc.slideshow_interval || 60, thumbnail: wc.slideshow_thumbnail, area: 'cam' });
    }
    return { title: 'Widgets', minimalHead: true, board, sections: [] };
  },

  home(h, m, cfg) {
    const pc = cfg.home || {};
    const tiles = [];
    const later = [];   // clock and next event: after the other tiles, before the scenes
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
    // the clock and the next event: right after the lights (they fill that row on tablets), before
    // the scenes
    tiles.push(...later);
    const sections = [{ tiles }];
    if (pc.rooms === true && m.rooms.length) sections.push({ title: 'Rooms', link: 'rooms', tiles: m.rooms.map((r) => roomTile(r)) });
    const scenes = (m.byDomain.scene || []).slice(0, pc.max_scenes ?? 8);
    if (pc.scenes !== false && scenes.length) sections.push({ title: 'Scenes', layout: 'rows', tiles: scenes.map((id) => rowTile(id, { sub: 'Scene' })) });
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
      return { title: r.name, room: r.id, hue: r.hue, tiles: [roomTile(r), ...ids.map((id) => entTile(id, { areaName: r.name, hue: r.hue, pinRoom: r.id, roomIds: ids })), addTile(r.id, ids)] };
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
    if (r.pinned) sections.push({ tiles: r.pinned.map((id) => rowTile(id, { areaName: r.name, pinRoom: r.id, roomIds: r.pinned })), layout: 'rows' });
    sections.push({ tiles: [addTile(r.id, r.pinned || [], true)], layout: 'rows' });   // + Add (edit mode only)
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
      // the room's own list (rooms.<area>.entities, also what "+ Add" builds), else the first 7 devices
      const ids = r.pinned ? [...r.pinned] : [...ROOM_ROW_DOMAINS.flatMap((d) => r.entities.filter((id) => domainOf(id) === d && !UNAVAILABLE.includes(h.states[id]?.state)
        && !(d === 'light' && Array.isArray(h.states[id]?.attributes?.entity_id)))).slice(0, 7),
        ...openings.filter((id) => domainOf(id) === 'binary_sensor')];
      ids.forEach((id) => tiles.push(entTile(id, { areaName: r.name, pinRoom: r.id, roomIds: ids })));
      tiles.push(addTile(r.id, ids));
    }
    const cals = mem.calendars.length ? mem.calendars : m.calendars;
    if (cals.length) tiles.push({ kind: 'next_event', calendars: cals, size: [3, 1] });
    return { title: mem.name, hue: mem.hue, greet: true, member: mem, openings, sections: [{ tiles }] };
  },

  energy(h, m, cfg, opts, page) {
    const prefs = getEnergyPrefs(h, page.rebuilder);
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

    const power = energyPower(h, m, cfg, prefs);
    const devOf = (id) => h.entities?.[id]?.device_id;
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
      if (outageLabel === null) cached('outage:label', 10 * 60e3, () => outageLabelId(h, false).then((id) => { outageLabel = id || ''; return id; }), page.rebuilder);
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
    const d = customPages(cfg)[opts.custom] || {};
    return { title: d.title || 'Page', hue: hueOf(d.color, 200), pills: !!d.pills, close: !!d.subview, hold: d.hold, sections: [],
      columns: Number(d.columns) || undefined, alerts: d.alerts };
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
.title .tt[data-title] { user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; touch-action:manipulation; }
.title .tt[data-title-hold] { cursor:pointer; }
.txt.busy { animation:hv-pulse 1.1s ease-in-out infinite; }
.back { all:unset; cursor:pointer; width:36px; height:36px; border-radius:50%; background:var(--hv-pill); display:inline-flex;
  align-items:center; justify-content:center; --mdc-icon-size:22px; }
.pills { display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end; max-width:100%; }
@media (max-width:600px) { .pills { justify-content:flex-start; } }
/* tablets / browsers: the pills stay top right beside the title block (several lines if need be),
   never pushed under the chips */
@media (min-width:601px) {
  .head { flex-wrap:nowrap; }
  .head > div:first-child { flex:0 1 auto; }
  .head > .pills { flex:1 1 0; min-width:220px; align-content:flex-start; align-self:flex-start; padding-top:4px; }
  /* Home: the pills stay above the tiles right of the weather tile (2 columns wide), never over it */
  .head.home > .pills { max-width:calc(100% - 2 * ((100% - (var(--hv-cols) - 1) * var(--hv-gap)) / var(--hv-cols)) - 2 * var(--hv-gap)); }
}
.head > .xclose { flex:none; margin-left:auto; align-self:flex-start; width:40px; height:40px; --mdc-icon-size:22px;
  position:fixed; z-index:5; top:calc(env(safe-area-inset-top, 0px) + 14px); right:calc(env(safe-area-inset-right, 0px) + 14px);
  box-shadow:0 2px 10px rgba(0,0,0,.18); }
.head > .xclose ha-icon { display:flex; }
.pill { all:unset; cursor:pointer; display:inline-flex; align-items:center; gap:6px; padding:7px 12px; border-radius:999px;
  background:var(--hv-pill); font-size:13.5px; font-weight:650; color:var(--hv-fg); --mdc-icon-size:17px; white-space:nowrap; }
.pill ha-icon { color:var(--hv-icon); }
.pill.active ha-icon, .pill.t-on ha-icon { color:${HV_TONES.on}; }
.pill.t-ok ha-icon { color:${HV_TONES.ok}; }
.pill.t-warn ha-icon, .pill.t-heat ha-icon { color:${HV_TONES.warn}; }
.pill.t-armed ha-icon { color:${HV_TONES.armed}; }
.pill.t-cool ha-icon { color:${HV_TONES.cool}; }
.pill.alert { background:${HV_TONES.alert}; color:#fff; }
.pill.alert ha-icon { color:#fff; }
.people { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
.chips { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
/* edit mode: chips and pills move by dragging */
@keyframes hv-wiggle { from { transform:rotate(-.6deg); } to { transform:rotate(.6deg); } }
.sorting > [data-chip], .sorting > [data-pill] { cursor:grab; touch-action:none; user-select:none; -webkit-user-select:none;
  outline:1.5px dashed var(--hv-accent); outline-offset:2px; animation:hv-wiggle .35s ease-in-out infinite alternate; }
.sorting > .dragging { cursor:grabbing; animation:none; transform:scale(1.08); box-shadow:0 6px 18px rgba(0,0,0,.22); z-index:3; position:relative; }
.chp { all:unset; box-sizing:border-box; cursor:pointer; height:40px; min-width:40px; padding:0 9px; border-radius:999px; background:var(--hv-pill);
  display:inline-flex; align-items:center; justify-content:center; gap:6px; color:var(--hv-icon); --mdc-icon-size:22px;
  -webkit-tap-highlight-color:transparent; user-select:none; -webkit-user-select:none; transition:background .2s, color .2s; }
.chp b { font:700 13px ${FONT}; }
.chp.on, .chp.ok, .chp.warn, .chp.armed { background:var(--hv-tile-on); }
.chp.on { color:${HV_TONES.ok}; }
.chp.ok { color:${HV_TONES.ok}; }
.chp.warn { color:${HV_TONES.warn}; }
.chp.armed { color:${HV_TONES.armed}; }
.chp.warn b, .chp.ok b { color:var(--hv-fg); }
.chp.alert { background:${HV_TONES.alert}; color:#fff; }
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
.sec-h.wi { align-items:center; gap:8px; font-size:15px; letter-spacing:.05em; text-transform:uppercase; }
.sec-h.wi ha-icon { --mdc-icon-size:19px; display:flex; }
/* custom pages: two sections side by side, pills, a keypad, faders, alerts */
.secrow { display:grid; grid-template-columns:1fr 1fr; gap:0 calc(var(--hv-gap) * 2); align-items:start; }
.grid.pills { display:flex; flex-wrap:wrap; gap:10px; justify-content:flex-start; align-items:center; }
.grid.pills > homeview-tile { height:auto; container-type:normal; }
.grid.keypad { grid-template-columns:repeat(var(--kc, 4), minmax(0, 1fr)); grid-auto-rows:46px; gap:10px; max-width:560px; }
.grid.faders { grid-template-columns:repeat(auto-fill, minmax(min(100%, 460px), 1fr)); grid-auto-rows:54px; gap:16px 24px; }
.palerts { display:flex; flex-direction:column; gap:8px; margin:0 0 calc(var(--hv-gap) * 1.2); }
.palerts:empty { display:none; }
.palert { display:flex; align-items:center; gap:10px; padding:12px 16px; border-radius:16px; font-size:15px; font-weight:600;
  background:var(--hv-tile); --mdc-icon-size:22px; }
.palert.critical { box-shadow:inset 0 0 0 1.5px ${HV_TONES.alert}; animation:hv-alert-pulse 1.6s ease-in-out infinite; }
.palert.critical ha-icon { color:${HV_TONES.alert}; }
.palert.notice { box-shadow:inset 0 0 0 1.5px ${HV_TONES.warn}; }
.palert.notice ha-icon { color:${HV_TONES.warn}; }
@keyframes hv-alert-pulse { 50% { box-shadow:inset 0 0 0 1.5px ${HV_TONES.alert}, 0 0 0 4px color-mix(in srgb, ${HV_TONES.alert} 22%, transparent); } }
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
/* Widgets fills the screen edge to edge: no page padding, square corners, no empty header above it
   (the page bar, when shown, stays above the board) */
.page.boardpage { padding:0; }
.page.boardpage .head:empty { display:none; }
.page.boardpage .head:not(:empty) { margin:0; padding:10px clamp(14px, 2.2vw, 28px); }
/* the Widgets board: 28 px padding, 20 px gaps on a tablet (scaled down on phones) */
.page.boardpage .board { border-radius:0; padding:clamp(14px, 2.2vw, 28px); gap:clamp(12px, 1.6vw, 20px);
  height:var(--hv-board-h, 100vh); }
/* phones: one screen, like a hand-made iPhone HomeView — date | clock, the photo, up next
   (the weather is on Home) */
.board.narrow { min-height:360px; gap:12px; padding:14px; border-radius:32px;
  grid-template-columns:repeat(2, minmax(0, 1fr)); grid-template-rows:minmax(0, 1fr) minmax(0, 1.3fr) minmax(0, .85fr);
  grid-template-areas:"date clock" "cam cam" "next next"; }
.board.narrow > homeview-tile.a-weather { display:none; }
/* portrait tablets (taller than wide, not a phone): two columns — date | clock, the photo across,
   up next | weather — instead of the landscape board's empty space around the clock */
@media (orientation:portrait) and (min-width:600px) {
  .board:not(.narrow) { grid-template-columns:repeat(2, minmax(0, 1fr));
    grid-template-rows:minmax(0, 1fr) minmax(0, 1.15fr) minmax(0, .8fr);
    grid-template-areas:"date clock" "cam cam" "next weather"; }
}
img.lt { object-fit:cover; background:var(--hv-pill); }
.lt { width:20px; height:20px; border-radius:50%; background:var(--hv-accent); color:#fff; font-size:11px; font-weight:750;
  display:inline-flex; align-items:center; justify-content:center; }
.note { padding:24px; border-radius:22px; background:var(--hv-tile); color:var(--hv-fg2); font-size:15px; }
.pop { position:fixed; inset:0; z-index:10; background:rgba(0,0,0,.35); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
  display:flex; align-items:flex-end; justify-content:center; }
@media (min-width:700px) { .pop { align-items:center; } }
.sheet { width:min(920px, 100%); max-height:86vh; overflow:auto; background:var(--hv-bg); border-radius:26px 26px 0 0; padding:18px var(--hv-pad) 28px; }
@media (min-width:700px) { .sheet { border-radius:26px; } }
/* a pill's pop-up (Locks, Lights, Doors & Windows …): at the top on every screen, so a short list
   sits near the pill that opened it instead of floating mid-screen or at the bottom */
.pop.top { align-items:flex-start; padding-top:calc(env(safe-area-inset-top, 0px) + 3vh); }
.pop.top .sheet { border-radius:26px; max-height:calc(94vh - env(safe-area-inset-top, 0px)); }
@media (max-width:699px) { .pop.top { padding:calc(env(safe-area-inset-top, 0px) + 8px) 8px 0; } }
.sheet-h { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:14px; font-size:21px; font-weight:750; position:sticky; top:-18px; background:inherit; padding:6px 0; z-index:3; }
.sheet-b { display:flex; gap:8px; align-items:center; }
.pop-sec { display:flex; align-items:baseline; gap:8px; margin:16px 2px 8px; font-size:15px; font-weight:700; color:var(--hv-fg); }
.pop-sec:first-of-type { margin-top:4px; }
.pop-sec span { font-size:13px; font-weight:600; opacity:.7; }
.pen { margin-left:4px; color:var(--hv-fg2); }
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
.title .hb { flex:none; color:var(--hv-fg2); }
.title .hb + .hb, .title .hb + .back { margin-left:-2px; }
/* the round buttons by the title (Menu, update, back, pencil) and the control chips under it:
   one size (40 px, 22 px icons), icons centred as boxes (not on the text baseline) */
.title .back { flex:none; width:40px; height:40px; --mdc-icon-size:22px; }
.title .back ha-icon, .chp ha-icon { display:flex; }
.chp i { display:flex; }
.hb.updi { background:var(--hv-accent); color:#fff; }
.tbb { display:inline-flex; gap:8px; }
.sheet.narrow { width:min(460px, 100%); }
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
    if (this.isConnected && Date.now() - (this._kAt || 0) > 2500) { this._kAt = Date.now(); applyKiosk(kioskMode(this._config?.options)); hvScreensaver.update(this); }
    const sig = this._signature(h);
    if (sig !== this._sig) { this._sig = sig; this.rebuild(); return; }
    // a page HA keeps for later (not on screen): catch up when it's shown again
    if (!this.isConnected) { this._stale = true; return; }
    this._tiles.forEach((t) => { t.hass = h; });
    // several updates often arrive within one frame: one header redraw for them
    if (!this._headRaf) this._headRaf = requestAnimationFrame(() => { this._headRaf = null; this._renderHead(); });
  }

  connectedCallback() {
    if (!this._ro) {
      // the layout depends on the width (and the screen height, which window resize covers);
      // the page's own height changes as tiles fill in, and must not lay it out again each time
      this._ro = new ResizeObserver((es) => { const w = Math.round(es[0]?.contentRect?.width || 0); if (w !== this._roW) { this._roW = w; this._layout(); } });
      this._ro.observe(this);
    }
    hvPagesOnScreen++;
    HomeViewPage._current = this;
    this._kiosk();
    hvScreensaver.update(this);
    if (!this._onWinResize) { this._onWinResize = () => this._layout(); window.addEventListener('resize', this._onWinResize); }
    // edit mode is one state for the whole dashboard: follow a change made on another page
    if (!this._onEditing) {
      this._onEditing = (e) => { if (e.detail?.from !== this && this._builtEditing !== undefined && this._builtEditing !== this._editing) this.rebuild(); };
      window.addEventListener('homeview-editing', this._onEditing);
    }
    if (this._builtEditing !== undefined && this._builtEditing !== this._editing) this.rebuild();
    else if (this._stale && this._hass) { this._stale = false; this._tiles.forEach((t) => { t.hass = this._hass; }); this._renderHead(); }
  }
  disconnectedCallback() {
    this._ro?.disconnect(); this._ro = null;
    if (this._onWinResize) { window.removeEventListener('resize', this._onWinResize); this._onWinResize = null; }
    hvPagesOnScreen = Math.max(0, hvPagesOnScreen - 1);
    // switching between HomeView pages reconnects at once; leaving HomeView doesn't
    setTimeout(() => { if (!hvPagesOnScreen) { applyKiosk(false); hvScreensaver.update(null); } }, 600);
  }

  _kiosk() {
    if (!this._config) return;
    const on = kioskMode(this._config.options);
    applyKiosk(on);
    // HA renders its header after the first card on a fresh load: apply once more then
    if (on && !this._kioskRetry) { this._kioskRetry = setTimeout(() => { this._kioskRetry = null; if (this.isConnected) applyKiosk(kioskMode(this._config.options)); }, 1200); }
  }

  // rebuild the page when entities / areas / devices change (not on every state change)
  _signature(h) {
    if (this._ents !== h.entities || this._areas !== h.areas || this._devs !== h.devices || this._nStates !== hvStateCount(h)
        || this._dark !== isDark(h, this._config.options)) {
      this._ents = h.entities; this._areas = h.areas; this._devs = h.devices; this._nStates = hvStateCount(h);
      this._dark = isDark(h, this._config.options);
      this._gen = (this._gen || 0) + 1;
    }
    return this._gen;
  }

  rebuild() {
    const h = this._hass;
    if (!h) return;
    this._builtEditing = this._editing;
    const cfg = this._config.options || {};
    hvAvatarMode = cfg.avatars ?? 'samples';
    // edit mode: hidden entities and rooms stay in place, faded, with an eye to show them again;
    // they only leave the page when editing is done
    const editing = this._editing;
    const hiddenEnts = new Set([...asList(cfg.exclude_entities),
      ...Object.entries(cfg.customize || {}).filter(([, c]) => c?.hidden).map(([id]) => id)]);
    const hiddenRooms = new Set([...asList(cfg.hide_rooms),
      ...Object.entries(cfg.rooms || {}).filter(([, c]) => c?.hidden).map(([id]) => id)]);
    let mcfg = cfg;
    if (editing && (hiddenEnts.size || hiddenRooms.size)) {
      const customize = Object.fromEntries(Object.entries(cfg.customize || {}).map(([id, c]) => [id, c?.hidden ? { ...c, hidden: false } : c]));
      const rooms = Object.fromEntries(Object.entries(cfg.rooms || {}).map(([id, c]) => [id, c?.hidden ? { ...c, hidden: false } : c]));
      mcfg = { ...cfg, exclude_entities: [], hide_rooms: [], customize, rooms };
    }
    this._model = mcfg === cfg ? sharedModel(h, cfg) : buildModel(h, mcfg);   // edit mode (hidden shown): its own
    const builder = PAGES[this._config.page];
    const page = builder ? builder(h, this._model, mcfg, this._config, this) : { title: '?', sections: [] };
    if (editing) {
      for (const sec of page.sections || []) {
        for (const t of sec.tiles || []) {
          if (t.entity && hiddenEnts.has(t.entity)) t.hiddenEnt = true;
          if (t.room && t.kind === 'room' && hiddenRooms.has(t.room.id)) t.hiddenRoom = true;
        }
      }
    } else if (hiddenEnts.size) {
      // hidden means hidden everywhere: tiles named explicitly (favourites, a room's entities: list,
      // custom pages, phone favourites) don't pass through the model's exclusion, so drop them here
      for (const sec of page.sections || []) sec.tiles = (sec.tiles || []).filter((t) => !(t.entity && hiddenEnts.has(t.entity)));
    }
    this._page = page;
    if (this._config.popup) page.close = true;
    const pd = PAGE_DEFS[this._config.page] || {};
    // pages_config.<page>.title (person and custom pages: pages_config.<their path>.title; a room's
    // page is named by rooms.<area>.name)
    const titleKey = ['member', 'custom'].includes(this._config.page) ? this._config.path : this._config.page;
    const titleCfg = (cfg.pages_config?.[titleKey] || (this._config.page === 'living' ? cfg.pages_config?.family || cfg.pages_config?.shared : null))?.title;
    if (titleCfg && this._config.page !== 'room') page.title = titleCfg;
    const pageCfg = cfg.pages_config?.[this._config.page] || (this._config.page === 'living' ? cfg.pages_config?.family || cfg.pages_config?.shared : null) || {};
    const hue = hueOf(pageCfg.color, page.hue ?? pd.hue ?? 28);
    const dark = isDark(h, cfg);
    this._dark = dark;
    this._root.setAttribute('style', styleVars(palette(hue, dark, pd.sat ?? 1)));
    const pf = fontStack(cfg.font);   // font: inter — the whole dashboard
    if (pf) this._root.style.fontFamily = pf;

    // the user's own sections (pages_config.<page>.sections, rooms.<area>.sections, custom_pages)
    const custom = this._config.page === 'custom' ? customPages(cfg)[this._config.custom] : null;
    const extra = custom ? custom.sections
      : this._config.page === 'room' ? cfg.rooms?.[this._config.area]?.sections : pageCfg.sections;
    for (const sec of userSections(extra, h, this._model)) {
      // show_room: false (a custom page) — tiles show their state, not their room
      if (custom?.show_room === false) sec.tiles = sec.tiles.map((t) => (t.kind === 'entity' ? { ...t, showRoom: false } : t));
      // hidden entities: gone (edit mode: faded, with the eye to show them again)
      if (editing) sec.tiles.forEach((t) => { if (t.entity && hiddenEnts.has(t.entity)) t.hiddenEnt = true; });
      else if (hiddenEnts.size) sec.tiles = sec.tiles.filter((t) => !(t.entity && hiddenEnts.has(t.entity)));
      if (sec.position === 'top') page.sections.unshift(sec); else page.sections.push(sec);
    }
    // (hidden entities / rooms are marked in place above while editing)
    // phones: the layout of a hand-made iPhone HomeView (see PHONE_SPAN)
    this._phone = this._isPhone();
    if (this._phone) this._phonePage(h, cfg, page);

    this._tiles = [];
    const frag = document.createDocumentFragment();
    const head = document.createElement('div'); head.className = 'head' + (this._config.page === 'home' ? ' home' : '');
    frag.appendChild(head);
    this._head = head; this._headKey = null;
    // alerts: (a custom page's warnings) — slim banners under the title, kept live with the header
    this._alertsEl = null; this._alertsKey = null;
    if (page.alerts) { const al = document.createElement('div'); al.className = 'palerts'; frag.appendChild(al); this._alertsEl = al; }
    const notes = [];
    if (page.note) notes.push(page.note);
    if (custom && h.user?.is_admin) {
      const miss = missingEntities(h, custom);
      if (miss.length) notes.push(`Page “${custom.path}”: ${miss.length > 1 ? 'these entities aren\'t' : 'this entity isn\'t'} in Home Assistant — ${miss.slice(0, 6).join(', ')}${miss.length > 6 ? ` and ${miss.length - 6} more` : ''}. Set them in the vars: block at the top of its file (custom_pages/README.md). Only admins see this.`);
    }
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
    this._root.classList.toggle('boardpage', !!page.board);
    if (page.board) {
      const b = document.createElement('div'); b.className = 'board';
      const bh = page.hue ?? pd.hue ?? 200;
      b.setAttribute('style', styleVars({ ...palette(bh, dark, 0.3),
        '--hv-board': dark ? `hsl(${bh} 12% 15%)` : `hsl(${bh} 13% 72%)`,
        '--hv-fg': dark ? '#EEF2F3' : '#15191B', '--hv-fg2': dark ? `hsl(${bh} 8% 66%)` : `hsl(${bh} 9% 30%)`,
        '--hv-accent': dark ? '#FF9F45' : '#E8640C', '--hv-clock-num': 'var(--hv-fg)', '--hv-line': dark ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.14)',
        '--hv-tile': 'transparent', '--hv-pill': dark ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.35)' }));
      const bf = fontStack(cfg.widgets?.font);   // widgets: { font: inter } (the clock keeps the system font)
      if (bf) b.style.fontFamily = bf;
      for (const spec of page.board) {
        const t = this._tile({ ...spec, size: [1, 1] }, dark);
        t._hvFree = true;
        t.style.gridArea = spec.area;
        t.classList.add(`a-${spec.area}`);
        b.appendChild(t);
      }
      frag.appendChild(b);
    }
    let halfRow = null;   // width: half — two sections side by side (tablets)
    for (const sec of page.sections) {
      if (!sec.tiles.length) continue;
      const s = document.createElement('div');
      s.className = 'sec' + (page.compactSections && !editing && sec.layout !== 'favs' ? ' compact' : '') + (sec.hidden ? ' hidden-sec' : '');
      if (sec.title) {
        s.insertAdjacentHTML('beforeend', `<div class="sec-h${sec.icon ? ' wi' : ''}">${sec.icon ? `<ha-icon icon="${esc(sec.icon)}"></ha-icon>` : ''}${esc(sec.title)}${sec.sub ? `<span class="sub">${esc(sec.sub)}</span>` : ''}${sec.link ? `<span class="more" data-nav="${esc(sec.link)}">See all ›</span>` : ''}</div>`);
        // a room's title: hold (or tap) = the room's details page
        if (sec.room && !editing) { const hd = s.lastElementChild; hd.style.cursor = 'pointer'; const go = () => navigate(`room-${sec.room}`);
          bindPress(hd, () => { const l = roomMainLight(this._hass, this._model.areaById[sec.room]); if (l) this._hass.callService('light', 'toggle', {}, { entity_id: l }); else go(); }, go); }
      }
      const g = document.createElement('div'); g.className = 'grid' + (sec.layout ? ` ${sec.layout}` : '') + (sec.loads ? ' loads' : '');
      if (sec.hue !== undefined) g.setAttribute('style', styleVars(palette(sec.hue, dark)));
      if (sec.layout === 'keypad') g.style.setProperty('--kc', sec.keyCols);
      const pillish = sec.layout === 'pills' || sec.layout === 'keypad';
      for (const spec0 of sec.tiles) {
        const spec = pillish && spec0.kind !== 'gap' ? { ...spec0, pillish: true, iconOnly: sec.layout === 'keypad' || sec.iconsOnly || spec0.iconOnly } : spec0;
        if (spec.editOnly && !(editing && h.user?.is_admin)) continue;
        // a size set in edit mode (customize.<id>.size) counts in a list too: it spans list columns / rows,
        // and a tile two rows tall is drawn as a full tile, not a list row
        const czSize = sec.layout === 'rows' && spec.entity && parseSize(this._config.options?.customize?.[spec.entity]?.size);
        const t = this._tile(sec.layout === 'rows' ? { ...spec, row: !(czSize && czSize[1] >= 2) } : spec, dark);
        if (sec.layout) t._hvFree = true;
        if (czSize) t._hvRowSpan = czSize;
        // the outage header: its text wraps on phones and narrow tablets (iPad portrait)
        if (spec.full) { t.style.gridColumn = '1 / -1'; if (spec.kind === 'energy_outage' && (this._phone || window.innerWidth < 1000)) t.style.gridRow = `span ${this._phone ? 3 : 2}`; }
        g.appendChild(t);
      }
      s.appendChild(g);
      if (sec.half && !this._phone) {
        if (!halfRow || halfRow.childElementCount >= 2) { halfRow = document.createElement('div'); halfRow.className = 'secrow'; frag.appendChild(halfRow); }
        halfRow.appendChild(s);
      } else { halfRow = null; frag.appendChild(s); }
    }
    this._root.replaceChildren(frag);
    this._root.querySelectorAll('[data-nav]').forEach((el) => el.addEventListener('click', () => navigate(el.dataset.nav)));
    this._renderHead();
    this._layout();    restoreScroll();   // after an edit: back where you were
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
        if (['entity', 'room_lights', 'energy_device', 'room_power', 'add'].includes(t.kind) && !sec.layout) { out.push({ ...t, row: true }); continue; }
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
    keepScroll();
    this.rebuild();
    hvScreensaver.update(this);
    // every other HomeView page (HA keeps them alive off screen) follows at once
    window.dispatchEvent(new CustomEvent('homeview-editing', { detail: { from: this } }));
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
    // a person's page: their room summary changes the room's colour, which tints their page too
    if (spec.kind === 'member_hero' && spec.room) return { actions: ['color'], onEdit };
    if (spec.kind === 'add') return { actions: [], onEdit };
    if (spec.kind === 'entity' && !spec.user) {
      return { actions: [this._favorites().includes(spec.entity) ? 'unfav' : 'fav', 'size', 'name', 'icon', ...(spec.pinRoom ? ['remove'] : []), 'hide'], onEdit };
    }
    return null;
  }

  async _onEdit(a, spec) {
    const h = this._hass, id = spec.entity;
    if (a === 'menu') return this._actionSheet(spec);
    if (a === 'icon') return this._iconSheet(spec);
    if (a === 'add') return this._addSheet(spec);
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
          // stays in the favourites: hidden things are left out anyway, and showing it again puts it
          // back where it was
          o.exclude_entities = [...new Set([...asList(o.exclude_entities), id])];
          break;
        case 'unhide': o.exclude_entities = asList(o.exclude_entities).filter((x) => x !== id); delete cz.hidden; break;
        case 'color': {
          o.rooms = o.rooms || {};
          const rc = (o.rooms[spec.room.id] = o.rooms[spec.room.id] || {});
          rc.color = COLOR_CYCLE[(COLOR_CYCLE.indexOf(rc.color) + 1) % COLOR_CYCLE.length];
          break;
        }
        case 'remove': {   // off this room's list (the list starts as what the room shows now)
          o.rooms = o.rooms || {};
          const rc = (o.rooms[spec.pinRoom] = o.rooms[spec.pinRoom] || {});
          rc.entities = asList(rc.entities ?? spec.roomIds).filter((x) => x !== id);
          break;
        }
        case 'hide-room': o.hide_rooms = [...new Set([...asList(o.hide_rooms), spec.room.id])]; break;
        case 'unhide-room': o.hide_rooms = asList(o.hide_rooms).filter((x) => x !== spec.room.id); break;
        default: break;
      }
    });
  }

  // edit mode: drag a chip / pill to a new place (pointer events: mouse, touch and pen alike).
  // The item follows the pointer through the row, live; on release, onDrop gets the new order of
  // the items' data-<key> values (only when something moved)
  _sortable(box, sel, key, onDrop, onTap) {
    box.classList.add('sorting');
    box.querySelectorAll(sel).forEach((el) => {
      el.addEventListener('pointerdown', (e) => {
        if (e.button > 0) return;
        e.preventDefault();
        const before = [...box.querySelectorAll(sel)].map((x) => x.dataset[key]).join();
        const x0 = e.clientX, y0 = e.clientY;
        let moved = false;
        this._dragging = true;
        el.classList.add('dragging');
        const move = (ev) => {
          if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
          moved = true;
          const over = [...box.querySelectorAll(sel)].find((x) => {
            if (x === el) return false;
            const r = x.getBoundingClientRect();
            return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top - 4 && ev.clientY <= r.bottom + 4;
          });
          if (over) { const r = over.getBoundingClientRect(); over.insertAdjacentElement(ev.clientX > r.left + r.width / 2 ? 'afterend' : 'beforebegin', el); }
        };
        const up = () => {
          window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
          el.classList.remove('dragging');
          this._dragging = false;
          const order = [...box.querySelectorAll(sel)].map((x) => x.dataset[key]);
          if (moved && order.join() !== before) onDrop(order);
          else { this._renderHead(); if (!moved && onTap) onTap(el.dataset[key]); }
        };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
      });
    });
  }

  /** Edit mode: the Warnings pill's list — each warning's level and remove, + Add from any entity. */
  _warningsSheet() {
    const h = this._hass;
    const list = asList(this._config.options?.warnings).filter((w) => w && typeof w === 'object');
    const { sheet, close } = this._sheet('Warnings');
    sheet.classList.add('narrow');
    const rule = (w) => (w.not_on ? `when ${w.not_on} isn't on` : w.on ? `when ${w.on} is on` : w.off ? `when ${w.off} is off`
      : w.all_off ? `when ${asList(w.all_off).join(', ')} are all off` : '');
    const save = (next) => { close(); this._save((o) => { o.warnings = next; if (!next.length) delete o.warnings; }); };
    sheet.insertAdjacentHTML('beforeend', `<p class="hint">The Warnings pill shows on Home while one of these is true; tap it for quick access to their devices.</p>
      <div style="display:flex;flex-direction:column;gap:8px">${list.map((w, i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:var(--hv-tile)">
          <span style="flex:1;min-width:0"><b style="display:block;font-weight:650">${esc(w.text || 'Warning')}</b>
            <span style="font-size:12px;color:var(--hv-fg2)">${esc(rule(w))}</span></span>
          <button class="txt" data-level="${i}" style="color:${w.level === 'notice' ? HV_TONES.warn : HV_TONES.alert}">${w.level === 'notice' ? 'Notice' : 'Critical'}</button>
          <button class="back" data-del="${i}" title="Remove"><ha-icon icon="mdi:minus-circle-outline"></ha-icon></button></div>`).join('') || '<p class="hint">No warnings yet.</p>'}</div>
      <button class="txt primary" data-addw style="margin-top:12px"><ha-icon icon="mdi:plus"></ha-icon> Add</button>`);
    sheet.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => save(list.filter((_, i) => i !== Number(b.dataset.del)))));
    sheet.querySelectorAll('[data-level]').forEach((b) => b.addEventListener('click', () => {
      const i = Number(b.dataset.level);
      save(list.map((w, k) => (k === i ? { ...w, level: w.level === 'notice' ? 'critical' : 'notice' } : w)));
    }));
    sheet.querySelector('[data-addw]').addEventListener('click', () => { close(); this._addWarningSheet(list); });
  }

  /** + Add a warning: pick an entity; a switch / plug warns when it isn't on (with its power
   *  reading in the pop-up), a leak / smoke / problem sensor when it's on. */
  _addWarningSheet(list) {
    const h = this._hass;
    const { sheet, close } = this._sheet('Add a warning');
    sheet.classList.add('narrow');
    const OK = ['switch', 'light', 'fan', 'input_boolean', 'automation', 'binary_sensor'];
    const used = new Set(list.flatMap((w) => [w.not_on, w.on, w.off, ...asList(w.all_off)]).filter(Boolean));
    const all = Object.keys(h.states).filter((x) => OK.includes(domainOf(x)) && !used.has(x))
      .map((x) => ({ id: x, name: h.states[x].attributes.friendly_name || x })).sort((a, b) => a.name.localeCompare(b.name));
    sheet.insertAdjacentHTML('beforeend', `<input data-q placeholder="Search: fridge, freezer, leak …" style="width:100%;box-sizing:border-box;font:16px ${FONT};padding:10px 12px;border-radius:12px;border:1px solid var(--hv-line);background:var(--hv-tile);color:var(--hv-fg);margin-bottom:10px">
      <div data-list style="display:flex;flex-direction:column;gap:6px"></div>`);
    const q = sheet.querySelector('[data-q]'), box = sheet.querySelector('[data-list]');
    const powerOf = (id) => {   // a power sensor on the same device (a smart plug's own)
      const dev = h.entities?.[id]?.device_id;
      return dev ? Object.keys(h.states).find((x) => x.startsWith('sensor.') && h.entities?.[x]?.device_id === dev && h.states[x].attributes.device_class === 'power') : null;
    };
    const make = (id) => {
      const name = (h.states[id].attributes.friendly_name || id).replace(/\s+switch$/i, '');
      if (domainOf(id) === 'binary_sensor') return { text: name, level: 'critical', on: id };
      const pw = powerOf(id);
      return { text: `${name} off`, text_offline: `${name} offline`, level: 'critical', not_on: id, ...(pw ? { entities: [id, pw] } : {}) };
    };
    const show = () => {
      const t = q.value.trim().toLowerCase();
      const hits = all.filter((e) => !t || e.name.toLowerCase().includes(t) || e.id.includes(t)).slice(0, 40);
      box.innerHTML = hits.map((e) => `<button class="txt" data-id="${esc(e.id)}" style="justify-content:flex-start;text-align:left;border-radius:14px;padding:10px 12px">
        <ha-state-icon data-si="${esc(e.id)}" style="--mdc-icon-size:20px"></ha-state-icon><span style="display:flex;flex-direction:column;min-width:0">
        <b style="font-weight:650">${esc(e.name)}</b><span style="font-size:12px;color:var(--hv-fg2)">${esc(e.id)} · ${domainOf(e.id) === 'binary_sensor' ? 'warn while on' : 'warn while not on'}</span></span></button>`).join('')
        || '<p class="hint">Nothing matches.</p>';
      box.querySelectorAll('ha-state-icon').forEach((el) => { el.hass = h; el.stateObj = h.states[el.dataset.si]; });
      box.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => {
        close();
        this._save((o) => { o.warnings = [...list, make(b.dataset.id)]; });
      }));
    };
    q.addEventListener('input', show); show();
    setTimeout(() => q.focus(), 50);
  }

  // chips in their new order → home.chips (an automatic set is written out as it is now)
  _saveChipOrder(chips, order) {
    const list = order.map((i) => chips[Number(i)]).filter(Boolean)
      .map((c) => (Object.keys(c).length === 1 ? c.entity : c));
    return this._save((o) => { o.home = o.home || {}; o.home.chips = list; });
  }

  // pills in their new order → pills: (the default set is written out). Pills not showing right
  // now (no lights, the alarm pill beside an alarm chip …) keep their place in the list.
  _savePillOrder(order) {
    const cfg = this._config.options || {};
    const base = asList(cfg.pills && cfg.pills !== true ? cfg.pills : DEFAULT_PILLS);
    const byId = new Map(this._pills.map(([i, , d]) => [String(i), d]));
    const shown = order.map((i) => byId.get(String(i))).filter(Boolean);
    const entry = (d) => (typeof d.src === 'number' ? base[d.src] : d.src === 'pill:warnings' ? 'warnings' : { page_pill: String(d.src).slice(5) });
    const list = shown.map(entry);
    const used = new Set(shown.filter((d) => typeof d.src === 'number').map((d) => d.src));
    // a pill not showing goes back right after the one before it in the old list (first: at the front)
    base.forEach((x, k) => {
      if (used.has(k)) return;
      const at = k === 0 ? -1 : list.indexOf(base[k - 1]);
      list.splice(at + 1, 0, x);
    });
    return this._save((o) => { o.pills = list; });
  }

  // edit mode: the page's title. A room's page renames the room (rooms.<area>.name, everywhere it
  // shows); any other page: pages_config.<path>.title (its title and its name in the page bar)
  async _renamePage() {
    const page = this._page, room = page?.room;
    const key = ['member', 'custom'].includes(this._config.page) ? this._config.path : this._config.page;
    const name = window.prompt(room ? 'Room name (leave empty for the name in Home Assistant)' : 'Page title (leave empty for the automatic title)', page?.title || '');
    if (name === null) return;
    const v = name.trim();
    await this._save((o) => {
      if (room) {
        o.rooms = o.rooms || {};
        const rc = (o.rooms[room.id] = o.rooms[room.id] || {});
        if (v) rc.name = v; else delete rc.name;
      } else {
        o.pages_config = o.pages_config || {};
        const pc = (o.pages_config[key] = o.pages_config[key] || {});
        if (v) pc.title = v; else delete pc.title;
        if (!Object.keys(pc).length) delete o.pages_config[key];
      }
    });
  }

  // save, then show the result right away (HA also reloads the dashboard after a save)
  async _save(mutate) {
    keepScroll();
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

  /** Edit mode, a list row: its actions as a sheet, each with its name. */
  _actionSheet(spec) {
    const ed = this._editFor(spec);
    if (!ed) return;
    const { sheet, close } = this._sheet(spec.name || shortName(this._hass, spec.entity, spec.areaName));
    sheet.insertAdjacentHTML('beforeend', `<div style="display:flex;flex-direction:column;gap:6px">${ed.actions.map((a) =>
      `<button data-a="${a}" style="all:unset;cursor:pointer;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;background:var(--hv-tile);font:15px ${FONT};color:${a === 'hide' || a === 'remove' ? '#FF3B30' : 'var(--hv-fg)'}"><ha-icon icon="${EDIT_ICONS[a]}"></ha-icon>${esc(EDIT_TITLES[a])}</button>`).join('')}</div>`);
    sheet.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => { close(); this._onEdit(b.dataset.a, spec); }));
  }

  /** Edit mode: a tile's icon (HA's icon picker when the browser has it, else mdi:… with a preview). */
  _iconSheet(spec) {
    const h = this._hass, id = spec.entity;
    const cur = this._config.options?.customize?.[id]?.icon || '';
    const { sheet, close } = this._sheet(`Icon · ${spec.name || shortName(h, id, spec.areaName)}`,
      '<button class="txt" data-auto>Automatic</button><button class="txt primary" data-ok>Save</button>');
    sheet.classList.add('narrow');
    const body = document.createElement('div');
    let val = cur;
    if (customElements.get('ha-icon-picker')) {
      const pk = document.createElement('ha-icon-picker'); pk.hass = h; pk.value = cur; pk.label = 'Icon';
      pk.addEventListener('value-changed', (e) => { val = e.detail.value || ''; });
      body.appendChild(pk);
    } else {
      body.innerHTML = `<p class="hint">An icon name from materialdesignicons.com, e.g. <b>mdi:television</b>.</p>
        <div style="display:flex;align-items:center;gap:12px"><ha-icon data-prev icon="${esc(cur || 'mdi:help-circle-outline')}" style="--mdc-icon-size:32px"></ha-icon>
        <input data-in value="${esc(cur)}" placeholder="mdi:television" style="flex:1;font:16px ${FONT};padding:10px 12px;border-radius:12px;border:1px solid var(--hv-line);background:var(--hv-tile);color:var(--hv-fg)"></div>`;
      const inp = body.querySelector('[data-in]'), prev = body.querySelector('[data-prev]');
      inp.addEventListener('input', () => { val = inp.value.trim(); prev.setAttribute('icon', /^mdi:[a-z0-9-]+$/.test(val) ? val : 'mdi:help-circle-outline'); });
    }
    sheet.appendChild(body);
    const save = (icon) => { close(); this._save((o) => {
      o.customize = o.customize || {};
      const cz = (o.customize[id] = o.customize[id] || {});
      if (icon) cz.icon = icon; else delete cz.icon;
      if (!Object.keys(cz).length) delete o.customize[id];
    }); };
    sheet.querySelector('[data-ok]').addEventListener('click', () => save(val));
    sheet.querySelector('[data-auto]').addEventListener('click', () => save(''));
  }

  /** Edit mode: "+ Add" — any entity, added to the room's list (rooms.<area>.entities). */
  _addSheet(spec) {
    const h = this._hass;
    const { sheet, close } = this._sheet(`Add to ${this._model.areaById[spec.room]?.name || 'this room'}`);
    sheet.classList.add('narrow');
    const SKIP = ['update', 'person', 'zone', 'sun', 'tts', 'stt', 'conversation', 'event', 'image', 'todo', 'device_tracker'];
    const all = Object.keys(h.states).filter((x) => !SKIP.includes(domainOf(x)) && !spec.roomIds.includes(x))
      .map((x) => ({ id: x, name: h.states[x].attributes.friendly_name || x }))
      .sort((a, b) => a.name.localeCompare(b.name));
    sheet.insertAdjacentHTML('beforeend', `<input data-q placeholder="Search devices and entities…" style="width:100%;box-sizing:border-box;font:16px ${FONT};padding:10px 12px;border-radius:12px;border:1px solid var(--hv-line);background:var(--hv-tile);color:var(--hv-fg);margin-bottom:10px">
      <div data-list style="display:flex;flex-direction:column;gap:6px"></div>`);
    const q = sheet.querySelector('[data-q]'), list = sheet.querySelector('[data-list]');
    const show = () => {
      const t = q.value.trim().toLowerCase();
      const hits = all.filter((e) => !t || e.name.toLowerCase().includes(t) || e.id.includes(t)).slice(0, 40);
      list.innerHTML = hits.map((e) => `<button class="txt" data-id="${esc(e.id)}" style="justify-content:flex-start;text-align:left;border-radius:14px;padding:10px 12px">
        <ha-state-icon data-si="${esc(e.id)}" style="--mdc-icon-size:20px"></ha-state-icon><span style="display:flex;flex-direction:column;min-width:0">
        <b style="font-weight:650">${esc(e.name)}</b><span style="font-size:12px;color:var(--hv-fg2)">${esc(e.id)}</span></span></button>`).join('')
        || '<p class="hint">Nothing matches.</p>';
      list.querySelectorAll('ha-state-icon').forEach((el) => { el.hass = h; el.stateObj = h.states[el.dataset.si]; });
      list.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => {
        const id = b.dataset.id; close();
        this._save((o) => {
          o.rooms = o.rooms || {};
          const rc = (o.rooms[spec.room] = o.rooms[spec.room] || {});
          rc.entities = [...new Set([...asList(rc.entities ?? spec.roomIds), id])];
          // shown again if it was hidden
          o.exclude_entities = asList(o.exclude_entities).filter((x) => x !== id);
        });
      }));
    };
    q.addEventListener('input', show); show();
    setTimeout(() => q.focus(), 50);
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
    // from: <dashboard> — edit the settings as this dashboard shows them (saved as its own edits)
    if (cur?.strategy?.from) draft = { type: cur.strategy.type, ...(await resolveFrom(h, (({ type: _t, ...x }) => x)(cur.strategy))).merged };
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
  /** Stable callbacks for cached() (one per page, however often the page builds). */
  get rebuilder() { return this._rebuilder || (this._rebuilder = () => this.scheduleRebuild()); }
  get headRefresher() { return this._headRefresher || (this._headRefresher = () => { this._headKey = null; this._renderHead(); }); }

  _tile(spec, dark) {
    // customize: per-entity name / icon / size / tap from the config
    const cz = spec.entity && this._config.options?.customize?.[spec.entity];
    if (cz && ['entity', 'camera', 'person'].includes(spec.kind)) {
      spec = { ...spec, name: cz.name ?? spec.name, icon: cz.icon ?? spec.icon, icon_on: cz.icon_on ?? spec.icon_on, icon_off: cz.icon_off ?? spec.icon_off, color_on: cz.color_on ?? spec.color_on, color_off: cz.color_off ?? spec.color_off, tap: cz.tap ?? spec.tap, size: parseSize(cz.size, spec.size) };
    }
    // customize.<entity>.hold / tap: a page to open, wherever the entity's tile is
    if (cz && (cz.hold || cz.tap) && spec.kind !== 'room') spec = { ...spec, hold: spec.hold ?? cz.hold, tap: spec.tap ?? cz.tap };
    const t = document.createElement('homeview-tile');
    if (spec.hiddenEnt || spec.hiddenRoom) t.title = 'Hidden — tap the eye to show it again';
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
  _layoutSoon() { cancelAnimationFrame(this._lsRaf); this._lsRaf = requestAnimationFrame(() => this._layout()); }
  _layout() {
    const w = this.clientWidth || window.innerWidth;
    const cfg = this._config.options || {};
    const phone = w < 600;
    const pageCols = this._page?.columns || PAGE_COLUMNS[this._config.page] || 5;   // custom pages: columns:
    let cols, pad, gap, aspect;
    if (phone !== !!this._phone && this._page) { this._phone = phone; this.rebuild(); return; }
    if (phone) {
      cols = 2; pad = 14; gap = 10; aspect = 1;
    } else {
      // Tile formula (README → Tile shapes): columns from the page's own count, but tiles between 110 and
      // 300 px wide (110: a portrait iPad keeps Living's six-wide room rows, as a hand-made HomeView); row height fits ROWS_ON_SCREEN rows on the screen, the shape kept between
      // square and 1.35 : 1 (tall screens: square tiles and scroll; wide ones: wider tiles, so the
      // rows fit), never under 88 px (two 44 pt touch targets)
      pad = Math.round(clamp(w * 0.025, 16, 48)); gap = 16;
      const tw = (c) => (w - 2 * pad - gap * (c - 1)) / c;
      cols = pageCols;
      while (cols > 2 && tw(cols) < 110) cols--;
      while (tw(cols) > 300 && cols < 12) cols++;
      aspect = 1;
    }
    if (cfg.tile_size) {   // the old rule: as many columns as fit tiles at least this wide
      cols = clamp(Math.floor((w - 2 * pad + gap) / (cfg.tile_size + gap)), 2, 12);
    }
    if (cfg.max_columns) cols = Math.min(cols, cfg.max_columns);
    cols = Math.max(2, cols);
    const colW = (w - 2 * pad - gap * (cols - 1)) / cols;
    let row;
    if (phone) row = 64;
    // Energy's tiles size their text from their height: rows 176–210 px on every tablet / browser
    else if (this._config.page === 'energy') row = clamp(Math.round(colW), 176, 210);
    else {
      const ro = cfg.rows_on_screen;
      const R0 = typeof ro === 'number' ? ro : (ro && typeof ro === 'object' ? ro[this._config.page] : undefined) ?? ROWS_ON_SCREEN[this._config.page] ?? 4;
      row = colW;
      if (R0 > 0) {
        // the space below the header (and HA's own header, when it shows) down to the screen's edge
        const hb = this._head ? this._head.getBoundingClientRect() : null;
        const headMargin = hb ? parseFloat(getComputedStyle(this._head).marginBottom) || 0 : 0;
        const top = hb ? hb.bottom + (window.scrollY || 0) - (this.getBoundingClientRect().top + (window.scrollY || 0)) + headMargin : 110;
        const offset = Math.max(0, this.getBoundingClientRect().top + (window.scrollY || 0));
        const avail = window.innerHeight - offset - top - pad;
        const fit = (avail - (R0 - 1) * gap) / R0;
        row = clamp(fit, colW / 1.35, colW);
      }
      row = Math.max(88, Math.round(row));
    }
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
        const pb = parseFloat(getComputedStyle(this._root).paddingBottom);
        const below = Number.isFinite(pb) ? pb : pad;   // 0 on Widgets (edge to edge) is a real value
        if (top >= 0 && board.isConnected) board.style.setProperty('--hv-board-h', `${Math.max(420, Math.round(window.innerHeight - top - below))}px`);
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
        else if (k === 'card') { sw = 2; sh = sh === 'auto' ? 'auto' : Math.max(2, (sh || 2) * 3); }
        else { sw = Math.min(2, sw === 'half' || sw === 'full' ? 2 : sw); sh = Math.max(1, sh * 2); }
      }
      if (sw === 'half') sw = cols >= 4 ? Math.ceil(cols / 2) : cols;
      if (sw === 'full') sw = cols;
      // height "auto": the rows the card needs (measured by the tile; 2 until it is)
      const auto = phone && t.spec?.phoneSpan ? t.spec.phoneSpan[1] === 'auto' : t._hvSize[1] === 'auto';
      if (auto) { t._hvAuto = () => this._layoutSoon(); sh = t._hvAutoH ? Math.max(1, Math.ceil((t._hvAutoH + gap) / (row + gap))) : 2; }
      t.style.gridColumn = `span ${Math.min(sw, cols)}`;
      t.style.gridRow = `span ${sh}`;
    }
    // lists (a room's devices): sizes set in edit mode span the list's columns (as many as it has)
    for (const g of this._root.querySelectorAll('.grid.rows')) {
      if (![...g.children].some((t) => t._hvRowSpan)) continue;   // reading the columns forces a layout
      const n = getComputedStyle(g).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
      for (const t of g.children) {
        if (!t._hvRowSpan) continue;
        const [sw, sh] = t._hvRowSpan;
        t.style.gridColumn = `span ${Math.max(1, Math.min(n, typeof sw === 'number' ? sw : n))}`;
        t.style.gridRow = `span ${phone ? 1 : (typeof sh === 'number' ? sh : 1)}`;
      }
    }
    this._cols = cols;
  }

  _renderAlerts() {
    const el = this._alertsEl, h = this._hass;
    if (!el || !h) return;
    const list = pageAlerts(h, this._page?.alerts);
    const key = JSON.stringify(list);
    if (key === this._alertsKey) return;
    this._alertsKey = key;
    el.innerHTML = list.map((a) => `<div class="palert ${a.level}"><ha-icon icon="${a.level === 'critical' ? 'mdi:alert-circle' : 'mdi:information'}"></ha-icon>${esc(a.text)}</div>`).join('');
  }

  _renderHead() {
    const h = this._hass, page = this._page, head = this._head;
    if (!h || !page || !head) return;
    this._renderAlerts();
    if (this._dragging) { this._headKey = null; return; }   // not under a finger mid-drag: after it
    const cfg = this._config.options || {};
    const m = this._model;
    const chipAlarm = asList(page.chips).some((c) => domainOf(c.entity) === 'alarm_control_panel');
    // phones: the status pills on Home only (as on a hand-made iPhone HomeView)
    // pills: [lights, { pill: energy, hold: energy-history }, { entity: sensor.pond_temp, name: Pond, hold: pond }]
    // status pills: Home only (custom pages with pills: true too), top right beside the title
    // each pill keeps where it came from (src: its index in pills:, or page:<path> for a custom
    // page's own pill) so edit mode can save a new order. { page_pill: pond } in pills: places a
    // custom page's pill (its look still comes from the page file)
    const pagePill = (path) => { const pp = asList(this._config.pagePills).find((x) => x.page === path); return pp ? { ...pp, tap: pp.tap || pp.page } : null; };
    const pills = page.pills && cfg.pills !== false && ['home', 'custom'].includes(this._config.page)
      ? asList(cfg.pills && cfg.pills !== true ? cfg.pills : DEFAULT_PILLS)
        .map((x, k) => (typeof x === 'string' ? { pill: x, src: k } : x && typeof x === 'object' && x.page_pill ? (this._config.page === 'home' && pagePill(x.page_pill) ? { ...pagePill(x.page_pill), src: k } : null) : x && typeof x === 'object' ? { ...x, src: k } : null))
        .filter((d) => d && !(d.pill === 'alarm' && chipAlarm))
        // warnings: (when set): first, unless pills: places it
        .reduce((acc, d) => acc.concat([d]), (cfg.warnings || (this._editing && h.user?.is_admin)) && this._config.page === 'home' && !asList(cfg.pills).includes('warnings') ? [{ pill: 'warnings', src: 'pill:warnings' }] : [])
        // pills from custom pages (unless a listed pill already opens that page, or places it)
        .concat(this._config.page !== 'home' ? [] : asList(this._config.pagePills)
          .filter((pp) => !asList(cfg.pills).some((d) => d && typeof d === 'object' && (d.hold === pp.page || d.tap === pp.page || d.page_pill === pp.page)))
          .map((pp) => ({ ...pp, tap: pp.tap || pp.page, src: `page:${pp.page}` })))
        .map((d, i) => [i, d.pill ? PILLS[d.pill]?.(h, m, cfg, this) : d.entity || d.page ? entityPill(h, d) : null, d]).filter(([, p]) => p)
      : [];
    this._pills = pills;
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
    // the Menu / Full screen and update icons live on the Home page only (a clean look elsewhere)
    const onHome = this._config.page === 'home';
    const chip = onHome && cfg.kiosk !== false && cfg.kiosk_chip !== false;
    // the page bar shows with HA's sidebar (Menu); in full screen: swipe or ← / → keys
    const nav = !kiosk && !page.back && !page.close ? asList(this._config.nav) : [];
    const here = this._config.path || this._config.page;
    const chips = asList(page.chips);
    const looks = chips.map((c) => chipLook(h, c));
    // hold the title: the page pages_config.<page>.hold (or a custom page's hold:) names — e.g. Home → settings
    const titleHold = editing ? null : pageLink(page.hold || cfg.pages_config?.[this._config.page]?.hold);
    // Reload pages (edit mode, admins, every dashboard): a YAML dashboard re-reads its files
    // (homeview/custom_pages/), a UI dashboard its saved config
    const yamlDash = h.panels?.[dashboardPath() || 'lovelace']?.config?.mode === 'yaml';
    const canReload = !!h.user?.is_admin;
    const key = JSON.stringify([today, page.title, titleHold, yamlDash, editing, canEdit, updOn, stale, kiosk, here, looks, chips.map((c) => h.states[c.entity]?.state), pills.map(([id, p]) => [id, p.text, p.alert, p.active, p.tone]), people.map((id) => h.states[id]?.state)]);
    if (key === this._headKey) return;
    this._headKey = key;
    const room = page.room;
    let roomSub = '';
    if (room) {
      const s = roomSummary(h, room);
      roomSub = [s.t !== null ? `${fmt(s.t, 1)}°` : null, s.hu !== null ? `${fmt(s.hu, 0)}%` : null].filter(Boolean).join(' · ');
    }
    // Menu / Full screen and the update icon sit in front of the page title (on a page without a
    // title — Widgets — top right). Update: ⬆ a new release (tap: what's new / update), ↻ HACS has
    // installed it but this screen still runs the old copy (tap: reload).
    const menuBtn = chip ? `<button class="back hb" data-kiosk title="${kiosk ? 'Menu: show Home Assistant\'s sidebar and header' : 'Full screen: hide Home Assistant\'s sidebar and header'}" aria-label="${kiosk ? 'Menu' : 'Full screen'}"><ha-icon icon="${kiosk ? 'mdi:menu' : 'mdi:fullscreen'}"></ha-icon></button>` : '';
    const updBtn = !onHome ? '' : stale ? `<button class="back hb updi" data-upd="fresh" title="HomeView ${esc(stale)} is installed, but this screen still runs ${esc(HV_VERSION)}" aria-label="Reload HomeView"><ha-icon icon="mdi:refresh"></ha-icon></button>`
      : updOn ? `<button class="back hb updi" data-upd="new" title="HomeView ${esc(updOn)} is available" aria-label="Update HomeView"><ha-icon icon="mdi:arrow-up"></ha-icon></button>` : '';
    const solo = !(nav.length > 1) && !!page.minimalHead;   // a page without a title: the icons float top right
    const barBtns = page.minimalHead ? `${updBtn}${menuBtn}` : '';
    head.classList.toggle('padr', !!(solo && barBtns));
    const topbar = nav.length > 1 || barBtns ? `<div class="topbar${solo ? ' solo' : ''}">
        <div class="nav">${nav.length > 1 && window.innerWidth < 870 ? '<button class="nv" data-sidebar title="Home Assistant menu" aria-label="Home Assistant menu"><ha-icon icon="mdi:dock-left"></ha-icon></button>' : ''}${nav.length > 1 ? nav.map((v) => `<button class="nv${v.path === here ? ' on' : ''}" data-nav-to="${esc(v.path)}" title="${esc(v.title)}">${v.avatar ? `<img class="lt" src="${esc(v.avatar)}" alt="">` : v.letter ? `<span class="lt">${esc(v.letter)}</span>` : `<ha-icon icon="${esc(v.icon)}"></ha-icon>`}<span>${esc(v.title)}</span></button>`).join('') : ''}</div>
        ${barBtns ? `<span class="tbb">${barBtns}</span>` : ''}</div>` : '';
    // edit mode's bar: on every page while editing (Widgets too, which has no title)
    const editbar = editing ? `<div class="editbar"><span><b>Editing</b> · <ha-icon icon="mdi:star-outline"></ha-icon> on Home · <ha-icon icon="mdi:resize"></ha-icon> size · <ha-icon icon="mdi:rename-outline"></ha-icon> name · <ha-icon icon="mdi:eye-off-outline"></ha-icon> hide · <ha-icon icon="mdi:palette-outline"></ha-icon> room colour · drag pills and chips to move them</span>
          <span class="eb">${canReload ? `<button class="txt" data-reload-pages title="${yamlDash ? 'Read the dashboard\'s files again — after adding or editing a page in homeview/custom_pages/' : 'Read this dashboard\'s saved config again — after editing it in the raw configuration editor'}"><ha-icon icon="mdi:file-refresh-outline"></ha-icon> Reload pages</button>` : ''}<button class="txt" data-settings><ha-icon icon="mdi:cog-outline"></ha-icon> Settings</button><button class="txt primary" data-edit-off>Done</button></span></div>` : '';
    const headIcons = iconPool(head);
    head.innerHTML = page.minimalHead ? `${topbar}${editbar}` : `${topbar}<div>
        <div class="date">${esc(today)}</div>
        <div class="title">${menuBtn}${updBtn}${page.back ? '<button class="back" data-back><ha-icon icon="mdi:chevron-left"></ha-icon></button>' : ''}<span class="tt"${titleHold || (canEdit && !editing) ? ' data-title' : ''}${titleHold ? ' data-title-hold' : ''}${canEdit && !editing ? ' title="Double-tap to edit"' : ''}>${esc(this._phone && page.greet && h.user?.name && !editing ? `Hi ${h.user.name.split(' ')[0]}` : page.title)}</span>${editing && canEdit ? '<button class="back hb" data-rename title="Rename this page" aria-label="Rename this page"><ha-icon icon="mdi:rename-outline"></ha-icon></button>' : ''}${roomSub ? `<span class="sub">${esc(roomSub)}</span>` : ''}</div>
        ${editbar}
        ${chips.length ? `<div class="chips">${chips.map((c, i) => {
          const L = looks[i], st = h.states[c.entity];
          const icon = (isActive(st) ? c.icon_on : c.icon_off) || c.icon || L.icon;
          return `<button class="chp ${L.cls}${L.busy ? ' busy' : ''}" data-chip="${i}"${L.color ? ` style="color:${esc(L.color)}"` : ''} title="${esc(c.name || st?.attributes?.friendly_name || c.entity)}">
            <i data-e="${esc(c.entity)}"${icon ? ` data-i="${esc(icon)}"` : ''}></i>${L.word ? `<b>${esc(L.word)}</b>` : ''}</button>`;
        }).join('')}</div>` : ''}
        ${people.length ? `<div class="people">${people.map((id) => {
          const st = h.states[id]; if (!st) return '';
          const pic = avatarUrl(h, id), nm = st.attributes.friendly_name || id;
          return `<div class="avatar${st.state === 'home' ? ' home' : ''}" data-more="${esc(id)}" title="${esc(nm)} · ${esc(hassState(h, st))}">${pic ? `<img src="${esc(pic)}">` : esc(nm.slice(0, 1).toUpperCase())}</div>`;
        }).join('')}</div>` : ''}
      </div>
      ${page.close ? '<button class="back xclose" data-close-page title="Close" aria-label="Close"><ha-icon icon="mdi:close"></ha-icon></button>' : ''}
      ${pills.length ? `<div class="pills">${pills.map(([id, p]) => `<button class="pill${p.alert ? ' alert' : p.tone ? ` t-${p.tone}` : p.active ? ' t-on' : ''}" data-pill="${id}"><i data-i="${esc(p.icon)}"></i>${esc(p.text)}${p.popup ? '<ha-icon icon="mdi:chevron-right" style="--mdc-icon-size:15px;opacity:.6"></ha-icon>' : ''}</button>`).join('')}</div>` : ''}`;
    head.querySelector('[data-back]')?.addEventListener('click', () => (history.length > 1 ? history.back() : navigate('living')));
    head.querySelector('[data-close-page]')?.addEventListener('click', () => (history.length > 1 ? history.back() : navigate('home')));
    fillIcons(head, h, headIcons);
    if (editing && canEdit) {
      const cb = head.querySelector('.chips'), pb = head.querySelector('.pills');
      if (cb) this._sortable(cb, '[data-chip]', 'chip', (order) => this._saveChipOrder(chips, order));
      if (pb) this._sortable(pb, '[data-pill]', 'pill', (order) => this._savePillOrder(order), (id) => {
        const [, , d] = this._pills.find(([i]) => String(i) === String(id)) || [];
        if (d?.pill === 'warnings') this._warningsSheet();   // tap the Warnings pill: edit the warnings
      });
    }
    if (!editing) head.querySelectorAll('[data-chip]').forEach((el) => {
      const c = chips[Number(el.dataset.chip)];
      bindPress(el, () => { const p = chipTap(this._hass, c, this); if (p?.catch) p.catch((e) => console.warn('HomeView chip', e)); },
        () => moreInfo(this, c.entity));
    });
    head.querySelector('[data-upd]')?.addEventListener('click', (ev) => this._updSheet(ev.currentTarget.dataset.upd, updOn, stale));
    head.querySelectorAll('[data-nav-to]').forEach((el) => el.addEventListener('click', () => navigate(el.dataset.navTo)));
    // menu mode on a phone / iPad: HA's header (and its ☰) is hidden, so the page bar opens the sidebar
    head.querySelector('[data-sidebar]')?.addEventListener('click', () => {
      const main = document.querySelector('home-assistant')?.shadowRoot?.querySelector('home-assistant-main');
      main?.dispatchEvent(new CustomEvent('hass-toggle-menu', { bubbles: true, composed: true }));
    });
    head.querySelector('[data-kiosk]')?.addEventListener('click', () => {
      setKioskWanted(!kiosk); applyKiosk(kioskMode(cfg)); this._headKey = null; this._renderHead();
      if (kiosk) openHaSidebar();   // Menu: on phones / iPads also open the sidebar, in the same tap
    });
    head.querySelector('[data-edit-off]')?.addEventListener('click', () => this._setEditing(false));
    head.querySelector('[data-settings]')?.addEventListener('click', () => this._settings());
    head.querySelector('[data-rename]')?.addEventListener('click', () => this._renamePage());
    // HA's own ⋮ → Refresh (hidden with its header): the panel reads the YAML files again, and every
    // open screen of this dashboard follows (HA's lovelace_updated)
    head.querySelector('[data-reload-pages]')?.addEventListener('click', (ev) => {
      ev.currentTarget.classList.add('busy');
      this.dispatchEvent(new CustomEvent('config-refresh', { bubbles: true, composed: true }));
    });
    // the page title: double tap = edit mode (admins; no pencil button, a clean header),
    // hold = the page its hold: names (pages_config.<page>.hold)
    const th = head.querySelector('[data-title]');
    if (th) {
      let last = 0;
      bindPress(th, () => {
        const now = Date.now();
        if (canEdit && !editing && now - last < 400) { last = 0; this._setEditing(true); return; }
        last = now;
      }, () => { if (!titleHold) return; if (navigator.vibrate) navigator.vibrate(10); navigate(titleHold); });
    }
    head.querySelectorAll('[data-more]').forEach((el) => el.addEventListener('click', () => moreInfo(this, el.dataset.more)));
    // pill tap: its sheet / details / page; hold: the page its hold: names (else the same as a tap)
    if (!editing) head.querySelectorAll('[data-pill]').forEach((el) => {
      const act = (kind) => {
        const [, p, d] = this._pills.find(([i]) => String(i) === el.dataset.pill) || [];
        if (!p || d[kind] === 'none') return;
        const link = pageLink(d[kind]) || (kind === 'tap' || !d.hold ? p.go : null);
        if (link) navigate(link);
        else if (d[kind] === 'more-info' && (p.more || d.entity)) moreInfo(this, p.more || d.entity);
        else if (p.popup) this._popup(p.popup); else if (p.more) moreInfo(this, p.more);
      };
      bindPress(el, () => act('tap'), () => act('hold'));
    });
  }

  /** The update icon's sheet: a new release (what's new / update via HA's update dialog) or a
   *  stale screen (HACS installed a newer HomeView than this screen runs: reload it). */
  _updSheet(kind, latest, installed) {
    const pop = document.createElement('div'); pop.className = 'pop';
    const sheet = document.createElement('div'); sheet.className = 'sheet narrow';
    const fresh = kind === 'fresh';
    sheet.innerHTML = `<div class="sheet-h">${fresh ? 'Reload HomeView' : 'HomeView update'}<button class="back" data-close aria-label="Close"><ha-icon icon="mdi:close"></ha-icon></button></div>
      <p class="hint">${fresh
        ? `HomeView <b>${esc(installed)}</b> is installed, but this screen still runs <b>${esc(HV_VERSION)}</b> from the browser's cache. Reload it to use the new version.`
        : `HomeView <b>${esc(latest)}</b> is available — you have <b>${esc(HV_VERSION)}</b>. See what's new, then update it right there (it's installed through HACS). Each screen reloads to the new version by itself afterwards, or tap the ↻ icon.`}</p>
      <div class="sheet-b">${fresh
        ? '<button class="txt primary" data-go><ha-icon icon="mdi:refresh"></ha-icon> Reload now</button>'
        : '<button class="txt primary" data-go><ha-icon icon="mdi:arrow-up-circle"></ha-icon> See what\'s new & update</button>'}
        <button class="txt" data-close>Later</button></div>`;
    pop.appendChild(sheet);
    const close = () => pop.remove();
    pop.addEventListener('click', (e) => { if (e.target === pop) close(); });
    sheet.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
    sheet.querySelector('[data-go]').addEventListener('click', () => {
      close();
      if (fresh) reloadFresh(); else if (this._updEnt) moreInfo(this, this._updEnt);
    });
    this._root.appendChild(pop);
  }

  /** A sheet of entity tiles. groups: [{ title, ids, tone: 'red' | 'amber' | 'off' }] puts them
   *  under headings, tinted (the batteries: low in red, offline faded …); else one grid of ids. */
  _popup({ title, ids, showRoom, groups }) {
    const h = this._hass;
    const pop = document.createElement('div'); pop.className = 'pop top';   // pill pop-ups: at the top
    const sheet = document.createElement('div'); sheet.className = 'sheet';
    sheet.innerHTML = `<div class="sheet-h">${esc(title)}<button class="back" data-close><ha-icon icon="mdi:close"></ha-icon></button></div>`;
    const TONE = {
      red: { bg: 'rgba(255,59,48,0.16)', border: 'rgba(255,59,48,0.6)', head: HV_TONES.alert },
      amber: { bg: 'rgba(255,149,0,0.14)', border: 'rgba(255,149,0,0.55)', head: HV_TONES.warn },
      off: { opacity: '0.55' },
    };
    const tiles = [];
    for (const grp of groups || [{ ids }]) {
      const tone = TONE[grp.tone] || {};
      if (grp.title) {
        const hd = document.createElement('div'); hd.className = 'pop-sec';
        hd.innerHTML = `${esc(grp.title)}<span>${grp.ids.length}</span>`;
        if (tone.head) hd.style.color = tone.head;
        sheet.appendChild(hd);
      }
      const g = document.createElement('div'); g.className = 'grid rows';
      for (const id of grp.ids) {
        const room = this._model.areaById[entityArea(h, id)];
        const t = this._tile(rowTile(id, { showRoom, areaName: room?.name }), this._dark);
        t._hvFree = true;
        if (tone.bg) { t.style.setProperty('--hv-tile', tone.bg); t.style.setProperty('--hv-tile-border', tone.border); }
        if (tone.opacity) t.style.opacity = tone.opacity;
        tiles.push(t); g.appendChild(t);
      }
      sheet.appendChild(g);
    }
    pop.appendChild(sheet);
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
  safety: 'Leaks, smoke & gas', batteries: 'Batteries', media: 'Now playing', warnings: 'Warnings (warnings:)' };

// What HomeView does when an option is not set: shown in the editor, left out when saving
const EDITOR_DEFAULTS = { theme: 'auto', pages: DEFAULT_PAGES, swipe: true, edit_button: true, update_notice: true, kiosk: true, kiosk_chip: true, avatars: 'samples', people_chips: true, battery_low: 20,
  home: { rooms: false, scenes: true, max_scenes: 8 } };

/**
 * What HomeView picks by itself right now, for the editor to show instead of blank fields (and to
 * leave out again when saving, so an untouched field stays automatic and keeps following the home).
 * onReady: called when data that loads in the background (energy settings, photo folder) arrives.
 */
function editorAuto(h, config, onReady) {
  const { type, ...o } = config || {};
  const auto = {};
  let m;
  try { m = buildModel(h, o); } catch (e) { return auto; }
  if (h.config?.location_name) auto.title = h.config.location_name;
  if (m.persons.length) auto.people = [...m.persons];
  if (m.calendars.length) auto.calendars = [...m.calendars];
  if (m.weather) auto.weather = m.weather;
  if (m.cameras.length) auto.cameras = [...m.cameras];
  auto.pills = [...DEFAULT_PILLS];
  // Home: the automatic favourites (doors first, as the Home page picks them) and chips
  const pc = o.home || {};
  const live = favoritesAuto(h, m).filter((id) => !UNAVAILABLE.includes(h.states[id]?.state));
  const doorish = (id) => ['lock', 'cover'].includes(domainOf(id));
  auto.home = {
    favorites: [...live.filter(doorish), ...live.filter((id) => !doorish(id))].slice(0, pc.max_favorites ?? 2),
    chips: chipsAuto(h, m).map((c) => c.entity),
  };
  // rooms: the order, the Living page's pick, each room's icon and sensors
  auto.room_order = m.areas.map((r) => r.id);
  const memberRooms = new Set(m.members.map((x) => x.room?.id).filter(Boolean));
  auto.living_rooms = m.rooms.filter((r) => !memberRooms.has(r.id) && !PRIVATE_ROOM.test(r.name) && !OUTDOOR_ROOM.test(r.name))
    .map((r, i) => ({ r, k: (MAIN_ROOM.test(r.name) ? 0 : 1) * 1000 + i })).sort((a, b) => a.k - b.k).map((x) => x.r.id);
  auto.rooms = {};
  for (const r of m.areas) {
    const e = {};
    if (r.icon) e.icon = r.icon;
    if (r.temp) e.temperature = r.temp;
    if (r.hum) e.humidity = r.hum;
    if (Object.keys(e).length) auto.rooms[r.id] = e;
  }
  // Widgets: the photo folder it found (or the samples)
  const folder = findPhotoFolder(h, onReady);
  auto.widgets = { slideshow_interval: 60, ...(folder !== undefined ? { slideshow: folder || 'samples' } : {}) };
  // Energy: the power sensors the Energy page picked (once the Energy settings have loaded)
  if (getEnergyPrefs(h, onReady) !== undefined) {
    try {
      const stub = { rebuild() {}, scheduleRebuild() {}, rebuilder: () => {} };
      const page = PAGES.energy(h, m, o, {}, stub);
      const p = (page.sections || []).flatMap((x) => x.tiles || []).find((t) => t.power)?.power || {};
      const en = {};
      if (p.solar) en.solar_power = p.solar;
      if (p.grid) en.grid_power = p.grid;
      if (p.battery) en.battery_power = p.battery;
      if (p.battery_level) en.battery_level = p.battery_level;
      if (p.home) en.home_power = p.home;
      if (Object.keys(en).length) auto.energy = en;
    } catch (e) { /* the Energy page shows its own note */ }
  }
  return auto;
}
/** The editor's defaults: HomeView's fixed defaults plus what it picks by itself in this home. */
function mergeDefaults(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b || {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])
      ? mergeDefaults(a[k], v) : v;
  }
  return out;
}

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

  // the fixed defaults plus what HomeView picks by itself here (shown, left out again when saving)
  _defaults() {
    if (!this._defs) {
      this._defs = mergeDefaults(EDITOR_DEFAULTS, editorAuto(this._hass, this._config, () => {
        // energy settings / photo folder arrived: show them too
        this._defs = null;
        if (this._form) this._form.data = this._data();
      }));
    }
    return this._defs;
  }

  _data() {
    const { type, ...o } = this._config;
    return withDefaults(o, this._defaults());
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
      HomeView builds every page from your areas and devices. Everything here is optional — the
      fields show what HomeView uses right now. Change one to set it yourself; leave it (or clear it)
      and it stays automatic, following your home.
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
      const config = cleanConfig(withoutDefaults({ type: this._config.type || 'custom:homeview', ...keep, ...e.detail.value }, this._defaults()));
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
    let { type, ...options } = config || {};
    // from: <dashboard> — another dashboard's settings and pages, this one's own edits on top
    if (options.from) options = (await resolveFrom(hass, options)).merged;
    // a YAML dashboard: the settings changed in the UI (kept in "<dashboard>-edits") on top
    else if (isYamlDash(hass) && options.ui_edits !== false) options = applyEdits(options, await loadEdits(hass));
    hvAvatarMode = options.avatars ?? 'samples';
    const m = buildModel(hass, options);
    // custom_pages (see custom_pages/README.md): subview: true = no place in the page bar, opened by
    // a hold (or tap) that names it, with a back arrow; admin_only: true = only viewers who see
    // every page (admins without an access rule, or access: all) — see allowed() below
    const customs = customPages(options).filter((c) => !c.bad);
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
      ...customs.filter((c) => !c.subview).map((c) => c.path).filter((p) => !wanted.includes(p))]
      .filter((p) => !customs.some((c) => c.subview && c.path === p));
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
      if (customs.some((c) => c.admin_only && c.path === path)) return rule === 'all';
      if (rule === 'all') return true;
      const mem = memberOf(path);
      if (rule === null) return mem ? own(mem) : true;                     // default for non-admins
      const set = new Set(asList(rule).map((x) => PAGE_ALIASES[x] || x));
      if (mem) return set.has(path) || set.has('all_members') || (set.has('rooms') && own(mem));
      return set.has(path) || (path === 'all_rooms' && set.has('rooms'));
    };
    // pages_config.<page>.popup: true (e.g. energy) — opened from its pill, not in the page bar or
    // the swipe order; a ✕ top right goes back to the page it was opened from
    const isPopup = (p) => !!(PAGE_DEFS[p] && pc[p]?.popup);
    const popups = allPaths.filter(allowed).filter(isPopup);
    const paths = allPaths.filter(allowed).filter((p) => !isPopup(p));
    const views = paths.map((p) => {
      const mem = m.members.find((x) => `member-${x.slug}` === p);
      if (mem) {
        return { title: pc[p]?.title || mem.name, path: p, icon: mem.room?.icon || 'mdi:account', letter: mem.name.slice(0, 1).toUpperCase(), avatar: avatarUrl(hass, mem.person), type: 'panel',
          cards: [{ type: 'custom:homeview-page', page: 'member', member: mem.person, path: p, order: paths, options }] };
      }
      const c = customs.find((x) => x.path === p);
      if (c) {
        return { title: pc[p]?.title || c.title || 'Page', path: p, icon: c.icon || 'mdi:view-grid-outline', type: 'panel',
          cards: [{ type: 'custom:homeview-page', page: 'custom', custom: c.idx, path: p, order: paths, options }] };
      }
      const pcp = pc[p] || (p === 'living' ? pc.family || pc.shared : null) || {};
      return { title: pcp.title || PAGE_DEFS[p].title, path: p, icon: pcp.icon || PAGE_DEFS[p].icon, type: 'panel',
        cards: [{ type: 'custom:homeview-page', page: p, path: p, order: paths, options }] };
    });
    const nav = views.map((v) => ({ path: v.path, title: v.title, icon: v.icon, letter: v.letter, avatar: v.avatar }));
    // a custom page's own pill (pill: { entity, name, icon, alert } or pill: true) joins Home's
    // pills for everyone the page is made for: tap = the page, hold = the entity's details
    const pagePills = customs.filter((c) => c.pill && allowed(c.path)).map((c) => ({
      ...(typeof c.pill === 'object' ? c.pill : {}), page: c.path, alerts: c.alerts,
      icon: (typeof c.pill === 'object' && c.pill.icon) || c.icon || 'mdi:view-grid-outline',
      name: typeof c.pill === 'object' && 'name' in c.pill ? c.pill.name : (c.title || c.path) }));
    views.forEach((v) => { v.cards[0].nav = nav; v.cards[0].popups = popups; v.cards[0].pagePills = pagePills; delete v.letter; delete v.avatar; });
    for (const p of popups) {
      views.push({ title: pc[p].title || PAGE_DEFS[p].title, path: p, icon: pc[p].icon || PAGE_DEFS[p].icon, subview: true, type: 'panel',
        cards: [{ type: 'custom:homeview-page', page: p, path: p, order: [], popup: true, nav, popups, options }] });
    }
    for (const c of customs.filter((x) => x.subview && allowed(x.path))) {
      views.push({ title: pc[c.path]?.title || c.title || 'Page', path: c.path, icon: c.icon || 'mdi:view-grid-outline', subview: true, type: 'panel',
        cards: [{ type: 'custom:homeview-page', page: 'custom', custom: c.idx, path: c.path, order: [], options }] });
    }
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
