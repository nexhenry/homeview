// 1.0.1: after installing, HomeView offers an admin to create the dashboard, once. A pretend Home Assistant
// answers the WebSocket messages (made-up dashboards only); nothing here talks to a real one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadHomeView, makeHass } from './harness.mjs';

const hv = await loadHomeView();

const WRITES = ['frontend/set_user_data', 'lovelace/dashboards/create', 'lovelace/config/save'];
const writes = (sent) => sent.filter((m) => WRITES.includes(m.type));
const asked = (sent) => sent.map((m) => (m.type === 'lovelace/config' ? `config:${m.url_path}` : m.type));
const notFound = () => ({ code: 'config_not_found', message: 'No config found.' });

// the stored answer, the dashboards (list) and their configs (by url_path; 'null' = the default one);
// fail: { <message type> | 'config:<url_path>': the error to answer with }
function home({ answer = null, dashboards = [], configs = {}, fail = {}, admin = true, panels = {}, reply = {}, keepLocal = false } = {}) {
  if (!keepLocal) localStorage.removeItem('homeview-offer-answered');   // what this browser remembers: a fresh one
  const state = { answer, dashboards, configs };
  const hass = makeHass({ admin, ws: async (m) => {
    const f = fail[m.type] ?? (m.type === 'lovelace/config' ? fail[`config:${m.url_path}`] : undefined);
    if (f) throw f;
    if (m.type in reply) return reply[m.type];
    switch (m.type) {
      case 'frontend/get_user_data': return { value: state.answer };
      case 'frontend/set_user_data': state.answer = m.value; return null;
      case 'lovelace/dashboards/list': return state.dashboards;
      case 'lovelace/config': if (String(m.url_path) in state.configs) return state.configs[m.url_path]; throw notFound();
      case 'lovelace/dashboards/create': state.dashboards.push({ url_path: m.url_path, mode: 'storage', title: m.title }); return { id: m.url_path, ...m };
      case 'lovelace/config/save': state.configs[m.url_path] = m.config; return null;
      default: return null;
    }
  } });
  hass.panels = panels;
  return { hass, state, sent: hass._sent };
}
const OTHER = () => ({
  dashboards: [{ url_path: 'dashboard-lights', mode: 'storage', title: 'Lights' }, { url_path: 'map', mode: 'storage', title: 'Map' },
    { url_path: 'wall-tablet', mode: 'yaml', title: 'Wall' }],
  configs: { 'dashboard-lights': { views: [{ cards: [] }] }, map: { strategy: { type: 'map' } }, 'wall-tablet': { views: [] } },
});

test('offered: an admin, no answer stored, no HomeView dashboard — reads only, nothing written', async () => {
  const { hass, sent } = home(OTHER());
  assert.equal(await hv.offerDecide(hass), 'offer');
  assert.deepEqual(asked(sent), ['frontend/get_user_data', 'lovelace/dashboards/list', 'config:dashboard-lights', 'config:map', 'config:wall-tablet', 'config:null']);
  assert.deepEqual(sent[0], { type: 'frontend/get_user_data', key: 'homeview_offer' });
  assert.deepEqual(writes(sent), []);
});

test('a dashboard with nothing saved yet (auto-generated) is not HomeView, not an error', async () => {
  const { hass, sent } = home({ dashboards: [{ url_path: 'dashboard-new', mode: 'storage' }], configs: {} });
  assert.equal(await hv.offerDecide(hass), 'offer');
  assert.deepEqual(asked(sent), ['frontend/get_user_data', 'lovelace/dashboards/list', 'config:dashboard-new', 'config:null']);
});

test('not offered to a non-admin, and nothing is even asked', async () => {
  const { hass, sent } = home({ ...OTHER(), admin: false });
  assert.equal(await hv.offerDecide(hass), 'not-admin');
  assert.deepEqual(sent, []);
});

test('not offered once answered (Not now, created, found): one read, nothing else', async () => {
  for (const answer of [{ state: 'dismissed', at: '2026-11-01T10:00:00Z' }, { state: 'created', url_path: 'dashboard-homeview' },
    { state: 'found' }, 'something else']) {
    const { hass, sent } = home({ ...OTHER(), answer });
    assert.equal(await hv.offerDecide(hass), 'answered', JSON.stringify(answer));
    assert.deepEqual(asked(sent), ['frontend/get_user_data']);
  }
});

test('"creating" from another screen holds the offer for 10 minutes; an older mark was left by a closed screen', async () => {
  let h = home({ ...OTHER(), answer: { state: 'creating', at: new Date(Date.now() - 60e3).toISOString() } });
  assert.equal(await hv.offerDecide(h.hass), 'answered');
  h = home({ ...OTHER(), answer: { state: 'creating', at: new Date(Date.now() - 11 * 60e3).toISOString() } });
  assert.equal(await hv.offerDecide(h.hass), 'offer');
  h = home({ ...OTHER(), answer: { state: 'creating' } });
  assert.equal(await hv.offerDecide(h.hass), 'offer', 'no time: stale');
});

test('a HomeView dashboard exists: not offered, "found" is remembered; dashboards named HomeView are read first', async () => {
  const o = OTHER();
  o.dashboards.push({ url_path: 'home-tablet', mode: 'storage', title: 'HomeView' });
  o.configs['home-tablet'] = { strategy: { type: 'custom:homeview', pages: ['home'] } };
  const { hass, state, sent } = home(o);
  assert.equal(await hv.offerDecide(hass), 'found');
  assert.deepEqual(asked(sent), ['frontend/get_user_data', 'lovelace/dashboards/list', 'config:home-tablet', 'frontend/set_user_data']);
  assert.equal(state.answer.state, 'found');
  assert.ok(Date.parse(state.answer.at) > 0);
});

test('a HomeView dashboard as the default one (url_path null), or a mirror (from:), counts', async () => {
  let o = OTHER(); o.configs.null = { strategy: { type: 'custom:homeview' } };
  assert.equal(await hv.offerDecide(home(o).hass), 'found');
  o = OTHER(); o.configs.map = { strategy: { type: 'custom:homeview', from: 'other-dash' } };
  assert.equal(await hv.offerDecide(home(o).hass), 'found');
  // the migrated default dashboard is listed as "lovelace": not read twice
  o = OTHER(); o.dashboards.push({ url_path: 'lovelace', mode: 'storage' });
  const h = home(o);
  assert.equal(await hv.offerDecide(h.hass), 'offer');
  assert.ok(!asked(h.sent).includes('config:null'));
  assert.ok(asked(h.sent).includes('config:lovelace'));
});

test('any doubt = no offer and nothing written: read errors and odd replies', async () => {
  const err = { code: 'unknown_error', message: 'boom' };
  const cases = [
    { fail: { 'frontend/get_user_data': err } },
    { fail: { 'lovelace/dashboards/list': err } },
    { fail: { 'config:wall-tablet': { code: 'home_assistant_error', message: 'YAML error' } } },
    { reply: { 'frontend/get_user_data': null } },
    { reply: { 'lovelace/dashboards/list': { dashboards: [] } } },
    { reply: { 'lovelace/config': 'views: []' } },
  ];
  for (const c of cases) {
    const { hass, sent } = home({ ...OTHER(), ...c });
    assert.equal(await hv.offerDecide(hass), 'error', JSON.stringify(c));
    assert.deepEqual(writes(sent), [], JSON.stringify(c));
  }
});

test('never from the dev build: the dev copy\'s type is custom:homeview-dev (dev-build.sh), and it asks nothing', async () => {
  const { hass, sent } = home(OTHER());
  assert.equal(await hv.offerDecide(hass, 'custom:homeview-dev'), 'dev');
  assert.deepEqual(sent, []);
  assert.equal(hv.OFFER_TYPE, 'custom:homeview');
  assert.equal(hv.offerIsDev(), false);
  // the same rename dev-build.sh makes turns the constant into the dev type
  const src = readFileSync(new URL('../dist/homeview.js', import.meta.url), 'utf8');
  const sh = readFileSync(new URL('../scripts/dev-build.sh', import.meta.url), 'utf8');
  assert.ok(sh.includes(`-e "s/'custom:homeview'/'custom:homeview-dev'/g"`));
  const line = src.split('\n').find((l) => l.startsWith('const OFFER_TYPE = '));
  const dev = line.replace(/'custom:homeview'/g, "'custom:homeview-dev'").match(/'([^']+)'/)[1];
  assert.equal(hv.offerIsDev(dev), true);
  // and the released file starts the offer at load, once per page
  assert.equal(globalThis.window.__homeviewOffer, true);
});

test('Create: the "creating" mark, the dashboard, its config, then "created" — with these payloads, in this order', async () => {
  const { hass, state, sent } = home(OTHER());
  const r = await hv.offerCreate(hass);
  assert.deepEqual(r, { url: 'dashboard-homeview' });
  assert.deepEqual(asked(sent), ['frontend/get_user_data', 'frontend/set_user_data', 'lovelace/dashboards/list', 'lovelace/dashboards/create',
    'lovelace/config/save', 'frontend/set_user_data']);
  const w = writes(sent);
  assert.equal(w[0].key, 'homeview_offer');
  assert.equal(w[0].value.state, 'creating');
  assert.deepEqual(w[1], { type: 'lovelace/dashboards/create', url_path: 'dashboard-homeview', title: 'HomeView', icon: 'mdi:home-variant',
    show_in_sidebar: true, require_admin: false, mode: 'storage' });
  assert.deepEqual(w[2], { type: 'lovelace/config/save', url_path: 'dashboard-homeview', config: { strategy: { type: 'custom:homeview' } } });
  assert.equal(w[3].key, 'homeview_offer');
  assert.equal(w[3].value.state, 'created');
  assert.equal(w[3].value.url_path, 'dashboard-homeview');
  assert.equal(state.answer.state, 'created');
  // and from now on: no offer
  assert.equal(await hv.offerDecide(hass), 'answered');
});

test('a taken address picks the next: dashboards and panels, and one taken while creating', async () => {
  assert.equal(hv.offerPath([]), 'dashboard-homeview');
  assert.equal(hv.offerPath(['dashboard-homeview', 'dashboard-homeview-2']), 'dashboard-homeview-3');
  const o = OTHER(); o.dashboards.push({ url_path: 'dashboard-homeview', mode: 'storage', title: 'Old' });
  let h = home({ ...o, panels: { 'dashboard-homeview-2': { component_name: 'iframe' } } });
  assert.deepEqual(await hv.offerCreate(h.hass), { url: 'dashboard-homeview-3' });
  assert.equal(writes(h.sent).find((m) => m.type === 'lovelace/config/save').url_path, 'dashboard-homeview-3');
  // another screen made dashboard-homeview between the list and the create
  let first = true;
  h = home(OTHER());
  const orig = h.hass.connection.sendMessagePromise;
  h.hass.connection.sendMessagePromise = async (m) => {
    if (m.type === 'lovelace/dashboards/create' && first) {
      first = false; h.sent.push(m);
      throw { code: 'home_assistant_error', message: 'The URL "dashboard-homeview" is already in use. Please choose a different one.', translation_key: 'url_already_exists' };
    }
    return orig(m);
  };
  assert.deepEqual(await hv.offerCreate(h.hass), { url: 'dashboard-homeview-2' });
  assert.deepEqual(h.sent.filter((m) => m.type === 'lovelace/dashboards/create').map((m) => m.url_path), ['dashboard-homeview', 'dashboard-homeview-2']);
});

test('Not now remembers "dismissed" for this user', async () => {
  const { hass, state, sent } = home(OTHER());
  await hv.offerDismiss(hass);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, 'frontend/set_user_data');
  assert.equal(sent[0].key, 'homeview_offer');
  assert.equal(state.answer.state, 'dismissed');
  assert.ok(Date.parse(state.answer.at) > 0);
  assert.equal(await hv.offerDecide(hass), 'answered');
});

test('a failure stores nothing (the "creating" mark is cleared) and a retry only saves the config', async () => {
  // saving the config fails after the dashboard was made
  const { hass, state, sent } = home({ ...OTHER(), fail: { 'lovelace/config/save': { code: 'unknown_error', message: 'Save failed' } } });
  await assert.rejects(hv.offerCreate(hass), (e) => e.message === 'Save failed' && e.made === 'dashboard-homeview' && e.code === 'unknown_error');
  assert.equal(state.answer, null, 'cleared: offered again on the next load');
  const ud = sent.filter((m) => m.type === 'frontend/set_user_data').map((m) => (m.value ? m.value.state : m.value));
  assert.deepEqual(ud, ['creating', null]);
  assert.equal(sent.at(-1).value, null);
  // the retry (Try again) with the address already made: no second dashboard
  const h2 = home({ dashboards: [...OTHER().dashboards, { url_path: 'dashboard-homeview', mode: 'storage' }], configs: OTHER().configs });
  assert.deepEqual(await hv.offerCreate(h2.hass, 'dashboard-homeview'), { url: 'dashboard-homeview' });
  assert.deepEqual(asked(h2.sent), ['frontend/get_user_data', 'frontend/set_user_data', 'lovelace/config/save', 'frontend/set_user_data']);
  // creating the dashboard fails (e.g. not allowed): nothing made, the mark cleared
  const h3 = home({ ...OTHER(), fail: { 'lovelace/dashboards/create': { code: 'unauthorized', message: 'Unauthorized' } } });
  await assert.rejects(hv.offerCreate(h3.hass), (e) => e.made === null && e.code === 'unauthorized');
  assert.equal(h3.state.answer, null);
  assert.ok(!h3.sent.some((m) => m.type === 'lovelace/config/save'));
});

test('once the answer is known this browser asks nothing more; another user, or a "creating" mark, still asks', async () => {
  let h = home({ ...OTHER(), answer: { state: 'dismissed', at: '2026-11-01T10:00:00Z' } });
  assert.equal(await hv.offerDecide(h.hass), 'answered');
  let again = home({ ...OTHER(), keepLocal: true });
  assert.equal(await hv.offerDecide(again.hass), 'answered');
  assert.deepEqual(again.sent, [], 'not even the read');
  const other = makeHass({ user: 'u-zoe', name: 'Zoe', ws: async (m) => {
    if (m.type === 'lovelace/config') throw notFound();
    return m.type === 'frontend/get_user_data' ? { value: null } : m.type === 'lovelace/dashboards/list' ? [] : null;
  } });
  assert.equal(await hv.offerDecide(other), 'offer', 'another user on the same browser');
  // a fresh "creating" isn't remembered (it's not an answer yet)
  h = home({ ...OTHER(), answer: { state: 'creating', at: new Date().toISOString() } });
  assert.equal(await hv.offerDecide(h.hass), 'answered');
  again = home({ ...OTHER(), keepLocal: true });
  assert.equal(await hv.offerDecide(again.hass), 'offer');
  // found, created and dismissed are remembered once stored
  const withHv = () => { const o = OTHER(); o.configs.map = { strategy: { type: 'custom:homeview' } }; return o; };
  for (const [what, o, run] of [['found', withHv(), (x) => hv.offerDecide(x)], ['created', OTHER(), (x) => hv.offerCreate(x)],
    ['dismissed', OTHER(), (x) => hv.offerDismiss(x)]]) {
    h = home(o);
    await run(h.hass);
    assert.equal(h.state.answer.state, what);
    again = home({ ...OTHER(), keepLocal: true });
    assert.equal(await hv.offerDecide(again.hass), 'answered', what);
    assert.deepEqual(again.sent, [], what);
  }
  // a failed write isn't remembered: asked again next time
  h = home({ ...OTHER(), fail: { 'frontend/set_user_data': { code: 'unknown_error', message: 'x' } } });
  await assert.rejects(hv.offerDismiss(h.hass));
  again = home({ ...OTHER(), keepLocal: true });
  assert.equal(await hv.offerDecide(again.hass), 'offer');
});

test('Create on a screen whose notice is out of date (answered on another screen meanwhile): nothing written', async () => {
  const { hass, sent } = home({ ...OTHER(), answer: { state: 'created', url_path: 'dashboard-homeview' } });
  assert.deepEqual(await hv.offerCreate(hass), { answered: { state: 'created', url_path: 'dashboard-homeview' } });
  assert.deepEqual(writes(sent), []);
});

test('not on kiosk screens: Fully Kiosk, ?kiosk / ?hide_header / ?hide_sidebar, or in a frame', () => {
  const ua = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/131.0 Safari/537.36';
  assert.equal(hv.offerScreenOk({ ua, search: '', framed: false }), true);
  assert.equal(hv.offerScreenOk({ ua: `${ua} Fully/1.54`, search: '', framed: false }), false);
  assert.equal(hv.offerScreenOk({ ua, search: '', framed: false, fully: {} }), false);
  assert.equal(hv.offerScreenOk({ ua, search: '?kiosk', framed: false }), false);
  assert.equal(hv.offerScreenOk({ ua, search: '?edit=1&hide_header', framed: false }), false);
  assert.equal(hv.offerScreenOk({ ua, search: '', framed: true }), false);
});

test('the notice: its words, two buttons, a region with a live text for screen readers; glass with solid fallbacks', () => {
  assert.equal(hv.OFFER_TITLE, 'Create a HomeView dashboard?');
  assert.equal(hv.OFFER_TEXT, 'An Apple Home-style dashboard for every room, person and device.');
  assert.equal(hv.OFFER_DOCS, 'https://github.com/nexhenry/homeview#create-the-dashboard');
  const html = hv.offerHtml(false);
  assert.match(html, /role="region" aria-labelledby="hvo-t" aria-describedby="hvo-d"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /role="alert"/);
  assert.match(html, /<button type="button" data-no>Not now<\/button><button type="button" class="go" data-yes>Create<\/button>/);
  assert.match(hv.offerHtml(true), /class="card dark"/);
  const css = hv.offerCss('#a0521a');
  for (const want of ['backdrop-filter:blur(20px)', '@supports not', 'prefers-reduced-transparency', 'prefers-contrast: more', 'forced-colors',
    'prefers-reduced-motion', ':host([hidden])', 'safe-area-inset-bottom', 'height:44px', ':focus-visible']) assert.ok(css.includes(want), want);
});

// last: it marks this module for good
test('a HomeView dashboard built in this browser counts: "found" without reading every dashboard', async () => {
  const gen = makeHass();
  await hv.HomeViewStrategy.generate({ type: 'custom:homeview' }, gen);
  assert.equal(hv.hvOfferSeen, true);
  const { hass, state, sent } = home(OTHER());
  assert.equal(await hv.offerDecide(hass), 'found');
  assert.deepEqual(asked(sent), ['frontend/get_user_data', 'frontend/set_user_data']);
  assert.equal(state.answer.state, 'found');
});
