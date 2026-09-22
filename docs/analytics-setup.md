# GA4 and Firebase Analytics setup

Astra records pseudonymous, aggregated product interactions through Google Analytics for Firebase. The app does not send GPS coordinates, city names, free-form text, email addresses, or a custom user ID.

## Events

| Event | Product question | Parameters |
| --- | --- | --- |
| `moon_size_selected` | Which Moon size is selected most often? | `scale_percent`, `size_bucket`, `selection_method`, `moon_phase` |
| `orbiter_visibility_changed` | Do users keep the NASA LRO orbiter enabled? | `orbiter_enabled`, `moon_phase` |
| `date_offset_changed` | How far into the past or future do users explore? | `change_direction`, `jump_days`, `offset_bucket`, `change_source`, `moon_phase` |
| `hud_visibility_changed` | Do users keep the telemetry HUD visible? | `hud_visible`, `change_source` |

The app also updates the low-cardinality user properties `moon_size_preference` and `orbiter_preference`. Firebase still creates an app-instance identifier and automatically collects standard device, session, and approximate-geography data. iOS advertising-ID support is disabled in `app.config.js`.

## 1. Create and link GA4

1. In the [Firebase console](https://console.firebase.google.com/), create a Firebase project or open the project for Astra.
2. Enable Google Analytics during project creation. For an existing project, use **Project settings → Integrations → Google Analytics → Link** and create or select a GA4 property.
3. Register the iOS app with the exact, case-sensitive bundle ID `com.nqv.astra`.
4. Download `GoogleService-Info.plist` and save it locally as `GoogleService-Info.plist` (the ignored `secrets/GoogleService-Info.plist` path is also supported).
5. If EAS or GitHub Actions will build Android or `all`, also register Android package `com.nqv.astra`, download `google-services.json`, and save it as `secrets/google-services.json`.

Both the `secrets/` paths and the standard repository-root filenames are ignored by Git. Do not commit them.

## 2. Configure EAS cloud builds

The GitHub Actions workflow delegates compilation to EAS Build. Store the files in the EAS project environment; no duplicate GitHub repository secret is needed.

```bash
pnpm exec eas env:set \
  --name GOOGLE_SERVICE_INFO_PLIST \
  --value ./GoogleService-Info.plist \
  --type file \
  --visibility secret \
  --environment development \
  --environment preview \
  --environment production
```

If the pipeline builds Android or `all`, also run:

```bash
pnpm exec eas env:set \
  --name GOOGLE_SERVICES_JSON \
  --value ./secrets/google-services.json \
  --type file \
  --visibility secret \
  --environment development \
  --environment preview \
  --environment production
```

Verify the variable names without printing their contents:

```bash
pnpm exec eas env:list --environment production
```

The `environment` fields in `eas.json` bind each build profile to the matching EAS environment. `app.config.js` reads the cloud file paths during remote builds.

## 3. Build locally on iOS

EAS secret file variables are not available to `eas build --local`, so keep the downloaded plist at `GoogleService-Info.plist` or `secrets/GoogleService-Info.plist`. The dynamic app config uses either path as a local fallback.

React Native Firebase contains native code and does not work in Expo Go. After adding or changing Firebase native dependencies, create a clean native build:

```bash
pnpm exec expo prebuild --clean --platform ios
pnpm ios
```

For a signed local production IPA, use the existing command:

```bash
pnpm run eas:build:local:ios
```

Current React Native Firebase releases also require the Xcode and macOS versions documented in its installation guide. A successful JavaScript/web build does not prove that the native Firebase SDK is configured; test a rebuilt iOS binary.

## 4. Verify events

1. In Xcode, edit the Astra scheme and add `-FIRDebugEnabled` under **Arguments Passed On Launch**.
2. Run the rebuilt app and change the Moon size, toggle the orbiter, change dates, and hide/show the HUD.
3. Open **Firebase Console → Analytics → DebugView**. The events should appear within seconds.
4. Remove the launch argument or use `-FIRDebugDisabled` after testing.

## 5. Make parameters reportable in GA4

In **GA4 → Admin → Data display → Custom definitions**, create event-scoped custom dimensions for these event parameters:

- `scale_percent`
- `size_bucket`
- `selection_method`
- `moon_phase`
- `orbiter_enabled`
- `change_direction`
- `jump_days`
- `offset_bucket`
- `change_source`
- `hud_visible`

Create user-scoped custom dimensions for:

- `moon_size_preference`
- `orbiter_preference`

Custom definitions are not retroactive and commonly take 24–48 hours to become available in standard reporting.

Useful explorations:

- Moon size: filter `event_name = moon_size_selected`, use `scale_percent` as rows, and `Event count` as values.
- Orbiter interest: filter `event_name = orbiter_visibility_changed` and compare `orbiter_enabled`. This measures explicit interactions, not passive viewing.
- Date exploration: filter `event_name = date_offset_changed` and compare `offset_bucket`.

## Privacy and release checklist

- Update the privacy policy to describe Firebase Analytics and the product-interaction events.
- Review App Store Connect **App Privacy** before the next submission. Firebase Analytics collects an app-instance identifier plus usage, device, session, and approximate-geography data by default.
- Do not add coordinates, city, email, names, or other high-cardinality personal data to analytics parameters.
- The integration excludes iOS advertising-ID support. If advertising attribution or cross-app tracking is added later, reassess App Tracking Transparency and consent requirements before release.

## Primary references

- [Firebase Analytics for Apple platforms](https://firebase.google.com/docs/analytics/ios/get-started)
- [Add Firebase to an Apple project](https://firebase.google.com/docs/ios/setup)
- [React Native Firebase with Expo](https://rnfirebase.io/#expo)
- [React Native Firebase Analytics](https://rnfirebase.io/analytics/usage)
- [Expo EAS environment variables](https://docs.expo.dev/eas/environment-variables/manage/)
- [Expo local EAS builds](https://docs.expo.dev/build-reference/local-builds/)
- [Firebase Analytics DebugView](https://firebase.google.com/docs/analytics/debugview)
- [GA4 event-scoped custom dimensions](https://support.google.com/analytics/answer/14239696)
- [Apple user privacy and data use](https://developer.apple.com/app-store/user-privacy-and-data-use/)
