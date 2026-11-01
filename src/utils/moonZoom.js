export const getMoonZoomRange = (isIPhone) => isIPhone
  ? { min: 0.35, max: 3 }
  : { min: 0.6, max: 1.6 };

export const clampMoonScale = (scale, range) =>
  Math.max(range.min, Math.min(range.max, Number(scale.toFixed(2))));

// Capture only two-finger gestures over the scene. One finger remains available
// to the renderer and controls; the timeline has its own separate responder.
export function createMoonPinchHandlers({ getScale, setScale, getRange, onStart, onEnd }) {
  let startDistance = 0;
  let startScale = 1;
  let touchPair = '';
  let gestureStartScale = 1;
  let active = false;
  const resetPair = () => { startDistance = 0; touchPair = ''; };
  const read = (event) => {
    const touches = event.nativeEvent.touches;
    if (touches.length !== 2) return null;
    const pair = touches.map((touch) => touch.identifier).sort().join(':');
    const distance = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
    return distance > 1 ? { pair, distance } : null;
  };
  const beginPair = (event) => {
    const next = read(event);
    if (!next) { resetPair(); return; }
    startDistance = next.distance;
    startScale = getScale();
    touchPair = next.pair;
  };
  const finish = () => {
    if (active) onEnd(getScale() !== gestureStartScale);
    active = false;
    resetPair();
  };
  return {
    onStartShouldSetPanResponderCapture: (event) => Boolean(read(event)),
    onMoveShouldSetPanResponderCapture: (event) => Boolean(read(event)),
    onPanResponderGrant: (event) => {
      active = true;
      gestureStartScale = getScale();
      onStart();
      beginPair(event);
    },
    onPanResponderStart: (event) => {
      const next = read(event);
      if (!next || next.pair !== touchPair) beginPair(event);
    },
    onPanResponderMove: (event) => {
      const next = read(event);
      if (!next) { resetPair(); return; }
      if (!startDistance || next.pair !== touchPair) { beginPair(event); return; }
      setScale(clampMoonScale(startScale * next.distance / startDistance, getRange()));
    },
    onPanResponderEnd: (event) => {
      if (event.nativeEvent.touches.length !== 2) resetPair();
    },
    onPanResponderRelease: finish,
    onPanResponderTerminate: finish,
    onPanResponderTerminationRequest: () => true,
  };
}
