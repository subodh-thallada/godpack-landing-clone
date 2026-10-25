// The store block shared by Packs and Battles, laid out like the website's:
// a stage with the pack (swipe or use the arrows, tap to open) and the Safe
// switch, then the order panel — quantity, pack tier, value range with odds,
// and the buy button. Battle mode adds seats, opponent and Lowest wins.
import { router, useIsFocused } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { PACKS } from '../data';
import { money, round2 } from '../lib/format';
import { bump } from '../lib/haptics';
import { T_SETTLE, enterBack, enterFwd, fadeIn, project, scaleIn } from '../lib/motion';
import { toast } from '../lib/toast';
import { recordSpend, setPrefs, usePrefs } from '../store/prefs';
import { openPacks, postBattle, useSession } from '../store/session';
import { colors, radius, type } from '../theme';
import { Icon } from './Icon';
import { PackArt } from './Thumb';
import { TourTarget } from './Tour';
import { Avatar, Button, Caps, Chip, IconButton, Press, Toggle } from './ui';

const priceLabel = (v: number) => money(v, { compact: true });
const rangeText = (r: [number, number]) => `${money(r[0])} – ${money(r[1])}`;

export function PackStore({ battle = false }: { battle?: boolean }) {
  const { width: W } = useWindowDimensions();
  const prefs = usePrefs();
  const s = useSession((x) => x.s);
  const balance = s?.balance ?? 0;
  const [index, setIndex] = useState(battle ? prefs.battlePack : prefs.pack);
  const [dir, setDir] = useState<1 | -1>(1);
  const [qty, setQty] = useState(1);
  const [menu, setMenu] = useState(false);
  const [lowest, setLowest] = useState(false);
  const safe = !battle && prefs.safe;
  const pack = PACKS[index] ?? PACKS[0];
  const cost = pack.price * qty;
  const short = round2(cost - balance);

  // The pack floats gently (.pack-float), only while this screen is in view.
  const reduced = useReducedMotion();
  const focused = useIsFocused();
  const float = useSharedValue(0);
  useEffect(() => {
    if (reduced || !focused) {
      cancelAnimation(float);
      return;
    }
    float.set(withRepeat(withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }), -1, true));
    return () => cancelAnimation(float);
  }, [float, reduced, focused]);
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: interpolate(float.get(), [0, 1], [0, -8]) }] }));

  const select = (i: number) => {
    const to = Math.max(0, Math.min(PACKS.length - 1, i));
    setMenu(false);
    if (to === index) return;
    bump('light');
    setDir(to > index ? 1 : -1);
    setIndex(to);
    setPrefs(battle ? { battlePack: to } : { pack: to });
  };
  // Swiping the stage changes pack. Where the swipe was heading counts, not
  // just how far it got, so a quick flick is enough.
  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-18, 18])
        .failOffsetY([-14, 14])
        .onEnd((e) => {
          const heading = e.translationX + project(e.velocityX) * 0.25;
          if (heading < -60) scheduleOnRN(select, index + 1);
          else if (heading > 60) scheduleOnRN(select, index - 1);
        }),
    [index, battle], // select closes over these
  );

  const go = () => {
    if (balance < cost) {
      toast(battle ? `Add ${money(short)} to start this battle` : `Add ${money(short)} to open`, 'warn');
      router.push({ pathname: '/deposit', params: { amount: String(Math.max(10, Math.ceil(short))) } });
      return;
    }
    if (recordSpend(cost)) {
      const limit = usePrefs.getState().limit ?? 0;
      toast(`You've opened ${priceLabel(limit)} today — the reminder you set.`, 'warn');
    }
    bump('medium');
    if (battle) {
      postBattle(pack, qty, lowest);
      toast('Battle posted — waiting for an opponent');
      return;
    }
    const pulls = openPacks(pack, qty);
    router.push({ pathname: '/open', params: { pack: pack.id, uids: pulls.map((p) => p.uid).join(',') } });
  };

  const packW = Math.min(W * 0.48, 220);
  const stageH = packW / 0.714 + 56;
  const range = safe ? pack.safeRange : pack.range;
  const label = balance < cost ? `Add ${money(short)} to ${battle ? 'battle' : 'open'}` : battle ? `Start battle for ${priceLabel(cost)}` : `Open for ${priceLabel(cost)}`;

  return (
    <View style={{ gap: 16 }} testID={battle ? 'battle-store' : 'pack-store'}>
      {/* Stage */}
      <TourTarget id={battle ? 'battle-stage' : 'open'}>
        <GestureDetector gesture={swipe}>
          <View style={[styles.stage, { height: stageH }]}>
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
              <Defs>
                <RadialGradient id={battle ? 'stageGlowB' : 'stageGlow'} cx="50%" cy="46%" rx="60%" ry="70%">
                  <Stop offset="0" stopColor={safe ? '#3dd68c' : '#d8d3e3'} stopOpacity={safe ? 0.22 : 0.26} />
                  <Stop offset="0.7" stopColor={safe ? '#3dd68c' : '#d8d3e3'} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Ellipse cx="50%" cy="46%" rx="60%" ry="70%" fill={`url(#${battle ? 'stageGlowB' : 'stageGlow'})`} />
            </Svg>
            <View style={styles.steps} pointerEvents="box-none">
              <View style={{ opacity: index === 0 ? 0 : 1 }} pointerEvents={index === 0 ? 'none' : 'auto'}>
                <IconButton name="chevronLeft" label="Previous pack" onPress={() => select(index - 1)} testID="pack-prev" />
              </View>
              <View style={{ opacity: index === PACKS.length - 1 ? 0 : 1 }} pointerEvents={index === PACKS.length - 1 ? 'none' : 'auto'}>
                <IconButton name="chevronRight" label="Next pack" onPress={() => select(index + 1)} testID="pack-next" />
              </View>
            </View>
            <Animated.View style={floatStyle}>
              <Animated.View key={pack.id} entering={reduced ? fadeIn : dir > 0 ? enterFwd : enterBack}>
                <Press onPress={go} haptic={false} accessibilityLabel={`${pack.name} pack. ${label}`} testID="pack-art" scaleTo={0.97}>
                  <PackArt art={pack.art} width={packW} large />
                </Press>
              </Animated.View>
            </Animated.View>
            {battle ? (
              <View style={styles.seats} pointerEvents="none">
                <View style={styles.seat}>
                  <Avatar handle={s?.handle ?? '?'} color={s?.color ?? colors.primary} size={28} />
                  <View>
                    <Text style={styles.seatName}>You</Text>
                    <Text style={styles.seatSub}>@{s?.handle}</Text>
                  </View>
                </View>
                <Text style={styles.vs}>VS</Text>
                <View style={[styles.seat, { flexDirection: 'row-reverse', paddingRight: 6, paddingLeft: 10 }]}>
                  <View style={styles.openSeat}>
                    <Icon name="plus" size={16} color={colors.muted} />
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.seatName}>Anyone</Text>
                    <Text style={styles.seatSub}>Open seat</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.safe}>
                <Press
                  onPress={() => setPrefs({ safe: !safe })}
                  accessibilityRole="switch"
                  accessibilityLabel="Safe mode"
                  accessibilityState={{ checked: safe }}
                  testID="safe-toggle"
                  style={[styles.safeSwitch, safe && { borderColor: 'rgba(61,214,140,0.45)' }]}
                >
                  <Text style={[styles.safeLabel, safe && { color: '#b9f2d4' }]}>Safe</Text>
                  <View style={[styles.miniSwitch, safe && { backgroundColor: colors.switchOn }]}>
                    <View style={[styles.miniKnob, safe && { transform: [{ translateX: 14 }], backgroundColor: '#fff' }]} />
                  </View>
                </Press>
                <Press onPress={() => toast('Safe mode raises the floor. Same top prizes, still 100% expected value.')} accessibilityLabel="What is Safe?" style={styles.safeMark} hitSlop={10}>
                  <Text style={{ color: colors.label2, fontSize: 12, fontWeight: '700' }}>?</Text>
                </Press>
              </View>
            )}
          </View>
        </GestureDetector>
      </TourTarget>

      {/* Order panel */}
      <View style={styles.order}>
        <Text style={type.h2}>{battle ? 'Start a battle' : 'Open packs'}</Text>
        <View style={styles.qty}>
          <Press onPress={() => setQty((q) => Math.max(1, q - 1))} disabled={qty === 1} accessibilityLabel="Remove one pack" testID="qty-minus" style={[styles.qtyBtn, qty === 1 && { opacity: 0.4 }]}>
            <Icon name="minus" size={20} color={colors.label} />
          </Press>
          <Text style={styles.qtyVal} testID="qty-label">
            <Text testID="qty">{qty}</Text> {qty === 1 ? 'pack' : 'packs'}
            {battle ? ' each' : ''}
          </Text>
          <Press onPress={() => setQty((q) => Math.min(10, q + 1))} disabled={qty === 10} accessibilityLabel="Add one pack" testID="qty-plus" style={[styles.qtyBtn, qty === 10 && { opacity: 0.4 }]}>
            <Icon name="plus" size={20} color={colors.label} />
          </Press>
        </View>

        <View style={{ gap: 8, marginTop: 10 }}>
          <Caps>Pack tier</Caps>
          <Press onPress={() => setMenu((m) => !m)} accessibilityLabel={`Pack tier: ${pack.name}`} accessibilityState={{ expanded: menu }} testID="tier-trigger" style={[styles.trigger, menu && styles.triggerOpen]}>
            <Text style={styles.tierName} testID="pack-name">
              {pack.name}
            </Text>
            <View style={{ alignItems: 'flex-end', gap: 3 }}>
              <Text style={styles.tierPrice}>{priceLabel(pack.price)}</Text>
              <Text style={styles.mult}>up to {pack.mult}×</Text>
            </View>
            <Animated.View style={[T_SETTLE, { transform: [{ rotate: menu ? '180deg' : '0deg' }] }]}>
              <Icon name="chevronDown" size={16} color={colors.muted} />
            </Animated.View>
          </Press>
          {menu ? (
            // Grows out of the tier button above it.
            <Animated.View entering={scaleIn} style={[styles.menu, { transformOrigin: 'top' }]} accessibilityRole="menu">
              {PACKS.map((t, i) => (
                <Press key={t.id} onPress={() => select(i)} accessibilityRole="menuitem" accessibilityState={{ selected: i === index }} testID={`tier-${t.id}`} style={[styles.menuRow, i === index && { backgroundColor: colors.control }]}>
                  <View style={styles.menuLine}>
                    <Text style={styles.menuName}>{t.name}</Text>
                    <Text style={styles.menuName}>{priceLabel(t.price)}</Text>
                  </View>
                  <View style={styles.menuLine}>
                    <Text style={styles.menuSub}>{rangeText(safe ? t.safeRange : t.range)}</Text>
                    <Text style={[styles.menuSub, { color: colors.accentSoft }]}>up to {t.mult}×</Text>
                  </View>
                </Press>
              ))}
            </Animated.View>
          ) : null}
        </View>

        {battle ? (
          <>
            <View style={{ gap: 8, marginTop: 10 }}>
              <Caps>Opponent</Caps>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Chip label="Anyone" on testID="opp-anyone" />
                <Chip label="Search" icon="chevronDown" onPress={() => toast('Challenging a specific collector is not part of this demo')} testID="opp-search" />
              </View>
            </View>
            <View style={styles.rule}>
              <Text style={{ color: colors.label, fontSize: 15, fontWeight: '600', flex: 1 }}>Lowest wins</Text>
              <Toggle value={lowest} onChange={setLowest} label="Lowest wins" testID="lowest-toggle" />
            </View>
          </>
        ) : null}

        <View style={{ gap: 14, marginTop: 14 }}>
          <View style={styles.range}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rangeLabel}>Value range per pack</Text>
              <Text style={styles.rangeValue} testID="pack-range">
                {rangeText(range)}
              </Text>
            </View>
            <Button label="Odds" icon="info" variant="secondary" size="sm" onPress={() => router.push({ pathname: '/odds', params: { pack: pack.id, safe: safe ? '1' : '0' } })} testID="odds" style={styles.oddsBtn} />
          </View>
          <Button label={label} variant={balance < cost ? 'gold' : 'buy'} onPress={go} testID={battle ? 'start-battle' : 'open-pack'} style={balance < cost ? { minHeight: 52, borderRadius: 12 } : null} />
          {battle ? <Text style={styles.note}>Your entry is held until someone joins and refunded if you cancel. The winner takes all {qty * 2} cards. No fee.</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  steps: { position: 'absolute', left: 8, right: 8, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  safe: { position: 'absolute', top: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  safeSwitch: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 36, paddingLeft: 12, paddingRight: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.action },
  safeLabel: { color: colors.label2, fontSize: 14, fontWeight: '600' },
  miniSwitch: { width: 34, height: 20, borderRadius: 10, backgroundColor: colors.switchOff, padding: 2 },
  miniKnob: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.label2 },
  safeMark: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.action, alignItems: 'center', justifyContent: 'center' },
  seats: { position: 'absolute', left: 12, right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  seat: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6, paddingRight: 10, borderRadius: radius.pill, backgroundColor: 'rgba(16,16,20,0.75)', borderWidth: 1, borderColor: colors.line },
  seatName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  seatSub: { color: colors.muted, fontSize: 11, fontWeight: '500' },
  vs: { color: colors.muted, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  openSeat: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.controlLine, alignItems: 'center', justifyContent: 'center' },
  order: { padding: 20, gap: 12, borderRadius: radius.lg, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.panelLine },
  qty: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', height: 46, borderRadius: radius.field, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface2 },
  qtyBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  qtyVal: { minWidth: 76, textAlign: 'center', color: colors.label, fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 69, paddingLeft: 14, paddingRight: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface2 },
  triggerOpen: { borderColor: '#4b4860', backgroundColor: '#201e2b' },
  tierName: { flex: 1, color: colors.label, fontSize: 16, fontWeight: '600' },
  tierPrice: { color: colors.text, fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  mult: { color: colors.accentSoft, fontSize: 13, fontWeight: '500' },
  menu: { padding: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.dialogLine, backgroundColor: colors.dialog, boxShadow: '0 18px 50px rgba(0,0,0,0.5)' },
  menuRow: { gap: 2, padding: 10, borderRadius: radius.sm },
  menuLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  menuName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  menuSub: { color: colors.muted, fontSize: 12, fontWeight: '500', fontVariant: ['tabular-nums'] },
  rule: { flexDirection: 'row', alignItems: 'center', minHeight: 48, marginTop: 6, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface2 },
  range: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, padding: 12, borderRadius: 12, backgroundColor: colors.surface2 },
  rangeLabel: { color: colors.muted, fontSize: 13, fontWeight: '500' },
  rangeValue: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 2, fontVariant: ['tabular-nums'] },
  oddsBtn: { backgroundColor: 'transparent', borderColor: colors.line, minWidth: 84 },
  note: { color: colors.muted, fontSize: 13, lineHeight: 19 },
});
