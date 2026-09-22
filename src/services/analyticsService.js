import { Platform } from 'react-native';

let analyticsClient;
let didWarnAboutAnalytics = false;

const warnOnce = (message, error) => {
  if (didWarnAboutAnalytics || typeof __DEV__ === 'undefined' || !__DEV__) return;
  didWarnAboutAnalytics = true;
  console.warn(message, error?.message ?? error);
};

const getAnalyticsClient = () => {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;
  if (analyticsClient !== undefined) return analyticsClient;

  try {
    const { getAnalytics, logEvent, setUserProperty } = require('@react-native-firebase/analytics');
    analyticsClient = {
      analytics: getAnalytics(),
      logEvent,
      setUserProperty,
    };
  } catch (error) {
    analyticsClient = null;
    warnOnce(
      'Firebase Analytics is unavailable. Install a rebuilt native development or release build to enable analytics.',
      error
    );
  }

  return analyticsClient;
};

const normalizeValue = (value, fallback = 'unknown') => {
  if (value == null || value === '') return fallback;
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return normalized || fallback;
};

const recordAnalytics = async (eventName, parameters, userProperties = {}) => {
  const client = getAnalyticsClient();
  if (!client) return;

  try {
    await Promise.all([
      client.logEvent(client.analytics, eventName, parameters),
      ...Object.entries(userProperties).map(([name, value]) =>
        client.setUserProperty(client.analytics, name, value)
      ),
    ]);
  } catch (error) {
    warnOnce(`Unable to record the ${eventName} analytics event.`, error);
  }
};

const getMoonSizeBucket = (scale) => {
  if (scale < 0.9) return 'small';
  if (scale <= 1.1) return 'default';
  if (scale < 1.4) return 'large';
  return 'maximum';
};

const getOffsetBucket = (offset) => {
  if (offset === 0) return 'today';
  const direction = offset < 0 ? 'past' : 'future';
  const distance = Math.abs(offset);
  if (distance <= 7) return `${direction}_1_7_days`;
  if (distance <= 30) return `${direction}_8_30_days`;
  return `${direction}_31_plus_days`;
};

export const trackMoonSizeSelection = ({ scale, method, phaseName }) => {
  const percentage = Math.round(scale * 100);
  const bucket = getMoonSizeBucket(scale);

  void recordAnalytics(
    'moon_size_selected',
    {
      scale_percent: String(percentage),
      size_bucket: bucket,
      selection_method: normalizeValue(method),
      moon_phase: normalizeValue(phaseName),
    },
    { moon_size_preference: bucket }
  );
};

export const trackOrbiterVisibility = ({ enabled, phaseName }) => {
  const preference = enabled ? 'enabled' : 'disabled';

  void recordAnalytics(
    'orbiter_visibility_changed',
    {
      orbiter_enabled: preference,
      moon_phase: normalizeValue(phaseName),
    },
    { orbiter_preference: preference }
  );
};

export const trackDateOffsetChange = ({ delta, offset, source, phaseName }) => {
  void recordAnalytics('date_offset_changed', {
    change_direction: delta === 0 ? 'reset' : delta < 0 ? 'past' : 'future',
    jump_days: String(Math.abs(delta)),
    offset_bucket: getOffsetBucket(offset),
    change_source: normalizeValue(source),
    moon_phase: normalizeValue(phaseName),
  });
};

export const trackHudVisibility = ({ visible, source }) => {
  void recordAnalytics('hud_visibility_changed', {
    hud_visible: visible ? 'visible' : 'hidden',
    change_source: normalizeValue(source),
  });
};
