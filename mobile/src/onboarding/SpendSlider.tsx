// A drag slider with four stops. The pack on stage follows it live; letting
// go projects the swipe's momentum to the stop it was heading for, and each
// stop ticks. Past either end the thumb resists instead of hitting a wall.
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedReaction, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { tap } from '../lib/haptics';
import { SNAP, project, rubberband } from '../lib/motion';
import { colors } from '../theme';
import { Press } from '../components/ui';

const THUMB = 30;

export function SpendSlider({ stops, value, onChange }: { stops: { id: string; label: string }[]; value: number | null; onChange: (i: number) => void }) {
  const [w, setW] = useState(0);
  const max = stops.length - 1;
  const span = Math.max(1, w - THUMB);
  const x = useSharedValue(value == null ? 0 : value / max); // 0..1 along the track
  const startX = useSharedValue(0);
  const dragging = useSharedValue(false);
  const last = useRef(value ?? -1);
  const latest = useRef(onChange);
  latest.current = onChange;

  useEffect(() => {
    if (value == null || dragging.get()) return;
    x.set(withSpring(value / max, SNAP));
  }, [value, max, x, dragging]);

  const emit = (i: number) => {
    if (i === last.current) return;
    last.current = i;
    tap();
    latest.current(i);
  };

  // The stop under the thumb, reported only when it changes (not per frame).
  useAnimatedReaction(
    () => (dragging.get() ? Math.round(Math.max(0, Math.min(1, x.get())) * max) : -1),
    (i, prev) => {
      if (i >= 0 && i !== prev) scheduleOnRN(emit, i);
    },
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((e) => {
          const p = Math.max(0, Math.min(1, (e.x - THUMB / 2) / span));
          x.set(p);
          startX.set(p);
          dragging.set(true);
        })
        .onUpdate((e) => {
          const p = startX.get() + e.translationX / span;
          // Beyond the ends, the further you drag the less it follows.
          x.set(p < 0 ? rubberband(p * span, span) / span : p > 1 ? 1 + rubberband((p - 1) * span, span) / span : p);
        })
        .onFinalize((e) => {
          dragging.set(false);
          const projected = Math.max(0, Math.min(1, x.get() + project(e.velocityX) / span));
          const i = Math.round(projected * max);
          x.set(withSpring(i / max, { ...SNAP, velocity: e.velocityX / span }));
          scheduleOnRN(emit, i);
        }),
    [span, max, x, startX, dragging],
  );

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() * span }] }));
  // The fill is absolute and childless, so animating its width costs no layout.
  const fill = useAnimatedStyle(() => ({ width: THUMB / 2 + Math.max(0, x.get()) * span }));

  return (
    <View style={{ gap: 14 }}>
      <GestureDetector gesture={pan}>
        <View
          onLayout={(e) => setW(e.nativeEvent.layout.width)}
          style={styles.hit}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Comfortable spend per session"
          accessibilityValue={{ text: value == null ? 'Not set' : stops[value].label }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => {
            const cur = value ?? 0;
            if (e.nativeEvent.actionName === 'increment') onChange(Math.min(max, cur + 1));
            if (e.nativeEvent.actionName === 'decrement') onChange(Math.max(0, cur - 1));
          }}
          testID="spend-slider"
        >
          <View style={styles.track} />
          <Animated.View style={[styles.fill, fill, { opacity: value == null ? 0 : 1 }]} />
          {stops.map((_, i) => (
            <View key={i} style={[styles.notch, { left: THUMB / 2 + (i / max) * span - 3 }]} />
          ))}
          <Animated.View style={[styles.thumb, thumb, value == null && { opacity: 0.6 }]} />
        </View>
      </GestureDetector>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {stops.map((s, i) => (
          <Press key={s.id} onPress={() => onChange(i)} testID={`opt-${s.id}`} accessibilityLabel={s.label} hitSlop={8} style={{ width: `${100 / stops.length}%`, alignItems: i === 0 ? 'flex-start' : i === max ? 'flex-end' : 'center' }}>
            <Text style={[styles.label, value === i && { color: colors.text }]}>{s.label}</Text>
          </Press>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { height: 44, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.line },
  fill: { position: 'absolute', left: 0, height: 6, borderRadius: 3, backgroundColor: colors.gold },
  notch: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: colors.lineStrong },
  thumb: { position: 'absolute', left: 0, width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: '#fff', boxShadow: '0 4px 14px rgba(0,0,0,0.45)' },
  label: { color: colors.muted, fontSize: 13, fontWeight: '600' },
});
