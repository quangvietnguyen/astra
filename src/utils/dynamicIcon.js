import { Platform, NativeModules } from 'react-native';

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
 * Safely checks if the native ExpoDynamicAppIcon module is compiled and available
 * in the currently running binary without throwing or triggering warnings.
 */
export function isDynamicAppIconAvailable() {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return false;
  }

  try {
    const { requireOptionalNativeModule } = require('expo-modules-core');
    if (typeof requireOptionalNativeModule === 'function') {
      const nativeMod = requireOptionalNativeModule('ExpoDynamicAppIcon');
      if (nativeMod != null) {
        return true;
      }
    }
  } catch (e) {
    // Silently handle environments where optional loader is not present
  }

  if (typeof globalThis !== 'undefined' && globalThis.expo?.modules?.['ExpoDynamicAppIcon']) {
    return true;
  }

  if (NativeModules && (NativeModules.ExpoDynamicAppIcon || NativeModules.DynamicAppIcon)) {
    return true;
  }

  return false;
}

/**
 * Updates the iOS/Android app icon to match the given lunar phase.
 * Gracefully no-ops in Expo Go, web, simulators, and standard dev builds (will only
 * invoke native code in a custom dev client or standalone/production EAS build).
 *
 * @param {string} phaseName - The astronomical phase name (e.g. "Waxing Gibbous")
 * @returns {Promise<boolean>} - True if icon was changed, false otherwise
 */
export async function syncAppIconWithPhase(phaseName) {
  // Pre-check BEFORE requiring expo-dynamic-app-icon to prevent "Cannot find native module 'ExpoDynamicAppIcon'"
  if (!isDynamicAppIconAvailable()) {
    return false;
  }

  const iconKey = PHASE_ICON_MAP[phaseName];
  if (!iconKey) {
    return false;
  }

  try {
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
    return false;
  }
}
