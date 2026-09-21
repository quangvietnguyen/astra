import * as Location from 'expo-location';

/**
 * Location Service:
 * Retrieves accurate hardware GPS coordinates using expo-location.
 *
 * Two Setups Supported:
 * 1. Location available & permission granted: returns real GPS coordinates { latitude, longitude, city, ... }
 * 2. Cannot get location (permission denied, disabled, simulator, or error): returns null.
 *    (No IP estimation, no fake coordinates).
 *
 * @returns {Promise<Object|null>} Real device GPS location object or null if unavailable
 */
export async function getCurrentGPSLocation() {
  try {
    // 1. Request foreground location permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return null;
    }

    // 2. Query hardware device GPS position
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    if (!pos || !pos.coords) {
      return null;
    }

    const { latitude, longitude, altitude, accuracy } = pos.coords;

    // 3. Reverse geocode to get actual city / region name (best-effort)
    let cityName = '';
    try {
      const reverse = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (reverse && reverse.length > 0) {
        const place = reverse[0];
        cityName = place.city || place.subregion || place.region || place.name || '';
      }
    } catch (e) {
      // Reverse geocode failure is non-fatal
    }

    return {
      latitude: Number(latitude.toFixed(4)),
      longitude: Number(longitude.toFixed(4)),
      altitude: altitude != null ? Math.round(altitude) : null,
      accuracy: accuracy != null ? Math.round(accuracy) : null,
      city: cityName,
    };
  } catch (err) {
    // In any failure case (offline, denied, disabled, simulator without GPS), return null
    return null;
  }
}
