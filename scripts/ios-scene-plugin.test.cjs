const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadMods() {
  const mods = {};
  const hooks = Object.fromEntries(['withInfoPlist', 'withAppDelegate', 'withXcodeProject', 'withDangerousMod']
    .map(name => [name, (config, callback) => { mods[name] = callback; return config; }]));
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../plugins/withIosSceneDelegate.js'), 'utf8'), {
    module, require: name => name === '@expo/config-plugins' ? hooks : require(name),
  });
  module.exports({});
  return mods;
}

test('scene migration preserves Firebase initialization and is idempotent', () => {
  const mods = loadMods();
  const legacy = `class AppDelegate: ExpoAppDelegate {
    func start() {
      #if os(iOS) || os(tvOS)
      window = UIWindow(frame: UIScreen.main.bounds)
      FirebaseApp.configure()
      factory.startReactNative(withModuleName: "main", in: window, launchOptions: launchOptions)
      #endif
    }
  }
  class ReactNativeDelegate {}`;
  const transform = contents => mods.withAppDelegate({modResults: {contents}}).modResults.contents;
  const migrated = transform(legacy);
  assert.equal((migrated.match(/FirebaseApp.configure\(\)/g) || []).length, 1);
  assert.ok(migrated.includes('configurationForConnecting'));
  assert.ok(migrated.includes('ExpoAppDelegate, ExpoReactNativeFactoryProvider'));
  assert.ok(!migrated.includes('factory.startReactNative('));
  assert.ok(!migrated.includes('UIWindow(frame:'));
  assert.equal(transform(migrated), migrated);
});

test('scene class uses the module-qualified name declared by its manifest', async () => {
  const mods = loadMods();
  const manifest = mods.withInfoPlist({modResults: {}}).modResults.UIApplicationSceneManifest;
  assert.equal(manifest.UISceneConfigurations.UIWindowSceneSessionRoleApplication[0].UISceneDelegateClassName,
    '$(PRODUCT_MODULE_NAME).SceneDelegate');
  const source = fs.readFileSync(path.join(__dirname, '../ios/Astra/SceneDelegate.swift'), 'utf8');
  assert.ok(source.includes('class SceneDelegate:'));
  assert.ok(!source.includes('@objc(SceneDelegate)'));
  assert.ok(source.includes('class SceneDelegate: ExpoAppSceneDelegate'));
  assert.ok(source.includes('super.scene(scene, willConnectTo: session, options: connectionOptions)'));
  assert.ok(source.includes('super.sceneDidBecomeActive(scene)'));
  assert.ok(source.includes('super.sceneWillEnterForeground(scene)'));
  assert.ok(!source.includes('factory.startReactNative('));
  assert.ok(!source.includes('RCTLinkingManager.application('));
});

test('SDK 58 template initializes Firebase without the old window startup anchor', () => {
  const mods = loadMods();
  const modern = `internal import Expo
class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {
  func start() {
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}
class ReactNativeDelegate {}`;
  const transform = contents => mods.withAppDelegate({modResults: {contents}}).modResults.contents;
  const migrated = transform(modern);
  assert.equal((migrated.match(/FirebaseApp.configure\(\)/g) || []).length, 1);
  assert.ok(migrated.includes('import FirebaseCore'));
  assert.ok(migrated.indexOf('FirebaseApp.configure()') < migrated.indexOf('return super.application'));
  assert.equal(transform(migrated), migrated);
});

test('iPad supports all orientations while iPhone remains portrait-only', () => {
  const mods = loadMods();
  const plist = mods.withInfoPlist({modResults: {}}).modResults;
  assert.deepEqual(Array.from(plist['UISupportedInterfaceOrientations~ipad']), [
    'UIInterfaceOrientationPortrait',
    'UIInterfaceOrientationPortraitUpsideDown',
    'UIInterfaceOrientationLandscapeLeft',
    'UIInterfaceOrientationLandscapeRight',
  ]);
  assert.equal(plist.UIRequiresFullScreen, true);
  const config = require('../app.json').expo;
  assert.equal(config.orientation, 'portrait');
  assert.deepEqual(config.ios.infoPlist['UISupportedInterfaceOrientations~ipad'], [
    'UIInterfaceOrientationPortrait',
    'UIInterfaceOrientationPortraitUpsideDown',
    'UIInterfaceOrientationLandscapeLeft',
    'UIInterfaceOrientationLandscapeRight',
  ]);

  const legacy = `class AppDelegate: ExpoAppDelegate {
    func configurationForConnecting() {}
    func supportedInterfaceOrientationsFor() -> UIInterfaceOrientationMask {
    if UIDevice.current.userInterfaceIdiom == .pad {
      return .all
    }
    return .portrait
    }
  }`;
  const transform = contents => mods.withAppDelegate({modResults: {contents}}).modResults.contents;
  const migrated = transform(legacy);
  assert.ok(migrated.includes('UIDevice.current.userInterfaceIdiom == .pad ? .all : .portrait'));
  assert.equal(transform(migrated), migrated);
  const source = fs.readFileSync(path.join(__dirname, '../ios/Astra/SceneDelegate.swift'), 'utf8');
  assert.ok(!source.includes('userInterfaceIdiom == .phone'));
  assert.ok(source.includes('userInterfaceIdiom == .pad ? .all : .portrait'));
  assert.equal((source.match(/updateOrientation\(for: scene\)/g) || []).length, 3);
});
