# Astra App Store Connect submission package

This directory contains the paste-ready English (U.S.) metadata, compliance answers, review notes, public policy pages, and screenshot plan for Astra 1.0.0.

## Package contents

- `metadata/en-US/`: App Store product-page text.
- `app-information.md`: App record, category, pricing, rights, encryption, and release settings.
- `app-privacy.md`: App Privacy questionnaire answers derived from the current code and Firebase Analytics configuration.
- `age-rating.md`: Recommended age-rating questionnaire answers.
- `review-notes.md`: Paste-ready App Review notes and testing path.
- `asset-rights.md`: Content-rights audit that must be completed before submission.
- `screenshots/`: Required sizes, shot list, and preview captures.
- `privacy.html`, `support.html`, `index.html`: Host-ready pages for the required URLs.
- `required-inputs.md`: Account-holder details and decisions that cannot be inferred from source code.
- `submission-checklist.md`: Ordered App Store Connect workflow.

## Proposed public URLs

If GitHub Pages is enabled from the repository's `docs/` directory, use:

- Marketing: `https://quangvietnguyen.github.io/expo-globle-screen/app-store-connect/`
- Support: `https://quangvietnguyen.github.io/expo-globle-screen/app-store-connect/support.html`
- Privacy: `https://quangvietnguyen.github.io/expo-globle-screen/app-store-connect/privacy.html`

Verify all three URLs in a private browser window before entering them in App Store Connect. They are not live merely because these files exist in the repository.

## Current release status

The metadata and policy copy are ready for review. Submission is not yet ready because:

1. The legal copyright owner and App Review phone number are missing.
2. The bundled image/texture licenses are not documented in the repository.
3. Final screenshots must be captured from the signed release build.
4. The current UI preview shows `undefined • undefined° Altitude` in the phase card.
5. The account holder must declare DSA trader status and confirm distribution territories.

## Authoritative references

- [App information](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information)
- [Platform version information](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information)
- [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)
- [Manage app privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy)
- [Age ratings](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions)
- [Export compliance](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance)
- [EU Digital Services Act trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements)

