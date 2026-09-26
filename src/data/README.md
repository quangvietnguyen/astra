# Moon configuration

Edit [moonConfig.json](./moonConfig.json) to change phase labels and symbols, event dates and types, or the Moon's appearance for regular, Mid-Autumn, and eclipse states. The astronomical calculation still determines the Moon's position, illumination, and lighting direction; `phaseRules` controls how its elongation is named.

## Phase rules

Each entry has a `minDeg` inclusive and `maxDeg` exclusive elongation range. A range with `minDeg` greater than `maxDeg` crosses 0° (the New Moon range). Keep the ranges gap-free and non-overlapping.

## Lunar eclipse events

Add or update items in `events.lunarEclipses` with a `date` (`YYYY-MM-DD`) and a `type` (`total`, `partial`, or `penumbral`). Times belong in `greatestEclipseUtc` and `phasesUtc` as ISO UTC timestamps. The app uses precise contact ranges to determine which local calendar date contains an eclipse when those times are supplied; without contact times, it uses the catalog date and the fallback tolerance. Times currently included are rounded to the nearest minute.

`events.lunarEclipseFallback` contains the calculated fallback thresholds. `events.midAutumnFullMoonDates` contains known dates, while `midAutumnFallbackWindow` controls its general date window.

## Appearance

`appearance.eclipse` contains a separate visual preset for each eclipse type. The preset controls the Moon surface and glow colors, light colors and strengths, and the shadow overlay. Keep the property names consistent across the three eclipse types when editing them.

Eclipse dates and times are based on NASA Goddard's lunar eclipse predictions: [2021–2030](https://eclipse.gsfc.nasa.gov/LEdecade/LEdecade2021.html), [2031–2040](https://eclipse.gsfc.nasa.gov/LEdecade/LEdecade2031.html), and detailed year tables for [2026](https://eclipse.gsfc.nasa.gov/OH/OH2026.html) and [2027](https://eclipse.gsfc.nasa.gov/OH/OH2027.html).

This JSON is bundled with the app. After editing it, create and distribute a new app build for users to receive the changes.
