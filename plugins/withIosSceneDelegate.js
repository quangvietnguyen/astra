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

// MARK: - Dynamic App Icon Alert Suppression
extension UIViewController {
  private static var hasSwizzledAlertPresentation = false

  @objc public static func astra_enableAlertSuppressionForDynamicIcon() {
    guard !hasSwizzledAlertPresentation else { return }
    hasSwizzledAlertPresentation = true

    let originalSelector = #selector(UIViewController.present(_:animated:completion:))
    let swizzledSelector = #selector(UIViewController.astra_presentViewController(_:animated:completion:))

    guard let originalMethod = class_getInstanceMethod(UIViewController.self, originalSelector),
          let swizzledMethod = class_getInstanceMethod(UIViewController.self, swizzledSelector) else {
      return
    }

    method_exchangeImplementations(originalMethod, swizzledMethod)
  }

  @objc(astra_presentViewController:animated:completion:)
  private func astra_presentViewController(
    _ viewControllerToPresent: UIViewController,
    animated flag: Bool,
    completion: (() -> Void)?
  ) {
    if let alert = viewControllerToPresent as? UIAlertController {
      let isTitleEmpty = alert.title == nil || alert.title?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == true
      let isMessageEmpty = alert.message == nil || alert.message?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == true

      // On iOS, the system confirmation dialog for setAlternateIconName has no title and no message,
      // or contains localized text mentioning the icon change. Suppress it so moon phase icon updates occur silently.
      let isIconAlert = (isTitleEmpty && isMessageEmpty) ||
        (alert.title?.localizedCaseInsensitiveContains("icon") == true) ||
        (alert.message?.localizedCaseInsensitiveContains("icon") == true)

      if isIconAlert {
        completion?()
        return
      }
    }
    self.astra_presentViewController(viewControllerToPresent, animated: flag, completion: completion)
  }
}

class SceneDelegate: ExpoAppSceneDelegate {
  override func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    UIViewController.astra_enableAlertSuppressionForDynamicIcon()
    super.scene(scene, willConnectTo: session, options: connectionOptions)
    updateOrientation(for: scene)
  }

  override func sceneDidBecomeActive(_ scene: UIScene) {
    super.sceneDidBecomeActive(scene)
    updateOrientation(for: scene)
  }

  override func sceneWillEnterForeground(_ scene: UIScene) {
    super.sceneWillEnterForeground(scene)
    updateOrientation(for: scene)
  }

  private func updateOrientation(for scene: UIScene) {
    if #available(iOS 16.0, *), let windowScene = scene as? UIWindowScene {
      let orientations: UIInterfaceOrientationMask = UIDevice.current.userInterfaceIdiom == .pad ? .all : .portrait
      let geometryPreferences = UIWindowScene.GeometryPreferences.iOS(interfaceOrientations: orientations)
      windowScene.requestGeometryUpdate(geometryPreferences) { _ in }
      window?.rootViewController?.setNeedsUpdateOfSupportedInterfaceOrientations()
    }
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

    // SDK 58's scene delegate obtains the React Native factory through this protocol.
    contents = contents.replace(
      /class AppDelegate: ExpoAppDelegate\s*\{/,
      'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
    );

    // RNFirebase's plugin looks for window startup, which moved out of
    // AppDelegate in SDK 58. Initialize Firebase before Expo's launch subscribers.
    if (!contents.includes('FirebaseApp.configure()')) {
      if (!contents.includes('import FirebaseCore')) {
        contents = 'import FirebaseCore\n' + contents;
      }
      contents = contents.replace(
        /return super\.application\(application, didFinishLaunchingWithOptions: launchOptions\)/,
        'FirebaseApp.configure()\n    return super.application(application, didFinishLaunchingWithOptions: launchOptions)',
      );
    }

    // Preserve iPad rotation when migrating an existing portrait-only delegate.
    contents = contents.replace(
      /    if UIDevice\.current\.userInterfaceIdiom == \.pad \{\s*return \.all\s*\}\s*return \.portrait/g,
      '    return UIDevice.current.userInterfaceIdiom == .pad ? .all : .portrait',
    );

    // Remove only window startup. Firebase and other native initializers can be
    // inserted between these statements and must remain in AppDelegate.
    contents = contents.replace(/^\s*window\s*=\s*UIWindow\(frame:\s*UIScreen\.main\.bounds\)\s*$/m, '');
    contents = contents.replace(
      /\s*factory\.startReactNative\(\s*withModuleName:\s*"main",\s*in:\s*window,\s*launchOptions:\s*launchOptions\s*\)/,
      '\n    // SceneDelegate starts React Native after its window scene connects.',
    );

    // Add configurationForConnecting and supportedInterfaceOrientationsFor if not already present
    if (!contents.includes('configurationForConnecting')) {
      const sceneConfigMethod = `
  // MARK: - UIScene Lifecycle (iOS 27+ SDK)
  public func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    UIViewController.astra_enableAlertSuppressionForDynamicIcon()
    let config = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    config.delegateClass = SceneDelegate.self
    return config
  }

  // MARK: - Orientation Lock
  public override func application(
    _ application: UIApplication,
    supportedInterfaceOrientationsFor window: UIWindow?
  ) -> UIInterfaceOrientationMask {
    return UIDevice.current.userInterfaceIdiom == .pad ? .all : .portrait
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
