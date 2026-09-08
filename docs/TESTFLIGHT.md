# Metora on TestFlight — step by step (from Windows)

Everything runs through EAS in the cloud; no Mac is needed. Budget about 60–90 minutes the first time, most of it waiting for Apple and the build.

Prerequisites: an **Apple Developer Program** membership (paid), the Apple ID that owns it, a **RevenueCat** account (free tier is fine), and an iPhone signed in to the App Store.

## 1. App Store Connect

1. Sign in at https://appstoreconnect.apple.com with the developer Apple ID.
2. **Agreements, Tax, and Banking** → accept the *Paid Apps* agreement and complete banking/tax. Without this, in-app purchases stay unavailable, even in TestFlight.
3. **Apps → + → New App**: platform iOS, name `Metora`, primary language English, bundle ID `com.metora.app` (create it under *Certificates, Identifiers & Profiles → Identifiers* if it is not offered), SKU `metora-ios`.
4. In the app → **Monetization → Subscriptions → +**: create a subscription group "Metora Pro" and an auto-renewable subscription with product ID `metora_pro_weekly`, duration **1 week**, price at the 4.99 tier. Under *Introductory Offers* add a **Pay up front** offer of **1 week** at the 0.49 tier (available to new subscribers). Add the English display name (`Metora Pro`), description and review screenshot. Status should read *Ready to Submit*.
5. **Users and Access → Integrations → In-App Purchase**: generate an *In-App Purchase* key. Download the `.p8` once and note the Key ID and Issuer ID — RevenueCat needs them in step 2.
6. **Users and Access → Sandbox → Testers → +**: create a sandbox Apple ID (any unused e-mail). You will sign in with it on the phone when the purchase sheet appears.

## 2. RevenueCat

1. https://app.revenuecat.com → create a project `Metora`.
2. **Apps → + New → App Store**: bundle ID `com.metora.app`. Upload the In-App Purchase key from step 1.5 (Key ID, Issuer ID, `.p8`). Copy the app's **public API key** (starts with `appl_`).
3. **Products → + New**: identifier `metora_pro_weekly`, App Store app.
4. **Entitlements → + New**: identifier `metora_pro`; attach product `metora_pro_weekly`.
5. **Offerings**: open `default`, add a package of type **Weekly** with product `metora_pro_weekly`, and make sure `default` is the *current* offering. The intro price is read from the App Store product automatically.

The app reads only this offering; the paywall shows whatever price the store returns.

## 3. EAS (once)

In the project folder on Windows:

```bash
npm install -g eas-cli
eas login                       # your Expo account (create one at expo.dev if needed)
```

The EAS project id is already set in `app.config.ts`. Copy `.env.example` to `.env`, then store the RevenueCat key on EAS so cloud builds get it:

```bash
eas env:create --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY --value appl_XXXXXXXX --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY --value appl_XXXXXXXX --environment development --visibility plaintext
eas env:create --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY --value appl_XXXXXXXX --environment preview --visibility plaintext
```

Also put the same key in `.env` for local commands.

## 3b. Testing on TestFlight before purchases are set up (QA bypass)

The `testflight` EAS profile sets `EXPO_PUBLIC_QA_BYPASS_PAYWALL=true` (see `eas.json`). In that build Metora skips the paywall, treats the lifetime entitlement as active and does **not** configure RevenueCat at all, so no API key is needed and nothing is sent to RevenueCat. Settings shows a yellow **QA TestFlight Build** notice so the build cannot be mistaken for a release.

```bash
npm run build:testflight
npm run submit:testflight
```

Everything except the purchase itself can be tested this way. The `production` profile (`npm run build:ios`) never defines the flag: it keeps the real RevenueCat / paywall behaviour and needs the App Store public key (`appl_…`).

RevenueCat's own **Test Store** (`test_` keys) is not an alternative for TestFlight: the native SDK deliberately crashes when such a key is used in a release build. Metora refuses those keys before the SDK sees them, but they only work in development builds.

## 4. Build for TestFlight

```bash
npm run build:ios
```

This runs `eas build --platform ios --profile production`. The first time EAS asks to log in to your Apple account, then creates the distribution certificate and App Store provisioning profile for you. Say yes to the prompts. The build takes 10–20 minutes; the link in the terminal shows progress.

## 5. Submit to TestFlight

```bash
npm run submit:ios
```

This runs `eas submit --platform ios --latest`. Choose the App Store Connect app created in step 1.3 when asked (EAS remembers it in `eas.json` afterwards). Apple processes the build for 5–30 minutes; you get an e-mail when it is ready.

In App Store Connect → **TestFlight**: add yourself under *Internal Testing* (a group with your own Apple ID). Answer the export-compliance question if asked (the app declares no non-exempt encryption, so it is usually skipped). Install **TestFlight** on the iPhone, accept the invitation, install Metora.

## 6. First run on the phone

- The paywall appears. Tap **Unlock Metora**; when the App Store sheet asks for a login, use the **sandbox tester** from step 1.6. Sandbox purchases are free.
- If the paywall says *Metora Lifetime is temporarily unavailable*: the RevenueCat key is missing from the EAS environment (step 3), or the offering/product is not set up (step 2), or the IAP is not *Ready to Submit* / agreements are not accepted (step 1).
- Then follow the **Phase 10 — device validation checklist** in the README.

## Iterating

After changes: `npm run build:ios` then `npm run submit:ios`. Build numbers increment automatically. For quicker internal builds that skip TestFlight processing, use `npm run build:dev` (development client, installable via the link EAS prints) — this still requires the RevenueCat key in the `development` environment.

## Before the real App Store submission (later)

- Replace the placeholder URLs in `src/config/links.ts` with live Privacy Policy and Terms pages.
- Fill in the App Privacy questionnaire: no data collected, purchases handled by Apple; RevenueCat receives purchase state only.
- Screenshots, description and keywords per the spec's App Store positioning.

## Retest: exported file format, dimensions and size

Build with `npm run build:testflight` and submit with `npm run submit:testflight`, install the new build from TestFlight, then:

1. Home → **Choose Photos** → pick the same JPEG as before (the one that came back as PNG 1086×1448).
2. Metadata → **Remove Metadata** → keep *Remove all metadata* → **Create Clean Copy**.
3. On **Done**, read the new **File details** card. *Original* and *Clean copy* must show the same format and dimensions, e.g. `JPEG · 1536 × 2048 · 612 KB` and `JPEG · 1536 × 2048 · 598 KB`. If *Original* already shows PNG or a smaller size, the picker delivered a re-encoded derivative (iCloud "Optimize Storage" photo); download the original in Photos first and repeat.
4. Tap **Save Copy**, then open Photos → the newest item → swipe up (or tap ⓘ): format JPEG, 1536×2048, size close to the clean-copy size on the Done card. No location, no camera line.
5. Repeat once with a HEIC photo: the saved item must still be HEIC.
6. Batch: pick 3 photos → **Clean 3 Photos** → **Save All Copies** → check one saved item as in step 4.

## Retest: onboarding and Pro gating

1. Fresh install (or delete the app first): the 4-page onboarding appears once. Skip or Get Started lands on Home. Relaunch: no onboarding.
2. Choose a photo → Metadata → Remove Metadata → Create Clean Copy: no paywall anywhere up to and including Done.
3. On Done tap **Save Copy** as a non-Pro user: the paywall modal opens. Tap **Not now**: back on Done, nothing saved.
4. Tap **Save Copy** again → **Start for …** (sandbox tester): after the purchase sheet completes, the paywall closes and the copy is saved without tapping again. Settings shows *Metora Pro — Active*.
5. Share from Done and Save All Copies in Batch behave the same way.
6. Restore Purchases with no purchase shows *No previous purchase found*; with an existing sandbox subscription it unlocks and resumes the export.
7. Intro eligibility: a sandbox Apple ID that already used the intro offer must see "Continue with Pro" and the weekly price only.
