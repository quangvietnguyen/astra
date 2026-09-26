import './src/utils/patchGL';
import * as React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TouchableOpacity, Switch, ScrollView, Animated, Easing, Platform, ImageBackground, useWindowDimensions, PanResponder } from 'react-native';
import Moon from './src/Components/moon';
import { getCurrentGPSLocation } from './src/services/locationService';
import { trackDateOffsetChange, trackHudVisibility, trackMoonSizeSelection, trackOrbiterVisibility } from './src/services/analyticsService';
import { getMoonAstronomy, isLunarEclipse, isMidAutumnFullMoon } from './src/utils/astronomy';
import { syncAppIconWithPhase } from './src/utils/dynamicIcon';

const THUMB_SIZE = 54;
const ZOOM_THUMB_SIZE = 18;
const DAY_WIDTH = 40;
const TIMELINE_RADIUS = 90;
const TIMELINE_DAYS = Array.from({ length: TIMELINE_RADIUS * 2 + 1 }, (_, index) => index - TIMELINE_RADIUS);

export default function App() {
  const { width, height } = useWindowDimensions();
  const isIPad = Platform.OS === 'ios' && Platform.isPad;
  const isIPhone = Platform.OS === 'ios' && !isIPad;
  const isIPadLandscape = isIPad && width > height;
  const isTablet = Platform.OS === 'ios' ? isIPad : width >= 768;
  const panelWidth = isIPadLandscape ? Math.min(width - 64, 1200) : Math.min(width - (isTablet ? 64 : 24), 720);
  const [landscapeTrackWidth, setLandscapeTrackWidth] = React.useState(480);
  const trackWidth = isIPadLandscape ? landscapeTrackWidth : panelWidth - 36;
  const timelineRef = React.useRef(null);
  const scrollCommitted = React.useRef(false);
  const previewDaysRef = React.useRef(0);
  const [zoomTrackWidth, setZoomTrackWidth] = React.useState(80);
  const zoomTrackWidthRef = React.useRef(zoomTrackWidth);
  const [location, setLocation] = React.useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = React.useState(true);
  const [dayOffset, setDayOffset] = React.useState(0);
  const [dragDays, setDragDays] = React.useState(0);
  const [moonScale, setMoonScale] = React.useState(1);
  const [showTimeline, setShowTimeline] = React.useState(true);
  const timelineAnimation = React.useRef(new Animated.Value(1)).current;
  const [showOrbiter, setShowOrbiter] = React.useState(true);
  const [clockTime, setClockTime] = React.useState(() => new Date());
  const moonScaleRef = React.useRef(1);
  const zoomStartRef = React.useRef(1);
  const zoomPhaseRef = React.useRef('');
  zoomTrackWidthRef.current = zoomTrackWidth;
  moonScaleRef.current = moonScale;

  React.useEffect(() => {
    let active = true;
    getCurrentGPSLocation().then((value) => {
      if (active) setLocation(value);
    }).catch((error) => console.warn('GPS retrieval error:', error)).finally(() => {
      if (active) setIsLoadingLocation(false);
    });
    return () => { active = false; };
  }, []);

  React.useEffect(() => {
    const timer = setInterval(() => setClockTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const displayedOffset = dayOffset + dragDays;
  const displayedDate = React.useMemo(() => {
    const date = new Date(clockTime);
    date.setDate(date.getDate() + displayedOffset);
    return date;
  }, [clockTime, displayedOffset]);
  const lat = location?.latitude ?? 0;
  const lon = location?.longitude ?? 0;
  const astronomy = React.useMemo(() => getMoonAstronomy(displayedDate, lat, lon), [displayedDate, lat, lon]);
  const isMoonEclipse = React.useMemo(() => isLunarEclipse(displayedDate, astronomy), [displayedDate, astronomy]);
  const isMidAutumn = React.useMemo(() => !isMoonEclipse && isMidAutumnFullMoon(displayedDate, astronomy), [displayedDate, astronomy, isMoonEclipse]);

  React.useEffect(() => {
    const today = new Date();
    const todayAstro = getMoonAstronomy(today, lat, lon);
    if (isLunarEclipse(today, todayAstro)) syncAppIconWithPhase('Eclipse', true);
    else if (isMidAutumnFullMoon(today, todayAstro)) syncAppIconWithPhase('Full Moon', false);
    else if (todayAstro?.phaseName) syncAppIconWithPhase(todayAstro.phaseName, false);
  }, [lat, lon]);

  const setOffset = (offset, source) => {
    const delta = offset - dayOffset;
    if (delta === 0 && source !== 'today') return;
    setDayOffset(offset);
    trackDateOffsetChange({ delta, offset, source, phaseName: astronomy.phaseName });
  };
  const centerTimeline = () => timelineRef.current?.scrollTo({ x: TIMELINE_RADIUS * DAY_WIDTH, animated: false });
  const previewTimeline = (event) => {
    if (scrollCommitted.current) return;
    const days = Math.max(-TIMELINE_RADIUS, Math.min(TIMELINE_RADIUS,
      Math.round(event.nativeEvent.contentOffset.x / DAY_WIDTH) - TIMELINE_RADIUS));
    if (days !== previewDaysRef.current) {
      previewDaysRef.current = days;
      setDragDays(days);
    }
  };
  const commitTimeline = (event) => {
    if (scrollCommitted.current) return;
    scrollCommitted.current = true;
    const days = Math.max(-TIMELINE_RADIUS, Math.min(TIMELINE_RADIUS,
      Math.round(event.nativeEvent.contentOffset.x / DAY_WIDTH) - TIMELINE_RADIUS));
    centerTimeline();
    previewDaysRef.current = 0;
    setDragDays(0);
    if (days !== 0) setOffset(dayOffset + days, 'timeline_drag');
  };
  const selectTimelineDay = (days) => {
    scrollCommitted.current = true;
    centerTimeline();
    previewDaysRef.current = 0;
    setDragDays(0);
    if (days !== 0) setOffset(dayOffset + days, 'timeline_tap');
  };
  const selectTimelineDayRef = React.useRef(selectTimelineDay);
  selectTimelineDayRef.current = selectTimelineDay;

  const zoomResponder = React.useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { zoomStartRef.current = moonScaleRef.current; },
    onPanResponderMove: (_, gesture) => {
      const travelWidth = Math.max(1, zoomTrackWidthRef.current - ZOOM_THUMB_SIZE);
      const scale = Math.max(0.6, Math.min(1.6, zoomStartRef.current + gesture.dx / travelWidth));
      const nextScale = Number(scale.toFixed(2));
      moonScaleRef.current = nextScale;
      setMoonScale(nextScale);
    },
    onPanResponderRelease: () => {
      if (moonScaleRef.current !== zoomStartRef.current) {
        trackMoonSizeSelection({ scale: moonScaleRef.current, method: 'drag', phaseName: zoomPhaseRef.current });
      }
    },
  }), []);

  const selectMoonSize = (scale, method) => {
    const nextScale = Math.max(0.6, Math.min(1.6, Number(scale.toFixed(2))));
    setMoonScale(nextScale);
    trackMoonSizeSelection({ scale: nextScale, method, phaseName: astronomy.phaseName });
  };
  const toggleOrbiter = (enabled) => {
    setShowOrbiter(enabled);
    trackOrbiterVisibility({ enabled, phaseName: astronomy.phaseName });
  };
  const toggleTimeline = (visible) => {
    if (visible === showTimeline) return;
    setShowTimeline(visible);
    trackHudVisibility({ visible, source: 'button' });
    timelineAnimation.stopAnimation();
    Animated.timing(timelineAnimation, {
      toValue: visible ? 1 : 0,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };
  const formatCoord = (value, isLat) => `${Math.abs(value).toFixed(2)}° ${isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W')}`;

  const phaseName = isMoonEclipse ? 'Total Lunar Eclipse' : isMidAutumn ? 'Mid-Autumn Full Moon' : astronomy.phaseName;
  zoomPhaseRef.current = astronomy.phaseName;
  const phaseEmoji = isMoonEclipse ? '🔴' : isMidAutumn ? '🏮' : astronomy.phaseEmoji;
  const accent = isMoonEclipse ? '#e57855' : isMidAutumn ? '#f6d27e' : '#e8d19a';
  const hemisphere = location ? (astronomy.isSouthernHemisphere ? 'Southern' : 'Northern') : 'Equatorial';
  const timelineDates = React.useMemo(() => TIMELINE_DAYS.map((delta) => {
    const date = new Date(clockTime);
    date.setDate(date.getDate() + dayOffset + delta);
    const monthStart = date.getDate() === 1;
    return {
      day: date.getDate(),
      monthStart,
      shortLabel: date.toLocaleDateString(undefined, { [monthStart ? 'month' : 'weekday']: 'short' }).toUpperCase(),
      fullLabel: date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    };
  }), [clockTime, dayOffset]);
  const timelineCells = React.useMemo(() => timelineDates.map((date, index) => {
    const days = TIMELINE_DAYS[index];
    return <TouchableOpacity key={days} style={s.dayCell} onPress={() => selectTimelineDayRef.current(days)} accessibilityRole="button" accessibilityLabel={date.fullLabel}>
      <Text style={[s.dayWeekday, date.monthStart && s.dayMonth]}>{date.shortLabel}</Text>
      <Text style={s.dayNumber}>{date.day}</Text>
      <View style={[s.dayTick, date.monthStart && s.monthTick]} />
    </TouchableOpacity>;
  }), [timelineDates]);

  return (
    <View style={s.container}>
      <StatusBar style="light" />
      <ImageBackground source={require('./assets/stars.jpeg')} resizeMode="cover" style={s.stars}>
        <Moon lightPosition={astronomy.lightPosition} moonScale={moonScale} isMoonEclipse={isMoonEclipse} isMidAutumn={isMidAutumn} showOrbiter={showOrbiter} hasHUD={showTimeline} hudCenterY={isIPad ? 0 : isIPhone ? 0.45 : 0.70} dayOffset={displayedOffset} />

        <View style={[s.header, isTablet && s.headerTablet]}>
          <View style={s.headerCopy} pointerEvents="none">
            <Text style={s.brand}>ASTRA <Text style={s.brandSub}>/ LUNAR OBSERVER</Text></Text>
            {location && <Text style={s.location} numberOfLines={1}><Text style={s.locationDot}>●  </Text>{`${formatCoord(location.latitude, true)}, ${formatCoord(location.longitude, false)}${location.city ? ` (${location.city})` : ''}`}</Text>}
            {isLoadingLocation && <Text style={s.location}>Locating…</Text>}
          </View>
          <View style={s.satelliteControl}><Text style={s.satelliteIcon}>🛰</Text><Switch value={showOrbiter} onValueChange={toggleOrbiter} trackColor={{ false: '#3b4c55', true: '#5ac8ba' }} thumbColor="#ffffff" ios_backgroundColor="#3b4c55" style={s.satelliteSwitch} accessibilityLabel="Show NASA LRO satellite" /></View>
        </View>

        <View style={[s.floatingControls, isIPhone && s.floatingControlsIPhone, isTablet && s.floatingControlsTablet]}>
          <View style={s.zoomControl}>
            <View style={s.zoomTrack} onLayout={(event) => { const next = event.nativeEvent.layout.width; if (next !== zoomTrackWidthRef.current) { zoomTrackWidthRef.current = next; setZoomTrackWidth(next); } }}>
              <View style={s.zoomLine} />
              <View style={[s.zoomFill, { width: `${(moonScale - 0.6) * 100}%` }]} />
              <View style={[s.zoomThumb, { left: (moonScale - 0.6) * (zoomTrackWidth - ZOOM_THUMB_SIZE) }]} hitSlop={{ top: 11, bottom: 11, left: 11, right: 11 }} {...zoomResponder.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel="Moon zoom" accessibilityValue={{ min: 60, max: 160, now: Math.round(moonScale * 100), text: `${Math.round(moonScale * 100)} percent` }} accessibilityActions={[{ name: 'increment', label: 'Zoom in' }, { name: 'decrement', label: 'Zoom out' }]} onAccessibilityAction={(event) => selectMoonSize(moonScale + (event.nativeEvent.actionName === 'increment' ? 0.1 : -0.1), 'accessibility')} />
            </View>
          </View>
        </View>

        <Animated.View
          style={[s.timelinePanel, isIPhone && s.timelinePanelIPhone, isIPadLandscape && s.timelinePanelLandscape, { width: panelWidth }, {
            opacity: timelineAnimation,
            transform: [{ translateY: timelineAnimation.interpolate({ inputRange: [0, 1], outputRange: [220, 0] }) }],
          }]}
          pointerEvents={showTimeline ? 'auto' : 'none'}
          accessibilityElementsHidden={!showTimeline}
          importantForAccessibility={showTimeline ? 'auto' : 'no-hide-descendants'}
        >
            <View style={[s.timelineHeader, isIPadLandscape && s.timelineHeaderLandscape]}>
              <View style={[s.dateCopy, isIPadLandscape && s.dateCopyLandscape]}>
                <Text style={s.timelineEyebrow}>LUNAR TIMELINE <Text style={s.dragHint}>· DRAG THE MOON</Text></Text>
                <Text style={s.dateText} numberOfLines={1}>{displayedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                <Text style={[s.phaseSummaryName, { color: accent }]} numberOfLines={1}>{phaseName} <Text style={s.phaseSummaryPercent}>· {astronomy.illuminationPercent}% lit</Text></Text>
              </View>
              <View style={s.timelineActions}>
                {displayedOffset !== 0 && <TouchableOpacity onPress={() => { scrollCommitted.current = true; centerTimeline(); previewDaysRef.current = 0; setDragDays(0); setOffset(0, 'today'); }} style={s.todayButton} accessibilityRole="button" accessibilityLabel="Return to today"><Text style={s.todayText}>TODAY</Text></TouchableOpacity>}
                <TouchableOpacity onPress={() => toggleTimeline(false)} style={s.hideButton} accessibilityRole="button" accessibilityLabel="Collapse lunar timeline"><Text style={[s.collapsedArrow, s.downArrow]}>⌃</Text></TouchableOpacity>
              </View>
            </View>
            <View
              style={[s.track, isIPadLandscape && s.trackLandscape]}
              onLayout={isIPadLandscape ? (event) => {
                const measuredWidth = event.nativeEvent.layout.width;
                setLandscapeTrackWidth((previous) => previous === measuredWidth ? previous : measuredWidth);
              } : undefined}
            >
              <View pointerEvents="none" style={s.trackLine} />
              <ScrollView
                ref={timelineRef}
                style={s.rulerScroll}
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={DAY_WIDTH}
                contentContainerStyle={{ paddingHorizontal: (trackWidth - DAY_WIDTH) / 2 }}
                contentOffset={{ x: TIMELINE_RADIUS * DAY_WIDTH, y: 0 }}
                onLayout={centerTimeline}
                onScrollBeginDrag={() => { scrollCommitted.current = false; }}
                onScroll={previewTimeline}
                scrollEventThrottle={16}
                onMomentumScrollEnd={commitTimeline}
                onScrollEndDrag={(event) => { if (Math.abs(event.nativeEvent.velocity?.x || 0) < 0.05) commitTimeline(event); }}
                accessibilityLabel="Lunar date ruler. Swipe to travel through dates"
              >
                {timelineCells}
              </ScrollView>
              <View pointerEvents="none" style={[s.thumb, { left: (trackWidth - THUMB_SIZE) / 2, borderColor: accent }]}><Text style={s.thumbEmoji}>{phaseEmoji}</Text></View>
            </View>
            <View style={[s.timelineDetails, isIPadLandscape && s.timelineDetailsLandscape]}><Text style={[s.detailText, isIPadLandscape && s.detailTextLandscape]}>AGE <Text style={s.detailValue}>{astronomy.moonAgeDays} d</Text></Text><Text style={[s.detailText, isIPadLandscape && s.detailTextLandscape]}>DISTANCE <Text style={s.detailValue}>{astronomy.moonDistanceKm.toLocaleString()} km</Text></Text><Text style={[s.detailText, isIPadLandscape && s.detailTextLandscape]}>ANGLE <Text style={s.detailValue}>{astronomy.elongationDeg}°</Text></Text><Text style={[s.detailText, isIPadLandscape && s.detailTextLandscape]}>VIEW <Text style={s.detailValue}>{hemisphere}</Text></Text></View>
        </Animated.View>
        <Animated.View
          style={[s.collapsedOverlay, { opacity: timelineAnimation.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ translateY: timelineAnimation.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }]}
          pointerEvents={showTimeline ? 'none' : 'box-none'}
          accessibilityElementsHidden={showTimeline}
          importantForAccessibility={showTimeline ? 'no-hide-descendants' : 'auto'}
        >
          <TouchableOpacity style={[s.collapsedTimeline, isIPad && s.collapsedTimelineIPad]} onPress={() => toggleTimeline(true)} accessibilityRole="button" accessibilityLabel={`Expand lunar timeline. ${phaseName}, ${astronomy.illuminationPercent} percent illuminated`}><Text style={s.collapsedText}>{phaseEmoji}  {displayedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text><Text style={s.collapsedArrow}>⌃</Text></TouchableOpacity>
        </Animated.View>
      </ImageBackground>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingTop: Platform.OS === 'ios' ? 44 : 20 },
  stars: { flex: 1, width: '100%' },
  header: { position: 'absolute', top: 16, left: 20, right: 16, zIndex: 10, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  headerTablet: { top: 26, left: 32 },
  headerCopy: { flex: 1, minWidth: 0 },
  brand: { color: '#e5f4f4', fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  brandSub: { color: '#6d9c9f', fontWeight: '500', letterSpacing: 1.2 },
  location: { color: '#a7b9bb', fontSize: 11, marginTop: 7 },
  locationDot: { color: '#4ec7a3' },
  floatingControls: { position: 'absolute', top: 80, right: 16, zIndex: 11, alignItems: 'flex-end' },
  floatingControlsIPhone: { top: 64 },
  floatingControlsTablet: { top: 78, right: 16 },
  zoomControl: { width: 102, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 14, backgroundColor: 'rgba(8, 17, 25, 0.78)', borderWidth: 1, borderColor: 'rgba(176, 204, 207, 0.2)' },
  zoomTrack: { height: 22, justifyContent: 'center' },
  zoomLine: { height: 3, borderRadius: 2, backgroundColor: '#3b5860' },
  zoomFill: { position: 'absolute', left: 0, height: 3, borderRadius: 2, backgroundColor: '#73cec3' },
  zoomThumb: { position: 'absolute', width: ZOOM_THUMB_SIZE, height: ZOOM_THUMB_SIZE, top: 2, borderRadius: 9, backgroundColor: '#e5f4ed', borderWidth: 2, borderColor: '#83d3c7' },
  satelliteControl: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 83, height: 30, paddingLeft: 7, paddingRight: 0, borderRadius: 15, backgroundColor: 'rgba(8, 17, 25, 0.78)', borderWidth: 1, borderColor: 'rgba(176, 204, 207, 0.2)' },
  satelliteIcon: { color: '#e2eeed', fontSize: 14 },
  satelliteSwitch: { transform: [{ scaleX: 0.62 }, { scaleY: 0.62 }], marginRight: -8 },
  timelinePanel: { position: 'absolute', alignSelf: 'center', bottom: 14, zIndex: 10, paddingTop: 11, paddingBottom: 10, borderRadius: 20, backgroundColor: 'rgba(7, 15, 24, 0.90)', borderWidth: 1, borderColor: 'rgba(151, 183, 187, 0.22)' },
  timelinePanelIPhone: { borderBottomLeftRadius: 38, borderBottomRightRadius: 38 },
  timelinePanelLandscape: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 9, paddingBottom: 9 },
  timelineHeader: { paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8 },
  timelineHeaderLandscape: { width: 240, paddingHorizontal: 0, flexDirection: 'column', alignItems: 'stretch', gap: 5 },
  dateCopy: { flex: 1, minWidth: 0 },
  dateCopyLandscape: { flex: 0, width: '100%' },
  timelineActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timelineEyebrow: { color: '#77b8b7', fontSize: 9, fontWeight: '800', letterSpacing: 1.3 },
  dragHint: { color: '#729191', fontWeight: '500', letterSpacing: 0.2 },
  dateText: { color: '#f2f5f3', fontSize: 14, fontWeight: '700', marginTop: 2 },
  phaseSummaryName: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  phaseSummaryPercent: { color: '#a3b7b5', fontWeight: '500' },
  todayButton: { minWidth: 62, height: 36, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: 'rgba(85, 173, 170, 0.18)' },
  todayText: { color: '#8cddd3', fontSize: 10, fontWeight: '800' },
  hideButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: 'rgba(7, 15, 24, 0.9)', borderWidth: 1, borderColor: 'rgba(151, 183, 187, 0.3)' },
  downArrow: { transform: [{ rotate: '180deg' }], marginTop: -5 },
  track: { marginHorizontal: 18, height: 60, marginTop: 2, overflow: 'hidden' },
  trackLandscape: { flex: 1, minWidth: 0, marginHorizontal: 14, marginTop: 0 },
  trackLine: { position: 'absolute', left: 0, right: 0, height: 2, top: 52, backgroundColor: 'rgba(123, 188, 185, 0.28)' },
  rulerScroll: { flex: 1 },
  dayCell: { width: DAY_WIDTH, height: 60, alignItems: 'center', paddingTop: 4 },
  dayWeekday: { color: '#829ea1', fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
  dayMonth: { color: '#a4d0ca' },
  dayNumber: { color: '#c2d2d1', fontSize: 17, fontWeight: '700', marginTop: 3, fontVariant: ['tabular-nums'] },
  dayTick: { width: 1, height: 10, marginTop: 6, backgroundColor: '#527579' },
  monthTick: { width: 2, height: 13, backgroundColor: '#93bcb8' },
  thumb: { position: 'absolute', width: THUMB_SIZE, height: THUMB_SIZE, top: 2, borderRadius: THUMB_SIZE / 2, borderWidth: 1.5, backgroundColor: '#101f29', alignItems: 'center', justifyContent: 'center' },
  thumbEmoji: { fontSize: 29, lineHeight: 34 },
  timelineDetails: { marginHorizontal: 18, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(151, 183, 187, 0.17)', flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', columnGap: 10, rowGap: 5 },
  timelineDetailsLandscape: { width: 230, marginHorizontal: 0, paddingTop: 0, paddingLeft: 20, borderTopWidth: 0, columnGap: 6, rowGap: 8 },
  detailText: { color: '#779497', fontSize: 9, fontWeight: '700' },
  detailTextLandscape: { width: '48%', fontSize: 10 },
  detailValue: { color: '#d5e4e0', fontWeight: '600' },
  collapsedOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 11 },
  collapsedTimeline: { position: 'absolute', alignSelf: 'center', bottom: 22, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 22, backgroundColor: 'rgba(7, 15, 24, 0.9)', borderWidth: 1, borderColor: 'rgba(151, 183, 187, 0.3)' },
  collapsedTimelineIPad: { left: 32, alignSelf: 'auto' },
  collapsedText: { color: '#e9e8d8', fontSize: 12, fontWeight: '700' },
  collapsedArrow: { color: '#8bceca', fontSize: 18, marginTop: 5 },
});
