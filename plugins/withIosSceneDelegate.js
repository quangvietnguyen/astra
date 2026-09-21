const {
  withInfoPlist,
  withAppDelegate,
  withXcodeProject,
  withDangerousMod,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const SCENE_DELEGATE_CONTENT = `internal import Expo
import UIKit
import React

@objc(SceneDelegate)
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }

    if #available(iOS 16.0, *) {
      if UIDevice.current.userInterfaceIdiom == .phone {
        let geometryPreferences = UIWindowScene.GeometryPreferences.iOS(interfaceOrientations: .portrait)
        windowScene.requestGeometryUpdate(geometryPreferences) { _ in }
      }
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    var launchOptions: [UIApplication.LaunchOptionsKey: Any] = [:]
    if let url = connectionOptions.urlContexts.first?.url {
      let urlKey = UIApplication.LaunchOptionsKey(rawValue: "UIApplicationLaunchOptionsURLKey")
      launchOptions[urlKey] = url
    }
    if let userActivity = connectionOptions.userActivities.first(where: { $0.activityType == NSUserActivityTypeBrowsingWeb }) {
      let userActivityDictionaryKey = UIApplication.LaunchOptionsKey(rawValue: "UIApplicationLaunchOptionsUserActivityDictionaryKey")
      launchOptions[userActivityDictionaryKey] = [
        "UIApplicationLaunchOptionsUserActivityTypeKey": userActivity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": userActivity,
      ]
    }

    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions.isEmpty ? nil : launchOptions
    )

    if #available(iOS 16.0, *) {
      window.rootViewController?.setNeedsUpdateOfSupportedInterfaceOrientations()
    }

    window.makeKeyAndVisible()

    for context in connectionOptions.urlContexts {
      _ = appDelegate.application(UIApplication.shared, open: context.url, options: [:])
      RCTLinkingManager.application(UIApplication.shared, open: context.url, options: [:])
    }
    for activity in connectionOptions.userActivities {
      _ = appDelegate.application(UIApplication.shared, continue: activity, restorationHandler: { _ in })
      RCTLinkingManager.application(UIApplication.shared, continue: activity, restorationHandler: { _ in })
    }
  }

  func sceneDidDisconnect(_ scene: UIScene) {
    window = nil
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    if #available(iOS 16.0, *) {
      if UIDevice.current.userInterfaceIdiom == .phone {
        if let windowScene = scene as? UIWindowScene {
          let geometryPreferences = UIWindowScene.GeometryPreferences.iOS(interfaceOrientations: .portrait)
          windowScene.requestGeometryUpdate(geometryPreferences) { _ in }
        }
      }
    }
    if let appDelegate = UIApplication.shared.delegate as? AppDelegate {
      appDelegate.applicationDidBecomeActive(UIApplication.shared)
    }
  }

  func sceneWillResignActive(_ scene: UIScene) {
    if let appDelegate = UIApplication.shared.delegate as? AppDelegate {
      appDelegate.applicationWillResignActive(UIApplication.shared)
    }
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    if #available(iOS 16.0, *) {
      if UIDevice.current.userInterfaceIdiom == .phone {
        if let windowScene = scene as? UIWindowScene {
          let geometryPreferences = UIWindowScene.GeometryPreferences.iOS(interfaceOrientations: .portrait)
          windowScene.requestGeometryUpdate(geometryPreferences) { _ in }
        }
      }
    }
    if let appDelegate = UIApplication.shared.delegate as? AppDelegate {
      appDelegate.applicationWillEnterForeground(UIApplication.shared)
    }
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    if let appDelegate = UIApplication.shared.delegate as? AppDelegate {
      appDelegate.applicationDidEnterBackground(UIApplication.shared)
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    for context in URLContexts {
      var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
      if let src = context.options.sourceApplication {
        options[.sourceApplication] = src
      }
      if let annotation = context.options.annotation {
        options[.annotation] = annotation
      }
      options[.openInPlace] = context.options.openInPlace
      _ = appDelegate.application(UIApplication.shared, open: context.url, options: options)
      RCTLinkingManager.application(UIApplication.shared, open: context.url, options: options)
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
    _ = appDelegate.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    RCTLinkingManager.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
`;

function withIosSceneDelegate(config) {
  // 1. Configure Info.plist with UIApplicationSceneManifest and orientation locks
  config = withInfoPlist(config, config => {
    config.modResults.UIRequiresFullScreen = true;
    config.modResults.UISupportedInterfaceOrientations = ['UIInterfaceOrientationPortrait'];
    config.modResults['UISupportedInterfaceOrientations~ipad'] = [
      'UIInterfaceOrientationPortrait',
      'UIInterfaceOrientationPortraitUpsideDown',
      'UIInterfaceOrientationLandscapeLeft',
      'UIInterfaceOrientationLandscapeRight',
    ];
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return config;
  });

  // 2. Modify AppDelegate.swift to delegate window creation to SceneDelegate
  config = withAppDelegate(config, config => {
    let contents = config.modResults.contents;

    // Remove legacy window creation from didFinishLaunchingWithOptions
    const legacyWindowPattern =
      /#if\s+os\(iOS\)\s*\|\|\s*os\(tvOS\)[\s\S]*?window\s*=\s*UIWindow[\s\S]*?factory\.startReactNative[\s\S]*?#endif/;
    if (legacyWindowPattern.test(contents)) {
      contents = contents.replace(
        legacyWindowPattern,
        '    // Window creation and React Native initialization are delegated to SceneDelegate\n' +
          '    // to support the UIKit scene-based lifecycle required by iOS 27 SDK.',
      );
    }

    // Add configurationForConnecting and supportedInterfaceOrientationsFor if not already present
    if (!contents.includes('configurationForConnecting')) {
      const sceneConfigMethod = `
  // MARK: - UIScene Lifecycle (iOS 27+ SDK)
  public func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    let config = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    config.delegateClass = SceneDelegate.self
    return config
  }

  // MARK: - Orientation Lock
  public override func application(
    _ application: UIApplication,
    supportedInterfaceOrientationsFor window: UIWindow?
  ) -> UIInterfaceOrientationMask {
    if UIDevice.current.userInterfaceIdiom == .pad {
      return .all
    }
    return .portrait
  }
`;
      const reactNativeDelegateIndex = contents.indexOf('class ReactNativeDelegate');
      if (reactNativeDelegateIndex !== -1) {
        const appDelegateCloseBraceIndex = contents.lastIndexOf('}', reactNativeDelegateIndex);
        contents =
          contents.slice(0, appDelegateCloseBraceIndex) +
          sceneConfigMethod +
          '\n' +
          contents.slice(appDelegateCloseBraceIndex);
      } else {
        const lastBraceIndex = contents.lastIndexOf('}');
        contents =
          contents.slice(0, lastBraceIndex) + sceneConfigMethod + '\n' + contents.slice(lastBraceIndex);
      }
    }

    config.modResults.contents = contents;
    return config;
  });

  // 3. Write SceneDelegate.swift into the ios project directory
  config = withDangerousMod(config, [
    'ios',
    async config => {
      const projectName = config.modRequest.projectName || 'Astra';
      const projectRoot = config.modRequest.projectRoot;
      const targetDir = path.join(projectRoot, 'ios', projectName);
      if (fs.existsSync(targetDir)) {
        const targetFile = path.join(targetDir, 'SceneDelegate.swift');
        fs.writeFileSync(targetFile, SCENE_DELEGATE_CONTENT, 'utf8');
      }
      return config;
    },
  ]);

  // 4. Add SceneDelegate.swift to project.pbxproj build sources
  config = withXcodeProject(config, config => {
    const projectName = config.modRequest.projectName || 'Astra';
    const project = config.modResults;
    const filePath = `${projectName}/SceneDelegate.swift`;
    if (!project.hasFile(filePath)) {
      const groupKey = project.findPBXGroupKey({ name: projectName });
      if (groupKey) {
        project.addSourceFile(filePath, null, groupKey);
      }
    }
    return config;
  });

  return config;
}

module.exports = withIosSceneDelegate;
