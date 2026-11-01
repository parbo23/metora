# Shot On 2.0.0 — release checklist

Branch `shot-on-v2`. Bundle id stays `com.metora.app` (changing it would create a new App Store listing).

## Before building

- [ ] `npm run typecheck`, `npx expo lint`, `npm test` all pass
- [ ] New development build made after adding `@shopify/react-native-skia` and `expo-image-manipulator` (both are native modules): `npm run build:dev`
- [ ] **TODO App Store name + subtitle + keywords** (from keyword research). Do not use "EXIF". The on-device display name is `Shot On`.
- [ ] Privacy policy and terms (`docs/privacy`, `docs/terms`) updated: remove the references to metadata removal, describe the camera-info frame instead
- [ ] App icon (separate task)

## Manual device tests (real iPhone, development build)

| # | Input | Expected | OK |
|---|---|---|---|
| 1 | iPhone camera photo (HEIC), main lens | `Shot on iPhone …` + `24mm`-ish + f/ + shutter + ISO + date | [ ] |
| 2 | iPhone photo, ultra-wide / tele lens | Correct 35mm-equivalent (13mm / 77mm / 120mm), never the raw lens string | [ ] |
| 3 | Portrait-orientation photo | Not rotated; bar proportions look right | [ ] |
| 4 | Dedicated camera JPEG (Fuji/Sony/Canon), if available | Make title-cased ("Fujifilm X-T5"), values correct | [ ] |
| 5 | Screenshot | No crash; "No camera info found in this photo" note; frame still exports | [ ] |
| 6 | Image saved from WhatsApp | Same as #5 (or date only) | [ ] |
| 7 | 48MP photo | Exports without a memory crash (downscaled to ~12MP) | [ ] |
| 8 | **Exported file contains no GPS / location metadata** | Share the framed photo to Files, open it in a metadata viewer (e.g. Mac Preview › Inspector, exiftool, or an EXIF viewer app): no GPS tags, no original EXIF | [ ] |
| 9 | Deny photo permission ("Add Photos Only" off) | Clear message + "Open Settings" works | [ ] |
| 10 | Save + Share | Both work; saved image is full resolution (check pixel size in Photos › info) | [ ] |
| 11 | Save to Photos | Toast "Saved to Photos" + haptic; original photo unchanged | [ ] |
| 12 | Font | Bar text uses the system font (SF Pro) on device; check the dev log line `render: font family` | [ ] |

## App Store submission (manual)

- [ ] Final App Store name + subtitle + keywords
- [ ] New screenshots showing framed photos (3–5)
- [ ] New description in plain language, no "EXIF"
- [ ] Release notes: "Metora is now Shot On. The metadata remover has been replaced by camera-info frames."
- [ ] Metadata matches the actual functionality (guideline 2.3)
- [ ] Permission strings in the build match: photo library add = "Shot On saves your framed photos to your library."
