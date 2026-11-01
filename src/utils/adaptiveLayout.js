// On a portrait iPhone without a side rail, let the panel background extend
// into the home-indicator area so its bottom gap matches its horizontal gaps.
export function getObserverInsets(width, height, insets, isIPhone) {
  const edgeToEdgeBottom = isIPhone && width < 600 && height > width
    && insets.left < 40 && insets.right < 40;
  return edgeToEdgeBottom ? { ...insets, bottom: 0 } : insets;
}

// Window space, rather than device identity, determines the composition.
export function getObserverLayout(width, height, insets = {}, panelHeight = 180, showTimeline = true) {
  const safeWidth = Math.max(1, width - (insets.left || 0) - (insets.right || 0));
  const safeHeight = Math.max(1, height - (insets.top || 0) - (insets.bottom || 0));
  const spacious = safeWidth >= 700;
  const horizontalTimeline = safeWidth >= 1000 && safeWidth > safeHeight;
  const gutter = Math.max(12, Math.min(24, 12 + (safeWidth - 400) / 25));
  const panelWidth = Math.max(1, Math.min(safeWidth - gutter * 2, horizontalTimeline ? 1200 : 720));
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
