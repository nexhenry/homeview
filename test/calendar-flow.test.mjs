// 0.9.1 (unreleased): the calendar sheet (tap a Next / Up next tile), the Widgets page's full-screen
// button, and Power Flow Card Plus's number format and outage. Made-up data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadHomeView, makeHass, El } from './harness.mjs';

const hv = await loadHomeView();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- the calendar sheet --------------------------------------------------------------------------
const NOW = new Date(2026, 10, 13, 10, 0);   // Fri, Nov 13 2026, 10:00 (local)
const at = (d, h = 0, m = 0) => { const x = new Date(NOW); x.setDate(x.getDate() + d); x.setHours(h, m, 0, 0); return x; };
const ev = (summary, start, end, cal = 'calendar.family', extra = {}) => ({ summary, startD: start, endD: end, allDay: false, calendar: cal, ...extra });
const allDay = (summary, d, days = 1, cal = 'calendar.family') => ({ summary, startD: at(d), endD: at(d + days), allDay: true, calendar: cal });

test('calendar_days: 30 by default, a number of your own, false / 0 = no sheet; never fewer days than the tile looks ahead', () => {
  assert.equal(hv.calendarDays({}, {}), 30);
  assert.equal(hv.calendarDays(undefined, { days: 14 }), 30);
  assert.equal(hv.calendarDays({ calendar_days: 10 }, {}), 10);
  assert.equal(hv.calendarDays({ calendar_days: 10 }, { days: 14 }), 14);
  assert.equal(hv.calendarDays({ calendar_days: 60 }, { days: 120 }), 120);
  assert.equal(hv.calendarDays({ calendar_days: false }, {}), 0);
  assert.equal(hv.calendarDays({ calendar_days: 0 }, {}), 0);
  assert.equal(hv.calendarDays({ calendar_days: 'abc' }, {}), 30);
  assert.equal(hv.calendarDays({ calendar_days: 9999 }, {}), 366);
});

test('the sheet lists the events by day: Today (with one under way since yesterday), Tomorrow, then the date', () => {
  const h = makeHass();
  const evs = [
    ev('Night shift', at(-1, 22), at(0, 11)),                     // since yesterday, still on
    allDay('Book fair', 0, 3),                                    // three days from today
    ev('Dentist', at(0, 15), at(0, 16, 30), 'calendar.family', { location: 'Main St' }),
    ev('Swim', at(1, 9), at(1, 10)),
    allDay('Holiday', 5),
  ];
  const html = hv.calendarSheetHtml(h, evs, {}, { days: 30, now: NOW });
  const heads = [...html.matchAll(/class="pop-sec cal-day">([^<]+)</g)].map((m) => m[1]);
  assert.equal(heads.length, 3);
  assert.deepEqual(heads.slice(0, 2), ['Today', 'Tomorrow']);
  assert.match(heads[2], /Wednesday/);
  // one list per day; the one under way says Now and until when; all-day events say so and how long
  assert.equal((html.match(/class="cal-list"/g) || []).length, 3);
  assert.match(html, /Night shift<\/b><span>until 11:00\sAM<\/span>.*?Now</s);
  assert.match(html, /Book fair<\/b><span>until Sun, Nov 15 · 3 days<\/span>.*?All day/s);
  assert.match(html, /Dentist<\/b><span>until 4:30\sPM · Main St<\/span>.*?3:00\sPM/s);
  assert.doesNotMatch(html, /Holiday<\/b><span>/);   // a one-day all-day event: no line under it
  // one calendar: no calendar names in the rows
  assert.doesNotMatch(html, /Family ·/);
});

test('the sheet: loading, nothing in the days, the tile\'s filters and strip, several calendars by name and colour', () => {
  const h = makeHass({ extra: { 'calendar.zoe': { state: 'off', attributes: { friendly_name: 'Zoe' } } } });
  assert.match(hv.calendarSheetHtml(h, undefined, {}, { days: 30 }), /Loading…/);
  assert.match(hv.calendarSheetHtml(h, [], {}, { days: 30 }), /Nothing in the next 30 days/);
  assert.match(hv.calendarSheetHtml(h, [], {}, { days: 14 }), /Nothing in the next 2 weeks/);
  // an event that ended since the (5-minute) cache was filled isn't listed
  assert.match(hv.calendarSheetHtml(h, [ev('Done', at(0, 8), at(0, 9))], {}, { days: 30, now: NOW }), /Nothing in the next 30 days/);
  const evs = [ev('Piano - No School', at(0, 15), at(0, 16), 'calendar.zoe'), ev('Soccer', at(0, 17), at(0, 18), 'calendar.shared'),
    allDay('Break - No School', 2, 1, 'calendar.zoe')];
  const s = { match: 'no school', strip: ' - No School' };
  const html = hv.calendarSheetHtml(h, hv.filterEvents(evs, s), s, { days: 30, now: NOW, colors: { 'calendar.zoe': 'hsl(200 78% 50%)' } });
  assert.doesNotMatch(html, /Soccer/);
  assert.match(html, /<b>Piano<\/b>/);
  assert.match(html, /<b>Break<\/b>/);
  const both = hv.calendarSheetHtml(h, evs, {}, { days: 30, now: NOW, colors: { 'calendar.zoe': 'hsl(200 78% 50%)' } });
  assert.match(both, /background:hsl\(200 78% 50%\)"><\/span>\s*<span class="cal-t"><b>Piano - No School<\/b><span>Zoe ·/);
  assert.match(both, /background:var\(--hv-accent\)"><\/span>\s*<span class="cal-t"><b>Soccer<\/b><span>Family ·/);
});

test('member colours: a member\'s calendars in their room\'s colour (light / dark), a shared one keeps the accent', () => {
  const m = { members: [{ calendars: ['calendar.zoe', 'calendar.shared'], hue: 200 }, { calendars: ['calendar.mia', 'calendar.shared'], hue: 20 }] };
  assert.deepEqual(hv.calendarColors(m, false), { 'calendar.zoe': 'hsl(200 78% 50%)', 'calendar.mia': 'hsl(20 78% 50%)' });
  assert.deepEqual(hv.calendarColors(m, true), { 'calendar.zoe': 'hsl(200 82% 62%)', 'calendar.mia': 'hsl(20 82% 62%)' });
  assert.deepEqual(hv.calendarColors({}, false), {});
});

test('a tap opens the sheet; a hold, tap: more-info or calendar_days: false open Home Assistant\'s dialog; guests get nothing', () => {
  const opened = [], info = [];
  const page = { _hvPage: true, _config: { options: {} }, _calendarSheet: (s) => opened.push(s) };
  const tile = new El('homeview-tile');
  tile.getRootNode = () => ({ host: page });
  tile.dispatchEvent = (e) => { info.push(e.detail?.entityId); return true; };
  const s = { kind: 'next_event', calendars: ['calendar.shared'] };
  hv.openCalendar(tile, s, 'tap');
  assert.equal(opened.length, 1);
  hv.openCalendar(tile, s, 'hold');
  hv.openCalendar(tile, { ...s, tap: 'more-info' }, 'tap');
  page._config.options = { calendar_days: false };
  hv.openCalendar(tile, s, 'tap');
  assert.equal(opened.length, 1);
  assert.deepEqual(info, ['calendar.shared', 'calendar.shared', 'calendar.shared']);
  page._config.options = {}; page._guest = true;
  hv.openCalendar(tile, s, 'tap');
  assert.equal(opened.length, 1);
  assert.equal(info.length, 3);
  // the agenda: the Widgets board's Up next opens it, a list (layout: list) is no button
  assert.equal(hv.R.agenda.acts({ bare: true }), true);
  assert.equal(hv.R.agenda.acts({ layout: 'list' }), false);
  assert.equal(hv.R.agenda.action(null, { layout: 'list', calendars: ['calendar.shared'] }, tile, 'tap'), null);
});

test('the sheet\'s days are fetched once (when it opens) and then come from the cache', async () => {
  let calls = 0;
  const h = makeHass();
  h.callApi = async (method, path) => { calls++; assert.match(path, /^calendars\/calendar\.shared\?start=/); return [{ summary: 'Swim', start: { dateTime: at(1, 9).toISOString() }, end: { dateTime: at(1, 10).toISOString() } }]; };
  let done = 0;
  const cb = () => { done++; };
  assert.equal(hv.getEvents(h, ['calendar.shared'], 31, cb), undefined);
  await sleep(10);
  assert.equal(done, 1);
  const evs = hv.getEvents(h, ['calendar.shared'], 31, cb);
  assert.equal(evs.length, 1);
  assert.equal(calls, 1);
});

// ---- the full-screen button --------------------------------------------------------------------------
const doc = (o = {}) => ({ documentElement: { requestFullscreen() {} }, fullscreenEnabled: true, ...o });
const win = (ua, o = {}) => ({ navigator: { userAgent: ua, ...(o.nav || {}) }, matchMedia: (q) => ({ matches: !!o.media?.[q] }), ...(o.win || {}) });
const UA = {
  chrome: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  webview: 'Mozilla/5.0 (Linux; Android 14; Pixel Tablet Build/X; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.0.0 Safari/537.36',
  tabChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};
test('full-screen button: offered in a browser that can go full screen (webkit\'s API too); not on an iPhone, in Fully Kiosk or a WebView app, or as a home-screen app', () => {
  assert.equal(hv.fullscreenCapable(win(UA.chrome), doc()), true);
  assert.equal(hv.fullscreenCapable(win(UA.tabChrome), doc()), true);
  assert.equal(hv.fullscreenCapable(win(UA.ipad), doc({ documentElement: { webkitRequestFullscreen() {} }, fullscreenEnabled: undefined, webkitFullscreenEnabled: true })), true);
  assert.equal(hv.fullscreenCapable(win(UA.iphone), doc()), false);
  assert.equal(hv.fullscreenCapable(win(UA.chrome), doc({ documentElement: {} })), false);
  assert.equal(hv.fullscreenCapable(win(UA.chrome), doc({ fullscreenEnabled: false })), false);
  assert.equal(hv.fullscreenCapable(win(UA.tabChrome, { win: { fully: {} } }), doc()), false);
  assert.equal(hv.fullscreenCapable(win(`${UA.tabChrome} FullyKiosk/1.61`), doc()), false);
  assert.equal(hv.fullscreenCapable(win(UA.webview), doc()), false);
  assert.equal(hv.fullscreenCapable(win(UA.ipad, { nav: { standalone: true } }), doc()), false);
  assert.equal(hv.fullscreenCapable(win(UA.chrome, { media: { '(display-mode: standalone)': true } }), doc()), false);
  assert.equal(hv.isFullscreen({ fullscreenElement: {} }), true);
  assert.equal(hv.isFullscreen({ webkitFullscreenElement: {} }), true);
  assert.equal(hv.isFullscreen({}), false);
});

// ---- Power Flow Card Plus ------------------------------------------------------------------------------
const ENTS = { grid: { entity: 'sensor.grid_power' }, home: { entity: 'sensor.home_power', override_state: true } };
const GRID = { entity: 'sensor.grid_status' };
test('flow card: HomeView\'s number format under the card\'s current and old names ("3.0 kW"), no outage while the grid is up', () => {
  const c = hv.flowCardConfig(ENTS, {}, GRID, null);
  assert.equal(c.type, 'custom:power-flow-card-plus');
  assert.equal(c.keep_trailing_zeros, true);
  assert.deepEqual([c.base_decimals, c.kilo_decimals, c.kilo_threshold], [0, 1, 1000]);
  assert.deepEqual([c.w_decimals, c.kw_decimals, c.watt_threshold], [0, 1, 1000]);
  assert.equal(c.entities.grid.power_outage, undefined);
  assert.equal(c.entities.grid.entity, 'sensor.grid_power');
  // HomeView's own number: one decimal, the zero kept
  assert.equal(hv.fmt(3, 1), '3.0');
});

test('flow card: while the grid reads down, the outage on the state the entity is in, in HomeView\'s red', () => {
  const c = hv.flowCardConfig(ENTS, {}, GRID, 'Inactive');
  assert.deepEqual(c.entities.grid.power_outage, { entity: 'sensor.grid_status', state_alert: 'Inactive', label_alert: 'Grid down',
    icon_alert: 'mdi:transmission-tower-off', color_alert: 'var(--hv-alert-tx, #FF3B30)' });
  assert.equal(ENTS.grid.power_outage, undefined);   // the page's entities aren't changed
  // no grid circle or no grid-status entity: no outage
  assert.equal(hv.flowCardConfig({ home: {} }, {}, GRID, 'Inactive').entities.grid, undefined);
  assert.equal(hv.flowCardConfig(ENTS, {}, null, 'Inactive').entities.grid.power_outage, undefined);
});

test('flowOutage follows the outage list\'s reading: Active / Inactive in any case, an up list, a binary sensor, unknown', () => {
  const h = (state, id = 'sensor.grid_status', attrs = {}) => makeHass({ extra: { [id]: { state, attributes: attrs } } });
  assert.equal(hv.flowOutage(h('Active'), GRID), null);
  assert.equal(hv.flowOutage(h('Inactive'), GRID), 'Inactive');
  assert.equal(hv.flowOutage(h('Islanded'), GRID), 'Islanded');
  assert.equal(hv.flowOutage(h('unavailable'), GRID), null);
  assert.equal(hv.flowOutage(h('Transition'), GRID), null);
  assert.equal(hv.flowOutage(h('Transition'), { ...GRID, up: ['Active'] }), 'Transition');
  assert.equal(hv.flowOutage(h('on', 'binary_sensor.grid_connected'), { entity: 'binary_sensor.grid_connected' }), null);
  assert.equal(hv.flowOutage(h('off', 'binary_sensor.grid_connected'), { entity: 'binary_sensor.grid_connected' }), 'off');
  assert.equal(hv.flowOutage(h('on', 'binary_sensor.grid_outage', { device_class: 'problem' }), { entity: 'binary_sensor.grid_outage' }), 'on');
  assert.equal(hv.flowOutage(h('Active'), null), null);
});

test('flow_card_options: laid over block by block, null removes, your own power_outage is passed as it is, either name of a renamed setting', () => {
  const lab = hv.flowCardConfig(ENTS, { flow_card_options: { entities: { grid: { power_outage: { label_alert: 'Outage' } } } } }, GRID, 'off_grid');
  assert.equal(lab.entities.grid.power_outage.label_alert, 'Outage');
  assert.equal(lab.entities.grid.power_outage.state_alert, 'off_grid');
  assert.equal(lab.entities.home.entity, 'sensor.home_power');   // the rest of entities stays
  assert.equal(hv.flowCardConfig(ENTS, { flow_card_options: { entities: { grid: { power_outage: { label_alert: 'Outage' } } } } }, GRID, null).entities.grid.power_outage?.state_alert, undefined);
  const off = hv.flowCardConfig(ENTS, { flow_card_options: { keep_trailing_zeros: false, entities: { grid: { power_outage: null } } } }, GRID, 'off_grid');
  assert.equal(off.keep_trailing_zeros, false);
  assert.equal('power_outage' in off.entities.grid, false);
  const own = hv.flowCardConfig(ENTS, { flow_card_options: { entities: { grid: { power_outage: { entity: 'binary_sensor.mains', state_alert: 'off' } } } } }, GRID, null);
  assert.equal(own.entities.grid.power_outage.entity, 'binary_sensor.mains');
  assert.equal(own.entities.grid.power_outage.state_alert, 'off');
  const gone = hv.flowCardConfig(ENTS, { flow_card_options: { kw_decimals: null } }, GRID, null);
  assert.equal('kw_decimals' in gone || 'kilo_decimals' in gone, false);
  const old = hv.flowCardConfig(ENTS, { flow_card_options: { kw_decimals: 2, base_decimals: 1 } }, GRID, null);
  assert.deepEqual([old.kilo_decimals, old.kw_decimals, old.base_decimals, old.w_decimals], [2, 2, 1, 1]);
  assert.deepEqual(hv.mergeOpts({ a: { b: 1, c: [1] }, d: 1 }, { a: { c: [2], e: null }, d: null, f: { g: 1 } }), { a: { b: 1, c: [2] }, f: { g: 1 } });
});

test('the card tile gives the card new settings only when cardFor\'s settings change (the outage comes and goes)', () => {
  const T = hv.HomeViewTile;
  const tile = new T();
  const seen = [];
  const card = { localName: 'power-flow-card-plus', setConfig: (c) => seen.push(c), set hass(v) { this._h = v; } };
  let alert = null;
  const a = { n: 1 }, b = { n: 2 };
  tile._spec = { kind: 'card', card: a, cardFor: () => (alert ? b : a) };
  tile._hass = makeHass();
  tile._card = card; tile._cardConf = a;
  tile._renderCard();
  assert.equal(seen.length, 0);
  alert = 'Inactive'; tile._renderCard(); tile._renderCard();
  assert.deepEqual(seen, [b]);
  alert = null; tile._renderCard();
  assert.deepEqual(seen, [b, a]);
  clearTimeout(tile._pulseT);
});
