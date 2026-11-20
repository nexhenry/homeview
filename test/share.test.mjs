// 0.9.2 (unreleased): energy_share — a share of one statistic in another over the period of the
// page's energy date bar, from long-term statistics, fetched only when the period changes (or slowly
// while it includes now), never on a state update. Made-up statistics only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadHomeView, makeHass } from './harness.mjs';

const hv = await loadHomeView();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('the share: numerator ÷ denominator, invert = the rest; "—" when the denominator is about 0 or missing', () => {
  assert.deepEqual(hv.shareValue(0.6, 12, true), { value: 95, n: 0.6, d: 12 });
  assert.equal(hv.shareValue(3, 12, false).value, 25);
  assert.equal(hv.shareValue(0, 0, true).value, null);
  assert.equal(hv.shareValue(null, 12, true).value, null);
  assert.equal(hv.shareValue(5, 4, false).value, 100, 'clamped');
  assert.equal(hv.shareValue(undefined, 4, false), undefined, 'loading');
});

test('decimals: whole percent, one decimal where that would round to 100 % or 0 % without being it; yours wins', () => {
  assert.equal(hv.shareDecimals(96.2), 0);
  assert.equal(hv.shareDecimals(99.87), 1);   // a little grid use in a week: 99.9 %, not 100 %
  assert.equal(hv.shareDecimals(100), 0);
  assert.equal(hv.shareDecimals(0.3), 1);
  assert.equal(hv.shareDecimals(0), 0);
  assert.equal(hv.shareDecimals(96.2, 2), 2);
  assert.equal(hv.fmt(99.877, hv.shareDecimals(99.877)), '99.9');
});

test('severity as Home Assistant\'s gauge: the highest step reached', () => {
  const sev = { green: 90, yellow: 60, red: 0 };
  assert.equal(hv.severityTone(95, sev), 'ok');
  assert.equal(hv.severityTone(75, sev), 'warn');
  assert.equal(hv.severityTone(10, sev), 'alert');
  assert.equal(hv.severityTone(null, sev), null);
  assert.equal(hv.severityTone(50, undefined), null);
});

test('the period: the date bar\'s collection (collection_key, else this dashboard\'s, else the default); else today', () => {
  const start = new Date(2026, 10, 1), end = new Date(2026, 11, 1);
  const col = { subscribe() { return () => {}; }, start, end };
  const h = makeHass();
  h.connection['_energy_test-dash'] = col;   // the harness's dashboard is /test-dash
  assert.equal(hv.shareCollection(h, {}), col);
  assert.equal(hv.shareCollection(h, { collection_key: 'energy_other' }), null);
  h.connection._energy_other = col;
  assert.equal(hv.shareCollection(h, { collection_key: 'energy_other' }), col);
  delete h.connection['_energy_test-dash']; h.connection._energy = col;
  assert.equal(hv.shareCollection(h, {}), col);
  assert.deepEqual(hv.sharePeriod(col), { start, end, today: false });
  const t = hv.sharePeriod(null, new Date(2026, 10, 18, 15, 0));
  assert.equal(t.today, true);
  assert.equal(t.start.getHours(), 0);
  assert.equal(t.end.getTime() - t.start.getTime(), 86400e3);
});

test('the tile: totals from the statistics over the period, two reads per period, none on state updates, new ones when the period changes', async () => {
  const reads = [];
  const VALUES = { 'sensor.peak_grid_kwh': 0.6, 'sensor.peak_home_kwh': 12 };
  const h = makeHass({ extra: { 'sensor.peak_grid_kwh': { state: '0.6', attributes: { unit_of_measurement: 'kWh' } }, 'sensor.peak_home_kwh': { state: '12', attributes: { unit_of_measurement: 'kWh' } } },
    ws: (m) => { if (m.type === 'recorder/statistic_during_period') { reads.push([m.statistic_id, m.fixed_period.start_time, m.fixed_period.end_time]); return { change: VALUES[m.statistic_id] ?? null }; } return null; } });
  let listener = null, unsubs = 0;
  const col = { start: new Date(2026, 9, 1), end: new Date(2026, 9, 2), subscribe(f) { listener = f; return () => { unsubs++; }; } };
  h.connection['_energy_test-dash'] = col;
  const tile = { isConnected: true, refreshes: 0, refresher: () => {}, refresh() { this.refreshes++; } };
  const s = { kind: 'energy_share', name: 'Peak off-grid', numerator: 'sensor.peak_grid_kwh', denominator: 'sensor.peak_home_kwh', invert: true,
    severity: { green: 90, yellow: 60, red: 0 }, caption: 'Grid {numerator} of {denominator} {unit}' };
  assert.match(hv.R.energy_share.html(h, s, tile), /Loading…/);
  await sleep(10);
  const html = hv.R.energy_share.html(h, s, tile);
  assert.match(html, />95%</);
  assert.match(html, /Grid 0\.6 of 12\.0 kWh/);
  assert.match(html, /stroke-dasharray="95\.0 200"/);
  assert.equal(reads.length, 2);
  assert.equal(reads[0][1], col.start.toISOString());
  // a state update: same key, so the tile doesn't draw (and nothing is read)
  const k1 = hv.R.energy_share.key(h, s);
  h.states['sensor.peak_home_kwh'] = { ...h.states['sensor.peak_home_kwh'], state: '13' };
  assert.equal(hv.R.energy_share.key(h, s), k1);
  hv.R.energy_share.html(h, s, tile);
  assert.equal(reads.length, 2);
  // the date bar moves (the collection calls its subscribers): the tile redraws, two new reads
  col.start = new Date(2026, 9, 5); col.end = new Date(2026, 9, 12);
  listener({}); assert.equal(tile.refreshes, 1);
  assert.notEqual(hv.R.energy_share.key(h, s), k1);
  hv.R.energy_share.html(h, s, tile);
  await sleep(10);
  assert.equal(reads.length, 4);
  // one subscription for the tile, however often it draws
  assert.equal(unsubs, 0);
  // no peak hours in the period (Σ house use 0): "—"
  VALUES['sensor.peak_home_kwh'] = 0; col.start = new Date(2026, 9, 3); col.end = new Date(2026, 9, 5);
  hv.R.energy_share.html(h, s, tile); await sleep(10);
  assert.match(hv.R.energy_share.html(h, s, tile), />—<\/div>[\s\S]*Nothing in this period/);
});

test('the tile without a date bar: today, said so', async () => {
  const h = makeHass({ ws: (m) => (m.type === 'recorder/statistic_during_period' ? { change: 1 } : null) });
  const tile = { isConnected: true, refresher: () => {}, refresh() {} };
  const s = { kind: 'energy_share', name: 'Share', numerator: 'sensor.a', denominator: 'sensor.b' };
  hv.R.energy_share.html(h, s, tile); await sleep(10);
  assert.match(hv.R.energy_share.html(h, s, tile), /Share<span class="sb"[^>]*> · today<\/span>[\s\S]*>100%</);
  clearTimeout(tile._hvShareWait);
});
