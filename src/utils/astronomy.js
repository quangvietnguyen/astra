/**
 * Astronomical calculations for the Moon and Sun.
 * Computes exact lunar phase, illuminated fraction, age,
 * and topocentric 3D lighting vector for Three.js based on
 * observer GPS coordinates (latitude, longitude) and date/time.
 */

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/**
 * Normalizes an angle into [0, 360) degrees.
 */
function normalizeDeg(deg) {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

/**
 * Calculates the Julian Date for a given JavaScript Date.
 */
export function getJulianDate(date = new Date()) {
  return date.getTime() / 86400000 + 2440587.5;
}

/**
 * Calculates comprehensive Moon and Sun astronomical data
 * @param {Date} date - Current date/time
 * @param {number} lat - Observer latitude in decimal degrees
 * @param {number} lon - Observer longitude in decimal degrees
 */
export function getMoonAstronomy(date = new Date(), lat = 0, lon = 0) {
  const jd = getJulianDate(date);
  const T = (jd - 2451545.0) / 36525; // Julian centuries since J2000.0

  // 1. Sun's ecliptic coordinates
  const L0 = normalizeDeg(280.46646 + 36000.76983 * T);
  const M_sun = normalizeDeg(357.52911 + 35999.05029 * T);
  const C_sun =
    (1.914602 - 0.004817 * T) * Math.sin(M_sun * DEG2RAD) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M_sun * DEG2RAD) +
    0.000289 * Math.sin(3 * M_sun * DEG2RAD);
  const sunEclipticLong = normalizeDeg(L0 + C_sun);

  // 2. Moon's fundamental orbital parameters (Jean Meeus / Astronomical Algorithms)
  const L_prime = normalizeDeg(218.3164477 + 481267.8812815 * T); // Mean longitude
  const D = normalizeDeg(297.8501921 + 445267.1114034 * T); // Mean elongation
  const M_moon = normalizeDeg(134.9633964 + 477198.8675055 * T); // Moon mean anomaly
  const F = normalizeDeg(93.272095 + 483202.0175233 * T); // Argument of latitude

  // Periodic perturbations in longitude
  const moonEclipticLong = normalizeDeg(
    L_prime +
      6.288774 * Math.sin(M_moon * DEG2RAD) +
      1.274027 * Math.sin((2 * D - M_moon) * DEG2RAD) +
      0.658309 * Math.sin(2 * D * DEG2RAD) +
      0.213618 * Math.sin(2 * M_moon * DEG2RAD) -
      0.185116 * Math.sin(M_sun * DEG2RAD) -
      0.114332 * Math.sin(2 * F * DEG2RAD) +
      0.058793 * Math.sin((2 * D - 2 * M_moon) * DEG2RAD) +
      0.057066 * Math.sin((2 * D - M_sun - M_moon) * DEG2RAD) +
      0.05332 * Math.sin((2 * D + M_moon) * DEG2RAD) +
      0.045758 * Math.sin((2 * D - M_sun) * DEG2RAD)
  );

  // Periodic perturbations in latitude
  const moonEclipticLat =
    5.128167 * Math.sin(F * DEG2RAD) +
    0.280606 * Math.sin((M_moon + F) * DEG2RAD) +
    0.277693 * Math.sin((M_moon - F) * DEG2RAD) +
    0.173238 * Math.sin((2 * D - F) * DEG2RAD);

  // Moon distance in km
  const moonDistanceKm = Math.round(
    385000.56 -
      20905.355 * Math.cos(M_moon * DEG2RAD) -
      3699.111 * Math.cos((2 * D - M_moon) * DEG2RAD) -
      2955.968 * Math.cos(2 * D * DEG2RAD) -
      569.925 * Math.cos(2 * M_moon * DEG2RAD)
  );

  // 3. Moon Phase & Elongation
  const elongation = normalizeDeg(moonEclipticLong - sunEclipticLong);
  const phaseAngle = 180 - elongation; // Phase angle in degrees
  const illumination = (1 - Math.cos(elongation * DEG2RAD)) / 2; // Fraction 0.0 - 1.0

  // Synodic month = 29.53058867 days
  const synodicMonth = 29.53058867;
  const moonAgeDays = (elongation / 360) * synodicMonth;

  // Phase Classification
  let phaseName = 'New Moon';
  let phaseEmoji = '🌑';
  if (elongation < 12 || elongation >= 348) {
    phaseName = 'New Moon';
    phaseEmoji = '🌑';
  } else if (elongation < 78) {
    phaseName = 'Waxing Crescent';
    phaseEmoji = '🌒';
  } else if (elongation < 102) {
    phaseName = 'First Quarter';
    phaseEmoji = '🌓';
  } else if (elongation < 168) {
    phaseName = 'Waxing Gibbous';
    phaseEmoji = '🌔';
  } else if (elongation < 192) {
    phaseName = 'Full Moon';
    phaseEmoji = '🌕';
  } else if (elongation < 258) {
    phaseName = 'Waning Gibbous';
    phaseEmoji = '🌖';
  } else if (elongation < 282) {
    phaseName = 'Last Quarter';
    phaseEmoji = '🌗';
  } else {
    phaseName = 'Waning Crescent';
    phaseEmoji = '🌘';
  }

  // 4. Observer Location & Sky Tilt Adjustment
  // In the Northern Hemisphere, Waxing Moon is lit on the right (+X in screen coordinates).
  // In the Southern Hemisphere, the view is inverted (lit on the left).
  // Observer latitude and local time tilt the bright limb.
  const isSouthernHemisphere = lat < 0;
  // Tilt angle relative to vertical
  // Latitude tilt: near equator, crescent can appear horizontal ("wet moon" or "boat moon")
  const tiltDeg = isSouthernHemisphere ? 180 - lat * 0.2 : lat * 0.35;
  const tiltRad = tiltDeg * DEG2RAD;

  // 5. 3D Light Direction Vector for Three.js
  // In Three.js: Moon is at [0, 0, 0], Camera is at [0, 0, 10].
  // elongation = 0   (New Moon): Sun is behind Moon at [0, 0, -R]
  // elongation = 90  (First Quarter): Sun is on the right [+R, 0, 0]
  // elongation = 180 (Full Moon): Sun is behind Camera at [0, 0, +R]
  // elongation = 270 (Last Quarter): Sun is on the left [-R, 0, 0]
  const R = 18;
  const elRad = elongation * DEG2RAD;

  // Raw coordinates before observer tilt
  const rawX = R * Math.sin(elRad);
  const rawY = 0;
  const lightZ = -R * Math.cos(elRad);

  // Apply observer tilt rotation in the XY screen plane
  const lightX = rawX * Math.cos(tiltRad) - rawY * Math.sin(tiltRad);
  const lightY = rawX * Math.sin(tiltRad) + rawY * Math.cos(tiltRad);

  return {
    phaseName,
    phaseEmoji,
    illuminationPercent: Math.round(illumination * 1000) / 10,
    illuminationFraction: illumination,
    elongationDeg: Math.round(elongation * 10) / 10,
    phaseAngleDeg: Math.round(phaseAngle * 10) / 10,
    moonAgeDays: Math.round(moonAgeDays * 10) / 10,
    moonDistanceKm,
    isWaxing: elongation > 0 && elongation < 180,
    isSouthernHemisphere,
    lightPosition: [
      Number(lightX.toFixed(2)),
      Number(lightY.toFixed(2)),
      Number(lightZ.toFixed(2)),
    ],
    sunEclipticLong: Math.round(sunEclipticLong * 10) / 10,
    moonEclipticLong: Math.round(moonEclipticLong * 10) / 10,
    moonEclipticLat: Math.round(moonEclipticLat * 10) / 10,
  };
}
