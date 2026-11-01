import importlib.util
import pathlib
import plistlib
import tempfile
import unittest
import zipfile


spec = importlib.util.spec_from_file_location(
    "verify_ios_ipa", pathlib.Path(__file__).with_name("verify-ios-ipa.py")
)
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)


class VerifyIpaTests(unittest.TestCase):
    def setUp(self):
        self.info = {
            "CFBundleIdentifier": "com.example.astra",
            "UIDeviceFamily": [1, 2],
            "UISupportedInterfaceOrientations~ipad": [
                "UIInterfaceOrientationPortrait",
                "UIInterfaceOrientationPortraitUpsideDown",
                "UIInterfaceOrientationLandscapeLeft",
                "UIInterfaceOrientationLandscapeRight",
            ],
            "UIApplicationSceneManifest": {
                "UISceneConfigurations": {
                    "UIWindowSceneSessionRoleApplication": [
                        {"UISceneDelegateClassName": "Astra.SceneDelegate"}
                    ]
                }
            },
            "NSLocationWhenInUseUsageDescription": "Calculate local sky",
            "NSMotionUsageDescription": "Location library declaration",
        }

    def verify(self):
        with tempfile.TemporaryDirectory() as directory:
            ipa = pathlib.Path(directory) / "astra.ipa"
            with zipfile.ZipFile(ipa, "w") as archive:
                root = "Payload/Astra.app/"
                archive.writestr(root + "Info.plist", plistlib.dumps(self.info))
                archive.writestr(root + "GoogleService-Info.plist", plistlib.dumps({
                    "BUNDLE_ID": self.info["CFBundleIdentifier"],
                    "GOOGLE_APP_ID": "test-app-id",
                    "API_KEY": "test-key",
                }))
                archive.writestr(root + "main.jsbundle", "")
            validator.verify(ipa)

    def test_accepts_resizable_and_full_screen_ipad_apps(self):
        for full_screen in (False, True, None):
            with self.subTest(full_screen=full_screen):
                if full_screen is None:
                    self.info.pop("UIRequiresFullScreen", None)
                else:
                    self.info["UIRequiresFullScreen"] = full_screen
                self.verify()

    def test_rejects_missing_ipad_orientations(self):
        self.info["UIRequiresFullScreen"] = False
        self.info["UISupportedInterfaceOrientations~ipad"].pop()
        with self.assertRaisesRegex(ValueError, "iPad must support"):
            self.verify()

    def test_rejects_missing_scene_configuration(self):
        del self.info["UIApplicationSceneManifest"]
        with self.assertRaisesRegex(ValueError, "Missing scene lifecycle"):
            self.verify()


if __name__ == "__main__":
    unittest.main()
