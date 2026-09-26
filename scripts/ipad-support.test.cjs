const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const xcode = require('xcode');
const { getDeviceFamilies } = require('@expo/config-plugins/build/ios/DeviceFamily');

test('checked-in native app targets preserve Expo iPhone and iPad support', () => {
  const config = require('../app.json').expo;
  assert.deepEqual(getDeviceFamilies(config), [1, 2]);
  const project = xcode.project(path.join(__dirname, '../ios/Astra.xcodeproj/project.pbxproj'));
  project.parseSync();
  const configurations = Object.values(project.pbxXCBuildConfigurationSection())
    .filter(entry => entry.buildSettings?.PRODUCT_NAME === 'Astra');
  assert.deepEqual(configurations.map(entry => entry.name).sort(), ['Debug', 'Release']);
  for (const { name, buildSettings } of configurations) {
    const families = String(buildSettings.TARGETED_DEVICE_FAMILY).replaceAll('"', '')
      .split(',').map(Number).sort();
    assert.deepEqual(families, [1, 2], `${name} must launch natively on iPad`);
  }
});
