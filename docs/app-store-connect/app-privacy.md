# App Privacy: release-build decision worksheet

**Finding: Astra is configured to collect Analytics data. Do not answer “No, we do not collect data” for the current iOS configuration.** The repository has no built `.ipa`/`.xcarchive` to inspect, so this is a source/configuration finding rather than a packet capture from a particular release build. Apple requires disclosures for Astra and third-party partners. A `PrivacyInfo.xcprivacy` manifest is not a substitute for the App Store Connect privacy questionnaire. [Apple: Manage app privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy)

## Evidence from this repository

- `@react-native-firebase/analytics` and `@react-native-firebase/app` are dependencies and are present in the iOS native dependency lockfile. The iOS `AppDelegate` calls `FirebaseApp.configure()`.
- The Xcode project includes the root `GoogleService-Info.plist`; that local file is ignored by Git, but `.easignore` explicitly re-includes it for EAS upload. The file identifies bundle ID `com.nqv.astra` and has an Analytics-related flag set false.
- **That false flag does not establish Analytics is disabled.** The resolved Firebase Apple SDK is 12.19.2. Its current collection controls are `IS_MEASUREMENT_ENABLED`, `FIREBASE_ANALYTICS_COLLECTION_ENABLED`, and `FIREBASE_ANALYTICS_COLLECTION_DEACTIVATED`; the local file has none of those keys. The iOS app Info.plist has no Firebase collection override, the project has no `firebase.json`, and the app code does not call `setAnalyticsCollectionEnabled(false)`. Firebase's iOS SDK defaults data collection to enabled when no disabling value is supplied. See [Firebase collection controls](https://firebase.google.com/docs/analytics/ios/configure-data-collection) and the [Firebase SDK configuration logic](https://github.com/firebase/firebase-ios-sdk/blob/main/FirebaseCore/Sources/FIRApp.m).
- The app code logs custom events for Moon-size selection, satellite visibility, date exploration, and timeline visibility. Payloads include user preferences, selected phase, date-change direction/source, and coarse date-offset values. They do not include GPS coordinates, city, account name, or a developer-defined user ID.
- A previous run reported `NativeRNFBTurboApp is not registered`; the JS wrapper skips custom events when the native module is missing. That error can mean that particular development runtime lacks the native module. It does not undo the native Firebase linkage in the iOS project or prove the production archive disables Firebase's own collection.
- The app requests foreground location. `locationService.js` gets coordinates and a best-effort place name; the UI uses them to adjust/show the local view. The repo shows no app-operated backend and no precise location in custom Analytics event payloads.
- `ios/Astra/PrivacyInfo.xcprivacy` currently has an empty collected-data array and tracking set to false. This manifest concerns Apple's privacy manifest requirements and SDK API declarations; it does not establish that Firebase Analytics collects nothing.

## Recommended App Store Connect answers for this configuration

For the first question, select **Yes, we collect data from this app**. Based on the app code and Firebase Analytics behavior, disclose these data types. Firebase says Analytics assigns an app-instance ID, derives general location from masked IP addresses, and automatically measures lifecycle events; the app also sends its own interaction events. Apple's category definitions and final handling answers remain the developer's responsibility. [Google Analytics disclosure guide](https://support.google.com/analytics/answer/10285841), [Apple data types](https://developer.apple.com/go/?id=info-1)

| App Store Connect data type | Purpose | Linked to the user | Used for tracking | Why |
| --- | --- | --- | --- | --- |
| Location → Coarse Location | Analytics | Yes | No | Firebase Analytics derives general location from IP; custom events are associated with the Firebase app-instance ID. |
| Identifiers → Device ID | Analytics | Yes | No | Firebase assigns an app-instance ID to measure users and associate events across an installation. Do not list it as an account/User ID; Astra has no accounts or custom user ID. |
| Usage Data → Product Interaction | Analytics | Yes | No | Firebase lifecycle/session events plus Astra's Moon-size, satellite, date, and timeline visibility events. |
| Usage Data → Other Usage Data | Analytics | Yes | No | Astra sets per-install preference properties for Moon size and satellite visibility. |
| Diagnostics → Other Diagnostic Data | Analytics | Yes (conservative) | No | The installed Firebase GoogleDataTransport dependency reports event-cache/drop metadata. |

For each row, mark **tracking No** unless the Firebase project is linked to ad measurement/targeted advertising or its data is shared for those purposes. No such use appears in the app repository, but Google Analytics project settings are outside this repo and must be checked. Apple defines tracking as linking app data with third-party data for targeted advertising/ad measurement or sharing with a data broker; Analytics collection by itself does not automatically mean Apple's tracking answer is Yes. [Apple tracking definition](https://developer.apple.com/app-store/user-privacy-and-data-use/)

Do **not** select Contact Info, User ID, Precise Location, Purchases, Advertising Data, Crash Data, or Performance Data based on the Firebase/app behavior identified here. Astra's custom Analytics events do not transmit GPS coordinates or city names; the app uses optional foreground location for its local view and calls the iOS geocoder to get a place name. Revisit the location answer if the release build or chosen geocoding/analytics provider sends or retains precise location beyond Apple's real-time-processing exception.

These answers are source-grounded but should be checked against the exact archive's SDK inventory and the Firebase project's Analytics/Google Ads/data-sharing settings before publishing the privacy label.

## Before answering the first App Privacy question

1. Build the intended production archive and install that exact build on a physical iPhone/iPad.
2. Resolve whether Firebase Analytics is intentionally included. Verify the native module registers, the Firebase configuration is bundled, events appear in the intended Firebase project, and no startup/interaction errors occur. If analytics is not intended, remove/disable it in a deliberate release change before declaring no collection.
3. Inspect the archive's App Privacy Report / privacy manifest, linked frameworks, Firebase SDK version disclosures, and any privacy labels or disclosures generated by the SDK/vendor. Verify automatic collection and identifier behavior against Google's current [Firebase Analytics privacy documentation](https://firebase.google.com/docs/analytics/configure-data-collection).
4. Decide whether the final answer is **Yes** or **No** for data collected by Astra or its partners. If Yes, disclose each applicable data type and mark purposes, linkage, and tracking according to the actual configuration. Consider Analytics events, app/device identifiers, product interaction, approximate location inferred by vendor, diagnostics, and device/OS data only when the release SDK actually collects them.
5. Declare precise location as collected only if it is transmitted off device or otherwise collected under Apple's definitions; confirm SDK/platform behavior rather than relying only on custom event payloads. A location permission prompt by itself does not decide this answer.
6. Confirm Tracking and IDFA status from the archive and SDK setup. Do not claim tracking is absent solely because the app has no ads.
7. Make the privacy policy, App Store Connect answers, and the binary agree. Publish the answers in App Store Connect after review.

## Known app behavior for the policy

If these behaviors remain true in the release build, the policy should explain:

- Foreground location is optional. With permission, Astra reads latitude, longitude, altitude, accuracy, and a best-effort place name for the local lunar view and on-screen location status. The app remains usable without it.
- Custom Analytics events contain UI choices and date/phase exploration, not precise coordinates or city names. Firebase can have automatic collection separate from these custom events; disclose the actual SDK categories after checking the archive and vendor labels.
- There is no account sign-in, in-app purchase, subscription, advertising, or developer-operated account backend in the current app.

The existing draft privacy page describes Firebase collection. Keep that language only if Analytics is in the archive and the configured behavior matches it. The no-collection alternative requires updating the policy too.
