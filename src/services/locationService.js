/**
 * Location Service:
 * Retrieves accurate GPS coordinates (latitude, longitude, altitude, accuracy)
 * using a multi-tiered fallback strategy:
 * 1. Hardware GPS via navigator.geolocation (Web & Mobile browser/WebView)
 * 2. Expo Location module (if available)
 * 3. Network IP Geolocation service (ipwho.is / ipapi)
 */

export async function getCurrentGPSLocation() {
  // Strategy 1: Check standard navigator.geolocation (hardware GPS)
  if (
    typeof navigator !== 'undefined' &&
    navigator.geolocation &&
    typeof navigator.geolocation.getCurrentPosition === 'function'
  ) {
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 6000,
            maximumAge: 60000,
          }
        );
      });

      if (pos && pos.coords) {
        return {
          latitude: Number(pos.coords.latitude.toFixed(4)),
          longitude: Number(pos.coords.longitude.toFixed(4)),
          altitude: pos.coords.altitude != null ? Math.round(pos.coords.altitude) : null,
          accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null,
          provider: 'Hardware GPS (Geolocation API)',
          status: 'success',
          city: 'Local Device GPS',
          country: '',
        };
      }
    } catch (err) {
      console.log('navigator.geolocation unavailable or timed out, trying fallbacks...');
    }
  }

  // Strategy 2: Check expo-location if bundled
  try {
    const ExpoLocation = require('expo-location');
    if (ExpoLocation && ExpoLocation.requestForegroundPermissionsAsync) {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.High,
        });
        if (location && location.coords) {
          return {
            latitude: Number(location.coords.latitude.toFixed(4)),
            longitude: Number(location.coords.longitude.toFixed(4)),
            altitude: location.coords.altitude != null ? Math.round(location.coords.altitude) : null,
            accuracy: location.coords.accuracy ? Math.round(location.coords.accuracy) : null,
            provider: 'Expo Location GPS',
            status: 'success',
            city: 'Device GPS',
            country: '',
          };
        }
      }
    }
  } catch (e) {
    // expo-location not bundled, continue to IP geolocation
  }

  // Strategy 3: Fast and accurate IP Geolocation service
  try {
    const response = await fetch('https://ipwho.is/');
    if (response.ok) {
      const data = await response.json();
      if (data && data.success && data.latitude != null) {
        return {
          latitude: Number(data.latitude.toFixed(4)),
          longitude: Number(data.longitude.toFixed(4)),
          altitude: null,
          accuracy: 500, // estimated accuracy in meters
          city: data.city || 'Current Location',
          region: data.region || '',
          country: data.country || '',
          countryCode: data.country_code || '',
          provider: 'Network GPS / IP Telemetry',
          status: 'success',
        };
      }
    }
  } catch (err) {
    console.warn('Network IP geolocation error:', err);
  }

  // Strategy 4: Fallback to Greenwich Meridian / Default Location if offline
  return {
    latitude: 21.0285,
    longitude: 105.8542,
    altitude: 15,
    accuracy: null,
    city: 'Hanoi',
    region: 'Hanoi',
    country: 'Vietnam',
    provider: 'Default Telemetry Coordinates',
    status: 'fallback',
  };
}
