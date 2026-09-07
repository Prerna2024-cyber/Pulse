import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { hasSeenWalkthrough, markWalkthroughSeen } from './walkthroughSeen.js';

// A stand-in for the browser store. The module reads the global at call time,
// so swapping it here is enough.
function useStore(impl) {
  globalThis.localStorage = impl;
}

const working = () => {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
    _map: map,
  };
};

// Safari private mode, blocked site data, some embedded webviews.
const throwing = () => ({
  getItem() { throw new DOMException('denied'); },
  setItem() { throw new DOMException('denied'); },
});

beforeEach(() => useStore(working()));

test('an unseen user is offered the walkthrough', () => {
  assert.equal(hasSeenWalkthrough('prerna'), false);
});

test('dismissal persists', () => {
  markWalkthroughSeen('prerna');
  assert.equal(hasSeenWalkthrough('prerna'), true);
});

// The core requirement: a returning user must never see it again.
test('a dismissal survives any number of later checks', () => {
  markWalkthroughSeen('prerna');
  for (let i = 0; i < 5; i += 1) assert.equal(hasSeenWalkthrough('prerna'), true);
});

// Two accounts sharing a browser are two people.
test('dismissal is per user, not per browser', () => {
  markWalkthroughSeen('prerna');
  assert.equal(hasSeenWalkthrough('someone-else'), false);
});

test('usernames are namespaced and versioned', () => {
  const store = working();
  useStore(store);
  markWalkthroughSeen('prerna');
  assert.deepEqual([...store._map.keys()], ['pulse.walkthrough.v1.prerna']);
});

// Failing towards showing it: treating an unreadable store as "already seen"
// would deny the walkthrough to exactly the users who can't remember it.
test('an unreadable store shows the walkthrough rather than hiding it', () => {
  useStore(throwing());
  assert.equal(hasSeenWalkthrough('prerna'), false);
});

test('an unwritable store does not throw into the click handler', () => {
  useStore(throwing());
  assert.doesNotThrow(() => markWalkthroughSeen('prerna'));
});

// localStorage is absent entirely in some webviews, not merely restricted.
test('a missing store is handled like a broken one', () => {
  delete globalThis.localStorage;
  assert.equal(hasSeenWalkthrough('prerna'), false);
  assert.doesNotThrow(() => markWalkthroughSeen('prerna'));
});
