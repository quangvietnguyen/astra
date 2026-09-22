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
import { getMoonAstronomy, isLunarEclipse, isMidAutumnFullMoon } from './src/utils/astronomy';
import { syncAppIconWithPhase } from './src/utils/dynamicIcon';

export default function App() {
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth >= 768;
  const isCompactTablet = isTablet && windowWidth < 1180;
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
    outputRange: [isTablet ? (isCompactTablet ? 520 : 380) : 360, 0],
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

  // Automatic astronomical calendar detection for Lunar Eclipse and Mid-Autumn Full Moon
  const isMoonEclipse = React.useMemo(() => {
    return isLunarEclipse(currentDate, astronomy);
  }, [currentDate, astronomy]);

  const isMidAutumn = React.useMemo(() => {
    return !isMoonEclipse && isMidAutumnFullMoon(currentDate, astronomy);
  }, [currentDate, astronomy, isMoonEclipse]);

  // Sync dynamic app icon with current real-world lunar phase / astronomical event
  React.useEffect(() => {
    const today = new Date();
    const todayAstro = getMoonAstronomy(today, lat, lon);
    const todayIsEclipse = isLunarEclipse(today, todayAstro);
    const todayIsMidAutumn = isMidAutumnFullMoon(today, todayAstro);

    if (todayIsEclipse) {
      syncAppIconWithPhase('Eclipse', true);
    } else if (todayIsMidAutumn) {
      syncAppIconWithPhase('Full Moon', false);
    } else if (todayAstro?.phaseName) {
      syncAppIconWithPhase(todayAstro.phaseName, false);
    }
  }, [lat, lon]);

  const formatCoord = (val, isLat) => {
    if (val == null) return '--';
    const dir = isLat ? (val >= 0 ? 'N' : 'S') : val >= 0 ? 'E' : 'W';
    return `${Math.abs(val).toFixed(2)}° ${dir}`;
  };

  // Infinite horizontal scroll configuration (5 sets: Set 2 is the center set)
  const cardStep = cardWidth + 12;
  const cycleWidth = 4 * cardStep;
  const initialScrollX = 2 * cycleWidth;
  const scrollViewRef = React.useRef(null);
  const isAdjustingScroll = React.useRef(false);
  const hasInitializedScroll = React.useRef(false);

  const handleScrollLayout = React.useCallback(() => {
    if (!hasInitializedScroll.current) {
      hasInitializedScroll.current = true;
      scrollViewRef.current?.scrollTo({
        x: initialScrollX,
        animated: false,
      });
    }
  }, [initialScrollX]);

  const handleMomentumScrollEnd = React.useCallback(
    (e) => {
      if (isAdjustingScroll.current) {
        isAdjustingScroll.current = false;
        return;
      }
      const offsetX = e.nativeEvent.contentOffset.x;
      const centerOffset = 2 * cycleWidth;
      const diff = offsetX - centerOffset;
      const cyclesAway = Math.round(diff / cycleWidth);

      if (cyclesAway !== 0) {
        const normalizedX = offsetX - cyclesAway * cycleWidth;
        isAdjustingScroll.current = true;
        scrollViewRef.current?.scrollTo({
          x: normalizedX,
          animated: false,
        });
      }
    },
    [cycleWidth]
  );

  const handleScrollEndDrag = React.useCallback(
    (e) => {
      const velocity = Math.abs(e.nativeEvent.velocity?.x || 0);
      if (velocity < 0.1) {
        handleMomentumScrollEnd(e);
      }
    },
    [handleMomentumScrollEnd]
  );

  const renderCardContent = React.useCallback(
    (index) => {
      switch (index) {
        case 0:
          return (
            <>
              <View style={styles.cardHeader}>
                <Text style={styles.phaseEmoji}>
                  {isMoonEclipse ? '🔴' : isMidAutumn ? '🏮' : astronomy.phaseEmoji}
                </Text>
                <View style={styles.phaseTitleContainer}>
                  <View style={styles.phaseTitleRow}>
                    <Text
                      style={[
                        styles.phaseName,
                        isMoonEclipse && styles.phaseNameEclipse,
                        isMidAutumn && styles.phaseNameMidAutumn,
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {isMoonEclipse
                        ? 'Total Eclipse'
                        : isMidAutumn
                        ? 'Mid-Autumn'
                        : astronomy.phaseName}
                    </Text>
                    <View
                      style={[
                        styles.fullPercentBadge,
                        isMoonEclipse && styles.fullPercentBadgeEclipse,
                        isMidAutumn && styles.fullPercentBadgeMidAutumn,
                      ]}
                    >
                      <Text
                        style={[
                          styles.fullPercentBadgeText,
                          isMoonEclipse && styles.fullPercentBadgeTextEclipse,
                          isMidAutumn && styles.fullPercentBadgeTextMidAutumn,
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                      >
                        {isMoonEclipse
                          ? 'BLOOD MOON'
                          : isMidAutumn
                          ? '100% RADIANT'
                          : `${astronomy.illuminationPercent}% FULL`}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.phaseSub} numberOfLines={1} ellipsizeMode="tail">
                    {isMoonEclipse
                      ? 'Total Lunar Eclipse • Earth Umbra'
                      : isMidAutumn
                      ? 'Autumn Festival • Golden Luminescence'
                      : `${astronomy.zodiacSign} • ${astronomy.moonAltitudeDeg}° Altitude`}
                  </Text>
                </View>
              </View>

              {/* Progress bar of lunar cycle to Full Moon */}
              <View style={styles.progressBarSection}>
                <View style={styles.progressLabelsRow}>
                  <Text style={styles.progressLabel}>0% (NEW)</Text>
                  <Text
                    style={[
                      styles.progressLabelHighlight,
                      isMoonEclipse && styles.progressLabelHighlightEclipse,
                      isMidAutumn && styles.progressLabelHighlightMidAutumn,
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {isMoonEclipse
                      ? 'UMBRA TOTALITY'
                      : isMidAutumn
                      ? 'HARVEST FULL MOON'
                      : `${astronomy.illuminationPercent}% FULL MOON`}
                  </Text>
                  <Text style={styles.progressLabel}>100% (FULL)</Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      isMoonEclipse && styles.progressBarFillEclipse,
                      isMidAutumn && styles.progressBarFillMidAutumn,
                      {
                        width: `${
                          isMoonEclipse || isMidAutumn
                            ? 100
                            : Math.min(100, Math.max(2, astronomy.illuminationPercent))
                        }%`,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Astronomical Metrics Grid */}
              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel} numberOfLines={1} ellipsizeMode="tail">MOON AGE</Text>
                  <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{astronomy.moonAgeDays} d</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel} numberOfLines={1} ellipsizeMode="tail">DISTANCE</Text>
                  <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {astronomy.moonDistanceKm.toLocaleString()} km
                  </Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel} numberOfLines={1} ellipsizeMode="tail">ELONGATION</Text>
                  <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{astronomy.elongationDeg}°</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={styles.metricLabel} numberOfLines={1} ellipsizeMode="tail">HEMISPHERE</Text>
                  <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {location != null
                      ? astronomy.isSouthernHemisphere
                        ? 'Southern'
                        : 'Northern'
                      : 'Equatorial'}
                  </Text>
                </View>
              </View>
            </>
          );
        case 1:
          return (
            <>
              <Text style={styles.controlsTitle} numberOfLines={1}>MOON SIZE ADJUSTMENT</Text>
              <View style={styles.sizeControlRow}>
                <TouchableOpacity
                  style={styles.sizeBtn}
                  onPress={() => adjustMoonSize(-0.1)}
                >
                  <Text style={styles.sizeBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>－ Shrink</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sizeCenterBtn}
                  onPress={() => setMoonScale(1.0)}
                >
                  <Text style={styles.sizeCenterVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{Math.round(moonScale * 100)}%</Text>
                  <Text style={styles.sizeCenterSub} numberOfLines={1}>Tap to Reset</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sizeBtn}
                  onPress={() => adjustMoonSize(0.1)}
                >
                  <Text style={styles.sizeBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>＋ Enlarge</Text>
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
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          );
        case 2:
          return (
            <>
              <View style={styles.cardHeader}>
                <Text style={styles.orbiterEmoji}>🛰️</Text>
                <View style={styles.phaseTitleContainer}>
                  <Text style={styles.orbiterTitle} numberOfLines={1} ellipsizeMode="tail">NASA LRO</Text>
                  <Text style={styles.orbiterSub} numberOfLines={1} ellipsizeMode="tail">Behind-to-Front Polar Orbit</Text>
                </View>
                <TouchableOpacity
                  style={[styles.activeBadge, !showOrbiter && styles.activeBadgeOff]}
                  onPress={() => setShowOrbiter((v) => !v)}
                >
                  <Text style={styles.activeBadgeText} numberOfLines={1}>
                    {showOrbiter ? 'ORBITER: ON' : 'ORBITER: OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.orbiterDesc} numberOfLines={2} ellipsizeMode="tail">
                Circulating from behind the Moon across the front illuminated face.
                Dynamically scales in sync with the Moon ({Math.round(moonScale * 100)}%).
              </Text>

              <View style={styles.orbiterMetricsRow}>
                <View style={styles.orbiterMetric}>
                  <Text style={styles.orbiterMetricLabel} numberOfLines={1} ellipsizeMode="tail">ALTITUDE</Text>
                  <Text style={styles.orbiterMetricVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>~50 km</Text>
                </View>
                <View style={styles.orbiterMetric}>
                  <Text style={styles.orbiterMetricLabel} numberOfLines={1} ellipsizeMode="tail">ORBIT</Text>
                  <Text style={styles.orbiterMetricVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Behind→Front</Text>
                </View>
                <View style={styles.orbiterMetric}>
                  <Text style={styles.orbiterMetricLabel} numberOfLines={1} ellipsizeMode="tail">SPEED</Text>
                  <Text style={styles.orbiterMetricVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>1.6 km/s</Text>
                </View>
                <View style={styles.orbiterMetric}>
                  <Text style={styles.orbiterMetricLabel} numberOfLines={1} ellipsizeMode="tail">LRO SCALE</Text>
                  <Text style={styles.orbiterMetricVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{Math.round(moonScale * 100)}%</Text>
                </View>
              </View>
            </>
          );
        case 3:
          return (
            <>
              <View>
                <Text style={styles.controlsTitle} numberOfLines={1}>PHASE TIME TRAVEL</Text>
                <Text style={styles.timeTravelDesc} numberOfLines={2} ellipsizeMode="tail">
                  Preview how the Moon's phase and lighting evolve day by day.
                </Text>
              </View>

              <View style={styles.dateControlRow}>
                <TouchableOpacity
                  style={styles.dateStepBtn}
                  onPress={() => changeDateOffset(-1)}
                >
                  <Text style={styles.dateStepText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>-1 Day</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.dateCenterBtn} onPress={resetToToday}>
                  <Text style={styles.dateCenterText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                    {dayOffset === 0
                      ? 'Today (Live)'
                      : `${dayOffset > 0 ? '+' : ''}${dayOffset}d`}
                  </Text>
                  <Text style={styles.dateSubText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
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
                  <Text style={styles.dateStepText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>+1 Day</Text>
                </TouchableOpacity>
              </View>

              {/* Quick Day Jumps fitting the card width */}
              <View style={styles.presetsRow}>
                {[
                  { label: '-7d', delta: -7 },
                  { label: '-1d', delta: -1 },
                  { label: 'Today', delta: 0, isReset: true },
                  { label: '+1d', delta: 1 },
                  { label: '+7d', delta: 7 },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[
                      styles.presetPill,
                      item.isReset && dayOffset === 0 && styles.presetPillActive,
                    ]}
                    onPress={() => (item.isReset ? resetToToday() : changeDateOffset(item.delta))}
                  >
                    <Text
                      style={[
                        styles.presetPillText,
                        item.isReset && dayOffset === 0 && styles.presetPillTextActive,
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          );
        default:
          return null;
      }
    },
    [
      astronomy,
      moonScale,
      showOrbiter,
      dayOffset,
      currentDate,
      adjustMoonSize,
      isMoonEclipse,
      isMidAutumn,
      location,
    ]
  );

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
          isMoonEclipse={isMoonEclipse}
          isMidAutumn={isMidAutumn}
          showOrbiter={showOrbiter}
          hasHUD={showTelemetryHUD}
          dayOffset={dayOffset}
        />

        {/* Top Header & GPS Status Bar with Moon percentage */}
        <View style={[styles.topBar, isTablet && styles.topBarTablet]} pointerEvents="box-none">
          <View style={[styles.headerContainer, isTablet && styles.headerContainerTablet]} pointerEvents="auto">
            <Text style={[styles.brandTitle, isTablet && styles.brandTitleTablet]}>
              ASTRA • LUNAR OBSERVER
            </Text>
            <View style={[styles.statusRow, isTablet && styles.statusRowTablet]}>
              {location != null && (
                <View style={styles.gpsRow}>
                  <Text style={styles.gpsDot}>●</Text>
                  <Text style={styles.gpsText} numberOfLines={1}>
                    {`${formatCoord(location.latitude, true)}, ${formatCoord(
                      location.longitude,
                      false
                    )} ${location.city ? `(${location.city})` : ''}`}
                  </Text>
                </View>
              )}
              <View
                style={[
                  styles.topPhaseBadge,
                  isMoonEclipse && styles.topPhaseBadgeEclipse,
                  isMidAutumn && styles.topPhaseBadgeMidAutumn,
                ]}
              >
                <Text style={styles.topPhaseEmoji}>
                  {isMoonEclipse ? '🔴' : isMidAutumn ? '🏮' : astronomy.phaseEmoji}
                </Text>
                <Text
                  style={[
                    styles.topPhasePercent,
                    isMoonEclipse && styles.topPhasePercentEclipse,
                    isMidAutumn && styles.topPhasePercentMidAutumn,
                  ]}
                >
                  {isMoonEclipse
                    ? 'Total Eclipse'
                    : isMidAutumn
                    ? 'Mid-Autumn'
                    : `${astronomy.illuminationPercent}% Full`}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Telemetry HUD Overlay (Animated: Full horizontal deck on iPad, horizontal scroll on phone) */}
        <Animated.View
          style={[
            styles.hudOverlay,
            isTablet && styles.hudOverlayTablet,
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

          {isTablet ? (
            <View
              style={[
                styles.tabletCardsDeck,
                isCompactTablet && styles.tabletCardsDeckCompact,
              ]}
              pointerEvents="auto"
            >
              {[0, 1, 2, 3].map((cardIdx) => (
                <View
                  key={`tablet-card-${cardIdx}`}
                  style={[styles.tabletCard, isCompactTablet && styles.tabletCardCompact]}
                >
                  {renderCardContent(cardIdx)}
                </View>
              ))}
            </View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={cardStep}
              decelerationRate="fast"
              snapToAlignment="start"
              contentContainerStyle={styles.horizontalScrollContent}
              pointerEvents="auto"
              contentOffset={{ x: initialScrollX, y: 0 }}
              onLayout={handleScrollLayout}
              onMomentumScrollEnd={handleMomentumScrollEnd}
              onScrollEndDrag={handleScrollEndDrag}
            >
              {[0, 1, 2, 3, 4].map((setIdx) => (
                <React.Fragment key={`set-${setIdx}`}>
                  {[0, 1, 2, 3].map((cardIdx) => (
                    <View
                      key={`card-${setIdx}-${cardIdx}`}
                      style={[styles.card, { width: cardWidth }]}
                    >
                      {renderCardContent(cardIdx)}
                    </View>
                  ))}
                </React.Fragment>
              ))}
            </ScrollView>
          )}
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
            <Text style={styles.collapsedMoonEmoji}>
              {isMoonEclipse ? '🔴' : isMidAutumn ? '🏮' : astronomy.phaseEmoji}
            </Text>
            <Text style={styles.collapsedHandleText}>
              {isMoonEclipse
                ? 'Total Lunar Eclipse • Blood Moon'
                : isMidAutumn
                ? 'Mid-Autumn Full Moon • 100% Radiant'
                : `${astronomy.phaseName} • ${astronomy.illuminationPercent}% Full`}
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
  topBarTablet: {
    top: Platform.OS === 'ios' ? 24 : 16,
    left: 28,
    right: 28,
  },
  headerContainer: {
    flexShrink: 1,
    marginRight: 12,
  },
  headerContainerTablet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginRight: 0,
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
  brandTitleTablet: {
    fontSize: 16,
    letterSpacing: 2.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  statusRowTablet: {
    marginTop: 0,
  },
  hudOverlayTablet: {
    bottom: 24,
    paddingHorizontal: 16,
  },
  tabletCardsDeck: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 12,
    width: '100%',
    maxWidth: 1360,
    alignSelf: 'center',
  },
  tabletCardsDeckCompact: {
    flexWrap: 'wrap',
    maxWidth: 980,
  },
  tabletCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: 'rgba(9, 14, 26, 0.90)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(113, 128, 150, 0.25)',
    justifyContent: 'space-between',
    height: 188,
    overflow: 'hidden',
  },
  tabletCardCompact: {
    flexGrow: 0,
    flexBasis: '48%',
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
    height: 168,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  phaseEmoji: {
    fontSize: 32,
    marginRight: 10,
    marginTop: 2,
  },
  phaseTitleContainer: {
    flex: 1,
    minWidth: 0,
  },
  phaseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  phaseName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  fullPercentBadge: {
    backgroundColor: 'rgba(241, 196, 15, 0.18)',
    borderWidth: 1,
    borderColor: '#f1c40f',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
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
    flex: 1,
  },
  progressLabelHighlight: {
    color: '#f1c40f',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    flex: 1.4,
    textAlign: 'center',
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
    flex: 1,
    minWidth: 0,
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
    flex: 1,
    minWidth: 0,
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
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  dateStepText: {
    color: '#f1f2f6',
    fontSize: 11,
    fontWeight: '600',
  },
  dateCenterBtn: {
    flex: 1.35,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: 4,
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
  topPhaseBadgeEclipse: {
    borderColor: 'rgba(217, 112, 78, 0.65)',
    backgroundColor: 'rgba(42, 18, 14, 0.88)',
  },
  topPhasePercentEclipse: {
    color: '#e57855',
  },
  topPhaseBadgeMidAutumn: {
    borderColor: 'rgba(230, 190, 94, 0.70)',
    backgroundColor: 'rgba(46, 38, 18, 0.88)',
  },
  topPhasePercentMidAutumn: {
    color: '#f6d27e',
  },
  phaseNameEclipse: {
    color: '#e57855',
  },
  phaseNameMidAutumn: {
    color: '#f6d27e',
  },
  fullPercentBadgeEclipse: {
    backgroundColor: 'rgba(217, 112, 78, 0.20)',
    borderColor: '#d9704e',
  },
  fullPercentBadgeTextEclipse: {
    color: '#e57855',
  },
  fullPercentBadgeMidAutumn: {
    backgroundColor: 'rgba(246, 210, 126, 0.18)',
    borderColor: '#e6be5e',
  },
  fullPercentBadgeTextMidAutumn: {
    color: '#f6d27e',
  },
  progressLabelHighlightEclipse: {
    color: '#e57855',
  },
  progressLabelHighlightMidAutumn: {
    color: '#f6d27e',
  },
  progressBarFillEclipse: {
    backgroundColor: '#d9704e',
  },
  progressBarFillMidAutumn: {
    backgroundColor: '#f6d27e',
  },
});
