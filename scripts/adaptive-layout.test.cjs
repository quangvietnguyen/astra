const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { transformSync } = require('@babel/core');
const { code } = transformSync(fs.readFileSync(require.resolve('../src/utils/adaptiveLayout.js'), 'utf8'), {
  configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
});
const loaded = { exports: {} };
new Function('module', 'exports', code)(loaded, loaded.exports);
const { getObserverLayout, getTimelineOffset } = loaded.exports;

test('Moon halo and timeline fit the usable window across outer, inner, rotated and split windows', () => {
  const cases = [
    [320, 740, { top: 54, bottom: 34 }],
    [402, 874, { top: 62, bottom: 34, right: 84 }],
    [800, 720, { top: 24, bottom: 24, right: 84 }],
    [720, 800, { top: 24, bottom: 24, left: 84 }],
    [874, 402, { left: 62, right: 34, bottom: 21 }],
    [469, 720, { left: 84, bottom: 24 }],
    [1366, 1024, { top: 24, bottom: 20 }],
  ];
  for (const [width, height, insets] of cases) {
    for (const visible of [true, false]) {
      const l = getObserverLayout(width, height, insets, 180, visible);
      assert.ok(l.panelWidth > 0 && l.panelWidth <= l.safeWidth - 2 * l.gutter);
      const pixelsPerUnit = l.safeHeight / (2 * 11 * Math.tan(38 * Math.PI / 360));
      const haloRadius = 2.05 * 1.28 * l.moonFitScale * pixelsPerUnit;
      const centerY = l.safeHeight / 2 - l.moonCenterY * pixelsPerUnit;
      assert.ok(centerY - haloRadius >= 78, `header overlap at ${width}x${height}`);
      assert.ok(centerY + haloRadius <= l.safeHeight - (visible ? 210 : 68), `panel overlap at ${width}x${height}`);
      assert.ok(haloRadius * 2 <= l.safeWidth * 0.84 + 0.001);
    }
  }
});

test('intermediate folding widths change Moon framing continuously and rail side does not bias composition', () => {
  let previous;
  for (let width = 320; width <= 1000; width++) {
    const next = getObserverLayout(width, 800, { right: 84 });
    if (previous) {
      assert.ok(Math.abs(next.moonFitScale - previous.moonFitScale) < 0.01);
      assert.ok(Math.abs(next.moonCenterY - previous.moonCenterY) < 0.01);
    }
    assert.deepEqual(next, getObserverLayout(width, 800, { left: 84 }));
    previous = next;
  }
});

test('date scrub offset is independent of viewport width and preserves past or future selection', () => {
  for (const days of [-90, -7, 0, 13, 90]) {
    const x = getTimelineOffset(days, 90, 40);
    assert.equal(Math.round(x / 40) - 90, days);
  }
});

test('iPhone 14 Pro panel reaches the bottom gutter while Duo rails and landscape retain safe areas', () => {
  const { getObserverInsets } = loaded.exports;
  const portrait = { top: 59, bottom: 34, left: 0, right: 0 };
  const content = getObserverInsets(393, 852, portrait, true);
  const layout = getObserverLayout(393, 852, content);
  assert.equal(content.bottom, 0);
  assert.equal((393 - layout.panelWidth) / 2, layout.gutter);
  assert.equal(852 - portrait.top - layout.safeHeight + layout.gutter, layout.gutter);
  const rail = { top: 24, bottom: 24, left: 0, right: 84 };
  assert.deepEqual(getObserverInsets(402, 874, rail, true), rail);
  assert.deepEqual(getObserverInsets(852, 393, portrait, true), portrait);
  assert.deepEqual(getObserverInsets(393, 852, portrait, false), portrait);
});
