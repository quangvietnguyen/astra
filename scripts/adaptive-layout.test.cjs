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


test('Duo panel uses equal side and bottom gutters on both displays and with either rail', () => {
  const { getObserverInsets } = loaded.exports;
  for (const [width, height] of [[466, 678], [951, 669], [669, 951]]) {
    for (const side of ['left', 'right']) {
      const nativeInsets = { top: 0, bottom: 34, left: 0, right: 0, [side]: 84 };
      const insets = getObserverInsets(width, height, nativeInsets, true, true);
      const layout = getObserverLayout(width, height, insets, 180, true, true);
      assert.equal(insets.bottom, 0);
      assert.equal(insets[side], 84, 'keep controls clear of the system rail');
      assert.ok(Math.abs((layout.safeWidth - layout.panelWidth) / 2 - layout.gutter) < 1e-8);
      assert.equal(height - insets.top - layout.safeHeight + layout.gutter, layout.gutter);
    }
  }
});


test('Duo drawable stays square throughout folding so cached frames cannot stretch the Moon', () => {
  const { getDuoMoonSurface } = loaded.exports;
  const outer = { width: 382, height: 678 };
  const inner = { width: 867, height: 669 };
  for (let step = 0; step <= 100; step++) {
    const progress = step / 100;
    const width = outer.width + (inner.width - outer.width) * progress;
    const height = outer.height + (inner.height - outer.height) * progress;
    const surface = getDuoMoonSurface(width, height);
    assert.equal(surface.width, surface.height, 'native frame scales uniformly');
    assert.equal(surface.height, 512, 'folding must not reallocate the native drawable');
    assert.equal(surface.height * surface.transform[0].scale, height, 'vertical world-to-pixel framing stays unchanged');
    assert.ok(Math.abs(surface.top + surface.height / 2 - height / 2) < 1e-8, 'center vertically');
    assert.ok(Math.abs(surface.left + surface.width / 2 - width / 2) < 1e-8, 'center within the usable stage');
  }
  for (const [width, height] of [[585, 951], [469, 669], [678, 382]]) {
    const surface = getDuoMoonSurface(width, height);
    assert.equal(surface.width / surface.height, 1, 'portrait, split and rotation keep a square drawable');
  }
});


test('only software renderers use a smaller Duo drawable; quality does not alter framing', () => {
  const { getDuoSurfaceSide, getDuoMoonSurface } = loaded.exports;
  assert.equal(getDuoSurfaceSide('Apple Software Renderer'), 192);
  assert.equal(getDuoSurfaceSide('Apple GPU'), 512);
  for (const renderer of ['Apple Software Renderer', 'Apple GPU']) {
    const side = getDuoSurfaceSide(renderer);
    const surface = getDuoMoonSurface(867, 669, side);
    assert.equal(surface.width, surface.height);
    assert.equal(surface.width * surface.transform[0].scale, 669);
    assert.equal(surface.left + side / 2, 867 / 2);
  }
});
