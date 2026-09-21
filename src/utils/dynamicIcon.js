import { Platform } from 'react-native';

export const PHASE_ICON_MAP = {
  'New Moon': 'new_moon',
  'Waxing Crescent': 'waxing_crescent',
  'First Quarter': 'first_quarter',
  'Waxing Gibbous': 'waxing_gibbous',
  'Full Moon': 'full_moon',
  'Waning Gibbous': 'waning_gibbous',
  'Last Quarter': 'last_quarter',
  'Waning Crescent': 'waning_crescent',
};

/**
 * Updates the iOS/Android app icon to match the given lunar phase.
 * Gracefully no-ops on web, simulators, or Expo Go where native dynamic icon APIs are unavailable.
 *
 * @param {string} phaseName - The astronomical phase name (e.g. "Waxing Gibbous")
 * @returns {Promise<boolean>} - True if icon was changed, false otherwise
 */
export async function syncAppIconWithPhase(phaseName) {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return false;
  }

  const iconKey = PHASE_ICON_MAP[phaseName];
  if (!iconKey) {
    return false;
  }

  try {
    // Dynamically require to prevent errors when native module is unlinked (e.g. Expo Go)
    const DynamicAppIcon = require('expo-dynamic-app-icon');
    if (!DynamicAppIcon || !DynamicAppIcon.setAppIcon) {
      return false;
    }

    const currentIcon = await DynamicAppIcon.getAppIcon();
    // On iOS, default icon returns null or string
    if (currentIcon !== iconKey) {
      const result = await DynamicAppIcon.setAppIcon(iconKey);
      return result;
    }
    return true;
  } catch (err) {
    // Dynamic app icon is only active in custom dev clients / standalone EAS production builds
    return false;
  }
}
