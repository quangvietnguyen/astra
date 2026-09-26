#!/usr/bin/env python3
"""Reject IPAs missing native configuration required at startup."""
import plistlib
import sys
import zipfile


def verify(path):
    with zipfile.ZipFile(path) as archive:
        roots = [name for name in archive.namelist()
                 if name.startswith("Payload/") and name.count("/") == 2
                 and name.endswith(".app/Info.plist")]
        if len(roots) != 1:
            raise ValueError("Expected exactly one app in the IPA")
        root = roots[0].removesuffix("Info.plist")
        info = plistlib.loads(archive.read(roots[0]))
        errors = []
        if not {1, 2}.issubset(set(info.get("UIDeviceFamily", []))):
            errors.append("Missing iPhone/iPad device support (TARGETED_DEVICE_FAMILY must include 1,2)")
        ipad_orientations = set(info.get("UISupportedInterfaceOrientations~ipad", []))
        required_ipad_orientations = {
            "UIInterfaceOrientationPortrait",
            "UIInterfaceOrientationPortraitUpsideDown",
            "UIInterfaceOrientationLandscapeLeft",
            "UIInterfaceOrientationLandscapeRight",
        }
        if ipad_orientations != required_ipad_orientations:
            errors.append("iPad must support portrait and landscape orientations")
        if info.get("UIRequiresFullScreen") is not True:
            errors.append("Missing full-screen requirement for iPad support")
        scenes = info.get("UIApplicationSceneManifest", {}).get("UISceneConfigurations", {})
        application_scenes = scenes.get("UIWindowSceneSessionRoleApplication", [])
        if not any(scene.get("UISceneDelegateClassName") for scene in application_scenes):
            errors.append("Missing scene lifecycle configuration (required for iOS 27 SDK builds)")
        for key in ("NSLocationWhenInUseUsageDescription", "NSMotionUsageDescription"):
            if not str(info.get(key, "")).strip():
                errors.append(f"Missing {key}")
        try:
            firebase = plistlib.loads(archive.read(root + "GoogleService-Info.plist"))
            if firebase.get("BUNDLE_ID") != info.get("CFBundleIdentifier"):
                errors.append("Firebase bundle ID does not match the app")
            if not firebase.get("GOOGLE_APP_ID") or not firebase.get("API_KEY"):
                errors.append("Firebase configuration is incomplete")
        except KeyError:
            errors.append("Missing GoogleService-Info.plist (required by FirebaseApp.configure)")
        if root + "main.jsbundle" not in archive.namelist():
            errors.append("Missing release JavaScript bundle")
        if errors:
            raise ValueError("; ".join(errors))
        print(f"IPA configuration checks passed for build {info.get('CFBundleVersion')}")


if __name__ == "__main__":
    try:
        verify(sys.argv[1] if len(sys.argv) > 1 else "builds/astra.ipa")
    except (OSError, ValueError, KeyError, zipfile.BadZipFile) as error:
        sys.exit(f"IPA validation failed: {error}")
