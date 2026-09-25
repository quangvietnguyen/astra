# App Privacy questionnaire

These answers describe the current iOS build with Google Analytics for Firebase enabled and advertising-ID support disabled.

## Initial question

**Do you or your third-party partners collect data from this app?** Yes.

## Data types to declare

| App Store data type | Purpose | Linked to the user | Used for tracking | Repository basis |
| --- | --- | --- | --- | --- |
| Location → Coarse Location | Analytics | Yes, conservatively, because Analytics associates events and approximate geography with an app-instance identifier | No | Google Analytics derives approximate geography; Astra does not send GPS coordinates or city names in events |
| Identifiers → Device ID | Analytics | Yes | No | Firebase creates an app-instance identifier and may use IDFV when IDFA is unavailable |
| Usage Data → Product Interaction | Analytics | Yes | No | Moon size, orbiter visibility, date exploration, and HUD visibility events |
| Usage Data → Other Usage Data | Analytics | Yes | No | Automatically collected session statistics and app activity |
| Diagnostics → Other Diagnostic Data | App Functionality; Analytics | No | No | Firebase transport metadata such as cached/dropped event counts |

Use the conservative “linked” answers above because Analytics events are associated with a pseudonymous app-instance/device identifier even though Astra has no user accounts and does not set a custom user ID.

## Do not declare on current evidence

- Precise Location: used in memory for app functionality, but not sent in Astra's analytics payloads or stored by an Astra server.
- Contact Info: no account, email, name, phone, or address collection.
- User ID: no login and no custom analytics user ID.
- Purchases or Financial Info: none.
- User Content, Browsing History, Search History, Contacts, Health, Fitness, Sensitive Info: none.
- Advertising Data: no ads and iOS advertising-ID support is disabled.
- Crash Data or Performance Data: Firebase Crashlytics and Firebase Performance are not installed.

## Tracking

Answer **No** to tracking. The app has no advertising SDK, does not use IDFA, does not combine Astra data with third-party data for targeted advertising, and does not share data with data brokers.

## Location processing distinction

Astra requests foreground location and receives latitude, longitude, altitude, accuracy, and a best-effort place name from the operating system. The values are held in application memory and shown in the UI. Coordinates are used to adjust the lunar view. The app has no developer-operated backend and does not include precise location or city in Firebase Analytics events.

Before publishing the answers, compare them with the privacy report in the archived release build and Firebase's current Apple data-disclosure documentation.

