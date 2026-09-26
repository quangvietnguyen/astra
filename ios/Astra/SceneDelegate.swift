internal import Expo
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

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    UIViewController.astra_enableAlertSuppressionForDynamicIcon()
    guard let windowScene = scene as? UIWindowScene else { return }
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else { return }

    if #available(iOS 16.0, *) {
      let orientations: UIInterfaceOrientationMask = UIDevice.current.userInterfaceIdiom == .pad ? .all : .portrait
      let geometryPreferences = UIWindowScene.GeometryPreferences.iOS(interfaceOrientations: orientations)
      windowScene.requestGeometryUpdate(geometryPreferences) { _ in }
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
      if let windowScene = scene as? UIWindowScene {
        let orientations: UIInterfaceOrientationMask = UIDevice.current.userInterfaceIdiom == .pad ? .all : .portrait
        let geometryPreferences = UIWindowScene.GeometryPreferences.iOS(interfaceOrientations: orientations)
        windowScene.requestGeometryUpdate(geometryPreferences) { _ in }
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
      if let windowScene = scene as? UIWindowScene {
        let orientations: UIInterfaceOrientationMask = UIDevice.current.userInterfaceIdiom == .pad ? .all : .portrait
        let geometryPreferences = UIWindowScene.GeometryPreferences.iOS(interfaceOrientations: orientations)
        windowScene.requestGeometryUpdate(geometryPreferences) { _ in }
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
