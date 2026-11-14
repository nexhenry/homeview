// 0.9.1 (unreleased): when a person's location was last reported — their tracker's last update — on
// their page, amber once it's old (a phone stuck on an old fix still says Home). Made-up people only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadHomeView, makeHass } from './harness.mjs';

const hv = await loadHomeView();
const ago = (min) => new Date(Date.now() - min * 60e3).toISOString();
// Zoe's phone last reported `min` minutes ago; the person entity itself was updated just now
function home({ min = 5, source = true, state = 'home' } = {}) {
  const h = makeHass({ extra: { 'device_tracker.zoe_phone': { state } } });
  h.states['device_tracker.zoe_phone'].last_updated = ago(min);
  const p = h.states['person.zoe'];
  h.states['person.zoe'] = { ...p, state, attributes: { ...p.attributes, ...(source ? { source: 'device_tracker.zoe_phone' } : {}) }, last_updated: ago(1), last_changed: ago(300) };
  return h;
}

test('location_stale_minutes: 60 by default, your number, false or 0 = never old', () => {
  assert.equal(hv.locationStaleMinutes({}), 60);
  assert.equal(hv.locationStaleMinutes(undefined), 60);
  assert.equal(hv.locationStaleMinutes({ location_stale_minutes: 15 }), 15);
  assert.equal(hv.locationStaleMinutes({ location_stale_minutes: false }), 0);
  assert.equal(hv.locationStaleMinutes({ location_stale_minutes: 0 }), 0);
  assert.equal(hv.locationStaleMinutes({ location_stale_minutes: 'soon' }), 60);
});

test('the tracker\'s last report, else the person\'s; "located …" while fresh, "location from …" once old', () => {
  const fresh = hv.personLocated(home({ min: 5 }), 'person.zoe');
  assert.equal(fresh.stale, false);
  assert.match(fresh.text, /^located \d{1,2}:\d\d\s?[AP]M$/);
  const hf = home({ min: 5 });
  assert.equal(hv.personLocated(hf, 'person.zoe').at.getTime(), new Date(hf.states['device_tracker.zoe_phone'].last_updated).getTime(), 'the tracker, not the person');
  const old = hv.personLocated(home({ min: 130 }), 'person.zoe');
  assert.equal(old.stale, true);
  assert.match(old.text, /^location from /);
  assert.equal(hv.personLocated(home({ min: 130 }), 'person.zoe', 0).stale, false, 'false: never old');
  assert.equal(hv.personLocated(home({ min: 130 }), 'person.zoe', 180).stale, false);
  // no source: the person's own update (1 minute ago here)
  assert.equal(hv.personLocated(home({ min: 600, source: false }), 'person.zoe').stale, false);
  // an older day
  const h = home(); const now = new Date(); const y = new Date(now); y.setDate(y.getDate() - 1); y.setHours(18, 40, 0, 0);
  h.states['device_tracker.zoe_phone'].last_updated = y.toISOString();
  assert.match(hv.personLocated(h, 'person.zoe', 60, now.getTime()).text, /^location from yesterday 6:40\sPM$/);
  assert.equal(hv.personLocated(makeHass(), 'person.nobody'), null);
});

test('a person\'s page: under Home, quietly when it was located; amber "location from" once old', () => {
  const s = { kind: 'member_hero', room: null, title: "Zoe's day", openings: [], person: 'person.zoe', staleMin: 60 };
  const fresh = hv.R.member_hero.html(home({ min: 5 }), s);
  assert.match(fresh, /class="pres home"><i><\/i>Home<\/span><span class="loc">located /);
  const old = hv.R.member_hero.html(home({ min: 130 }), s);
  assert.match(old, /<span class="loc stale">location from /);
  // the redraw key follows the tracker's report and the switch to old
  assert.notEqual(hv.R.member_hero.key(home({ min: 5 }), s), hv.R.member_hero.key(home({ min: 130 }), s));
  assert.match(hv.PAGE_CSS + hv.R.member_hero.html(home(), s), /located/);
});

test('person tiles elsewhere: how long they\'ve been there while fresh; the old location in amber; always on their own page (phones)', () => {
  const s = { kind: 'person', entity: 'person.zoe', staleMin: 60 };
  const fresh = hv.R.person.html(home({ min: 5 }), s);
  assert.doesNotMatch(fresh, /located|location from/);
  assert.match(fresh, /home · 5 h/i);
  const old = hv.R.person.html(home({ min: 130 }), s);
  assert.match(old, /home · <span style="color:var\(--hv-warn-tx, #FF9500\)">location from /i);
  assert.match(hv.R.person.html(home({ min: 5 }), { ...s, located: true }), /home · <span>located /i);
});

test('a person\'s page on a phone starts with their row (where, and when located); the threshold reaches the tiles', () => {
  const h = home({ min: 130 });
  const m = hv.buildModel(h, {});
  const mem = m.members.find((x) => x.person === 'person.zoe');
  assert.ok(mem, 'Zoe is a member (Bedroom Zoe)');
  const page = hv.PAGES.member(h, m, {}, { member: 'person.zoe' });
  const fake = { _config: { page: 'member', options: { location_stale_minutes: 240 } }, _model: m, _editing: false };
  hv.HomeViewPage.prototype._phonePage.call(fake, h, fake._config.options, page);
  const tiles = page.sections.flatMap((x) => x.tiles);
  const row = tiles.find((t) => t.kind === 'person');
  assert.ok(row && row.located && row.row && row.entity === 'person.zoe');
  assert.ok(tiles.indexOf(row) < tiles.findIndex((t) => t.kind === 'room'), 'before the room bar');
  // _tile hands the dashboard's threshold to the person row and the hero
  const P = hv.HomeViewPage.prototype;
  const made = P._tile.call({ _config: { options: { location_stale_minutes: 240 } }, _hass: h, _tiles: [], _editFor: () => null, _dark: false }, row, false);
  assert.equal(made.spec.staleMin, 240);
});
