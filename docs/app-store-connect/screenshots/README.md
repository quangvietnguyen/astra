# App Store screenshots

Because Astra supports both iPhone and iPad, provide at least one screenshot for each required family. Apple accepts one to ten screenshots per family and does not allow alpha transparency.

## Recommended capture sizes

- iPhone 6.9-inch portrait: `1290 × 2796`
- iPad 13-inch portrait: `2048 × 2732`

## Shot list

1. **Your Moon, Right Now** — default 3D Moon, phase badge, and clean sky.
2. **Lunar Details at a Glance** — phase, illumination, Moon age, distance, and elongation.
3. **Choose Your View** — Moon-size controls and presets.
4. **Follow the Orbiter** — LRO-inspired spacecraft and orbit controls.
5. **Explore Any Night** — date controls showing a different phase.

Use real in-app UI. Do not imply live NASA telemetry, professional-grade navigation, or features not present in the build.

## Preview assets

The files in `previews/` are correctly sized, no-alpha web-render previews for composition review only. Replace them with captures from the signed iOS release build before submission because Expo development/web rendering does not prove the final native result.

Before final capture, fix the phase-card text that currently displays `undefined • undefined° Altitude`.

Capture final screenshots with location permission either denied or using a non-sensitive test location. Do not expose a developer's real home coordinates or city.

