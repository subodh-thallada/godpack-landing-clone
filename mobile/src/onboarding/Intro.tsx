// The first second of the app: the logo lights up in the dark, then drifts
// down into the pack's emblem as the scene fades in around it, so the brand
// mark becomes the thing you're about to open. Plays once; a tap skips it.
// With reduced motion it's a short crossfade and nothing travels.
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Mark } from '../components/Icon';
import { DUR, EASE_IN_OUT, EASE_OUT } from '../lib/motion';
import { colors } from '../theme';

const SIZE = 96;

export function Intro({ to, onReveal, onDone }: { to: { x: number; y: number; size: number }; onReveal: () => void; onDone: () => void }) {
  const { width: W, height: H } = useWindowDimensions();
  const reduced = useReducedMotion();
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onReveal();
    onDone();
  };

  const lit = useSharedValue(0); // the mark and its glow arriving
  const travel = useSharedValue(0); // the mark moving into the pack
  const veil = useSharedValue(1); // the dark backdrop

  useEffect(() => {
    // The scene starts arriving as the mark sets off, so the pack is there
    // to receive it.
    const reveal = setTimeout(onReveal, reduced ? 700 : 950);
    if (reduced) {
      lit.set(withTiming(1, { duration: DUR.small }));
      veil.set(withDelay(700, withTiming(0, { duration: DUR.ui }, (f) => f && scheduleOnRN(finish))));
      return () => clearTimeout(reveal);
    }
    lit.set(withTiming(1, { duration: 520, easing: EASE_OUT }));
    travel.set(withDelay(950, withTiming(1, { duration: 560, easing: EASE_IN_OUT })));
    veil.set(withDelay(1000, withTiming(0, { duration: 520, easing: EASE_OUT }, (f) => f && scheduleOnRN(finish))));
    return () => clearTimeout(reveal);
  }, []); // once, on mount

  const cx = W / 2;
  const cy = H * 0.42;
  const scaleTo = to.size / SIZE;

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.get() }));
  const markStyle = useAnimatedStyle(() => {
    const t = travel.get();
    return {
      position: 'absolute',
      left: 0,
      top: 0,
      // It fades the last stretch as the pack's own emblem takes over.
      opacity: lit.get() * (t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3),
      transform: [
        { translateX: cx + (to.x - cx) * t - SIZE / 2 },
        { translateY: cy + (to.y - cy) * t - SIZE / 2 },
        { scale: (0.94 + lit.get() * 0.06) * (1 + (scaleTo - 1) * t) },
      ],
    };
  });
  const glowStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    width: SIZE * 4,
    height: SIZE * 4,
    opacity: lit.get() * (1 - travel.get()),
    transform: [{ translateX: cx - SIZE * 2 }, { translateY: cy - SIZE * 2 }, { scale: 0.9 + lit.get() * 0.1 }],
  }));

  return (
    <Pressable style={StyleSheet.absoluteFill} onPress={finish} accessibilityRole="button" accessibilityLabel="Skip intro" testID="intro">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }, veilStyle]} />
      <Animated.View style={glowStyle} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="introGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#b69cff" stopOpacity={0.55} />
              <Stop offset="0.35" stopColor="#7954ed" stopOpacity={0.22} />
              <Stop offset="1" stopColor="#7954ed" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx="50" cy="50" r="50" fill="url(#introGlow)" />
        </Svg>
      </Animated.View>
      <Animated.View style={markStyle} pointerEvents="none">
        <Mark size={SIZE} />
      </Animated.View>
    </Pressable>
  );
}
