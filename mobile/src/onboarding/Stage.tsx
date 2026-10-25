// The onboarding stage: one persistent scene behind every step, so nothing
// "changes page". The sealed pack moves between poses and reacts to answers:
// cards orbit it on rings on the welcome and get pulled inside when you
// start, goal charms circle it, it flips to the recommended pack, a shield
// wraps it for Safe mode, it shimmers when sealed. After the opening the card
// you pulled takes its place and travels with you through sign-up: it sits in
// a soft halo while you confirm your email, tucks behind your avatar when you
// name yourself, and turns up in the lock-screen preview for notifications.
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { Icon, type IconName } from '../components/Icon';
import { PACK_RATIO, SLAB_RATIO, Thumb } from '../components/Thumb';
import { packImages } from '../data/images';
import { DUR, EASE_IN_OUT, EASE_OUT, SETTLE, T_COLOR, popIn, scaleIn, scaleOut } from '../lib/motion';
import { colors, rgba, tierColor, type Tier } from '../theme';
import { PhoneMock } from './PhoneMock';
import { Sparkles } from './Sparkles';

export type Pose = 'welcome' | 'ask' | 'spend' | 'seal' | 'claim' | 'account' | 'profile' | 'notify';

const HEAD = 52; // the back button and progress bar above every hero

// Where the hero sits in each pose, from the screen size. `w`/`h` are the
// pack's; `card` is where the pulled card goes; `bottom` is where step
// content may start.
export function geometry(pose: Pose, W: number, H: number, top: number) {
  const short = H < 700;
  const packW = {
    welcome: Math.min(W * 0.36, 180),
    ask: Math.min(W * 0.2, 92),
    spend: Math.min(W * 0.3, 140),
    seal: Math.min(W * 0.4, 200),
  };
  const cardW = Math.min(W * 0.27, short ? 96 : 124);
  const cardH = cardW / SLAB_RATIO;
  let cx = W / 2;
  let cy: number;
  let w = packW.ask;
  let bottom: number;
  let card = { cx: W / 2, cy: 0, w: cardW, h: cardH, rot: 0 };
  switch (pose) {
    case 'welcome':
    case 'seal':
      w = packW[pose];
      cy = top + Math.min(H * 0.27, 230);
      bottom = cy + w / PACK_RATIO / 2;
      break;
    case 'ask':
    case 'spend':
      w = packW[pose];
      cy = top + HEAD + 14 + w / PACK_RATIO / 2;
      bottom = cy + w / PACK_RATIO / 2;
      break;
    case 'claim':
      cy = top + HEAD + cardH / 2;
      card = { cx, cy, w: cardW, h: cardH, rot: 0 };
      bottom = cy + cardH / 2 + 4;
      break;
    case 'account': {
      // The card as the step's icon, in a soft halo on the left.
      const halo = 92;
      cx = 20 + halo / 2;
      cy = top + HEAD + halo / 2;
      card = { cx, cy, w: halo * 0.58, h: (halo * 0.58) / SLAB_RATIO, rot: -6 };
      bottom = cy + halo / 2 + 6;
      break;
    }
    case 'profile': {
      const a = short ? 92 : 108;
      cy = top + HEAD + 6 + a / 2;
      card = { cx: cx + a * 0.52, cy: cy - a * 0.06, w: a * 0.62, h: (a * 0.62) / SLAB_RATIO, rot: 14 };
      bottom = cy + a / 2 + 44;
      break;
    }
    case 'notify': {
      cy = top + HEAD + (short ? 96 : 120);
      card = { cx, cy, w: 30, h: 30 / SLAB_RATIO, rot: 0 };
      bottom = top + HEAD + (short ? 196 : 240);
      break;
    }
  }
  const h = w / PACK_RATIO;
  return { cx, cy, w, h, x: cx - w / 2, y: cy - h / 2, bottom, card };
}

// Step content starts below the hero.
export const heroBottom = (pose: Pose, W: number, H: number, top: number) => geometry(pose, W, H, top).bottom + (pose === 'welcome' ? 40 : 18);

const ORBIT = ['gilded-comet', 'aurora-peaks', 'nebula-bloom', 'frost-halo', 'volcanic-heart', 'coral-drift'];
const PACK_POSES: Pose[] = ['welcome', 'ask', 'spend', 'seal'];

type Props = {
  pose: Pose;
  art: string;
  tint: string;
  charms: IconName[];
  shield: boolean;
  card: { id: string; tier: Tier; name?: string } | null;
  owner?: string;
  avatar?: { handle: string; color: string } | null;
  hidePack?: boolean;
  // While the intro plays the scene waits, then the pack and rings arrive.
  dormant?: boolean;
};

export const Stage = memo(function Stage({ pose, art, tint, charms, shield, card, owner, avatar, hidePack, dormant }: Props) {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const g = geometry(pose, W, H, insets.top);
  const packPose = PACK_POSES.includes(pose);
  const packVisible = packPose && !hidePack && !dormant;
  const welcome = geometry('welcome', W, H, insets.top);

  // The pack's position and size follow the pose.
  const cx = useSharedValue(g.cx);
  const cy = useSharedValue(g.cy);
  const pw = useSharedValue(g.w);
  const packOn = useSharedValue(packVisible ? 1 : 0);
  const orbitOn = useSharedValue(pose === 'welcome' && !dormant ? 1 : 0);
  const spin = useSharedValue(0);
  const float = useSharedValue(0);
  const flip = useSharedValue(0);
  const sheen = useSharedValue(-1);
  const [shownArt, setShownArt] = useState(art);

  useEffect(() => {
    if (packPose) {
      cx.set(reduced ? g.cx : withSpring(g.cx, SETTLE));
      cy.set(reduced ? g.cy : withSpring(g.cy, SETTLE));
      pw.set(reduced ? g.w : withSpring(g.w, SETTLE));
    }
    packOn.set(withTiming(packVisible ? 1 : 0, { duration: reduced ? 0 : DUR.ui, easing: EASE_OUT }));
    // Leaving the welcome pulls the orbiting cards into the pack; arriving
    // (after the intro) flings them back out onto their rings.
    orbitOn.set(withTiming(pose === 'welcome' && !dormant ? 1 : 0, { duration: reduced ? 0 : 700, easing: EASE_IN_OUT }));
  }, [pose, packPose, packVisible, dormant, g.cx, g.cy, g.w, reduced, cx, cy, pw, packOn, orbitOn]);

  useEffect(() => {
    if (reduced) return;
    spin.set(withRepeat(withTiming(Math.PI * 2, { duration: 26000, easing: Easing.linear }), -1));
    float.set(withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => {
      cancelAnimation(spin);
      cancelAnimation(float);
    };
  }, [spin, float, reduced]);

  // A new recommendation turns the pack over to its new design: a quarter
  // turn away, swap, a quarter turn back.
  useEffect(() => {
    if (art === shownArt) return;
    if (reduced) {
      setShownArt(art);
      return;
    }
    flip.set(withSequence(withTiming(1, { duration: 140, easing: EASE_IN_OUT }), withTiming(-1, { duration: 0 }), withTiming(0, { duration: 220, easing: EASE_OUT })));
    const t = setTimeout(() => setShownArt(art), 140);
    return () => clearTimeout(t);
  }, [art, shownArt, flip, reduced]);

  // When sealed, a sheen sweeps across the pack.
  useEffect(() => {
    if (pose !== 'seal' || reduced) {
      cancelAnimation(sheen);
      sheen.set(-1);
      return;
    }
    sheen.set(withRepeat(withSequence(withTiming(-1, { duration: 0 }), withTiming(1.2, { duration: 1100, easing: EASE_IN_OUT }), withTiming(1.2, { duration: 900 })), -1));
    return () => cancelAnimation(sheen);
  }, [pose, sheen, reduced]);

  const packStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    width: pw.get(),
    height: pw.get() / PACK_RATIO,
    opacity: packOn.get(),
    transform: [
      { translateX: cx.get() - pw.get() / 2 },
      { translateY: cy.get() - pw.get() / PACK_RATIO / 2 - float.get() * 7 },
      { perspective: 700 },
      { rotateY: `${flip.get() * 90}deg` },
      { scale: 0.95 + packOn.get() * 0.05 },
    ],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    width: pw.get() * 2.6,
    height: pw.get() * 2.6,
    opacity: 0.4 + packOn.get() * 0.6,
    transform: [{ translateX: cx.get() - pw.get() * 1.3 }, { translateY: cy.get() - pw.get() * 1.3 }],
  }));
  const sheenStyle = useAnimatedStyle(() => ({ transform: [{ translateX: sheen.get() * pw.get() * 1.2 }, { rotate: '18deg' }] }));

  const showCard = !!card && !packPose;
  const glowAt = packPose ? null : g.card;

  return (
    // Glows and rings reach past the edges; clip them to the screen.
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      <Aurora tint={tint} />
      {packPose ? (
        <Animated.View style={glowStyle}>
          <Animated.View key={tint} entering={FadeIn.duration(500)} style={StyleSheet.absoluteFill}>
            <Glow id="heroGlow" color={tint} />
          </Animated.View>
        </Animated.View>
      ) : glowAt && pose !== 'notify' ? (
        <View style={{ position: 'absolute', left: glowAt.cx - glowAt.w * 1.6, top: glowAt.cy - glowAt.w * 1.6, width: glowAt.w * 3.2, height: glowAt.w * 3.2 }}>
          <Glow id="cardGlow" color={tint} />
        </View>
      ) : null}

      <Rings cx={welcome.cx} cy={welcome.cy} rx={W * 0.42 + welcome.w * 0.05} ry={welcome.w * 0.42} on={orbitOn} spin={spin} />
      {ORBIT.map((id, i) => (
        <OrbitCard key={id} id={id} index={i} count={ORBIT.length} cx={cx} cy={cy} pw={pw} spin={spin} on={orbitOn} W={W} />
      ))}

      <Animated.View style={packStyle}>
        <Image source={packImages[shownArt]?.lg} style={{ width: '100%', height: '100%' }} contentFit="contain" />
        {pose === 'seal' ? (
          <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: 8 }]}>
            <Animated.View style={[styles.sheen, sheenStyle]}>
              <LinearGradient colors={['transparent', 'rgba(255,255,255,0.45)', 'transparent']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
          </View>
        ) : null}
        {shield && packPose ? <Animated.View entering={scaleIn} exiting={scaleOut} style={styles.shield} /> : null}
      </Animated.View>

      {packPose && pose !== 'welcome' ? charms.map((c, i) => <Charm key={c} icon={c} index={i} count={charms.length} cx={cx} cy={cy} pw={pw} spin={spin} />) : null}

      {pose === 'account' ? (
        <Animated.View entering={scaleIn} style={[styles.halo, { left: g.card.cx - 46, top: g.card.cy - 46, backgroundColor: card ? rgba(card.tier, 0.16) : 'rgba(121,84,237,0.18)' }]}>
          {card ? null : <Icon name="mail" size={34} color={colors.label} />}
        </Animated.View>
      ) : null}
      {pose === 'profile' ? <Sparkles cx={g.cx} cy={g.cy} width={W} height={(g.bottom - g.cy) * 2 + 40} /> : null}
      {showCard ? <PulledCard card={card} to={g.card} pose={pose} /> : null}
      {pose === 'profile' && avatar ? <BigAvatar cx={g.cx} cy={g.cy} size={(g.bottom - 44 - g.cy) * 2} handle={avatar.handle} color={avatar.color} owner={owner} /> : null}
      {pose === 'notify' ? <PhoneMock top={insets.top + HEAD} short={H < 700} card={card} /> : null}
    </View>
  );
});

function Glow({ id, color }: { id: string; color: string }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={0.38} />
          <Stop offset="0.6" stopColor={color} stopOpacity={0.08} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
    </Svg>
  );
}

// The card you pulled. It arrives from where the ceremony left it (big, in
// the middle) and settles into each pose with a spring that never overshoots.
function PulledCard({ card, to, pose }: { card: NonNullable<Props['card']>; to: ReturnType<typeof geometry>['card']; pose: Pose }) {
  const { width: W, height: H } = useWindowDimensions();
  const reduced = useReducedMotion();
  const base = useRef(to.w).current;
  const baseH = base / SLAB_RATIO;
  const fromCeremony = pose === 'claim';
  const kx = useSharedValue(fromCeremony && !reduced ? W / 2 : to.cx);
  const ky = useSharedValue(fromCeremony && !reduced ? H * 0.46 : to.cy);
  const ks = useSharedValue(fromCeremony && !reduced ? (W * 0.62) / base : to.w / base);
  const kr = useSharedValue(to.rot);
  const ko = useSharedValue(pose === 'notify' ? 0 : 1);

  useEffect(() => {
    const go = (v: SharedValue<number>, t: number) => v.set(reduced ? t : withSpring(t, SETTLE));
    go(kx, to.cx);
    go(ky, to.cy);
    go(ks, to.w / base);
    go(kr, to.rot);
    // In the lock-screen preview the card is the notification's thumbnail.
    ko.set(withTiming(pose === 'notify' ? 0 : 1, { duration: DUR.small, easing: EASE_OUT }));
  }, [to.cx, to.cy, to.w, to.rot, pose, base, reduced, kx, ky, ks, kr, ko]);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: ko.get(),
    transform: [{ translateX: kx.get() - base / 2 }, { translateY: ky.get() - baseH / 2 }, { rotate: `${kr.get()}deg` }, { scale: ks.get() }],
  }));
  return (
    <Animated.View style={style} testID="ob-card">
      <Animated.View entering={reduced ? FadeIn : popIn}>
        <Thumb id={card.id} graded tier={card.tier} width={base} large />
      </Animated.View>
    </Animated.View>
  );
}

// Your avatar as everyone will see it, live as you type, over a field of
// sparkles; the colour eases between swatches.
function BigAvatar({ cx, cy, size, handle, color, owner }: { cx: number; cy: number; size: number; handle: string; color: string; owner?: string }) {
  const initial = (handle.replace(/^[^a-z0-9]+/i, '')[0] ?? '').toUpperCase();
  return (
    <View style={{ position: 'absolute', left: cx - size / 2, top: cy - size / 2, width: size, alignItems: 'center' }} testID="ob-avatar">
      <Animated.View entering={scaleIn} style={[styles.avatar, T_COLOR, { width: size, height: size, borderRadius: size / 2, backgroundColor: color, boxShadow: `0 10px 40px ${color}66` }]}>
        {initial ? (
          <Animated.Text key={initial} entering={FadeIn.duration(DUR.press)} style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.44, letterSpacing: -1 }}>
            {initial}
          </Animated.Text>
        ) : (
          <Icon name="user" size={size * 0.44} color="rgba(255,255,255,0.9)" />
        )}
      </Animated.View>
      {owner ? (
        <Text style={styles.owner} numberOfLines={1} testID="ob-owner">
          @{owner}
        </Text>
      ) : null}
    </View>
  );
}

// Faint orbit rings with a few lights travelling on them.
function Rings({ cx, cy, rx, ry, on, spin }: { cx: number; cy: number; rx: number; ry: number; on: SharedValue<number>; spin: SharedValue<number> }) {
  const R = [0.58, 1, 1.42];
  const W2 = rx * 1.42 * 2 + 20;
  const H2 = ry * 1.42 * 2 + 20;
  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    width: W2,
    height: H2,
    opacity: on.get(),
    transform: [{ translateX: cx - W2 / 2 }, { translateY: cy - H2 / 2 }, { scale: 0.7 + on.get() * 0.3 }],
  }));
  return (
    <Animated.View style={style}>
      <Svg width={W2} height={H2}>
        {R.map((k, i) => (
          <Ellipse key={k} cx={W2 / 2} cy={H2 / 2} rx={rx * k} ry={ry * k} stroke="#ffffff" strokeOpacity={i === 1 ? 0.1 : 0.06} strokeWidth={1} fill="none" />
        ))}
      </Svg>
      {LIGHTS.map((l, i) => (
        <Light key={i} {...l} rx={rx} ry={ry} w={W2} h={H2} spin={spin} />
      ))}
    </Animated.View>
  );
}

const LIGHTS: { ring: number; at: number; speed: number; tier: Tier }[] = [
  { ring: 0.58, at: 0.3, speed: -1.6, tier: 'chase' },
  { ring: 0.58, at: 3.6, speed: -1.6, tier: 'hit' },
  { ring: 1.42, at: 1.2, speed: 0.7, tier: 'grail' },
  { ring: 1.42, at: 4.1, speed: 0.7, tier: 'core' },
];

function Light({ ring, at, speed, tier, rx, ry, w, h, spin }: (typeof LIGHTS)[number] & { rx: number; ry: number; w: number; h: number; spin: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const a = at + spin.get() * speed;
    return { transform: [{ translateX: w / 2 + Math.cos(a) * rx * ring - 4 }, { translateY: h / 2 + Math.sin(a) * ry * ring - 4 }] };
  });
  return <Animated.View style={[styles.light, { backgroundColor: tierColor[tier], boxShadow: `0 0 10px ${tierColor[tier]}` }, style]} />;
}

function OrbitCard({ id, index, count, cx, cy, pw, spin, on, W }: { id: string; index: number; count: number; cx: SharedValue<number>; cy: SharedValue<number>; pw: SharedValue<number>; spin: SharedValue<number>; on: SharedValue<number>; W: number }) {
  const cw = Math.min(W * 0.16, 74);
  const style = useAnimatedStyle(() => {
    const a = (index / count) * Math.PI * 2 + spin.get();
    const depth = (Math.sin(a) + 1) / 2;
    const rx = (W * 0.42 + pw.get() * 0.05) * on.get();
    const ry = pw.get() * 0.42 * on.get();
    return {
      position: 'absolute',
      left: 0,
      top: 0,
      opacity: on.get() * (0.3 + depth * 0.7),
      transform: [
        { translateX: cx.get() + Math.cos(a) * rx - cw / 2 },
        { translateY: cy.get() + Math.sin(a) * ry - cw / 0.716 / 2 },
        { scale: (0.55 + depth * 0.45) * (0.4 + on.get() * 0.6) },
        { rotate: `${Math.cos(a) * 10}deg` },
      ],
    };
  });
  return (
    <Animated.View style={style}>
      <Thumb id={id} width={cw} glow={false} />
    </Animated.View>
  );
}

function Charm({ icon, index, count, cx, cy, pw, spin }: { icon: IconName; index: number; count: number; cx: SharedValue<number>; cy: SharedValue<number>; pw: SharedValue<number>; spin: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const a = (index / Math.max(count, 1)) * Math.PI * 2 - Math.PI / 2 + spin.get() * 0.6;
    return { position: 'absolute', left: 0, top: 0, transform: [{ translateX: cx.get() + Math.cos(a) * pw.get() * 1.05 - 18 }, { translateY: cy.get() + Math.sin(a) * pw.get() * 0.62 - 18 }] };
  });
  return (
    <Animated.View style={style}>
      <Animated.View entering={popIn} exiting={scaleOut} style={styles.charm}>
        <Icon name={icon} size={17} color={colors.text} />
      </Animated.View>
    </Animated.View>
  );
}

// Two slow pools of light in the scene's colour.
function Aurora({ tint }: { tint: string }) {
  const { width: W, height: H } = useWindowDimensions();
  const reduced = useReducedMotion();
  const d = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    d.set(withRepeat(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(d);
  }, [d, reduced]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: -W * 0.25 + d.get() * W * 0.15 }, { translateY: -H * 0.08 + d.get() * 30 }] }));
  const b = useAnimatedStyle(() => ({ transform: [{ translateX: W * 0.35 - d.get() * W * 0.2 }, { translateY: H * 0.45 - d.get() * 40 }] }));
  const blob = (id: string, color: string, opacity: number) => (
    <Animated.View key={`${id}-${color}`} entering={FadeIn.duration(700)} style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={opacity} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
  return (
    <>
      <Animated.View style={[{ position: 'absolute', width: W * 1.1, height: W * 1.1 }, a]}>{blob('auroraA', tint, 0.2)}</Animated.View>
      <Animated.View style={[{ position: 'absolute', width: W * 0.9, height: W * 0.9 }, b]}>{blob('auroraB', colors.primary, 0.14)}</Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  sheen: { position: 'absolute', top: -40, bottom: -40, left: '-30%', width: '45%' },
  shield: { position: 'absolute', top: -10, bottom: -10, left: -12, right: -12, borderRadius: 18, borderWidth: 2, borderColor: 'rgba(61,214,140,0.75)', boxShadow: '0 0 22px rgba(61,214,140,0.35)' },
  owner: { marginTop: 10, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, overflow: 'hidden', backgroundColor: colors.control, color: colors.label, fontSize: 13, fontWeight: '700', maxWidth: 200 },
  charm: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.control, borderWidth: 1, borderColor: colors.controlLine },
  halo: { position: 'absolute', width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center' },
  light: { position: 'absolute', left: 0, top: 0, width: 8, height: 8, borderRadius: 4 },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.bg,
  },
});
