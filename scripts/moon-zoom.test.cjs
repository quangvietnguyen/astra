const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { transformSync } = require('@babel/core');
const { code } = transformSync(fs.readFileSync(require.resolve('../src/utils/moonZoom.js'), 'utf8'), {
  configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
});
const loaded = { exports: {} };
new Function('module', 'exports', code)(loaded, loaded.exports);
const { getMoonZoomRange, clampMoonScale, createMoonPinchHandlers } = loaded.exports;
const touch = (id, x, y = 0) => ({ identifier: id, pageX: x, pageY: y });
const event = (...touches) => ({ nativeEvent: { touches } });

test('iPhone zoom covers 35–300 percent and respects the same bounds for every input method', () => {
  const range = getMoonZoomRange(true);
  assert.deepEqual(range, { min: 0.35, max: 3 });
  assert.equal(clampMoonScale(0.1, range), 0.35);
  assert.equal(clampMoonScale(5, range), 3);
  assert.equal(clampMoonScale(2.4, range), 2.4);
  assert.deepEqual(getMoonZoomRange(false), { min: 0.6, max: 1.6 });
});

test('two-finger spread enlarges, pinch shrinks, and the next gesture starts at the current zoom', () => {
  let scale = 1;
  const ends = [];
  const handlers = createMoonPinchHandlers({ getScale: () => scale, setScale: next => { scale = next; },
    getRange: () => getMoonZoomRange(true), onStart: () => {}, onEnd: changed => ends.push(changed) });
  const start = event(touch(1, 0), touch(2, 100));
  assert.equal(handlers.onStartShouldSetPanResponderCapture(event(touch(1, 0))), false);
  assert.equal(handlers.onStartShouldSetPanResponderCapture(start), true);
  handlers.onPanResponderGrant(start);
  handlers.onPanResponderMove(event(touch(1, 0), touch(2, 250)));
  assert.equal(scale, 2.5);
  handlers.onPanResponderMove(event(touch(1, 0), touch(2, 1000)));
  assert.equal(scale, 3);
  handlers.onPanResponderRelease();
  handlers.onPanResponderGrant(start);
  handlers.onPanResponderMove(event(touch(1, 0), touch(2, 50)));
  assert.equal(scale, 1.5);
  handlers.onPanResponderMove(event(touch(1, 0), touch(2, 2)));
  assert.equal(scale, 0.35);
  handlers.onPanResponderRelease();
  assert.deepEqual(ends, [true, true]);
});

test('lifting or replacing a finger does not jump or continue zooming with one finger', () => {
  let scale = 1;
  const handlers = createMoonPinchHandlers({ getScale: () => scale, setScale: next => { scale = next; },
    getRange: () => getMoonZoomRange(true), onStart: () => {}, onEnd: () => {} });
  handlers.onPanResponderGrant(event(touch(1, 0), touch(2, 100)));
  handlers.onPanResponderMove(event(touch(1, 0), touch(2, 150)));
  assert.equal(scale, 1.5);
  handlers.onPanResponderEnd(event(touch(1, 0)));
  handlers.onPanResponderMove(event(touch(1, 200)));
  assert.equal(scale, 1.5);
  handlers.onPanResponderStart(event(touch(1, 200), touch(3, 250)));
  handlers.onPanResponderMove(event(touch(1, 200), touch(3, 300)));
  assert.equal(scale, 3);
  handlers.onPanResponderTerminate();
  handlers.onPanResponderGrant(event(touch(4, 0), touch(5, 100)));
  handlers.onPanResponderMove(event(touch(4, 0), touch(5, 50)));
  assert.equal(scale, 1.5);
});
