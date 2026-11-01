# iPhone Duo validation

Build with Expo SDK 58 and Xcode 27.1 or newer. Install the updated iOS pods before rebuilding: `pnpm dlx pod-install`. A new native build is needed for `react-native-safe-area-context` and the orientation settings.

The observer uses the current window and safe-area insets on every edge. On portrait iPhones without a side rail, the bottom panel background extends into the home-indicator area so its bottom gap matches the left and right gaps. Duo panels fill the usable width and extend into the bottom safe area on both displays, with matching side and bottom gutters. Side rail insets remain protected. Compact Duo windows keep age, distance, angle, and hemisphere on one line. Duo uses the 4096×2048 Moon texture because its simulator reports a 4096-pixel maximum texture size; the original 8192×4096 asset remains in use on other devices. The background remains edge to edge; the Moon and controls live inside the safe content area. The Moon's halo fits between the header and the measured timeline at default zoom. Duo uses a fixed square GL surface (1024 points on both device GPUs and software renderers; 3072×3072 pixels at 3× density), centered and uniformly scaled to the stage height, so cached frames remain circular and folding does not reallocate or clear the drawable. Resizing changes the existing scene's target position and scale, using its existing frame interpolation. Duo rendering resets cached GL state, binds the current native framebuffer, and drains each submitted frame before submitting another. Multisample antialiasing is disabled on Duo. A locked Moon stops requesting frames after its interpolation settles; date, zoom, lighting, layout, and foreground changes wake it, while the orbiter and unlocked rotation remain continuous. All three solar lights follow the Sun on Duo so a camera-side fill cannot illuminate the dark hemisphere at new moon. It does not recreate the canvas or reset the user's zoom, date, tidal lock, or satellite selection.

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


## Simulator performance verification

On the iPhone Duo iOS 27.1 simulator using Apple Software Renderer, ten warm samples took approximately 960–980 ms per frame with the original 512-point multisampled surface. An earlier 192-point surface with antialiasing disabled took approximately 48–52 ms per frame, but lost surface detail at high zoom and has been removed. The current fixed 1024-point surface prioritizes native resolution on both displays, including portrait; these earlier timings do not describe its performance. Timings include rendering, presentation, and draining the native queue. The earlier low-resolution version settled to 0.8% host process CPU in an idle spot check. These are simulator measurements, not physical iPhone GPU, memory, battery, or thermal measurements.

Verified new moon, first quarter, and full moon by changing the selected day after idle. Regression tests cover light direction, redraw wake-up, idle suspension, background suspension, native-resolution surface coverage, and native framebuffer rebinding.

The 1024-point surface was checked after a clean native launch and at maximum zoom on the inner display: lunar craters remain visible without the previous low-resolution pixel enlargement. Apple Software Renderer is noticeably slower at this resolution; no physical-device performance claim is made.
