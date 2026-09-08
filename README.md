# Metora

See what is hidden in your photos. Remove it before you share.

Metora is a small privacy utility for iPhone: pick a photo, see the metadata embedded in it, remove what you choose, and save or share a clean copy. The original is never modified. Everything runs on the device.

- **Stack:** React Native · Expo SDK 57 · TypeScript (strict) · Expo Router
- **Developed on:** Windows. iOS builds are produced in the cloud with EAS Build.
- **Specification:** `METORA_REACT_NATIVE_BUILD_SPEC.md` (behaviour and exact English copy)
- **Visual reference:** `metora-design-board.png` (layout only; its Dutch labels are never used)

## Product model (current direction)

- **Onboarding** (4 pages: problem, solution, result, trust) on first launch only; the completion flag is stored in AsyncStorage (`metora.onboarding.v1`) and can be reset from Settings in development builds.
- **Free to inspect and clean**: choosing a photo, reading its metadata, picking what to remove (multi-select) and creating the verified clean copy never show a paywall.
- **Metora Pro gates export only**: Save Copy, Share and Batch → Save All Copies go through `ExportGateProvider.requirePro`. Non-Pro users see the paywall modal; after a purchase or restore the blocked action resumes automatically. Dismissing the paywall keeps the user on the Done screen.
- **Subscription**: weekly auto-renewing Pro (`metora_pro_weekly`, RevenueCat entitlement `metora_pro`, offering `default`) with a 7-day introductory price. The paywall renders the store's localized prices: "Start for {intro}" + "{duration} for {intro}, then {price}/week" when RevenueCat confirms intro eligibility, otherwise "Continue with Pro" + "{price}/week". Renewal terms, Restore Purchases, Terms and Privacy are always shown.

## Status

Built phase by phase, with a review after each. Phases 1–9 are implemented. Phase 10 is the on-device release validation.

| Phase | Scope | State |
|---|---|---|
| 1 | Project foundation: theme tokens, tab shell, all design-board screens | Done |
| 2 | Purchases: RevenueCat service, hard paywall, entitlement gate, restore, EAS config | Done |
| 3 | Photo selection: system picker, single/multiple selection, previews, temporary workflow | Done |
| 4 | Metadata inspection: ExifReader, normalization, Metadata Detail UI, privacy warning | Done |
| 5 | Cleaning engine: container-level metadata rewriter for JPEG/PNG/HEIC, all four modes, post-export verification | Done |
| 6 | Save and Share: add-only save to Photos, share sheet, Done actions, haptics | Done |
| 7 | Batch: sequential queue, per-photo status, summary, Retry Failed, Save All | Done |
| 8 | Recent (sanitized local activity log, Clear History) and minimal Settings | Done |
| 9 | Polish: accessibility, Dynamic Type limits, Reduce Motion, haptics, launch, not-found | Done |
| 10 | iOS release validation: EAS production build, TestFlight, device tests | Next (device-only) |

## Setup

Requirements: Node.js 22 LTS, npm.

```bash
npm install
cp .env.example .env        # then fill in the values below
```

### Environment variables

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | RevenueCat public App Store key (`appl_…`). Bundled into the app. Required for purchases on iOS. |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` | Optional; only if an Android build is ever made. |

`.env` is git-ignored. For cloud builds, store the same values on EAS: `eas env:create --name EXPO_PUBLIC_REVENUECAT_IOS_API_KEY --value appl_… --environment development` (repeat for `preview` and `production`).

## Everyday commands

```bash
npm run typecheck      # tsc --noEmit
npm run lint           # expo lint
npm test               # jest (138 tests)
npm run web            # local web preview at http://localhost:8081
npm run export:web     # static web build in dist/  (serve it with: npx expo serve --port 8099)
npx expo-doctor        # dependency/config health check
```

### Local web preview on Windows

Most UI can be checked in a browser. Differences from iOS to keep in mind:

- Purchases use an in-memory stub (`PreviewPurchaseService`): "Unlock Metora" unlocks until the page reloads. It is never used on iOS or Android.
- The picker is the browser file input; the app reads the chosen file directly instead of copying it into the cache.
- Native bottom tabs are replaced by a web tab bar; SF Symbols fall back to Material Symbols.

Screenshots of each phase's verification live in `docs/screenshots/`.

## TestFlight

Step-by-step from Windows, including App Store Connect, RevenueCat and EAS: see [docs/TESTFLIGHT.md](docs/TESTFLIGHT.md). Short version once everything is configured:

```bash
npm run build:ios      # eas build --platform ios --profile production
npm run submit:ios     # eas submit --platform ios --latest
```

### QA TestFlight build (paywall bypass)

`npm run build:testflight` uses the `testflight` profile, which sets `EXPO_PUBLIC_QA_BYPASS_PAYWALL=true`. That build skips the paywall, never configures RevenueCat, and shows a **QA TestFlight Build** notice in Settings. It exists only so the app can be tested on a physical iPhone before App Store Connect purchases are configured. The `production` profile never sets the flag. Details in [docs/TESTFLIGHT.md](docs/TESTFLIGHT.md).

## iOS development build (EAS)

Real StoreKit purchases and the native photo picker need a development build on a physical iPhone. Expo Go cannot run RevenueCat.

```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile development    # installable dev client (internal distribution)
eas build --platform ios --profile preview        # internal test build
eas build --platform ios --profile production     # App Store build (auto-incrementing build number)
```

Profiles are defined in `eas.json`. The app config (`app.config.ts`) sets bundle id `com.metora.app`, portrait only, light appearance, and the honest photo-library purpose string used by the picker.

### RevenueCat and App Store Connect

| Item | Value |
|---|---|
| App Store product (non-consumable) | `metora_lifetime` |
| RevenueCat entitlement | `metora_pro` |
| RevenueCat offering | `default` (the paywall renders whatever offering RevenueCat marks *current*) |
| Bundle identifier | `com.metora.app` |

1. App Store Connect: create the app and a non-consumable in-app purchase `metora_lifetime` at the 9.99 tier.
2. RevenueCat: create the project and iOS app, add the product, attach it to entitlement `metora_pro`, add it as the lifetime package of the `default` offering, and mark that offering current.
3. Put the public API key in `.env` and on EAS (see above).

## Implemented features

**Polish (Phase 9)**
- **Dynamic Type** is on everywhere with per-variant growth caps (headlines and buttons grow less than body text) so large accessibility sizes never break the core screens.
- **VoiceOver:** every icon is decorative and hidden; rows, cards, radios, tabs and progress bars expose roles and combined labels; warning cards are announced as alerts via a live region when they appear.
- **Reduce Motion:** the only animation (image fade-in) is disabled when the system setting is on.
- **Haptics** complete the spec list: success on a verified clean, a saved copy, a purchase and a restore; error on failures; selection when changing the cleaning option.
- **Launch:** the stale-cache sweep runs after first interactions instead of during startup; the splash stays until the entitlement check finishes.
- A friendly **not-found** screen for stale deep links, with a way back to Home.
- App icon, splash and favicon are the Metora mark (navy square, camera outline, teal shield).

**Recent and Settings (Phase 8)**
- **Recent** is a local activity log, not a photo archive, and says so on screen. Each row shows the cleaning mode, "N photos · Verified clean" (or "11 cleaned · 1 failed", or "Failed"), a relative time and the file types involved. Newest first, capped at 100 entries.
- **Storage model:** one JSON array under the AsyncStorage key `metora.recent.v1`. A record holds exactly: `id`, `createdAt`, `photoCount`, `cleanedCount`, `failedCount`, `mode`, `status`, `fileTypes`. Nothing else: no photos, thumbnails, URIs, filenames, coordinates or tags. Records are validated and rebuilt from the allow-list on load, so foreign keys never survive a round trip, and corrupt storage loads as empty.
- **Clear History** asks for confirmation inline, then deletes the key immediately. Photos saved to the library are never touched.
- One record is written per single clean (success or failure) and per batch run or retry. The Batch tab shows the three latest entries with a link to Recent when no batch is in progress.
- **Settings** is minimal: the privacy explanation, Metora Lifetime status + Restore Purchase, and About (version + build, Privacy Policy, Terms). No toggles. Links open in an in-app browser (`expo-web-browser`); their URLs live in `src/config/links.ts` and are placeholders until the real pages exist.

**Batch (Phase 7)**
- Selection shows the grid, "N photos selected", the four cleaning options (Remove all metadata pre-selected), the trust card and "Clean N Photos".
- Processing is strictly sequential (`runBatch`): one photo is read, rewritten, written and verified before the next starts, so only one photo's bytes are in memory. A real progress bar shows completed / total with "Cleaning 4 of 12" / "Verifying 4 of 12"; each thumbnail gets a spinner, check or warning badge.
- Every item ends as a verified clean copy or a named failure (verification failed, unsupported, unreadable, couldn't create). A failure never stops the batch.
- Summary reads "N photos cleaned · N verified · N failed". Failed photos are listed by name with their reason; **Retry Failed** re-runs only those.
- **Save All Copies** saves each verified copy as a new photo through the same add-only path; after the first denial the rest are not re-prompted. **Done** ends the workflow and clears the cache. Haptics: success when every photo verified, an error tap otherwise.
- Sharing several files at once is not offered: `expo-sharing` shares one file at a time. Users save the batch to Photos and share from there.

- **Save Copy** adds the verified clean copy to the photo library as a **new** asset via the add-only path: write-only permission ("Add Photos Only" on iOS) and the file-based `Asset.create(uri)`. Metora never requests read access to the library, and the exact verified file is stored (HEIC stays HEIC, no re-encoding). Denied permission shows a calm explanation with an "Open Settings" button; success shows "Saved to Photos" and the primary button becomes Done.
- **Share** opens the system share sheet with the correct type (`public.jpeg`, `public.png`, `public.heic`).
- **Done** ends the workflow and deletes the working copies and the clean copy from the app cache (the saved photo in the library is untouched).
- **Haptics** (expo-haptics): success on a verified clean and on a saved copy, an error tap on a failed clean or save, a selection tick when changing the cleaning option. No-ops on web.
- `expo-media-library` is loaded lazily inside the save path so the web preview never touches its native module.

**Cleaning engine (Phase 5)**
- Pure-TypeScript container rewriter in `src/features/cleaning/engine`: no native code, no pixel decoding, no re-encoding. Pixels, dimensions, orientation, color profile (ICC / iCCP / colr) and the original format are preserved; HEIC stays HEIC.
- **JPEG:** marker segments are rewritten; everything from Start-Of-Scan onward (the compressed image and any trailing Multi-Picture images) is copied byte-for-byte. EXIF is parsed as TIFF and re-serialized without the targeted entries; XMP is edited as XML; IPTC datasets are filtered inside the Photoshop APP13 block; JFIF, ICC, MPF and Adobe segments are kept.
- **PNG:** chunk-level rewrite. `eXIf` is filtered like JPEG EXIF, the XMP `iTXt` is edited, `tIME` and text chunks are removed by category; IHDR/PLTE/IDAT and every color chunk are copied verbatim (CRCs recomputed only for rewritten chunks).
- **HEIC/HEIF:** the `Exif` and XMP `mime` items are located via the `meta` box (iinf + iloc) and rewritten **in place**, padded to their original length, so no box sizes or offsets move and the file size is unchanged.
- **Categories** follow `cleanModes.ts`: location (GPS block + IPTC/XMP place fields), camera info (device, lens/exposure, software), date & time (all timestamps incl. GPS date), all (everything except structural tags such as Orientation, resolution, ExifVersion, ColorSpace, PixelX/YDimension). The engine, `verifyClean` and `PhotoCleaningService` accept either a preset mode or an explicit category list, so any combination can be cleaned and verified.
- **Clean Up is multi-select:** "Remove all metadata" (Recommended, pre-selected) is a preset that ticks every category; the three category cards can be combined freely. Deselecting one turns the preset off, selecting all three turns it back on. Two selected options become a `custom` request (union of their categories) and are logged in Recent as "Selected metadata removed"; nothing selected disables "Create Clean Copy". Batch keeps the single-choice picker. Malformed EXIF/XMP/IPTC is dropped in "all" mode and reported as a processing failure in selective modes, never silently half-cleaned.
- **Pipeline** (`PhotoCleaningService`): read the working copy → inspect → rewrite (or copy verbatim when nothing is removable for that mode) → write a **new** file `<name>-clean.<ext>` in the session directory → re-read that file from disk with `verifyClean` → only then return a result. On failed verification the output is deleted and never exposed. Originals are never touched.
- **Done screen** now renders the real comparison: "Original" lists categories actually present; "Clean Copy" lists only categories the verifier confirmed absent, and shows "Kept" for categories a selective mode intentionally left. An already-clean photo gets its own heading.
- **Distinct failures:** unsupported format (WebP/GIF/TIFF/BMP), unreadable file, processing failure ("Couldn't create a clean copy"), and verification failure ("We couldn't verify this copy") each have their own message.

**Purchases and gate (Phase 2)**
- Hard lifetime paywall. RevenueCat entitlement `metora_pro` is the only thing that unlocks export; no local flag ever grants access.
- `Stack.Protected` removes the app routes from the navigator while locked (a deep link cannot bypass the paywall) and removes the paywall once unlocked. The splash screen stays up until the first entitlement check finishes.
- Purchase outcomes: unlocked, cancelled (no error shown), pending (neutral notice), failed (calm retry). Restore Purchase on the paywall and in Settings.
- A/B-ready structure without experiments: the current RevenueCat offering is the source of truth for packages and price; offering metadata under `paywall` can override copy and choose a layout template (`standard` is the only one). Subscription packages are filtered out so one can never be sold.

**Photo selection (Phase 3)**
- iOS system picker (PHPicker via expo-image-picker). It runs out of process and needs no photo-library permission; Metora only receives the photos the user taps.
- Original representation requested so HEIC stays HEIC; EXIF is never requested from the picker; videos are ignored.
- One photo → Metadata. Several → Batch (grid, count, default option, Clear Selection).
- Working copies are made sequentially into `<cache>/metora-work/<session>/`, deleted when the workflow ends, and swept at launch when older than 24 hours. Originals are never touched.

**Metadata inspection (Phase 4)**
- `ExifReaderMetadataService` reads the file bytes (no pixel decoding) and parses EXIF, GPS, IPTC, XMP and PNG text with the pure-JavaScript `exifreader` (+ `@xmldom/xmldom` for XMP).
- Tags are normalized into a domain snapshot and grouped into categories: location, capture time, device, camera, software, other. Structural data (dimensions, orientation, color profile, encoding) is never counted as metadata.
- Metadata screen shows human-readable rows (Location, Captured, Device, Camera, Lens, Software, Dimensions, File Type, File Size) only when data exists. Coordinates are shown as `52.3676° N, 4.9041° E`, or as the embedded IPTC/XMP place name; nothing is geocoded.
- Privacy warning appears only when sensitive categories (location, capture time, device, author/owner fields) are actually present. A photo with no removable metadata shows "No removable metadata found" as a non-error.
- "View All Metadata" is a collapsed disclosure listing every removable tag by container for power users.
- `verifyClean(uri, target)` re-reads a file and reports which promised categories remain, for a preset mode or an explicit category list; the cleaning pipeline uses it after every export.

**Foundation (Phase 1)**
- Centralized theme tokens (`src/theme`), English copy in one file (`src/copy/en.ts`), reusable components, four native tabs, all screens laid out to the design board.

## Privacy and data handling

- No analytics, ads, tracking or photo-upload code. The only network traffic is RevenueCat purchase state.
- Metadata is read on demand into screen-local state and dropped when the screen closes; it is never persisted or logged. The only persisted data is the Recent activity log (counts, mode, status, time, file types) and the RevenueCat SDK's own purchase cache. `devLog` only emits counts and category names, and only in development builds.
- Temporary files live in the app cache and are cleaned up; original photos are never modified.

## Supported formats

| Format | Inspect | Clean | Notes |
|---|---|---|---|
| JPEG | Yes | Yes, lossless | Segment rewrite; scan data untouched |
| PNG | Yes | Yes, lossless | Chunk rewrite; image data untouched |
| HEIC / HEIF | Yes (parser) | Yes, in place | Same file size; **device-only verification** (see below) |
| WebP, GIF, TIFF, BMP, RAW/DNG | No | No | Calm "not supported yet" message |

## Phase 10 — device validation checklist

Everything below needs the EAS development or TestFlight build on a physical iPhone. Nothing here can be verified on Windows.

1. **Gate:** fresh install shows the paywall; a locked deep link lands on the paywall; the splash never flashes Home before the check.
2. **Purchase:** sandbox purchase unlocks Home immediately with a success haptic; relaunch stays unlocked; cancelled sheet shows no error; delete + reinstall + Restore Purchase unlocks again; the localized price matches App Store Connect.
3. **Picker:** the system picker opens without a photo-library permission prompt; HEIC originals arrive as HEIC; a Live Photo arrives as its still image.
4. **Metadata:** an iPhone HEIC and a JPEG show Location / Captured / Device / Camera rows and the warning; "View All Metadata" lists tags; a screenshot (no EXIF) shows "No removable metadata found".
5. **Cleaning:** each of the four modes on a HEIC and a JPEG reaches Done; the clean copy opens in Photos with correct orientation and colors; re-selecting the clean copy in Metora shows the promised categories gone (and the others kept in selective modes).
6. **Save / Share:** first save shows the "Add Photos Only" prompt; the copy appears in Photos as a new item; denying permission shows the Settings notice; the share sheet offers the clean copy in its original format.
7. **Batch:** 20+ full-resolution photos clean sequentially without memory warnings; progress counts up; a deliberately unsupported file (e.g. a GIF) shows as failed and Retry Failed re-runs only it; Save All Copies saves every verified copy.
8. **Recent / Settings:** entries persist across relaunch; Clear History empties them; Privacy Policy and Terms open in the in-app browser; the version shows the build number.
9. **Accessibility:** VoiceOver reads rows as single elements; Larger Text (accessibility sizes) keeps every screen usable; Reduce Motion disables the image fade.
10. **Cache:** after finishing a flow, `<cache>/metora-work` is empty; after a force-quit mid-flow, the leftover session is swept on the next launch.

## Known limitations

- **Developing inside a OneDrive folder breaks Metro locally.** OneDrive "Files On-Demand" marks files in `node_modules` as reparse points, which Metro's file crawler reads as broken symlinks (`EINVAL readlink`). EAS cloud builds are unaffected. To bundle locally (`expo export`, `expo start`), keep a copy of the project outside OneDrive (for example `C:devmetora`) or move the project there.
- **Saving uses the file-based Photos API.** `Asset.create(uri)` (expo-media-library) hands the verified file to Photos via `creationRequestForAssetFromImage(atFileURL:)`; format, pixels, dimensions and quality are untouched. The legacy `saveToLibraryAsync` re-encodes through UIImage (it produced PNG copies in device testing) and must not be used. The Done screen shows format, dimensions and size of both the working copy and the clean copy, read from the bytes.
- **Metro caches inlined `EXPO_PUBLIC_*` values.** When exporting locally with a different environment (for example toggling `EXPO_PUBLIC_QA_BYPASS_PAYWALL`), pass `--clear` to `expo export` / `expo start`, otherwise the previous value can be reused from the transform cache. EAS builds run on fresh machines and are not affected.
- **exifreader and Node modules.** `metro.config.js` maps exifreader's guarded `https`/`http`/`fs` requires to an empty module; those code paths only exist for Node.js and never run in the app.

- **Save and Share are device-only.** On the web preview both show "not available here" notices. Verify on the EAS development build: the "Add Photos Only" prompt appears on first save, the saved photo opens in Photos with correct orientation and no metadata, denying permission shows the Settings notice, and the share sheet offers the clean copy with its original format.
- **Saved photos get a new creation date** in Photos when capture time was removed, because the library derives it from the file. This is expected; it is not written back into the file.
- **HEIC cannot be verified on Windows.** The HEIC path is exercised with a synthetic ISO-BMFF container in tests (real `meta`/`iinf`/`iloc` structure, no HEVC payload). Real iPhone HEICs must be tested on the EAS development build: inspect, clean each mode, confirm the output opens in Photos, keeps orientation, and re-inspects clean. If a cleaned EXIF ever came out *larger* than the original (not expected, since entries are only removed) the service reports a processing failure rather than writing a corrupt file.
- **Multi-Picture JPEGs (HDR gain maps):** the MPF index and the trailing secondary images are kept verbatim so HDR rendering keeps working; metadata inside those secondary images is not rewritten. Extended XMP (`xmp/extension`) is kept in selective modes and dropped in "all".
- **Compressed PNG XMP** (`iTXt` with the compression flag set) is reported as a processing failure in selective modes rather than decompressed.
- **IPTC in selective modes** removes place and date datasets only; the rest of the Photoshop block is preserved. "All" drops the block.
- **Batch Share** is not offered (single-file share sheet only); Save All Copies is the batch export path.
- **Batch memory** on a real iPhone with dozens of 12–48 MP photos is device-only: the design keeps one photo in memory at a time, but the peak (about two copies of the largest file) must be confirmed on the development build.
- **Bottom inset under native tabs:** `Screen` adds a fixed tab-bar inset on iOS in addition to the scroll view's automatic inset adjustment. If content ends noticeably above the tab bar on device, set the iOS value of `TAB_BAR_INSET` in `src/components/Screen.tsx` to 0.
- **Privacy Policy and Terms URLs** in `src/config/links.ts` are placeholders (`https://metora.app/…`) and must be replaced before submission.
- **Recent** records a batch retry as a separate entry (it is a separate run), so a batch with one retried photo produces two rows.
- **HEIC** inspection is supported by the parser but has not been verified on a device; the fixture set has no HEIC because it cannot be generated on Windows without native tooling. Verify with an iPhone HEIC on the development build.
- **iOS-only behaviour is unverified on Windows:** real purchases, sandbox restore, the PHPicker UI, cache copying and large selections all need the EAS development build on a physical iPhone.
- Light appearance only.

## Testing

```bash
npm test
```

Fixture images in `src/services/__fixtures__/` are generated (Pillow) and contain no real personal data: JPEG with GPS + camera + timestamp, JPEG without GPS, timestamp-only JPEG, PNG with eXIf/text/XMP, XMP-only location, no-metadata JPEG, a 4032×3024 JPEG, and a malformed file. Tests cover purchase branching, offering selection, paywall content overrides, picker options and routing, workflow state, temp-file rules, tag categorization, normalization against every fixture, row formatting, date parsing and `verifyClean`.

Recent tests cover the store (newest-first persistence, the 100-entry cap, immediate clear, corrupt and foreign storage, read failures), record building and sanitization (allow-listed keys only, tampered records stripped, malformed records rejected, and a check that serialized records contain no URI/filename/GPS/EXIF-like content), and row presentation (relative dates, status lines, file type labels).

Batch tests cover the state machine (progress counts, summary, retry resets only failed items, save outcomes), the sequential runner (order, failures recorded without stopping, unexpected throws become processing failures, retry re-runs only failures, cancellation stops before the next item) and save-all (one save per verified copy, no re-prompt after denial).

Save/Share tests mock the Expo modules and cover: permission granted → save, denied and undetermined → no save with the denial passed through, save failure, web unavailability, share type per format, and share unavailable/failed outcomes.

Cleaning tests (`src/features/cleaning/__tests__`, `src/services/__tests__/PhotoCleaningService.test.ts`) prove, for every mode and container: only the targeted categories are removed and the others remain; scan/IDAT bytes, dimensions and orientation are identical before and after; ICC and MPF survive; already-clean files are copied unchanged; cleaning twice is idempotent; malformed EXIF is dropped in "all" and rejected in selective modes; unsupported containers are rejected; a failed verification deletes the output and is reported separately from a processing failure. The HEIC test builds a synthetic container around the fixture's EXIF and XMP and checks that the file size and image bytes never change.

## Project layout

```
src/app/                 Expo Router routes: paywall, (tabs)/{index,batch,recent,settings}, photo/{[id],clean,result}
src/components/          Reusable UI: PrimaryButton, MetadataRow, CleanOptionCard, PrivacyCard, PhotoPreview, EmptyStateCard, …
src/copy/en.ts           All user-facing English copy
src/features/purchase/   PurchaseProvider (React context) + pure purchase state machine
src/features/paywall/    Paywall content resolution (offering metadata), section components, templates
src/features/workflow/   PhotoWorkflowProvider: temporary selection model (file references only)
src/features/metadata/   Tag categorization, normalization, presentation rows, useMetadata, raw disclosure
src/features/cleaning/   Clean modes, useCleanPhoto / useSaveShare hooks, engine/ (bytes, tiff, xmp, iptc, jpeg, png, heif)
src/features/batch/      Batch state machine, sequential runner + save-all, useBatch hook, batch view components
src/features/recent/     RecentHistoryProvider (context), row presentation, RecentList
src/config/links.ts      Privacy Policy / Terms URLs (placeholders)
src/services/            PurchaseService (RevenueCat + preview), PhotoLibraryService (picker), PhotoSaveService (add-only save),
                         ShareService, TemporaryFileService, MetadataService, PhotoCleaningService, RecentHistoryStore
src/theme/               Color, spacing, radius, typography, shadow and icon tokens
src/types/               Domain types (metadata, workflow)
src/utils/               Formatting, EXIF date parsing, haptics, Reduce Motion hook, development logging
docs/screenshots/        Web-preview captures per phase
```
