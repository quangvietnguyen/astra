import './src/utils/patchGL';
import * as React from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  ImageBackground,
  useWindowDimensions,
  PanResponder,
  Animated,
} from 'react-native';
import Moon from './src/Components/moon';
import { getCurrentGPSLocation } from './src/services/locationService';
import { getMoonAstronomy } from './src/utils/astronomy';
import { syncAppIconWithPhase } from './src/utils/dynamicIcon';

export default function App() {
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.min(310, Math.max(270, windowWidth - 56));

  const [location, setLocation] = React.useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = React.useState(true);
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [dayOffset, setDayOffset] = React.useState(0);
  const [moonScale, setMoonScale] = React.useState(1.0);
  const [showTelemetryHUD, setShowTelemetryHUD] = React.useState(true);
  const [showOrbiter, setShowOrbiter] = React.useState(true);

  // Silky smooth native driver animated value (1 = HUD visible, 0 = HUD hidden)
  const hudAnim = React.useRef(new Animated.Value(1)).current;

  const toggleHUD = React.useCallback(
    (show) => {
      setShowTelemetryHUD(show);
      Animated.spring(hudAnim, {
        toValue: show ? 1 : 0,
        damping: 22,
        mass: 0.85,
        stiffness: 140,
        overshootClamping: true,
        useNativeDriver: true,
      }).start();
    },
    [hudAnim]
  );

  // Interpolations for fluid sliding
  const hudTranslateY = hudAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [360, 0],
  });

  const hudOpacity = hudAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.9, 1],
  });

  const collapsedTranslateY = hudAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 90],
  });

  const collapsedOpacity = hudAnim.interpolate({
    inputRange: [0, 0.6, 1],
    outputRange: [1, 0.2, 0],
  });

  // Swipe Down on HUD handle to hide HUD
  const hidePanResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 6,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 15 || gestureState.vy > 0.3) {
          toggleHUD(false);
        }
      },
    })
  ).current;

  // Swipe Up on collapsed handle to show HUD
  const showPanResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy < -6,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -15 || gestureState.vy < -0.3) {
          toggleHUD(true);
        }
      },
    })
  ).current;

  // Fetch GPS Coordinates on mount
  const fetchLocation = React.useCallback(async () => {
    setIsLoadingLocation(true);
    try {
      const loc = await getCurrentGPSLocation();
      setLocation(loc);
    } catch (err) {
      console.warn('GPS retrieval error:', err);
    } finally {
      setIsLoadingLocation(false);
    }
  }, []);

  React.useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  // Update clock every minute
  React.useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      if (dayOffset !== 0) {
        now.setDate(now.getDate() + dayOffset);
      }
      setCurrentDate(now);
    }, 60000);
    return () => clearInterval(timer);
  }, [dayOffset]);

  // Adjust date offset
  const changeDateOffset = (delta) => {
    const newOffset = dayOffset + delta;
    setDayOffset(newOffset);
    const d = new Date();
    d.setDate(d.getDate() + newOffset);
    setCurrentDate(d);
  };

  const resetToToday = () => {
    setDayOffset(0);
    setCurrentDate(new Date());
  };

  // Adjust Moon size scale
  const adjustMoonSize = (delta) => {
    setMoonScale((prev) => Math.max(0.6, Math.min(1.6, Number((prev + delta).toFixed(1)))));
  };

  // Compute astronomical lunar state
  const lat = location?.latitude ?? 0;
  const lon = location?.longitude ?? 0;
  const astronomy = React.useMemo(() => {
    return getMoonAstronomy(currentDate, lat, lon);
  }, [currentDate, lat, lon]);

  // Sync dynamic app icon with current real-world lunar phase
  React.useEffect(() => {
    const todayAstro = getMoonAstronomy(new Date(), lat, lon);
    if (todayAstro?.phaseName) {
      syncAppIconWithPhase(todayAstro.phaseName);
    }
  }, [lat, lon]);

  const formatCoord = (val, isLat) => {
    if (val == null) return '--';
    const dir = isLat ? (val >= 0 ? 'N' : 'S') : val >= 0 ? 'E' : 'W';
    return `${Math.abs(val).toFixed(2)}° ${dir}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground
        source={require('./assets/stars.jpeg')}
        resizeMode="cover"
        style={styles.stars}
      >
        {/* 3D WebGL Moon with adjustable size, behind-to-front NASA LRO orbiter, and HUD centering */}
        <Moon
          lightPosition={astronomy.lightPosition}
          moonScale={moonScale}
          showOrbiter={showOrbiter}
          hasHUD={showTelemetryHUD}
        />

        {/* Top Header & GPS Status Bar with Moon percentage */}
        <View style={styles.topBar} pointerEvents="box-none">
          <View style={styles.topLeftContainer} pointerEvents="auto">
            <Text style={styles.brandTitle}>ASTRA • LUNAR OBSERVER</Text>
            <View style={styles.statusRow}>
              <View style={styles.gpsRow}>
                <Text style={styles.gpsDot}>●</Text>
                <Text style={styles.gpsText} numberOfLines={1}>
                  {isLoadingLocation ? (
                    'Acquiring GPS fix...'
                  ) : (
                    `${formatCoord(location?.latitude, true)}, ${formatCoord(
                      location?.longitude,
                      false
                    )} ${location?.city ? `(${location.city})` : ''}`
                  )}
                </Text>
              </View>
              <View style={styles.topPhaseBadge}>
                <Text style={styles.topPhaseEmoji}>{astronomy.phaseEmoji}</Text>
                <Text style={styles.topPhasePercent}>{astronomy.illuminationPercent}% Full</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Horizontal Scrolling Telemetry HUD Overlay (Animated) */}
        <Animated.View
          style={[
            styles.hudOverlay,
            {
              opacity: hudOpacity,
              transform: [{ translateY: hudTranslateY }],
            },
          ]}
          pointerEvents={showTelemetryHUD ? 'box-none' : 'none'}
        >
          {/* Swipe Down Handle Indicator */}
          <View style={styles.swipeHandleArea} {...hidePanResponder.panHandlers}>
            <TouchableOpacity
              onPress={() => toggleHUD(false)}
              activeOpacity={0.7}
              style={styles.swipeHandlePill}
            >
              <Text style={styles.swipeArrowDown}>▼</Text>
              <Text style={styles.swipeHandleText}>Swipe down to hide</Text>
            </TouchableOpacity>
          </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={cardWidth + 12}
              decelerationRate="fast"
              snapToAlignment="start"
              contentContainerStyle={styles.horizontalScrollContent}
              pointerEvents="auto"
            >
              {/* Card 1: Moon Phase & Core Metrics */}
              <View style={[styles.card, { width: cardWidth }]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.phaseEmoji}>{astronomy.phaseEmoji}</Text>
                  <View style={styles.phaseTitleContainer}>
                    <View style={styles.phaseTitleRow}>
                      <Text style={styles.phaseName}>{astronomy.phaseName}</Text>
                      <View style={styles.fullPercentBadge}>
                        <Text style={styles.fullPercentBadgeText}>
                          {astronomy.illuminationPercent}% FULL
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.phaseSub}>
                      {astronomy.illuminationPercent}% Illuminated •{' '}
                      {astronomy.isWaxing ? 'Waxing' : 'Waning'}
                    </Text>
                  </View>
                </View>

                {/* Progress bar of lunar cycle to Full Moon */}
                <View style={styles.progressBarSection}>
                  <View style={styles.progressLabelsRow}>
                    <Text style={styles.progressLabel}>0% (NEW)</Text>
                    <Text style={styles.progressLabelHighlight}>
                      {astronomy.illuminationPercent}% FULL MOON
                    </Text>
                    <Text style={styles.progressLabel}>100% (FULL)</Text>
                  </View>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.min(100, Math.max(2, astronomy.illuminationPercent))}%` },
                      ]}
                    />
                  </View>
                </View>

                {/* Astronomical Metrics Grid */}
                <View style={styles.metricsGrid}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>MOON AGE</Text>
                    <Text style={styles.metricValue}>{astronomy.moonAgeDays} d</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>DISTANCE</Text>
                    <Text style={styles.metricValue}>
                      {astronomy.moonDistanceKm.toLocaleString()} km
                    </Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>ELONGATION</Text>
                    <Text style={styles.metricValue}>{astronomy.elongationDeg}°</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>HEMISPHERE</Text>
                    <Text style={styles.metricValue}>
                      {astronomy.isSouthernHemisphere ? 'Southern' : 'Northern'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Card 2: Moon Size Adjustment & Presets */}
              <View style={[styles.card, { width: cardWidth }]}>
                <Text style={styles.controlsTitle}>MOON SIZE ADJUSTMENT</Text>
                <View style={styles.sizeControlRow}>
                  <TouchableOpacity
                    style={styles.sizeBtn}
                    onPress={() => adjustMoonSize(-0.1)}
                  >
                    <Text style={styles.sizeBtnText}>－ Shrink</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.sizeCenterBtn}
                    onPress={() => setMoonScale(1.0)}
                  >
                    <Text style={styles.sizeCenterVal}>{Math.round(moonScale * 100)}%</Text>
                    <Text style={styles.sizeCenterSub}>Tap to Reset</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.sizeBtn}
                    onPress={() => adjustMoonSize(0.1)}
                  >
                    <Text style={styles.sizeBtnText}>＋ Enlarge</Text>
                  </TouchableOpacity>
                </View>

                {/* Quick Presets */}
                <View style={styles.presetsRow}>
                  {[
                    { label: 'Small', scale: 0.75 },
                    { label: 'Default', scale: 1.0 },
                    { label: 'Large', scale: 1.25 },
                    { label: 'Max', scale: 1.5 },
                  ].map((item) => (
                    <TouchableOpacity
                      key={item.label}
                      style={[
                        styles.presetPill,
                        Math.abs(moonScale - item.scale) < 0.05 && styles.presetPillActive,
                      ]}
                      onPress={() => setMoonScale(item.scale)}
                    >
                      <Text
                        style={[
                          styles.presetPillText,
                          Math.abs(moonScale - item.scale) < 0.05 && styles.presetPillTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Card 3: Active Spacecraft (NASA LRO) */}
              <View style={[styles.card, { width: cardWidth }]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.orbiterEmoji}>🛰️</Text>
                  <View style={styles.phaseTitleContainer}>
                    <Text style={styles.orbiterTitle}>NASA LRO</Text>
                    <Text style={styles.orbiterSub}>Behind-to-Front Polar Orbit</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.activeBadge, !showOrbiter && styles.activeBadgeOff]}
                    onPress={() => setShowOrbiter((v) => !v)}
                  >
                    <Text style={styles.activeBadgeText}>
                      {showOrbiter ? 'ORBITER: ON' : 'ORBITER: OFF'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.orbiterDesc}>
                  Circulating from behind the Moon across the front illuminated face.
                  Dynamically scales in sync with the Moon ({Math.round(moonScale * 100)}%).
                </Text>

                <View style={styles.orbiterMetricsRow}>
                  <View style={styles.orbiterMetric}>
                    <Text style={styles.orbiterMetricLabel}>ALTITUDE</Text>
                    <Text style={styles.orbiterMetricVal}>~50 km</Text>
                  </View>
                  <View style={styles.orbiterMetric}>
                    <Text style={styles.orbiterMetricLabel}>ORBIT</Text>
                    <Text style={styles.orbiterMetricVal}>Behind→Front</Text>
                  </View>
                  <View style={styles.orbiterMetric}>
                    <Text style={styles.orbiterMetricLabel}>SPEED</Text>
                    <Text style={styles.orbiterMetricVal}>1.6 km/s</Text>
                  </View>
                  <View style={styles.orbiterMetric}>
                    <Text style={styles.orbiterMetricLabel}>LRO SCALE</Text>
                    <Text style={styles.orbiterMetricVal}>{Math.round(moonScale * 100)}%</Text>
                  </View>
                </View>
              </View>

              {/* Card 4: Phase Time Travel */}
              <View style={[styles.card, { width: cardWidth }]}>
                <Text style={styles.controlsTitle}>PHASE TIME TRAVEL</Text>
                <Text style={styles.timeTravelDesc}>
                  Preview how the Moon's phase and lighting evolve day by day.
                </Text>
                <View style={styles.dateControlRow}>
                  <TouchableOpacity
                    style={styles.dateStepBtn}
                    onPress={() => changeDateOffset(-1)}
                  >
                    <Text style={styles.dateStepText}>-1 Day</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.dateCenterBtn} onPress={resetToToday}>
                    <Text style={styles.dateCenterText}>
                      {dayOffset === 0
                        ? 'Today (Live)'
                        : `${dayOffset > 0 ? '+' : ''}${dayOffset}d`}
                    </Text>
                    <Text style={styles.dateSubText}>
                      {currentDate.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dateStepBtn}
                    onPress={() => changeDateOffset(1)}
                  >
                    <Text style={styles.dateStepText}>+1 Day</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
        </Animated.View>

        {/* Floating Swipe Up Handle when HUD is hidden (Animated) */}
        <Animated.View
          style={[
            styles.collapsedHandleArea,
            {
              opacity: collapsedOpacity,
              transform: [{ translateY: collapsedTranslateY }],
            },
          ]}
          pointerEvents={showTelemetryHUD ? 'none' : 'box-none'}
          {...showPanResponder.panHandlers}
        >
          <TouchableOpacity
            onPress={() => toggleHUD(true)}
            activeOpacity={0.7}
            style={styles.collapsedHandlePill}
          >
            <Text style={styles.swipeArrowUp}>▲</Text>
            <Text style={styles.collapsedMoonEmoji}>{astronomy.phaseEmoji}</Text>
            <Text style={styles.collapsedHandleText}>
              {astronomy.phaseName} • {astronomy.illuminationPercent}% Full
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
  },
  stars: {
    flex: 1,
    width: '100%',
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 10,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 10,
  },
  topLeftContainer: {
    flexShrink: 1,
    marginRight: 12,
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00d2d3',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 210, 211, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 15, 28, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 211, 0.35)',
  },
  gpsDot: {
    color: '#10ac84',
    fontSize: 9,
    marginRight: 6,
  },
  gpsText: {
    color: '#dfe4ea',
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
  topPhaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 15, 28, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(241, 196, 15, 0.4)',
    gap: 5,
  },
  topPhaseEmoji: {
    fontSize: 12,
  },
  topPhasePercent: {
    color: '#f1c40f',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  swipeHandleArea: {
    alignItems: 'center',
    marginBottom: 8,
  },
  swipeHandlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 15, 28, 0.88)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 211, 0.35)',
    gap: 6,
  },
  swipeArrowDown: {
    color: '#00d2d3',
    fontSize: 9,
    fontWeight: '900',
  },
  swipeHandleText: {
    color: '#dfe4ea',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  collapsedHandleArea: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  collapsedHandlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 15, 28, 0.92)',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 210, 211, 0.5)',
    gap: 8,
    shadowColor: '#00d2d3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  swipeArrowUp: {
    color: '#00d2d3',
    fontSize: 11,
    fontWeight: '900',
  },
  collapsedMoonEmoji: {
    fontSize: 13,
  },
  collapsedHandleText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  hudOverlay: {
    position: 'absolute',
    bottom: 22,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  horizontalScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  card: {
    backgroundColor: 'rgba(9, 14, 26, 0.88)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(113, 128, 150, 0.25)',
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phaseEmoji: {
    fontSize: 32,
    marginRight: 10,
  },
  phaseTitleContainer: {
    flex: 1,
  },
  phaseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phaseName: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  fullPercentBadge: {
    backgroundColor: 'rgba(241, 196, 15, 0.18)',
    borderWidth: 1,
    borderColor: '#f1c40f',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  fullPercentBadgeText: {
    color: '#f1c40f',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  phaseSub: {
    color: '#a4b0be',
    fontSize: 12,
    marginTop: 2,
  },
  progressBarSection: {
    marginTop: 10,
  },
  progressLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressLabel: {
    color: '#747d8c',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  progressLabelHighlight: {
    color: '#f1c40f',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00d2d3',
    borderRadius: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    color: '#747d8c',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  metricValue: {
    color: '#f1f2f6',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  sizeControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 4,
  },
  sizeBtn: {
    backgroundColor: 'rgba(0, 210, 211, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 211, 0.4)',
  },
  sizeBtnText: {
    color: '#00d2d3',
    fontSize: 12,
    fontWeight: '700',
  },
  sizeCenterBtn: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  sizeCenterVal: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  sizeCenterSub: {
    color: '#a4b0be',
    fontSize: 9,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  presetPill: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  presetPillActive: {
    backgroundColor: 'rgba(0, 210, 211, 0.22)',
    borderColor: '#00d2d3',
  },
  presetPillText: {
    color: '#a4b0be',
    fontSize: 11,
    fontWeight: '600',
  },
  presetPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  orbiterEmoji: {
    fontSize: 26,
    marginRight: 10,
  },
  orbiterTitle: {
    color: '#f1c40f',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  orbiterSub: {
    color: '#a4b0be',
    fontSize: 11,
  },
  activeBadge: {
    backgroundColor: 'rgba(16, 172, 132, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10ac84',
  },
  activeBadgeOff: {
    backgroundColor: 'rgba(235, 77, 75, 0.2)',
    borderColor: '#eb4d4b',
  },
  activeBadgeText: {
    color: '#1dd1a1',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  orbiterDesc: {
    color: '#ced6e0',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
  orbiterMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  orbiterMetric: {
    alignItems: 'center',
  },
  orbiterMetricLabel: {
    color: '#747d8c',
    fontSize: 9,
    fontWeight: '700',
  },
  orbiterMetricVal: {
    color: '#dfe4ea',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  controlsTitle: {
    color: '#747d8c',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  timeTravelDesc: {
    color: '#a4b0be',
    fontSize: 11,
    marginBottom: 10,
  },
  dateControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: 4,
  },
  dateStepBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  dateStepText: {
    color: '#f1f2f6',
    fontSize: 11,
    fontWeight: '600',
  },
  dateCenterBtn: {
    alignItems: 'center',
  },
  dateCenterText: {
    color: '#00d2d3',
    fontSize: 12,
    fontWeight: '700',
  },
  dateSubText: {
    color: '#a4b0be',
    fontSize: 10,
  },
});
