/**
 * Browser-safe stub for `uvu/assert` (pulled in by micromark-extension-highlight-mark).
 * Avoids loading uvu/diff → kleur, which breaks in the Electron renderer bundle.
 */

function ok(value, message) {
  if (!value) {
    throw new Error(message || 'Assertion failed');
  }
}

function unreachable(message) {
  throw new Error(message || 'Unreachable');
}

function equal(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

module.exports = {
  ok,
  unreachable,
  equal,
  not: ok,
  is: ok,
  type: ok,
};
