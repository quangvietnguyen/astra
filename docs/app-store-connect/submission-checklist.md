# Submission checklist

## 1. Resolve blockers

- [ ] Fix the undefined zodiac/altitude text in the phase card.
- [ ] Complete the asset-rights audit.
- [ ] Fill every item in `required-inputs.md`.
- [ ] Confirm Firebase Analytics production data collection and GA4 retention settings.
- [ ] Verify the privacy declaration against the archived release binary's privacy report.

## 2. Publish required URLs

- [ ] Enable GitHub Pages from `docs/` or publish the HTML files elsewhere.
- [ ] Verify marketing, support, and privacy URLs without authentication.
- [ ] Confirm the support page shows a monitored contact email.

## 3. Create the App Store Connect record

- [ ] Create iOS app with bundle ID `com.nqv.astra` and SKU `ASTRA-IOS-001`.
- [ ] Add English (U.S.) name, subtitle, categories, copyright, and URLs.
- [ ] Complete Content Rights and the age-rating questionnaire.
- [ ] Complete DSA trader status and territory availability.
- [ ] Set price to Free and select manual release.

## 4. Privacy and compliance

- [ ] Enter and publish the App Privacy answers from `app-privacy.md`.
- [ ] Confirm tracking is No and IDFA is absent from the archived binary.
- [ ] Confirm `ITSAppUsesNonExemptEncryption` is false in the archive.
- [ ] Complete any account-level tax, banking, or agreements shown by App Store Connect.

## 5. Build and test

- [ ] Build a production iOS binary with the production EAS environment.
- [ ] Confirm `GOOGLE_SERVICE_INFO_PLIST` is available to the build.
- [ ] Test first launch, location allowed, location denied, date changes, Moon sizing, orbiter toggle, HUD show/hide, dynamic icon, background/foreground, iPhone, and iPad.
- [ ] Confirm there are no debug menus, placeholder strings, crashes, or clipped controls.
- [ ] Upload the build and complete TestFlight smoke testing.

## 6. Final product page

- [ ] Paste metadata from `metadata/en-US/` and recheck character limits.
- [ ] Capture final screenshots from the signed build and replace preview assets.
- [ ] Add App Review contact details and notes from `review-notes.md`.
- [ ] Select the uploaded build.
- [ ] Review the product-page preview and privacy-label preview.
- [ ] Submit manually only after all checklist items pass.

