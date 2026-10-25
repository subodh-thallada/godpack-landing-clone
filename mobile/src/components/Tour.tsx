// The in-app tour: a spotlight that walks through the main parts of the app,
// one element at a time, with "2 of 6", Back / Next and Skip. Elements opt in
// by wrapping themselves in <TourTarget id="…">.
import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import { type HostInstance, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { create } from 'zustand';
import { bump } from '../lib/haptics';
import { colors, radius, type } from '../theme';
import type { IconName } from './Icon';
import { Button, Press } from './ui';

type Rect = { x: number; y: number; w: number; h: number };
export type TourStep = { target: string; title: string; body: string; icon: IconName; shape?: 'pill' | 'round' | 'rect' };

type TourState = {
  rects: Record<string, Rect>;
  steps: TourStep[];
  index: number;
  active: boolean;
  onEnd: ((completed: boolean) => void) | null;
};

export const useTour = create<TourState>(() => ({ rects: {}, steps: [], index: 0, active: false, onEnd: null }));

const measurers = new Map<string, () => void>();

export function startTour(steps: TourStep[], onEnd?: (completed: boolean) => void) {
  measurers.forEach((m) => m());
  useTour.setState({ steps, index: 0, active: true, onEnd: onEnd ?? null });
}

export function endTour(completed: boolean) {
  const { onEnd } = useTour.getState();
  useTour.setState({ active: false, index: 0, onEnd: null });
  onEnd?.(completed);
}

// Wrap an element to make it a tour stop.
export function TourTarget({ id, children, style }: { id: string; children: ReactNode; style?: object }) {
  const ref = useRef<HostInstance>(null);
  const measure = useCallback(() => {
    ref.current?.measureInWindow((x, y, w, h) => {
      if (!w && !h) return;
      const prev = useTour.getState().rects[id];
      if (prev && prev.x === x && prev.y === y && prev.w === w && prev.h === h) return;
      useTour.setState((s) => ({ rects: { ...s.rects, [id]: { x, y, w, h } } }));
    });
  }, [id]);
  useEffect(() => {
    measurers.set(id, measure);
    return () => {
      measurers.delete(id);
    };
  }, [id, measure]);
  return (
    <View ref={ref} onLayout={() => requestAnimationFrame(measure)} collapsable={false} style={style}>
      {children}
    </View>
  );
}

const PAD = 6;

function holePath(W: number, H: number, r: Rect, shape: TourStep['shape']) {
  const x = r.x - PAD,
    y = r.y - PAD,
    w = r.w + PAD * 2,
    h = r.h + PAD * 2;
  const rad = shape === 'round' ? Math.min(w, h) / 2 : shape === 'pill' ? h / 2 : 16;
  const k = Math.min(rad, w / 2, h / 2);
  const outer = `M0 0H${W}V${H}H0Z`;
  const inner = `M${x + k} ${y}H${x + w - k}A${k} ${k} 0 0 1 ${x + w} ${y + k}V${y + h - k}A${k} ${k} 0 0 1 ${x + w - k} ${y + h}H${x + k}A${k} ${k} 0 0 1 ${x} ${y + h - k}V${y + k}A${k} ${k} 0 0 1 ${x + k} ${y}Z`;
  return { d: outer + inner, x, y, w, h, k };
}

export function TourOverlay() {
  const { active, steps, index, rects } = useTour();
  const { width: W, height: H } = useWindowDimensions();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    // Positions can shift after layout settles (e.g. fonts, images).
    const t = setTimeout(() => measurers.forEach((m) => m()), 60);
    return () => clearTimeout(t);
  }, [active, index]);

  // The ring only pulses while the tour is open.
  useEffect(() => {
    if (!active) {
      cancelAnimation(pulse);
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 0 })), -1);
    return () => cancelAnimation(pulse);
  }, [active, pulse]);

  const ring = useAnimatedStyle(() => ({ opacity: 1 - pulse.value * 0.8, transform: [{ scale: 1 + pulse.value * 0.06 }] }));

  if (!active) return null;
  const step = steps[index];
  const rect = step ? rects[step.target] : undefined;
  const last = index === steps.length - 1;
  const next = () => {
    bump('light');
    if (last) endTour(true);
    else useTour.setState({ index: index + 1 });
  };
  const back = () => index > 0 && useTour.setState({ index: index - 1 });

  // Put the tip below the target when it's in the top half, above otherwise.
  // A target that's off screen gets no spotlight; the tip then sits centred.
  const onScreen = !!rect && rect.y + rect.h > 0 && rect.y < H && rect.x + rect.w > 0 && rect.x < W;
  const hole = rect && onScreen ? holePath(W, H, rect, step.shape) : null;
  const below = hole ? hole.y + hole.h / 2 < H / 2 : true;
  const tipWidth = Math.min(W - 32, 360);
  const center = hole ? hole.x + hole.w / 2 : W / 2;
  const tipLeft = Math.max(16, Math.min(W - 16 - tipWidth, center - tipWidth / 2));
  const arrowLeft = Math.max(22, Math.min(tipWidth - 22, center - tipLeft)) - 9;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 50 }]} testID="tour" accessibilityViewIsModal>
      <Animated.View entering={FadeIn.duration(220)} style={StyleSheet.absoluteFill}>
        <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
          {hole ? <Path d={hole.d} fill="rgba(6,5,10,0.78)" fillRule="evenodd" /> : <Path d={`M0 0H${W}V${H}H0Z`} fill="rgba(6,5,10,0.78)" />}
        </Svg>
        {/* Taps anywhere advance; the spotlit element itself is not pressable during the tour. */}
        <Press haptic={false} scaleTo={1} accessibilityLabel="Next tip" onPress={next} style={StyleSheet.absoluteFill} />
      </Animated.View>
      {hole ? (
        <Animated.View
          key={`ring-${index}`}
          pointerEvents="none"
          style={[{ position: 'absolute', left: hole.x, top: hole.y, width: hole.w, height: hole.h, borderRadius: hole.k, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' }, ring]}
        />
      ) : null}
      <Animated.View
        key={`tip-${index}`}
        entering={FadeInDown.duration(240)}
        style={[
          styles.tip,
          { width: tipWidth, left: tipLeft },
          hole ? (below ? { top: hole.y + hole.h + 14 } : { bottom: H - hole.y + 14 }) : { top: H / 2 - 100 },
        ]}
        testID="tour-tip"
      >
        {hole ? <View style={[styles.arrow, { left: arrowLeft }, below ? styles.arrowUp : styles.arrowDown]} /> : null}
        <View style={styles.tipHead}>
          <Text style={[type.h3, { flex: 1 }]} testID="tour-title">
            {step.title}
          </Text>
          {!last ? (
            <Press haptic={false} onPress={() => endTour(false)} testID="tour-skip" accessibilityLabel="Skip tour" hitSlop={10} style={{ paddingLeft: 12, paddingVertical: 2 }}>
              <Text style={{ color: colors.accentSoft, fontWeight: '600', fontSize: 14 }}>Skip</Text>
            </Press>
          ) : null}
        </View>
        <Text style={{ color: colors.label2, fontSize: 14, lineHeight: 20 }}>{step.body}</Text>
        <View style={styles.foot}>
          <Text style={styles.count} testID="tour-count">
            {index + 1} of {steps.length}
          </Text>
          {index > 0 ? <Button label="Back" variant="secondary" size="sm" onPress={back} testID="tour-back" /> : null}
          <Button label={last ? 'Done' : 'Next'} size="sm" onPress={next} testID="tour-next" />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  tip: {
    position: 'absolute',
    backgroundColor: colors.dialog,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.dialogLine,
    padding: 16,
    gap: 6,
    boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
    ...(Platform.OS === 'web' ? { userSelect: 'none' } : null),
  },
  tipHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  count: { flex: 1, color: colors.faint, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  arrow: { position: 'absolute', width: 18, height: 18, backgroundColor: colors.dialog, borderColor: colors.dialogLine, transform: [{ rotate: '45deg' }] },
  arrowUp: { top: -9, borderLeftWidth: 1, borderTopWidth: 1 },
  arrowDown: { bottom: -9, borderRightWidth: 1, borderBottomWidth: 1 },
});
