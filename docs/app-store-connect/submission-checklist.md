# App Store submission checklist

## A. Complete the record and compliance

- [ ] Create an iOS app record with bundle ID `com.nqv.astra`, primary language English (U.S.), and unique SKU `ASTRA-IOS-001`.
- [ ] Confirm listing name availability, category, copyright owner, price, and territories.
- [ ] Complete the age-rating questionnaire; review Apple's calculated result.
- [ ] Finish the image/texture rights audit before answering Content Rights.
- [ ] Complete the account holder's DSA trader-status declaration.
- [ ] Publish and verify public privacy and support pages and optional marketing page. Replace the old URLs in `metadata/en-US/*.txt` with the final verified URLs.
- [ ] Complete App Privacy against the exact release archive and all third-party SDK collection. Keep the privacy policy and App Store labels consistent.
- [ ] Confirm export-compliance answers against the archived binary and its dependencies.

## B. Build and verify the iOS release candidate

The repo's production command is `pnpm run eas:build:ios:prod`. It starts an EAS production build and increments the remote build number; it does **not** submit by itself. Avoid the script ending `:submit` unless you explicitly intend it to auto-submit. Production credentials and App Store Connect configuration are involved; do not print or commit private key files.

- [ ] Resolve Firebase Analytics configuration deliberately. The checked-in config has no `GoogleService-Info.plist` / `ios.googleServicesFile`, and the app has previously reported `NativeRNFBTurboApp is not registered`. Decide whether analytics belongs in this release; verify initialization and privacy reporting in the exact production archive.
- [ ] Build with the production profile, install the resulting archive through TestFlight, and inspect on physical iPhone and iPad.
- [ ] Verify cold launch and resume; location allowed and denied; current date and timeline drag; TODAY reset; zoom; TIDAL LOCK; SATELLITE; expand/collapse; iPad portrait and landscape.
- [ ] Confirm no native module errors, crashes, debug UI, placeholder/undefined text, or clipped interface.
- [ ] Check export-compliance questions shown after the build is uploaded; resolve any documentation request.
- [ ] Verify no private location appears in screenshots or analytics payloads.

## C. Upload assets and version metadata

- [ ] Upload final native screenshots for iPhone and iPad; the repository previews are mockups and are not store screenshots.
- [ ] Paste English (U.S.) metadata from `metadata/en-US/` and review the product-page preview and text limits.
- [ ] Enter a valid copyright value and published URLs.
- [ ] Add App Review contact details and notes from `review-notes.md`.
- [ ] Select the production build for version `1.0.0`.
- [ ] Review app privacy label preview, rating, territories, and price.

## D. Review and release

- [ ] In App Store Connect, click **Add for Review**, inspect the draft submission, then click **Submit for Review** when ready. See [Apple's submission flow](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app).
- [ ] Respond to App Review questions or requests.
- [ ] After approval, manually release if that option was selected; otherwise Apple releases according to the selected setting.
