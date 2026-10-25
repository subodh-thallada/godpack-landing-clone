// The last beat of onboarding, above every screen so it survives the route
// change into the app: the onboarding stage irises open from the pack to
// reveal the app underneath, while the card you pulled flies down into the
// Vault tab, which pops to catch it.
import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { EASE_IN_OUT, EASE_OUT } from '../lib/motion';
import { colors, type Tier } from '../theme';
import { Thumb } from './Thumb';

type Card = { id: string; tier: Tier };
type CurtainState = { active: boolean; card: Card | null; from: { x: number; y: number; w: number } | null; origin: { x: number; y: number } | null };

export const useCurtain = create<CurtainState>(() => ({ active: false, card: null, from: null, origin: null }));
// Bumped when something lands in the Vault, so its tab can pop.
export const usePulse = create<{ vault: number }>(() => ({ vault: 0 }));

export function playCurtain(card: Card | null, from: CurtainState['from'], origin: CurtainState['origin']) {
  useCurtain.setState({ active: true, card, from, origin });
}

const IRIS_BORDER = 2400;

export function Curtain() {
  const { active, card, from, origin } = useCurtain();
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const r = useSharedValue(0);
  const t = useSharedValue(0);
  const fade = useSharedValue(1);

  const ox = origin?.x ?? W / 2;
  const oy = origin?.y ?? H / 2;
  const R = Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy)) + 40;

  useEffect(() => {
    if (!active) return;
    const finish = () => useCurtain.setState({ active: false, card: null, from: null, origin: null });
    const land = () => usePulse.setState({ vault: Date.now() });
    if (reduced) {
      land();
      finish();
      return;
    }
    r.set(0);
    t.set(0);
    fade.set(1);
    // Hold a beat so the app mounts underneath, then open. The card lands
    // and the Vault tab pops on the same frame.
    r.set(withDelay(260, withTiming(R, { duration: 760, easing: EASE_IN_OUT })));
    t.set(
      withDelay(
        340,
        withTiming(1, { duration: 880, easing: EASE_IN_OUT }, (done) => {
          if (done) scheduleOnRN(land);
        }),
      ),
    );
    fade.set(withDelay(1180, withTiming(0, { duration: 160, easing: EASE_OUT }, (done) => done && scheduleOnRN(finish))));
  }, [active, R, r, t, fade, reduced]);

  // Where the Vault tab sits: third of five, in the bar under the chat dock.
  const vx = W / 2;
  const vy = H - Math.max(insets.bottom, 8) - 36;
  const cw = from?.w ?? 120;
  const ch = cw / (600 / 1005);
  const sx = from ? from.x + cw / 2 : W / 2;
  const sy = from ? from.y + ch / 2 : H / 3;

  // The iris is a ring with a huge border: a hole that grows. It's absolute
  // and childless, so sizing it costs no layout beyond itself (a uniform
  // scale can't grow the hole while keeping the ring big enough to cover).
  const iris = useAnimatedStyle(() => ({
    position: 'absolute',
    left: ox - r.get() - IRIS_BORDER,
    top: oy - r.get() - IRIS_BORDER,
    width: (r.get() + IRIS_BORDER) * 2,
    height: (r.get() + IRIS_BORDER) * 2,
    borderRadius: r.get() + IRIS_BORDER,
    borderWidth: IRIS_BORDER,
    borderColor: colors.bg,
    opacity: fade.get(),
  }));
  const fly = useAnimatedStyle(() => {
    const p = t.get();
    // A gentle arc down to the tab.
    const x = sx + (vx - sx) * p;
    const y = sy + (vy - sy) * p - Math.sin(p * Math.PI) * 60;
    const s = 1 - p * 0.86;
    return {
      position: 'absolute',
      left: x - cw / 2,
      top: y - ch / 2,
      // It comes up out of the phone preview, then fades into the tab.
      opacity: p < 0.12 ? p / 0.12 : p > 0.92 ? (1 - p) / 0.08 : 1,
      transform: [{ scale: s }, { rotate: `${p * -14}deg` }],
    };
  });

  if (!active) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 40 }]} pointerEvents="auto" testID="curtain">
      <Animated.View style={iris} />
      {card ? (
        <Animated.View style={fly}>
          <Thumb id={card.id} graded tier={card.tier} width={cw} large />
        </Animated.View>
      ) : null}
    </View>
  );
}
