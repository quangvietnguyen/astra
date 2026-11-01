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

class SceneDelegate: ExpoAppSceneDelegate {
  override func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    UIViewController.astra_enableAlertSuppressionForDynamicIcon()
    super.scene(scene, willConnectTo: session, options: connectionOptions)
  }
}
