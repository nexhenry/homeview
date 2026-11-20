// 0.9.2 (unreleased): a sheet opened by a tap stays open. The tap opens it on pointerup; the browser then
// sends that touch's click to what's under the finger now — the new backdrop or ✕ — in a touch WebView
// (Fully Kiosk) up to ~0.5 s later. Only a press that went down on the backdrop / a button counts, and
// not in the first 600 ms; the keyboard (detail 0) still works. Made-up data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadHomeView, makeHass, El, tapIn } from './harness.mjs';

const hv = await loadHomeView();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function sheet() {
  let t = 0, closed = 0;
  const pop = new El('div'), x = new El('button'), row = new El('div');
  hv.sheetCloser(pop, () => { closed++; }, [x], () => t);
  return { pop, x, row, closed: () => closed, at: (ms) => { t = ms; } };
}
const press = (pop, ...path) => pop.fire('pointerdown', { composedPath: () => [...path, pop] });

test('the opening tap\'s late click (no press on the sheet) never closes it: on the backdrop or the ✕, early or late', () => {
  const s = sheet();
  s.at(100); s.pop.fire('click', { detail: 1 });
  s.at(520); s.pop.fire('click', { detail: 1 });   // a WebView's delayed click
  s.at(2000); s.pop.fire('click', { detail: 1 });
  s.at(520); s.x.fire('click', { detail: 1 });
  assert.equal(s.closed(), 0);
});

test('a press on the backdrop closes it once the first 600 ms are over; one that starts in the sheet (a drag) doesn\'t', () => {
  const s = sheet();
  s.at(300); press(s.pop); s.pop.fire('click', { detail: 1 });
  assert.equal(s.closed(), 0, 'too early');
  s.at(hv.SHEET_QUIET_MS + 50); press(s.pop, s.row); s.pop.fire('click', { target: s.pop, detail: 1 });
  assert.equal(s.closed(), 0, 'went down in the sheet');
  press(s.pop); s.pop.fire('click', { detail: 1 });
  assert.equal(s.closed(), 1);
});

test('the ✕: a press on it closes (after 600 ms); the keyboard (Enter / Space: detail 0) at once; not on the backdrop', () => {
  const s = sheet();
  s.at(200); s.x.fire('click', { detail: 0 });
  assert.equal(s.closed(), 1, 'keyboard');
  const k = sheet();
  k.at(200); k.pop.fire('click', { detail: 0 });
  assert.equal(k.closed(), 0, 'no keyboard click on a backdrop');
  const m = sheet();
  m.at(700); press(m.pop, m.x); m.x.fire('click', { detail: 1 });
  assert.equal(m.closed(), 1, 'a mouse or finger on the ✕');
});

test('"are you sure?": the opening tap\'s late click (~0.5 s, a WebView) can\'t press Unlock; a real tap on it can', async () => {
  const h = makeHass();
  h.states['lock.front_door'].state = 'locked';
  const made = [], create = document.createElement;
  document.createElement = (t) => { const e = new El(t); if (t === 'div') { e._q = { '[data-no]': new El('button'), '[data-yes]': new El('button') }; made.push(e); } return e; };
  const page = { _hvPage: true, _root: new El() }, tile = { getRootNode: () => ({ host: page }), dispatchEvent() {} };
  try {
    const p = hv.R.entity.action(h, { kind: 'entity', entity: 'lock.front_door', areaName: 'Entry' }, tile, 'tap');
    await sleep(5);
    const pop = made.find((e) => e.className === 'pop cf');
    await sleep(520);
    pop._q['[data-yes]'].fire('click', { detail: 1 });   // the late click lands on Unlock
    await sleep(150);
    assert.equal(h._sent.filter((m) => m.type === 'call_service').length, 0, 'not unlocked');
    tapIn(pop, pop._q['[data-yes]']);
    await p;
    assert.deepEqual(h._sent.filter((m) => m.type === 'call_service').map((c) => `${c.domain}.${c.service}`), ['lock.unlock']);
  } finally { document.createElement = create; }
});
