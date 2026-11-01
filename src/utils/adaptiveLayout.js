// Extend the Duo panel (and existing portrait iPhone panel) into the bottom
// safe area so its bottom gap matches its side gutters. Keep the side rail.
export function getObserverInsets(width, height, insets, isIPhone, isDuo = false) {
  const edgeToEdgeBottom = isIPhone && width < 600 && height > width
    && insets.left < 40 && insets.right < 40;
  return (isDuo || edgeToEdgeBottom) ? { ...insets, bottom: 0 } : insets;
}

// Window space determines the composition; Duo panels fill the usable width.
export function getObserverLayout(width, height, insets = {}, panelHeight = 180, showTimeline = true, isDuo = false) {
  const safeWidth = Math.max(1, width - (insets.left || 0) - (insets.right || 0));
  const safeHeight = Math.max(1, height - (insets.top || 0) - (insets.bottom || 0));
  const spacious = safeWidth >= 700;
  const horizontalTimeline = safeWidth >= 1000 && safeWidth > safeHeight;
  const gutter = Math.max(12, Math.min(24, 12 + (safeWidth - 400) / 25));
  const panelWidth = Math.max(1, isDuo ? safeWidth - gutter * 2 : Math.min(safeWidth - gutter * 2, horizontalTimeline ? 1200 : 720));
  const top = 78;
  const bottom = showTimeline ? panelHeight + 30 : 68;
  const availableHeight = Math.max(1, safeHeight - top - bottom);
  const worldHeight = 2 * 11 * Math.tan(38 * Math.PI / 360);
  const pixelsPerUnit = safeHeight / worldHeight;
  // Fit the halo as well as the lunar disc; user zoom is applied afterward.
  const diameter = Math.min(safeWidth * 0.84, availableHeight * 0.90);
  return {
    safeWidth, safeHeight, spacious, horizontalTimeline, panelWidth, gutter,
    moonFitScale: diameter / (2 * 2.05 * 1.28 * pixelsPerUnit),
    moonCenterY: (safeHeight / 2 - (top + availableHeight / 2)) / pixelsPerUnit,
  };
}

export function getTimelineOffset(previewDays, radius, dayWidth) {
  return (radius + previewDays) * dayWidth;
}


// Keep the drawable allocation fixed through fold animations. Native buffer
// resizes clear the previous frame; rectangular resizes also stretch it.
// 1024 points covers both Duo displays, including portrait (951 points),
// without upscaling the drawable. Keep native pixel density on software renderers
// too: reducing the buffer makes lunar surface details blur when zooming.
// Uniform view scaling preserves the existing vertical world-to-pixel mapping.
export function getDuoMoonSurface(width, height) {
  const side = 1024;
  return {
    position: 'absolute', width: side, height: side,
    left: (width - side) / 2, top: (height - side) / 2,
    transform: [{ scale: height / side }],
  };
}
