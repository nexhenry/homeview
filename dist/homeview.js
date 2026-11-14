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
 * Widgets, Home, Living, a page per person (Rooms), a details page per room, Energy and Cameras. Everything is
 * optional and can be tuned in the strategy config — see README.md.
 */
const HV_VERSION = '0.9.1';
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
/**
 * desktop_layout: tablet (default) — a desktop browser window (no touch screen) at least 1000 px wide
 * lays out like a landscape tablet (the Pixel Tablet's 16 : 10) even when it's taller than wide: the
 * tile rows fit a height of at most width / 1.6, and Widgets keeps its landscape board, pinned to the
 * top. fill = the whole window height, the portrait board in a tall window (before 0.9.0).
 * Touch screens (a portrait iPad …) are never changed.
 */
const DESKTOP_RATIO = 1.6;
function desktopTablet(cfg) {
  return cfg?.desktop_layout !== 'fill' && !((navigator.maxTouchPoints || 0) > 0) && window.innerWidth >= 1000;
}
/** The screen height the layout fits rows into (see desktop_layout). */
const layoutHeight = (cfg) => (desktopTablet(cfg) ? Math.min(window.innerHeight, window.innerWidth / DESKTOP_RATIO) : window.innerHeight);

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
  'comfort', 'comfort_thermostat', 'comfort_margin', 'comfort_limits', 'screensaver', 'rows_on_screen', 'ui_edits', 'from', 'edits', 'font', 'warnings',
  'desktop_layout', 'start', 'night', 'page_dots', 'guest', 'calendar_days', 'fullscreen_button', 'location_stale_minutes'];   // energy.* : see the energy page

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
// things without a state of their own (a scene, a button, a script that isn't running) read
// "unknown" until first used: that isn't offline
const STATELESS = ['scene', 'script', 'button', 'input_button', 'event'];
/** A device that doesn't answer: it keeps its place, with an amber badge and the word "Offline". */
const isOffline = (st) => !!st && (st.state === 'unavailable' || (st.state === 'unknown' && !STATELESS.includes(st.entity_id.split('.')[0])));
// an entity Home Assistant only remembers (its device was removed, or its integration is gone): left
// out of the automatic picks; an offline device that's still there isn't (it keeps its place)
const gone = (st) => !st || (st.state === 'unavailable' && st.attributes?.restored === true);
// tile types a page file (custom_pages, sections:) may name; the others are HomeView's own parts
// and need data only HomeView's pages give them
const USER_TILE_TYPES = ['clock', 'weather', 'forecast', 'date', 'next_event', 'agenda', 'camera', 'person', 'chart',
  'button', 'fader', 'air', 'energy_now', 'energy_flow'];

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
// a value that rounds to zero prints without a sign (Intl gives -0.0004 as "-0.00": a meter that stepped back
// a little read "-0.00 kWh", a plug idling at -0.2 W "-0 W")
const fmt = (v, d = 0) => { if (v === null || v === undefined) return '—'; const n = Number(v); return numFmt(d).format(Math.abs(n) < 0.5 / 10 ** d ? 0 : n); };
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

/**
 * Coloured words (comfort grades, Offline, an alert's state, Live …) in shades that can be read: the
 * colour code's bright tones are for icons and fills; on light tiles text needs a darker shade of the
 * same hue (WCAG 4.5 : 1 on every room tint; `on` = on a lit tile, which is darker). Dark mode keeps
 * the bright tones.
 */
const TEXT_TONES = {
  //            light        on a lit tile   dark
  ok:        ['#1B7030', '#175E28', '#34C759'],
  warn:      ['#9A4C00', '#824000', '#FF9500'],
  cool:      ['#006897', '#00577F', '#32ADE6'],
  alert:     ['#C70013', '#A90010', '#FF3B30'],
  humid:     ['#006C7C', '#005B68', '#30B0C7'],
  dry:       ['#815B00', '#6C4C00', '#C69C3E'],
  'too-humid': ['#514FD4', '#3C3ACF', '#5856D6'],
  'too-cold':  ['#0058B0', '#0051A2', '#007AFF'],
  'too-dry':   ['#8C5526', '#764720', '#A0612B'],
};
const txVar = (k) => `var(--hv-${k}-tx, ${TEXT_TONES[k][2]})`;
function textTones(dark) {
  const out = {};
  for (const [k, [l, on, d]] of Object.entries(TEXT_TONES)) { out[`--hv-${k}-tx`] = dark ? d : l; out[`--hv-${k}-tx-on`] = dark ? d : on; }
  // a filled red pill / chip with white text: 5.4 : 1 in light mode (dark mode as before)
  out['--hv-alert-fill'] = dark ? '#FF3B30' : '#D70015';
  // icons: "on" a warm yellow, "needs a look" a deeper amber in light mode, so they read apart
  // (1.77 : 1; they were 1.07); the offline badge's fill: 3.4 : 1 or more against any tile, its "!" 4.7 : 1
  out['--hv-on-ic'] = '#FFB800';
  out['--hv-warn-ic'] = dark ? '#FF9500' : '#E07800';
  out['--hv-badge'] = dark ? '#FF9500' : '#B85A00';
  out['--hv-badge-fg'] = dark ? '#1C1C1E' : '#FFFFFF';
  return out;
}

/** "r, g, b" (0–255) for hsl(h s% l%): Home Assistant's --rgb-* variables. */
function hslTriple(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map((n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))))).join(', ');
}
/** The palette's solid colours that Home Assistant's theme variables are made from (HA_VARS). */
function haBase(h, dark, sat) {
  const [fg, fg2, tile, acc] = dark ? [[15, 93], [8, 62], [10 * sat, 16], [82, 62]] : [[25, 16], [14, 36], [26 * sat, 89.5], [78, 50]];
  return {
    '--hv-bg-solid': dark ? `hsl(${h} ${18 * sat}% 8%)` : `hsl(${h} ${60 * sat}% 96.5%)`,
    '--hv-fg3': dark ? `hsl(${h} 6% 44%)` : `hsl(${h} 10% 56%)`,
    '--hv-fg-rgb': hslTriple(h, ...fg), '--hv-fg2-rgb': hslTriple(h, ...fg2), '--hv-tile-rgb': hslTriple(h, ...tile),
    '--hv-accent-rgb': hslTriple(h, ...acc),
    '--hv-on-accent': dark ? `hsl(${h} 30% 12%)` : '#fff',
  };
}

/**
 * Home Assistant's theme variables, made from HomeView's palette, so HA's own elements on a page —
 * embedded cards (charts, the energy cards' tables, buttons and chips), the settings form — follow
 * HomeView's mode (light, dark, night) whatever HA's theme is. Set on the page and again on each
 * card's box (a section or room with its own tint gets its own). HA declares its aliases
 * (--mdc-theme-surface: var(--card-background-color) …) on <html>, where they're already resolved
 * to HA's colours, so the aliases are declared here again too. Cards: rows and table backgrounds are
 * the card's own colour (no alternating rows).
 */
const HA_VARS = [
  '--primary-background-color:var(--hv-bg-solid)', '--secondary-background-color:var(--hv-pill)', '--clear-background-color:var(--hv-bg-solid)',
  '--card-background-color:var(--hv-tile)', '--ha-card-background:var(--hv-tile)', '--rgb-card-background-color:var(--hv-tile-rgb)',
  '--primary-text-color:var(--hv-fg)', '--secondary-text-color:var(--hv-fg2)', '--disabled-text-color:var(--hv-fg3)',
  '--rgb-primary-text-color:var(--hv-fg-rgb)', '--rgb-secondary-text-color:var(--hv-fg2-rgb)',
  '--ha-color-text-primary:var(--hv-fg)', '--ha-color-text-secondary:var(--hv-fg2)', '--ha-color-text-disabled:var(--hv-fg3)',
  '--primary-color:var(--hv-accent)', '--rgb-primary-color:var(--hv-accent-rgb)', '--text-primary-color:var(--hv-on-accent)',
  '--light-primary-color:color-mix(in srgb, var(--hv-accent) 35%, var(--hv-tile))', '--state-icon-color:var(--hv-icon)',
  '--divider-color:var(--hv-line)', '--outline-color:var(--hv-line)', '--outline-hover-color:color-mix(in srgb, var(--hv-fg) 24%, transparent)',
  '--table-header-background-color:var(--hv-tile)', '--table-row-background-color:var(--hv-tile)',
  '--table-row-alternative-background-color:var(--hv-tile)', '--data-table-background-color:var(--hv-tile)', '--data-table-border-width:0',
  '--markdown-code-background-color:var(--hv-pill)',
  '--input-fill-color:color-mix(in srgb, var(--hv-fg) 6%, transparent)', '--input-disabled-fill-color:color-mix(in srgb, var(--hv-fg) 3%, transparent)',
  '--input-ink-color:var(--hv-fg)', '--input-label-ink-color:var(--hv-fg2)', '--input-disabled-ink-color:var(--hv-fg3)',
  '--input-dropdown-icon-color:var(--hv-fg2)', '--input-idle-line-color:color-mix(in srgb, var(--hv-fg) 42%, transparent)',
  '--input-hover-line-color:var(--hv-fg)', '--input-disabled-line-color:color-mix(in srgb, var(--hv-fg) 6%, transparent)',
  '--input-outlined-idle-border-color:color-mix(in srgb, var(--hv-fg) 38%, transparent)', '--input-outlined-hover-border-color:var(--hv-fg)',
  '--input-outlined-disabled-border-color:color-mix(in srgb, var(--hv-fg) 6%, transparent)',
  // Home Assistant's aliases of the above
  ...Object.entries({
    'mdc-theme-primary': 'primary-color', 'mdc-theme-background': 'primary-background-color', 'mdc-theme-surface': 'card-background-color',
    'mdc-theme-on-primary': 'text-primary-color', 'mdc-theme-on-secondary': 'text-primary-color', 'mdc-theme-on-surface': 'primary-text-color',
    'mdc-theme-text-primary-on-background': 'primary-text-color', 'mdc-theme-text-secondary-on-background': 'secondary-text-color',
    'mdc-theme-text-hint-on-background': 'secondary-text-color', 'mdc-theme-text-icon-on-background': 'secondary-text-color',
    'mdc-theme-text-disabled-on-light': 'disabled-text-color', 'mdc-checkbox-disabled-color': 'disabled-text-color',
    'mdc-radio-disabled-color': 'disabled-text-color', 'mdc-tab-text-label-color-default': 'primary-text-color',
    'mdc-button-disabled-ink-color': 'disabled-text-color', 'mdc-button-outline-color': 'outline-color',
    'mdc-dialog-scroll-divider-color': 'divider-color', 'mdc-dialog-heading-ink-color': 'primary-text-color',
    'mdc-dialog-content-ink-color': 'primary-text-color', 'slider-color': 'primary-color', 'slider-secondary-color': 'light-primary-color',
    'label-badge-background-color': 'card-background-color', 'state-unavailable-color': 'disabled-text-color',
    ...Object.fromEntries(['text-field', 'select'].flatMap((f) => [
      [`mdc-${f}-idle-line-color`, 'input-idle-line-color'], [`mdc-${f}-hover-line-color`, 'input-hover-line-color'],
      [`mdc-${f}-outlined-idle-border-color`, 'input-outlined-idle-border-color'], [`mdc-${f}-outlined-hover-border-color`, 'input-outlined-hover-border-color'],
      [`mdc-${f}-outlined-disabled-border-color`, 'input-outlined-disabled-border-color'], [`mdc-${f}-fill-color`, 'input-fill-color'],
      [`mdc-${f}-disabled-fill-color`, 'input-disabled-fill-color'], [`mdc-${f}-ink-color`, 'input-ink-color'],
      [`mdc-${f}-label-ink-color`, 'input-label-ink-color'], [`mdc-${f}-disabled-ink-color`, 'input-disabled-ink-color']])),
    'mdc-text-field-disabled-line-color': 'input-disabled-line-color', 'mdc-select-dropdown-icon-color': 'input-dropdown-icon-color',
    'mdc-select-disabled-dropdown-icon-color': 'input-disabled-ink-color',
  }).map(([k, v]) => `--${k}:var(--${v})`),
  '--mdc-checkbox-unchecked-color:rgba(var(--rgb-primary-text-color), .54)', '--mdc-radio-unchecked-color:rgba(var(--rgb-primary-text-color), .54)',
  '--ha-assist-chip-filled-container-color:rgba(var(--rgb-primary-text-color), .15)',
  '--ha-assist-chip-active-container-color:rgba(var(--rgb-primary-color), .15)', '--chip-background-color:rgba(var(--rgb-primary-text-color), .15)',
  '--label-badge-text-color:rgba(var(--rgb-primary-text-color), .8)', '--bar-box-shadow:0 2px 12px var(--shadow-color)',
  // Web Awesome's colours (HA's newer buttons and chips, e.g. Energy's "Now") from HA's tokens
  ...['brand', 'neutral', 'success', 'warning', 'danger'].flatMap((w) => {
    const c = w === 'brand' ? 'primary' : w;
    return [`fill-loud:var(--ha-color-fill-${c}-loud-resting)`, `fill-normal:var(--ha-color-fill-${c}-normal-resting)`,
      `fill-quiet:var(--ha-color-fill-${c}-quiet-hover)`, `border-loud:var(--ha-color-border-${c}-loud)`,
      `border-normal:var(${w === 'brand' ? '--ha-color-primary-50' : `--ha-color-border-${c}-normal`})`, `border-quiet:var(--ha-color-border-${c}-quiet)`,
      ...['loud', 'normal', 'quiet'].map((k) => `on-${k}:var(--ha-color-on-${c}-${k})`)].map((x) => `--wa-color-${w}-${x}`);
  }),
  '--wa-color-text-quiet:var(--ha-color-text-secondary)', '--wa-color-text-normal:var(--primary-text-color)',
  '--wa-color-surface-default:var(--card-background-color)', '--wa-color-surface-raised:var(--ha-dialog-surface-background, var(--mdc-theme-surface, #fff))',
  '--wa-color-surface-border:var(--ha-color-border-neutral-quiet)', '--wa-form-control-background-color:var(--wa-color-surface-raised)',
  '--wa-form-control-border-color:var(--ha-color-border-neutral-quiet)', '--wa-form-control-value-color:var(--primary-text-color)',
  '--wa-form-control-placeholder-color:var(--ha-color-text-secondary)',
].join(';');

/**
 * Home Assistant's design tokens (--ha-color-fill-…, -on-…, -border-…, -surface-…, as of HA 2026.10)
 * for HomeView's mode: which step of HA's colour scales each uses in light or dark. HA switches them
 * on <html> by its own theme; a HomeView page in another mode (night on a light HA) needs its own.
 * The primary scale is the page's accent (haPrimary), so HA's buttons and chips take HomeView's
 * colour.
 */
function haTokens(dark) {
  const o = [];
  const v = (k, x) => o.push(`--ha-color-${k}:var(--ha-color-${x})`);
  const step = (n) => String(n).padStart(2, '0');
  const scale = { primary: 'primary', neutral: 'neutral', danger: 'red', warning: 'orange', success: 'green' };
  const states = ['resting', 'hover', 'active'];
  for (const [c, sc] of Object.entries(scale)) {
    const quiet = dark ? [5, 10, c === 'neutral' ? 0 : 5] : [95, 90, 95], normal = dark ? [10, 20, 10] : [90, 80, 90];
    const loud = c === 'primary' ? [40, 30, 40] : c === 'neutral' ? (dark ? [60, 70, 60] : [40, 30, 40])
      : dark ? [40, 30, 40] : c === 'warning' ? [70, 50, 70] : [50, 40, 50];
    states.forEach((st, i) => { v(`fill-${c}-quiet-${st}`, `${sc}-${step(quiet[i])}`); v(`fill-${c}-normal-${st}`, `${sc}-${step(normal[i])}`); v(`fill-${c}-loud-${st}`, `${sc}-${step(loud[i])}`); });
    // text on HA's primary fills (the scale is the page's hue): a step further from the fill than HA's
    // own (its light 40 / 50 read about 3 : 1 on its 90 / 95 fills, a blue 60 on 10 about 3 : 1);
    // these read 4.2 : 1 (yellow) to 13 : 1 in light, 5.8 : 1 or more in dark
    const onP = c === 'primary' ? (dark ? [70, 70] : [30, 30]) : dark ? [70, 60] : [50, 40];
    v(`on-${c}-quiet`, `${sc}-${onP[0]}`); v(`on-${c}-normal`, `${sc}-${onP[1]}`);
  }
  [['quiet', [95, 90], [10, 20]], ['normal', [95, 90], [20, 30]], ['loud', [80, 70], [30, 40]]].forEach(([k, l, d]) => {
    v(`fill-disabled-${k}-resting`, `neutral-${step((dark ? d : l)[0])}`); v(`fill-disabled-${k}-hover`, `neutral-${step((dark ? d : l)[1])}`);
  });
  v('on-disabled-quiet', `neutral-${dark ? 40 : 80}`); v('on-disabled-normal', `neutral-${dark ? 50 : 70}`); v('on-disabled-loud', `neutral-${dark ? 50 : 95}`);
  v('border-neutral-quiet', `neutral-${dark ? 40 : 90}`); v('border-neutral-normal', `neutral-${dark ? 50 : 60}`); v('border-neutral-loud', `neutral-${dark ? 70 : 40}`);
  for (const sc of ['red', 'orange']) { const k = sc === 'red' ? 'danger' : 'warning'; v(`border-${k}-normal`, `${sc}-${dark ? 50 : 70}`); v(`border-${k}-loud`, `${sc}-${dark ? 50 : 40}`); }
  v('border-primary-quiet', 'primary-90'); v('border-primary-normal', 'primary-70'); v('border-primary-loud', 'primary-40');
  v('text-link', `primary-${dark ? 60 : 40}`);
  v('text-primary-inverted', dark ? 'black' : 'white'); v('text-secondary-inverted', `neutral-${dark ? 40 : 20}`);
  v('surface-default', dark ? 'neutral-10' : 'white'); v('surface-low', dark ? 'neutral-05' : 'neutral-95'); v('surface-lower', dark ? 'black' : 'neutral-90');
  v('surface-default-inverted', dark ? 'white' : 'neutral-10'); v('surface-low-inverted', dark ? 'neutral-95' : 'neutral-05');
  v('surface-lower-inverted', dark ? 'neutral-90' : 'black'); v('on-surface-default', dark ? 'neutral-95' : 'neutral-05');
  v('form-background', `neutral-${dark ? 20 : 95}`); v('form-background-hover', `neutral-${dark ? 30 : 90}`); v('form-background-disabled', `neutral-${dark ? 20 : 80}`);
  // the rest of HA's dark set that a card can show
  o.push(dark ? '--shadow-color:#0000007a;--scrollbar-thumb-color:#6e6e6e;--disabled-color:#464646;--energy-grid-return-color:#a280db;--map-filter:invert(.9) hue-rotate(170deg) brightness(1.5) contrast(1.2) saturate(.3)'
    : '--shadow-color:#00000029;--scrollbar-thumb-color:#c2c2c2;--disabled-color:#bdbdbd;--energy-grid-return-color:#8353d1;--map-filter:none');
  o.push(dark ? '--ha-box-shadow-s:0 1px 2px 0 #0006, 0 1px 3px 0 #00000080;--ha-box-shadow-m:0 3px 6px -1px #00000059, 0 8px 16px -2px #00000073;--ha-box-shadow-l:0 6px 12px -3px #0006, 0 16px 32px -6px #0000008c'
    : '--ha-box-shadow-s:0 1px 2px 0 #00000014, 0 1px 3px 0 #0000001f;--ha-box-shadow-m:0 3px 6px -1px #0000001a, 0 8px 16px -2px #00000026;--ha-box-shadow-l:0 6px 12px -3px #0000001f, 0 16px 32px -6px #0003');
  return o.join(';');
}
/** HA's primary colour scale (--ha-color-primary-05 … 95, the lightness of HA's own blue) in the
 *  page's accent hue: on the page root, under the tokens above. */
function haPrimary(h, sat = 1) {
  const L = { '05': 6.5, 10: 12, 20: 17, 30: 26.5, 40: 39, 50: 52, 60: 61, 70: 73, 80: 86, 90: 93, 95: 96.5 };
  return Object.fromEntries(Object.entries(L).map(([k, l]) => [`--ha-color-primary-${k}`, `hsl(${h} ${Math.round(85 * Math.min(1, sat))}% ${l}%)`]));
}

/** CSS variables for one tint (page or room). */
function palette(h, dark, sat = 1) {
  if (!dark) {
    return {
      '--hv-bg': `linear-gradient(180deg, hsl(${h} ${70 * sat}% 98.5%) 0%, hsl(${h} ${50 * sat}% 94.5%) 100%)`,
      // off: recessed; on: bright, lifted by a shadow (Apple Home: dim off, bright on) — the two
      // backgrounds 1.18–1.28 : 1 apart on every hue (they were 1.00–1.35, the same in a green room)
      '--hv-tile': `hsl(${h} ${26 * sat}% 89.5%)`,
      '--hv-tile-border': `hsla(${h}, 40%, 25%, 0.08)`,
      '--hv-tile-on': `hsl(${h} ${60 * sat}% 98.5%)`,
      '--hv-on-shadow': '0 2px 10px rgba(60,40,20,.12)',
      // an alert (open, unlocked, a leak) is a red-tinted tile, never the bright "on" one
      '--hv-alert-tile': `color-mix(in srgb, #D70015 12%, hsl(${h} ${26 * sat}% 89.5%))`,
      '--hv-icon': `hsl(${h} ${18 * sat}% 42%)`,
      '--hv-fg': `hsl(${h} 25% 16%)`,
      // state words and secondary text: 4.5 : 1 on every tile tint (was 46 %: 3.5 : 1)
      '--hv-fg2': `hsl(${h} 14% 36%)`,
      '--hv-on-fg': `hsl(${h} 65% 26%)`,
      '--hv-on-fg2': `hsl(${h} 50% 29%)`,
      '--hv-accent': `hsl(${h} 78% 50%)`,
      '--hv-pill': `hsl(${h} ${32 * sat}% 90%)`,
      '--hv-line': `hsla(${h}, 30%, 25%, 0.14)`,
      '--hv-card': '#ffffff',
      ...textTones(false),
      ...haBase(h, false, sat),
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
    ...textTones(true),
    ...haBase(h, true, sat),
  };
}
const styleVars = (vars) => Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';');
/**
 * A tile's or section's own tint as an inline style, made once per hue: the palette without the text
 * shades (textTones), which are the same for every hue and come from the page. A page of rooms asked
 * for a full palette 20+ times per build, ~50 variables each, and every tile carried them all.
 */
const TONE_KEYS = new Set(Object.keys(textTones(false)));
const _hueStyles = new Map();
function hueStyle(h, dark, night = false) {
  const k = `${h}|${!!dark}|${!!night}`;
  let s = _hueStyles.get(k);
  if (s === undefined) {
    const p = night ? nightPalette(1) : palette(h, dark);
    s = Object.entries(p).filter(([key]) => !TONE_KEYS.has(key)).map(([key, v]) => `${key}:${v}`).join(';');
    if (_hueStyles.size > 500) _hueStyles.clear();
    _hueStyles.set(k, s);
  }
  return s;
}

/**
 * night: the night face (a wall tablet in a dark room): the dark palette in warm, quieter colours,
 * photos dimmed, a black screensaver with a dim clock, and Widgets' "Up next" swapped for "Tonight"
 * (alarm, locks, doors, tomorrow's first event). It turns on with
 *   <entity>                    while it's on (an input_boolean, a binary_sensor …)
 *   auto                        the sun is down and it's 9 pm or later (until sunrise)
 *   { from: '21:30', to: '06:30' }  every day between those times
 * Off (default): false or not set.
 */
function isNight(hass, cfg) {
  const n = cfg?.night;
  if (!n) return false;
  const d = new Date(), now = d.getHours() * 60 + d.getMinutes();
  if (n === 'auto') return hass?.states?.['sun.sun']?.state === 'below_horizon' && (now >= 21 * 60 || now < 12 * 60);
  if (typeof n === 'string') return ['on', 'true'].includes(String(hass?.states?.[n]?.state).toLowerCase());
  if (isObj(n)) {
    const mins = (t) => { const m = String(t ?? '').match(/^(\d{1,2}):(\d{2})/); return m ? Number(m[1]) * 60 + Number(m[2]) : null; };
    const a = mins(n.from), b = mins(n.to);
    if (a === null || b === null || a === b) return false;
    return a < b ? now >= a && now < b : now >= a || now < b;
  }
  return false;
}
/** The night face's palette: dark, every tint warm (hue 28) and quieter (saturation × 0.6). */
const nightPalette = (sat = 1) => palette(28, true, sat * 0.6);

/**
 * start: the page a session opens on, per kind of screen: { phone: home, tablet: widgets } or one page
 * for every screen (start: home). Default: phones open on Home (the controls), tablets and browsers
 * on the first page (Widgets, the ambient face). Only on the first HomeView page of a browser
 * session, and only when that's the dashboard's first page: a link to another page is kept.
 */
function startPage(cfg, phone) {
  const st = cfg?.start;
  if (typeof st === 'string') return st;
  const o = isObj(st) ? st : {};
  return (phone ? o.phone ?? 'home' : o.tablet) || null;
}

/**
 * guest: the guest view — a shared screen (the wall tablet) while guests are over shows the house,
 * not the family: no person pages, People, Cameras or admin-only pages (out of the swipe order, the
 * dots and the page bar; a link to one goes to Home), no camera, person or calendar tiles, no people
 * on Home; Widgets shows the clock, the weather and (unless set) the sample photos instead of the
 * agenda and the family's photos. The house's controls, scenes, weather and the Energy pill stay. A
 * "Guest" label in the header says why. Hiding isn't security (README → Who sees which pages).
 *   guest: input_boolean.guests_here       while it's on, on every screen but admins'
 *   guest: { entity, screens: [person.wall_tablet, Kitchen iPad], hide: [media], slideshow: <folder> | false }
 *     screens: only these logins (a person entity or a login's name; admins too when listed);
 *     without entity: those screens always show the guest view. hide: more pages to hide.
 */
const guestOpts = (cfg) => { const g = cfg?.guest; return typeof g === 'string' && g ? { entity: g } : isObj(g) ? g : null; };
function isGuest(hass, cfg) {
  const g = guestOpts(cfg);
  if (!g) return false;
  const me = hass?.user || {};
  if (g.screens !== undefined) {
    const mine = Object.keys(hass?.states || {}).filter((id) => id.startsWith('person.') && hass.states[id].attributes?.user_id === me.id);
    const name = String(me.name || '').toLowerCase();
    if (!asList(g.screens).some((k) => mine.includes(k) || String(k).toLowerCase() === name)) return false;
  } else if (me.is_admin) return false;
  if (!g.entity) return g.screens !== undefined;   // no entity: always, but only on the screens listed
  return ['on', 'true'].includes(String(hass?.states?.[g.entity]?.state).toLowerCase());
}
/** A page the guest view leaves out: person pages, People, Cameras, admin-only pages, guest.hide. */
function guestHidden(path, cfg) {
  if (!path) return false;
  if (/^member-/.test(path) || ['people', 'cameras', 'rooms'].includes(path)) return true;
  if (customPages(cfg).some((c) => c.admin_only && c.path === path)) return true;
  return asList(guestOpts(cfg)?.hide).includes(path);
}
// tiles the guest view leaves out on every page: cameras, people, calendars
const GUEST_HIDDEN_TILES = ['camera', 'person', 'next_event', 'agenda'];

function isDark(hass, cfg) {
  if (isNight(hass, cfg)) return true;
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
  let changed = false;
  for (const [k, css] of Object.entries(KIOSK_CSS)) {
    const sr = roots[k];
    if (!sr) continue;
    let st = sr.querySelector(`#${KIOSK_ID}`);
    if (kioskWants(on, k)) {
      if (!st) { st = document.createElement('style'); st.id = KIOSK_ID; sr.appendChild(st); changed = true; }
      if (st.textContent !== css) { st.textContent = css; changed = true; }
    } else if (st) { st.remove(); changed = true; }
  }
  // HA lays itself out again on a resize: only when the header / sidebar really came or went (this
  // runs every few seconds as a check; a resize each time made every open page lay out again)
  if (changed && !quiet) window.dispatchEvent(new Event('resize'));
  return changed;
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
 * Keep the scroll position across a rebuild: an edit, a registry change, or Home Assistant replacing
 * the page after it built the dashboard again — each used to jump back to the top. keepScroll()
 * before the change, restoreScroll() after each rebuild — a few times, as tiles take their size.
 * While a restore is under way the page may be shorter for a moment, so a keepScroll() then keeps the
 * position it's restoring; scrolling, a wheel, a key or a touch ends it (you're somewhere else now).
 */
let hvScrollKeep = null;
let hvScrollY = 0;   // the window's scroll position at the last scroll event (HomeViewPage.connectedCallback)
function keepScroll(y) {
  const k = hvScrollKeep;
  if (k && k.until > Date.now() && k.path === location.pathname) return;
  hvScrollKeep = { path: location.pathname, y: y ?? window.scrollY, at: Date.now() };
}
const SCROLL_INPUT = ['wheel', 'touchmove', 'keydown', 'pointerdown'];
function restoreScroll() {
  const k = hvScrollKeep;
  if (!k || k.path !== location.pathname || Date.now() - k.at > 15000) return;
  if (!k.y) { hvScrollKeep = null; return; }
  k.until = Date.now() + 2500;
  const off = () => SCROLL_INPUT.forEach((t) => window.removeEventListener(t, stop, true));
  const stop = () => { if (hvScrollKeep === k) hvScrollKeep = null; off(); };
  SCROLL_INPUT.forEach((t) => window.addEventListener(t, stop, { capture: true, passive: true }));
  for (const ms of [0, 60, 200, 500, 1000, 1800]) {
    setTimeout(() => { if (hvScrollKeep === k && Math.abs(window.scrollY - k.y) > 2) window.scrollTo(0, k.y); }, ms);
  }
  setTimeout(() => { if (hvScrollKeep === k) hvScrollKeep = null; off(); }, 2500);
}
/**
 * On phones and iPads HA's sidebar is a drawer behind its own ☰: after Menu shows the header,
 * open the drawer too, so Settings, the integrations' panels and the profile are one tap away.
 * (A wide screen docks the sidebar, which comes back with the header.)
 */
/**
 * Screensaver: a big analog clock that fills the screen after a while without a touch — for a
 * wall tablet (after a hand-made HomeView's WallPanel clock). Built in, no plugin.
 * screensaver: auto (default) = touch tablets only (a touch screen whose smaller side is ≥ 600
 * px), never phones or desktops | true | false | { idle: 120, pages: [...], color: '#4D7DB8' }.
 * Not on Cameras or while editing. Any touch closes it, and that touch doesn't reach the page.
 */
const hvScreensaver = (() => {
  let enabled = false, idleMs = 120e3, color = '#4D7DB8', last = Date.now(), el = null, blockUntil = 0, timer = null, minute = null, night = false;
  const now = () => Date.now();
  const wake = () => { last = now(); };
  const clockSvg = () => {
    const d = new Date();
    const sec = d.getHours() % 12 * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;
    // fills the screen either way up: landscape grows the drawing wider, portrait taller (the
    // clock itself stays 100 × 100 in the middle — nothing is cropped off the sides)
    const ar = (window.innerWidth || 1180) / (window.innerHeight || 820);
    const W = Math.max(100, 100 * ar), H = Math.max(100, 100 / ar), cx = W / 2, cy = H / 2;
    // the night face: black, a dim warm clock, no seconds hand (nothing bright in a dark room)
    const ink = night ? '#5A524A' : '#0B0B0C', handC = night ? '#5A524A' : '#FFF', bg = night ? '#000' : color;
    // reduce motion: the hands stand still and move once a minute (the face is redrawn every minute)
    const still = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const num = (t, x, y) => `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" fill="${ink}" font-size="56" font-weight="300" letter-spacing="-3">${t}</text>`;
    const spin = (period) => (still ? `transform-origin:${cx}px ${cy}px;transform:rotate(${((sec % period) / period * 360).toFixed(2)}deg)`
      : `transform-origin:${cx}px ${cy}px;animation:hvss ${period}s linear infinite;animation-delay:-${(sec % period).toFixed(2)}s`);
    const hand = (len, w, period) => `<g style="${spin(period)}"><line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 6}" stroke="${handC}" stroke-width="1.3" stroke-linecap="round"/><line x1="${cx}" y1="${cy - 6}" x2="${cx}" y2="${cy - len}" stroke="${handC}" stroke-width="${w}" stroke-linecap="round"/></g>`;
    const wd = d.toLocaleDateString(hvHass?.locale?.language, { weekday: 'short' }).toUpperCase();
    const dx = Math.min(36, 30 + (W - 100) * 0.15);
    return `<svg viewBox="0 0 ${W.toFixed(2)} ${H.toFixed(2)}" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%;display:block;font-family:${FONT}">
      <style>@keyframes hvss{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}</style>
      <rect x="0" y="0" width="${W}" height="${H}" fill="${bg}"/>
      ${num('12', cx, cy - 25)}${num('9', cx - dx, cy + 1)}${num('3', cx + dx, cy + 1)}${num('6', cx + 2, cy + 27)}
      <text x="5" y="${(H - 6).toFixed(2)}" fill="${night ? '#3E3934' : '#0B0B0C'}" font-size="4.6" font-weight="700" letter-spacing="0.2">${esc(wd)} ${d.getDate()}</text>
      <g style="filter:drop-shadow(0 0.4px 0.8px rgba(0,0,0,0.35))">${hand(25, 3.2, 43200)}${hand(39, 3.2, 3600)}</g>
      ${night || still ? '' : `<g style="${spin(60)}"><line x1="${cx}" y1="${cy + 8}" x2="${cx}" y2="3" stroke="#FFF" stroke-width="0.45" stroke-linecap="round"/></g>`}
      <circle cx="${cx}" cy="${cy}" r="2.1" fill="${handC}"/><circle cx="${cx}" cy="${cy}" r="0.9" fill="${bg}"/></svg>`;
  };
  const hide = () => {
    if (!el) return;
    el.remove(); el = null; clearTimeout(minute); minute = null; wake();
  };
  const show = () => {
    if (el) return;
    el = document.createElement('div');
    el.id = 'homeview-screensaver';
    // reduce motion: no 2 s fade in, it's simply there
    const still = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    el.style.cssText = `position:fixed;inset:0;z-index:2147483000;opacity:${still ? 1 : 0};${still ? '' : 'transition:opacity 2s;'}cursor:none;touch-action:none`;
    el.innerHTML = clockSvg();
    // the touch that closes it must not press what's underneath
    const close = (e) => { e.preventDefault(); e.stopPropagation(); blockUntil = now() + 700; hide(); };
    el.addEventListener('pointerdown', close, { capture: true });
    el.addEventListener('touchstart', close, { capture: true, passive: false });
    document.body.appendChild(el);
    requestAnimationFrame(() => { if (el) el.style.opacity = '1'; });
    // redrawn on each new minute (the date; with reduce motion the hands too, which then stand still
    // between minutes — on the minute, not up to a minute late); otherwise the hands run by themselves
    const next = () => 60e3 - (Date.now() % 60e3) + 50;
    const redraw = () => { if (!el) return; el.innerHTML = clockSvg(); minute = setTimeout(redraw, next()); };
    minute = setTimeout(redraw, next());
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
      const n = !!o && isNight(hvHass || page?._hass, o);
      if (n !== night) { night = n; if (el) el.innerHTML = clockSvg(); }
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
/** a > b for x.y.z versions (a suffix such as -dev doesn't count: a dev copy of 0.8.20 isn't older
 *  than 0.8.20 — it read as NaN, so every dev copy showed the "older copy cached" icon) */
const newerVer = (a, b) => {
  const pa = a.split('.').map((x) => parseInt(x, 10)), pb = b.split('.').map((x) => parseInt(x, 10));
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
};

/** Navigate inside the dashboard (path relative to the dashboard URL). */
function navigate(path, replace = false) {
  const base = '/' + location.pathname.split('/')[1];
  const url = path.startsWith('/') ? path : `${base}/${path}`;
  // a page HomeView opens remembers where from: its ✕ goes back there (see _closePage)
  if (replace) history.replaceState(null, '', url); else history.pushState({ hvFrom: location.pathname }, '', url);
  window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace } }));
}

function moreInfo(node, entityId) {
  node.dispatchEvent(new CustomEvent('hass-more-info', { detail: { entityId }, bubbles: true, composed: true }));
}

/**
 * HomeView's own "are you sure?" sheet instead of the browser's confirm() (a kiosk browser can block
 * that, and it says nothing about the device). from: the tile / page asking. Resolves true / false.
 *   { title: 'Unlock Front Door?', body: 'Locked · Entry · since 7:12 PM', action: 'Unlock', tone: 'alert' | 'ok' }
 * Tap outside, Cancel or Esc = no; Enter = the action. Taps in the first moment after it opens don't
 * count (a phone's late click from the tap that opened it must not press a button in it).
 */
function hvConfirm(from, { title, body = '', action = 'OK', tone = null }) {
  let page = from;
  while (page && !page._hvPage) page = page.getRootNode?.()?.host || null;
  if (!page?._root) return Promise.resolve(window.confirm(title));
  return new Promise((resolve) => {
    const pop = document.createElement('div'); pop.className = 'pop cf';
    pop.innerHTML = `<div class="sheet narrow confirm" role="alertdialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="cf-t">${esc(title)}</div>${body ? `<div class="cf-b">${esc(body)}</div>` : ''}
      <div class="cf-a"><button class="cf-btn" data-no>Cancel</button><button class="cf-btn go${tone ? ` t-${tone}` : ''}" data-yes>${esc(action)}</button></div></div>`;
    const opened = Date.now(), live = () => Date.now() - opened > 450;
    let done = false;
    const end = (v) => { if (done) return; done = true; pop.remove(); window.removeEventListener('keydown', key, true); resolve(v); };
    const key = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(false); }
      else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); end(e.composedPath?.()[0]?.dataset?.no === undefined); }
    };
    pop.addEventListener('click', (e) => { if (e.target === pop && live()) end(false); });
    pop.querySelector('[data-no]').addEventListener('click', () => { if (live()) end(false); });
    pop.querySelector('[data-yes]').addEventListener('click', () => { if (live()) end(true); });
    window.addEventListener('keydown', key, true);
    page._root.appendChild(pop);
    pop.querySelector('[data-no]').focus?.({ preventScroll: true });
  });
}
/**
 * HomeView's own "type a name" sheet instead of the browser's prompt() (blocked by some kiosk
 * browsers, and foreign-looking): { title, value, hint, placeholder, action }. Resolves the text
 * (trimmed; '' = back to the automatic name) or null. Enter saves, Esc / Cancel / a tap outside don't.
 */
function hvPrompt(from, { title, value = '', hint = '', placeholder = '', action = 'Save' }) {
  let page = from;
  while (page && !page._hvPage) page = page.getRootNode?.()?.host || null;
  if (!page?._root) { const v = window.prompt(title, value); return Promise.resolve(v === null ? null : v.trim()); }
  return new Promise((resolve) => {
    const pop = document.createElement('div'); pop.className = 'pop cf';
    pop.innerHTML = `<div class="sheet narrow confirm" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="cf-t">${esc(title)}</div>
      <input class="cf-in" type="text" enterkeyhint="done" autocomplete="off" spellcheck="false" value="${esc(value)}" placeholder="${esc(placeholder)}" aria-label="${esc(title)}">
      ${hint ? `<div class="cf-b">${esc(hint)}</div>` : ''}
      <div class="cf-a"><button class="cf-btn" data-no>Cancel</button><button class="cf-btn go" data-yes>${esc(action)}</button></div></div>`;
    const input = pop.querySelector('.cf-in');
    const opened = Date.now(), live = () => Date.now() - opened > 450;
    let done = false;
    const end = (v) => { if (done) return; done = true; pop.remove(); window.removeEventListener('keydown', key, true); resolve(v); };
    const key = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); end(null); }
      else if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); e.stopPropagation(); end(e.composedPath?.()[0]?.dataset?.no === undefined ? input.value.trim() : null); }
    };
    pop.addEventListener('click', (e) => { if (e.target === pop && live()) end(null); });
    pop.querySelector('[data-no]').addEventListener('click', () => { if (live()) end(null); });
    pop.querySelector('[data-yes]').addEventListener('click', () => end(input.value.trim()));
    window.addEventListener('keydown', key, true);
    page._root.appendChild(pop);
    input.focus?.({ preventScroll: true });
    input.select?.();
  });
}
/** "Locked · Entry · since 7:12 PM": what a confirm sheet says about the device now. */
function stateLine(h, st, room) {
  const lc = st?.last_changed ? new Date(st.last_changed) : null;
  const since = lc && Number.isFinite(lc.getTime()) ? `since ${lc.toDateString() === new Date().toDateString() ? timeFmt(lc, h)
    : lc.toLocaleDateString(h.locale?.language, { weekday: 'short', month: 'short', day: 'numeric' })}` : '';
  return [stateText(h, st), room, since].filter(Boolean).join(' · ');
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
function shortName(hass, id, areaName, base) {
  const st = hass.states[id];
  const full = base || st?.attributes?.friendly_name || id.split('.')[1].replace(/_/g, ' ');
  if (areaName && full.toLowerCase().startsWith(areaName.toLowerCase() + ' ')) {
    const rest = full.slice(areaName.length).trim();
    if (rest) return rest.charAt(0).toUpperCase() + rest.slice(1);
  }
  return full;
}

/**
 * Cleaner names for the pills, their pop-ups and the "are you sure?" sheets.
 * 1. An entity whose own name is only its kind ("Moisture", "Battery", "Door", "Problem" …) is called by
 *    its device: "Basement Water Leak Moisture" → "Basement Water Leak". The parts come from
 *    hass.formatEntityName (Home Assistant 2025.x+), else the display registry (device name + the
 *    entity's own name), else the name is kept. Sensors, binary sensors and locks only, and only the
 *    words of the entity's own device class (a light, cover or power sensor keeps its name).
 * 2. plusWord: no state word after a name that already ends with it ("Garage Door Open", not "… open").
 * 3. NAME_TAILS: the doors pill drops a last "Sensor" / "Contact", the locks pill a last "Lock" — when
 *    something is left ("Front Door Sensor" → "Front Door").
 */
const KIND_WORDS = {
  moisture: ['moisture', 'water leak', 'leak', 'water'], door: ['door', 'opening', 'contact'], window: ['window', 'opening', 'contact'],
  opening: ['opening', 'door', 'window', 'contact'], garage_door: ['garage door', 'door', 'opening'], gas: ['gas'], smoke: ['smoke'],
  carbon_monoxide: ['carbon monoxide', 'co'], battery: ['battery', 'battery low', 'low battery', 'battery level'], motion: ['motion'],
  occupancy: ['occupancy', 'presence'], presence: ['presence', 'occupancy'], problem: ['problem'], safety: ['safety'],
  tamper: ['tamper', 'tampering'], vibration: ['vibration'], lock: ['lock'],
};
function nameParts(h, id) {
  const st = h.states[id];
  const full = st?.attributes?.friendly_name || id.split('.')[1].replace(/_/g, ' ');
  let ent = null, dev = null;
  if (st && typeof h.formatEntityName === 'function') {
    try {
      const e = h.formatEntityName(st, { type: 'entity' }), d = h.formatEntityName(st, { type: 'device' });
      if (typeof e === 'string' && typeof d === 'string') { ent = e; dev = d; }
    } catch (e) { /* an older or different formatEntityName: the registry below */ }
  }
  if (!ent || !dev) {
    // (has_entity_name is read only here, on a Home Assistant without formatEntityName; a change of it
    // alone — rare — shows at the next rebuild, so it isn't in REG_FIELDS)
    const re = h.entities?.[id], dv = re?.device_id ? h.devices?.[re.device_id] : null;
    const dn = dv ? dv.name_by_user || dv.name : null;
    if (dn && full.toLowerCase().startsWith(`${dn.toLowerCase()} `)) { dev = dn; ent = full.slice(dn.length).trim(); }
    else if (dn && re?.has_entity_name && re.name) { dev = dn; ent = re.name; }
  }
  return { full, ent, dev };
}
function cleanName(h, id) {
  const st = h.states[id], d = domainOf(id);
  if (!st || !['sensor', 'binary_sensor', 'lock'].includes(d)) return st?.attributes?.friendly_name || id.split('.')[1].replace(/_/g, ' ');
  const { full, ent, dev } = nameParts(h, id);
  const words = KIND_WORDS[st.attributes?.device_class || (d === 'lock' ? 'lock' : '')];
  return words && ent && dev && dev.trim() && words.includes(ent.trim().toLowerCase()) ? dev.trim() : full;
}
const NAME_TAILS = { doors: /\s+(sensor|contact)$/i, locks: /\s+lock$/i };
const trimTail = (name, tail) => { const re = NAME_TAILS[tail]; if (!re) return name; const t = name.replace(re, '').trim(); return t || name; };
/** rules 1 and 3: an entity's name for a pill or its pop-up (tail: doors | locks) */
const nameFor = (h, id, tail) => trimTail(cleanName(h, id), tail);
/** rule 2: "name word", unless the name already ends with that word */
const plusWord = (name, word) => (new RegExp(`(^|\\s)${String(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i').test(String(name).trim()) ? name : `${name} ${word}`);
/** An "are you sure?" sheet's name for an entity: rule 1, and a lock without its last "Lock" ("Unlock Front Door?"). */
const confirmName = (h, id) => nameFor(h, id, domainOf(id) === 'lock' ? 'locks' : domainOf(id) === 'binary_sensor' ? 'doors' : null);

/**
 * What HomeView reads from Home Assistant's registries. Home Assistant hands out a new registry object
 * whenever anything it lists changes — a label, a device's firmware version, a display precision …
 * (some versions on any registry event, or after a reconnect, too). Only these fields change a page or
 * the list of pages: regVersion() counts the changes to them, and pages rebuild and the dashboard
 * regenerates only when it moves on.
 * Not in it on purpose: entity labels — only the outage rows read them, and those tiles redraw on a
 * tick by themselves (their key), so ticking a row doesn't rebuild the page. A field read from the
 * registries anywhere else belongs here (test/registry.test.mjs checks the fields the code reads).
 */
const REG_FIELDS = {
  entities: ['device_id', 'area_id', 'entity_category', 'hidden', 'platform', 'name', 'icon'],
  devices: ['area_id', 'name', 'name_by_user'],
  areas: ['area_id', 'name', 'icon', 'floor_id', 'temperature_entity_id', 'humidity_entity_id'],
  floors: ['name', 'level'],
};
const regSame = (x, y) => x === y || ((x == null || x === false || x === '') && (y == null || y === false || y === ''));
/** Does any entry differ in a field HomeView reads, or did entries come or go? Entries Home Assistant
 *  kept as they were are the same objects (skipped); the rest are compared field by field. */
function regDiffers(a, b, fields) {
  if (a === b) return false;
  if (!a || !b) return true;
  let n = 0;
  for (const id in b) {
    n++;
    const x = a[id], y = b[id];
    if (x === y) continue;
    if (!x || !y) return true;
    for (let i = 0; i < fields.length; i++) if (!regSame(x[fields[i]], y[fields[i]])) return true;
  }
  for (const id in a) n--;   // every id in b is in a: the same number means the same ids
  return n !== 0;
}
/** A number that moves on with each change HomeView reads in the registries (entities, devices,
 *  areas, floors): compared with the registries seen last, once per new registry object — no work at
 *  all for new states, and nothing to compute on the first look. */
let _reg = null;
function regVersion(h) {
  const c = _reg;
  if (c && c.e === h.entities && c.d === h.devices && c.a === h.areas && c.f === h.floors) return c.v;
  const changed = !c || regDiffers(c.e, h.entities, REG_FIELDS.entities) || regDiffers(c.d, h.devices, REG_FIELDS.devices)
    || regDiffers(c.a, h.areas, REG_FIELDS.areas) || regDiffers(c.f, h.floors, REG_FIELDS.floors);
  _reg = { e: h.entities, d: h.devices, a: h.areas, f: h.floors, v: (c?.v || 0) + (changed ? 1 : 0) };
  return _reg.v;
}

// Pages are built one by one as you swipe, each from the same registries and the same settings:
// build the model once and share it (the strategy's too; rebuilt when what it reads changes, or when
// one of the entities its picks depend on goes offline or comes back — see availSig)
let _modelCache = null;
function sharedModel(hass, cfg) {
  const c = _modelCache;
  const n = hvStateCount(hass), reg = regVersion(hass);
  if (c && c.cfg === cfg && c.reg === reg && c.n === n && availSig(hass, c.model.watch) === c.model.watchSig) return c.model;
  const model = buildModel(hass, cfg);
  _modelCache = { cfg, reg, n, model };
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
// entity ids per device, made once per entity registry (Home Assistant hands a new object when the
// registry changes): the model, the Energy page and the outage rows look devices up in it instead of
// scanning every entity for each device
const _devIndex = new WeakMap();
function deviceIndex(h) {
  const ents = h?.entities || {};
  let ix = _devIndex.get(ents);
  if (!ix) {
    ix = {};
    for (const [eid, r] of Object.entries(ents)) if (r?.device_id) (ix[r.device_id] = ix[r.device_id] || []).push(eid);
    _devIndex.set(ents, ix);
  }
  return ix;
}
/**
 * Some picks depend on states, not just the registries: people with a location, the thermostat that
 * sets comfort, Home's camera (the first one online), a room's live tiles, rooms and favourites
 * without devices Home Assistant only remembers. watch = { off: [ids], gone: [ids] }: a string that
 * changes when one of `off` goes offline or comes back, or one of `gone` is (or stops being) only
 * remembered. Pages rebuild (debounced) when it changes, so these picks don't wait for the next
 * registry change.
 */
function availSig(h, watch) {
  if (!watch) return '';
  let out = '';
  for (const id of watch.off || []) { const st = h.states[id]; out += !st || UNAVAILABLE.includes(st.state) ? '0' : '1'; }
  out += '|';
  for (const id of watch.gone || []) out += gone(h.states[id]) ? '0' : '1';
  return out;
}
function buildModel(hass, cfg) {
  // exclude_entities: ids, globs ('sensor.*_linkquality') and filters ({ label: …, integration: … }): IdSet
  const exclude = new IdSet(hass, cfg.exclude_entities);
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
  const byDevice = deviceIndex(hass);
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
    || r.entities.some((id) => ROOM_ROW_DOMAINS.includes(domainOf(id)) && !gone(hass.states[id])));
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
  // the entities whose state these picks used (availSig)
  const GONE_DOMAINS = [...ROOM_ROW_DOMAINS, 'alarm_control_panel'];
  model.watch = {
    off: [...Object.keys(hass.states).filter((id) => domainOf(id) === 'person' && asList(hass.states[id].attributes.device_trackers).length),
      ...Object.keys(hass.states).filter((id) => domainOf(id) === 'climate' && !exclude.has(id)), ...model.cameras],
    gone: model.areas.flatMap((r) => r.entities.filter((id) => GONE_DOMAINS.includes(domainOf(id)))),
  };
  model.watchSig = availSig(hass, model.watch);
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
 *   yellow on      on / in use: lights, power drawn, media playing (a warm yellow, apart from amber)
 *   blue   cool    climate: cooling, fans
 * "on" and "warn" are CSS variables (palette → textTones): on #FFB800, warn #E07800 in light mode
 * (#FF9500 in dark), so the two read apart (they were 1.07 : 1); an offline device carries a badge too.
 */
const HV_TONES = { ok: '#34C759', warn: 'var(--hv-warn-ic, #FF9500)', alert: '#FF3B30', armed: '#FF3B30', on: 'var(--hv-on-ic, #FFB800)', cool: '#56BDE1',
  heat: 'var(--hv-warn-ic, #FF9500)' };
// colours that name a kind of thing rather than a state: the energy sources (flow, Right now, Today)
// and the readings (charts, the hero's icons). One place, so every tile draws them alike.
const KIND_TONES = { solar: '#FFB800', grid: '#5B8DEF', home: '#30B0C7', battery: '#34C759', temperature: '#FF9500', humidity: '#30B0C7',
  neutral: '#8E8E93' };

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
  if (isOffline(st)) return 'Offline';   // one word everywhere (pills and chips say "offline" too)
  if (st.state === 'unknown') return { scene: 'Scene', script: 'Script', button: 'Press', input_button: 'Press', event: '—' }[d] || '—';
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
    return HV_TONES.on;
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
// on / off things a tap switches (a screen reader hears them as toggle buttons: aria-pressed)
const TOGGLES = ['light', 'switch', 'fan', 'input_boolean', 'automation', 'siren', 'humidifier'];
function tapAction(st) {
  const d = domainOf(st.entity_id), dc = st.attributes.device_class;
  if (TOGGLES.includes(d)) return 'toggle';
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
// keys with the date in them (today's statistics …) get a new entry every day: an entry nobody has
// asked for in a day is dropped (looked at once an hour), so a tablet that runs for weeks doesn't
// keep every day's
let _cacheSwept = Date.now();
function sweepCache(now = Date.now()) {
  _cacheSwept = now;
  for (const [k, c] of cache) if (!c.pending && now - (c.used || c.ts) > 864e5) cache.delete(k);
}
/** Return the cached value (or undefined) and refresh it in the background when stale. */
function cached(key, ttlMs, fetcher, onUpdate) {
  if (Date.now() - _cacheSwept > 3600e3) sweepCache();
  let c = cache.get(key);
  if (!c) { c = { value: undefined, ts: 0, pending: null, listeners: new Set() }; cache.set(key, c); }
  c.used = Date.now();
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
    const change = await statChangeToday(hass, statId);
    const st = (hvHass || hass).states[statId];
    return { change, at: num(st?.state), f: kwhFactor(st) };
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
 * Today's change of a statistic (in its own unit; null: no statistics), read together with every
 * other statistic asked for in the same moment: one hourly and one 5-minute statistics read for all
 * of them (the Energy page asked once per statistic, 15 to 46 reads a minute). Since midnight: the
 * hours the recorder has compiled, then the 5-minute rows after the last of them (the hour that is
 * still running, and the one before it in the seconds before it is compiled).
 */
const _statBatch = { want: new Map(), timer: null };
function statChangeToday(hass, statId) {
  return new Promise((resolve, reject) => {
    const b = _statBatch;
    b.want.set(statId, [...(b.want.get(statId) || []), { resolve, reject }]);
    if (!b.timer) b.timer = setTimeout(() => flushStatBatch(hass), 15);
  });
}
async function flushStatBatch(hass) {
  const b = _statBatch, want = b.want;
  b.want = new Map(); b.timer = null;
  const ids = [...want.keys()];
  const H = hass;
  try {
    const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
    const hour = new Date(); hour.setMinutes(0, 0, 0);
    const from5 = new Date(Math.max(midnight.getTime(), hour.getTime() - 3600e3));
    const [hours, fives] = await Promise.all([
      ws(H, { type: 'recorder/statistics_during_period', start_time: midnight.toISOString(), period: 'hour', statistic_ids: ids, types: ['change'] }),
      ws(H, { type: 'recorder/statistics_during_period', start_time: from5.toISOString(), period: '5minute', statistic_ids: ids, types: ['change'] }),
    ]);
    const ms = (v) => new Date(v).getTime();
    for (const id of ids) {
      const hr = (hours?.[id] || []).filter((r) => ms(r.start) >= midnight.getTime());
      const done = hr.length ? Math.max(...hr.map((r) => ms(r.start))) + 3600e3 : midnight.getTime();
      const fv = (fives?.[id] || []).filter((r) => ms(r.start) >= done);
      const change = hr.length || fv.length ? [...hr, ...fv].reduce((a, r) => a + (Number(r.change) || 0), 0) : null;
      want.get(id).forEach((w) => w.resolve(change));
    }
  } catch (e) {
    want.forEach((ws_) => ws_.forEach((w) => w.reject(e)));
  }
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

/** Home Assistant's Energy settings: one cached read for everything that needs them (the Energy
 *  page and pill, the strategy, the Settings sheet, energy device counts). */
function getEnergyPrefs(hass, onUpdate) {
  return cached('energy:prefs', 10 * 60e3, () => ws(hass, { type: 'energy/get_prefs' }), onUpdate);
}
/** The same as a promise: the cached settings, or the read in flight (null if it failed). */
function energyPrefsNow(hass) {
  return new Promise((resolve) => {
    const v = getEnergyPrefs(hass, () => resolve(cache.get('energy:prefs')?.value ?? null));
    if (v !== undefined) resolve(v);
  });
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
/**
 * The UI edits saved for a YAML dashboard. Only "no such config" (the companion isn't made yet) means
 * no edits; any other failure (a dropped connection on a phone …) throws, because a save works out the
 * new companion from what it read: saving after a failed read would wipe every earlier edit.
 * soft: for drawing the dashboard — a failed read draws it without the edits (and says so in the
 * console) rather than not at all; saving always reads strictly.
 */
async function loadEdits(hass, path = editsPath(), soft = false) {
  let c;
  try { c = await ws(hass, { type: 'lovelace/config', url_path: path }); } catch (e) {
    if (e?.code === 'config_not_found') return {};   // none yet
    const err = unreadable(path, e);
    if (soft) { console.warn(err.message); return {}; }
    throw err;
  }
  return c?.homeview && typeof c.homeview === 'object' ? c.homeview : {};
}
const unreadable = (path, e) => Object.assign(new Error(`HomeView couldn't read ${path} (${e?.message || e?.code || e}); nothing was saved`),
  { code: 'hv_unreadable', cause: e });
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
// strict (saving): a failed read throws instead of reading as "nothing there"
async function loadSourceOptions(hass, from, strict = false) {
  const src = await loadStrategyConfig(hass, from, strict);
  const { type: _t, from: _f, ...o } = src?.strategy || {};
  const yaml = hass?.panels?.[from]?.config?.mode === 'yaml';
  return yaml && o.ui_edits !== false ? applyEdits(o, await loadEdits(hass, `${from}-edits`, !strict)) : o;
}
async function resolveFrom(hass, strat, strict = false) {
  const { from, edits, ...own } = strat;
  const src = await loadSourceOptions(hass, from, strict);
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

async function loadStrategyConfig(hass, path = dashboardPath(), strict = false) {
  try {
    const cur = await ws(hass, { type: 'lovelace/config', url_path: path });
    return cur && typeof cur === 'object' ? cur : null;
  } catch (e) {
    if (strict && e?.code !== 'config_not_found') throw unreadable(path || 'the dashboard', e);
    return null;
  }
}

/** The settings as this dashboard shows them, for the Settings sheet: a YAML dashboard's on-screen
 *  edits included (without them, saving the sheet dropped every earlier edit), a mirror's merged. */
async function settingsDraft(hass, fallbackOptions) {
  const cur = await loadStrategyConfig(hass, undefined, true);
  if (cur?.strategy?.from) {
    const { type: t, ...strat } = cur.strategy;
    return { type: t, ...(await resolveFrom(hass, strat, true)).merged };
  }
  if (cur?.strategy && isYamlDash(hass) && cur.strategy.ui_edits !== false) {
    const { type: t, ...yamlOpts } = cur.strategy;
    return { type: t, ...applyEdits(yamlOpts, await loadEdits(hass)) };
  }
  return cur?.strategy || { type: 'custom:homeview', ...(fallbackOptions || {}) };
}

/**
 * Apply `mutate` to the dashboard's strategy options and save them. Resolves to
 * { ok: true, config } or { ok: false, config } when the dashboard can't be saved from the
 * UI (a YAML-mode dashboard) — the caller then shows the YAML to paste — or
 * { ok: false, unreadable: true } when the current settings or edits couldn't be read: then nothing
 * is saved (a save works out the new settings from what it read).
 */
async function saveStrategy(hass, fallbackOptions, mutate) {
  try { return await saveStrategyChecked(hass, fallbackOptions, mutate); } catch (e) {
    if (e?.code !== 'hv_unreadable') throw e;
    console.warn(e.message, e.cause);
    return { ok: false, unreadable: true, error: e };
  }
}
async function saveStrategyChecked(hass, fallbackOptions, mutate) {
  const cur = await loadStrategyConfig(hass, undefined, true);
  // from: <dashboard> — the change goes into this dashboard's own `edits:`, against the source
  if (cur?.strategy?.from) {
    const { type: t, ...strat } = cur.strategy;
    const { src, merged } = await resolveFrom(hass, strat, true);
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
/* an embedded HA card's box: HA's theme variables from this tile's own tint (see HA_VARS) */
.hacard { ${HA_VARS}; }
@keyframes hv-alert-pulse { 0%, 100% { box-shadow:0 0 0 0 rgba(255,59,48,.55); } 50% { box-shadow:0 0 0 8px rgba(255,59,48,0); } }
:host { display:block; height:100%; min-width:0; container-type:size; -webkit-tap-highlight-color:transparent;
  user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; }
* { box-sizing:border-box; }
.t { height:100%; border-radius:var(--hv-radius, 22px); background:var(--hv-tile); border:0.5px solid var(--hv-tile-border);
  box-shadow:0 1px 2px rgba(0,0,0,.05); color:var(--hv-fg); position:relative; overflow:hidden; cursor:pointer;
  display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;
  padding:7% 8%; transition:background .25s, transform .12s; }
.t.press { transform:scale(.97); }
.t.on { background:var(--hv-tile-on); color:var(--hv-on-fg); box-shadow:var(--hv-on-shadow, 0 1px 2px rgba(0,0,0,.05)); }
.t.on.alert { background:var(--hv-alert-tile, var(--hv-tile-on)); box-shadow:0 1px 2px rgba(0,0,0,.05); color:var(--hv-fg); }
.t.on.alert .sb { color:var(--hv-fg); }   /* the grey would be 3.8 : 1 on the red tint; the state word stays red (4.7) */
/* coloured words on a lit tile: the darker shades (light mode; dark mode keeps them) */
.t.on { --hv-ok-tx:var(--hv-ok-tx-on); --hv-warn-tx:var(--hv-warn-tx-on); --hv-cool-tx:var(--hv-cool-tx-on); --hv-alert-tx:var(--hv-alert-tx-on);
  --hv-humid-tx:var(--hv-humid-tx-on); --hv-dry-tx:var(--hv-dry-tx-on); --hv-too-humid-tx:var(--hv-too-humid-tx-on);
  --hv-too-cold-tx:var(--hv-too-cold-tx-on); --hv-too-dry-tx:var(--hv-too-dry-tx-on); }
/* offline (or not found): in its place, normal look, grey icon, an amber badge and the word */
.t.na .ic { color:var(--hv-icon); position:relative; }
.t.na .sw, .t.na .pv { color:var(--hv-warn-tx, #FF9500); font-weight:600; }
.ob { position:absolute; top:-8%; right:-16%; width:max(13px, calc(var(--mdc-icon-size, 24px) * .44)); height:max(13px, calc(var(--mdc-icon-size, 24px) * .44));
  border-radius:50%; background:var(--hv-badge, #FF9500); color:var(--hv-badge-fg, #fff); box-shadow:0 0 0 2px var(--hv-tile); display:flex; align-items:center; justify-content:center;
  font:800 max(9px, calc(var(--mdc-icon-size, 24px) * .3)) / 1 ${FONT}; pointer-events:none; }
/* an alert's state word ("Open · Entry") in the alert colour */
.t.alert .sw { color:var(--hv-alert-tx, #FF3B30); font-weight:650; }
/* keyboard focus */
:host(:focus-visible) { outline:3px solid var(--hv-accent); outline-offset:2px; border-radius:var(--hv-radius, 22px); }
.t.white { background:var(--hv-card); }
.ic { color:var(--hv-icon); display:flex; align-items:center; justify-content:center; --mdc-icon-size:min(30cqh, 52px); }
.ic.big { --mdc-icon-size:min(34cqh, 60px); }
.t.on .ic { color:var(--hv-ic-on, var(--hv-accent)); }
.circ { border-radius:50%; width:min(36cqh, 64px); height:min(36cqh, 64px); background:var(--hv-pill);
  display:flex; align-items:center; justify-content:center; --mdc-icon-size:min(20cqh, 34px); position:relative; flex:none; }
.badge { position:absolute; top:-6%; right:-12%; width:44%; height:44%; border-radius:50%; background:${HV_TONES.alert}; color:#fff;
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
.ag-list.ag-bare { flex:none !important; overflow:visible; -webkit-mask-image:none; mask-image:none; }   /* fitted (R.agenda.update): no fade over the last event */
.ag-rows { display:flex; flex-direction:column; gap:8px; margin-top:12px; }
.ag-row { display:flex; align-items:center; gap:12px; padding:11px 14px; border-radius:16px; background:color-mix(in srgb, var(--hv-fg) 5%, transparent); }
.ag-row.on { background:color-mix(in srgb, ${HV_TONES.ok} 16%, transparent); box-shadow:inset 0 0 0 1.5px ${HV_TONES.ok}; }
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
.edit button { all:unset; position:relative; pointer-events:auto; cursor:pointer; width:36px; height:36px; border-radius:50%; background:rgba(20,20,20,.62);
  color:#fff; display:flex; align-items:center; justify-content:center; --mdc-icon-size:17px; backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); }
.edit button[data-edit=unfav] { background:#FF9F0A; }
/* touch targets: at least 44 × 44 px however small the button looks */
.edit button::after, .lt-b::after, .onoff::after, .fd-ic::after, .ctl button::after { content:''; position:absolute; left:50%; top:50%;
  width:max(100%, 44px); height:max(100%, 44px); transform:translate(-50%, -50%); }
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
.t.pl.na .ic { position:relative; color:var(--hv-fg2); }
.t.gap { background:transparent; border:none; box-shadow:none; cursor:default; }
/* faders */
.t.fader { height:100%; display:flex; flex-direction:row; align-items:center; justify-content:flex-start; text-align:left; gap:12px; padding:6px 8px; border-radius:999px; cursor:default; }
.fd-ic { position:relative; flex:none; width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer;
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
.sl { position:absolute; inset:0; filter:var(--hv-photo-filter, none); }
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
.pres { display:inline-flex; align-items:center; gap:.4em; color:var(--hv-fg2); font-size:.8em; font-weight:600; }
.pres i { width:.55em; height:.55em; border-radius:50%; background:${HV_TONES.ok}; }
/* a person's page: when the location was reported, under Home / Away (amber once it's old) */
.hh .who { display:flex; flex-direction:column; align-items:flex-end; gap:2px; min-width:0; }
.hh .loc { font-size:.62em; font-weight:600; color:var(--hv-fg2); white-space:nowrap; }
.hh .loc.stale { color:${txVar('warn')}; }
.op { display:flex; align-items:center; gap:8px; font-weight:600; font-size:clamp(12px, 4.6cqi, 18px); }
.hf { display:flex; gap:7%; justify-content:center; width:100%; border-top:1px solid var(--hv-line); padding-top:4%; font-weight:600; font-size:clamp(12px, 4.8cqi, 19px); }
.hf > span { display:inline-flex; align-items:center; gap:4px; }
.hf em { font-style:normal; color:${KIND_TONES.humidity}; font-weight:650; margin-left:4px; }
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
/* a room's › (its details page): top right on a tile, at the end of a phone's room bar */
.rgo { position:absolute; top:0; right:0; width:44px; height:44px; display:flex; align-items:center; justify-content:center; z-index:1;
  color:var(--hv-fg2); --mdc-icon-size:20px; }
.rgo i, .rgo ha-icon { display:flex; width:24px; height:24px; border-radius:50%; align-items:center; justify-content:center; background:var(--hv-pill); }
.t.flex.sect .rgo { position:static; flex:none; margin-right:-10px; }
.t:has(~ .edit) .rgo { display:none; }   /* edit mode: the tile's own buttons */
.live { margin-left:auto; display:inline-flex; align-items:center; gap:6px; text-transform:none; letter-spacing:0; font-weight:600; color:var(--hv-ok-tx, #34C759); }
.live i { width:7px; height:7px; border-radius:50%; background:${HV_TONES.ok}; animation:hv-pulse 1.6s ease-in-out infinite; }
.live.stale { color:var(--hv-warn-tx, ${HV_TONES.warn}); }
.t.load { gap:10px; }
.t.load .kwh { font-size:13px; font-weight:700; white-space:nowrap; }
.lt-b, .onoff { all:unset; position:relative; cursor:pointer; flex:none; display:inline-flex; align-items:center; justify-content:center; font:700 12.5px ${FONT}; }
.lt-b { width:30px; height:30px; border-radius:50%; color:var(--hv-fg2); opacity:.55; --mdc-icon-size:19px; }
.lt-b.tk { color:${HV_TONES.alert}; opacity:1; background:color-mix(in srgb, ${HV_TONES.alert} 12%, transparent); }
.lt-b.on.tk { color:var(--hv-ok-tx, #34C759); background:color-mix(in srgb, ${HV_TONES.ok} 16%, transparent); }   /* turn on in an outage */
.lt-b.ro, .onoff.ro { cursor:default; }
.onoff { min-width:44px; height:28px; padding:0 10px; border-radius:999px; background:var(--hv-pill); color:var(--hv-fg2); }
.onoff.on { background:#1E7B34; color:#fff; }   /* white on it: 5.4 : 1 */
.onoff.na { background:transparent; color:var(--hv-warn-tx, #FF9500); }
.inl { --mdc-icon-size:14px; vertical-align:-2px; }
.t.outage { gap:10px; flex-wrap:wrap; padding:10px 14px; flex-direction:row !important; justify-content:flex-start !important;
  align-items:center !important; align-content:center; text-align:left !important; }
.t.outage .tx { align-items:flex-start !important; }
.grid.loads { grid-auto-rows:minmax(66px, auto); }
@media (max-width:700px) { .grid.loads > homeview-tile[style*="1 / -1"] { grid-row:span 4; } }
@container (max-width: 520px) { .t.outage { align-content:center; } .t.outage .tx { flex:1 1 calc(100% - 40px) !important; } }
.t.outage .txt { all:unset; position:relative; cursor:pointer; padding:7px 12px; border-radius:999px; background:var(--hv-pill); font:650 13px ${FONT}; color:var(--hv-fg); }
.t.outage .txt[disabled] { opacity:.45; cursor:default; }
.t.outage .txt::after { content:''; position:absolute; left:50%; top:50%; width:max(100%, 44px); height:max(100%, 44px); transform:translate(-50%, -50%); }
.t.flex.row-t { padding:0 14px; gap:12px; border-radius:16px; }
.t.flex.row-t .ic { --mdc-icon-size:24px; }
.t.flex.row-t .nm { font-size:15px; font-weight:650; }
.t.flex.row-t .sb { font-size:13px; }
.t.flex.row-t .up { font-size:10.5px; }
.ctl { position:absolute; display:flex; gap:6px; bottom:7%; right:7%; }
.ctl button { all:unset; position:relative; width:min(22cqh, 34px); height:min(22cqh, 34px); border-radius:50%; background:var(--hv-pill);
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
/* the clock tile (R.clock): a square dial as big as the tile allows; the face is SVG, the hands plain
   elements over it, each turned by CSS from where it was drawn (composited: no layout per frame) */
.t.clock { container-type:size; }
.dial { position:relative; flex:none; width:100cqmin; height:100cqmin; color:var(--hv-fg); }
.dial > svg { position:absolute; inset:0; width:100%; height:100%; overflow:visible; }
.hand { position:absolute; inset:0; will-change:transform; animation-name:hv-hand; animation-timing-function:linear; animation-iteration-count:infinite; }
.hand > i { position:absolute; left:50%; bottom:50%; display:block; border-radius:999px; }
.dial > .cap { position:absolute; left:50%; top:50%; transform:translate(-50%, -50%); border-radius:50%; background:var(--hv-card);
  box-shadow:inset 0 0 0 max(1px, 1cqmin) var(--hv-accent); }
@keyframes hv-hand { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
/* reduced motion: no wiggle, flow, pulse or fades */
@media (prefers-reduced-motion: reduce) {
  .hand { animation:none; }
  .hand.sec { display:none; }
  .t { transition:none; }
  .t.press { transform:none; }
  .edit { animation:none; }
  .fl.on { animation:none; stroke-dasharray:none; }
  .live i { animation:none; }
  .sl.fade { animation:none; }
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
  key: (h, s) => (s.addFav ? 'addfav' : 'add'),
  html: (h, s) => `<div class="t flex add" data-edit="add" style="border:1.5px dashed var(--hv-line);background:transparent;cursor:pointer">
    <div class="ic" style="color:var(--hv-accent)"><i data-i="${s.addFav ? 'mdi:star-plus-outline' : 'mdi:plus'}"></i></div><div class="tx"><div class="nm">Add</div><div class="sb">${s.addFav ? 'a favourite' : 'a tile here'}</div></div></div>`,
};
// ---- power, pills, buttons, faders (custom pages) -------------------------------------------
/** How many devices the Energy settings track (the cached Energy settings). */
function energyDeviceCount(hass) {
  return energyPrefsNow(hass).then((p) => (p ? (p.device_consumption || []).length : null));
}
/** A power sensor's value in W (W / kW / MW), or null. */
function toWatts(st) {
  const v = num(st?.state);
  if (v === null) return null;
  const u = String(st.attributes?.unit_of_measurement || 'W').toLowerCase();
  return v * ({ w: 1, kw: 1000, mw: 1e6 }[u] ?? 1);
}
/** 720 -> "0.72 kW", 2 -> "0.002 kW", 1015 -> "1.02 kW" */
const fmtKw = (w) => { const k = w / 1000; return `${fmt(k, Math.abs(k) < 0.01 ? 3 : 2)} kW`; };
const NAMED_TONES = () => ({ green: HV_TONES.ok, amber: HV_TONES.warn, red: HV_TONES.alert, orange: HV_TONES.on, blue: HV_TONES.cool });
const toneColor = (c) => (c ? NAMED_TONES()[c] || HV_TONES[c] || c : null);
/** A pill-shaped tile (layout: pills / keypad): icon, name and (info pills) the state. */
function pillHtml({ icon, entity, name, value, color, active, dim, iconOnly, na }) {
  const c = color || 'var(--hv-accent)';
  return `<div class="t pl${active ? ' on' : ''}${dim ? ' dim' : ''}${iconOnly ? ' io' : ''}${na ? ' na' : ''}" style="--pc:${esc(c)}">
    <span class="ic">${entity ? `<i data-e="${esc(entity)}"${icon ? ` data-i="${esc(icon)}"` : ''}></i>` : `<i data-i="${esc(icon || 'mdi:circle-small')}"></i>`}${na ? OFFLINE_BADGE : ''}</span>${iconOnly ? '' : `<b>${esc(name || '')}</b>`}${value !== undefined && !iconOnly ? `<span class="pv">${esc(value)}</span>` : ''}</div>`;
}
function entityPillTile(h, s) {
  const st = h.states[s.entity];
  if (!st) return pillHtml({ icon: 'mdi:help-circle-outline', name: s.name || s.entity, value: 'Not found', na: true });
  if (isOffline(st)) return pillHtml({ entity: s.entity, icon: s.icon, name: s.name || shortName(h, s.entity, s.areaName), value: 'Offline', na: true, iconOnly: s.iconOnly });
  const d = domainOf(s.entity), na = isOffline(st);
  // info pills show a value: sensors, numbers, selects, texts, times (input_datetime …), or a format: / attribute:
  const info = ['sensor', 'binary_sensor', 'weather', 'sun', 'input_number', 'number', 'input_select', 'select', 'input_text',
    'input_datetime', 'datetime', 'date', 'time'].includes(d) || !!(s.format || s.attribute);
  const on = isActive(st);
  const icon = (on ? s.icon_on : s.icon_off) || s.icon || null;   // none: the entity's own (data-e)
  const name = (!on && s.name_off) || s.name || shortName(h, s.entity, s.areaName);
  const w = s.unit && ['w', 'kw'].includes(String(s.unit).toLowerCase()) ? toWatts(st) : null;   // unit: kW
  const value = w !== null && !s.attribute ? (String(s.unit).toLowerCase() === 'kw' ? fmtKw(w) : `${fmt(w, 0)} W`) : valueText(h, st, s);
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
  async action(h, s, tile, kind) {
    if (kind === 'hold') {
      const hd = s.hold;
      if (hd && typeof hd === 'object' && hd.action) return callAction(h, hd.action, hd.data, hd.target);
      const id = s.toggle || s.watch;
      return id ? moreInfo(tile, id) : null;
    }
    // confirm: true | turn_on | turn_off | 'your question' | { text, only, action } (confirmOf); a button
    // that runs an action always asks
    const cf = confirmOf(s.confirm);
    const lit = !s.action && s.toggle && R.button.lit(h, s);
    if (cf && (s.action || confirmAsks(cf, !lit))) {
      const verb = s.action ? 'Run' : lit ? 'Turn off' : 'Turn on';
      const ok = await hvConfirm(tile, { title: cf.text || `${s.action ? '' : `${verb} `}${s.name || 'this'}?`, action: cf.action || verb,
        body: s.toggle && h.states[s.toggle] ? stateLine(h, h.states[s.toggle]) : '', tone: s.color === 'red' || lit ? 'alert' : null });
      if (!ok) return null;
    }
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

// a name that says nothing away from its room ("Light", "Door Lock" …): away from the room the full
// name is used instead ("Kitchen Light"), a name given in customize / the page file as it is
const GENERIC_NAME = /^(main |ceiling |door |front |back |side )?(light|lights|lamp|lamps|bulb|lock|door|window|tv|fan|switch|plug|outlet|socket|sensor|blind|blinds|shade|shades|cover|thermostat|speaker|motion|occupancy|presence|battery|temperature|humidity|leak|smoke|camera|heater|valve)$/i;
/** "State · Room" for a tile away from its room (Home's favourites, pill pop-ups, phone favourites):
 *  the state word first, so it survives when a narrow tile cuts the line. */
const withRoom = (state, room) => (room && state ? `${state} · ${room}` : state || room || '');
// a small amber "!" on an offline device's icon (the device keeps its place; tap = its details)
const OFFLINE_BADGE = '<span class="ob" aria-hidden="true">!</span>';
R.entity = {
  key: (h, s) => { const st = h.states[s.entity]; return (st ? st.last_updated + st.state + (st.attributes.brightness || '') : 'x') + (s.power ? `|${h.states[s.power]?.state}` : '')
    + (liveTime(s) ? `|${Math.floor(Date.now() / 30e3)}` : ''); },   // "in 2 h": redrawn as time goes by
  html(h, s) {
    if (s.pillish) return entityPillTile(h, s);
    const st = h.states[s.entity];
    const room = s.showRoom && s.areaName ? s.areaName : null;   // shown away from its room
    const icon = (ent, ic) => `<i ${ent ? `data-e="${esc(ent)}"` : ''}${ic ? ` data-i="${esc(ic)}"` : ''}></i>`;
    if (!st) {
      return `<div class="t flex na"><div class="ic">${icon(null, 'mdi:help-circle-outline')}${OFFLINE_BADGE}</div><div class="tx"><div class="nm">${esc(s.name || s.entity)}</div><div class="sb">${esc(withRoom('Not found', room))}</div></div></div>`;
    }
    const on = isActive(st), alert = isAlert(st), na = isOffline(st);
    const d = domainOf(s.entity);
    // a pill's pop-up (clean: true | doors | locks): the cleaner name (nameFor), less its room
    const base = s.clean ? nameFor(h, s.entity, s.clean === true ? null : s.clean) : undefined;
    let name = s.name || shortName(h, s.entity, s.areaName, base);
    if (room && !s.name && GENERIC_NAME.test(name)) name = base || st.attributes.friendly_name || name;
    const state = valueText(h, st, s);   // format: / attribute: (a time, an attribute), else HA's state words
    let sub = s.sub !== undefined ? s.sub : withRoom(state, room);
    // power: sensor.x — "On · 0.72 kW" while it draws power
    if (s.power && s.sub === undefined && !na) { const w = toWatts(h.states[s.power]); sub = state + (w !== null && w >= 1 ? ` · ${fmtKw(w)}` : ''); }
    // offline (or never reported): in its place, normal look, grey icon, the amber badge, "Offline"
    if (na) {
      return `<div class="t flex na"><div class="ic">${icon(s.entity, s.icon)}${OFFLINE_BADGE}</div>
        <div class="tx"><div class="nm">${esc(name)}</div><div class="sb"><span class="sw">${esc(state)}</span>${room ? ` · ${esc(room)}` : ''}</div></div></div>`;
    }
    // a sensor: its value first, then its name (and room)
    if (d === 'sensor' && !s.sub) {
      return `<div class="t flex"><div class="ic"><i data-e="${esc(s.entity)}"></i></div>
        <div class="tx"><div class="nm">${esc(state)}</div><div class="sb">${esc(withRoom(name, room))}</div></div></div>`;
    }
    // the sub line; an alert's state word ("Open", "Unlocked") in the alert colour
    const subHtml = alert && s.sub === undefined && sub.startsWith(state) ? `<span class="sw">${esc(state)}</span>${esc(sub.slice(state.length))}` : esc(sub);
    const tone = secureTone(st);
    if (s.icon_on || s.icon_off) s = { ...s, icon: (on || st.state === 'open' ? s.icon_on : s.icon_off) || s.icon };   // icon_on / icon_off
    // color_on / color_off: the icon's colour by state — green / amber / red / orange / blue (the colour code) or any CSS colour
    const named = { green: HV_TONES.ok, amber: HV_TONES.warn, red: HV_TONES.alert, orange: HV_TONES.on, blue: HV_TONES.cool };
    const pick = on || st.state === 'open' ? s.color_on : s.color_off;
    const own = pick ? named[pick] || HV_TONES[pick] || pick : null;
    if (own) return `<div class="t flex${on ? ' on' : ''}${alert ? ' alert' : ''}" style="--hv-ic-on:${esc(own)}">
      <div class="ic" style="color:${esc(own)}">${icon(s.entity, s.icon)}</div>
      <div class="tx"><div class="nm">${esc(name)}</div><div class="sb">${subHtml}</div></div></div>`;
    const color = tone ? `style="--hv-ic-on:${HV_TONES[tone]}"` : on || alert ? `style="--hv-ic-on:${activeColor(st)}"` : '';
    let ctl = '';
    if (d === 'climate' && st.state !== 'off' && st.attributes.temperature != null && s.size?.[0] >= 2) {
      ctl = `<div class="ctl"><button data-act="down" aria-label="Lower"><ha-icon icon="mdi:minus"></ha-icon></button><button data-act="up" aria-label="Raise"><ha-icon icon="mdi:plus"></ha-icon></button></div>`;
    }
    return `<div class="t flex${on || alert ? ' on' : ''}${alert ? ' alert' : ''}" ${color}>
      <div class="ic${alert ? ' alert' : ''}" ${tone ? `style="color:${HV_TONES[tone]}"` : alert ? `style="color:${HV_TONES.alert}"` : ''}>${icon(s.entity, s.icon)}</div>
      <div class="tx"><div class="nm">${esc(name)}</div><div class="sb">${subHtml}</div></div>${ctl}</div>`;
  },
  async action(h, s, tile, kind, ev) {
    const st = h.states[s.entity];
    if (!st) return;
    // offline: its details (nothing to switch; HA says what's wrong)
    if (isOffline(st)) return moreInfo(tile, s.entity);
    const act = ev?.target?.closest?.('[data-act]')?.dataset?.act;
    if (act && kind === 'tap') {
      const step = st.attributes.target_temp_step || (h.config.unit_system?.temperature === '°C' ? 0.5 : 1);
      const t = (st.attributes.temperature || 0) + (act === 'up' ? step : -step);
      return h.callService('climate', 'set_temperature', { temperature: t }, { entity_id: s.entity });
    }
    // the gesture that switches it: the tap (tap: more-info = its details instead), or the hold with
    // hold: toggle; any other hold opens the details
    if (kind === 'hold' ? s.hold !== 'toggle' : s.tap === 'more-info') return moreInfo(tile, s.entity);
    const a = kind === 'hold' ? (tapAction(st) === 'toggle-confirm' ? 'toggle-confirm' : 'toggle') : s.tap || tapAction(st);
    if (a === 'more-info') return moreInfo(tile, s.entity);
    // confirm: (the tile's, else customize's) — ask first; only: turn_on / turn_off asks before that one
    // alone (a siren: before sounding it). Locks, garage doors and gates always ask (unless tap: toggle);
    // a confirm: gives them its words
    const cf = confirmOf(s.confirm), mine = confirmAsks(cf, !isActive(st));
    if (mine || a === 'toggle-confirm') {
      const verb = switchVerb(st), w = s.power ? toWatts(h.states[s.power]) : null;
      const tone = ['Unlock', 'Open'].includes(verb) || s.color === 'red' || s.color_on === 'red' ? 'alert'
        : ['Lock', 'Close'].includes(verb) ? 'ok' : verb === 'Turn off' ? 'alert' : null;
      const ok = await hvConfirm(tile, { title: (mine && cf.text) || `${verb} ${s.name || confirmName(h, s.entity)}?`, action: (mine && cf.action) || verb, tone,
        body: verb === 'Turn off' && w !== null && w >= 1 ? `It draws ${fmtKw(w)}.` : stateLine(h, st, s.areaName) });
      if (!ok) return;
    }
    return runToggle(h, st);
  },
};

// ---- room card ---------------------------------------------------------------------------
// the › on a room tile / bar: its details page (a tap elsewhere is its lights, a hold its page too),
// so the room page isn't only behind a hold; 44 px to touch
const ROOM_GO = '<span class="rgo" data-open aria-hidden="true"><i data-i="mdi:chevron-right"></i></span>';
function roomSummary(h, room) {
  const lights = (room.groups.lights || []).filter((id) => h.states[id]?.state === 'on').length;
  const t = num(h.states[room.temp]?.state), hu = num(h.states[room.hum]?.state);
  const unit = h.states[room.temp]?.attributes?.unit_of_measurement || '°';
  const alerts = room.alerts.filter((id) => isAlert(h.states[id]));
  return { lights, t, hu, unit, alerts, band: comfortKey(h, room) };
}
/**
 * What a room's comfort words depend on besides its readings: its thermostat's mode and settings and
 * the comfort settings' own entities (comfort: { cold, warm }, comfort_margin, comfort_limits). In the
 * keys of whatever shows comfort words, or the words lag until something else redraws the tile.
 */
let _comfortEnts = { c: null, ids: [], states: null, part: '' };
function comfortKey(h, room) {
  const ta = h.states[room?.thermostat]?.attributes || {};
  const C = HV_COMFORT || {};
  if (_comfortEnts.c !== C) {
    const vals = [...(isObj(C.mode) ? [C.mode.cold, C.mode.warm, C.mode.hot] : []), C.margin, ...Object.values(C.limits || {})];
    _comfortEnts = { c: C, ids: vals.filter((v) => typeof v === 'string' && v.includes('.')), states: null, part: '' };
  }
  // the comfort settings' part is the same for every room: read once per hass update (every room
  // tile's key asks, on every update)
  const ce = _comfortEnts;
  if (ce.states !== h.states) { ce.states = h.states; ce.part = ce.ids.map((id) => `|${h.states[id]?.state}`).join(''); }
  return `${h.states[room?.thermostat]?.state}|${ta.target_temp_low}|${ta.target_temp_high}|${ta.temperature}${ce.part}`;
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
// the words in their text shades (TEXT_TONES: readable on light tiles; dark mode keeps the bright tones)
const COMFORT_T = { '-2': ['Too cold', txVar('too-cold')], '-1': ['Cold', txVar('cool')], 0: ['Comfy', txVar('ok')], 1: ['Warm', txVar('warn')], 2: ['Hot', txVar('alert')] };
const COMFORT_H = { '-2': ['Too dry', txVar('too-dry')], '-1': ['Dry', txVar('dry')], 0: ['Comfy', txVar('ok')], 1: ['Humid', txVar('humid')], 2: ['Too humid', txVar('too-humid')] };
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
      return `<div class="t flex sect${sum.lights ? ' on' : ''}" style="--hv-ic-on:${HV_TONES.on}">
        <div class="circ"><div class="ic" style="--mdc-icon-size:inherit;color:${sum.lights ? HV_TONES.on : 'var(--hv-accent)'}"><i data-i="${esc(r.icon)}"></i></div>${badge}</div>
        <div class="tx" style="flex:1"><div class="nm">${esc(s.name || r.name)}</div>${comfort ? `<div class="sb">${comfort}</div>` : ''}</div>
        ${climate ? `<div class="rt">${esc(climate)}</div>` : ''}${ROOM_GO}</div>`;
    }
    return `<div class="t${sum.lights ? ' on' : ''}" style="--hv-ic-on:${HV_TONES.on}">${ROOM_GO}
      <div class="circ"><div class="ic" style="--mdc-icon-size:inherit;color:${sum.lights ? HV_TONES.on : 'var(--hv-accent)'}"><i data-i="${esc(r.icon)}"></i></div>${badge}</div>
      <div class="tx"><div class="nm">${esc(r.name)}</div>
      ${climate ? `<div class="sb">${esc(climate)}</div>` : ''}${(() => { const cf = comfortOf(h, r, sum.t, sum.hu); return cf.html ? `<div class="sb" style="font-weight:600">${cf.html}</div>` : ''; })()}${lightTxt ? `<div class="sb x">${esc(lightTxt)}</div>` : ''}</div></div>`;
  },
  // tap: the room's lights (its "all lights" group, else its main light); hold, the › top right, or a
  // room without lights: the room's details page
  action(h, s, tile, kind, ev) {
    if (ev?.target?.closest?.('[data-open]')) { navigate(`room-${s.room.id}`); return; }
    const light = kind === 'hold' ? null : roomMainLight(h, s.room);
    if (light) return h.callService('light', 'toggle', {}, { entity_id: light });
    navigate(`room-${s.room.id}`);
  },
};

// ---- weather (big) -----------------------------------------------------------------------
R.weather = {
  tick: 30e3,
  key: (h, s) => { const st = h.states[s.entity]; return `${st?.last_updated}|${s.place ? new Date().toDateString() : new Date().getMinutes()}|${tileCacheTag(`fc:${s.entity}`)}`; },
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
    if (s.compact) {   // a phone's Home: one line — the temperature, the condition and H / L
      return `<div class="t" style="flex-direction:row;justify-content:flex-start;gap:5%;padding:0 7%;text-align:left">
        <span class="ic" style="--mdc-icon-size:min(28cqh, 12cqi)"><i data-i="${icon}"></i></span>
        <span style="font-weight:700;font-size:min(36cqh, 16cqi);letter-spacing:-.04em;line-height:1">${fmt(st.attributes.temperature, 0)}°</span>
        <span style="display:flex;flex-direction:column;min-width:0;gap:2px"><span style="font-weight:650;font-size:clamp(15px,6cqi,20px)">${esc(cond)}</span>
          <span class="sb" style="margin:0">${hi != null ? `H ${fmt(hi, 0)}° · L ${fmt(lo, 0)}°` : st.attributes.humidity != null ? `${fmt(st.attributes.humidity, 0)}% RH` : ''}${rain != null && rain >= 10 ? ` · ${fmt(rain, 0)}% rain` : ''}</span></span></div>`;
    }
    const big = s.size?.[1] >= 2;
    if (!big) {
      return `<div class="t flex"><div class="ic"><i data-i="${icon}"></i></div><div class="tx">
        <div class="nm">${fmt(st.attributes.temperature, 0)}° ${esc(cond)}</div>
        <div class="sb">${hi != null ? `H ${fmt(hi, 0)}° · L ${fmt(lo, 0)}°` : esc(h.states[s.entity].attributes.friendly_name)}</div></div></div>`;
    }
    // place: true (Home, whose header has the date and whose clock has the time): the place instead
    // of the time and date
    const top = s.place ? `<span style="font-weight:650;font-size:clamp(13px,6cqi,22px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(h.config.location_name || st.attributes.friendly_name || '')}</span>`
      : `<span style="font-weight:650;font-size:clamp(13px,6cqi,22px)">${esc(timeFmt(now, h))}</span>
        <span class="sb" style="margin:0">${esc(now.toLocaleDateString(h.locale?.language, { weekday: 'long', month: 'short', day: 'numeric' }))}</span>`;
    return `<div class="t" style="justify-content:space-between;padding:6% 6% 5%">
      <div style="display:flex;justify-content:space-between;width:100%;align-items:baseline">${top}</div>
      <div style="font-weight:700;font-size:min(42cqh, 30cqi);line-height:1;letter-spacing:-.04em">${fmt(st.attributes.temperature, 0)}°</div>
      <div style="display:flex;align-items:center;gap:8px;font-weight:600;font-size:clamp(13px,6cqi,22px)"><span class="ic" style="--mdc-icon-size:1.4em;color:inherit"><i data-i="${icon}"></i></span>${esc(cond)}</div>
      <div style="display:flex;gap:6%;justify-content:center;width:100%;border-top:1px solid var(--hv-line);padding-top:4%;font-weight:600;font-size:clamp(12px,5cqi,19px)">
        ${hi != null ? `<span>H: ${fmt(hi, 0)}°</span><span>L: ${fmt(lo, 0)}°</span>` : ''}
        ${rain != null ? `<span style="display:inline-flex;align-items:center;gap:.2em"><ha-icon icon="mdi:water-outline" style="--mdc-icon-size:1.1em"></ha-icon>${fmt(rain, 0)}%</span>` : `<span>${fmt(st.attributes.humidity, 0)}% RH</span>`}</div></div>`;
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

// ---- Tonight (the Widgets board at night, instead of Up next) --------------------------------------
// the alarm, "All locked" / "Front Door unlocked", "All closed" / "2 open", and tomorrow's first event
R.tonight = {
  tick: 60e3,
  key: (h, s) => [s.alarm, ...s.locks, ...s.openings].map((id) => h.states[id]?.state).join('|')
    + `|${s.calendars.length ? tileCacheTag(`cal:${s.calendars.join(',')}:14`) : ''}|${new Date().toDateString()}`,
  html(h, s, tile) {
    const row = (icon, tone, text) => `<div class="tn-row" style="display:flex;align-items:center;gap:.6em;padding:.32em 0">
      <span class="ic" style="display:inline-flex;--mdc-icon-size:1.25em;color:${tone ? HV_TONES[tone] : 'var(--hv-fg2)'}"><i data-i="${icon}"></i></span>
      <span style="font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(text)}</span></div>`;
    const rows = [];
    const al = s.alarm ? h.states[s.alarm] : null;
    if (al) {
      const armed = String(al.state).startsWith('armed');
      rows.push(row(armed ? 'mdi:shield-lock-outline' : al.state === 'triggered' ? 'mdi:bell-ring' : 'mdi:shield-off-outline',
        al.state === 'triggered' ? 'alert' : armed ? 'ok' : null, al.state === 'disarmed' ? 'Alarm off' : isOffline(al) ? 'Alarm offline' : hassState(h, al)));
    }
    const sum = (ids, word, okWord, icons, tail) => {
      const sts = ids.map((id) => h.states[id]).filter(Boolean);
      if (!sts.length) return;
      const bad = sts.filter((x) => isAlert(x)), off = sts.filter(isOffline);
      if (bad.length) rows.push(row(icons[1], 'alert', bad.length === 1 ? plusWord(nameFor(h, bad[0].entity_id, tail), word) : `${bad.length} ${word}`));
      else if (off.length) rows.push(row(icons[0], 'warn', `${off.length} offline`));
      else rows.push(row(icons[0], 'ok', okWord));
    };
    sum(s.locks, 'unlocked', 'All locked', ['mdi:lock-outline', 'mdi:lock-open-variant-outline'], 'locks');
    sum(s.openings, 'open', 'All closed', ['mdi:door-closed', 'mdi:door-open'], 'doors');
    if (s.calendars.length) {
      const evs = filterEvents(getEvents(h, s.calendars, 14, tile.refresher), s);
      const t = new Date(); t.setDate(t.getDate() + 1); t.setHours(0, 0, 0, 0);
      const t2 = new Date(t.getTime() + 86400e3);
      const first = (evs || []).find((e) => e.startD >= t && e.startD < t2) || (evs || []).find((e) => e.allDay && e.startD < t2 && e.endD > t);
      rows.push(row('mdi:calendar-blank-outline', null, evs === undefined ? 'Tomorrow: …' : first
        ? `Tomorrow ${first.allDay ? '' : `${timeFmt(first.startD, h)} `}· ${first.summary || 'Event'}` : 'Nothing tomorrow'));
    }
    return `<div class="t" style="align-items:stretch;justify-content:center;text-align:left;padding:0 5.7cqi;cursor:default;font-size:clamp(13px,4.4cqi,17px)">
      <div class="up" style="display:flex;align-items:center;gap:8px;font-size:.94em;letter-spacing:.04em;font-weight:700"><span class="ic" style="--mdc-icon-size:1.4em"><i data-i="mdi:weather-night"></i></span>Tonight</div>
      <div style="margin-top:10px">${rows.join('') || row('mdi:check', 'ok', 'All quiet')}</div></div>`;
  },
};

// ---- analog clock -------------------------------------------------------------------------
// the face is drawn once a minute; the hands turn by themselves (a CSS animation on plain elements
// over the drawing, which the browser's compositor runs: no script, style or layout work between
// minutes — it used to redraw its ~75 SVG parts every second, and SVG hands would need a layout each
// frame). Reduce motion: the hands stand still and move with the minute's redraw, no seconds hand.
R.clock = {
  tick: 5000,
  key: () => String(Math.floor(Date.now() / 60e3)),
  html(h, s) {
    const n = new Date();
    const sec = n.getSeconds() + n.getMilliseconds() / 1000, min = n.getMinutes() + sec / 60, hr = (n.getHours() % 12) + min / 60;
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
    // a hand: where it is now, then turning once per period from there (the animation's negative delay);
    // sizes in the face's units (100 across, 94 for the board's tighter crop) as % of the square dial
    const u = s.bare ? 94 : 100, pc = (x) => `${(x / u * 100).toFixed(3)}%`;
    const hand = (deg, period, len, w, color, cls = '') => `<div class="hand${cls}" style="transform:rotate(${deg.toFixed(2)}deg);animation-duration:${period}s;animation-delay:-${(deg / 360 * period).toFixed(1)}s"><i style="width:${pc(w)};height:${pc(len + w / 2)};margin-left:-${pc(w / 2)};margin-bottom:-${pc(w / 2)};background:${color}"></i></div>`;
    return `<div class="t white clock" style="padding:${s.bare ? '0' : '6%'};cursor:default"><div class="dial">
      <svg viewBox="${s.bare ? '3 3 94 94' : '0 0 100 100'}" font-family="${FONT}">${ticks}${nums}</svg>
      ${hand(hr * 30, 43200, 24, 2.6, 'currentColor')}${hand(min * 6, 3600, 36, 1.8, 'currentColor')}${hand(sec * 6, 60, 40, 0.8, 'var(--hv-accent)', ' sec')}
      <i class="cap" style="width:${pc(5)};height:${pc(5)}"></i></div></div>`;
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
        <div style="font-weight:700;font-size:min(11.5cqh,14cqi);letter-spacing:-.01em;line-height:1.05;white-space:nowrap"><span style="color:var(--hv-accent-tx, var(--hv-accent))">${esc(n.toLocaleDateString(lang, { weekday: 'short' }))}</span>
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
      <div class="up">${esc(s.title || (calName ? `Up next · ${calName}` : 'Up next'))}</div><div class="nm">${now && sp ? 'Now: ' : ''}${esc(eventTitle(e, s))}</div><div class="sb">${sp ? `${esc(sp.span)} · ${sp.days === 1 ? '1 day' : `${sp.days} days`}` : `${esc(w.day)} · ${esc(w.time)}`}</div></div></div>`;
  },
  // tap: the calendar sheet (calendar_days; see openCalendar); hold: Home Assistant's calendar dialog
  action: (h, s, tile, kind) => openCalendar(tile, s, kind),
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
      if (w.day !== lastDay) { rows += `<div class="up ag-day" style="margin:10px 0 4px;color:${s.bare ? 'var(--hv-fg)' : 'var(--hv-accent)'}">${esc(w.day)}</div>`; lastDay = w.day; }
      rows += `<div class="ag-ev" style="display:flex;gap:10px;align-items:baseline;padding:2px 0">
        <span style="width:7px;height:7px;border-radius:50%;background:var(--hv-accent);flex:none;transform:translateY(-1px)"></span>
        <span style="font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.summary)}</span>
        <span style="color:var(--hv-fg2);flex:none">${esc(w.time)}</span></div>`;
    }
    const span = (s.days || 7) === 14 ? 'the next 2 weeks' : (s.days || 7) === 7 ? 'the next week' : `the next ${s.days} days`;
    if (!rows) rows = `<div class="sb" style="margin-top:8px">${evs === undefined ? 'Loading…' : `Nothing in ${span}`}</div>`;
    // events past max (and those that don't fit, see update): "+3 more"
    else if (s.bare) s._more = Math.max(0, (evs || []).length - max);
    // the Widgets board: centred in its area, a hand-made HomeView's 16–17 px on a tablet
    return `<div class="t" style="align-items:stretch;justify-content:${s.bare ? 'center' : 'flex-start'};text-align:left;padding:${s.bare ? '0 5.7cqi' : '6% 7%'};cursor:pointer;font-size:${s.bare ? 'clamp(13px,4.4cqi,17px)' : 'clamp(12px,4cqi,16px)'}">
      <div style="display:flex;align-items:center;gap:8px${s.bare ? ';font-size:.94em;letter-spacing:.04em;font-weight:700' : ''}" class="up"><span class="ic" style="--mdc-icon-size:1.4em"><i data-i="mdi:calendar-month-outline"></i></span>${esc(s.title || 'Up next')}</div>
      <div class="ag-list${s.bare ? ' ag-bare' : ''}">${rows}</div></div>`;
  },
  // the Widgets board: show the events that fit its area, title always (a list taller than the area
  // used to lose its "Up next" title and could end on a lone day heading); never end on a heading,
  // and say how many more there are
  update(h, s, tile) {
    if (!s.bare || s.layout === 'list') return;
    const box = tile.shadowRoot?.querySelector('.t'), list = box?.querySelector('.ag-list');
    if (!box || !list) return;
    // drawn before the page put it on screen (no size yet): fit again once it's there
    if (!tile.isConnected) {
      if (!tile._fitLater) { tile._fitLater = true; requestAnimationFrame(() => { tile._fitLater = false; if (tile.isConnected) tile.refresh(); }); }
      return;
    }
    if (!tile._fitRo && window.ResizeObserver) {   // the board's area changes size: fit again
      let w0 = 0, h0 = 0;
      tile._fitRo = new ResizeObserver(([e]) => { const { width, height } = e.contentRect; if (Math.abs(width - w0) > 1 || Math.abs(height - h0) > 1) { w0 = width; h0 = height; tile.refresh(); } });
      tile._fitRo.observe(tile);
    }
    const room = box.clientHeight;
    if (!room) return;
    const head = box.firstElementChild;
    const need = () => (head?.offsetHeight || 0) + list.offsetHeight;
    const kids = () => [...list.children];
    let more = s._more || 0;
    const moreLine = () => { list.querySelector('.ag-more')?.remove(); if (more) list.insertAdjacentHTML('beforeend', `<div class="sb ag-more" style="margin-top:6px">+${more} more</div>`); };
    moreLine();
    while (need() > room && kids().filter((k) => k.classList.contains('ag-ev')).length > 1) {
      const evRows = kids().filter((k) => k.classList.contains('ag-ev'));
      evRows[evRows.length - 1].remove();
      more++;
      // never end on a day heading
      const last = kids().filter((k) => !k.classList.contains('ag-more')).pop();
      if (last?.classList.contains('ag-day')) last.remove();
      moreLine();
    }
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
  // tap: the calendar sheet (the Widgets board's Up next too); a list (layout: list) is one already
  action: (h, s, tile, kind) => (s.layout === 'list' ? null : openCalendar(tile, s, kind)),
  acts: (s) => s.layout !== 'list',
};

// ---- the calendar sheet --------------------------------------------------------------------------
// Tap a Next / Up next tile (or an agenda): the next calendar_days days (30) of the tile's calendars,
// with its filters (match, all_day, strip, join_weekends), by day — never fewer days than the tile
// itself looks ahead. Fetched when it opens, cached like the tiles' events (5 minutes). A hold, the
// tile's tap: more-info or calendar_days: false open Home Assistant's dialog for the first calendar,
// as before. The guest view has no calendar tiles.
const CAL_DAYS = 30;
function calendarDays(cfg, s) {
  const v = cfg?.calendar_days;
  if (v === false || v === 0 || v === '0') return 0;
  const n = Number(v);
  const want = typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && Number.isFinite(n)) ? Math.round(n) : CAL_DAYS;
  return clamp(Math.max(want > 0 ? want : CAL_DAYS, Number(s?.days) || 0), 1, 366);
}
function openCalendar(tile, s, kind) {
  let page = tile;
  while (page && !page._hvPage) page = page.getRootNode?.()?.host || null;
  const first = asList(s.calendars)[0];
  if (page?._guest) return null;
  if (kind === 'hold' || s.tap === 'more-info' || !page?._calendarSheet || !calendarDays(page._config?.options, s)) return first ? moreInfo(tile, first) : null;
  return page._calendarSheet(s);
}
/** Each calendar's colour: its member's (their room's colour, as on their page), else the page's accent.
 *  A calendar two members share keeps the accent. */
function calendarColors(m, dark) {
  const out = {};
  for (const mem of m?.members || []) {
    for (const c of mem.calendars || []) out[c] = c in out ? null : `hsl(${mem.hue} ${dark ? '82% 62%' : '78% 50%'})`;
  }
  for (const k of Object.keys(out)) if (!out[k]) delete out[k];
  return out;
}
/** The sheet's list: the events by day (Today, Tomorrow, "Saturday, Nov 15"), each with its
 *  calendar's colour, its title, the time (or All day / Now) and under it until when, where and, with
 *  several calendars, whose. evs: undefined = still loading. */
function calendarSheetHtml(h, evs, s, { days = CAL_DAYS, colors = {}, now = new Date() } = {}) {
  if (evs === undefined) return '<div class="cal-none">Loading…</div>';
  evs = (evs || []).filter((e) => e.endD > now);   // the cache is up to 5 minutes old: what has ended since goes
  const span = days === 7 ? 'the next week' : days === 14 ? 'the next 2 weeks' : `the next ${days} days`;
  if (!evs.length) return `<div class="cal-none">Nothing in ${esc(span)}</div>`;
  // four formatters for the whole list (toLocale…String makes a new one on every call: ~50 ms for 60 events)
  const lang = h.locale?.language || undefined;
  const F = (o) => { try { return new Intl.DateTimeFormat(lang, o); } catch (e) { return new Intl.DateTimeFormat(undefined, o); } };
  const fTime = F({ hour: 'numeric', minute: '2-digit' }), fShort = F({ weekday: 'short', month: 'short', day: 'numeric' }),
    fDay = F({ weekday: 'long', month: 'short', day: 'numeric' }), fWd = F({ weekday: 'short' });
  const time = (d) => fTime.format(d), short = (d) => fShort.format(d);
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const several = new Set(evs.map((e) => e.calendar)).size > 1;
  let out = '', lastKey = null;
  for (const e of evs.slice(0, 300)) {
    // an event under way since before today is listed under Today
    const d0 = new Date(Math.max(e.startD.getTime(), today.getTime())); d0.setHours(0, 0, 0, 0);
    const diff = Math.round((d0 - today) / 86400e3);
    if (d0.getTime() !== lastKey) {
      if (lastKey !== null) out += '</div>';
      const day = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : fDay.format(d0);
      out += `<div class="pop-sec cal-day">${esc(day)}</div><div class="cal-list">`;
      lastKey = d0.getTime();
    }
    const on = !e.allDay && e.startD <= now;
    const when = e.allDay ? 'All day' : on ? 'Now' : time(e.startD);
    let until = '';
    if (e.allDay) {
      const n = Math.max(1, Math.round((e.endD - e.startD) / 86400e3));
      if (n > 1) until = `until ${short(new Date(e.endD.getTime() - 86400e3))} · ${n} days`;
    } else {
      until = `until ${e.endD.toDateString() === (on ? now : e.startD).toDateString() ? '' : `${fWd.format(e.endD)} `}${time(e.endD)}`;
    }
    const who = several ? h.states[e.calendar]?.attributes?.friendly_name || '' : '';
    const sub = [who, until, e.location].filter(Boolean).join(' · ');
    out += `<div class="cal-ev${on ? ' now' : ''}"><span class="cal-dot" style="background:${colors[e.calendar] || 'var(--hv-accent)'}"></span>
      <span class="cal-t"><b>${esc(eventTitle(e, s))}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</span><span class="cal-w">${esc(when)}</span></div>`;
  }
  return `${out}</div>`;
}

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
/**
 * When a person's location was last reported: their tracker's last update (the person's `source`),
 * else the person's own. A phone's tracker can sit on an old fix for hours (location permission "While
 * using"), and "Home" alone says nothing about that. stale: older than location_stale_minutes (60;
 * false = never). { at, stale, text: "located 2:12 AM" | "location from yesterday 6:40 PM" } or null.
 */
const LOC_STALE_MIN = 60;
function locationStaleMinutes(cfg) {
  const v = cfg?.location_stale_minutes;
  if (v === false || v === 0) return 0;
  const n = Number(v);
  return typeof v === 'number' && n > 0 ? n : LOC_STALE_MIN;
}
function personLocated(h, personId, staleMin = LOC_STALE_MIN, now = Date.now()) {
  const st = h.states[personId];
  if (!st) return null;
  const src = typeof st.attributes?.source === 'string' ? h.states[st.attributes.source] : null;
  const at = new Date((src && src.last_updated) || st.last_updated || NaN);
  if (!Number.isFinite(at.getTime())) return null;
  const stale = staleMin > 0 && now - at.getTime() > staleMin * 60e3;
  const lang = h.locale?.language, day0 = new Date(now); day0.setHours(0, 0, 0, 0);
  const days = Math.floor((day0 - new Date(at).setHours(0, 0, 0, 0)) / 86400e3);
  const t = timeFmt(at, h);
  const when = days <= 0 ? t : days === 1 ? `yesterday ${t}` : days < 7 ? `${at.toLocaleDateString(lang, { weekday: 'short' })} ${t}`
    : at.toLocaleDateString(lang, { month: 'short', day: 'numeric' });
  return { at, stale, text: `${stale ? 'location from' : 'located'} ${when}` };
}
/** What a person tile's / hero's redraw depends on for that line: the tracker's update and the stale switch. */
const locatedKey = (h, personId, staleMin) => {
  const st = h.states[personId], src = st?.attributes?.source;
  const at = (typeof src === 'string' && h.states[src]?.last_updated) || st?.last_updated;
  return `${at}|${staleMin > 0 && at ? Date.now() - new Date(at).getTime() > staleMin * 60e3 : ''}`;
};
R.person = {
  tick: 60e3,
  key: (h, s) => `${h.states[s.entity]?.last_updated}|${h.states[s.battery]?.state}|${Math.floor(Date.now() / 60e3)}|${locatedKey(h, s.entity, s.staleMin ?? LOC_STALE_MIN)}`,
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
    // when the location was reported: always on a person's own page (located: true), elsewhere only
    // once it's old (in amber, instead of how long they've been there)
    const loc = personLocated(h, s.entity, s.staleMin ?? LOC_STALE_MIN);
    const tail = loc && (s.located || loc.stale)
      ? `<span${loc.stale ? ` style="color:${txVar('warn')}"` : ''}>${esc(loc.text)}</span>` : esc(relTime(st.last_changed));
    return `<div class="t flex${home ? ' on' : ''}">
      <div class="circ" style="width:min(56cqh,84px);height:min(56cqh,84px);box-shadow:0 0 0 3px ${home ? HV_TONES.ok : 'var(--hv-line)'}">${avatar}</div>
      <div class="tx"><div class="nm">${esc(name)}</div><div class="sb">${esc(where)} · ${tail}</div>
      ${bat !== null ? `<div class="sb"><span style="color:${bat < 20 ? txVar('alert') : 'inherit'}">${fmt(bat, 0)}% battery</span></div>` : ''}</div></div>`;
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
    // offline: the dark tile with a camera icon, the amber badge and the word
    const off = `<div style="margin:auto;display:flex;flex-direction:column;align-items:center;gap:6px;color:${KIND_TONES.neutral}">
        <span class="ic" style="position:relative;display:inline-flex;--mdc-icon-size:min(22cqh, 34px)"><i data-i="mdi:cctv-off"></i><span class="ob" aria-hidden="true" style="--hv-tile:#000">!</span></span>
        <span style="font-weight:650;font-size:clamp(12px,4.2cqi,15px);color:${HV_TONES.warn}">Offline</span></div>`;
    return `<div class="t" style="padding:0;background:#000;justify-content:flex-end">
      ${ok ? `<img class="cam" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:var(--hv-photo-filter, none)" alt="">` : off}
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
  key: (h, s) => Object.values(s.power || {}).map((id) => h.states[id]?.state + h.states[id]?.last_updated).join('|') + Math.floor(Date.now() / 30e3),
  html(h, s) {
    const p = s.power || {}, v = (id) => (id ? num(h.states[id]?.state) : null);
    const { solar, grid, battery, soc, home } = powerValues(h, p);
    const kw = (x) => (x === null ? '—' : Math.abs(x) >= 1000 ? `${fmt(Math.abs(x) / 1000, 1)} kW` : `${fmt(Math.abs(x), 0)} W`);
    const cell = (icon, label, value, sub, color, ent) => `<div data-more="${esc(ent || '')}" style="background:var(--hv-pill);border-radius:16px;padding:8px 12px;display:flex;flex-direction:column;justify-content:center;gap:1px;min-width:0">
      <span class="up" style="display:flex;align-items:center;gap:6px"><span class="ic" style="--mdc-icon-size:1.4em;color:${color}"><i data-i="${icon}"></i></span>${label}</span>
      <span style="font-weight:700;font-size:clamp(15px,6cqi,26px)">${value}</span><span class="sb" style="margin:0;white-space:normal">${sub}</span></div>`;
    const cells = [];
    const amps = v(p.current), volts = v(p.voltage);
    const homeSub = amps !== null ? `${fmt(amps, 1)} A${volts !== null ? ` at ${fmt(volts, 0)} V` : ''}` : 'Using now';
    if (p.solar) cells.push(cell('mdi:solar-power-variant', 'Solar', kw(solar), solar > 20 ? 'Producing' : 'Not producing', KIND_TONES.solar, p.solar));
    cells.push(cell('mdi:home-lightning-bolt-outline', 'Home', kw(home), homeSub, KIND_TONES.home, p.home || p.current || ''));
    if (p.grid || p.grid_in) cells.push(cell('mdi:transmission-tower', 'Grid', kw(grid), grid > 20 ? 'Importing' : grid < -20 ? 'Exporting' : 'Idle', KIND_TONES.neutral, p.grid || p.grid_in));
    if (p.battery || p.battery_out || p.battery_level) cells.push(cell(soc !== null ? `mdi:battery-${clamp(Math.round(soc / 10) * 10, 10, 100) === 100 ? '' : clamp(Math.round(soc / 10) * 10, 10, 90)}`.replace(/-$/, '') : 'mdi:home-battery-outline', 'Battery',
      soc !== null ? `${fmt(soc, 0)}%` : kw(battery), battery === null ? '' : battery > 20 ? `Discharging ${kw(battery)}` : battery < -20 ? `Charging ${kw(battery)}` : 'Idle', KIND_TONES.battery, p.battery_level || p.battery));
    return `<div class="t" style="cursor:default;align-items:stretch;justify-content:flex-start;padding:5%">
      <div class="up" style="margin-bottom:4%;display:flex;align-items:center;gap:8px">Right now ${(() => {
        const L = liveness(h, p);
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
      return `<div class="t card"><div class="up hd"><span class="ic" style="--mdc-icon-size:18px;color:${KIND_TONES.solar}"><i data-i="mdi:solar-power-variant"></i></span>Solar self-sufficiency · Today</div>
        <div class="big">${data === undefined ? '…' : pctS === null ? '—' : `${fmt(pctS, 0)}%`}</div>
        <div class="sb" style="white-space:normal">${esc(`${fmt(s._direct, 1)} of ${fmt(home, 1)} kWh of house use came straight from solar`)}</div></div>`;
    }
    s._direct = direct;
    const pct = home > 0.05 ? clamp(100 * (1 - grid / home), 0, 100) : null;
    const big = data === undefined ? '…' : !today ? '—' : pct === null ? '—' : `${fmt(pct, 0)}%`;
    const sub = !today ? `${label} — not today` : s.compact
      ? `Grid ${fmt(grid, 1)} of ${fmt(home, 1)} kWh<br>${esc(label)}${inNow ? ' · now' : ''}`
      : `${fmt(grid, 1)} of ${fmt(home, 1)} kWh from grid, ${label}${inNow ? ' (now)' : ''}`;
    return `<div class="t card${s.compact ? ' cw' : ''}"><div class="up hd"><span class="ic" style="--mdc-icon-size:18px;color:${KIND_TONES.battery}"><i data-i="mdi:home-battery-outline"></i></span>${esc(w.name || 'Window')} off‑grid${s.compact ? '' : ' · Today'}</div>
      <div class="big">${big}</div><div class="sb" style="white-space:normal">${s.compact && today ? sub : esc(sub)}</div></div>`;
  },
};
const fmtHour = (x) => { const hh = Math.floor(x) % 24, mm = Math.round((x % 1) * 60); const d = new Date(); d.setHours(hh, mm, 0, 0);
  return d.toLocaleTimeString(undefined, mm ? { hour: 'numeric', minute: '2-digit' } : { hour: 'numeric' }).replace(/\s?([AP])M/i, (m0, ap) => ap.toLowerCase() + 'm'); };

// ---- power outage: the loads list (Energy page) ------------------------------------------------
// One store for the ticks: an HA label on each device's switch ("Outage: turn off" unless
// energy.outage.label names another), so HomeView, the blueprint (blueprints/homeview_outage.yaml)
// and your own scripts read the same list (label_entities('Outage: turn off')). A second label
// (energy.outage.on_label) marks what to turn on in an outage. energy.outage:
//   false                 no outage section (the devices list stays, with "Devices today")
//   label / on_label      the labels (a name or a label id); made on the first tick if missing
//   off_action / on_action  "Turn off ticked" / "Turn back on" run this instead of
//                         homeassistant.turn_off / turn_on: script.x (gets entities: [the ticked],
//                         on_entities: [the on_label ones]) or { action, data }
//   switches              { <energy sensor>: <switch> | null } — a row's switch by hand
// Switching (a row's On / Off, the two buttons) asks first and is for admins only.
const OUTAGE_LABEL = 'Outage: turn off';
let hvLabels = null;   // the label registry once read: [{ label_id, name }]
async function readLabels(hass) { hvLabels = asList(await ws(hass, { type: 'config/label_registry/list' })).filter(isObj); return hvLabels; }
/** A label's id from its id or its name (any case); null while unknown. */
function findLabel(want) {
  if (!want) return null;
  const w = String(want).toLowerCase();
  return (hvLabels || []).find((l) => l.label_id === want || String(l.name || '').toLowerCase() === w)?.label_id || null;
}
async function ensureLabel(hass, want, icon) {
  await readLabels(hass);   // fresh: another screen may have made it meanwhile
  const id = findLabel(want);
  if (id) return id;
  // an id-like name (outage_turn_off) becomes "Outage turn off", which Home Assistant gives that id
  const name = /^[a-z0-9_]+$/.test(want) ? want.charAt(0).toUpperCase() + want.slice(1).replace(/_/g, ' ') : want;
  const made = await ws(hass, { type: 'config/label_registry/create', name, icon, color: 'red' });
  hvLabels = [...(hvLabels || []), made];
  return made.label_id;
}
/** energy.outage → the section's settings (show: false = no outage section). */
function outageOpts(ec) {
  const o = ec?.outage;
  if (o === false) return { show: false };
  const x = isObj(o) ? o : {};
  return { show: true, label: x.label || OUTAGE_LABEL, onLabel: x.on_label || null, offAction: x.off_action || null, onAction: x.on_action || null,
    switches: isObj(x.switches) ? x.switches : {} };
}
/** A row carries the tick when its switch (or another entity for the same device, e.g. a light made
 *  from the switch) has the label. */
const hasLabel = (h, l, lab) => !!lab && !!l?.sw && [l.sw, ...asList(l.alts)].some((id) => asList(h.entities?.[id]?.labels).includes(lab));

/**
 * A device from the Energy settings → its switch, power and current sensors. The switch is the
 * one named like the energy sensor (sensor.pump_energy → switch.pump, light.pump, fan.pump;
 * sensor.plug_energy_2 → switch.plug_2), on its device or anywhere; else the device's only switch.
 * A device with several switches and none named like it gets none (no button) — "the first switch on
 * the device" switched the wrong channel on multi-channel plugs. switches: { <sensor>: <switch> }
 * sets one by hand (null: none).
 */
const LOAD_SWITCH = ['switch', 'light', 'fan'];
function pairLoad(h, statId, switches = {}) {
  const obj = String(statId).split('.')[1] || '';
  const m = obj.match(/^(.*?)_(?:total_)?(?:energy|consumption|kwh)(?:_total|_today|_daily)?(_\d+)?$/i);
  const base = m ? m[1] : obj, chan = m?.[2] || '', stem = base + chan;
  const devId = h.entities?.[statId]?.device_id;
  const ents = devId ? (deviceIndex(h)[devId] || []).map((id) => h.entities[id]).filter((e) => h.states[e.entity_id]) : [];
  const exists = (id) => !!h.states[id];
  let sw = null, alts = [];
  if (Object.prototype.hasOwnProperty.call(switches, statId)) sw = switches[statId] || null;
  else {
    const named = LOAD_SWITCH.map((d) => `${d}.${stem}`).filter(exists);
    if (named.length) { [sw, ...alts] = named; }
    else {
      // the device's switches; a switch and the light / fan made from it share a name: one device
      const own = ents.filter((e) => LOAD_SWITCH.includes(domainOf(e.entity_id)) && !e.entity_category).map((e) => e.entity_id);
      const names = [...new Set(own.map((id) => id.split('.')[1]))];
      if (names.length === 1) {
        const one = LOAD_SWITCH.map((d) => `${d}.${names[0]}`).filter((id) => own.includes(id));
        [sw, ...alts] = one;
      }
    }
  }
  const sensor = (dc, word) => {
    const exact = [`sensor.${stem}_${word}`, `sensor.${base}_${word}${chan}`].find((id) => h.states[id]?.attributes?.device_class === dc);
    if (exact) return exact;
    const list = ents.map((e) => e.entity_id).filter((id) => domainOf(id) === 'sensor' && h.states[id]?.attributes?.device_class === dc);
    return list.find((id) => id.startsWith(`sensor.${stem}_`)) || (list.length === 1 ? list[0] : null);
  };
  return { sw, alts, power: sensor('power', 'power'), current: sensor('current', 'current') };
}

/**
 * What the grid-status entity says: up | down | unknown (unknown / unavailable) | missing | odd (a
 * state it can't place, e.g. "Transition") | none (no entity). Never "up" unless it says so.
 * grid_status: <entity> | { entity, up: [states], down: [states] } — with up: only those are up;
 * with down: only those are down. Without either, the usual words (Active / on / connected … are up;
 * Inactive / off / off_grid / islanded / on_battery … down); a binary sensor named for the outage
 * (off_grid, outage, on battery) or of class problem is down while on.
 */
const GRID_UP = ['on', 'active', 'connected', 'online', 'up', 'on_grid', 'grid', 'grid_connected', 'normal', 'ok', 'true', 'yes'];
const GRID_DOWN = ['off', 'off_grid', 'islanded', 'island', 'disconnected', 'down', 'inactive', 'on_battery', 'battery', 'outage',
  'offline', 'grid_down', 'false', 'no', 'lost', 'fault'];
function gridState(h, g) {
  const spec = typeof g === 'string' ? { entity: g } : isObj(g) ? g : {};
  const id = typeof spec.entity === 'string' ? spec.entity : null;
  if (!id) return { state: 'none' };
  const st = h.states[id];
  if (!st) return { state: 'missing', id };
  const v = String(st.state).toLowerCase();
  if (!v || UNAVAILABLE.includes(v)) return { state: 'unknown', id };
  const L = (x) => asList(x).map((s) => String(s).toLowerCase());
  const up = L(spec.up), down = L(spec.down);
  const inverted = domainOf(id) === 'binary_sensor' && (st.attributes?.device_class === 'problem' || /off.?grid|outage|on.?batter|island|grid.?(down|fail|loss|lost)/i.test(id));
  let s;
  if (up.length || down.length) s = up.includes(v) ? 'up' : down.includes(v) ? 'down' : up.length && !down.length ? 'down' : down.length && !up.length ? 'up' : 'odd';
  else if (inverted && (v === 'on' || v === 'off')) s = v === 'on' ? 'down' : 'up';
  else s = GRID_UP.includes(v) ? 'up' : GRID_DOWN.includes(v) ? 'down' : 'odd';
  return { state: s, id, word: hassState(h, st) };
}
const GRID_WORD = { up: ['grid on', 'ok'], down: ['GRID DOWN', 'alert'], unknown: ['grid status unknown', 'warn'], missing: ['grid sensor not found', 'warn'] };

/** a with b laid over it: blocks (plain objects) key by key, at any depth; anything else replaces;
 *  null removes the key. */
function mergeOpts(a, b) {
  if (!isObj(b)) return a;
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (v === null) delete out[k];
    else if (isObj(v) && isObj(out[k])) out[k] = mergeOpts(out[k], v);
    else out[k] = v;
  }
  return out;
}
/** The grid-status entity's own state while HomeView reads it as down (gridState: up / down lists, a
 *  binary sensor either way round, any case), else null. Power Flow Card Plus compares one exact
 *  state, so it gets the one the entity is in: every state that means down shows as an outage. */
function flowOutage(h, grid) {
  if (!grid) return null;
  const g = gridState(h, grid);
  return g.state === 'down' ? String(h.states[g.id].state) : null;
}
// the card's 0.3.5 names for three settings, and the old ones (older versions read only those)
const PFCP_RENAMED = [['w_decimals', 'base_decimals'], ['kw_decimals', 'kilo_decimals'], ['watt_threshold', 'kilo_threshold']];
/**
 * Power Flow Card Plus's settings on the Energy page: HomeView's number format (whole watts, one
 * decimal from 1 kW, trailing zeros kept: "3.0 kW", as its own tiles), the grid in HomeView's red with
 * "Grid down" while the grid-status entity reads down (alert: its state then, or null), and
 * energy.flow_card_options laid over all of it (mergeOpts: entities.grid.power_outage: { … } changes
 * only those keys, null removes one). A power_outage of your own with an entity or state_alert is
 * passed as it is, whatever the state (the card then decides).
 */
function flowCardConfig(entities, ec, grid, alert) {
  const fo = isObj(ec?.flow_card_options) ? ec.flow_card_options : {};
  const mine = fo.entities?.grid?.power_outage;
  const own = isObj(mine) && (mine.entity !== undefined || mine.state_alert !== undefined);
  const ents = { ...entities };
  if (ents.grid && grid?.entity && (alert !== null || own)) {
    ents.grid = { ...ents.grid, power_outage: { entity: grid.entity, ...(own ? {} : { state_alert: alert }),
      label_alert: 'Grid down', icon_alert: 'mdi:transmission-tower-off', color_alert: txVar('alert') } };
  }
  const conf = mergeOpts({ type: 'custom:power-flow-card-plus', entities: ents,
    clickable_entities: true, use_new_flow_rate_model: true, base_decimals: 0, kilo_decimals: 1, kilo_threshold: 1000, keep_trailing_zeros: true,
    w_decimals: 0, kw_decimals: 1, watt_threshold: 1000,
    display_zero_lines: { mode: 'transparency', transparency: 50 }, min_flow_rate: 0.75, max_flow_rate: 6 }, fo);
  // a setting given by one name only: the other name follows it
  const put = (k, v) => { if (v === null) delete conf[k]; else conf[k] = v; };
  for (const [old, now] of PFCP_RENAMED) {
    if (fo[old] !== undefined && fo[now] === undefined) put(now, fo[old]);
    else if (fo[now] !== undefined && fo[old] === undefined) put(old, fo[now]);
  }
  return conf;
}

/** off_action / on_action: run it with the ticked lists; none = homeassistant.turn_off / turn_on on the ticked. */
function outageRun(h, act, offIds, onIds, fallback) {
  if (!act) return offIds.length ? h.callService('homeassistant', fallback, {}, { entity_id: offIds }) : null;
  const a = typeof act === 'string' ? { action: act } : isObj(act) ? act : {};
  const name = String(a.action || a.service || '');
  if (!/^[a-z_]+\.[a-z0-9_]+$/.test(name)) return null;
  const lists = { entities: offIds, on_entities: onIds };
  const data = isObj(a.data) ? a.data : {};
  if (name === 'script.turn_on') return callAction(h, name, { ...data, variables: { ...(isObj(data.variables) ? data.variables : {}), ...lists } }, a.target);
  if (name.startsWith('script.')) return callAction(h, name, { ...data, ...lists });
  return callAction(h, name, data, a.target || { entity_id: offIds });
}
const actionName = (h, act) => {
  const id = typeof act === 'string' ? act : isObj(act) ? (act.action === 'script.turn_on' ? asList(act.target?.entity_id || act.data?.entity_id)[0] : act.action) : null;
  return id ? h.states[id]?.attributes?.friendly_name || id : null;
};
const nameList = (names) => names.slice(0, 6).join(', ') + (names.length > 6 ? ` and ${names.length - 6} more` : '');

R.energy_load = {
  tick: 60e3,
  key: (h, s) => [s.power, s.current, s.sw].map((id) => h.states[id]?.state).join('|') + statTag(h, s.stat)
    + hasLabel(h, s, findLabel(s.outage?.label)) + hasLabel(h, s, findLabel(s.outage?.onLabel)) + !!h.user?.is_admin,
  html(h, s, tile) {
    const kwh = getStatToday(h, s.stat, tile.refresher, s.power ? { power: s.power } : null);
    const w = s.power ? num(h.states[s.power]?.state) : null, a = s.current ? num(h.states[s.current]?.state) : null;
    const sw = s.sw ? h.states[s.sw] : null, off = isOffline(sw), on = sw ? sw.state === 'on' : w !== null && w > 1;
    const o = s.outage || {}, admin = !!h.user?.is_admin;
    const ticked = hasLabel(h, s, findLabel(o.label)), tickedOn = hasLabel(h, s, findLabel(o.onLabel));
    const sub = [w !== null ? `${fmt(w, 0)} W` : null, a !== null ? `${fmt(a, 2)} A` : null].filter(Boolean).join(' · ');
    const ticks = o.show && s.sw && admin
      ? `<button class="lt-b${ticked ? ' tk' : ''}" data-act="tick" aria-pressed="${ticked}" aria-label="Turn off in an outage" title="${ticked ? 'Turned off in an outage — tap to keep on' : 'Tap: turn off in an outage'}"><ha-icon icon="mdi:power-plug-off-outline"></ha-icon></button>`
        + (o.onLabel ? `<button class="lt-b on${tickedOn ? ' tk' : ''}" data-act="tick-on" aria-pressed="${tickedOn}" aria-label="Turn on in an outage" title="${tickedOn ? 'Turned on in an outage — tap to undo' : 'Tap: turn on in an outage'}"><ha-icon icon="mdi:power-plug-outline"></ha-icon></button>` : '')
      // everyone else sees what's ticked, without the buttons
      : o.show && (ticked || tickedOn) ? `<span class="lt-b ro tk${tickedOn ? ' on' : ''}" title="${tickedOn ? 'Turned on in an outage' : 'Turned off in an outage'}"><ha-icon icon="${tickedOn ? 'mdi:power-plug-outline' : 'mdi:power-plug-off-outline'}"></ha-icon></span>`
      // an empty slot as wide as the ticks, so every row's icon and name stay in one column (a row
      // without a switch; for non-admins a row that isn't ticked)
      : o.show ? '<span class="lt-b ro" aria-hidden="true"></span>'.repeat(admin && o.onLabel ? 2 : 1) : '';
    // On / Off: admins switch it (asked first); everyone else sees the state
    const sw1 = !sw ? '' : off ? `<span class="onoff ro na">Offline</span>`
      : admin ? `<button class="onoff${on ? ' on' : ''}" data-act="${on ? 'off' : 'on'}" aria-pressed="${on}" aria-label="${esc(s.name)}: ${on ? 'on' : 'off'}">${on ? 'On' : 'Off'}</button>`
      : `<span class="onoff ro${on ? ' on' : ''}">${on ? 'On' : 'Off'}</span>`;
    return `<div class="t flex row-t load${on ? ' on' : ''}" style="--hv-ic-on:${HV_TONES.on}">
      ${ticks}
      <div class="ic"><i data-i="${esc(s.icon || 'mdi:power-plug-outline')}"></i></div>
      <div class="tx" style="flex:1"><div class="nm">${esc(s.name)}</div><div class="sb">${esc(sub || (sw ? (off ? 'Offline' : hassState(h, sw)) : ''))}</div></div>
      <b class="kwh">${kwh === undefined ? '…' : `${fmt(kwh || 0, 2)} kWh`}</b>
      ${sw1}</div>`;
  },
  async action(h, s, tile, kind, ev) {
    const act = ev?.target?.closest?.('[data-act]')?.dataset?.act;
    if (kind === 'hold' || !act || !h.user?.is_admin) return moreInfo(tile, s.power || s.stat);
    const o = s.outage || {};
    if ((act === 'on' || act === 'off') && s.sw) {
      const st = h.states[s.sw];
      if (!st || isOffline(st)) return moreInfo(tile, s.sw);
      // what the button said when it was tapped (a toggle could do the opposite of what was asked)
      const turnOff = act === 'off', verb = turnOff ? 'Turn off' : 'Turn on';
      const w = s.power ? toWatts(h.states[s.power]) : null;
      const ok = await hvConfirm(tile, { title: `${verb} ${s.name}?`, action: verb, tone: turnOff ? 'alert' : null,
        body: [stateText(h, st), w !== null && w >= 1 ? `draws ${fmtKw(w)}` : null].filter(Boolean).join(' · ') });
      if (!ok) return null;
      return h.callService('homeassistant', turnOff ? 'turn_off' : 'turn_on', {}, { entity_id: s.sw });
    }
    if ((act === 'tick' || act === 'tick-on') && s.sw && o.show) {
      // a device is on one list at most: ticking it on one takes it off the other
      const want = act === 'tick' ? o.label : o.onLabel, other = act === 'tick' ? o.onLabel : o.label;
      if (!want) return null;
      const id = await ensureLabel(h, want, act === 'tick' ? 'mdi:power-plug-off-outline' : 'mdi:power-plug-outline');
      const otherId = other ? findLabel(other) : null;
      const has = hasLabel(h, s, id);
      for (const ent of [s.sw, ...asList(s.alts)]) {
        const cur = asList(h.entities?.[ent]?.labels);
        let next = cur.filter((x) => x !== id && x !== otherId);
        if (!has && ent === s.sw) next = [...next, id];
        if (next.length !== cur.length || next.some((x, i) => x !== cur[i])) await ws(h, { type: 'config/entity_registry/update', entity_id: ent, labels: next });
      }
    }
    return null;
  },
};
R.energy_outage = {
  key: (h, s) => {
    const off = findLabel(s.outage?.label), on = findLabel(s.outage?.onLabel), g = gridState(h, s.grid);
    return `${g.state}|${g.word}|${s.loads.map((l) => `${+hasLabel(h, l, off)}${+hasLabel(h, l, on)}${h.states[l.sw]?.state || ''}`).join('')}|${s.all}|${!!h.user?.is_admin}`;
  },
  html(h, s) {
    const o = s.outage || {}, admin = !!h.user?.is_admin;
    const more = s.more ? `<button class="txt" data-act="all">${s.all ? 'Show fewer' : `Show all ${s.total}`}</button>` : '';
    if (!o.show) {   // energy.outage: false — the devices list without the outage part
      return `<div class="t flex row-t outage" style="cursor:default">
        <div class="ic"><i data-i="mdi:power-plug-outline"></i></div>
        <div class="tx" style="flex:1"><div class="nm">Devices today</div><div class="sb" style="white-space:normal">Sorted by today's energy.</div></div>${more}</div>`;
    }
    const g = gridState(h, s.grid);
    const [word, tone] = GRID_WORD[g.state] || (g.state === 'odd' ? [`grid: ${g.word}`, 'warn'] : ['', null]);
    const offLab = findLabel(o.label), onLab = findLabel(o.onLabel);
    const ticked = s.loads.filter((l) => hasLabel(h, l, offLab)), tickedOn = s.loads.filter((l) => hasLabel(h, l, onLab));
    const icon = g.state === 'down' ? 'mdi:transmission-tower-off' : 'mdi:transmission-tower';
    const icColor = tone ? HV_TONES[tone] : 'var(--hv-icon)';
    const run = actionName(h, o.offAction);
    const how = o.onLabel ? 'Tick <ha-icon icon="mdi:power-plug-off-outline" class="inl"></ha-icon> what to turn off and <ha-icon icon="mdi:power-plug-outline" class="inl"></ha-icon> what to turn on when the grid goes down'
      : 'Tick <ha-icon icon="mdi:power-plug-off-outline" class="inl"></ha-icon> what to turn off when the grid goes down';
    const sub = admin ? `${how} — sorted by today's energy. ${run ? `Turn off runs ${esc(run)}.` : 'Automatic: the HomeView outage blueprint.'}`
      : 'Ticked devices are turned off when the grid goes down — sorted by today\'s energy.';
    const can = (list, act) => list.length > 0 || !!act;
    return `<div class="t flex row-t outage" style="cursor:default">
      <div class="ic" style="color:${icColor}"><i data-i="${icon}"></i></div>
      <div class="tx" style="flex:1"><div class="nm">Power outage${word ? ` <span style="font-weight:500;color:${txVar(tone)}">· ${esc(word)}</span>` : ''}</div>
        <div class="sb" style="white-space:normal">${sub}</div></div>
      ${admin ? `<button class="txt" data-act="off" ${can(ticked, o.offAction) ? '' : 'disabled'}>Turn off ticked (${ticked.length})</button>
      <button class="txt" data-act="on" ${can(ticked, o.onAction) ? '' : 'disabled'}>Turn back on</button>` : ''}
      ${more}</div>`;
  },
  async action(h, s, tile, kind, ev) {
    const act = ev?.target?.closest?.('[data-act]')?.dataset?.act;
    if (act === 'all') return s.page.toggleAllLoads();
    const g = gridState(h, s.grid);
    if (!act) return kind === 'hold' && g.id ? moreInfo(tile, g.id) : null;
    const o = s.outage || {};
    if (!o.show || !h.user?.is_admin) return null;   // switching: admins only
    const offLab = findLabel(o.label), onLab = findLabel(o.onLabel);
    const off = s.loads.filter((l) => hasLabel(h, l, offLab)), onl = s.loads.filter((l) => hasLabel(h, l, onLab));
    const offIds = off.map((l) => l.sw), onIds = onl.map((l) => l.sw);
    if (act === 'off' || act === 'on') {
      const turnOff = act === 'off', script = turnOff ? o.offAction : o.onAction;
      if (!offIds.length && !script) return null;
      const run = actionName(h, script);
      const n = offIds.length, devs = `${n} device${n === 1 ? '' : 's'}`;
      const ok = await hvConfirm(tile, {
        title: turnOff ? `Turn off ${n ? devs : 'the ticked devices'}?` : `Turn ${n ? devs : 'the ticked devices'} back on?`,
        action: turnOff ? 'Turn off' : 'Turn on', tone: turnOff ? 'alert' : null,
        body: [nameList(off.map((l) => l.name)), turnOff && onl.length ? `On in an outage: ${nameList(onl.map((l) => l.name))}` : '',
          run ? `Runs ${run}.` : ''].filter(Boolean).join(' · ') });
      if (!ok) return null;
      return outageRun(h, script, offIds, onIds, turnOff ? 'turn_off' : 'turn_on');
    }
    return null;
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
    return `<div class="t flex${on ? ' on' : ''}" style="--hv-ic-on:${HV_TONES.on}"><div class="ic"><i data-i="${esc(s.icon || 'mdi:power-plug-outline')}"></i></div>
      <div class="tx"><div class="nm">${esc(s.name)}</div><div class="sb">${kwh === undefined ? '…' : `${fmt(kwh || 0, 2)} kWh today`}${w !== null ? ` · ${fmt(w, 0)} ${esc(u)}` : ''}</div></div></div>`;
  },
  action: (h, s, tile) => moreInfo(tile, s.power || s.stat),
};

// ---- all the lights of one room as one tile ------------------------------------------------------
R.room_lights = {
  key: (h, s) => s.lights.map((id) => h.states[id]?.state).join(''),
  html(h, s) {
    const on = s.lights.filter((id) => h.states[id]?.state === 'on').length, n = s.lights.length;
    // the state first ("2 on · Kitchen"); on the room's own page just the state ("2 of 3 on", "All 3 off")
    const state = s.noHold ? (on ? (n > 1 ? `${on} of ${n} on` : 'On') : n > 1 ? `All ${n} off` : 'Off')
      : on ? (n > 1 ? (s.size?.[0] >= 2 ? `${on} of ${n} on` : `${on} on`) : 'On') : 'Off';
    return `<div class="t flex${on ? ' on' : ''}" style="--hv-ic-on:${HV_TONES.on}"><div class="ic"><i data-i="${on ? 'mdi:lightbulb-group' : 'mdi:lightbulb-group-outline'}"></i></div>
      <div class="tx"><div class="nm">${esc(s.name || 'Lights')}</div><div class="sb">${esc(s.noHold ? state : withRoom(state, s.roomName))}</div></div></div>`;
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
      ${t !== null ? `<div class="tx" style="align-items:flex-end;text-align:right;flex:none"><div class="nm" style="font-size:clamp(16px,17cqh,32px)">${fmt(t, 0)}°</div>
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
  key: (h, s) => [s.room?.temp, s.room?.hum, ...(s.openings || [])].map((id) => h.states[id]?.state).join('|') + new Date().getDate()
    + (s.room ? `|${comfortKey(h, s.room)}` : '') + (s.person ? `|${h.states[s.person]?.state}|${relTime(h.states[s.person]?.last_changed)}|${locatedKey(h, s.person, s.staleMin ?? LOC_STALE_MIN)}` : ''),
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
    // a person's page: where they are instead of the date (the page's header has the date) — "● Home"
    // with a green dot, or "Away · 2 h"
    const ps = s.person ? h.states[s.person] : null;
    // and under it, quietly, when that location was reported ("located 2:12 AM"); amber once it's old
    // ("location from 2:12 AM"): a phone stuck on an old fix still says Home
    const loc = ps ? personLocated(h, s.person, s.staleMin ?? LOC_STALE_MIN) : null;
    const pres = ps ? (ps.state === 'home' ? `<span class="pres home"><i></i>Home</span>`
      : `<span class="pres">${esc(hassState(h, ps))}${ps.last_changed ? ` · ${esc(relTime(ps.last_changed))}` : ''}</span>`) : '';
    const where = ps ? `<span class="who">${pres}${loc ? `<span class="loc${loc.stale ? ' stale' : ''}">${esc(loc.text)}</span>` : ''}</span>`
      : `<span class="sb">${esc(new Date().toLocaleDateString(h.locale?.language, { weekday: 'long', month: 'short', day: 'numeric' }))}</span>`;
    // the temperature once, big (the header has it to a tenth); the footer says how it feels and the humidity
    const foot = [feel ? `<span><span class="ic" style="--mdc-icon-size:1.2em;color:${KIND_TONES.temperature}"><i data-i="mdi:thermometer"></i></span><em style="color:${cf.t?.color || 'inherit'};margin:0">${feel}</em></span>` : '',
      hu !== null ? `<span><span class="ic" style="--mdc-icon-size:1.2em;color:${KIND_TONES.humidity}"><i data-i="mdi:water-percent"></i></span>${fmt(hu, 0)}%${hfeel ? ` <em style="color:${cf.h?.color || 'inherit'}">${hfeel}</em>` : ''}</span>` : ''].join('');
    return `<div class="t hero">
      <div class="hh"><span>${esc(s.title)}</span>${where}</div>
      <div class="hbig">${t !== null ? `${fmt(t, 0)}°` : '—'}</div>
      <div class="ops">${ops}</div>
      ${foot ? `<div class="hf">${foot}</div>` : ''}</div>`;
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
    return `<div class="t flex${w > 1 ? ' on' : ''}" style="--hv-ic-on:${HV_TONES.on}"><div class="ic"><i data-i="mdi:flash"></i></div>
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
  key: (h, s) => Object.values(s.power || {}).map((id) => h.states[id]?.state).join('|'),
  html(h, s) {
    const p = s.power || {}, P = powerValues(h, p);
    const has = { solar: !!p.solar, battery: !!(p.battery || p.battery_out || p.battery_in || p.battery_level) };
    const act = (x) => x !== null && x > 20;
    const lines = [];
    const L = (d, color, on, rev) => lines.push(`<path class="fl${on ? ' on' : ''}${rev ? ' rev' : ''}" d="${d}" pathLength="100" style="stroke:${color}" vector-effect="non-scaling-stroke"/>`);
    const K = KIND_TONES;
    L('M15,50 L85,50', K.grid, act(P.grid) || act(-P.grid), act(-P.grid));
    if (has.solar) { L('M50,16 Q50,50 85,50', K.solar, act(P.solar) && act(P.home)); L('M50,16 Q50,50 15,50', K.solar, act(-P.grid) && act(P.solar)); }
    if (has.battery) {
      L('M50,84 Q50,50 85,50', K.battery, act(P.battery));
      if (has.solar) L('M50,16 L50,84', K.solar, act(-P.battery) && act(P.solar));
      L('M15,50 Q50,50 50,84', K.grid, act(-P.battery) && act(P.grid));
    }
    const node = (x, y, color, icon, value, label, extra = '') => `<div class="node" style="left:${x}%;top:${y}%;border-color:${color}">
      <ha-icon icon="${icon}" style="color:${color}"></ha-icon><b>${value}</b>${extra}<span class="nl">${label}</span></div>`;
    const batIcon = P.soc !== null ? `mdi:battery-${P.soc >= 95 ? 'high' : P.soc >= 50 ? 'medium' : P.soc >= 15 ? 'low' : 'outline'}` : 'mdi:home-battery-outline';
    return `<div class="t" style="padding:0;cursor:default"><div class="flowbox">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">${lines.join('')}</svg>
      ${has.solar ? node(50, 16, K.solar, 'mdi:solar-power-variant', kwFmt(P.solar), 'Solar') : ''}
      ${node(15, 50, K.grid, 'mdi:transmission-tower', kwFmt(P.grid), 'Grid', P.grid !== null ? `<small>${P.grid > 20 ? 'in' : P.grid < -20 ? 'out' : ''}</small>` : '')}
      ${node(85, 50, K.home, 'mdi:home', kwFmt(P.home), 'Home')}
      ${has.battery ? node(50, 84, K.battery, batIcon, P.soc !== null ? `${fmt(P.soc, 0)}%` : kwFmt(P.battery), 'Battery', P.soc !== null && P.battery !== null ? `<small>${kwFmt(P.battery)}</small>` : '') : ''}
    </div></div>`;
  },
  action(h, s, tile) { const p = s.power || {}; const id = p.home || p.grid || p.grid_in || p.solar; if (id) moreInfo(tile, id); },
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
// a tablet that runs for weeks resolves a photo every interval (about 720 a day at 2 min): the
// resolved addresses and sizes are kept for the last SLIDE_KEEP photos only
const SLIDE_KEEP = 50;
function trimSlides(st) {
  const ids = Object.keys(st.urls);
  if (ids.length > SLIDE_KEEP + 10) {
    ids.slice(0, ids.length - SLIDE_KEEP).forEach((id) => { delete st.urls[id]; });
    const live = new Set(Object.values(st.urls).map((c) => c.url));
    for (const map of [st.ok, st.dim]) for (const u of Object.keys(map)) if (!live.has(u)) delete map[u];
  }
  const bad = Object.keys(st.bad);
  if (bad.length > 200) bad.slice(0, bad.length - 200).forEach((id) => { delete st.bad[id]; });
}
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
        img.onload = () => { delete st.urls[id]; st.urls[id] = { url: id, exp: Infinity }; st.ok[id] = true; st.dim[id] = img.naturalWidth / (img.naturalHeight || 1); delete st.pending[id]; trimSlides(st); then?.(id); };
        img.onerror = () => { delete st.pending[id]; };
        img.src = id;
        return;
      }
      const thumb = s.thumbnail && !st.bad[id] ? id.replace(/^(.*)\/([^/]+)$/, (m0, dir, name) => s.thumbnail.replace('{dir}', dir).replace('{name}', name)) : id;
      ws(h, { type: 'media_source/resolve_media', media_content_id: thumb, expires: 86400 })
        .then((r) => new Promise((ok, fail) => {
          if (!r?.url) { fail(); return; }
          const img = new Image();
          img.onload = () => { delete st.urls[id]; st.urls[id] = { url: r.url, exp: Date.now() + 82800e3 }; st.ok[r.url] = true; st.dim[r.url] = img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1.5; trimSlides(st); ok(r.url); };
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

/**
 * The hass an embedded HA card gets: Home Assistant's own, but with HomeView's mode as
 * themes.darkMode — HA's cards pick colours by it (the energy cards' bars and table bullets, …),
 * and HA's may be light while HomeView is dark (theme: dark, the night face) or the other way round.
 * One copy per hass update and mode; the themes object is reused while HA's doesn't change.
 */
const cardHass = (() => {
  const copies = new WeakMap(), themes = new WeakMap();
  return (h, dark) => {
    if (!h || dark === undefined || !!h.themes?.darkMode === !!dark) return h;
    const k = dark ? 'd' : 'l';
    let c = copies.get(h);
    if (c?.[k]) return c[k];
    if (!c) copies.set(h, (c = {}));
    const src = h.themes || {};
    let t = themes.get(src);
    if (!t) themes.set(src, (t = {}));
    if (!t[k]) t[k] = { ...src, darkMode: !!dark };
    return (c[k] = { ...h, themes: t[k] });
  };
})();

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
    const tick = r?.tick || this._spec?.tick;   // spec.tick: a time shown as "in 2 h" (format:)
    if (tick && !this._timer) {
      this._timer = setInterval(() => {
        this._render();
        if (r.update && this._hass && !this._failed) { try { r.update(this._hass, this._spec, this); } catch (e) { this._fail(e); } }
      }, tick);
    }
    if ('IntersectionObserver' in window && !this._io) {
      this._io = new IntersectionObserver((es) => { this.visible = es[0].isIntersecting; });
      this._io.observe(this);
    }
  }

  disconnectedCallback() {
    clearInterval(this._timer); this._timer = null;
    this._io?.disconnect(); this._io = null;
    this._fitRo?.disconnect(); this._fitRo = null;
  }

  _render() {
    if (!this._hass || !this._spec) return;
    if (this._spec.kind === 'card') { this._renderCard(); return; }
    const r = R[this._spec.kind];
    if (!r) return;
    // one tile that can't be drawn (a renderer throws on odd data) shows a placeholder; the rest of
    // the page carries on (a throw here used to take the whole page down)
    let key, html;
    try { key = r.key(this._hass, this._spec) + (this._edit ? '|edit' + this._edit.actions.join() : ''); } catch (e) { this._fail(e); return; }
    if (key === this._key) return;
    try { html = r.html(this._hass, this._spec, this); } catch (e) { this._fail(e); return; }
    this._key = key;
    this._failed = null;
    const pool = iconPool(this._wrap);
    this._wrap.innerHTML = html + this._editHtml();
    const card = this._wrap.firstElementChild;
    if (card && this._spec.bare) card.classList.add('bare');
    if (card && this._spec.row && card.classList.contains('flex')) card.classList.add('row-t');
    fillIcons(this._wrap, this._hass, pool);
    if (r.update) { try { r.update(this._hass, this._spec, this); } catch (e) { this._fail(e); return; } }
    this._a11y(card, r);
    // size: … x auto on a HomeView widget (an agenda list …): the rows its content needs, measured
    // after drawing (as cards are); grows with the content, never clipped
    if (card && ((this._spec.size || [])[1] === 'auto' || (this._spec.phoneSpan || [])[1] === 'auto')) {
      requestAnimationFrame(() => { const hh = Math.ceil(card.scrollHeight); if (hh && hh !== this._hvAutoH) { this._hvAutoH = hh; this._hvAuto?.(); } });
    }
  }

  /** A renderer threw: a quiet placeholder instead of the tile (the reason for admins), once per reason. */
  _fail(e) {
    const msg = String(e?.message || e || 'error');
    this._key = null;
    if (this._failed === msg) return;
    this._failed = msg;
    console.warn(`HomeView: a ${this._spec?.kind} tile couldn't be drawn`, e);
    const admin = !!this._hass?.user?.is_admin;
    this._wrap.innerHTML = `<div class="t flex na err"><div class="ic"><i data-i="mdi:alert-circle-outline"></i></div>
      <div class="tx"><div class="nm">Tile error</div><div class="sb">${esc(admin ? msg : 'Couldn\'t show this')}</div></div></div>${this._editHtml()}`;
    if (this._hass) fillIcons(this._wrap, this._hass);
    this.setAttribute('aria-label', 'Tile error');
  }

  /** Screen readers and keyboards: a tile that does something is a button named by what it shows
   *  ("Front Door, Locked · Entry"); Enter / Space = tap, Shift+Enter or the menu key = hold. */
  _a11y(card, r) {
    const acts = !this._edit && !!((r?.action && (!r.acts || r.acts(this._spec))) || this._spec.navigate || pageLink(this._spec.tap));
    if (acts) { if (this.getAttribute('role') !== 'button') { this.setAttribute('role', 'button'); this.setAttribute('tabindex', '0'); } }
    else if (this.hasAttribute?.('role')) { this.removeAttribute('role'); this.removeAttribute('tabindex'); }
    const txt = (sel) => card?.querySelector?.(sel)?.textContent?.trim() || '';
    // a tile without a name line (an agenda: "Up next") is named by its heading
    const label = [txt('.nm'), txt('.sb')].filter(Boolean).join(', ') || (acts ? txt('.up') : '');
    if (label) this.setAttribute('aria-label', label); else this.removeAttribute?.('aria-label');
    // a tile whose tap switches it on / off is a toggle button: aria-pressed says which
    const sp = this._spec, st = acts && sp.kind === 'entity' && sp.entity ? this._hass?.states?.[sp.entity] : null;
    if (st && !isOffline(st) && TOGGLES.includes(domainOf(sp.entity)) && (!sp.tap || sp.tap === 'toggle')) this.setAttribute('aria-pressed', String(isActive(st)));
    else if (this.hasAttribute?.('aria-pressed')) this.removeAttribute('aria-pressed');
  }

  // a Lovelace card from the user's config, created once with HA's card helpers
  _renderCard() {
    if (this._card && this._card !== 'loading') {
      // spec.cardFor(hass): settings that follow a state (the flow card's outage): the card gets them
      // again only when they change (cardFor hands out the same object while they don't)
      if (this._spec.cardFor && typeof this._card.setConfig === 'function' && this._card.localName !== 'hui-error-card') {
        const conf = this._spec.cardFor(this._hass);
        if (conf !== this._cardConf) {
          this._cardConf = conf;
          try { this._card.setConfig(conf); } catch (e) { console.warn('HomeView: a card refused its new settings', e); }
        }
      }
      // a card that throws on an update stays as it is (HA's own cards guard themselves; others may not)
      try { this._card.hass = cardHass(this._hass, this._hvDark); } catch (e) { if (!this._cardErr) { this._cardErr = true; console.warn('HomeView: a card failed to update', e); } }
      // a card showing an error alert (e.g. a markdown card's <ha-alert alert-type="error">) pulses red
      clearTimeout(this._pulseT);
      this._pulseT = setTimeout(() => {
        const err = !!deepFind(this._card, 'ha-alert[alert-type="error"]', 6);
        if (this._cardBox) {
          const still = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
          this._cardBox.style.animation = err && !still ? 'hv-alert-pulse 1.6s ease-in-out infinite' : '';
          this._cardBox.style.boxShadow = err && still ? `0 0 0 2.5px ${HV_TONES.alert}` : '';
        }
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
      let conf = this._spec.cardFor ? this._spec.cardFor(this._hass) : this._spec.card;
      this._cardConf = conf;
      if (this._expanded && this._spec.more && typeof this._spec.more === 'object') {
        conf = { ...conf, ...this._spec.more };
        for (const [k, v] of Object.entries(this._spec.more)) if (v === null) delete conf[k];
      }
      const el = helpers.createCardElement(conf);
      el.hass = cardHass(this._hass, this._hvDark);
      const box = document.createElement('div');
      box.className = 'hacard';
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
    this.addEventListener('keydown', (e) => {
      if (this.getAttribute('role') !== 'button' || e.composedPath?.()[0] !== this) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._act(e.shiftKey ? 'hold' : 'tap', e); }
      else if (e.key === 'ContextMenu') { e.preventDefault(); this._act('hold', e); }
    });
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

// a pill names the one thing that needs a look ("Back Door open"), or counts several ("2 open"); the
// name is the device's own (with its room), or its customize name when that says more than "Lock"
const pillName = (h, cfg, id, tail) => {
  const c = cfg?.customize?.[id]?.name;
  return typeof c === 'string' && c && !GENERIC_NAME.test(c) ? c : h.states[id] ? nameFor(h, id, tail) : id;
};
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
// a pill's pop-up in groups, worst first (as the batteries'): [bad word, fine word] — "Open" (red),
// "Offline" (amber), "Closed"; only when something isn't fine (all fine: the plain list)
function sevGroups(all, bad, off, [badWord, okWord]) {
  if (!bad.length && !off.length) return undefined;
  const rest = all.filter((id) => !bad.includes(id) && !off.includes(id));
  return [{ title: badWord, ids: bad, tone: 'red' }, { title: 'Offline', ids: off, tone: 'offline' }, { title: okWord, ids: rest }].filter((g) => g.ids.length);
}
// the thermostat's activity while it runs ("70° · Heating"); idle: just the temperature
const HVAC_ACTS = { heating: 'Heating', cooling: 'Cooling', drying: 'Drying', fan: 'Fan', preheating: 'Preheating', defrosting: 'Defrosting' };
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
    const idsOf = (w) => asList(w.entities || ALERT_RULES.flatMap((k) => ruleIds(w, k))).filter((id) => id && h.states[id]);
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
    // one number: the temperature, and what it's doing only while it runs (no action reported: the
    // heat / cool mode) — the settings are one tap away
    const cur = num(st.attributes.current_temperature);
    const doing = HVAC_ACTS[act] || (!act && ['heat', 'cool'].includes(st.state) ? stateText(h, st) : '');
    const text = isOffline(st) ? 'Thermostat offline' : cur !== null ? `${fmt(cur, 0)}°${doing ? ` · ${doing}` : ''}` : stateText(h, st);
    return { icon: 'mdi:thermostat', text, tone, more: id };
  },
  lights(h, m) {
    if (!m.lights.length) return null;
    const on = m.lights.filter((id) => h.states[id]?.state === 'on');
    return { icon: on.length ? 'mdi:lightbulb-group' : 'mdi:lightbulb-group-off-outline', text: on.length ? `${on.length} on` : 'Lights off',
      tone: on.length ? 'on' : null, popup: { title: 'Lights', ids: [...on, ...m.lights.filter((id) => !on.includes(id))], showRoom: true } };
  },
  locks(h, m, cfg) {
    const locks = m.byDomain.lock || [];
    if (!locks.length) return null;
    const open = locks.filter((id) => isAlert(h.states[id]));
    const off = locks.filter((id) => UNAVAILABLE.includes(h.states[id]?.state));
    return { icon: open.length ? 'mdi:lock-open-variant' : off.length ? 'mdi:lock-question' : 'mdi:lock',
      text: open.length === 1 ? plusWord(pillName(h, cfg, open[0], 'locks'), 'unlocked') : open.length ? `${open.length} unlocked`
        : off.length === 1 ? plusWord(pillName(h, cfg, off[0], 'locks'), 'offline') : off.length ? `${off.length} locks offline` : 'Locked',
      alert: open.length > 0, tone: off.length ? 'warn' : 'ok', popup: { title: 'Locks', ids: locks, showRoom: true, clean: 'locks', groups: sevGroups(locks, open, off, ['Unlocked', 'Locked']) } };
  },
  openings(h, m, cfg) {
    if (!m.openings.length) return null;
    const open = m.openings.filter((id) => isAlert(h.states[id]));
    const off = m.openings.filter((id) => UNAVAILABLE.includes(h.states[id]?.state));
    return { icon: open.length ? 'mdi:door-open' : 'mdi:door-closed',
      text: open.length === 1 ? plusWord(pillName(h, cfg, open[0], 'doors'), 'open') : open.length ? `${open.length} open`
        : off.length === 1 ? plusWord(pillName(h, cfg, off[0], 'doors'), 'offline') : off.length ? `${off.length} sensors offline` : 'All closed',
      alert: open.length > 0, tone: off.length ? 'warn' : 'ok', popup: { title: 'Doors & Windows', ids: [...open, ...m.openings.filter((id) => !open.includes(id))], showRoom: true, clean: 'doors',
        groups: sevGroups(m.openings, open, off, ['Open', 'Closed']) } };
  },
  safety(h, m, cfg) {
    if (!m.safety.length) return null;
    const bad = m.safety.filter((id) => h.states[id]?.state === 'on');
    const off = m.safety.filter((id) => UNAVAILABLE.includes(h.states[id]?.state));
    // one: its name ("Kitchen Leak"), with Home Assistant's word when the name doesn't say what it is
    const one = (id) => { const n = pillName(h, cfg, id), w = hassState(h, h.states[id]);
      return /leak|water|moist|flood|smoke|fire|gas|co\b|carbon/i.test(n) || plusWord(n, w) === n ? n : `${n} · ${w}`; };
    return { icon: bad.length ? 'mdi:water-alert' : 'mdi:shield-check-outline',
      text: bad.length === 1 ? one(bad[0]) : bad.length ? `${bad.length} alerts`
        : off.length === 1 ? plusWord(pillName(h, cfg, off[0]), 'offline') : off.length ? `${off.length} sensors offline` : 'All clear',
      alert: bad.length > 0, tone: off.length ? 'warn' : 'ok', popup: { title: 'Leaks, smoke & gas', ids: [...bad, ...m.safety.filter((id) => !bad.includes(id))], showRoom: true, clean: true,
        groups: sevGroups(m.safety, bad, off, ['Alert', 'All clear']) } };
  },
  batteries(h, m, cfg) {
    if (!m.batteries.length) return null;
    const lowAt = cfg.battery_low ?? 20;
    const low = m.batteries.filter((id) => { const v = num(h.states[id]?.state); return v !== null && v < lowAt; });
    const off = m.batteries.filter((id) => UNAVAILABLE.includes(h.states[id]?.state));
    // "1 battery low · 1 offline", "2 batteries offline"
    const parts = [low.length ? `${plural(low.length, 'battery', 'batteries')} low` : null,
      off.length ? (low.length ? `${off.length} offline` : `${plural(off.length, 'battery', 'batteries')} offline`) : null].filter(Boolean);
    const lvl = (id) => num(h.states[id]?.state);
    const sorted = [...m.batteries].sort((a, b) => (lvl(a) ?? -1) - (lvl(b) ?? -1));
    // the popup in groups, worst first: low (red), offline (amber heading), getting low (amber), OK
    const soonAt = Math.min(50, lowAt * 2);
    const soon = sorted.filter((id) => { const v = lvl(id); return v !== null && v >= lowAt && v < soonAt; });
    const ok = sorted.filter((id) => !low.includes(id) && !off.includes(id) && !soon.includes(id));
    const groups = [
      { title: `Low · below ${lowAt}%`, ids: sorted.filter((id) => low.includes(id)), tone: 'red' },
      { title: 'Offline', ids: off, tone: 'offline' },
      { title: `Getting low · below ${soonAt}%`, ids: soon, tone: 'amber' },
      { title: 'OK', ids: ok },
    ].filter((g) => g.ids.length);
    return { icon: low.length ? 'mdi:battery-alert-variant-outline' : 'mdi:battery-high', text: parts.join(' · ') || 'Batteries OK',
      alert: low.length > 0, tone: off.length || soon.length ? 'warn' : 'ok', popup: { title: 'Batteries', ids: sorted, groups, showRoom: true, clean: true } };
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
// one pill that can't be worked out (odd settings) is left out, not the whole header
const _pillErrs = new Set();
function safePill(f) {
  try { return f(); } catch (e) { if (!_pillErrs.has(String(e))) { _pillErrs.add(String(e)); console.warn('HomeView: a pill couldn\'t be shown', e); } return null; }
}
/** A pill of your own: { entity, name?, icon?, alert?: [states], tap?, hold? } — its state, tap = more-info. */
/**
 * A custom page's alerts (and the warnings: pill's rules): [{ text, level: critical | notice, and one
 * rule }] -> the ones active now: [{ text, level, offline? }]. They show at the top of the page and
 * colour its pill (critical: red, notice: amber), as the other pills warn. Rules:
 *   all_off: [ids]   every one is off            on: id    it's on           off: id   it's off
 *   not_on: id       anything but on (offline and missing count; text_offline then)
 *   none_on: [ids]   none is confirmed on: off, offline and missing all count (e.g. both pumps)
 * A rule that can't be checked because its entity is offline or missing is never silently "fine":
 * it shows "<name> not reporting" (missing: "Can't check: <text>"), or text_offline, in amber.
 */
const ALERT_RULES = ['all_off', 'none_on', 'not_on', 'on', 'off'];
// `on:` / `off:` written without quotes are YAML booleans: the key arrives as "true" / "false"
const ruleIds = (a, k) => asList(a[k] ?? (k === 'on' ? a.true : k === 'off' ? a.false : undefined)).filter((x) => typeof x === 'string' && x);
function pageAlerts(h, list) {
  const st = (id) => h.states[id]?.state;
  const silent = (id) => { const s = st(id); return s === undefined || UNAVAILABLE.includes(s); };   // missing or not reporting
  const nameOf = (id) => h.states[id]?.attributes?.friendly_name || id;
  const out = [];
  for (const a of asList(list)) {
    if (!a || typeof a !== 'object') continue;
    const level = a.level === 'notice' ? 'notice' : 'critical';
    let text = a.text || 'Check this';
    const rule = ALERT_RULES.find((k) => ruleIds(a, k).length);
    if (!rule) continue;
    const ids = ruleIds(a, rule);
    const quiet = ids.filter(silent);
    let on = false, unsure = false;
    if (rule === 'not_on') {
      on = st(ids[0]) !== 'on';
      if (on && quiet.length && a.text_offline) text = a.text_offline;
    } else if (rule === 'none_on') {
      on = !ids.some((id) => st(id) === 'on');
      if (on && quiet.length === ids.length && a.text_offline) text = a.text_offline;
    } else {
      const want = rule === 'on' ? 'on' : 'off';   // all_off / off: off; on: on
      const known = ids.filter((id) => !silent(id));
      on = !quiet.length && known.every((id) => st(id) === want);
      // the ones that report agree, but some don't report: it can't be told
      unsure = !!quiet.length && known.every((id) => st(id) === want);
    }
    if (on) out.push({ text, level });
    else if (unsure) {
      // "Pump B not reporting"; an entity Home Assistant doesn't have at all: "Can't check: <the rule>"
      // (admins get a note naming it)
      const there = quiet.filter((id) => h.states[id]);
      const names = there.slice(0, 2).map(nameOf).join(', ') + (there.length > 2 ? ` +${there.length - 2}` : '');
      out.push({ text: a.text_offline || (there.length ? `${names} not reporting` : `Can't check: ${text}`), level: 'notice', offline: true });
    }
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
  const val = d.format || d.attribute ? valueText(h, st, d)   // format: until / since … (a time), attribute:
    : w === null ? hassState(h, st) : u === 'kw' ? fmtKw(w) : u === 'mw' ? `${fmt(w / 1e6, 2)} MW` : `${fmt(w, 0)} W`;
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
  // offline ones stay in place (chipLook: amber, "Offline"); a removed device's leftover entity doesn't
  return out.filter((c) => !gone(h.states[c.entity])).slice(0, 6);
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
  if (isOffline(st)) return { cls: 'warn', word: 'Offline', offline: true };   // its own icon, the amber badge, the word
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

/** home.chips as written: entities or { entity, label, … }; a '|' between two = a gap there, so the
 *  chips read as groups (security | modes). The chip after the gap carries it (gapBefore). */
function chipList(list) {
  const out = [];
  let gap = false;
  for (const c of asList(list)) {
    if (c === '|') { gap = out.length > 0; continue; }
    const o = typeof c === 'string' ? { entity: c } : c;
    if (!o || typeof o !== 'object' || !o.entity) continue;
    out.push(gap ? { ...o, gapBefore: true } : o);
    gap = false;
  }
  return out;
}

async function chipTap(h, c, node) {
  const st = h.states[c.entity];
  if (!st) return;
  const d = domainOf(c.entity);
  // the alarm: its panel; an offline device: its details (nothing to switch)
  if (d === 'alarm_control_panel' || c.tap === 'more-info' || isOffline(st)) { moreInfo(node, c.entity); return; }
  // whether: the chip's own confirm (automatic lock / garage / valve chips: true = always; false = never),
  // else customize.<entity>.confirm; the words: the chip's own, else customize's when it asks now
  const turningOn = !isActive(st);
  const own = c.confirm !== undefined ? confirmOf(c.confirm) : undefined, czc = confirmOf(node?._config?.options?.customize?.[c.entity]?.confirm);
  if (confirmAsks(own !== undefined ? own : czc, turningOn)) {
    const cf = own?.text || own?.action ? own : confirmAsks(czc, turningOn) ? czc : {};
    const name = c.name || confirmName(h, c.entity);
    const verb = d === 'lock' ? (st.state === 'locked' ? 'Unlock' : 'Lock') : d === 'cover' ? (st.state === 'closed' ? 'Open' : 'Close')
      : isActive(st) ? 'Turn off' : 'Turn on';
    const room = node?._model?.areaById?.[entityArea(h, c.entity)]?.name;
    const ok = await hvConfirm(node, { title: cf.text || `${verb} ${name}?`, action: cf.action || verb, body: stateLine(h, st, room),
      tone: ['Unlock', 'Open', 'Turn off'].includes(verb) && !isWaterValve(c.entity) ? 'alert' : verb === 'Lock' || verb === 'Close' ? 'ok' : null });
    if (!ok) return;
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
  // the keyboard (Enter / Space on a button: a click with no pointer); Shift = hold
  el.addEventListener('click', (e) => { if (e.detail === 0 && !down) { if (e.shiftKey) onHold(); else onTap(); } });
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
  // offline favourites keep their place (amber badge, "Offline"); hidden ones are dropped by rebuild()
  return asList(list).filter((id) => h.states[id] && !(!pf && gone(h.states[id]))).slice(0, 6);
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
  if (t0 && def.show_when !== undefined) t0.showWhen = def.show_when;   // show_when: live (showWhen)
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
  if (t && t !== 'entity' && USER_TILE_TYPES.includes(t)) {
    const spec = { ...def, kind: t, size: size || TYPE_SIZES[t] || [1, 1] };
    delete spec.type;
    if (t === 'next_event' || t === 'agenda') spec.calendars = asList(def.calendars || m.calendars);
    if (t === 'weather' || t === 'forecast') spec.entity = def.entity || m.weather;
    if (t === 'camera') spec.entity = def.entity || m.cameras[0];
    if (t === 'person' && !spec.battery) spec.battery = personBattery(h, def.entity);
    return spec;
  }
  if (t && t !== 'entity') return null;   // an unknown type: left out (oddTiles tells admins)
  if (def.entity) {
    const room = m.areaById[entityArea(h, def.entity)];
    return entTile(def.entity, { name: def.name, icon: def.icon, icon_on: def.icon_on, icon_off: def.icon_off, color_on: def.color_on, color_off: def.color_off, tap: def.tap, hold: def.hold, size: size || [1, 1], showRoom: def.show_room !== false, areaName: room?.name, user: true,
      power: def.power, color: def.color, confirm: def.confirm, name_off: def.name_off, unit: def.unit,
      format: def.format, attribute: def.attribute, tick: liveTime(def) ? 30e3 : undefined });
  }
  return null;
}
/**
 * custom_pages: a page may start with `vars:` — the entities it uses, so a shared page file works
 * after editing only that block. "$tv" (a whole value) becomes the var as is (a list stays a
 * list, and a list in a tiles list is spread into it); "$tv" inside longer text is replaced too.
 */
// "$$" is a plain "$" ("Price: $$5"), never a var
const VAR_RE = /\$\$|\$([A-Za-z_][A-Za-z0-9_]*)/g;
function expandVars(v, vars) {
  if (typeof v === 'string') {
    const whole = v.match(/^\$([A-Za-z_][A-Za-z0-9_]*)$/);
    if (whole && whole[1] in vars) return vars[whole[1]];
    return v.replace(VAR_RE, (all, k) => (all === '$$' ? '$' : k in vars && typeof vars[k] !== 'object' ? String(vars[k]) : all));
  }
  if (Array.isArray(v)) return v.flatMap((x) => { const e = expandVars(x, vars); return typeof x === 'string' && Array.isArray(e) ? e : [e]; });
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, expandVars(x, vars)]));
  return v;
}
/** The $vars a page file uses that its vars: block doesn't set (read before they're filled in, so a
 *  "$$" written for a plain "$" isn't taken for one). */
function unsetVars(v, vars = {}, out = new Set()) {
  if (typeof v === 'string') { for (const [all, k] of v.matchAll(VAR_RE)) if (all !== '$$' && !(k in vars)) out.add(`$${k}`); }
  else if (Array.isArray(v)) v.forEach((x) => unsetVars(x, vars, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => unsetVars(x, vars, out));
  return out;
}
const _customCache = new WeakMap();
const _unsetOf = new WeakMap();   // a page from customPages() -> its unset $vars
const _autoPath = new WeakSet();   // pages named page-<n> by their place (no path: in the file)
/** custom_pages, each with its vars filled in and a path (path:, else page-<n> by its place, which
 *  admins get a note about: adding a page before it changes its address). */
function customPages(cfg) {
  const list = asList(cfg?.custom_pages);
  if (_customCache.has(list)) return _customCache.get(list);
  const out = list.map((d, i) => {
    if (!d || typeof d !== 'object') return { idx: i, path: `page-${i + 1}`, bad: true };
    const { vars, ...rest } = d;
    const vs = vars && typeof vars === 'object' ? vars : {};
    const page = expandVars(rest, vs);
    const item = { ...page, idx: i, path: String(page.path || `page-${i + 1}`) };
    _unsetOf.set(item, [...unsetVars(rest, vs)]);
    if (!page.path) _autoPath.add(item);
    return item;
  });
  _customCache.set(list, out);
  return out;
}
/** Entity ids a custom page refers to that this Home Assistant doesn't have (or $vars left unset). */
function missingEntities(h, page) {
  const ids = new Set(), known = _unsetOf.get(page), unset = new Set(known || []);
  const isId = (x) => typeof x === 'string' && /^[a-z_]+\.[a-z0-9_]+$/.test(x);
  const walk = (v, key) => {
    if (typeof v === 'string') {
      if (!known) for (const [all, k] of v.matchAll(VAR_RE)) if (all !== '$$') unset.add(`$${k}`);
      if (isId(v) && (key === 'entity' || key === 'entities' || key === 'tile' || key === 'entity_id')) ids.add(v);
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, key === 'tiles' ? 'tile' : key));
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, k));
  };
  walk(page.sections, 'sections');
  asList(page.pills).forEach((p) => walk(p, 'pill'));
  if (page.pill && typeof page.pill === 'object') walk(page.pill, 'pill');   // this page's own pill on Home
  for (const a of asList(page.alerts)) {   // the alert rules: a missing one would never fire
    if (!a || typeof a !== 'object') continue;
    walk(a.text, 'text'); walk(a.text_offline, 'text');
    for (const k of ALERT_RULES) ruleIds(a, k).forEach((id) => (isId(id) ? ids.add(id) : walk(id, k)));
    asList(a.entities).forEach((id) => walk(id, 'entities'));
  }
  return [...[...ids].filter((id) => !h.states[id]), ...unset];
}
/** tap: / hold: values: more-info, toggle, none — anything else is a page to open (its path). */
const ACTION_WORDS = ['more-info', 'toggle', 'none', 'default', 'lights', 'room'];
const pageLink = (v) => (typeof v === 'string' && v && !ACTION_WORDS.includes(v) ? v : null);

// a section of your own: layout: pills (compact pills in a row) | keypad (icon buttons in
// `columns` columns; '.' = an empty cell, e.g. a TV remote) | faders (sliders, two per row on
// tablets) | rows (a list); width: half (two sections side by side on tablets); icon: by the title
const SECTION_LAYOUTS = ['pills', 'keypad', 'faders', 'rows'];
const userSections = (list, h, m) => asList(list).filter((sec) => sec && typeof sec === 'object').map((sec) => ({
  title: sec.title, position: sec.position, hue: sec.color !== undefined ? hueOf(sec.color, undefined) : undefined,
  layout: SECTION_LAYOUTS.includes(sec.layout) ? sec.layout : undefined, half: sec.width === 'half', icon: sec.icon,
  keyCols: Number(sec.columns) || 4, iconsOnly: !!sec.icons_only, showWhen: sec.show_when,
  // defaults: merged into each tile; globs / { match } spread into one tile per entity (expandTiles)
  tiles: expandTiles(sec, h).map((t) => (t === '.' || t === null ? { kind: 'gap', size: [1, 1] } : userTile(t, h, m))).filter(Boolean),
}));

/** Tiles in your sections that can't be shown: an unknown type, or a room tile for an area that
 *  doesn't exist — for the admin note ("left out"), so a typo doesn't just vanish. */
function oddTiles(list, m) {
  const out = [];
  for (const sec of asList(list)) {
    if (!sec || typeof sec !== 'object') continue;
    for (const t of asList(sec.tiles)) {
      if (!t || typeof t !== 'object' || t.card) continue;
      if (t.type === 'room') { if (!m.areaById[t.area]) out.push(`room “${t.area ?? '?'}” (no such area)`); continue; }
      if (t.type && t.type !== 'entity' && !USER_TILE_TYPES.includes(t.type)) out.push(`type: ${t.type}`);
    }
  }
  return [...new Set(out)];
}

/* ---- Primitives for page files: show_when, entity patterns, times, confirm, section defaults ----
 * Each is optional and off unless written; none of them adds work to a page that doesn't use it. */

/**
 * show_when: a tile, a section or a pill shows only while this holds (live: it follows state changes
 * without rebuilding the page; edit mode shows everything, the hidden ones faded).
 *   show_when: binary_sensor.rain_expected                   the entity is on (a lock: unlocked, a cover: open,
 *                                                         a person: home, media: playing — "on" as tiles show it)
 *   show_when: { entity: sensor.x, state: [a, b] }        its state is one of these (state_not: none of them)
 *   show_when: { entity: sensor.x, above: 5, below: 30 }  a number in between (either alone; an entity's value too)
 *   show_when: { entity: vacuum.x, attribute: status, state: docked }   an attribute instead of the state
 *   show_when: { user: [alex, mia] } · { admin: true }    who's looking (login name, person entity or user id)
 *   show_when: { or: [ … ] } · { and: [ … ] } · { not: … } combine them; a plain list = all of them
 * Home Assistant's own visibility conditions ({ condition: state | numeric_state | user | screen | and | or |
 * not, … }) work too. A condition HomeView can't read shows the tile (admins get a note) rather than
 * hiding it. Hiding isn't security: the entity is still one tap away elsewhere.
 */
const WHEN_KEYS = ['entity', 'attribute', 'state', 'state_not', 'above', 'below', 'user', 'users', 'admin', 'and', 'or', 'not',
  'condition', 'conditions', 'media_query'];
const WHEN_TYPES = ['state', 'numeric_state', 'user', 'screen', 'and', 'or', 'not'];
const isEntityId = (x) => typeof x === 'string' && /^[a-z0-9_]+\.[a-z0-9_]+$/.test(x);
// on / off written without quotes are YAML booleans
const whenWord = (v) => (v === true ? 'on' : v === false ? 'off' : String(v));
/** Is the viewer one of these? login name (or its first word), user id, or a person entity linked to the login */
function userIs(h, list) {
  const u = h.user || {}, name = String(u.name || '').toLowerCase();
  return asList(list).some((v) => {
    const x = String(v).toLowerCase();
    if (!x) return false;
    if (v === u.id || x === name || x === name.split(' ')[0]) return true;
    return x.startsWith('person.') && !!u.id && h.states[x]?.attributes?.user_id === u.id;
  });
}
/** A state or an attribute (last_changed / last_updated: the state object's own times) */
function stateValue(st, attr) {
  if (!st) return undefined;
  if (!attr) return st.state;
  if (attr === 'last_changed' || attr === 'last_updated') return st[attr];
  return st.attributes?.[attr];
}
function showWhen(h, c, depth = 0) {
  if (c === undefined || c === null || depth > 10) return true;
  if (typeof c === 'boolean') return c;
  if (typeof c === 'string') { const st = h.states[c]; return !!st && (st.state === 'on' || isActive(st)); }
  if (Array.isArray(c)) return c.every((x) => showWhen(h, x, depth + 1));
  if (!isObj(c)) return true;
  const all = (l) => asList(l).every((x) => showWhen(h, x, depth + 1));
  const any = (l) => asList(l).some((x) => showWhen(h, x, depth + 1));
  if (c.condition !== undefined) {   // Home Assistant's shape
    switch (c.condition) {
      case 'and': return all(c.conditions);
      case 'or': return any(c.conditions);
      case 'not': return !any(c.conditions);
      case 'user': return userIs(h, c.users);
      case 'screen': return !c.media_query || !!window.matchMedia?.(c.media_query)?.matches;
      case 'state': case 'numeric_state': break;   // entity, state / state_not, above / below: below
      default: return true;
    }
  }
  if (c.and !== undefined && !all(c.and)) return false;
  if (c.or !== undefined && !any(c.or)) return false;
  if (c.not !== undefined && any(c.not)) return false;
  if (c.user !== undefined && !userIs(h, c.user)) return false;
  if (c.users !== undefined && c.condition === undefined && !userIs(h, c.users)) return false;
  if (c.admin !== undefined && !!h.user?.is_admin !== !!c.admin) return false;
  if (c.entity === undefined) return true;
  const st = h.states[c.entity];
  const v = stateValue(st, c.attribute);
  if (c.state === undefined && c.state_not === undefined && c.above === undefined && c.below === undefined) {
    return c.attribute ? !(v === undefined || v === null || v === false || v === '' || v === 0) : showWhen(h, String(c.entity), depth + 1);
  }
  // a missing entity reads "unavailable" (as in Home Assistant's own conditions)
  const s = v === undefined || v === null ? (c.attribute ? undefined : 'unavailable') : String(v);
  if (c.state !== undefined && !(s !== undefined && asList(c.state).map(whenWord).includes(s))) return false;
  if (c.state_not !== undefined && s !== undefined && asList(c.state_not).map(whenWord).includes(s)) return false;
  if (c.above !== undefined || c.below !== undefined) {
    const ref = (x) => (isEntityId(x) ? num(h.states[x]?.state) : num(x));
    const n = num(v), lo = ref(c.above), hi = ref(c.below);
    if (n === null || (c.above !== undefined && !(lo !== null && n > lo)) || (c.below !== undefined && !(hi !== null && n < hi))) return false;
  }
  return true;
}
/** What's wrong with a show_when (for the admins' note): [] when nothing is */
function whenProblems(c, depth = 0) {
  if (c === undefined || c === null || typeof c === 'boolean' || depth > 10) return [];
  if (typeof c === 'string') return isEntityId(c) ? [] : [`“${c}” isn't an entity id`];
  if (Array.isArray(c)) return c.flatMap((x) => whenProblems(x, depth + 1));
  if (!isObj(c)) return [`${JSON.stringify(c)} isn't a condition`];
  const out = [];
  const bad = Object.keys(c).filter((k) => !WHEN_KEYS.includes(k));
  if (bad.length) out.push(`unknown key${bad.length > 1 ? 's' : ''} ${bad.join(', ')}`);
  if (c.condition !== undefined && !WHEN_TYPES.includes(c.condition)) out.push(`condition: ${c.condition} isn't one HomeView reads (${WHEN_TYPES.join(', ')})`);
  for (const k of ['and', 'or', 'not', 'conditions']) if (c[k] !== undefined) out.push(...whenProblems(asList(c[k]), depth + 1));
  if (c.entity === undefined && ['state', 'state_not', 'above', 'below', 'attribute'].some((k) => c[k] !== undefined)) out.push('state / above / below / attribute need entity:');
  return out;
}
/** The entities a show_when reads (missing ones go in the admins' note) */
function whenEntities(c, out = [], depth = 0) {
  if (c === undefined || c === null || depth > 10) return out;
  if (typeof c === 'string') { if (isEntityId(c)) out.push(c); } else if (Array.isArray(c)) c.forEach((x) => whenEntities(x, out, depth + 1));
  else if (isObj(c)) {
    if (isEntityId(c.entity)) out.push(c.entity);
    for (const k of ['above', 'below']) if (isEntityId(c[k])) out.push(c[k]);
    for (const k of ['and', 'or', 'not', 'conditions']) whenEntities(c[k], out, depth + 1);
  }
  return out;
}

/**
 * Entity patterns, in exclude_entities and in a section's tiles (besides plain entity ids):
 *   'sensor.*_linkquality'          a glob: * any text, ? one character
 *   { domain: light, area: kitchen, label: outdoor, device_class: door, integration: zha,
 *     entity_id: 'light.kids_room_*', not: 'light.*_led' }   a filter: every key given must match, a list
 *                                   = any of it; area and label by id or name (a label on the device counts)
 * In tiles, { match: <glob or filter>, …tile options } is one tile per entity (by name) with those options;
 * the filter may add state: / state_not: (each tile shows only while its entity is in that state, live).
 * Entities hidden in Home Assistant never match; diagnostic / settings entities (a plug's LED, a
 * sensor's battery …) only when you name them by id (a glob, entity_id:) or with diagnostic: true.
 */
const MATCH_KEYS = ['entity_id', 'domain', 'area', 'label', 'device_class', 'integration', 'not', 'diagnostic', 'state', 'state_not'];
const isGlob = (x) => typeof x === 'string' && /[*?]/.test(x);
const slugOf = (x) => String(x).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const globRe = (g) => new RegExp(`^${String(g).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`, 'i');
/** A glob, an id or a filter -> (id) => matches? for this hass; null when it isn't one */
function entityFilter(h, p) {
  if (isObj(p) && p.match !== undefined) p = p.match;
  if (typeof p === 'string') { if (!isGlob(p)) return (id) => id === p; const re = globRe(p); return (id) => re.test(id); }
  if (!isObj(p)) return null;
  const words = (v) => asList(v).map(String);
  const tests = [];
  if (p.entity_id !== undefined) { const fs = words(p.entity_id).map((x) => entityFilter(h, x)); tests.push((id) => fs.some((f) => f(id))); }
  if (p.domain !== undefined) { const pre = words(p.domain).map((d) => `${d}.`); tests.push((id) => pre.some((x) => id.startsWith(x))); }
  if (p.area !== undefined) {
    const areas = Object.values(h.areas || {});
    const want = new Set(words(p.area).map((a) => (h.areas?.[a] ? a : areas.find((x) => String(x.name).toLowerCase() === a.toLowerCase())?.area_id || a)));
    tests.push((id) => want.has(entityArea(h, id)));
  }
  if (p.label !== undefined) {
    // a label's id, its name (the id Home Assistant made from it), or a name in the label registry once read
    const want = new Set(words(p.label).flatMap((l) => [l, slugOf(l),
      ...(hvLabels || []).filter((x) => String(x.name || '').toLowerCase() === l.toLowerCase()).map((x) => x.label_id)]));
    tests.push((id) => {
      const e = h.entities?.[id], dev = e?.device_id && h.devices?.[e.device_id];
      return [...asList(e?.labels), ...asList(dev?.labels)].some((x) => want.has(x));
    });
  }
  if (p.device_class !== undefined) { const dc = words(p.device_class); tests.push((id) => dc.includes(String(h.states[id]?.attributes?.device_class))); }
  if (p.integration !== undefined) { const ig = words(p.integration); tests.push((id) => ig.includes(String(h.entities?.[id]?.platform))); }
  if (p.not !== undefined) { const fs = asList(p.not).map((x) => entityFilter(h, x)).filter(Boolean); tests.push((id) => !fs.some((f) => f(id))); }
  return tests.length ? (id) => tests.every((t) => t(id)) : null;
}
/** What's wrong with a pattern (for the admins' note) */
function matchProblems(p) {
  if (isObj(p) && p.match !== undefined) p = p.match;
  if (typeof p === 'string') return [];
  if (!isObj(p)) return [`${JSON.stringify(p)} isn't a pattern`];
  const bad = Object.keys(p).filter((k) => !MATCH_KEYS.includes(k));
  const out = bad.length ? [`unknown key${bad.length > 1 ? 's' : ''} ${bad.join(', ')}`] : [];
  if (!['entity_id', 'domain', 'area', 'label', 'device_class', 'integration', 'not'].some((k) => p[k] !== undefined)) out.push('a filter needs entity_id, domain, area, label, device_class or integration');
  return out;
}
/**
 * A list of entity ids that may hold patterns (exclude_entities): has(id), add(id or pattern), size.
 * Plain ids are a Set lookup; patterns are tested once per id and remembered for this build.
 */
class IdSet {
  constructor(h, list) { this.h = h; this.ids = new Set(); this.pats = []; this.memo = new Map(); for (const x of asList(list)) this.add(x); }
  add(x) {
    if (typeof x === 'string' && !isGlob(x)) { this.ids.add(x); return this; }
    const f = entityFilter(this.h, x);
    if (f) { this.pats.push(f); this.memo.clear(); }
    return this;
  }
  has(id) {
    if (this.ids.has(id)) return true;
    if (!this.pats.length || typeof id !== 'string') return false;
    let v = this.memo.get(id);
    if (v === undefined) { v = this.pats.some((f) => f(id)); this.memo.set(id, v); }
    return v;
  }
  /** hidden by a pattern only (edit mode can't show it again with the eye: the pattern says so) */
  byPattern(id) { return !this.ids.has(id) && this.has(id); }
  get size() { return this.ids.size + this.pats.length; }
}
/** The entities a pattern matches, by name ("Door 2" before "Door 10"); first: the first one found (or null) */
let _nameOrder = null;
function matchEntities(h, p, first = false) {
  const f = entityFilter(h, p);
  if (!f) return first ? null : [];
  const q = isObj(p) && p.match !== undefined ? p.match : p;
  const byId = typeof q === 'string' || (isObj(q) && q.entity_id !== undefined) || (isObj(q) && q.diagnostic === true);
  const ok = (id) => { const r = h.entities?.[id]; return !r?.hidden && (byId || !r?.entity_category) && f(id); };
  if (first) return Object.keys(h.states).find(ok) ?? null;
  const nm = (id) => String(h.states[id]?.attributes?.friendly_name || id);
  _nameOrder = _nameOrder || new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
  return Object.keys(h.states).filter(ok).sort((a, b) => _nameOrder.compare(nm(a), nm(b)) || (a < b ? -1 : a > b ? 1 : 0));
}
/** A tiles entry's entity pattern: a glob, or match: on an entity tile (agenda / next_event tiles use
 *  match: for event titles) — else null */
function tilePattern(t, dflt) {
  if (isGlob(t)) return t;
  if (!isObj(t) || t.match === undefined || t.card) return null;
  const ty = t.type ?? dflt?.type;
  return !ty || ty === 'entity' ? t.match : null;
}
/**
 * A section's tiles, ready for userTile: section defaults: merged into each (the tile's own keys
 * win), globs and { match } entries spread into one tile per entity.
 */
function expandTiles(sec, h) {
  const dflt = isObj(sec.defaults) ? sec.defaults : null;
  const out = [];
  for (const t of asList(sec.tiles)) {
    if (t === '.' || t === null) { out.push(t); continue; }
    const pat = tilePattern(t, dflt);
    if (pat === null) { out.push(!dflt ? t : typeof t === 'string' ? { ...dflt, entity: t } : isObj(t) ? { ...dflt, ...t } : t); continue; }
    const { match, ...opts } = isObj(t) ? t : {};
    // state: / state_not: in the filter: each tile shows only while its entity is in that state
    const live = isObj(pat) && (pat.state !== undefined || pat.state_not !== undefined) ? pat : null;
    for (const id of matchEntities(h, pat)) {
      const def = { ...(dflt || {}), ...opts, entity: id };
      if (live) {
        const w = { entity: id, ...(live.state !== undefined ? { state: live.state } : {}), ...(live.state_not !== undefined ? { state_not: live.state_not } : {}) };
        def.show_when = def.show_when !== undefined ? { and: [def.show_when, w] } : w;
      }
      out.push(def);
    }
  }
  return out;
}

/**
 * Times: format: on an entity tile or pill (input_datetime, date / time / datetime entities, a
 * timestamp or date sensor, or attribute: <name> holding a time):
 *   time "6:30 AM" · date "Thu, Nov 13" · datetime "6:30 AM" today, else "Thu 6:30 AM" / "Nov 20 6:30 AM"
 *   relative "in 2 hours" / "5 minutes ago" / "tomorrow" (in the viewer's language)
 *   until "2 h 5 min" (time left; "now" once it's passed) · since "3 h 20 min" (time gone by)
 * A time of day on its own (06:30) counts as its next time (until, relative) or its last (since).
 * attribute: <name> shows that attribute instead of the state (a vacuum's battery_level …);
 * last_changed / last_updated: when the state changed / updated (relative unless format: says).
 * relative / until / since tiles redraw every 30 s.
 */
const TIME_FORMATS = ['time', 'date', 'datetime', 'relative', 'until', 'since'];
const liveTime = (s) => ['relative', 'until', 'since'].includes(s?.format) || (!s?.format && ['last_changed', 'last_updated'].includes(s?.attribute));
/** A time value -> { d: Date, day: date only, tod: a time of day only } or null */
function parseTimeValue(v) {
  if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? { d: new Date(v > 1e12 ? v : v * 1000) } : null;
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m) { const d = new Date(); d.setHours(+m[1], +m[2], +(m[3] || 0), 0); return { d, tod: true }; }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return { d: new Date(+m[1], +m[2] - 1, +m[3]), day: true };
  if (!/^\d{4}-\d{2}-\d{2}[ T]\d{1,2}:\d{2}/.test(s)) return null;
  const d = new Date(s.replace(' ', 'T'));   // no offset: local time
  return Number.isFinite(d.getTime()) ? { d } : null;
}
const _relFmts = new Map();
function relFmt(lang) {
  if (!_relFmts.has(lang)) { try { _relFmts.set(lang, new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })); } catch (e) { _relFmts.set(lang, null); } }
  return _relFmts.get(lang);
}
/** 125 min -> "2 h 5 min", 3 days 4 h -> "3 d 4 h" */
function durText(ms) {
  const m = Math.floor(Math.abs(ms) / 60000), hh = Math.floor(m / 60), d = Math.floor(hh / 24);
  if (m < 1) return '< 1 min';
  if (m < 60) return `${m} min`;
  if (hh < 24) return `${hh} h${m % 60 ? ` ${m % 60} min` : ''}`;
  return `${d} d${hh % 24 ? ` ${hh % 24} h` : ''}`;
}
function fmtTimeValue(h, t, f, now = Date.now()) {
  const lang = h?.locale?.language || undefined;
  let d = new Date(t.d.getTime());
  // a time of day: its next (until / relative) or last (since) time
  if (t.tod && (f === 'until' || f === 'relative') && d.getTime() < now - 30e3) d.setDate(d.getDate() + 1);
  if (t.tod && f === 'since' && d.getTime() > now) d.setDate(d.getDate() - 1);
  const dayOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((dayOf(d) - dayOf(new Date(now))) / 864e5);
  const dateText = (o) => d.toLocaleDateString(lang, o);
  switch (f) {
    case 'time': return t.day ? dateText({ weekday: 'short', month: 'short', day: 'numeric' }) : timeFmt(d, h);
    case 'date': return dateText({ weekday: 'short', month: 'short', day: 'numeric' });
    case 'until': if (t.day) return days <= 0 ? 'today' : `${days} d`; return d.getTime() <= now ? 'now' : durText(d.getTime() - now);
    case 'since': if (t.day) return days >= 0 ? 'today' : `${-days} d`; return d.getTime() >= now ? 'now' : durText(now - d.getTime());
    case 'relative': {
      const rtf = relFmt(lang), sec = (d.getTime() - now) / 1000, a = Math.abs(sec);
      if (!rtf) return sec >= 0 ? `in ${durText(sec * 1000)}` : `${durText(sec * 1000)} ago`;
      if (t.day || a >= 86400) return rtf.format(days, 'day');
      if (a < 45) return rtf.format(0, 'second');
      if (a < 3600) return rtf.format(Math.round(sec / 60), 'minute');
      return rtf.format(Math.round(sec / 3600), 'hour');
    }
    default: {   // datetime
      if (t.day) return dateText({ weekday: 'short', month: 'short', day: 'numeric' });
      if (t.tod || days === 0) return timeFmt(d, h);
      return `${dateText(Math.abs(days) < 7 ? { weekday: 'short' } : { month: 'short', day: 'numeric' })} ${timeFmt(d, h)}`;
    }
  }
}
/** What an entity tile / pill shows as its value: the state as Home Assistant says it, or (format: /
 *  attribute:) a time in that format, an attribute's value */
function valueText(h, st, s) {
  const f = TIME_FORMATS.includes(s?.format) ? s.format : null, attr = s?.attribute;
  if (!f && !attr) return stateText(h, st);
  if (!st) return 'Not found';
  const own = attr === 'last_changed' || attr === 'last_updated';
  if (isOffline(st) && !own) return 'Offline';
  const raw = stateValue(st, attr);
  const ff = f || (own ? 'relative' : null);
  if (ff) {
    const t = parseTimeValue(raw);
    if (t) return fmtTimeValue(h, t, ff);
    if (!attr) return stateText(h, st);   // not a time: as Home Assistant says it
  }
  if (raw === undefined || raw === null || raw === '') return '—';
  if (typeof raw === 'number') {
    const u = s.unit && !['w', 'kw', 'mw'].includes(String(s.unit).toLowerCase()) ? String(s.unit) : '';
    return `${fmt(raw, Number.isInteger(raw) ? 0 : 1)}${u ? `${/^[%°]/.test(u) ? '' : ' '}${u}` : ''}`;
  }
  if (typeof raw === 'boolean') return raw ? 'Yes' : 'No';
  return Array.isArray(raw) ? raw.join(', ') : typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
}

/**
 * confirm: ask first (HomeView's own sheet) before a tile, chip or button switches its entity.
 *   confirm: true                 every time
 *   confirm: turn_on | turn_off   only before switching it on (a lock: unlocking, a cover: opening) / off
 *   confirm: 'Sound the siren?'   every time, with your question
 *   confirm: { text, only: turn_on | turn_off, action: Sound }   the question, when, the button's word
 * customize: { <entity>: { confirm: … } } asks wherever that entity can be switched: its tiles on every
 * page, the pills' pop-ups, a chip, a button that toggles it (a tile's or chip's own confirm: wins). It
 * guards the gesture that switches it: the tap, or the hold with hold: toggle (tap: more-info + hold:
 * toggle = a stray tap can't set it off).
 */
const CONFIRM_KEYS = ['text', 'only', 'action'];
function confirmOf(v) {
  if (v === undefined || v === null || v === false) return null;
  if (typeof v === 'string') return ['turn_on', 'turn_off'].includes(v) ? { only: v } : { text: v };
  if (isObj(v)) return { text: v.text ? String(v.text) : '', only: ['turn_on', 'turn_off'].includes(v.only) ? v.only : null, action: v.action ? String(v.action) : '' };
  return {};
}
/** Does this confirm ask now? (only: turn_on / turn_off against what the tap is about to do) */
const confirmAsks = (cf, turningOn) => !!cf && (!cf.only || (cf.only === 'turn_on') === !!turningOn);
function confirmProblems(v) {
  if (v === undefined || v === null || typeof v === 'boolean' || typeof v === 'string') return [];
  if (!isObj(v)) return [`${JSON.stringify(v)}: true, turn_on, turn_off, a question or { text, only, action }`];
  const bad = Object.keys(v).filter((k) => !CONFIRM_KEYS.includes(k));
  const out = bad.length ? [`unknown key${bad.length > 1 ? 's' : ''} ${bad.join(', ')}`] : [];
  if (v.only !== undefined && !['turn_on', 'turn_off'].includes(v.only)) out.push(`only: ${v.only} (turn_on or turn_off)`);
  return out;
}
/** The word a confirm sheet's button says for what a tap does to this entity */
function switchVerb(st) {
  const d = domainOf(st.entity_id), s = st.state;
  if (d === 'lock') return s === 'locked' ? 'Unlock' : 'Lock';
  if (d === 'cover' || d === 'valve') return s === 'closed' ? 'Open' : 'Close';
  if (['script', 'button', 'input_button'].includes(d)) return 'Run';
  if (d === 'vacuum') return s === 'cleaning' ? 'Send home' : 'Start';
  if (d === 'lawn_mower') return s === 'mowing' ? 'Dock' : 'Start';
  if (d === 'media_player') return s === 'playing' ? 'Pause' : 'Play';
  return isActive(st) ? 'Turn off' : 'Turn on';
}

// the keys a section and a customize entry take (anything else gets a note for admins: usually a typo)
const SECTION_KEYS = ['title', 'position', 'color', 'layout', 'width', 'icon', 'columns', 'icons_only', 'tiles', 'show_when', 'defaults'];
const CUSTOMIZE_KEYS = ['name', 'icon', 'icon_on', 'icon_off', 'color_on', 'color_off', 'tap', 'hold', 'size', 'hidden', 'confirm'];
/** Admins' note: what's wrong in show_when / patterns / defaults / format / confirm, section and customize keys */
function primitiveNotes(h, cfg, sections) {
  const out = [], missing = new Set();
  const add = (where, list) => list.forEach((p) => out.push(`${where}: ${p}`));
  const keys = (where, o, known) => { const bad = Object.keys(o).filter((k) => !known.includes(k)); if (bad.length) out.push(`${where}: unknown key${bad.length > 1 ? 's' : ''} ${bad.join(', ')}`); };
  const when = (where, c) => { add(`${where} show_when`, whenProblems(c)); whenEntities(c).forEach((id) => { if (!h.states[id]) missing.add(id); }); };
  const none = (p) => matchEntities(h, p, true) === null;
  asList(sections).forEach((sec, i) => {
    if (!isObj(sec)) return;
    const where = `section “${sec.title || i + 1}”`;
    keys(where, sec, SECTION_KEYS);
    if (sec.defaults !== undefined && !isObj(sec.defaults)) out.push(`${where}: defaults: is a set of tile options ({ size: 2x1, … })`);
    if (sec.show_when !== undefined) when(where, sec.show_when);
    const dflt = isObj(sec.defaults) ? sec.defaults : null;
    for (const t of [dflt, ...asList(sec.tiles)]) {
      if (isGlob(t) && none(t)) out.push(`${where}: ${t} matches no entity`);
      if (!isObj(t)) continue;
      const pat = t === dflt ? null : tilePattern(t, dflt);
      if (pat !== null && !isGlob(pat)) {
        const mp = matchProblems(pat);
        add(`${where} match`, mp);
        if (!mp.length && none(pat)) out.push(`${where}: match ${typeof pat === 'string' ? pat : JSON.stringify(pat)} matches no entity`);
      } else if (isGlob(pat) && none(pat)) out.push(`${where}: match ${pat} matches no entity`);
      if (t.show_when !== undefined) when(where, t.show_when);
      if (t.confirm !== undefined) add(`${where} confirm`, confirmProblems(t.confirm));
      if (t.format !== undefined && !TIME_FORMATS.includes(t.format)) out.push(`${where}: format: ${t.format} isn't one of ${TIME_FORMATS.join(', ')}`);
    }
  });
  for (const [id, c] of Object.entries(isObj(cfg.customize) ? cfg.customize : {})) {
    if (!isObj(c)) continue;
    keys(`customize ${id}`, c, CUSTOMIZE_KEYS);
    if (c.confirm !== undefined) add(`customize ${id} confirm`, confirmProblems(c.confirm));
  }
  for (const x of asList(cfg.exclude_entities)) {
    if (isEntityId(x)) continue;
    if (isGlob(x) || isObj(x)) add('exclude_entities', matchProblems(x));
    else out.push(`exclude_entities: ${JSON.stringify(x)} isn't an entity id, a pattern or a filter`);
  }
  for (const p of asList(cfg.pills)) if (isObj(p) && p.show_when !== undefined) when('pills', p.show_when);
  if (missing.size) out.push(`show_when names ${[...missing].slice(0, 4).join(', ')}${missing.size > 4 ? ` and ${missing.size - 4} more` : ''}, not in Home Assistant`);
  return [...new Set(out)];
}

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
    // the guest view: no agenda (the photo takes its place), no tomorrow on Tonight, no camera, and
    // the sample photos (or guest.slideshow) instead of the family's
    const guest = !!page?._guest, gs = guest ? guestOpts(cfg) || {} : {};
    const board = [{ kind: 'date', area: 'date', bare: true }, { kind: 'clock', area: 'clock', bare: true }];
    if (m.weather) board.push({ kind: 'forecast', entity: m.weather, days: 3, area: 'weather', bare: true });
    // the same 2 weeks as Home's Next tile, so the two never disagree (7 days missed an event 8 days out);
    // the night face: "Tonight" instead (alarm, locks, doors, tomorrow's first event)
    if (isNight(h, cfg)) {
      board.push({ kind: 'tonight', area: 'next', bare: true, calendars: guest ? [] : m.calendars, alarm: (m.byDomain.alarm_control_panel || [])[0] || null,
        locks: m.byDomain.lock || [], openings: m.openings });
    } else if (m.calendars.length && !guest) board.push({ kind: 'agenda', calendars: m.calendars, days: 14, max: 5, area: 'next', bare: true, title: 'Up next' });
    // the photo slideshow (the camera is on Home; widgets.camera: <entity> puts one here instead)
    if (wc.camera && !guest) {
      board.push({ kind: 'camera', entity: wc.camera, area: 'cam' });
    } else if (guest) {
      if (gs.slideshow !== false) board.push({ kind: 'slideshow', folder: gs.slideshow || 'samples', interval: wc.slideshow_interval || 60, area: 'cam' });
    } else if (wc.slideshow !== false) {
      const found = wc.slideshow ? null : findPhotoFolder(h, page.rebuilder);
      // still looking (undefined): wait; nothing found (null): the sample photos
      const folder = wc.slideshow || (found === undefined ? null : found || 'samples');
      if (folder) board.push({ kind: 'slideshow', folder, interval: wc.slideshow_interval || 60, thumbnail: wc.slideshow_thumbnail, area: 'cam' });
    }
    return { title: 'Widgets', minimalHead: true, board, boardClass: board.some((t) => t.area === 'next') ? '' : 'noagenda', sections: [] };
  },

  home(h, m, cfg) {
    const pc = cfg.home || {};
    const tiles = [];
    const later = [];   // clock and next event: after the other tiles, before the scenes
    if (m.weather) tiles.push({ kind: 'weather', entity: m.weather, size: [2, 2], place: true });
    const air = pc.air !== false ? findAir(h, m) : null;
    if (air) tiles.push({ kind: 'air', ...air, size: [2, 1] });
    const cam = pc.camera !== false ? (pc.camera || m.cameras.find((id) => !UNAVAILABLE.includes(h.states[id]?.state))) : null;
    if (cam) tiles.push({ kind: 'camera', entity: cam, size: [2, 1] });
    later.push({ kind: 'clock', size: [1, 1] });
    if (m.calendars.length) later.push({ kind: 'next_event', calendars: m.calendars, size: [2, 1] });
    // favourites: 1×1 like the door and garage tiles (3 automatic ones, or your own list)
    // automatic: doors first (locks, garage / gate) — the alarm and thermostat already have pills
    const auto = () => {
      const ids = favoritesAuto(h, m).filter((id) => !gone(h.states[id]));   // offline ones stay, badged
      const doorish = (id) => ['lock', 'cover'].includes(domainOf(id));
      return [...ids.filter(doorish), ...ids.filter((id) => !doorish(id))].slice(0, pc.max_favorites ?? 2);
    };
    const favs = pc.favorites ? asList(pc.favorites) : auto();
    favs.forEach((id) => {
      if (!h.states[id]) return;
      const room = m.areaById[entityArea(h, id)];
      tiles.push(entTile(id, { showRoom: true, areaName: room?.name, size: [1, 1], fav: true }));
    });
    // edit mode: + Add a favourite (★ on a favourite takes it off)
    tiles.push({ kind: 'add', addFav: true, roomIds: favs, size: [1, 1], editOnly: true });
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
    const sections = [{ tiles, main: true }];   // main: phones reorder it (_phonePage)
    if (pc.rooms === true && m.rooms.length) sections.push({ title: 'Rooms', link: 'rooms', tiles: m.rooms.map((r) => roomTile(r)) });
    const scenes = (m.byDomain.scene || []).slice(0, pc.max_scenes ?? 8);
    if (pc.scenes !== false && scenes.length) sections.push({ title: 'Scenes', layout: 'rows', scenes: true, tiles: scenes.map((id) => rowTile(id, { sub: 'Scene' })) });
    const chips = pc.chips === false ? [] : pc.chips ? chipList(pc.chips) : chipsAuto(h, m);
    return { title: cfg.title || h.config.location_name || 'Home', pills: true, people: true, chips, sections };
  },

  // the rooms everyone uses, each with its main devices (living spaces first)
  living(h, m, cfg) {
    const memberRooms = new Set(m.members.map((x) => x.room?.id).filter(Boolean));
    const list = cfg.living_rooms ? asList(cfg.living_rooms).map((id) => m.areaById[id]).filter(Boolean)
      : m.rooms.filter((r) => !memberRooms.has(r.id) && !PRIVATE_ROOM.test(r.name) && !OUTDOOR_ROOM.test(r.name))
        .map((r, i) => ({ r, k: (MAIN_ROOM.test(r.name) ? 0 : 1) * 1000 + i })).sort((a, b) => a.k - b.k).map((x) => x.r);
    const sections = list.map((r) => {
      // offline devices keep their place (amber badge, "Offline"), so the room doesn't look fine when it isn't
      const ids = (r.pinned || ROOM_ROW_DOMAINS.flatMap((d) => r.entities.filter((id) => domainOf(id) === d
        && !gone(h.states[id]) && !(d === 'light' && Array.isArray(h.states[id]?.attributes?.entity_id))))).slice(0, 11);
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
    if (r.temp) charts.push({ kind: 'chart', entity: r.temp, title: 'Temperature', icon: 'mdi:thermometer', color: KIND_TONES.temperature, size: [2, 1] });
    if (r.hum) charts.push({ kind: 'chart', entity: r.hum, title: 'Humidity', icon: 'mdi:water-percent', color: KIND_TONES.humidity, decimals: 0, size: [2, 1] });
    const lux = (r.groups.sensors || []).find((id) => h.states[id]?.attributes?.device_class === 'illuminance');
    if (lux) charts.push({ kind: 'chart', entity: lux, title: 'Light level', icon: 'mdi:brightness-6', color: KIND_TONES.neutral, decimals: 0, size: [2, 1] });
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
    // a details page: the floating ✕ of the pop-up pages (back to where it was opened, else Living)
    return { title: r.name, close: true, closeTo: 'living', room: r, hue: r.hue, sections };
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
    tiles.push({ kind: 'member_hero', room: r, title: `${mem.name}'s ${r ? 'room' : 'day'}`, openings, person: mem.person, size: [2, 2] });
    tiles.push({ kind: 'clock', size: [1, 1] });
    if (r) {
      // the room's own list (rooms.<area>.entities, also what "+ Add" builds), else the first 7 devices
      const ids = r.pinned ? [...r.pinned] : [...ROOM_ROW_DOMAINS.flatMap((d) => r.entities.filter((id) => domainOf(id) === d && !gone(h.states[id])
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
    const byDev = deviceIndex(h);
    const onDevice = (dev, dc) => (dev ? (byDev[dev] || []).find((id) => h.states[id]?.attributes?.device_class === dc) || null : null);
    power.current = ec.home_current || onDevice(devOf(power.home || power.grid || power.grid_in), 'current') || undefined;
    power.voltage = ec.voltage || onDevice(devOf(power.home || power.grid || power.grid_in), 'voltage') || undefined;
    Object.keys(power).forEach((k) => { if (!power[k]) delete power[k]; });

    // grid_status: <entity> | { entity, up: [...], down: [...] }; default: a sensor named like grid status
    // (the outage list's header, and the flow card's outage while it says down)
    const gs = ec.grid_status;
    const gridId = (isObj(gs) ? gs.entity : gs) || [...(m.byDomain.binary_sensor || []), ...(m.byDomain.sensor || [])]
      .find((id) => /grid.?(status|connect|up|online|power_status)|off.?grid/i.test(id)) || null;
    const gridSpec = gridId ? { ...(isObj(gs) ? gs : {}), entity: gridId } : null;

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
        // the grid's outage follows HomeView's own reading of the grid-status entity (flowOutage): one
        // settings object per state, so the card gets new settings only when that reading changes
        const confs = new Map();
        const cardFor = (hh) => {
          const alert = flowOutage(hh, gridSpec);
          if (!confs.has(alert)) confs.set(alert, flowCardConfig(entities, ec, gridSpec, alert));
          return confs.get(alert);
        };
        top.push({ kind: 'card', size: ['half', 2], phoneSpan: [2, 6], card: cardFor(h), cardFor });
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
    if (gridIn.length || solarIds.length) stat('Home used', 'mdi:home-lightning-bolt-outline', KIND_TONES.home, all, { compute: homeUse });
    if (solarIds.length) stat('Solar', 'mdi:solar-power-variant', KIND_TONES.solar, S(solarIds, 'sol'));
    if (gridIn.length) stat('From grid', 'mdi:transmission-tower-import', KIND_TONES.grid, S(gridIn, 'gin'));
    if (gridOut.length) stat('To grid', 'mdi:transmission-tower-export', KIND_TONES.grid, S(gridOut, 'gout'));
    if (batOut.length) stat('From battery', 'mdi:home-battery-outline', KIND_TONES.battery, S(batOut, 'bout'));
    if (gridIn.length && (solarIds.length || batOut.length)) {
      stat('Self-sufficiency', 'mdi:leaf', HV_TONES.ok, all, { unit: '%',
        compute: (v) => { const u = homeUse(v); return u > 0.05 ? clamp(100 * (1 - sumRole(v, 'gin') / u), 0, 100) : null; } });
    }
    if (items.length) top.push({ kind: 'energy_today', items, size: ['half', 2] });
    const sections = [{ tiles: top }];

    // power outage: every device from the Energy settings with its switch, W · A, kWh today
    // (energy.outage: false = the devices without the outage part; see outageOpts)
    const devices = asList(prefs?.device_consumption);
    if (devices.length) {
      const outage = outageOpts(ec);
      if (outage.show) cached('labels', 10 * 60e3, () => readLabels(h), page.rebuilder);
      const loads = devices.map((d) => {
        const statId = d.stat_consumption;
        const dev = devOf(statId) && h.devices?.[devOf(statId)];
        const pair = pairLoad(h, statId, outage.switches);
        const name = d.name || dev?.name_by_user || dev?.name || h.states[statId]?.attributes?.friendly_name || statId;
        return { kind: 'energy_load', stat: statId, ...pair, name, admin: !!h.user?.is_admin, outage, row: true };
      });
      // most used today first; rebuilt only when that order actually changes (the numbers
      // themselves update in place every minute)
      const orderOf = () => [...loads].sort((a, b) => (getStatToday(hvHass || h, b.stat) || 0) - (getStatToday(hvHass || h, a.stat) || 0)).map((t) => t.stat).join('|');
      const reorder = () => { if (orderOf() !== page._loadOrder) page.scheduleRebuild(); };
      loads.forEach((t) => getStatToday(h, t.stat, reorder));
      loads.sort((a, b) => (getStatToday(h, b.stat) || 0) - (getStatToday(h, a.stat) || 0));
      page._loadOrder = loads.map((t) => t.stat).join('|');
      const limit = ec.devices || 10;
      const shown = page._allLoads ? loads : loads.slice(0, limit);
      sections.push({ title: null, layout: 'rows', loads: true, tiles: [
        { kind: 'energy_outage', grid: gridSpec, outage, loads: loads.filter((l) => l.sw), more: loads.length > limit, all: !!page._allLoads, total: loads.length, page, full: true, row: true },
        ...shown] });
    }
    if (!src.length && !Object.keys(power).length && !devices.length) {
      return { title: 'Energy', sections: [], note: 'Set up the Energy dashboard in Home Assistant (Settings → Dashboards → Energy) and HomeView fills this page in.' };
    }
    return { title: 'Energy', sections };
  },

  cameras(h, m) {
    // fit: up to nine fill one tablet screen (see _layout)
    return { title: 'Cameras', sections: [{ layout: 'cams', fit: true, tiles: m.cameras.map((id) => ({ kind: 'camera', entity: id })) }] };
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
/* Home Assistant's theme variables in HomeView's mode (cards, the settings form) */
.page { ${HA_VARS}; ${haTokens(false)}; }
.page.hv-dark { ${haTokens(true)}; }
.page { overflow-x:hidden; min-height:calc(100vh - var(--header-height, 56px)); background:var(--hv-bg); color:var(--hv-fg); font-family:${FONT};
  padding:var(--hv-pad) var(--hv-pad) calc(var(--hv-pad) * 2); -webkit-font-smoothing:antialiased; }
/* the night face: photos and camera stills dimmed */
.page.night { --hv-photo-filter:brightness(.55) saturate(.8); }
.head { display:flex; flex-wrap:wrap; align-items:flex-start; justify-content:space-between; gap:12px 20px; margin-bottom:calc(var(--hv-gap) * 1.2); }
.date { font-size:13px; font-weight:650; letter-spacing:.06em; text-transform:uppercase; color:var(--hv-fg2); }
.title { font-size:clamp(30px, 4vw, 34px); font-weight:750; letter-spacing:-.02em; line-height:1.15; display:flex; align-items:center; gap:10px; }
.title .sub { font-size:15px; font-weight:500; color:var(--hv-fg2); letter-spacing:0; }
.title .tt[data-title] { user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; touch-action:manipulation; }
.title .tt[data-title-hold] { cursor:pointer; }
.txt.busy { animation:hv-pulse 1.1s ease-in-out infinite; }
.back { all:unset; position:relative; cursor:pointer; width:36px; height:36px; border-radius:50%; background:var(--hv-pill); display:inline-flex;
  align-items:center; justify-content:center; --mdc-icon-size:22px; }
/* touch targets: at least 44 × 44 px however small the button looks (Apple 44 pt, WCAG 2.5.5) */
.back::after, .pill::after, .chp::after, .nv::after, .txt::after, .avatar::after { content:''; position:absolute; left:50%; top:50%;
  width:max(100%, 44px); height:max(100%, 44px); transform:translate(-50%, -50%); }
.pills { display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end; max-width:100%; }
@media (max-width:600px) { .pills { justify-content:flex-start; } }
/* tablets / browsers: the pills stay top right beside the title block (several lines if need be),
   never pushed under the chips */
@media (min-width:601px) {
  .head { flex-wrap:nowrap; }
  /* edit mode: the edit bar is a row of its own under the title and the pills (it used to sit in the
     title block, widen it and squeeze the pills into one column) */
  .head.editing { flex-wrap:wrap; }
  .head.editing > .editbar { margin-top:0; }
  .head > div:first-child { flex:0 1 auto; }
  .head > .pills { flex:1 1 0; min-width:220px; align-content:flex-start; align-self:flex-start; padding-top:4px; }
  /* Home: the pills stay above the tiles right of the weather tile (2 columns wide), never over it */
  .head.home > .pills { max-width:calc(100% - 2 * ((100% - (var(--hv-cols) - 1) * var(--hv-gap)) / var(--hv-cols)) - 2 * var(--hv-gap)); }
}
.head > .xclose { flex:none; margin-left:auto; align-self:flex-start; width:40px; height:40px; --mdc-icon-size:22px;
  position:fixed; z-index:5; top:calc(env(safe-area-inset-top, 0px) + 14px); right:calc(env(safe-area-inset-right, 0px) + 14px);
  box-shadow:0 2px 10px rgba(0,0,0,.18); }
.head > .xclose ha-icon { display:flex; }
.pill { all:unset; position:relative; box-sizing:border-box; cursor:pointer; display:inline-flex; align-items:center; gap:6px; min-height:36px; padding:0 12px;
  border-radius:999px; max-width:100%; background:var(--hv-pill); font-size:13.5px; font-weight:650; color:var(--hv-fg); --mdc-icon-size:17px; white-space:nowrap; }
.pill .pt { overflow:hidden; text-overflow:ellipsis; min-width:0; }
.pill > i, .pill > ha-icon { flex:none; }
/* tablets and browsers: the main control on Home, 40 px tall (44 px to touch), 8 px apart */
@media (min-width:601px) { .pill { min-height:40px; padding:0 14px; font-size:14.5px; --mdc-icon-size:18px; } }
.pill ha-icon { color:var(--hv-icon); }
.pill.active ha-icon, .pill.t-on ha-icon { color:${HV_TONES.on}; }
.pill.t-ok ha-icon { color:${HV_TONES.ok}; }
.pill.t-warn ha-icon, .pill.t-heat ha-icon { color:${HV_TONES.warn}; }
.pill.t-armed ha-icon { color:${HV_TONES.armed}; }
.pill.t-cool ha-icon { color:${HV_TONES.cool}; }
.pill.alert { background:var(--hv-alert-fill, ${HV_TONES.alert}); color:#fff; }
.pill.alert ha-icon { color:#fff; }
.people { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
.chips { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
/* edit mode: chips and pills move by dragging */
@keyframes hv-wiggle { from { transform:rotate(-.6deg); } to { transform:rotate(.6deg); } }
.sorting > [data-chip], .sorting > [data-pill] { cursor:grab; touch-action:none; user-select:none; -webkit-user-select:none;
  outline:1.5px dashed var(--hv-accent); outline-offset:2px; animation:hv-wiggle .35s ease-in-out infinite alternate; }
.grid > homeview-tile[data-sort] { cursor:grab; user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; }
.grid > homeview-tile.dragging { cursor:grabbing; z-index:3; transform:scale(1.04); filter:drop-shadow(0 8px 18px rgba(0,0,0,.25)); transition:transform .12s; }
.sorting > .dragging { cursor:grabbing; animation:none; transform:scale(1.08); box-shadow:0 6px 18px rgba(0,0,0,.22); z-index:3; position:relative; }
.chp { all:unset; position:relative; box-sizing:border-box; cursor:pointer; height:40px; min-width:40px; padding:0 9px; border-radius:999px; background:var(--hv-pill);
  display:inline-flex; align-items:center; justify-content:center; gap:6px; color:var(--hv-icon); --mdc-icon-size:22px;
  -webkit-tap-highlight-color:transparent; user-select:none; -webkit-user-select:none; transition:background .2s, color .2s; }
.chp b { font:700 13px ${FONT}; }
/* label: (tablets): what a mode chip is, in words; phones keep the icon only. '|' in home.chips: a gap */
.chp b.cl { font-weight:650; padding-right:3px; }
.head.ph .chp b.cl { display:none; }
.chips > .chp.gap { margin-left:12px; }
.chp.on, .chp.ok, .chp.warn, .chp.armed { background:var(--hv-tile-on); box-shadow:var(--hv-on-shadow, none); }
/* offline: not lit — the plain chip, a grey icon with the amber badge, and the word */
.chp.offline { background:var(--hv-pill); box-shadow:none; color:var(--hv-icon); }
.chp.offline b { color:var(--hv-warn-tx, #FF9500); }
.chp .ob { position:absolute; top:3px; left:24px; width:14px; height:14px; border-radius:50%; background:var(--hv-badge, #FF9500); color:var(--hv-badge-fg, #fff);
  box-shadow:0 0 0 2px var(--hv-pill); display:flex; align-items:center; justify-content:center; font:800 10px / 1 ${FONT}; pointer-events:none; }
.chp.on { color:${HV_TONES.ok}; }
.chp.ok { color:${HV_TONES.ok}; }
.chp.warn { color:${HV_TONES.warn}; }
.chp.armed { color:${HV_TONES.armed}; }
.chp.warn b, .chp.ok b { color:var(--hv-fg); }
.chp.alert { background:var(--hv-alert-fill, ${HV_TONES.alert}); color:#fff; }
.chp.na { opacity:.45; }
.chp.busy { animation:hv-pulse 1.1s ease-in-out infinite; }
@keyframes hv-pulse { 50% { opacity:.45; } }
.avatar { position:relative; width:34px; height:34px; border-radius:50%; background:var(--hv-pill); display:flex; align-items:center; justify-content:center;
  font-size:12px; font-weight:700; color:var(--hv-accent); box-shadow:0 0 0 2px var(--hv-line); cursor:pointer; }
.avatar.home { box-shadow:0 0 0 2px ${HV_TONES.ok}; }
.avatar img { width:100%; height:100%; object-fit:cover; border-radius:50%; }
.avatar.away > img, .avatar.away > .al { opacity:.55; filter:grayscale(.6); }
.avatar .aw { position:absolute; right:-5px; bottom:-5px; width:16px; height:16px; border-radius:50%; background:var(--hv-bg); color:var(--hv-fg2);
  display:flex; align-items:center; justify-content:center; --mdc-icon-size:12px; pointer-events:none; }
.avatar .aw ha-icon { display:flex; }
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
.grid.cams.fitted { justify-content:center; }
.grid.cams.fitted > homeview-tile { aspect-ratio:auto; height:100%; }
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
   up next | weather — instead of the landscape board's empty space around the clock. Set by _layout:
   touch screens, and windows 600–999 px wide (a desktop window ≥ 1000 px gets the landscape board) */
.board.portrait:not(.narrow) { grid-template-columns:repeat(2, minmax(0, 1fr));
  grid-template-rows:minmax(0, 1fr) minmax(0, 1.15fr) minmax(0, .8fr);
  grid-template-areas:"date clock" "cam cam" "next weather"; }
/* no agenda (the guest view, or no calendars): the photo takes its place; phones show the weather in it */
.board.noagenda { grid-template-areas:"date clock clock" "date clock clock" "cam cam weather"; }
.board.portrait.noagenda:not(.narrow) { grid-template-areas:"date clock" "cam cam" "weather weather"; }
.board.narrow.noagenda { grid-template-areas:"date clock" "cam cam" "weather weather"; }
.board.narrow.noagenda > homeview-tile.a-weather { display:block; }
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
/* the calendar sheet (tap a Next / Up next tile): the events by day, each day one rounded list */
.sheet.cal { width:min(640px, 100%); }
.sheet-sub { display:block; margin-top:2px; font-size:13.5px; font-weight:600; color:var(--hv-fg2); }
.cal-body > .cal-day:first-child { margin-top:2px; }
.cal-list { background:var(--hv-tile); border-radius:16px; overflow:hidden; }
.cal-ev { display:flex; align-items:center; gap:12px; min-height:54px; padding:9px 16px; }
.cal-ev + .cal-ev { border-top:1px solid var(--hv-line); }
.cal-dot { flex:none; width:10px; height:10px; border-radius:50%; }
.cal-t { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.cal-t b, .cal-t span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.cal-t b { font-size:16px; font-weight:650; color:var(--hv-fg); }
.cal-t span { font-size:13.5px; color:var(--hv-fg2); }
.cal-w { flex:none; font-size:15px; font-weight:600; color:var(--hv-fg2); text-align:right; font-variant-numeric:tabular-nums; }
.cal-ev.now .cal-w { color:var(--hv-fg); }
.cal-none { padding:18px 4px; color:var(--hv-fg2); font-size:15px; }
.pen { margin-left:4px; color:var(--hv-fg2); }
.txt { all:unset; position:relative; cursor:pointer; display:inline-flex; align-items:center; gap:6px; padding:8px 14px; border-radius:999px; background:var(--hv-pill);
  font-size:14px; font-weight:650; color:var(--hv-fg); --mdc-icon-size:17px; font-family:${FONT}; }
.txt.primary { background:var(--hv-accent); color:#fff; }
.editbar { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:10px; margin-top:12px; padding:10px 12px 10px 16px;
  flex:1 1 100%; order:9; box-sizing:border-box;
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
.nv, .chip { all:unset; position:relative; cursor:pointer; display:inline-flex; align-items:center; gap:6px; padding:7px 12px; border-radius:999px; flex:none;
  font:650 13.5px ${FONT}; color:var(--hv-fg2); --mdc-icon-size:18px; }
.nv.on { background:var(--hv-pill); color:var(--hv-fg); }
.nv.on ha-icon { color:var(--hv-accent); }
.chip { background:var(--hv-pill); color:var(--hv-fg); width:36px; height:36px; padding:0; justify-content:center; --mdc-icon-size:20px; }
@media (max-width:700px) { .nv > span:not(.lt) { display:none; } .nv { padding:8px 9px; } }
.upd { all:unset; cursor:pointer; flex-basis:100%; display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:16px;
  background:var(--hv-accent); color:#fff; font:500 14px ${FONT}; --mdc-icon-size:22px; box-sizing:border-box; }
.upd b { font-weight:700; }
.title .hb { flex:none; color:var(--hv-fg2); }
/* the guest view's label by the title (tap: what's hidden) */
.gchip { all:unset; position:relative; cursor:pointer; flex:none; align-self:center; padding:4px 10px; border-radius:999px; background:var(--hv-pill);
  color:var(--hv-fg2); font:650 13px ${FONT}; letter-spacing:.02em; }
.gchip::after { content:''; position:absolute; left:50%; top:50%; width:max(100%, 44px); height:44px; transform:translate(-50%, -50%); }
.title .hb + .hb, .title .hb + .back { margin-left:-2px; }
/* the round buttons by the title (Menu, update, back, rename) and the control chips under it:
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
/* the "are you sure?" sheet (hvConfirm): centred on tablets, at the bottom on phones; 48 px buttons */
.pop.cf { z-index:12; }
.sheet.confirm { padding:22px 22px calc(22px + env(safe-area-inset-bottom, 0px)); }
.cf-t { font-size:20px; font-weight:750; line-height:1.25; }
.cf-b { color:var(--hv-fg2); font-size:15px; line-height:1.4; margin-top:6px; }
.cf-a { display:flex; gap:10px; margin-top:20px; }
.cf-btn { all:unset; box-sizing:border-box; flex:1; height:48px; border-radius:14px; display:flex; align-items:center; justify-content:center;
  background:var(--hv-pill); color:var(--hv-fg); font:650 16px ${FONT}; cursor:pointer; }
.cf-btn.go { background:var(--hv-accent); color:#fff; }
.cf-btn.go.t-alert { background:#D70015; }
.cf-btn.go.t-ok { background:#1B7130; }
.cf-btn:focus-visible { outline:3px solid var(--hv-accent); outline-offset:2px; }
/* hvPrompt's text field: 17 px type (iOS zooms into anything smaller), 48 px tall */
.cf-in { all:unset; box-sizing:border-box; display:block; width:100%; height:48px; margin-top:14px; padding:0 14px; border-radius:12px;
  background:var(--hv-tile); color:var(--hv-fg); font:500 17px ${FONT}; box-shadow:inset 0 0 0 1.5px var(--hv-line); cursor:text;
  -webkit-user-select:text; user-select:text; }
.cf-in:focus { box-shadow:inset 0 0 0 2px var(--hv-accent); }
.cf-in + .cf-b { margin-top:8px; font-size:13.5px; }
.pill:focus-visible, .chp:focus-visible, .txt:focus-visible, .back:focus-visible, .nv:focus-visible { outline:3px solid var(--hv-accent); outline-offset:2px; }
/* phones: the pills wrap onto as many lines as they need (problems first), under the chips and the
   people, which share a row (avatars right; both wrap too). Nothing on Home scrolls sideways, so a
   sideways swipe anywhere there changes the page (a row that scrolled kept the swipe, or both moved) */
.head.ph > .tblock { flex:1 1 100%; }
.head.ph > .pills { width:100%; }
.head.ph > .pills > .pill { flex:none; }
.cprow { display:flex; align-items:flex-start; gap:10px; margin-top:10px; min-width:0; }
.cprow > .chips { margin-top:0; flex:1 1 auto; min-width:0; flex-wrap:wrap; padding:2px 0; }
.cprow > .chips > .chp { flex:none; }
.cprow > .people { margin-top:0; flex:none; max-width:60%; flex-wrap:wrap; justify-content:flex-end; gap:6px; padding-top:6px; }
.cprow .avatar { width:28px; height:28px; font-size:11px; }
/* full screen: page dots at the bottom centre (tap a dot: that page; the current one: the pages by name) */
.dots { position:fixed; z-index:4; left:50%; transform:translateX(-50%); bottom:env(safe-area-inset-bottom, 0px);
  display:flex; flex-direction:column; align-items:center; gap:4px; transition:opacity .4s; max-width:96vw; }
.dots.ph { bottom:calc(env(safe-area-inset-bottom, 0px) + 2px); }
.dots.idle { opacity:0; }
.drow { display:flex; align-items:center; height:44px; padding:0 6px; }
.dot { all:unset; cursor:pointer; position:relative; width:22px; height:44px; display:flex; align-items:center; justify-content:center; }
.dot::before { content:''; width:7px; height:7px; border-radius:4px; background:var(--hv-fg2); opacity:.35; transition:width .2s, opacity .2s; }
.dot.on::before { width:18px; background:var(--hv-accent); opacity:1; }
.dots.ph .dot { width:18px; }
/* phones: the dots float over the page as it scrolls — a small capsule keeps them visible over photos */
.dots.ph .drow { position:relative; }
.dots.ph .drow::before { content:''; position:absolute; left:2px; right:2px; top:50%; height:20px; transform:translateY(-50%); border-radius:10px;
  background:color-mix(in srgb, var(--hv-pill) 85%, transparent); -webkit-backdrop-filter:blur(6px); backdrop-filter:blur(6px); z-index:-1; }
.dots.ph .dot::before { width:6px; height:6px; border-radius:3px; }
.dots.ph .dot.on::before { width:16px; }
.dot:focus-visible { outline:2px solid var(--hv-accent); outline-offset:-8px; border-radius:12px; }
.dname { font:650 13px ${FONT}; color:var(--hv-fg); background:var(--hv-pill); padding:4px 12px; border-radius:999px; opacity:0;
  transition:opacity .3s; pointer-events:none; box-shadow:0 2px 8px rgba(0,0,0,.12); }
.dots.flash .dname { opacity:1; }
.dots.open .dname { display:none; }
.dnames { display:flex; flex-wrap:wrap; justify-content:center; gap:6px; padding:8px; border-radius:22px; background:var(--hv-pill);
  box-shadow:0 4px 16px rgba(0,0,0,.18); }
.dnames[hidden] { display:none; }
.dnames .nv.on { background:var(--hv-tile-on); }
/* Widgets: the full-screen button, bottom right on the dots' line; quiet, and it fades with them
   (no taps while faded: the first touch only brings it back) */
.fsb { all:unset; box-sizing:border-box; position:fixed; z-index:4; right:calc(env(safe-area-inset-right, 0px) + 12px);
  bottom:calc(env(safe-area-inset-bottom, 0px) + 4px); width:36px; height:36px; border-radius:50%; display:flex; align-items:center;
  justify-content:center; cursor:pointer; background:color-mix(in srgb, var(--hv-pill) 70%, transparent); color:var(--hv-fg2);
  --mdc-icon-size:22px; opacity:.8; transition:opacity .4s; }
.fsb::after { content:''; position:absolute; inset:-4px; }
.fsb ha-icon { display:flex; }
.fsb.idle { opacity:0; pointer-events:none; }
.fsb:focus-visible { outline:3px solid var(--hv-accent); outline-offset:2px; opacity:1; }
/* room for the dots under the last tiles (phones scroll to the bottom) */
.page.has-dots { padding-bottom:calc(var(--hv-pad) * 2 + 20px); }
.page.boardpage.has-dots { padding-bottom:0; }
/* reduced motion: no wiggle or pulse; a critical banner gets a steady ring instead */
@media (prefers-reduced-motion: reduce) {
  .dots, .dot::before, .dname, .fsb { transition:none; }
  .sorting > [data-chip], .sorting > [data-pill] { animation:none; }
  .chp.busy, .txt.busy { animation:none; }
  .palert.critical { animation:none; box-shadow:inset 0 0 0 2.5px ${HV_TONES.alert}; }
  .grid > homeview-tile.dragging, .sorting > .dragging { transition:none; }
}
`;

class HomeViewPage extends HTMLElement {
  constructor() {
    super();
    this._hvPage = true;   // hvConfirm finds the page a tile is on by this
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
    if (sig !== this._sig) {
      // not under an open sheet or a drag: the rebuild would close it, with what's typed in it — it
      // happens when the sheet closes; the tiles keep updating meanwhile. Not either when Home
      // Assistant is about to replace this page (the pages changed): built once, there
      if (this._sig != null && this._interacting()) this._holdRebuild();
      else if (this._sig != null && this._replacedSoon()) this._rebuildLater();
      else { this._sig = sig; this.rebuild(); return; }
    }
    // guests arrived or left (guest:): build again — not under an open sheet or a drag (the next update
    // after it closes does)
    else if (this._builtGuest !== undefined && isGuest(h, this._config.options) !== this._builtGuest && !this._interacting()) { this.rebuild(); return; }
    // a page HA keeps for later (not on screen): catch up when it's shown again
    if (!this.isConnected) { this._stale = true; return; }
    this._checkAvail(h);
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
    // where the window is scrolled, kept up to date without asking for a layout (see disconnectedCallback).
    // The first reading waits until the frame is drawn: asked now, while Home Assistant is putting the
    // dashboard into the document, it forces a layout of all of it (~150 ms on a tablet's first load)
    if (!HomeViewPage._scrolls) {
      HomeViewPage._scrolls = true;
      requestAnimationFrame(() => setTimeout(() => { hvScrollY = window.scrollY || 0; }, 0));
      window.addEventListener('scroll', () => { hvScrollY = window.scrollY; }, { passive: true });
    }
    this._shownAt = location.pathname;
    if (this._config) this._startPage();
    // the page dots: a touch anywhere wakes them (Widgets hides them after a while)
    if (!this._onAnyTouch) { this._onAnyTouch = () => { if (this._dotsEl || this._fsEl) this._dotsWake(); }; window.addEventListener('pointerdown', this._onAnyTouch, { capture: true, passive: true }); }
    this._kiosk();
    hvScreensaver.update(this);
    if (!this._onWinResize) { this._onWinResize = () => this._layout(); window.addEventListener('resize', this._onWinResize); }
    // edit mode is one state for the whole dashboard: follow a change made on another page
    if (!this._onEditing) {
      this._onEditing = (e) => { if (e.detail?.from !== this && this._builtEditing !== undefined && this._builtEditing !== this._editing) this.rebuild(); };
      window.addEventListener('homeview-editing', this._onEditing);
    }
    if (this._builtEditing !== undefined && this._builtEditing !== this._editing) this.rebuild();
    else if (this._stale && this._hass && this._watch && availSig(this._hass, this._watch) !== this._watchSig) { this._stale = false; this.rebuild(); }
    else if (this._stale && this._hass) { this._stale = false; this._tiles.forEach((t) => { t.hass = this._hass; }); this._renderHead(); }
  }

  /** A device the page's picks depend on went offline or came back (availSig): build the page again
   *  once it has settled for 2 s (a device that flaps doesn't rebuild the page on every flap). */
  _checkAvail(h) {
    if (!this._watch) return;
    // at most once a second: the list is a few hundred entities and updates come several times a
    // second; an update inside the second is looked at when it's over (the last one of a burst too)
    const now = Date.now(), wait = 1000 - (now - (this._availAt || 0));
    if (wait > 0) {
      if (!this._availLate) this._availLate = setTimeout(() => { this._availLate = null; if (this._hass && this.isConnected) this._checkAvail(this._hass); }, wait);
      return;
    }
    this._availAt = now;
    if (availSig(h, this._watch) === this._watchSig) { clearTimeout(this._availT); this._availT = null; return; }
    if (this._availT) return;
    this._availT = setTimeout(() => {
      this._availT = null;
      if (!this._hass || availSig(this._hass, this._watch) === this._watchSig) return;
      if (!this.isConnected) { this._stale = true; return; }
      if (this._interacting() || this._replacedSoon()) return;   // the next update after that tries again
      this.rebuild();
    }, 2000);
  }
  disconnectedCallback() {
    this._ro?.disconnect(); this._ro = null;
    if (this._onAnyTouch) { window.removeEventListener('pointerdown', this._onAnyTouch, { capture: true }); this._onAnyTouch = null; }
    clearTimeout(this._dotsIdleT);
    if (this._onWinResize) { window.removeEventListener('resize', this._onWinResize); this._onWinResize = null; }
    hvPagesOnScreen = Math.max(0, hvPagesOnScreen - 1);
    this._holdMo?.disconnect(); this._holdMo = null;
    // Home Assistant replaces this page with a new copy (it built the dashboard again: a room or a page
    // came or went, the connection came back) while the address is still this page's — a move to
    // another page changes the address first. The new copy opens where this one was. (The position
    // from the last scroll event: asking the window now would give the one after this page is gone.)
    if (location.pathname === this._shownAt && hvScrollY > 0) keepScroll(hvScrollY);
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

  // rebuild the page when what it reads from the registries changes (regVersion), entities come or
  // go, or light / dark / night changes — not on every state change, nor on a registry change that
  // touches nothing HomeView reads (a new registry object with the same areas, devices and names)
  _signature(h) {
    const reg = regVersion(h), n = hvStateCount(h), dark = isDark(h, this._config.options), night = isNight(h, this._config.options);
    if (this._regV !== reg || this._nStates !== n || this._dark !== dark || this._night !== night) {
      this._regV = reg; this._nStates = n; this._dark = dark; this._night = night;
      this._gen = (this._gen || 0) + 1;
    }
    return this._gen;
  }

  /** A sheet is open on this page (or a tile is being dragged): a rebuild now would close it. */
  _interacting() { return !!(this.isConnected && (this._dragging || this._root.querySelector('.pop'))); }

  /** Rebuild once the sheet is closed (or, without MutationObserver, on the next update after it). */
  _holdRebuild() {
    if (this._holdMo || typeof MutationObserver === 'undefined') return;
    this._holdMo = new MutationObserver(() => {
      if (this._interacting()) return;
      this._holdMo.disconnect(); this._holdMo = null;
      if (!this._hass) return;
      if (this._replacedSoon()) { this._rebuildLater(); return; }
      const sig = this._signature(this._hass);
      if (sig !== this._sig) { this._sig = sig; this.rebuild(); }
    });
    this._holdMo.observe(this._root, { childList: true });
  }

  /** The strategy has told Home Assistant to build the dashboard again (or will, once a sheet closes):
   *  this page is about to be replaced by a new one. */
  _replacedSoon() { return hvRegen.held || Date.now() - hvRegen.at < 3000; }
  /** In case it isn't replaced after all: build it in a moment (a replaced page is off the screen by then). */
  _rebuildLater() {
    if (this._laterT) return;
    this._laterT = setTimeout(() => {
      this._laterT = null;
      if (!this.isConnected || !this._hass || this._interacting()) return;
      const sig = this._signature(this._hass);
      if (sig !== this._sig) { this._sig = sig; this.rebuild(); }
    }, 3000);
  }

  /** Build the page again. If that throws, the page on screen stays (and keeps updating) instead of
   *  freezing or Home Assistant replacing it with its error card; the first build shows a note. */
  rebuild() {
    if (!this._hass) return;
    // stay where you were: everything under the page is replaced, and while the new tiles take their
    // size the page can be shorter for a moment (the browser then scrolls up)
    if (this.isConnected && this._page) keepScroll(hvScrollY);
    const keep = { _tiles: this._tiles, _model: this._model, _page: this._page, _head: this._head, _headKey: this._headKey,
      _alertsEl: this._alertsEl, _alertsKey: this._alertsKey, _phone: this._phone, _builtEditing: this._builtEditing, _dark: this._dark, _night: this._night, _pal: this._pal };
    const style = this._root.getAttribute('style'), board = this._root.classList.contains('boardpage');
    this._swapped = false;
    try { this._rebuild(); } catch (e) {
      console.warn('HomeView: this page couldn\'t be built', e);
      if (this._swapped) return;   // the new page is already on screen: keep it
      Object.assign(this, keep);
      if (style === null) this._root.removeAttribute('style'); else this._root.setAttribute('style', style);
      this._root.classList.toggle('boardpage', board);
      if (!keep._page) {   // nothing on screen yet: say so (the reason for admins)
        const n = document.createElement('div'); n.className = 'note';
        n.textContent = `HomeView couldn't build this page${this._hass.user?.is_admin ? `: ${e?.message || e}` : '.'}`;
        this._root.replaceChildren(n);
      }
    }
  }

  _rebuild() {
    const h = this._hass;
    this._builtEditing = this._editing;
    const cfg = this._config.options || {};
    // the guest view (guest:): the pages it hides leave this page's swipe order, dots and page bar
    // (a copy of the card config; the one Home Assistant gave is kept to go back to)
    const guest = isGuest(h, cfg);
    this._builtGuest = guest; this._guest = guest;
    if (this._config !== this._guestCfg) this._configAll = this._config;
    const full = this._configAll;
    if (guest) {
      const keep = (p) => !guestHidden(p, cfg);
      this._config = this._guestCfg = { ...full, order: asList(full.order).filter(keep), nav: asList(full.nav).filter((v) => keep(v?.path)),
        pagePills: asList(full.pagePills).filter((pp) => keep(pp?.page)) };
    } else this._config = full;
    hvAvatarMode = cfg.avatars ?? 'samples';
    // edit mode: hidden entities and rooms stay in place, faded, with an eye to show them again;
    // they only leave the page when editing is done
    const editing = this._editing;
    const hiddenEnts = new IdSet(h, [...asList(cfg.exclude_entities),   // ids, globs and filters (entityFilter)
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
    let page;
    try { page = builder ? builder(h, this._model, mcfg, this._config, this) : { title: '?', sections: [] }; } catch (e) {
      // HomeView's own part of the page failed: the header, your own sections and a note still show
      console.warn(`HomeView: the ${this._config.page} page's tiles couldn't be built`, e);
      page = { title: PAGE_DEFS[this._config.page]?.title || 'Page', sections: [],
        note: `Some of this page couldn't be built${h.user?.is_admin ? `: ${e?.message || e}` : '.'}` };
    }
    if (editing) {
      for (const sec of page.sections || []) {
        for (const t of sec.tiles || []) {
          if (t.entity && hiddenEnts.has(t.entity)) t.hiddenEnt = hiddenEnts.byPattern(t.entity) ? 'pattern' : true;
          if (t.room && t.kind === 'room' && hiddenRooms.has(t.room.id)) t.hiddenRoom = true;
        }
      }
    } else if (hiddenEnts.size) {
      // hidden means hidden everywhere: tiles named explicitly (favourites, a room's entities: list,
      // custom pages, phone favourites) don't pass through the model's exclusion, so drop them here
      for (const sec of page.sections || []) sec.tiles = (sec.tiles || []).filter((t) => !(t.entity && hiddenEnts.has(t.entity)));
    }
    if (guest) {
      const here = this._config.path || this._config.page;
      if (guestHidden(here, cfg)) {
        // a page the guest view hides (a link, or it was on screen when guests arrived): Home instead
        page = { title: page.title, sections: [], note: 'This page is hidden while guests are here.' };
        const to = asList(this._config.order).includes('home') ? 'home' : asList(this._config.order)[0];
        if (this.isConnected && to && location.pathname.split('/')[2] === here) setTimeout(() => navigate(to, true), 0);
      }
      page.people = false;
      for (const sec of page.sections || []) sec.tiles = (sec.tiles || []).filter((t) => !GUEST_HIDDEN_TILES.includes(t.kind));
    }
    this._page = page;
    // the states this build's picks used (a room's page also leaves offline sensors out): see availSig
    const mw = this._model.watch || { off: [], gone: [] };
    this._watch = page.room && this._config.page === 'room' ? { off: [...mw.off, ...page.room.entities], gone: mw.gone } : mw;
    this._watchSig = availSig(h, this._watch);
    if (this._config.popup) page.close = true;
    const pd = PAGE_DEFS[this._config.page] || {};
    // pages_config.<page>.title (person and custom pages: pages_config.<their path>.title; a room's
    // page is named by rooms.<area>.name)
    const titleKey = ['member', 'custom'].includes(this._config.page) ? this._config.path : this._config.page;
    const titleCfg = (cfg.pages_config?.[titleKey] || (this._config.page === 'living' ? cfg.pages_config?.family || cfg.pages_config?.shared : null))?.title;
    if (titleCfg && this._config.page !== 'room') page.title = titleCfg;
    const pageCfg = cfg.pages_config?.[this._config.page] || (this._config.page === 'living' ? cfg.pages_config?.family || cfg.pages_config?.shared : null) || {};
    const hue = hueOf(pageCfg.color, page.hue ?? pd.hue ?? 28);
    const dark = isDark(h, cfg), night = isNight(h, cfg);
    this._dark = dark; this._night = night;
    // the night face: every tint warm and quiet (see isNight); otherwise the page's / room's own
    const pal = (hu, sat) => (night ? nightPalette(sat ?? 1) : palette(hu, dark, sat));
    this._pal = pal;
    // Home Assistant's theme variables follow too (HA_VARS, haTokens): its primary scale in the accent
    this._root.setAttribute('style', styleVars({ ...pal(hue, pd.sat ?? 1), ...haPrimary(night ? 28 : hue, night ? 0.6 : pd.sat ?? 1) }));
    this._root.classList.toggle('night', night);
    this._root.classList.toggle('hv-dark', dark);
    const pf = fontStack(cfg.font);   // font: inter — the whole dashboard
    if (pf) this._root.style.fontFamily = pf;

    // the user's own sections (pages_config.<page>.sections, rooms.<area>.sections, custom_pages)
    const custom = this._config.page === 'custom' ? customPages(cfg)[this._config.custom] : null;
    const extra = custom ? custom.sections
      : this._config.page === 'room' ? cfg.rooms?.[this._config.area]?.sections : pageCfg.sections;
    const userSecs = userSections(extra, h, this._model);
    // { type: energy_now / energy_flow } in a page file: the live power sensors the Energy page uses
    if (userSecs.some((sec) => sec.tiles.some((t) => ['energy_now', 'energy_flow'].includes(t.kind) && !isObj(t.power)))) {
      const prefs = getEnergyPrefs(h, this.rebuilder);
      const pw = prefs === undefined ? {} : energyPower(h, this._model, cfg, prefs);
      userSecs.forEach((sec) => sec.tiles.forEach((t) => { if (['energy_now', 'energy_flow'].includes(t.kind) && !isObj(t.power)) t.power = pw; }));
    }
    for (const sec of userSecs) {
      // show_room: false (a custom page) — tiles show their state, not their room
      if (custom?.show_room === false) sec.tiles = sec.tiles.map((t) => (t.kind === 'entity' ? { ...t, showRoom: false } : t));
      // hidden entities: gone (edit mode: faded, with the eye to show them again)
      if (editing) sec.tiles.forEach((t) => { if (t.entity && hiddenEnts.has(t.entity)) t.hiddenEnt = hiddenEnts.byPattern(t.entity) ? 'pattern' : true; });
      else if (hiddenEnts.size) sec.tiles = sec.tiles.filter((t) => !(t.entity && hiddenEnts.has(t.entity)));
      if (sec.position === 'top') page.sections.unshift(sec); else page.sections.push(sec);
    }
    // (hidden entities / rooms are marked in place above while editing)
    // the guest view: no camera, person or calendar tiles in your own sections either
    if (guest) for (const sec of page.sections) sec.tiles = sec.tiles.filter((t) => !GUEST_HIDDEN_TILES.includes(t.kind));
    // phones: the layout of a hand-made iPhone HomeView (see PHONE_SPAN)
    this._phone = this._isPhone();
    if (this._phone) this._phonePage(h, cfg, page);

    this._tiles = [];
    const whens = [];   // show_when: [{ el, c, grid? }] — shown / hidden live (_applyWhens), kept with the page
    const frag = document.createDocumentFragment();
    const head = document.createElement('div'); head.className = 'head' + (this._config.page === 'home' ? ' home' : '');
    frag.appendChild(head);
    this._head = head; this._headKey = null;
    // alerts: (a custom page's warnings) — slim banners under the title, kept live with the header
    this._alertsEl = null; this._alertsKey = null;
    if (page.alerts) { const al = document.createElement('div'); al.className = 'palerts'; frag.appendChild(al); this._alertsEl = al; }
    const notes = [];
    if (page.note) notes.push(page.note);
    if (custom && _autoPath.has(custom) && h.user?.is_admin) {
      notes.push(`This page has no path: in its file, so its address is “${custom.path}”, its place in the list — adding a page before it changes the address, and every hold: or link to it. Give it a path: (one word, e.g. the file's name). Only admins see this.`);
    }
    if (custom && h.user?.is_admin) {
      const miss = missingEntities(h, custom);
      if (miss.length) notes.push(`Page “${custom.path}”: ${miss.length > 1 ? 'these entities aren\'t' : 'this entity isn\'t'} in Home Assistant — ${miss.slice(0, 6).join(', ')}${miss.length > 6 ? ` and ${miss.length - 6} more` : ''}. Set them in the vars: block at the top of its file (custom_pages/README.md). Only admins see this.`);
    }
    if (extra && h.user?.is_admin) {   // tiles that can't be shown: an unknown type or area (instead of vanishing)
      const odd = oddTiles(extra, this._model);
      if (odd.length) notes.push(`${custom ? `Page “${custom.path}”` : 'Your sections on this page'}: ${odd.slice(0, 6).join(', ')}${odd.length > 6 ? ` and ${odd.length - 6} more` : ''} — left out. Tile types: entity, room, ${USER_TILE_TYPES.join(', ')} or card: (README → Your own tiles). Only admins see this.`);
    }
    if (h.user?.is_admin) {   // show_when, patterns, defaults, format, confirm, section / customize keys
      const pn = primitiveNotes(h, cfg, extra);
      if (pn.length) notes.push(`${custom ? `Page “${custom.path}”` : 'HomeView'}: ${pn.slice(0, 5).join('; ')}${pn.length > 5 ? ` and ${pn.length - 5} more` : ''} (custom_pages/README.md). Only admins see this.`);
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
      const b = document.createElement('div'); b.className = `board${page.boardClass ? ` ${page.boardClass}` : ''}`;
      const bh = night ? 28 : page.hue ?? pd.hue ?? 200;
      b.setAttribute('style', styleVars({ ...pal(bh, 0.3),
        '--hv-board': night ? 'hsl(28 10% 8%)' : dark ? `hsl(${bh} 12% 15%)` : `hsl(${bh} 13% 72%)`,
        '--hv-fg': night ? '#CFC4B8' : dark ? '#EEF2F3' : '#15191B', '--hv-fg2': night ? 'hsl(28 8% 58%)' : dark ? `hsl(${bh} 8% 66%)` : `hsl(${bh} 9% 24%)`,
        // the weekday in a deeper orange on the light board (3.6 : 1 for its big type; the accent was 1.7)
        '--hv-accent': dark ? '#FF9F45' : '#E8640C', '--hv-accent-tx': dark ? '#FF9F45' : '#9A3A00', '--hv-clock-num': 'var(--hv-fg)', '--hv-line': dark ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.14)',
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
      const g = document.createElement('div'); g.className = 'grid' + (sec.layout ? ` ${sec.layout}` : '') + (sec.loads ? ' loads' : '') + (sec.fit ? ' fit' : '');
      if (sec.hue !== undefined) g.setAttribute('style', hueStyle(sec.hue, dark, night));
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
        // edit mode: tiles that can move (Home's favourites, a room's own tiles) carry what they move in
        if (editing && h.user?.is_admin && spec.entity && !spec.hiddenEnt && (spec.fav || spec.pinRoom)) t.dataset.sort = spec.fav ? 'fav' : `room:${spec.pinRoom}`;
        // the outage header: its text wraps on phones and narrow tablets (iPad portrait)
        if (spec.full) { t.style.gridColumn = '1 / -1'; if (spec.kind === 'energy_outage' && (this._phone || window.innerWidth < 1000)) t.style.gridRow = `span ${this._phone ? 3 : 2}`; }
        g.appendChild(t);
        if (spec.showWhen !== undefined) whens.push({ el: t, c: spec.showWhen });
      }
      // a section with show_when, or whose tiles all hide by theirs, hides too (after its tiles)
      const condTiles = sec.tiles.some((x) => x.showWhen !== undefined);
      if (sec.showWhen !== undefined || condTiles) whens.push({ el: s, c: sec.showWhen, grid: condTiles ? g : null });
      if (editing && h.user?.is_admin) {
        const groups = new Set([...g.children].map((t) => t.dataset.sort).filter(Boolean));
        for (const grp of groups) if (g.querySelectorAll(`[data-sort="${grp}"]`).length > 1) this._sortTiles(g, grp);
      }
      s.appendChild(g);
      if (sec.half && !this._phone) {
        if (!halfRow || halfRow.childElementCount >= 2) { halfRow = document.createElement('div'); halfRow.className = 'secrow'; frag.appendChild(halfRow); }
        halfRow.appendChild(s);
      } else { halfRow = null; frag.appendChild(s); }
    }
    this._root.replaceChildren(frag);
    this._swapped = true;
    this._whens = whens;
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
          // where they are and when that was reported (the hero says it on tablets): one 64 px row
          if (t.person && h.states[t.person]) out.push({ kind: 'person', entity: t.person, located: true, row: true, phoneSpan: [2, 1] });
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
    // Home on a phone: the controls first — favourites and Lights, then the scenes (two to a row),
    // then weather (compact), camera, next event and air (they used to fill the first screen)
    const mi = this._config.page === 'home' ? page.sections.findIndex((x) => x.main) : -1;
    if (mi >= 0) {
      const main = page.sections[mi];
      const GLANCE = ['weather', 'camera', 'next_event', 'air'];
      const controls = main.tiles.filter((t) => !GLANCE.includes(t.kind));
      const glance = GLANCE.flatMap((k) => main.tiles.filter((t) => t.kind === k))
        .map((t) => (t.kind === 'weather' ? { ...t, compact: true, phoneSpan: [2, 3] } : t));
      const si = page.sections.findIndex((x) => x.scenes);
      const scenes = si >= 0 ? { ...page.sections[si], layout: undefined, tiles: page.sections[si].tiles.map((t) => ({ ...t, row: true })) } : null;
      const out = [];
      if (controls.some((t) => !t.editOnly) || this._editing) out.push({ ...main, tiles: controls });
      if (scenes) out.push(scenes);
      if (glance.length) out.push({ tiles: glance });
      page.sections = page.sections.flatMap((x, i) => (i === mi ? out : i === si ? [] : [x]));
    }
    if (page.greet) {
      const favs = phoneFavorites(h, this._model, cfg);
      if (favs.length) {
        page.sections.unshift({ title: 'Favourites', layout: 'favs', tiles: favs.map((id) => entTile(id, { areaName: this._model.areaById[entityArea(h, id)]?.name, showRoom: true })) });
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
    if (spec.hiddenEnt) return { actions: spec.hiddenEnt === 'pattern' ? [] : ['unhide'], onEdit };
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
      name = await hvPrompt(this, { title: 'Tile name', value: cur, placeholder: shortName(h, id, spec.areaName),
        hint: `Leave it empty for the automatic name (${shortName(h, id, spec.areaName)}).` });
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
          moved = true; this._dragGesture = true;   // a drag, not a page swipe
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

  /** Edit mode: drag tiles of one group (`data-sort`: fav | room:<area>) into a new order, then
   *  save it. Mouse: drag at once; touch: hold still a moment, then drag (a quick swipe scrolls). */
  _sortTiles(grid, grp) {
    const items = () => [...grid.querySelectorAll(`[data-sort="${grp}"]`)];
    for (const el of items()) {
      el.addEventListener('pointerdown', (e) => {
        if (e.button > 0 || e.composedPath().some((n) => n?.dataset?.edit !== undefined)) return;   // an edit button
        const before = items().map((x) => x.spec.entity).join();
        const x0 = e.clientX, y0 = e.clientY, touch = e.pointerType === 'touch';
        let active = !touch, moved = false;
        const hold = touch ? setTimeout(() => { active = true; el.classList.add('dragging'); if (navigator.vibrate) navigator.vibrate(10); }, 300) : null;
        const noScroll = (ev) => { if (active) ev.preventDefault(); };
        window.addEventListener('touchmove', noScroll, { passive: false });
        const move = (ev) => {
          const far = Math.hypot(ev.clientX - x0, ev.clientY - y0) > 8;
          if (!active) { if (far) end(); return; }   // touch: moved before the hold — a scroll
          if (!moved && !far) return;
          moved = true; this._dragging = true; this._dragGesture = true; el.classList.add('dragging');
          const over = items().find((x) => { if (x === el) return false; const r = x.getBoundingClientRect(); return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom; });
          if (over) { const r = over.getBoundingClientRect(); over.insertAdjacentElement(ev.clientX > r.left + r.width / 2 ? 'afterend' : 'beforebegin', el); }
        };
        const end = () => {
          clearTimeout(hold);
          window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end);
          window.removeEventListener('touchmove', noScroll);
          el.classList.remove('dragging'); this._dragging = false;
          const order = items().map((x) => x.spec.entity);
          if (moved && order.join() !== before) this._saveTileOrder(grp, order);
        };
        window.addEventListener('pointermove', move); window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
      });
    }
  }

  // a new order: Home's favourites, or a room's own list (entries not showing keep their place at the end)
  _saveTileOrder(grp, order) {
    return this._save((o) => {
      if (grp === 'fav') { o.home = o.home || {}; o.home.favorites = order; return; }
      const room = grp.slice(5);
      o.rooms = o.rooms || {};
      const rc = (o.rooms[room] = o.rooms[room] || {});
      const base = asList(rc.entities ?? this._model.areaById[room]?.pinned ?? order);
      rc.entities = [...order, ...base.filter((x) => !order.includes(x))];
    });
  }

  /** Edit mode: the Warnings pill's list — each warning's level and remove, + Add from any entity. */
  _warningsSheet() {
    const h = this._hass;
    const list = asList(this._config.options?.warnings).filter((w) => w && typeof w === 'object');
    const { sheet, close } = this._sheet('Warnings');
    sheet.classList.add('narrow');
    const rule = (w) => { const k = ALERT_RULES.find((x) => ruleIds(w, x).length), ids = k ? ruleIds(w, k).join(', ') : '';
      return { not_on: `when ${ids} isn't on`, on: `when ${ids} is on`, off: `when ${ids} is off`, all_off: `when ${ids} are all off`,
        none_on: `when none of ${ids} is on` }[k] || ''; };
    const save = (next) => { close(); this._save((o) => { o.warnings = next; if (!next.length) delete o.warnings; }); };
    sheet.insertAdjacentHTML('beforeend', `<p class="hint">The Warnings pill shows on Home while one of these is true; tap it for quick access to their devices.</p>
      <div style="display:flex;flex-direction:column;gap:8px">${list.map((w, i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:var(--hv-tile)">
          <span style="flex:1;min-width:0"><b style="display:block;font-weight:650">${esc(w.text || 'Warning')}</b>
            <span style="font-size:12px;color:var(--hv-fg2)">${esc(rule(w))}</span></span>
          <button class="txt" data-level="${i}" style="color:${w.level === 'notice' ? txVar('warn') : txVar('alert')}">${w.level === 'notice' ? 'Notice' : 'Critical'}</button>
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
    const used = new Set(list.flatMap((w) => ALERT_RULES.flatMap((k) => ruleIds(w, k))));
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
    // a gap ('|') moves with the chip after it
    const list = order.map((i) => chips[Number(i)]).filter(Boolean)
      .flatMap(({ gapBefore, ...c }, k) => { const e = Object.keys(c).length === 1 ? c.entity : c; return gapBefore && k ? ['|', e] : [e]; });
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
    const name = await hvPrompt(this, { title: room ? 'Room name' : 'Page title', value: page?.title || '',
      hint: room ? 'Leave it empty for the name in Home Assistant.' : 'Leave it empty for the automatic title.' });
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
    } else if (r.unreadable) {
      // the saved settings / edits couldn't be read (connection): saving now would overwrite them
      this._toast('Couldn\'t read your saved changes — nothing was changed. Try again.', 5000);
    } else {
      this._toast('');
      this._yamlSheet(r.config, true);
    }
    return r;
  }

  _toast(text, ms = 1600) {
    let t = this.shadowRoot.querySelector('.toast');
    if (!text) { t?.remove(); return; }
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); this.shadowRoot.appendChild(t); }
    t.textContent = text;
    clearTimeout(this._toastT);
    if (text !== 'Saving…') this._toastT = setTimeout(() => t.remove(), ms);
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
      `<button data-a="${a}" style="all:unset;cursor:pointer;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:14px;background:var(--hv-tile);font:15px ${FONT};color:${a === 'hide' || a === 'remove' ? txVar('alert') : 'var(--hv-fg)'}"><ha-icon icon="${EDIT_ICONS[a]}"></ha-icon>${esc(EDIT_TITLES[a])}</button>`).join('')}</div>`);
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
    const { sheet, close } = this._sheet(spec.addFav ? 'Add a favourite' : `Add to ${this._model.areaById[spec.room]?.name || 'this room'}`);
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
        if (spec.addFav) {   // Home's favourites (the automatic ones become a list of your own)
          return this._save((o) => {
            o.home = o.home || {};
            o.home.favorites = [...new Set([...asList(o.home.favorites ?? spec.roomIds), id])];
            o.exclude_entities = asList(o.exclude_entities).filter((x) => x !== id);
          });
        }
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
    // the settings as this dashboard shows them: a mirror's merged, a YAML dashboard's with its edits
    let draft;
    try { draft = await settingsDraft(h, this._config.options); } catch (e) {
      console.warn(e.message, e.cause);
      this._toast('Couldn\'t read the saved settings — try again.', 5000);
      return;
    }
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
    // location_stale_minutes: when a person's reported location counts as old (person tiles, a member's hero)
    if ((spec.kind === 'person' || (spec.kind === 'member_hero' && spec.person)) && spec.staleMin === undefined) {
      spec = { ...spec, staleMin: locationStaleMinutes(this._config.options) };
    }
    // customize: per-entity name / icon / size / tap from the config
    const cz = spec.entity && this._config.options?.customize?.[spec.entity];
    if (cz && ['entity', 'camera', 'person'].includes(spec.kind)) {
      spec = { ...spec, name: cz.name ?? spec.name, icon: cz.icon ?? spec.icon, icon_on: cz.icon_on ?? spec.icon_on, icon_off: cz.icon_off ?? spec.icon_off, color_on: cz.color_on ?? spec.color_on, color_off: cz.color_off ?? spec.color_off, tap: cz.tap ?? spec.tap, size: parseSize(cz.size, spec.size) };
    }
    // customize.<entity>.hold / tap: a page to open, wherever the entity's tile is
    if (cz && (cz.hold || cz.tap) && spec.kind !== 'room') spec = { ...spec, hold: spec.hold ?? cz.hold, tap: spec.tap ?? cz.tap };
    // customize.<entity>.confirm: ask wherever it's switched (confirmOf); a tile's own confirm: wins
    const czc = spec.kind === 'entity' ? cz?.confirm : spec.kind === 'button' && spec.toggle ? this._config.options?.customize?.[spec.toggle]?.confirm : undefined;
    if (czc !== undefined && spec.confirm === undefined) spec = { ...spec, confirm: czc };
    const t = document.createElement('homeview-tile');
    t._hvDark = !!this._dark;   // embedded HA cards render in the page's mode (cardHass)
    if (spec.hiddenEnt || spec.hiddenRoom) t.title = spec.hiddenEnt === 'pattern' ? 'Hidden by a pattern in exclude_entities' : 'Hidden — tap the eye to show it again';
    t.spec = spec;
    t.hass = this._hass;
    const edit = this._editFor(spec);
    if (edit) t.edit = edit;
    if (spec.hue !== undefined) t.setAttribute('style', this._pal ? hueStyle(spec.hue, this._dark, this._night) : hueStyle(spec.hue, dark));
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
        const avail = layoutHeight(cfg) - offset - top - pad;
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
      // the portrait board (date | clock, photo, up next | weather): a window taller than wide on a
      // touch screen or 600–999 px wide; a desktop window ≥ 1000 px keeps the landscape board
      board.classList.toggle('portrait', window.innerHeight > window.innerWidth && window.innerWidth >= 600 && !desktopTablet(cfg));
      // fill the screen below the page bar (a tall desktop window: a landscape tablet's height, the
      // board pinned to the top): measured once laid out (and again after a resize)
      requestAnimationFrame(() => {
        const top = board.getBoundingClientRect().top + (window.scrollY || 0);
        const pb = parseFloat(getComputedStyle(this._root).paddingBottom);
        const below = Number.isFinite(pb) ? pb : pad;   // 0 on Widgets (edge to edge) is a real value
        if (top >= 0 && board.isConnected) board.style.setProperty('--hv-board-h', `${Math.max(420, Math.round(layoutHeight(cfg) - top - below))}px`);
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
    // the camera wall (Cameras; tablets and browsers, 2–9 cameras): all of them on one screen, like
    // Apple's Home camera face — 1 to 3 columns, whichever gives the biggest pictures (landscape: ⌈√n⌉;
    // a portrait tablet: 2), rows sharing the height below the header, each 16 : 9, centred. More than
    // nine, or a phone: the usual grid that scrolls.
    for (const g of this._root.querySelectorAll('.grid.cams.fit')) {
      const n = g.childElementCount;
      const top = g.getBoundingClientRect().top + (window.scrollY || 0);   // where the wall starts on the screen
      let best = null;
      for (let c = 1; c <= Math.min(3, n); c++) {
        const r = Math.ceil(n / c);
        // down to the page's bottom padding (2 × pad: clear of the page dots)
        const th = Math.min((layoutHeight(cfg) - top - 2 * pad - gap * (r - 1)) / r, (w - 2 * pad - gap * (c - 1)) / c * 9 / 16);
        if (!best || th >= best.th) best = { c, th };
      }
      const c = best?.c || 1, th = best?.th || 0, tw = th * 16 / 9;
      const on = !phone && n >= 2 && n <= 9 && th >= 120;
      g.classList.toggle('fitted', on);
      g.style.gridTemplateColumns = on ? `repeat(${c}, ${Math.floor(tw)}px)` : '';
      g.style.gridAutoRows = on ? `${Math.floor(th)}px` : '';
    }
    this._cols = cols;
  }

  /** show_when: tiles and sections show / hide as their conditions change (with each header redraw, so
   *  once per frame of state updates; no rebuild). Edit mode shows them all, the hidden ones faded. */
  _applyWhens() {
    const ws = this._whens, h = this._hass;
    if (!ws?.length || !h) return;
    const editing = !!this._builtEditing;
    let changed = false;
    for (const w of ws) {
      let ok;
      try { ok = showWhen(h, w.c); } catch (e) { ok = true; }
      // a section whose conditional tiles are all hidden (and has no others) hides with them
      if (ok && w.grid && !editing) ok = [...w.grid.children].some((t) => t.style.display !== 'none');
      if (ok === w.ok) continue;
      w.ok = ok; changed = true;
      if (editing) w.el.style.opacity = ok ? '' : '0.45'; else w.el.style.display = ok ? '' : 'none';
    }
    // two half-width sections side by side: their row goes when both have
    if (changed && !editing) for (const row of this._root.querySelectorAll('.secrow')) row.style.display = [...row.children].some((x) => x.style.display !== 'none') ? '' : 'none';
  }

  _renderAlerts() {
    const el = this._alertsEl, h = this._hass;
    if (!el || !h) return;
    const list = pageAlerts(h, this._page?.alerts);
    const key = JSON.stringify(list);
    if (key === this._alertsKey) return;
    this._alertsKey = key;
    el.innerHTML = list.map((a) => `<div class="palert ${a.level}${a.offline ? ' offline' : ''}" role="${a.level === 'critical' ? 'alert' : 'status'}"><ha-icon icon="${a.offline ? 'mdi:lan-disconnect' : a.level === 'critical' ? 'mdi:alert-circle' : 'mdi:information'}"></ha-icon>${esc(a.text)}</div>`).join('');
  }

  _renderHead() {
    try { this._drawHead(); } catch (e) {
      this._headKey = null;
      if (this._headErr !== String(e)) { this._headErr = String(e); console.warn('HomeView: the page header couldn\'t be drawn', e); }
    }
  }

  _drawHead() {
    const h = this._hass, page = this._page, head = this._head;
    if (!h || !page || !head) return;
    this._renderAlerts();
    this._applyWhens();
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
        .filter((d) => d.show_when === undefined || showWhen(h, d.show_when))   // a pill's show_when (yours or a page's)
        .map((d, i) => [i, safePill(() => (d.pill ? PILLS[d.pill]?.(h, m, cfg, this) : d.entity || d.page ? entityPill(h, d) : null)), d]).filter(([, p]) => p)
      : [];
    this._pills = pills;
    // problems first on every screen, so they're never at the far end of the rows: red (act now), then
    // amber (needs a look), then the rest in their order; the Warnings pill first within its colour.
    // The pills wrap onto more lines (never a row that scrolls sideways: a sideways drag is a page
    // swipe). Edit mode keeps the saved order, to drag.
    const sev = (p, d) => (p.alert ? 0 : p.tone === 'warn' ? 2 : 4) - (d?.pill === 'warnings' ? 1 : 0);
    const shownPills = this._editing ? pills : [...pills].sort((a, b) => sev(a[1], a[2]) - sev(b[1], b[2]));
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
    const nav = !kiosk && !page.close ? asList(this._config.nav) : [];
    const here = this._config.path || this._config.page;
    const chips = asList(page.chips);
    const looks = chips.map((c) => chipLook(h, c));
    // hold the title: the page pages_config.<page>.hold (or a custom page's hold:) names — e.g. Home → settings
    const holdTo = editing ? null : pageLink(page.hold || cfg.pages_config?.[this._config.page]?.hold);
    const titleHold = holdTo && !(this._builtGuest && guestHidden(holdTo, cfg)) ? holdTo : null;   // not to a page guests don't get
    // Reload pages (edit mode, admins, every dashboard): a YAML dashboard re-reads its files
    // (homeview/custom_pages/), a UI dashboard its saved config
    const yamlDash = h.panels?.[dashboardPath() || 'lovelace']?.config?.mode === 'yaml';
    const canReload = !!h.user?.is_admin;
    // a room's page: its temperature · humidity by the title (in the key, or it never refreshed)
    const room = page.room;
    let roomSub = '';
    if (room) {
      const s = roomSummary(h, room);
      roomSub = [s.t !== null ? `${fmt(s.t, 1)}°` : null, s.hu !== null ? `${fmt(s.hu, 0)}%` : null].filter(Boolean).join(' · ');
    }
    const key = JSON.stringify([today, page.title, titleHold, yamlDash, editing, canEdit, updOn, stale, kiosk, here, roomSub, looks, chips.map((c) => h.states[c.entity]?.state), pills.map(([id, p]) => [id, p.text, p.alert, p.active, p.tone]), people.map((id) => h.states[id]?.state)]);
    this._renderDots(kiosk, here);
    this._renderFs();
    if (key === this._headKey) return;
    this._headKey = key;
    head.classList.toggle('ph', !!this._phone);
    head.classList.toggle('editing', !!editing);
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
    // phones: the chips and the people on one row (avatars right)
    const cprow = this._phone && chips.length && people.length;
    head.innerHTML = page.minimalHead ? `${topbar}${editbar}` : `${topbar}<div class="tblock">
        <div class="date">${esc(today)}</div>
        <div class="title">${menuBtn}${updBtn}<span class="tt"${titleHold || (canEdit && !editing) ? ' data-title' : ''}${titleHold ? ' data-title-hold' : ''}${canEdit && !editing ? ' title="Double-tap to edit"' : ''}>${esc(this._phone && page.greet && h.user?.name && !editing ? `Hi ${h.user.name.split(' ')[0]}` : page.title)}</span>${editing && canEdit ? '<button class="back hb" data-rename title="Rename this page" aria-label="Rename this page"><ha-icon icon="mdi:rename-outline"></ha-icon></button>' : ''}${roomSub ? `<span class="sub">${esc(roomSub)}</span>` : ''}${this._builtGuest ? '<button class="gchip" data-guest title="Guest view: person pages, cameras and calendars are hidden">Guest</button>' : ''}</div>
        ${cprow ? '<div class="cprow">' : ''}${chips.length ? `<div class="chips">${chips.map((c, i) => {
          const L = looks[i], st = h.states[c.entity];
          const icon = (isActive(st) ? c.icon_on : c.icon_off) || c.icon || L.icon;
          // a switch-like chip says whether it's on (aria-pressed); an offline one keeps its icon, badged
          const pressed = st && TOGGLES.includes(domainOf(c.entity)) && !L.offline ? ` aria-pressed="${isActive(st)}"` : '';
          // label: a short word on tablets ("Auto lights"), so a mode switch says what it is; the
          // chip's own word (Open, Offline …) takes its place while there is one
          const word = L.word ? `<b>${esc(L.word)}</b>` : c.label ? `<b class="cl">${esc(c.label)}</b>` : '';
          return `<button class="chp ${L.cls}${L.offline ? ' offline' : ''}${L.busy ? ' busy' : ''}${c.gapBefore ? ' gap' : ''}${c.label && !L.word ? ' lbl' : ''}" data-chip="${i}"${L.color ? ` style="color:${esc(L.color)}"` : ''} title="${esc(c.name || c.label || st?.attributes?.friendly_name || c.entity)}"${pressed}>
            <i data-e="${esc(c.entity)}"${icon ? ` data-i="${esc(icon)}"` : ''}></i>${L.offline ? OFFLINE_BADGE : ''}${word}</button>`;
        }).join('')}</div>` : ''}
        ${people.length ? `<div class="people">${people.map((id) => {
          const st = h.states[id]; if (!st) return '';
          const pic = avatarUrl(h, id), nm = st.attributes.friendly_name || id;
          // home: a green ring; away: faded, greyer, with a location pin (not by colour alone)
          const home = st.state === 'home', where = `${nm} · ${hassState(h, st)}`;
          return `<div class="avatar${home ? ' home' : ' away'}" data-more="${esc(id)}" title="${esc(where)}" role="button" tabindex="0" aria-label="${esc(where)}">${pic ? `<img src="${esc(pic)}" alt="">` : `<span class="al">${esc(nm.slice(0, 1).toUpperCase())}</span>`}${home ? '' : '<span class="aw" aria-hidden="true"><ha-icon icon="mdi:map-marker-outline"></ha-icon></span>'}</div>`;
        }).join('')}</div>` : ''}${cprow ? '</div>' : ''}
      </div>
      ${page.close ? '<button class="back xclose" data-close-page title="Close" aria-label="Close"><ha-icon icon="mdi:close"></ha-icon></button>' : ''}
      ${pills.length ? `<div class="pills">${shownPills.map(([id, p]) => `<button class="pill${p.alert ? ' alert' : p.tone ? ` t-${p.tone}` : p.active ? ' t-on' : ''}" data-pill="${id}"><i data-i="${esc(p.icon)}"></i><span class="pt">${esc(p.text)}</span>${p.popup ? '<ha-icon icon="mdi:chevron-right" style="--mdc-icon-size:15px;opacity:.6"></ha-icon>' : ''}</button>`).join('')}</div>` : ''}${editbar}`;
    head.querySelector('[data-close-page]')?.addEventListener('click', () => this._closePage());
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
    head.querySelector('[data-guest]')?.addEventListener('click', () => this._toast('Guest view: person pages, cameras and calendars are hidden', 3000));
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
    head.querySelectorAll('[data-more]').forEach((el) => {
      const go = () => moreInfo(this, el.dataset.more);
      el.addEventListener('click', go);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });   // an avatar is a button
    });
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

  /** A sheet of entity tiles. groups: [{ title, ids, tone: 'red' | 'amber' | 'offline' }] puts them
   *  under headings, tinted (the batteries: low in red, getting low in amber …); else one grid of ids. */
  _popup({ title, ids, showRoom, groups, clean }) {
    const h = this._hass;
    const pop = document.createElement('div'); pop.className = 'pop top';   // pill pop-ups: at the top
    const sheet = document.createElement('div'); sheet.className = 'sheet';
    sheet.innerHTML = `<div class="sheet-h">${esc(title)}<button class="back" data-close><ha-icon icon="mdi:close"></ha-icon></button></div>`;
    const TONE = {
      red: { bg: 'rgba(255,59,48,0.16)', border: 'rgba(255,59,48,0.6)', head: txVar('alert') },
      amber: { bg: 'rgba(255,149,0,0.14)', border: 'rgba(255,149,0,0.55)', head: txVar('warn') },
      // offline rows carry their own badge and word: an amber heading, untinted rows (not faded like "off")
      offline: { head: txVar('warn') },
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
        const t = this._tile(rowTile(id, { showRoom, areaName: room?.name, clean }), this._dark);
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

  /** The calendar sheet (openCalendar): the next calendar_days days of a calendar tile's calendars,
   *  with its filters, by day; in the pill pop-ups' style (at the top, the ✕ stays in view while the
   *  list scrolls). Its events are fetched now (getEvents' cache: a second open within 5 minutes is
   *  instant) and drawn again when they arrive. Esc, ✕ or a tap outside closes it. */
  _calendarSheet(s) {
    const cals = asList(s.calendars);
    if (!cals.length || this._guest) return;
    const days = calendarDays(this._config.options, s);
    const pop = document.createElement('div'); pop.className = 'pop top';
    const sheet = document.createElement('div'); sheet.className = 'sheet cal';
    const title = s.title || 'Up next';
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-label', title);
    sheet.innerHTML = `<div class="sheet-h"><span>${esc(title)}<span class="sheet-sub">${esc(days === 7 ? 'The next week' : days === 14 ? 'The next 2 weeks' : `The next ${days} days`)}</span></span><button class="back" data-close title="Close" aria-label="Close"><ha-icon icon="mdi:close"></ha-icon></button></div><div class="cal-body"></div>`;
    const body = sheet.querySelector('.cal-body');
    const colors = calendarColors(this._model, !!this._dark);
    // one function for this sheet (getEvents keeps it until its fetch is done)
    const draw = () => {
      if (!pop.isConnected || !this._hass) return;
      body.innerHTML = calendarSheetHtml(this._hass, filterEvents(getEvents(this._hass, cals, days, draw), s), s, { days, colors });
    };
    pop.appendChild(sheet);
    const close = () => { pop.remove(); window.removeEventListener('keydown', key, true); };
    // Esc closes it; once it's gone (a rebuild took it away) the key is left alone
    const key = (e) => { if (!pop.isConnected) { close(); return; } if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
    pop.addEventListener('click', (e) => { if (e.target === pop) close(); });
    sheet.querySelector('[data-close]').addEventListener('click', close);
    window.addEventListener('keydown', key, true);
    this._root.appendChild(pop);
    draw();
    sheet.querySelector('[data-close]').focus?.({ preventScroll: true });
  }

  /**
   * Full screen: page dots at the bottom (one per page in the swipe order, the current one a wider
   * pill in the accent), so it's clear there are other pages and where you are. Tap a dot: that page;
   * tap the current one (phones: anywhere on the row): the pages by name. On a page change the page's
   * name shows above the dots for 1.5 s; on Widgets they fade out after 5 s without a touch.
   * page_dots: false = none. With HA's sidebar (Menu) the page bar shows instead.
   */
  _renderDots(kiosk, here) {
    const cfg = this._config.options || {}, page = this._page || {};
    const order = asList(this._config.order);
    const show = !!kiosk && cfg.page_dots !== false && !page.close && order.length > 1 && order.includes(here);
    const key = show ? `${order.join(',')}|${here}|${!!this._phone}` : '';
    this._root.classList.toggle('has-dots', show);
    if (key === this._dotsKey && (!show || this._dotsEl?.isConnected)) return;
    this._dotsKey = key;
    this._dotsEl?.remove(); this._dotsEl = null;
    if (!show) return;
    const by = Object.fromEntries(asList(this._config.nav).map((v) => [v.path, v]));
    const name = (p) => by[p]?.title || p;
    const el = document.createElement('div');
    el.className = `dots${this._phone ? ' ph' : ''}`;
    el.innerHTML = `<div class="dnames" hidden>${order.map((p) => `<button class="nv${p === here ? ' on' : ''}" data-dot-go="${esc(p)}">${esc(name(p))}</button>`).join('')}</div>
      <div class="dname" aria-hidden="true">${esc(name(here))}</div>
      <div class="drow" role="tablist" aria-label="Pages">${order.map((p) => `<button class="dot${p === here ? ' on' : ''}" role="tab" aria-selected="${p === here}" aria-label="${esc(name(p))}" data-dot="${esc(p)}"></button>`).join('')}</div>`;
    const names = el.querySelector('.dnames');
    let shut = null;
    const openNames = (on) => { names.hidden = !on; el.classList.toggle('open', on); clearTimeout(shut); if (on) shut = setTimeout(() => openNames(false), 5000); };
    el.querySelectorAll('[data-dot]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const p = b.dataset.dot;
      if (this._phone || p === here) openNames(names.hidden); else navigate(p);
    }));
    el.querySelectorAll('[data-dot-go]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); openNames(false); if (b.dataset.dotGo !== here) navigate(b.dataset.dotGo); }));
    this._root.appendChild(el);
    this._dotsEl = el;
    // a new page: its name for a moment
    if (HomeViewPage._dotsAt !== here) {
      HomeViewPage._dotsAt = here;
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 1500);
    }
    this._dotsWake();
  }

  /**
   * Widgets: a small full-screen button, bottom right, as quiet as the page dots and fading with them
   * (fullscreenCapable: only where the browser can go full screen; gone while it is, back when it
   * leaves). Tap: the whole page full screen. fullscreen_button: false = none.
   */
  _renderFs() {
    const cfg = this._config?.options || {};
    const want = this._config?.page === 'widgets' && cfg.fullscreen_button !== false && !this._editing && fullscreenCapable() && !isFullscreen();
    if (!want) { this._fsEl?.remove(); this._fsEl = null; return; }
    if (this._fsEl?.isConnected) return;
    if (!HomeViewPage._fsWatch) {   // entering / leaving full screen (also with Esc, F11 or a swipe): the current page looks again
      HomeViewPage._fsWatch = true;
      const again = () => HomeViewPage._current?._renderFs?.();
      document.addEventListener('fullscreenchange', again);
      document.addEventListener('webkitfullscreenchange', again);
      fsQuery()?.addEventListener?.('change', again);
    }
    const b = document.createElement('button');
    b.className = 'fsb'; b.title = 'Full screen'; b.setAttribute('aria-label', 'Full screen');
    b.innerHTML = '<ha-icon icon="mdi:fullscreen"></ha-icon>';
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const el = document.documentElement, go = el.requestFullscreen || el.webkitRequestFullscreen;
      try { const p = go?.call(el); if (p?.catch) p.catch((err) => console.warn('HomeView: full screen refused', err)); } catch (err) { console.warn('HomeView: full screen refused', err); }
    });
    b.addEventListener('focus', () => this._dotsWake());
    this._root.appendChild(b);
    this._fsEl = b;
    this._dotsWake();
  }

  /** Widgets (the ambient face) on a tablet: the dots (and the full-screen button) fade out after 5 s
   *  without a touch; a touch brings them back. Phones keep them. */
  _dotsWake() {
    const els = [this._dotsEl, this._fsEl].filter(Boolean);
    clearTimeout(this._dotsIdleT);
    if (!els.length) return;
    els.forEach((el) => el.classList.remove('idle'));
    if (this._page?.minimalHead && !this._phone) {
      this._dotsIdleT = setTimeout(() => {
        for (const el of els) if ((el === this._dotsEl || el === this._fsEl) && !el.classList.contains('open')) el.classList.add('idle');
      }, 5000);
    }
  }

  /** start: the page this browser session opens on (phones: Home by default; see startPage). */
  _startPage() {
    if (HomeViewPage._startChecked) return;
    HomeViewPage._startChecked = true;
    const key = `homeview-started:${dashboardPath() || ''}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); } catch (e) { /* no storage: once per load */ }
    const order = asList(this._config?.order), here = this._config?.path || this._config?.page;
    if (!order.length || here !== order[0] || this._editing) return;   // a link to another page is kept
    // the address this session opened with (HomeView loads before Home Assistant turns the dashboard's
    // root into its first page): a page of this dashboard typed or linked (…/widgets) is kept too;
    // the root, or arriving from another panel (the sidebar), gets the start page
    const first = String(HomeViewPage._firstPath || '').split('/').filter(Boolean);
    const dash = location.pathname.split('/').filter(Boolean)[0];
    if (first[0] === dash && first.length > 1 && first[1] !== '0') return;
    const want = startPage(this._config.options || {}, (window.innerWidth || 1024) < 600);
    if (want && want !== here && order.includes(want)) navigate(want, true);
  }

  _go(step) {
    const order = this._config.order || [];
    const i = order.indexOf(this._config.path || this._config.page);
    if (i === -1 || order.length < 2) return;
    navigate(order[(i + step + order.length) % order.length]);
  }

  // swipe left / right between the top-level pages (tablets, phones); ← / → keys; Esc closes a
  // pop-up or room page
  _bindSwipe() {
    if (!HomeViewPage._keys) {   // one key listener for the whole dashboard
      HomeViewPage._keys = true;
      window.addEventListener('keydown', (e) => {
        if (e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented || !['ArrowLeft', 'ArrowRight', 'Escape'].includes(e.key)) return;
        const path = e.composedPath(), t = path[0];
        if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
        const pg = HomeViewPage._current;
        if (!pg || !pg.isConnected || pg._root.querySelector('.pop')) return;
        if (e.key === 'Escape') {
          // not while one of Home Assistant's dialogs (more-info …) has the key: Esc closes that
          if (pg._page?.close && !path.some((n) => /dialog/i.test(n?.localName || ''))) pg._closePage();
          return;
        }
        if (pg._config.options?.swipe === false) return;
        pg._go(e.key === 'ArrowRight' ? 1 : -1);
      });
    }
    // One gesture at a time. The end is heard on the page and on the element the finger went down
    // on: a tile or the header that redraws during the swipe takes that element out of the page,
    // and its touchend then never reaches the page (a lost swipe).
    let g = null;
    const end = (e) => {
      const s = g; g = null;
      const t = e.changedTouches?.[0];
      if (!s || !t || e.type === 'touchcancel') return;
      const cfg = this._config.options || {};
      const step = cfg.swipe === false || this._dragGesture ? 0 : swipeStep(s, { x: t.clientX, y: t.clientY, ts: e.timeStamp || performance.now() });
      if (step && !s.owns) this._go(step);
    };
    this.addEventListener('touchstart', (e) => {
      g = null;
      this._dragGesture = false;
      if (e.touches.length !== 1 || this._root.querySelector('.pop')) return;
      const t = e.touches[0], path = e.composedPath?.() || [];
      // something that scrolls sideways, a slider or a drag handle keeps the swipe; looked at now,
      // while it is still in the page (a redraw may take it out before the end)
      g = { x: t.clientX, y: t.clientY, ts: e.timeStamp || performance.now(), owns: ownsSideways(path, this) };
      const at = path[0];
      if (at && at !== this && at.addEventListener) {   // the same function: never added twice
        at.addEventListener('touchend', end, { passive: true });
        at.addEventListener('touchcancel', end, { passive: true });
      }
    }, { passive: true });
    this.addEventListener('touchend', end, { passive: true });
    this.addEventListener('touchcancel', end, { passive: true });
  }

  /** ✕ on a pop-up or room page (and Esc): back to where it was opened — the page HomeView opened
   *  it from (navigate() leaves its address in the history entry) — else to Home (or the first page). */
  _closePage() {
    if (history.state?.hvFrom && history.length > 1) { history.back(); return; }
    const order = asList(this._config.order);
    const to = this._page?.closeTo && order.includes(this._page.closeTo) ? this._page.closeTo : order.includes('home') ? 'home' : order[0] || 'home';
    navigate(to, true);
  }
}

/**
 * A finished touch as a page swipe: +1 (next page, finger moved left), −1 (previous) or 0. s / e:
 * { x, y, ts } at the start and the end; ts are the events' own time stamps (when the finger moved,
 * not when a busy page got round to handling it — a page busy for a moment used to drop swipes).
 * At least 80 px sideways, twice as far as up or down, within a second.
 */
function swipeStep(s, e) {
  const dx = e.x - s.x, dy = e.y - s.y;
  if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(dy) * 2 || e.ts - s.ts > 1000) return 0;
  return dx < 0 ? 1 : -1;
}

/**
 * The Widgets page's full-screen button: offered only where it does something. The browser has the
 * Fullscreen API (webkit's too: iPad Safari) and allows it; it isn't Fully Kiosk or another app's
 * built-in browser (window.fully, "Fully" in the UA, or an Android WebView: Fully without its
 * JavaScript interface sends the WebView's own UA, and the Companion app and kiosk apps have their
 * own full screen); not an iPhone (Safari has no Fullscreen API there); not a home-screen web app.
 * Checked once (fsQuery: whether the window is full screen now, live).
 */
let _fsCapable;
function fullscreenCapable(win = window, doc = document) {
  if (_fsCapable !== undefined && win === window) return _fsCapable;
  const el = doc?.documentElement, nav = win?.navigator || {}, ua = String(nav.userAgent || '');
  const enabled = doc?.fullscreenEnabled ?? doc?.webkitFullscreenEnabled;
  const mm = (q) => { try { return !!win.matchMedia?.(q)?.matches; } catch (e) { return false; } };
  const ok = !!(el && (el.requestFullscreen || el.webkitRequestFullscreen)) && enabled !== false
    && !win.fully && !/\bfully\b|fullykiosk/i.test(ua) && !/; wv\)/.test(ua) && !/iPhone|iPod/.test(ua)
    && !nav.standalone && !mm('(display-mode: standalone)');
  if (win === window) _fsCapable = ok;
  return ok;
}
let _fsQuery;
const fsQuery = () => (_fsQuery !== undefined ? _fsQuery : (_fsQuery = (() => { try { return window.matchMedia?.('(display-mode: fullscreen)') || null; } catch (e) { return null; } })()));
/** Full screen now: the page (the Fullscreen API) or the whole window (F11, a home-screen app's fullscreen mode). */
const isFullscreen = (doc = document) => !!(doc?.fullscreenElement || doc?.webkitFullscreenElement || fsQuery()?.matches);

/**
 * Something on a touch's path (from where it went down up to the page) that keeps a sideways drag
 * to itself: something that scrolls sideways and has more to show (a card's wide table, the page
 * bar), a slider, fader or drag handle (touch-action without pan-x), a range input.
 */
function ownsSideways(path, stop) {
  for (const n of path || []) {
    if (n === stop) break;
    if (!n || n.nodeType !== 1) continue;
    if (n.localName === 'input' && n.type === 'range') return true;
    const cs = getComputedStyle(n);
    const ta = cs.touchAction || 'auto';
    if (ta !== 'auto' && ta !== 'manipulation' && !ta.includes('pan-x')) return true;
    if (/auto|scroll/.test(cs.overflowX || '') && n.scrollWidth > n.clientWidth + 1) return true;
  }
  return false;
}
HomeViewPage._firstPath = typeof location !== 'undefined' ? location.pathname : '';   // see _startPage
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
  edit_button: ['Double-tap a page title to edit', 'Admins only. Off: no edit mode on the dashboard.'],
  update_notice: ['Tell me when a HomeView update is out', 'A banner for admins when HACS has a newer version.'],
  kiosk: ['Full screen (kiosk mode)', 'Hide Home Assistant\'s header and sidebar while HomeView is open. Each device can still switch it with the Menu chip.'],
  kiosk_chip: ['Show the Menu / Full screen chip', 'Turn off on a wall tablet so nobody leaves full screen by accident (?kiosk=off in the URL still works).'],
  slideshow: ['Photo folder', 'A media folder, e.g. media-source://media_source/local/Photos, or "samples". Empty = the first folder named Photos, Pictures, Slideshow … under Media, else sample photos.'],
  slideshow_interval: ['Change photo every'],
  slideshow_thumbnail: ['Smaller copy to try first (optional)', 'For NAS thumbnails, e.g. {dir}/.@__thumb/s800{name} on QNAP. Falls back to the full photo.'],
  camera: ['Camera instead of photos', 'The camera is on the Home page; set one here to show it on Widgets instead of the photos.'],
  chips: ['Control chips under the title', 'Round buttons that turn red when something needs attention. Empty = automatic (alarm, garage, locks, water valve). Icons / confirm per chip: YAML.'],
  favorites: ['Favourites', 'Tiles near the top of Home. Empty = automatic: two, doors first (locks, a garage door or gate), then the alarm and the thermostat.'],
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
  const live = favoritesAuto(h, m).filter((id) => !gone(h.states[id]));
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
    // patterns in exclude_entities (globs, filters) aren't entities for the picker: kept aside, put back on save
    if (Array.isArray(o.exclude_entities)) o.exclude_entities = o.exclude_entities.filter(isEntityId);
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
      To rename, resize, hide or pin a single tile, double-tap a page's title on the dashboard itself.
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
      const pats = asList(this._config.exclude_entities).filter((x) => !isEntityId(x));
      if (pats.length) config.exclude_entities = [...asList(config.exclude_entities).filter(isEntityId), ...pats];
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

// Building the dashboard again (regenerating) gives every page a new element: an open sheet closes,
// the scroll position is lost, and Home Assistant drops the other pages it kept and builds them again
// on the next visit. What the last build of each strategy config was made from: hvGenMemo.
const hvGenMemo = new WeakMap();   // strategy config → { input, sig, reg, n, held, asked }
// the pages read this (HomeViewPage._replacedSoon): a new dashboard is coming, so a page about to be
// replaced doesn't build itself first
const hvRegen = { at: 0, held: false };
const REG_KEYS = ['entities', 'devices', 'areas', 'floors'];
const viewsSig = (dash) => JSON.stringify(dash, (k, v) => (k === 'options' ? undefined : v));   // options: the same object
const hvBusy = () => !!HomeViewPage._current?._interacting?.();
// custom_pages (see custom_pages/README.md): subview: true = no place in the page bar, opened by
// a hold (or tap) that names it, with a back arrow; admin_only: true = only viewers who see
// every page (admins without an access rule, or access: all) — see allowed() below
function strategyPages(options) {
  const customs = customPages(options).filter((c) => !c.bad);
  const wanted = [...new Set(asList(options.pages || DEFAULT_PAGES).map((p) => PAGE_ALIASES[p] || p))]
    .filter((p) => PAGE_DEFS[p] || customs.some((c) => c.path === p));
  return { customs, wanted };
}

class HomeViewStrategy extends HTMLElement {
  static async generate(config, hass) {
    const input = await HomeViewStrategy._input(config, hass);
    const dash = HomeViewStrategy._views(input, hass);
    if (config && typeof config === 'object') hvGenMemo.set(config, { input, sig: viewsSig(dash), reg: regVersion(hass), n: hvStateCount(hass) });
    hvRegen.at = 0; hvRegen.held = false;
    return dash;
  }

  /**
   * Home Assistant (2026.7 and newer) asks this on every update whether to build the dashboard again;
   * without it, it rebuilds on every new registry object — also for a change HomeView doesn't read
   * (a label, a device's firmware version, a display precision). Yes only when the views would come out
   * different: what HomeView reads from the registries changed (regVersion) or entities came or
   * went, and the views built from the same settings differ (a room, a person's page, a name or an
   * icon in the page bar). A change inside a page is the page's own rebuild. Not while a sheet is open:
   * then on the first update after it closes. Yes once per change: Home Assistant builds 200 ms after
   * the last yes, so saying it on every update would put it off.
   */
  static shouldRegenerate(config, oldHass, newHass) {
    const memo = config && typeof config === 'object' ? hvGenMemo.get(config) : null;
    if (!memo || !newHass) return REG_KEYS.some((k) => oldHass?.[k] !== newHass?.[k]);   // not built here: Home Assistant's own rule
    if (memo.asked) {   // said yes: it builds in a moment, with a new memo (if it doesn't, look again)
      if (Date.now() - memo.asked < 5000) return false;
      memo.asked = 0; memo.reg = null;
    }
    if (memo.held && hvBusy()) return false;
    const reg = regVersion(newHass), n = hvStateCount(newHass);
    if (!memo.held && reg === memo.reg && n === memo.n) return false;
    memo.reg = reg; memo.n = n; memo.held = hvRegen.held = false;
    let sig = null;
    try { sig = viewsSig(HomeViewStrategy._views(memo.input, newHass)); } catch (e) { /* generate() shows what's wrong */ }
    if (sig === memo.sig) return false;
    if (hvBusy()) { memo.held = hvRegen.held = true; return false; }
    memo.asked = hvRegen.at = Date.now();
    return true;
  }

  /** The settings the dashboard runs with — what needs Home Assistant to answer: another dashboard's
   *  (from:), the on-screen edits, whether there are energy settings. */
  static async _input(config, hass) {
    let { type, ...options } = config || {};
    // from: <dashboard> — another dashboard's settings and pages, this one's own edits on top
    if (options.from) options = (await resolveFrom(hass, options)).merged;
    // a YAML dashboard: the settings changed in the UI (kept in "<dashboard>-edits") on top
    else if (isYamlDash(hass) && options.ui_edits !== false) options = applyEdits(options, await loadEdits(hass, undefined, true));
    let hasEnergy = false;
    if (strategyPages(options).wanted.includes('energy')) {
      const prefs = await energyPrefsNow(hass);   // the same cached read as the pages'
      hasEnergy = !!(prefs?.energy_sources?.length || prefs?.device_consumption?.length);
      if (options.energy) hasEnergy = true;
    }
    return { options, hasEnergy };
  }

  /** The views, from those settings and hass alone (no waiting), so shouldRegenerate can build them too. */
  static _views({ options, hasEnergy }, hass) {
    hvAvatarMode = options.avatars ?? 'samples';
    const m = sharedModel(hass, options);
    const { customs, wanted } = strategyPages(options);
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
  window.customCards.push({ type: 'homeview-page', name: 'HomeView page', description: 'One HomeView page (home, widgets, living, a person\'s page, a room\'s page, energy, cameras).' });
}

console.info(`%c HOMEVIEW %c ${HV_VERSION} `, 'color:#fff;background:#E07A2E;font-weight:700;border-radius:4px 0 0 4px;padding:2px 4px',
  'color:#E07A2E;background:#FBF1E6;font-weight:700;border-radius:0 4px 4px 0;padding:2px 4px');
