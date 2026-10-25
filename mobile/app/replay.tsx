// A battle replay (.rp): both sides' cards flip one by one, the totals count
// up and the winner is shown. It only plays a result back — your battles
// were already settled when the opponent joined, so closing early loses
// nothing.
import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInUp, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mark } from '../src/components/Icon';
import { Thumb } from '../src/components/Thumb';
import { Avatar, Button, Press } from '../src/components/ui';
import { packById, user } from '../src/data';
import { type Drawn, drawBattle } from '../src/data/battle';
import { money } from '../src/lib/format';
import { bump, success, warn } from '../src/lib/haptics';
import { go } from '../src/lib/nav';
import { useSession } from '../src/store/session';
import { colors, radius } from '../src/theme';

const STEP = 420;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function Replay() {
  const raw = useLocalSearchParams<Record<string, string | string[]>>();
  const p = (k: string) => first(raw[k]);
  const me = useSession((x) => x.s);
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();
  const reduced = useReducedMotion();

  // Your own battle comes from your history; a past battle from the feed
  // brings its own seed and players.
  const mineBattle = p('id') ? me?.battles.find((b) => b.id === p('id') && b.status === 'done' && b.seed != null) : undefined;
  const pack = packById(mineBattle?.pack ?? p('pack') ?? 'starter');
  const each = Math.max(1, Math.min(10, mineBattle?.each ?? (parseInt(p('each') ?? '1', 10) || 1)));
  const lowest = mineBattle ? !!mineBattle.lowest : p('lowest') === '1';
  const seed = mineBattle?.seed ?? (parseInt(p('seed') ?? '1', 10) || 1);
  const a = mineBattle ? { handle: me?.handle ?? 'you', color: me?.color ?? colors.primary } : user(p('a') ?? 'nightglass');
  const b = user(mineBattle?.opponent ?? p('b') ?? 'tidewalker');
  const mine = !!mineBattle;

  const { A, B, totalA, totalB, aWins } = useMemo(() => drawBattle(seed, pack, each, lowest), [seed, pack, each, lowest]);
  const doneAt = reduced ? 0 : 500 + each * 2 * STEP + 300;
  const [done, setDone] = useState(reduced);

  useEffect(() => {
    const t = setTimeout(() => {
      setDone(true);
      if (mine && aWins) success();
      else if (mine) warn();
      else bump('medium');
    }, doneAt + 200);
    return () => clearTimeout(t);
  }, [doneAt, mine, aWins]);

  const close = () => (router.canGoBack() ? router.back() : go('/battles'));
  const cardW = Math.min((Math.min(W, 520) - 64) / 2 / Math.min(each, 2) - 6, 110);
  const winner = aWins ? a : b;

  if (p('id') && !mineBattle) {
    return (
      <View style={[styles.full, { justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 }]}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Battle not found</Text>
        <Button label="Back to battles" onPress={() => go('/battles')} />
      </View>
    );
  }

  return (
    <View style={styles.full} testID="replay">
      <View style={[styles.head, { paddingTop: insets.top + 10 }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 20 }}>
            {pack.name} battle{lowest ? ' · Lowest wins' : ''}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            {each} pack{each > 1 ? 's' : ''} each · winner takes {each * 2} cards
          </Text>
        </View>
        <Press onPress={close} hitSlop={10} accessibilityLabel="Close" testID="replay-close">
          <Text style={{ color: colors.accentSoft, fontWeight: '600', fontSize: 15 }}>Close</Text>
        </Press>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[
            { side: a, cards: A, total: totalA, win: aWins, offset: 0 },
            { side: b, cards: B, total: totalB, win: !aWins, offset: 1 },
          ].map(({ side, cards, total, win, offset }) => (
            <View key={offset} style={[styles.side, done && (win ? styles.win : styles.lose)]} testID={offset === 0 ? 'side-a' : 'side-b'}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Avatar handle={side.handle} color={side.color} size={28} />
                <Text style={{ color: colors.text, fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>
                  {offset === 0 && mine ? 'You' : `@${side.handle}`}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {cards.map((c, i) => (
                  <FlipCard key={i} card={c} width={cardW} delay={reduced ? 0 : 500 + (i * 2 + offset) * STEP} />
                ))}
              </View>
              <View style={styles.total}>
                <Text style={styles.caps}>Total</Text>
                <CountUp value={total} start={reduced ? 0 : doneAt - 700} testID={offset === 0 ? 'total-a' : 'total-b'} />
              </View>
            </View>
          ))}
        </View>
        {done ? (
          <Animated.View entering={FadeInUp.duration(280)} style={{ gap: 14, alignItems: 'center' }}>
            <Text style={styles.result} testID="replay-result">
              {mine ? (aWins ? `You won all ${each * 2} cards` : `@${b.handle} takes all ${each * 2} cards`) : `@${winner.handle} takes all ${each * 2} cards`}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
              {mine && aWins ? (
                <Button
                  label="View in Vault"
                  variant="secondary"
                  onPress={() => {
                    if (router.canGoBack()) router.back();
                    go('/vault');
                  }}
                  style={{ flex: 1 }}
                  testID="replay-vault"
                />
              ) : null}
              <Button label="Done" onPress={close} style={{ flex: 1 }} testID="replay-done" />
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function FlipCard({ card, width, delay }: { card: Drawn; width: number; delay: number }) {
  const f = useSharedValue(delay <= 0 ? 1 : 0);
  useEffect(() => {
    if (delay > 0) f.value = withDelay(delay, withTiming(1, { duration: 360 }));
  }, [f, delay]);
  const back = useAnimatedStyle(() => ({ opacity: f.value < 0.5 ? 1 : 0, transform: [{ perspective: 800 }, { rotateY: `${f.value * 180}deg` }] }));
  const front = useAnimatedStyle(() => ({ opacity: f.value >= 0.5 ? 1 : 0, transform: [{ perspective: 800 }, { rotateY: `${(f.value - 1) * 180}deg` }] }));
  const h = width / (480 / 670);
  return (
    <View style={{ width, alignItems: 'center', gap: 4 }}>
      <View style={{ width, height: h }}>
        <Animated.View style={[StyleSheet.absoluteFill, back]}>
          <View style={[StyleSheet.absoluteFill, styles.cardBack]}>
            <Mark size={width * 0.36} />
          </View>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, front]}>
          <Thumb id={card.card.id} width={width} glow={false} />
        </Animated.View>
      </View>
      <ShowAfter delay={delay + 200}>
        <Text style={{ color: colors.money, fontWeight: '700', fontSize: 12, fontVariant: ['tabular-nums'] }}>{money(card.value)}</Text>
      </ShowAfter>
    </View>
  );
}

function ShowAfter({ delay, children }: { delay: number; children: ReactNode }) {
  const [on, setOn] = useState(delay <= 0);
  useEffect(() => {
    if (delay <= 0) return;
    const t = setTimeout(() => setOn(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return on ? <Animated.View entering={FadeIn.duration(160)}>{children}</Animated.View> : <View style={{ height: 16 }} />;
}

function CountUp({ value, start, testID }: { value: number; start: number; testID?: string }) {
  const [v, setV] = useState(start <= 0 ? value : 0);
  useEffect(() => {
    if (start <= 0) return setV(value);
    let raf = 0;
    const t = setTimeout(() => {
      const t0 = Date.now();
      const step = () => {
        const p = Math.min(1, (Date.now() - t0) / 700);
        setV(value * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, start);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [value, start]);
  return (
    <Text style={{ color: colors.text, fontWeight: '800', fontSize: 20, fontVariant: ['tabular-nums'] }} testID={testID}>
      {money(v)}
    </Text>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: colors.dialog },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.dialogLine },
  side: { flex: 1, gap: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  win: { borderColor: 'rgba(61,214,140,0.6)' },
  lose: { opacity: 0.55 },
  cardBack: { borderRadius: 6, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  total: { alignItems: 'center', gap: 2, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  caps: { color: colors.muted, fontSize: 11, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  result: { color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
});
