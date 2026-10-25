// The pack-opening moment: swipe across the top of the pack to tear it (or
// tap the button), the card rises out, flips, and its value counts up with a
// glow in the pull tier's colour.
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  FadeIn,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { packImages, slabBack } from '../data/images';
import { money } from '../lib/format';
import { bump, success } from '../lib/haptics';
import { colors, tierColor, type Tier } from '../theme';
import { Mark } from './Icon';
import { CARD_RATIO, PACK_RATIO, SLAB_RATIO, Thumb } from './Thumb';
import { Button } from './ui';

export type RevealCard = { id: string; name: string; value: number; tier: Tier; graded: boolean };

const TIER_LABEL: Record<Tier, string> = { common: 'Pulled', core: 'Nice pull', hit: 'Hit!', chase: 'Chase pull!', grail: 'GRAIL!' };
const TOP = 0.2; // share of the pack that tears off
const CAPTION = 130;

export function PackReveal({ art, card, onRevealed, hint = 'Swipe across to tear it open', testID }: { art: string; card: RevealCard; onRevealed?: () => void; hint?: string; testID?: string }) {
  const { width: W, height: H } = useWindowDimensions();
  const reduced = useReducedMotion();
  // Size the pack from the space this component actually gets (the caption
  // below needs about 130pt), falling back to a share of the window.
  const [space, setSpace] = useState(0);
  const room = space > 0 ? (space - CAPTION) / 1.06 : H * 0.4;
  const packW = Math.max(120, Math.min(W * 0.62, 270, room * PACK_RATIO));
  const packH = packW / PACK_RATIO;
  const cardW = card.graded ? packW * 0.9 : packW * 0.98;
  const cardH = cardW / (card.graded ? SLAB_RATIO : CARD_RATIO);

  const [phase, setPhase] = useState<'idle' | 'open' | 'shown'>('idle');
  const [shownValue, setShownValue] = useState(0);
  const done = useRef(false);

  const tear = useSharedValue(0); // 0..1 while dragging
  const opened = useSharedValue(0); // 0..1 top flies off, body drops
  const rise = useSharedValue(0); // card rises out
  const flip = useSharedValue(0); // 0 back, 1 front
  const burst = useSharedValue(0);
  const idle = useSharedValue(0);
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    idle.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true);
    sweep.value = withRepeat(withSequence(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.cubic) }), withTiming(0, { duration: 0 }), withTiming(0, { duration: 500 })), -1);
  }, [idle, sweep, reduced]);

  const countUp = () => {
    const t0 = Date.now();
    const dur = reduced ? 0 : 900;
    const step = () => {
      const p = dur ? Math.min(1, (Date.now() - t0) / dur) : 1;
      setShownValue(card.value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
      else {
        setPhase('shown');
        if (card.tier !== 'common') success();
        onRevealed?.();
      }
    };
    requestAnimationFrame(step);
  };

  const open = () => {
    if (done.current) return;
    done.current = true;
    setPhase('open');
    bump('heavy');
    if (reduced) {
      opened.value = 1;
      rise.value = 1;
      flip.value = 1;
      burst.value = 1;
      countUp();
      return;
    }
    tear.value = withTiming(1, { duration: 120 });
    opened.value = withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) });
    rise.value = withDelay(260, withSpring(1, { damping: 13, stiffness: 120 }));
    flip.value = withDelay(820, withTiming(1, { duration: 520, easing: Easing.inOut(Easing.cubic) }, (f) => f && runOnJS(countUp)()));
    burst.value = withDelay(1100, withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }));
    setTimeout(() => bump('medium'), 1100);
  };

  const pan = Gesture.Pan()
    .enabled(phase === 'idle')
    .activeOffsetX([-8, 8])
    .onUpdate((e) => {
      tear.value = Math.max(0, Math.min(1, Math.abs(e.translationX) / (packW * 0.85)));
    })
    .onEnd((e) => {
      if (tear.value > 0.55 || Math.abs(e.velocityX) > 900) runOnJS(open)();
      else tear.value = withSpring(0);
    });
  const tapGesture = Gesture.Tap().enabled(phase === 'idle').onEnd(() => runOnJS(open)());
  const gesture = Gesture.Exclusive(pan, tapGesture);

  const packStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(idle.value, [0, 1], [-6, 6]) }, { rotate: `${interpolate(idle.value, [0, 1], [-1.2, 1.2])}deg` }],
  }));
  const topStyle = useAnimatedStyle(() => ({
    opacity: 1 - opened.value,
    transform: [
      { translateX: opened.value * packW * 0.7 },
      { translateY: -tear.value * 6 - opened.value * packH * 0.7 },
      { rotate: `${-tear.value * 5 - opened.value * 32}deg` },
    ],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.max(0, (opened.value - 0.35) / 0.65),
    transform: [{ translateY: Math.max(0, opened.value - 0.25) * packH * 1.1 }],
  }));
  const tearLine = useAnimatedStyle(() => ({ width: `${tear.value * 100}%` }));
  const hintStyle = useAnimatedStyle(() => ({ opacity: 1 - opened.value * 3 }));
  const finger = useAnimatedStyle(() => ({ opacity: interpolate(sweep.value, [0, 0.15, 0.85, 1], [0, 1, 1, 0]), transform: [{ translateX: interpolate(sweep.value, [0, 1], [-packW * 0.35, packW * 0.35]) }] }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, rise.value * 2),
    transform: [{ translateY: interpolate(rise.value, [0, 1], [packH * 0.25, 0]) }, { scale: interpolate(rise.value, [0, 1], [0.55, 1]) }],
  }));
  const backFace = useAnimatedStyle(() => ({
    opacity: flip.value < 0.5 ? 1 : 0,
    transform: [{ perspective: 900 }, { rotateY: `${flip.value * 180}deg` }],
  }));
  const frontFace = useAnimatedStyle(() => ({
    opacity: flip.value >= 0.5 ? 1 : 0,
    transform: [{ perspective: 900 }, { rotateY: `${(flip.value - 1) * 180}deg` }],
  }));
  const glow = useAnimatedStyle(() => ({ opacity: interpolate(burst.value, [0, 0.2, 1], [0, 1, 0.8]), transform: [{ scale: interpolate(burst.value, [0, 1], [0.4, 1]) }] }));
  const rays = useAnimatedStyle(() => ({ opacity: interpolate(burst.value, [0, 0.3, 1], [0, 0.55, 0.22]), transform: [{ rotate: `${burst.value * 40}deg` }, { scale: interpolate(burst.value, [0, 1], [0.5, 1]) }] }));

  const c = tierColor[card.tier];
  const big = card.tier === 'hit' || card.tier === 'chase' || card.tier === 'grail';
  const particles = useMemo(() => Array.from({ length: big ? 18 : 8 }, (_, i) => ({ a: (i / (big ? 18 : 8)) * Math.PI * 2 + Math.random() * 0.4, d: 0.6 + Math.random() * 0.6, s: 4 + Math.random() * 5 })), [big]);
  const topH = packH * TOP;

  return (
    <View testID={testID} style={styles.wrap} onLayout={(e) => setSpace(e.nativeEvent.layout.height)}>
      <View style={{ width: Math.min(W, Math.max(packW, cardW) * 1.6), height: Math.max(packH, cardH) * 1.05, alignItems: 'center', justifyContent: 'center' }}>
        {/* A soft radial glow and faint rays behind the card */}
        <Animated.View pointerEvents="none" style={[styles.glow, glow]}>
          <Svg width={cardW * 2.6} height={cardW * 2.6}>
            <Defs>
              <RadialGradient id="tierGlow" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={c} stopOpacity={0.75} />
                <Stop offset="0.35" stopColor={c} stopOpacity={0.32} />
                <Stop offset="0.7" stopColor={c} stopOpacity={0.08} />
                <Stop offset="1" stopColor={c} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={cardW * 1.3} cy={cardW * 1.3} r={cardW * 1.3} fill="url(#tierGlow)" />
          </Svg>
        </Animated.View>
        {big ? (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, rays]}>
            {Array.from({ length: 10 }, (_, i) => (
              <LinearGradient
                key={i}
                colors={['transparent', c, 'transparent']}
                style={{ position: 'absolute', width: 2, height: cardH * 1.45, transform: [{ rotate: `${i * 18}deg` }] }}
              />
            ))}
          </Animated.View>
        ) : null}
        {phase !== 'idle' ? particles.map((p, i) => <Particle key={i} {...p} color={i % 3 === 0 ? '#fff' : c} burst={burst} radius={cardW * 1.1} />) : null}

        {/* The card: back first, then the front */}
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: cardW, height: cardH }, cardStyle]}>
          <Animated.View style={[StyleSheet.absoluteFill, backFace]}>
            {card.graded ? (
              <Image source={slabBack} style={{ width: '100%', height: '100%', borderRadius: cardW * 0.05 }} contentFit="cover" />
            ) : (
              <LinearGradient colors={['#2b1f55', '#151027']} style={[StyleSheet.absoluteFill, styles.cardBack, { borderRadius: cardW * 0.055 }]}>
                <Mark size={cardW * 0.42} />
              </LinearGradient>
            )}
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, frontFace]}>
            <Thumb id={card.id} graded={card.graded} tier={card.tier} width={cardW} large />
          </Animated.View>
        </Animated.View>

        {/* The pack, in two pieces so the top can tear away */}
        <GestureDetector gesture={gesture}>
          <Animated.View accessibilityRole="button" accessibilityLabel="Tear the pack open" style={[{ width: packW, height: packH }, packStyle]} testID="pack-to-open">
            <Animated.View style={[{ position: 'absolute', top: topH, left: 0, width: packW, height: packH - topH, overflow: 'hidden' }, bodyStyle]}>
              <Image source={packImages[art]?.lg} style={{ position: 'absolute', top: -topH, width: packW, height: packH }} contentFit="contain" />
            </Animated.View>
            <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width: packW, height: topH, overflow: 'hidden' }, topStyle]}>
              <Image source={packImages[art]?.lg} style={{ position: 'absolute', top: 0, width: packW, height: packH }} contentFit="contain" />
            </Animated.View>
            {phase === 'idle' ? (
              <View pointerEvents="none" style={[styles.tear, { top: topH - 1, left: packW * 0.08, right: packW * 0.08 }]}>
                <View style={styles.tearDash} />
                <Animated.View style={[styles.tearFill, tearLine]} />
                <Animated.View style={[styles.finger, finger]} />
              </View>
            ) : null}
          </Animated.View>
        </GestureDetector>
      </View>

      <View style={styles.caption}>
        {phase === 'idle' ? (
          <Animated.View style={[{ alignItems: 'center', gap: 12 }, hintStyle]}>
            <Text style={styles.hint}>{hint}</Text>
            <Button label="Tap to open" variant="secondary" size="sm" onPress={open} testID="tap-to-open" />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.delay(reduced ? 0 : 1150).duration(260)} style={{ alignItems: 'center', gap: 6 }}>
            <View style={[styles.tierPill, { backgroundColor: `${c}2a`, borderColor: c }]}>
              <Text style={[styles.tierText, { color: card.tier === 'common' ? colors.label2 : c }]}>{TIER_LABEL[card.tier]}</Text>
            </View>
            <Text style={styles.cardName} testID="reveal-name">
              {card.name}
            </Text>
            <Text style={styles.value} testID={phase === 'shown' ? 'reveal-value' : undefined}>
              {money(shownValue)}
            </Text>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

function Particle({ a, d, s, color, burst, radius }: { a: number; d: number; s: number; color: string; burst: { value: number }; radius: number }) {
  const style = useAnimatedStyle(() => {
    const p = burst.value;
    return {
      opacity: p === 0 ? 0 : 1 - p,
      transform: [{ translateX: Math.cos(a) * radius * d * p }, { translateY: Math.sin(a) * radius * d * p }, { scale: 1 - p * 0.5 }],
    };
  });
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: s, height: s, borderRadius: s / 2, backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', gap: 8 },
  glow: { position: 'absolute' },
  cardBack: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(157,133,255,0.45)' },
  tear: { position: 'absolute', height: 2, justifyContent: 'center' },
  tearDash: { position: 'absolute', left: 0, right: 0, height: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.75)' },
  tearFill: { position: 'absolute', left: 0, height: 3, backgroundColor: '#fff', borderRadius: 2, boxShadow: '0 0 10px #fff' },
  finger: { position: 'absolute', alignSelf: 'center', width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.9)', boxShadow: '0 0 14px rgba(255,255,255,0.8)' },
  caption: { minHeight: CAPTION - 10, alignItems: 'center', justifyContent: 'flex-start' },
  hint: { color: colors.label2, fontSize: 15, fontWeight: '600' },
  tierPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  tierText: { fontWeight: '800', fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase' },
  cardName: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  value: { color: colors.money, fontSize: 30, fontWeight: '900', fontVariant: ['tabular-nums'], letterSpacing: -0.6 },
});
