import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import { LIVE_ACTION_BY_KEY, MINE_ROWS, OPP_ROWS } from '../../data/liveStats';
import type { LiveActionKey } from '../../data/liveStats';
import { COLORS, SPACING } from '../../constants/theme';

// Net dimensions matching .net style: height 4 + marginVertical 2 each side
const NET_AREA = 8;

type ZoneHit = { zone: number; half: 'opp' | 'mine' };
type LayoutSize = { width: number; height: number };
type GestureStart = { x: number; y: number; zone: number | null };
type XY = { x: number; y: number };

function getZoneHit(tx: number, ty: number, w: number, h: number): ZoneHit | null {
  const pad = SPACING.lg;
  const halfH = (h - 2 * pad - NET_AREA) / 2;
  const oppStart  = pad;
  const mineStart = pad + halfH + NET_AREA;

  let half: 'opp' | 'mine';
  let relY: number;

  if (ty >= oppStart && ty < oppStart + halfH) {
    half = 'opp';
    relY = ty - oppStart;
  } else if (ty >= mineStart && ty < mineStart + halfH) {
    half = 'mine';
    relY = ty - mineStart;
  } else {
    return null;
  }

  const row = relY < halfH / 2 ? 0 : 1;
  const col = tx < w / 3 ? 0 : tx < (w * 2) / 3 ? 1 : 2;
  const rows = half === 'opp' ? OPP_ROWS : MINE_ROWS;
  return { zone: rows[row][col], half };
}

type CourtGestureLayerProps = {
  pendingAction: LiveActionKey | null;
  targetTeam: 'mine' | 'opp' | null;
  onRecord: (zone: number, zoneStart: number | null) => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const CourtGestureLayer = ({ pendingAction, targetTeam, onRecord, children, style }: CourtGestureLayerProps) => {
  const viewRef = useRef<View>(null);
  const [gestureStart, setGestureStart] = useState<GestureStart | null>(null);
  const [currentXY, setCurrentXY] = useState<XY | null>(null);

  const pendingActionRef = useRef<LiveActionKey | null>(pendingAction);
  const targetTeamRef    = useRef<'mine' | 'opp' | null>(targetTeam);
  const layoutRef        = useRef<LayoutSize | null>(null);
  const gestureStartRef  = useRef<GestureStart | null>(null);
  const onRecordRef      = useRef(onRecord);
  // Screen-absolute offset of this View, used to convert pageX/pageY → local coords.
  // pageX/pageY in PanResponder events are reliable regardless of which child was touched.
  const pageOffsetRef    = useRef<XY>({ x: 0, y: 0 });

  // Latest-value refs read by the PanResponder (created once).
  useEffect(() => { pendingActionRef.current = pendingAction; }, [pendingAction]);
  useEffect(() => { targetTeamRef.current = targetTeam; }, [targetTeam]);
  useEffect(() => { onRecordRef.current = onRecord; }, [onRecord]);

  // Measure the View's screen position whenever layout changes.
  // measure() gives pageX/pageY = absolute screen coords of this View's origin.
  const handleLayout = useCallback(() => {
    if (viewRef.current) {
      viewRef.current.measure((_x, _y, width, height, pageX, pageY) => {
        layoutRef.current = { width, height };
        pageOffsetRef.current = { x: pageX, y: pageY };
      });
    }
  }, []);

  // Convert screen-absolute touch coords to coords local to this View.
  // Called from PanResponder callbacks; reads the stable ref so no stale-closure risk.
  const toLocal = (pageX: number, pageY: number): XY => ({
    x: pageX - pageOffsetRef.current.x,
    y: pageY - pageOffsetRef.current.y,
  });

  const startGesture = (start: GestureStart | null): void => {
    gestureStartRef.current = start;
    setGestureStart(start);
  };

  const clearGesture = (): void => {
    startGesture(null);
    setCurrentXY(null);
  };

  const panResponder = useRef(
    PanResponder.create({
      // Capture phase: claim the touch before child TouchableOpacity handlers fire.
      onStartShouldSetPanResponderCapture: () => pendingActionRef.current !== null,
      onStartShouldSetPanResponder:        () => pendingActionRef.current !== null,
      onMoveShouldSetPanResponder:         () => pendingActionRef.current !== null,

      onPanResponderGrant: (evt) => {
        const layout = layoutRef.current;
        const action = pendingActionRef.current;
        if (!layout || !action) return;
        // Use pageX/pageY (screen-absolute) converted to local coords.
        // locationX/Y can be relative to the child element that was touched, not this View.
        const local = toLocal(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
        let zone: number | null = null;
        if (LIVE_ACTION_BY_KEY[action].needsStartZone) {
          // Start zone is on the acting team's half; landing is on the opposing half.
          const startHalf: 'mine' | 'opp' = targetTeamRef.current === 'opp' ? 'opp' : 'mine';
          const hit = getZoneHit(local.x, local.y, layout.width, layout.height);
          zone = hit && hit.half === startHalf ? hit.zone : null;
        }
        startGesture({ x: local.x, y: local.y, zone });
        setCurrentXY(local);
      },

      onPanResponderMove: (evt) => {
        // Only the dashed trajectory line uses currentXY — skip re-renders otherwise.
        const action = pendingActionRef.current;
        if (!action || !LIVE_ACTION_BY_KEY[action].needsStartZone) return;
        if (gestureStartRef.current?.zone == null) return;
        setCurrentXY(toLocal(evt.nativeEvent.pageX, evt.nativeEvent.pageY));
      },

      onPanResponderRelease: (evt) => {
        const layout = layoutRef.current;
        const action = pendingActionRef.current;
        const start  = gestureStartRef.current;
        if (!layout || !action) {
          clearGesture();
          return;
        }
        const local   = toLocal(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
        const landing = getZoneHit(local.x, local.y, layout.width, layout.height);
        const needsStartZone = !!LIVE_ACTION_BY_KEY[action].needsStartZone;
        // Landing half is always opposite to the acting team's half.
        const landingHalf: 'mine' | 'opp' = targetTeamRef.current === 'opp' ? 'mine' : 'opp';
        const startZone = needsStartZone ? start?.zone ?? null : null;

        if (!landing || landing.half !== landingHalf || (needsStartZone && startZone === null)) {
          clearGesture();
          return;
        }
        onRecordRef.current(landing.zone, startZone);
      },

      onPanResponderTerminate: clearGesture,
    })
  ).current;

  // Feedback hidden as soon as no action is pending (stale gesture state is overwritten on next grant).
  const showFeedback = pendingAction !== null && gestureStart !== null && currentXY !== null;
  const needsStart   = pendingAction !== null && !!LIVE_ACTION_BY_KEY[pendingAction].needsStartZone;
  const hasStartZone = gestureStart !== null && gestureStart.zone !== null;

  return (
    <View ref={viewRef} style={style} onLayout={handleLayout} {...panResponder.panHandlers}>
      {children}
      {showFeedback && (
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          {needsStart && hasStartZone && (
            <Line
              x1={gestureStart.x}
              y1={gestureStart.y}
              x2={currentXY.x}
              y2={currentXY.y}
              stroke={COLORS.yellow}
              strokeWidth={3}
              strokeDasharray="8,5"
              strokeLinecap="round"
            />
          )}
          <Circle
            cx={gestureStart.x}
            cy={gestureStart.y}
            r={12}
            fill={needsStart && hasStartZone ? COLORS.yellow : COLORS.pink}
            fillOpacity={0.6}
          />
        </Svg>
      )}
    </View>
  );
};

export default CourtGestureLayer;
