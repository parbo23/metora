# Metora → "Shot On": restructure brief

> Brief for a coding agent (VS Code / Claude Code). Work through the phases in order.
> **Do not start Phase 1 until Phase 0 is reported and confirmed by me.**

---

## 1. Context

Metora is a live iOS app on the App Store. Today it does exactly one thing: **remove EXIF metadata from photos.** It gets no traffic.

We are repositioning it into a different single-purpose app: **"Shot On"**. The user picks a photo and the app adds a clean frame with the camera info printed on it (camera model, lens, aperture, shutter speed, ISO, date). Then the user saves or shares it.

- The EXIF **remover feature is removed entirely**. It is not kept as a secondary feature.
- The word "EXIF" disappears from all user-facing copy. The target user is someone who wants nice photos to post, not a privacy or tech user.
- EXIF is still **read** under the hood, because that's where the camera info comes from.

## 2. Hard scope for v1 (ship today)

**In scope**
1. Pick one photo from the photo library.
2. Read its metadata: camera make/model, lens, focal length, aperture, shutter speed, ISO, capture date.
3. Show a preview with **one** frame style (spec in §6).
4. Export at full resolution: save to Photos and/or the share sheet.
5. Graceful fallback when metadata is missing (screenshots, WhatsApp images, edited images).
6. Rebrand all user-facing text and the display name.

**Explicitly out of scope (do NOT build)**
- Multiple frame styles, colour pickers, font pickers, layout settings
- Batch processing
- Paywall, subscriptions or IAP changes. If RevenueCat or another paywall exists, leave it untouched or hide it, but don't extend it.
- Onboarding flows beyond a single empty-state screen
- New app icon (separate task)
- Android

If something seems necessary but is not on the in-scope list, **stop and ask** instead of building it.

---

## 3. Phase 0: inspect and report (no code changes)

1. Detect the stack (React Native/Expo, native Swift/SwiftUI, other) and report it.
2. List every file, component, screen, hook, util and dependency that belongs to the EXIF-remover feature.
3. List what can be **reused**: image picker, permission handling, navigation shell, theming, save/share logic.
4. Report the current values of the following:
   - display name (`CFBundleDisplayName` / `expo.name`)
   - bundle identifier
   - version and build number
   - Info.plist permission strings (`NSPhotoLibraryUsageDescription`, `NSPhotoLibraryAddUsageDescription`)
5. Propose a file-level plan: delete / modify / create.

**Output:** a short report plus the plan. Wait for my confirmation.

---

## 4. Phase 1: remove the remover

- Delete the EXIF-stripping logic, its UI, its copy and any dependency that is used **only** for stripping.
- Keep the picker, permissions, navigation shell and theming if they're reusable.
- Remove dead code, unused imports and unused assets. Make sure the project builds and runs with an empty main screen.
- **Do NOT change the bundle identifier.** Changing it creates a new app on the App Store, so we'd lose the existing listing.
- Bump the version: minor bump (e.g. `1.x` → `2.0.0`), because this is a new product direction.

---

## 5. Phase 2: metadata reading

### 5.1 Data model

```ts
type ShotInfo = {
  make?: string;          // "Apple", "FUJIFILM", "SONY"
  model?: string;         // "iPhone 15 Pro", "X-T5"
  lens?: string;          // cleaned lens name, optional
  focalLength35mm?: number; // preferred: FocalLenIn35mmFilm
  focalLength?: number;   // fallback: FocalLength (mm, actual)
  aperture?: number;      // FNumber, e.g. 1.78
  exposureTime?: number;  // seconds, e.g. 0.008333
  iso?: number;           // ISOSpeedRatings / PhotographicSensitivity
  date?: Date;            // DateTimeOriginal (+ OffsetTimeOriginal if present)
};
```

### 5.2 Source fields

| Field | EXIF / TIFF key |
|---|---|
| make | TIFF `Make` |
| model | TIFF `Model` |
| lens | EXIF `LensModel` |
| focalLength35mm | EXIF `FocalLenIn35mmFilm` |
| focalLength | EXIF `FocalLength` |
| aperture | EXIF `FNumber` |
| exposureTime | EXIF `ExposureTime` |
| iso | EXIF `ISOSpeedRatings` (array on iOS, take the first) |
| date | EXIF `DateTimeOriginal`, then `DateTimeDigitized`, then file/asset creation date |

### 5.3 Critical pitfall: don't lose the metadata at pick time

Many pick flows hand back a **re-encoded copy without EXIF**.

- **Native (PHPicker):** load the original **data representation**, not a `UIImage`. Read the properties with `CGImageSourceCreateWithData` + `CGImageSourceCopyPropertiesAtIndex` (`kCGImagePropertyExifDictionary`, `kCGImagePropertyTIFFDictionary`). Alternatively, use the `PHAsset` and request the original image data.
- **Expo:** use `expo-image-picker` with `exif: true`. Set the iOS option that preserves the original representation (`preferredAssetRepresentationMode: Current`) so HEIC isn't transcoded without metadata. **Verify** on a real device that a HEIC from the iPhone camera returns the full EXIF. If it doesn't, read the metadata from the asset URI via `expo-media-library` or a small native module.

### 5.4 Formatting rules

- **Model:** if `model` already starts with `make`, don't repeat it ("Apple iPhone 15 Pro" → "iPhone 15 Pro"). Title-case all-caps makes ("FUJIFILM" → "Fujifilm", "SONY" → "Sony"). Keep model strings as-is otherwise.
- **Focal length:** prefer `focalLength35mm` and show it as `24mm`. If only the actual focal length exists, show it rounded. On iPhones the raw `LensModel` looks like `iPhone 15 Pro back triple camera 6.86mm f/1.78`. **Never show that raw string.** Use the 35mm-equivalent focal length instead.
- **Aperture:** `f/1.8`. Round to 1 decimal and drop a trailing `.0` (`f/2`, not `f/2.0`).
- **Shutter:** below 1s, show it as a fraction `1/120s` (round the denominator to the nearest standard-ish integer: `1 / exposureTime`, rounded). At 1s or above, show `1s`, `2.5s`.
- **ISO:** `ISO 80`.
- **Date:** localised short date, e.g. `1 Nov 2026`. Show the time only if it's cheap to add cleanly. Don't show time zone noise.
- **Separator:** ` · ` between values.

Write these formatters as pure functions with **unit tests**. This is the part most likely to look broken.

### 5.5 Fallback behaviour

| Situation | Behaviour |
|---|---|
| Full EXIF | Normal frame |
| Camera fields missing, date present | Frame with the date only |
| Nothing at all (screenshot, WhatsApp) | Still allow the frame, with a subtle inline note: "No camera info found in this photo". Never render empty lines or `undefined`. |
| Partial (e.g. no ISO) | Omit that value and its separator; don't leave a gap |

---

## 6. Phase 3: frame rendering (one style)

### 6.1 Style spec: "Classic"

- Original photo, untouched, on top.
- A **white bar below the photo**, full width.
- Bar height = **10% of the image's width** (minimum 8% of the long side for portrait images; tune visually).
- Horizontal padding = **4% of the image width**.
- **Left block (2 lines):**
  - Line 1 (bold): `Shot on iPhone 15 Pro`
  - Line 2 (regular, grey `#6B6B6B`): `24mm · f/1.8 · 1/120s · ISO 80`
- **Right block (1 line, regular, grey):** the date, vertically centred.
- Text colour: `#111111`. Font: system font (SF Pro).
- **All sizes are relative to the image width**, so it looks identical on a 12MP and a 48MP photo.

### 6.2 Rendering rules

- Render at the **original pixel resolution**, not at screen resolution. A screenshot of a view is **not** acceptable output.
  - Native: `UIGraphicsImageRenderer` with `format.scale = 1` and size = original pixels.
  - Expo/RN: render offscreen with `@shopify/react-native-skia` (surface or `makeImageSnapshot`) at full size. Only fall back to `react-native-view-shot` if Skia is impossible, and then with explicit output width = original width.
- **Respect EXIF orientation.** Normalise the image to "up" before drawing, or rotated photos will end up sideways in the frame.
- Very large images (48MP ProRAW-sized): make sure memory doesn't explode. Downscaling to a maximum of ~12MP on export is acceptable for v1.
- Preview on screen can be a downscaled version. Export must use the full-res path.

---

## 7. Phase 4: export

- **Save to Photos** (requires `NSPhotoLibraryAddUsageDescription`) and a **Share** button (system share sheet).
- Output: JPEG, quality ~0.92.
- **Privacy default:** the exported file must **not** carry GPS/location metadata. A freshly rendered image normally has none. **Verify this** by reading back the metadata of an exported file in a test.
- Success feedback: a short toast/haptic, "Saved to Photos".

---

## 8. Phase 5: rebrand

- **Display name on device:** `Shot On`
- **App Store name:** TBD. I'm confirming it via keyword research; leave a `TODO` in the release checklist. Do not use "EXIF".
- Update every user-facing string: main screen, empty state, permission prompts, about/settings, share text.
- Permission strings, for example:
  - `NSPhotoLibraryUsageDescription`: "Shot On needs access to your photos so you can add a camera-info frame."
  - `NSPhotoLibraryAddUsageDescription`: "Shot On saves your framed photos to your library."
- Empty state on the main screen: a short headline ("Show what you shot it with"), a single "Choose photo" button, and an example framed image if available.
- **Bundle ID unchanged.**

---

## 9. Test checklist (run on a real iPhone)

| # | Input | Expected |
|---|---|---|
| 1 | iPhone camera photo (HEIC), main lens | Model + `24mm`-ish + f/ + shutter + ISO + date |
| 2 | iPhone photo, ultra-wide / tele lens | Correct 35mm-equivalent (e.g. 13mm / 77mm / 120mm) |
| 3 | Portrait-orientation photo | Not rotated; bar proportions look right |
| 4 | Dedicated camera JPEG (Fuji/Sony/Canon), if available | Make shown correctly title-cased, lens values correct |
| 5 | Screenshot | No crash, date-only or "no camera info" note |
| 6 | Image saved from WhatsApp | Same as #5 |
| 7 | 48MP photo | Exports without memory crash |
| 8 | Exported file | Contains no GPS metadata |
| 9 | Deny photo permission | Clear message + way to open Settings |
| 10 | Save + share | Both work; saved image is full resolution |

Unit tests for all formatters in §5.4 (fractions, rounding, make/model dedupe, missing values).

---

## 10. Definition of done

- [ ] No remover code, copy or dependencies remain
- [ ] Bundle ID unchanged; version bumped to 2.0.0
- [ ] One frame style renders at full resolution with correct orientation
- [ ] All fallback cases from §5.5 behave as specified
- [ ] Formatter unit tests pass
- [ ] Test checklist §9 passes on a real device
- [ ] No "EXIF" in any user-facing text
- [ ] Builds cleanly for release

## 11. App Store release (manual, done by me)

- [ ] Final App Store name + subtitle + keywords (from keyword research)
- [ ] New screenshots showing framed photos (3–5)
- [ ] New description: what it does, in plain language, no "EXIF"
- [ ] Release notes: "Metora is now Shot On. The metadata remover has been replaced by camera-info frames."
- [ ] Metadata must match the actual functionality (guideline 2.3) before submitting