# iPhone Duo validation

Build with Expo SDK 58 and Xcode 27.1 or newer. Install the updated iOS pods before rebuilding: `pnpm dlx pod-install`. A new native build is needed for `react-native-safe-area-context` and the orientation settings.

The observer uses the current window and safe-area insets on every edge. On portrait iPhones without a side rail, the bottom panel background extends into the home-indicator area so its bottom gap matches the left and right gaps. Duo rail layouts keep their bottom safe area. The background remains edge to edge; the Moon and controls live inside the safe content area. The Moon's halo fits between the header and the measured timeline at default zoom. Resizing changes the existing scene's target position and scale, using its existing frame interpolation. It does not recreate the canvas or reset the user's zoom, date, tidal lock, or satellite selection.

## Native acceptance checks

In Xcode Device Hub's iPhone Duo simulator:

1. On the outer display, select a future date, adjust zoom, disable tidal lock, and enable the satellite.
2. Open slowly, pause partially open, then unfold fully. Close again. Check that the date and settings persist and the satellite continues its orbit without restarting.
3. Rotate the inner and outer displays. Check the Moon framing and that the timeline and zoom control remain reachable.
4. Enter Split View on both sides. Check that controls avoid either system rail, including when the Dynamic Island expands.
5. Fold while scrubbing the ruler. The selected preview should stay under the center indicator and commit normally when the gesture finishes.
6. Pinch out and in over the Moon, then lift or replace one finger. Check that zoom stays stable, one-finger ruler scrolling still works, and the slider follows the gesture. iPhone zoom spans 35%–300%; the tablet range remains 60%–160%.
7. Collapse the timeline, unfold, and expand it again. The selected date should remain unchanged.
8. Background and resume in each display configuration. Rendering should resume without resetting the Moon or satellite.

The browser resize check verifies live layout changes and state persistence. It cannot certify iOS hinge animations, native safe-area updates, or GL context survival during a physical display switch; those require the native checks above.

References: [Expo Duo guide](https://expo.dev/blog/supporting-iphone-duo), [Apple preparation guide](https://developer.apple.com/iphone-duo/prepare/).
