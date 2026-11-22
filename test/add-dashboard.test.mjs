// HA's "Add dashboard" dialog lists window.customStrategies of type "dashboard": HomeView is there once,
// as custom:homeview, and the strategy element it names is defined.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadHomeView } from './harness.mjs';

await loadHomeView();

test('HomeView is offered in the Add dashboard dialog', () => {
  const list = (globalThis.window.customStrategies || []).filter((s) => s.strategyType === 'dashboard' && s.type === 'homeview');
  assert.equal(list.length, 1);
  assert.equal(list[0].name, 'HomeView');
  assert.ok(list[0].description.length > 20);
  assert.match(list[0].documentationURL, /^https:\/\/github\.com\/nexhenry\/homeview$/);
});

test('the strategy it names is defined', () => {
  assert.ok(customElements.get('ll-strategy-dashboard-homeview'));
});
