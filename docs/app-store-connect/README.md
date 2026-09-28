# Astra App Store Connect release packet

This packet maps the current Astra repository to the App Store Connect fields for an iOS release. It is a preparation guide; no build has been uploaded and no release has been submitted.

## Ready-to-use metadata

The English (U.S.) product-page text is in [`metadata/en-US/`](metadata/en-US/). Current suggestions: **Astra: Moon Phase 3D**, subtitle **Live Lunar Sky & LRO**, free download, no in-app purchases, and a manual release after approval. Names, categories, price, and distribution remain account-holder decisions. Check all limits and product accuracy before pasting.

## Do these before creating the submission

1. Complete [`required-inputs.md`](required-inputs.md), especially legal owner, reviewer contact, rights to image/texture assets, distribution countries, and EU trader status.
2. Publish working public HTTPS marketing, support, and privacy pages, then verify them without signing in. The URLs in the metadata files are **not verified as live**. Use the intended pages `https://quangvietnguyen.github.io/landings/astra/`, `https://quangvietnguyen.github.io/support/astra/`, and `https://quangvietnguyen.github.io/privacy/astra/` only after those pages have actually been published and checked.
3. Produce and inspect a production archive. The repo has React Native Firebase Analytics code, but no checked-in `GoogleService-Info.plist` or `ios.googleServicesFile` setting was found. A previous runtime also reported `NativeRNFBTurboApp is not registered`. This does not establish what a new archive collects. Resolve the native Firebase setup and test analytics in the exact archive, then complete [`app-privacy.md`](app-privacy.md) from the archive's privacy report and SDK disclosures.
4. Capture genuine screenshots from the tested iOS build for iPhone and iPad. The existing `screenshots/previews/` images are composition mockups, not submission screenshots.
5. Complete the content-rights audit in [`asset-rights.md`](asset-rights.md). Do not answer Content Rights until every bundled asset is cleared for the countries selected.

## What's in this packet

- [`app-information.md`](app-information.md): app record, categories, price, rights, and release fields.
- [`metadata/en-US/`](metadata/en-US/): proposed U.S. English text.
- [`app-privacy.md`](app-privacy.md): privacy decision guide and release-build verification requirements.
- [`age-rating.md`](age-rating.md): recommended content questionnaire answers to verify against the final app.
- [`review-notes.md`](review-notes.md): current review instructions and reviewer contact placeholders.
- [`screenshots/README.md`](screenshots/README.md): capture requirements and shot plan.
- [`required-inputs.md`](required-inputs.md): facts the repository cannot supply.
- [`asset-rights.md`](asset-rights.md): outstanding image and texture provenance.
- [`submission-checklist.md`](submission-checklist.md): build, upload, TestFlight, and submission steps.

## Suggested release sequence

Create an iOS app record for bundle ID `com.nqv.astra`, finish the legal/privacy/assets fields, upload a production build to App Store Connect, verify it in TestFlight, complete the version page and screenshots, then use **Add for Review** and **Submit for Review** when everything is ready. Choose manual release if you want to decide when an approved version becomes available. Apple requires the build and required metadata before submission; see [Apple's submit flow](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app).

## Apple references

- [App information](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information)
- [Version metadata and field limits](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/)
- [Screenshot upload and specifications](https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots/)
- [App Privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy)
- [Age rating questionnaire](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating)
- [Export compliance](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance)
- [EU Digital Services Act trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements)
