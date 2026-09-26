# Local iOS build and TestFlight upload

These commands build the iOS app on macOS, following the workflow in `../dwast`.
They do not build a native macOS app.

## Commands

```bash
# Build locally, then upload only if the build succeeds
pnpm run eas:build:local:ios:submit

# Build only: writes builds/astra.ipa
pnpm run eas:build:local:ios

# Upload the existing builds/astra.ipa without rebuilding
pnpm run transporter:upload:ios
```

These command names match `dwast`; Astra writes `builds/astra.ipa`.

## Requirements and behavior

- Use a Mac with Xcode, CocoaPods, Node, pnpm, and an authenticated EAS CLI.
- The production EAS profile uses remote signing credentials and increments the
  build number. Apple login is optional when the saved signing credentials are valid.
- Local builds set `EXPO_NO_KEYCHAIN=1` to bypass Apple ID password storage in
  Keychain. Native code signing still uses a temporary keychain.
- Keep native settings in `ios/` up to date. With this directory present, EAS
  does not apply Expo config plugins through prebuild automatically.

## Upload authentication

The uploader follows `dwast`: it invokes `xcrun altool --upload-app`, rather than
opening the Transporter GUI. It first looks for an App Store Connect API key in
`secrets/AuthKey_*.p8`. Set `EXPO_ASC_API_KEY_PATH`, `EXPO_ASC_KEY_ID`, and
`EXPO_ASC_ISSUER_ID` explicitly when using a different key or account.

Alternatively, set `APPLE_ID` and `APP_STORE_CONNECT_PASSWORD` to an Apple ID and
its app-specific password. Without either local credential method, the script
falls back to EAS Submit and its credential prompts.

Upload completion does not mean TestFlight processing or review has completed.
Check the build in App Store Connect after processing; purpose-string fixes
require a newly built IPA.

The upload command validates the IPA before contacting Apple. It rejects missing
Firebase client configuration, mismatched Firebase bundle IDs, missing scene
lifecycle configuration, missing location or motion purpose strings, and a
missing release JavaScript bundle. This check
requires Python 3 and does not replace a device launch test. Run it separately:

```bash
python3 scripts/verify-ios-ipa.py builds/astra.ipa
```

For iPad, the packaged app must declare `UIDeviceFamily: [1, 2]`, as well as
portrait and landscape orientations, and `UIRequiresFullScreen: true`.
`ios.supportsTablet` in `app.json` alone
does not update a checked-in Xcode project. Both native app configurations must
set `TARGETED_DEVICE_FAMILY = "1,2"`; the IPA validator rejects iPhone-only builds.
After changing this setting, rebuild and install the new binary. A JavaScript
reload or update cannot change the installed app's device family.

Check native configuration consistency before building:

```bash
node --test scripts/ipad-support.test.cjs scripts/ios-scene-plugin.test.cjs
```

The native Xcode target bundles the root `GoogleService-Info.plist`. Keep this
file available locally; `.easignore` includes it in build archives while Git
continues to ignore it. Signing keys and the `secrets/` directory remain excluded.
