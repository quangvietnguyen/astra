# App record and version fields

Use these as proposed values, then confirm editable/account-specific fields in App Store Connect. Apple locks the bundle ID after a build is uploaded and requires the app name to be 30 characters or fewer. [App information reference](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information)

## Create the iOS app record

| App Store Connect field | Repository value / recommendation |
| --- | --- |
| Platforms | iOS (the binary supports iPhone and iPad) |
| Name | `Astra: Moon Phase 3D` (availability is not checked; <=30 characters) |
| Primary language | English (U.S.) |
| Bundle ID | `com.nqv.astra` (must match the uploaded build) |
| SKU | `ASTRA-IOS-001` (internal unique value; confirm it is unused in your account) |
| User access | Full Access, unless the app should be restricted to particular users |

The installed display name is `Astra`; the App Store listing name is independently proposed above. App version in `app.json` is `1.0.0`. EAS uses a remote app-version source and automatically increments production build numbers.

## App Information fields

| Field | Proposed value |
| --- | --- |
| Subtitle | `Live Lunar Sky & LRO` (<=30 characters) |
| Primary category | Education (astronomy is an Apple example) |
| Secondary category | Reference, optional |
| Age rating | Answer the current questionnaire in [`age-rating.md`](age-rating.md); Apple calculates the result |
| Made for Kids | No; Astra is not designed or marketed as a Kids Category app |
| Content Rights | **Do not select until** [`asset-rights.md`](asset-rights.md) confirms rights for all bundled visual assets in every selected storefront |
| License Agreement | Apple's standard EULA unless you provide your own reviewed agreement |
| Copyright | `2026 [LEGAL COPYRIGHT OWNER]` — replace with the legal person/entity that owns the app |

Category and Kids status are product/account decisions, not repository facts. Apple requires the rights holder to have rights to third-party content in each selected territory.

## Version 1.0.0 fields

Paste English (U.S.) values from [`metadata/en-US/`](metadata/en-US/). For convenience, the proposed URLs are below; **use only after publishing and testing the pages publicly**:

| Field | Proposed value |
| --- | --- |
| Marketing URL (optional) | `https://quangvietnguyen.github.io/landings/astra/` |
| Support URL (required) | `https://quangvietnguyen.github.io/support/astra/` |
| Privacy Policy URL (required) | `https://quangvietnguyen.github.io/privacy/astra/` |
| Privacy Choices URL (optional) | Leave blank unless you provide a public page for privacy requests/choices |
| Copyright | `2026 [LEGAL COPYRIGHT OWNER]` |
| What's New | Not applicable to the first version; for a later update, summarize changes in that release |
| App Review contact | Use the real first/last name, monitored email, and reachable phone in [`review-notes.md`](review-notes.md) |

The metadata files now contain these proposed URLs, but URL availability has not been verified from this workspace. Do not submit them until the pages have been deployed and load publicly without authentication.

## Price, territories, release

Suggested initial setup (confirm in your account):

- Price: Free; no in-app purchases, subscriptions, or paid features were found in this repository.
- Availability: choose the countries/regions where you have distribution rights and are ready to provide support/compliance. Worldwide is only a suggestion, not a repo fact.
- Pre-order: No recommendation for this initial release.
- Version release: Manually release after approval if you want launch timing control; otherwise choose automatic release.
- Phased release: optional for an update; not needed for an initial launch.

## Export compliance

`app.json` sets `ITSAppUsesNonExemptEncryption` to `false`. Treat that as a project declaration, not legal confirmation. Inspect the final archive and answer Apple's export compliance prompts based on all encryption included/used by the app and its dependencies. Follow Apple's [export compliance guidance](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance); if App Store Connect requests documentation, resolve it before submission.

## Other declarations to check

- Sign-in: none found; no demo account is needed.
- Ads / in-app purchases / subscriptions: none found in app code/configuration.
- Tracking: no advertising behavior is evident in app code, but verify the release archive and third-party SDK behavior before declaring.
- Regulated medical device: not applicable based on current app functionality; it is a lunar visualization, not a medical tool.
- DSA trader status: required account-holder declaration; see [`required-inputs.md`](required-inputs.md). A trader distributing in the EU has further public-contact requirements.
