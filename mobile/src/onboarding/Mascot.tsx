// Pip, the onboarding guide: the logo's hexagon given a face, with the
// logo's sparkle bobbing above. Blinks, glances toward what you pick and
// reacts with a hop and an expression.
import { memo, useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';
import { EASE_OUT, SNAP } from '../lib/motion';

export type Mood = 'idle' | 'happy' | 'wow' | 'think';

// A pointy-top hexagon with rounded corners, in a 100×100 box.
const HEX = 'M50 4 Q54 4 58 6.4 L86 22.6 Q92 26 92 33 L92 67 Q92 74 86 77.4 L58 93.6 Q54 96 50 96 Q46 96 42 93.6 L14 77.4 Q8 74 8 67 L8 33 Q8 26 14 22.6 L42 6.4 Q46 4 50 4 Z';
const SPARK = 'M12 0 C12.8 7.4 16.6 11.2 24 12 C16.6 12.8 12.8 16.6 12 24 C11.2 16.6 7.4 12.8 0 12 C7.4 11.2 11.2 7.4 12 0 Z';

const MOUTH: Record<Mood, string> = {
  idle: 'M41 64 Q50 71 59 64',
  happy: 'M38 61 Q50 76 62 61 Q50 68 38 61 Z',
  wow: 'M46 63 Q50 58 54 63 Q54 70 50 70 Q46 70 46 63 Z',
  think: 'M43 66 L57 64',
};

export const Mascot = memo(function Mascot({ size = 72, mood = 'idle', look = 0, hop = 0 }: { size?: number; mood?: Mood; look?: number; hop?: number }) {
  const reduced = useReducedMotion();
  const float = useSharedValue(0);
  const blink = useSharedValue(1);
  const glance = useSharedValue(0);
  const bounce = useSharedValue(1);

  useEffect(() => {
    if (reduced) return;
    float.set(withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true));
    blink.set(withRepeat(withSequence(withDelay(2600, withTiming(0.1, { duration: 70 })), withTiming(1, { duration: 110 })), -1));
    return () => {
      cancelAnimation(float);
      cancelAnimation(blink);
    };
  }, [float, blink, reduced]);

  useEffect(() => {
    glance.set(withSpring(look, SNAP));
  }, [look, glance]);

  // A little hop each time something is picked: quick up, then a springy
  // settle (he's the one playful thing on screen, so he gets the bounce).
  useEffect(() => {
    if (!hop || reduced) return;
    bounce.set(withSequence(withTiming(1.12, { duration: 110, easing: EASE_OUT }), withSpring(1, { duration: 450, dampingRatio: 0.45 })));
  }, [hop, bounce, reduced]);

  const body = useAnimatedStyle(() => ({ transform: [{ translateY: -float.get() * 5 }, { scale: bounce.get() }] }));
  const spark = useAnimatedStyle(() => ({ transform: [{ translateY: -float.get() * 3 }, { rotate: `${float.get() * 18}deg` }] }));
  const eyes = useAnimatedStyle(() => ({ transform: [{ translateX: glance.get() * size * 0.05 }, { scaleY: mood === 'happy' ? 1 : blink.get() }] }));

  const eyeW = size * 0.11;
  const eyeH = size * (mood === 'wow' ? 0.17 : 0.15);
  const happy = mood === 'happy';

  return (
    <Animated.View style={[{ width: size, height: size * 1.18 }, body]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[{ position: 'absolute', top: 0, left: size * 0.5 - size * 0.12, width: size * 0.24, height: size * 0.24 }, spark]}>
        <Svg width="100%" height="100%" viewBox="0 0 24 24">
          <Path d={SPARK} fill="#ffe08a" />
        </Svg>
      </Animated.View>
      <View style={{ position: 'absolute', top: size * 0.18, width: size, height: size }}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="pipBody" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#ffe6f7" />
              <Stop offset="0.35" stopColor="#c7a5ff" />
              <Stop offset="0.75" stopColor="#8f78ff" />
              <Stop offset="1" stopColor="#bfe8ff" />
            </LinearGradient>
          </Defs>
          <Path d={HEX} fill="url(#pipBody)" />
          <Path d="M24 26 Q34 16 48 14" stroke="#ffffff" strokeOpacity={0.55} strokeWidth={4} strokeLinecap="round" fill="none" />
          <Ellipse cx={30} cy={60} rx={6} ry={3.6} fill="#ff8ccf" opacity={0.55} />
          <Ellipse cx={70} cy={60} rx={6} ry={3.6} fill="#ff8ccf" opacity={0.55} />
          <Path d={MOUTH[mood]} stroke="#1b1430" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" fill={mood === 'happy' || mood === 'wow' ? '#1b1430' : 'none'} />
        </Svg>
        {/* Eyes: drawn as views so they can blink and glance. */}
        <Animated.View style={[{ position: 'absolute', top: size * 0.33, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: size * 0.17 }, eyes]}>
          {[0, 1].map((i) =>
            happy ? (
              <View key={i} style={{ width: eyeW * 1.3, height: eyeH * 0.7, alignItems: 'center', justifyContent: 'flex-end' }}>
                <Svg width="100%" height="100%" viewBox="0 0 20 12">
                  <Path d="M2 10 Q10 0 18 10" stroke="#1b1430" strokeWidth={3.2} strokeLinecap="round" fill="none" />
                </Svg>
              </View>
            ) : (
              <View key={i} style={{ width: eyeW, height: eyeH, borderRadius: eyeW, backgroundColor: '#1b1430' }}>
                <View style={{ position: 'absolute', top: eyeH * 0.16, left: eyeW * 0.22, width: eyeW * 0.38, height: eyeW * 0.38, borderRadius: eyeW, backgroundColor: '#fff' }} />
              </View>
            ),
          )}
        </Animated.View>
      </View>
    </Animated.View>
  );
});
