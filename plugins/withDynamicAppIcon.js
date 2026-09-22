const {
  withInfoPlist,
  withDangerousMod,
  withXcodeProject,
  withAndroidManifest,
  AndroidConfig,
  IOSConfig,
} = require('@expo/config-plugins');
const { generateImageAsync } = require('@expo/image-utils');
const fs = require('fs');
const path = require('path');
const pbxFile = require('xcode/lib/pbxFile');

const { getMainApplicationOrThrow } = AndroidConfig.Manifest;

const androidFolderPath = ['app', 'src', 'main', 'res'];
const androidFolderNames = [
  'mipmap-hdpi',
  'mipmap-mdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi',
];
const androidSize = [162, 108, 216, 324, 432];

const iosFolderName = 'DynamicAppIcons';

// iPhone and iPad dimensions
const iosIconVariants = [
  // iPhone
  { size: 60, scale: 2, pixelSize: 120, name: (key) => `${key}-Icon-60x60@2x.png` },
  { size: 60, scale: 3, pixelSize: 180, name: (key) => `${key}-Icon-60x60@3x.png` },
  // iPad (Resolves Apple ITMS-90892)
  { size: 76, scale: 1, pixelSize: 76, name: (key) => `${key}-Icon-76x76@1x.png` },
  { size: 76, scale: 2, pixelSize: 152, name: (key) => `${key}-Icon-76x76@2x.png` },
  { size: 83.5, scale: 2, pixelSize: 167, name: (key) => `${key}-Icon-83.5x83.5@2x.png` },
  // Also provide explicit ~ipad suffix aliases for older Xcode/iOS toolchains
  { size: 76, scale: 1, pixelSize: 76, name: (key) => `${key}-Icon-76x76~ipad.png` },
  { size: 76, scale: 2, pixelSize: 152, name: (key) => `${key}-Icon-76x76@2x~ipad.png` },
  { size: 83.5, scale: 2, pixelSize: 167, name: (key) => `${key}-Icon-83.5x83.5@2x~ipad.png` },
];

function arrayToImages(images) {
  return images.reduce((prev, curr, i) => ({ ...prev, [i]: { image: curr } }), {});
}

const withDynamicAppIcon = (config, props = {}) => {
  const _props = props || {};
  let prepped = {};
  if (Array.isArray(_props)) {
    prepped = arrayToImages(_props);
  } else if (_props) {
    prepped = _props;
  }

  // iOS configuration
  config = withIconXcodeProject(config, { icons: prepped });
  config = withIconInfoPlist(config, { icons: prepped });
  config = withIconIosImages(config, { icons: prepped });
  config = withAppIconCatalogIpad(config);

  // Android configuration
  config = withIconAndroidManifest(config, { icons: prepped });
  config = withIconAndroidImages(config, { icons: prepped });

  return config;
};

// --- ANDROID CONFIGURATION ---

const withIconAndroidManifest = (config, { icons }) => {
  return withAndroidManifest(config, (config) => {
    const mainApplication = getMainApplicationOrThrow(config.modResults);
    const iconNamePrefix = `${config.android.package}.MainActivity`;
    const iconNames = Object.keys(icons);

    function addIconActivityAlias(cfg) {
      return [
        ...cfg,
        ...iconNames.map((iconName) => ({
          $: {
            'android:name': `${iconNamePrefix}${iconName}`,
            'android:enabled': 'false',
            'android:exported': 'true',
            'android:icon': `@mipmap/${iconName}`,
            'android:targetActivity': '.MainActivity',
          },
          'intent-filter': [
            {
              action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
              category: [
                { $: { 'android:name': 'android.intent.category.LAUNCHER' } },
              ],
            },
          ],
        })),
      ];
    }

    function removeIconActivityAlias(cfg) {
      return cfg.filter((activityAlias) => !activityAlias.$['android:name'].startsWith(iconNamePrefix));
    }

    mainApplication['activity-alias'] = removeIconActivityAlias(mainApplication['activity-alias'] || []);
    mainApplication['activity-alias'] = addIconActivityAlias(mainApplication['activity-alias'] || []);
    return config;
  });
};

const withIconAndroidImages = (config, { icons }) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const androidResPath = path.join(config.modRequest.platformProjectRoot, ...androidFolderPath);
      const removeIconRes = async () => {
        for (let i = 0; androidFolderNames.length > i; i += 1) {
          const folder = path.join(androidResPath, androidFolderNames[i]);
          const files = await fs.promises.readdir(folder).catch(() => []);
          for (let j = 0; files.length > j; j += 1) {
            if (!files[j].startsWith('ic_launcher')) {
              await fs.promises
                .rm(path.join(folder, files[j]), { force: true })
                .catch(() => null);
            }
          }
        }
      };

      const addIconRes = async () => {
        for (let i = 0; androidFolderNames.length > i; i += 1) {
          const size = androidSize[i];
          const outputPath = path.join(androidResPath, androidFolderNames[i]);
          for (const [name, { image }] of Object.entries(icons)) {
            const fileName = `${name}.png`;
            const { source } = await generateImageAsync(
              {
                projectRoot: config.modRequest.projectRoot,
                cacheType: 'react-native-dynamic-app-icon',
              },
              {
                name: fileName,
                src: image,
                backgroundColor: '#ffffff',
                resizeMode: 'cover',
                width: size,
                height: size,
              }
            );
            await fs.promises.writeFile(path.join(outputPath, fileName), source);
          }
        }
      };

      await removeIconRes();
      await addIconRes();
      return config;
    },
  ]);
};

// --- IOS CONFIGURATION ---

const withIconXcodeProject = (config, { icons }) => {
  return withXcodeProject(config, async (config) => {
    const groupPath = `${config.modRequest.projectName}/${iosFolderName}`;
    const group = IOSConfig.XcodeUtils.ensureGroupRecursively(config.modResults, groupPath);
    const project = config.modResults;
    const opt = {};

    // Unlink old assets
    const groupId = Object.keys(project.hash.project.objects['PBXGroup']).find((id) => {
      const _group = project.hash.project.objects['PBXGroup'][id];
      return _group.name === group.name;
    });

    if (!project.hash.project.objects['PBXVariantGroup']) {
      project.hash.project.objects['PBXVariantGroup'] = {};
    }

    const variantGroupId = Object.keys(project.hash.project.objects['PBXVariantGroup']).find((id) => {
      const _group = project.hash.project.objects['PBXVariantGroup'][id];
      return _group.name === group.name;
    });

    const children = [...(group.children || [])];
    for (const child of children) {
      const file = new pbxFile(path.join(group.name, child.comment), opt);
      file.target = opt ? opt.target : undefined;
      project.removeFromPbxBuildFileSection(file);
      project.removeFromPbxFileReferenceSection(file);
      if (group) {
        if (groupId) {
          project.removeFromPbxGroup(file, groupId);
        } else if (variantGroupId) {
          project.removeFromPbxVariantGroup(file, variantGroupId);
        }
      }
      project.removeFromPbxResourcesBuildPhase(file);
    }

    // Link all new assets (iPhone + iPad)
    for (const [key] of Object.entries(icons)) {
      for (const variant of iosIconVariants) {
        const iconFileName = variant.name(key);
        if (!group?.children.some(({ comment }) => comment === iconFileName)) {
          config.modResults = IOSConfig.XcodeUtils.addResourceFileToGroup({
            filepath: path.join(groupPath, iconFileName),
            groupName: groupPath,
            project: config.modResults,
            isBuildFile: true,
            verbose: true,
          });
        }
      }
    }

    return config;
  });
};

const withIconInfoPlist = (config, { icons }) => {
  return withInfoPlist(config, async (config) => {
    const iphoneAltIcons = {};
    const ipadAltIcons = {};

    for (const [key, icon] of Object.entries(icons)) {
      iphoneAltIcons[key] = {
        CFBundleIconFiles: [`${key}-Icon-60x60`],
        UIPrerenderedIcon: !!icon.prerendered,
      };

      // iPad alternate icons must include 76x76 (152px) and 83.5x83.5 (167px) for Apple ITMS-90892 validation
      ipadAltIcons[key] = {
        CFBundleIconFiles: [
          `${key}-Icon-76x76`,
          `${key}-Icon-83.5x83.5`,
          `${key}-Icon-60x60`,
        ],
        UIPrerenderedIcon: !!icon.prerendered,
      };
    }

    // Configure iPhone CFBundleIcons
    if (!config.modResults.CFBundleIcons || typeof config.modResults.CFBundleIcons !== 'object') {
      config.modResults.CFBundleIcons = {};
    }
    config.modResults.CFBundleIcons.CFBundleAlternateIcons = iphoneAltIcons;
    config.modResults.CFBundleIcons.CFBundlePrimaryIcon = {
      CFBundleIconFiles: ['AppIcon'],
    };

    // Configure iPad CFBundleIcons~ipad
    if (!config.modResults['CFBundleIcons~ipad'] || typeof config.modResults['CFBundleIcons~ipad'] !== 'object') {
      config.modResults['CFBundleIcons~ipad'] = {};
    }
    config.modResults['CFBundleIcons~ipad'].CFBundleAlternateIcons = ipadAltIcons;
    config.modResults['CFBundleIcons~ipad'].CFBundlePrimaryIcon = {
      CFBundleIconFiles: ['AppIcon'],
    };

    return config;
  });
};

const withIconIosImages = (config, props) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const iosRoot = path.join(config.modRequest.platformProjectRoot, config.modRequest.projectName);
      const dynamicFolder = path.join(iosRoot, iosFolderName);

      // Clean existing folder
      await fs.promises.rm(dynamicFolder, { recursive: true, force: true }).catch(() => null);
      await fs.promises.mkdir(dynamicFolder, { recursive: true });

      // Generate all iPhone and iPad icon files
      for (const [key, icon] of Object.entries(props.icons || {})) {
        for (const variant of iosIconVariants) {
          const iconFileName = variant.name(key);
          const outputPath = path.join(dynamicFolder, iconFileName);
          const { source } = await generateImageAsync(
            {
              projectRoot: config.modRequest.projectRoot,
              cacheType: 'react-native-dynamic-app-icon',
            },
            {
              name: iconFileName,
              src: icon.image,
              removeTransparency: true,
              backgroundColor: '#ffffff',
              resizeMode: 'cover',
              width: variant.pixelSize,
              height: variant.pixelSize,
            }
          );
          await fs.promises.writeFile(outputPath, source);
        }
      }

      return config;
    },
  ]);
};

/**
 * Ensures AppIcon.appiconset in Images.xcassets includes explicit iPad icon assets
 * (76x76@1x, 76x76@2x = 152px, 83.5x83.5@2x = 167px) to satisfy ITMS-90892 App Store validation.
 */
const withAppIconCatalogIpad = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectName = config.modRequest.projectName;
      const appIconSetDir = path.join(
        config.modRequest.platformProjectRoot,
        projectName,
        'Images.xcassets',
        'AppIcon.appiconset'
      );

      const sourceIconPath = path.resolve(config.modRequest.projectRoot, config.icon || './assets/icon.png');
      if (!fs.existsSync(sourceIconPath)) {
        return config;
      }

      await fs.promises.mkdir(appIconSetDir, { recursive: true });

      const requiredAppIcons = [
        { idiom: 'ipad', size: '76x76', scale: '1x', pixelSize: 76, filename: 'AppIcon-76x76@1x.png' },
        { idiom: 'ipad', size: '76x76', scale: '2x', pixelSize: 152, filename: 'AppIcon-76x76@2x.png' },
        { idiom: 'ipad', size: '83.5x83.5', scale: '2x', pixelSize: 167, filename: 'AppIcon-83.5x83.5@2x.png' },
        { idiom: 'iphone', size: '60x60', scale: '2x', pixelSize: 120, filename: 'AppIcon-60x60@2x.png' },
        { idiom: 'iphone', size: '60x60', scale: '3x', pixelSize: 180, filename: 'AppIcon-60x60@3x.png' },
        { idiom: 'universal', platform: 'ios', size: '1024x1024', scale: '1x', pixelSize: 1024, filename: 'App-Icon-1024x1024@1x.png' },
      ];

      for (const entry of requiredAppIcons) {
        const destPath = path.join(appIconSetDir, entry.filename);
        const { source } = await generateImageAsync(
          {
            projectRoot: config.modRequest.projectRoot,
            cacheType: 'appiconset-ipad',
          },
          {
            name: entry.filename,
            src: sourceIconPath,
            removeTransparency: true,
            backgroundColor: '#ffffff',
            resizeMode: 'cover',
            width: entry.pixelSize,
            height: entry.pixelSize,
          }
        );
        await fs.promises.writeFile(destPath, source);
      }

      // Read or construct Contents.json
      const contentsJsonPath = path.join(appIconSetDir, 'Contents.json');
      let currentJson = { images: [], info: { author: 'xcode', version: 1 } };
      if (fs.existsSync(contentsJsonPath)) {
        try {
          currentJson = JSON.parse(await fs.promises.readFile(contentsJsonPath, 'utf8'));
        } catch (e) {}
      }

      const existingImages = currentJson.images || [];
      const updatedImages = [...existingImages];

      for (const req of requiredAppIcons) {
        const idx = updatedImages.findIndex(
          (img) =>
            img.filename === req.filename ||
            (img.idiom === req.idiom && img.size === req.size && img.scale === req.scale)
        );

        const imgEntry = {
          filename: req.filename,
          idiom: req.idiom,
          size: req.size,
          scale: req.scale,
        };
        if (req.platform) {
          imgEntry.platform = req.platform;
        }

        if (idx >= 0) {
          updatedImages[idx] = imgEntry;
        } else {
          updatedImages.push(imgEntry);
        }
      }

      currentJson.images = updatedImages;
      await fs.promises.writeFile(contentsJsonPath, JSON.stringify(currentJson, null, 2));

      return config;
    },
  ]);
};

module.exports = withDynamicAppIcon;
