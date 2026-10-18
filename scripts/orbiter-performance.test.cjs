const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { transformSync } = require('@babel/core');
const THREE = require('three');

function loadSource(relativePath, imports, testExports = '') {
  const filename = path.join(__dirname, '..', relativePath);
  const { code } = transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, babelrc: false, configFile: false,
    plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code + '\n' + testExports)((name) => {
    assert.ok(name in imports, `unexpected dependency ${name}`);
    return imports[name];
  }, module, module.exports);
  return module.exports;
}

function instantiate(element) {
  if (!element || typeof element !== 'object') return null;
  const { type, props, children } = element;
  const constructor = THREE[type[0].toUpperCase() + type.slice(1)];
  const object = new constructor(...(props.args || []));
  for (const [key, value] of Object.entries(props)) {
    if (['args', 'ref', 'key'].includes(key)) continue;
    if (object[key]?.isColor) object[key].set(value);
    else if (Array.isArray(value) && object[key]?.set) object[key].set(...value);
    else if (key === 'scale' && typeof value === 'number') object.scale.setScalar(value);
    else object[key] = value;
  }
  if (props.ref) props.ref.current = object;
  for (const child of children.flat(Infinity)) {
    const instance = instantiate(child);
    if (instance?.isBufferGeometry) object.geometry = instance;
    else if (instance?.isMaterial) object.material = instance;
    else if (instance) object.add(instance);
  }
  return object;
}

function snapshot(root) {
  root.updateMatrixWorld(true);
  const groups = new Map();
  let draws = 0;
  root.traverseVisible((mesh) => {
    if (!mesh.isMesh) return;
    draws++;
    const material = mesh.material.toJSON();
    delete material.uuid;
    const key = JSON.stringify([material, mesh.castShadow, mesh.receiveShadow, mesh.renderOrder, mesh.layers.mask]);
    if (!groups.has(key)) groups.set(key, []);
    const values = groups.get(key);
    const geometry = mesh.geometry;
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    const count = geometry.index?.count ?? geometry.attributes.position.count;
    for (let index = 0; index < count; index++) {
      const vertex = geometry.index ? geometry.index.getX(index) : index;
      const position = new THREE.Vector3().fromBufferAttribute(geometry.attributes.position, vertex).applyMatrix4(mesh.matrixWorld);
      const normal = new THREE.Vector3().fromBufferAttribute(geometry.attributes.normal, vertex).applyNormalMatrix(normalMatrix);
      values.push(...position.toArray(), ...normal.toArray(), geometry.attributes.uv.getX(vertex), geometry.attributes.uv.getY(vertex));
    }
  });
  return { groups, draws };
}

function assertSameSurface(before, after) {
  assert.deepEqual([...before.groups.keys()].sort(), [...after.groups.keys()].sort());
  for (const [key, expected] of before.groups) {
    const actual = after.groups.get(key);
    assert.equal(actual.length, expected.length, 'triangle count must stay identical');
    expected.forEach((value, index) => assert.ok(Math.abs(value - actual[index]) < 0.000001,
      `surface attribute ${index} changed: ${value} vs ${actual[index]}`));
  }
}

test('actual orbiter batches preserve surfaces, animated gimbals and cleanup while reducing draw submissions', async (t) => {
  const geometryUtils = await import('three/examples/jsm/utils/BufferGeometryUtils.js');
  const batchUtils = loadSource('src/utils/batchStaticOrbiterMeshes.js', {
    three: THREE, 'three/examples/jsm/utils/BufferGeometryUtils.js': geometryUtils,
  });
  const effects = [];
  const frames = [];
  const React = {
    useRef: () => ({ current: undefined }),
    useMemo: (factory) => factory(),
    useLayoutEffect: (effect) => effects.push(effect),
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  };
  const { default: Orbiter } = loadSource('src/Components/LunarOrbiter.js', {
    react: React, '@react-three/fiber/native': { useFrame: (frame) => frames.push(frame) },
    'expo-three': { THREE }, '../utils/batchStaticOrbiterMeshes': batchUtils,
  });
  const root = instantiate(Orbiter({}));
  const before = snapshot(root);
  const cleanups = effects.map((effect) => effect());
  const after = snapshot(root);
  assertSameSurface(before, after);
  assert.ok(after.draws <= before.draws * 0.7, 'reduce mesh submissions by at least 30%');
  t.diagnostic(`Orbiter mesh submissions: ${before.draws} -> ${after.draws}; identical triangle and material counts`);

  for (const time of [0, 1.7, 9, 23]) {
    frames.forEach((frame) => frame({ clock: { getElapsedTime: () => time } }));
    const batched = snapshot(root);
    cleanups.forEach((cleanup) => cleanup());
    assertSameSurface(snapshot(root), batched);
    cleanups.splice(0, cleanups.length, ...effects.map((effect) => effect()));
  }
  let disposals = 0;
  root.traverseVisible((mesh) => {
    if (mesh.isMesh) mesh.geometry.addEventListener('dispose', () => { disposals++; });
  });
  cleanups.forEach((cleanup) => cleanup());
  assert.ok(disposals > 0, 'merged GPU buffers must be released');
  assert.equal(snapshot(root).draws, before.draws, 'cleanup must restore original meshes');
});

function loadMoon(React, native, frames, invalidate = () => {}) {
  return loadSource('src/Components/moon.js', {
    react: React, 'react-native': native,
    'expo-three': { THREE }, '@react-three/fiber/native': {
      Canvas: 'canvas', useFrame: (frame) => frames.push(frame), useLoader: () => null,
      useThree: (select) => select({ invalidate }),
    }, '../data/moonConfig.json': require('../src/data/moonConfig.json'),
    '../../assets/moon.jpeg': 1, './LunarOrbiter': () => null,
  }, 'exports.testMoonEclipse = MoonEclipse; exports.testIPhoneFrameLoop = IPhoneFrameLoop;');
}

test('iPhone suspends frames in background and resumes full rendering; iPad keeps its rendering policy', () => {
  let state;
  let listener;
  let removed = false;
  const React = {
    memo: (component) => component,
    useState: (initial) => [state === undefined ? initial : state, (next) => { state = next; }],
    useEffect: (effect) => { React.cleanup = effect(); },
    useMemo: (factory) => factory(),
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  };
  const native = {
    Platform: { OS: 'ios', isPad: false },
    AppState: { currentState: 'active', addEventListener: (_, handler) => {
      listener = handler;
      return { remove: () => { removed = true; } };
    } },
  };
  const Moon = loadMoon(React, native, []).default;
  let canvas = Moon({});
  assert.equal(canvas.props.frameloop, 'demand');
  assert.equal(canvas.children[0].props.active, true);
  listener('background');
  canvas = Moon({});
  assert.equal(canvas.props.frameloop, 'demand', 'keep clock mode stable');
  assert.equal(canvas.children[0].props.active, false);
  listener('active');
  assert.equal(Moon({}).children[0].props.active, true);
  React.cleanup();
  assert.ok(removed);
  native.Platform.isPad = true;
  state = 'background';
  assert.equal(Moon({}).props.frameloop, 'always');
});

test('iPhone requests every active animation frame, stops when suspended, and wakes on resume', () => {
  const frames = [];
  let requests = 0;
  const React = { memo: (component) => component, useEffect: (effect) => effect() };
  const FrameLoop = loadMoon(React, {}, frames, () => { requests++; }).testIPhoneFrameLoop;
  FrameLoop({ active: true });
  assert.equal(requests, 1);
  frames.pop()();
  assert.equal(requests, 2);
  FrameLoop({ active: false });
  frames.pop()();
  assert.equal(requests, 2, 'background must not request more frames');
  FrameLoop({ active: true });
  assert.equal(requests, 3, 'resume must wake the renderer');
  frames.pop()();
  assert.equal(requests, 4, 'animation must keep running after resume');
});

test('invisible eclipse overlay skips drawing and can fade in and out again', () => {
  const refs = [];
  let cursor = 0;
  const frames = [];
  const React = {
    memo: (component) => component,
    useRef: (initial) => refs[cursor++] ||= { current: initial },
    useMemo: (factory) => factory(),
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  };
  const Eclipse = loadMoon(React, {}, frames).testMoonEclipse;
  const appearances = require('../src/data/moonConfig.json').appearance;
  const render = (appearance) => {
    cursor = 0;
    frames.length = 0;
    return Eclipse({ radius: 2.05, appearance });
  };
  const mesh = instantiate(render(appearances.regular));
  const tick = () => frames.forEach((frame) => frame({ clock: { getElapsedTime: () => 1 } }, 1 / 60));
  tick();
  assert.equal(mesh.visible, false);
  render(appearances.eclipse.total);
  tick();
  assert.equal(mesh.visible, true);
  assert.ok(mesh.material.opacity > 0);
  render(appearances.regular);
  tick();
  assert.equal(mesh.visible, true, 'fade-out must remain visible');
  for (let index = 0; index < 240; index++) tick();
  assert.equal(mesh.visible, false);
  assert.equal(mesh.material.opacity, 0);
  render(appearances.eclipse.total);
  tick();
  assert.equal(mesh.visible, true, 'later eclipses must still render');
});
