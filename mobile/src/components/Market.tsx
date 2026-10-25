// Pieces the Market screens share: listing tiles, a countdown that ticks on
// its own, the price-history sparkline, seller rows, the two sides of a
// trade, the fairness meter and the selectable card tiles used by the sell
// flow and the trade builder.
import { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { cardById } from '../data';
import { money } from '../lib/format';
import { tap } from '../lib/haptics';
import { DUR, EASE_IN_OUT, T_COLOR } from '../lib/motion';
import { type Item, type Listing, type Verdict, ME } from '../market/engine';
import { left, market } from '../store/market';
import { colors, radius, tierColor } from '../theme';
import { Icon } from './Icon';
import { Thumb } from './Thumb';
import { Avatar, Press } from './ui';

// The current time, refreshed on an interval, for one small component.
export function useNow(every = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(id);
  }, [every]);
  return now;
}

// Re-renders only itself once a second.
export function Countdown({ ends, style, testID }: { ends: number; style?: StyleProp<ViewStyle>; testID?: string }) {
  const now = useNow(1000);
  const ms = ends - now;
  const urgent = ms > 0 && ms < 60000;
  return (
    <View style={[styles.pill, urgent && styles.pillUrgent, style]} testID={testID}>
      <Icon name="clock" size={12} color={urgent ? colors.danger : colors.label2} />
      <Text style={[styles.pillText, urgent && { color: colors.danger }]}>{left(ms)}</Text>
    </View>
  );
}

type Tone = 'money' | 'gold' | 'danger' | 'accent' | 'muted';
const TONE: Record<Tone, string> = { money: colors.money, gold: colors.gold, danger: colors.danger, accent: colors.accentSoft, muted: colors.muted };

export function Badge({ label, tone = 'accent', testID }: { label: string; tone?: Tone; testID?: string }) {
  const c = TONE[tone];
  return (
    <View style={[styles.badge, { borderColor: c + '66', backgroundColor: c + '1a' }]} testID={testID}>
      <Text style={[styles.badgeText, { color: c }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// One card, or a small fan for a bundle.
export function ItemsArt({ items, width, large }: { items: Item[]; width: number; large?: boolean }) {
  if (items.length === 1) {
    const it = items[0];
    return <Thumb id={it.id} graded={it.graded} tier={it.tier} width={it.graded ? width * 0.86 : width} large={large} />;
  }
  const w = width * 0.72;
  return (
    <View style={{ width, height: (w / 0.716) * 1.04, alignItems: 'center', justifyContent: 'center' }}>
      {items.slice(0, 3).map((it, i, xs) => (
        <View key={it.uid} style={{ position: 'absolute', transform: [{ translateX: (i - (xs.length - 1) / 2) * width * 0.16 }, { rotate: `${(i - (xs.length - 1) / 2) * 8}deg` }] }}>
          <Thumb id={it.id} graded={it.graded} tier={it.tier} width={it.graded ? w * 0.86 : w} glow={i === xs.length - 1} large={large} />
        </View>
      ))}
    </View>
  );
}

export function SellerRow({ handle, size = 20, testID }: { handle: string; size?: number; testID?: string }) {
  const c = market.collector(handle);
  return (
    <View style={styles.seller} testID={testID}>
      <Avatar handle={handle} color={c.color} size={size} />
      <Text style={styles.sellerName} numberOfLines={1}>
        @{handle}
      </Text>
      <Icon name="star" size={11} color={colors.gold} />
      <Text style={styles.sellerRating}>{c.rating.toFixed(1)}</Text>
    </View>
  );
}

// A listing in the Buy and Auctions grids.
export const ListingTile = memo(function ListingTile({ l, width, watched, onPress, onWatch }: { l: Listing; width: number; watched: boolean; onPress: () => void; onWatch: () => void }) {
  const value = l.items.reduce((a, it) => a + it.value, 0);
  const deal = market.dealOf(l);
  const name = market.titleOf(l.items);
  const auction = l.kind === 'auction';
  const leading = auction && l.top?.by === ME;
  const outbid = auction && !leading && !!l.myMax;
  // The heart sits on top of the tile as a sibling (a button can't hold a
  // button).
  return (
    <View style={{ width }}>
    <Press onPress={onPress} accessibilityLabel={`${name}, ${auction ? 'current bid' : ''} ${money(l.price)}`} style={styles.tile} testID={auction ? 'auction-tile' : 'listing-tile'}>
      <View style={styles.art}>
        <ItemsArt items={l.items} width={width * 0.56} />
        {auction ? <Countdown ends={l.ends!} style={styles.timer} /> : null}
        {l.items.length > 1 ? (
          <View style={styles.bundle}>
            <Text style={styles.bundleText}>Bundle · {l.items.length}</Text>
          </View>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          <Text style={styles.price}>{money(l.price)}</Text>
          {l.dropped && !auction ? <Text style={styles.was}>{money(l.dropped)}</Text> : null}
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {auction ? `${l.bids?.length ? `${l.bids.length} bid${l.bids.length === 1 ? '' : 's'}` : 'No bids'}${l.buyNow ? ` · Buy ${money(l.buyNow, { compact: true })}` : ''}` : `Value ${money(value, { compact: true })}`}
        </Text>
        <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', minHeight: 20 }}>
          {leading ? <Badge label="Winning" tone="money" /> : outbid ? <Badge label="Outbid" tone="danger" /> : null}
          {!auction && deal >= 0.05 ? <Badge label={`${Math.round(deal * 100)}% under`} tone="money" /> : null}
        </View>
        <SellerRow handle={l.seller} size={18} />
      </View>
    </Press>
      <Press
        onPress={() => {
          tap();
          onWatch();
        }}
        haptic={false}
        hitSlop={10}
        scaleTo={0.85}
        accessibilityLabel={watched ? 'Stop watching' : 'Watch'}
        accessibilityState={{ selected: watched }}
        style={styles.heart}
        testID="watch"
      >
        <Icon name={watched ? 'heartOn' : 'heart'} size={17} color={watched ? colors.danger : colors.label2} />
      </Press>
    </View>
  );
});

// Recent sale prices for one card.
export function Sparkline({ series, width, height = 70 }: { series: [number, number][]; width: number; height?: number }) {
  const d = useMemo(() => {
    if (series.length < 2) return null;
    const vals = series.map((p) => p[1]);
    const lo = Math.min(...vals),
      hi = Math.max(...vals);
    const span = hi - lo || 1;
    const t0 = series[0][0],
      t1 = series[series.length - 1][0];
    const xy = series.map(([t, v]) => [((t - t0) / (t1 - t0 || 1)) * width, height - 6 - ((v - lo) / span) * (height - 14)]);
    const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
    return { line, area: `${line}L${width} ${height}L0 ${height}Z`, up: vals[vals.length - 1] >= vals[0] };
  }, [series, width, height]);
  if (!d) return <Text style={styles.sub}>Not enough sales yet for a chart.</Text>;
  const c = d.up ? colors.money : colors.danger;
  return (
    <Svg width={width} height={height} accessibilityLabel="Recent sale prices">
      <Defs>
        <LinearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c} stopOpacity={0.26} />
          <Stop offset="1" stopColor={c} stopOpacity={0.02} />
        </LinearGradient>
      </Defs>
      <Path d={d.area} fill="url(#spark)" />
      <Path d={d.line} stroke={c} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

// One side of a trade: the cards and any cash.
export function TradeSide({ title, items, cash, testID }: { title: string; items: Item[]; cash: number; testID?: string }) {
  const total = items.reduce((a, it) => a + it.value, 0) + cash;
  return (
    <View style={styles.side} testID={testID}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text style={styles.sideTitle}>{title}</Text>
        <Text style={styles.sideTotal}>{money(total)}</Text>
      </View>
      {items.map((it) => (
        <View key={it.uid} style={styles.sideRow}>
          <Thumb id={it.id} graded={it.graded} tier={it.tier} width={28} glow={false} />
          <Text style={styles.sideName} numberOfLines={1}>
            {cardById(it.id).name}
          </Text>
          <Text style={styles.sideValue}>{money(it.value)}</Text>
        </View>
      ))}
      {cash ? (
        <View style={styles.sideRow}>
          <View style={styles.cash}>
            <Icon name="cash" size={16} color={colors.money} />
          </View>
          <Text style={styles.sideName}>Cash</Text>
          <Text style={styles.sideValue}>{money(cash)}</Text>
        </View>
      ) : null}
      {!items.length && !cash ? <Text style={styles.sub}>Nothing yet</Text> : null}
    </View>
  );
}

const VERDICT: Record<Verdict, { label: string; color: string; fill: number }> = {
  empty: { label: 'Add something to both sides', color: colors.muted, fill: 0 },
  unlikely: { label: 'They’ll probably say no', color: colors.danger, fill: 0.22 },
  close: { label: 'Close — they’ll likely ask for a bit more', color: colors.gold, fill: 0.52 },
  fair: { label: 'Fair — likely a yes', color: colors.money, fill: 0.8 },
  great: { label: 'Great for them — a sure yes', color: colors.money, fill: 1 },
};

// How the other collector will likely see the trade. The fill moves on
// screen, so it eases in and out; it's absolute and childless, so its width
// is cheap to animate.
export function FairnessMeter({ verdict, short, testID }: { verdict: Verdict; short: number; testID?: string }) {
  const v = VERDICT[verdict];
  const w = useSharedValue(v.fill);
  useEffect(() => {
    w.set(withTiming(v.fill, { duration: DUR.ui, easing: EASE_IN_OUT }));
  }, [v.fill, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.get() * 100}%` }));
  return (
    <View style={{ gap: 6 }} testID={testID}>
      <View style={styles.meter}>
        <Animated.View style={[styles.meterFill, T_COLOR, { backgroundColor: v.color }, fill]} />
      </View>
      <Text style={[styles.meterText, { color: v.color }]} testID={testID ? `${testID}-verdict` : undefined}>
        {v.label}
        {verdict !== 'empty' && verdict !== 'great' && short ? ` · adding ${money(short)} makes it a sure yes` : ''}
      </Text>
    </View>
  );
}

// A selectable card in the sell flow and the trade builder.
export const PickTile = memo(function PickTile({ it, width, on, onPress, disabled, testID }: { it: Item; width: number; on: boolean; onPress: () => void; disabled?: boolean; testID?: string }) {
  const c = cardById(it.id);
  return (
    <Press
      onPress={onPress}
      disabled={disabled && !on}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on, disabled: disabled && !on }}
      accessibilityLabel={`${c.name}, ${money(it.value)}`}
      haptic
      style={[styles.pick, { width }, on && styles.pickOn, disabled && !on && { opacity: 0.4 }]}
      testID={testID}
    >
      <View style={{ height: width * 0.92, alignItems: 'center', justifyContent: 'center' }}>
        <Thumb id={it.id} graded={it.graded} tier={it.tier} width={it.graded ? width * 0.5 : width * 0.56} glow={false} />
      </View>
      <Text style={styles.pickValue}>{money(it.value)}</Text>
      <Text style={styles.pickName} numberOfLines={1}>
        {c.name}
      </Text>
      {on ? (
        <View style={styles.check}>
          <Icon name="check" size={12} color="#fff" stroke={3} />
        </View>
      ) : null}
      <View style={[styles.tierDot, { backgroundColor: tierColor[it.tier] }]} />
    </Press>
  );
});

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 22, borderRadius: 11, backgroundColor: 'rgba(16,16,20,0.78)', borderWidth: 1, borderColor: colors.line },
  pillUrgent: { borderColor: 'rgba(255,92,122,0.5)' },
  pillText: { color: colors.label2, fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },
  badge: { paddingHorizontal: 7, height: 20, borderRadius: 10, borderWidth: 1, justifyContent: 'center' },
  badgeText: { fontSize: 11, fontWeight: '800' },
  seller: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0 },
  sellerName: { color: colors.label2, fontSize: 12, fontWeight: '600', flexShrink: 1 },
  sellerRating: { color: colors.muted, fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] },
  tile: { borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  art: { height: 150, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  heart: { position: 'absolute', top: 6, right: 6, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16,16,20,0.7)' },
  timer: { position: 'absolute', top: 10, left: 8 },
  bundle: { position: 'absolute', bottom: 8, left: 8, paddingHorizontal: 7, height: 20, borderRadius: 10, justifyContent: 'center', backgroundColor: 'rgba(121,84,237,0.85)' },
  bundleText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  price: { color: colors.text, fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  was: { color: colors.faint, fontSize: 12, fontWeight: '600', textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] },
  name: { color: colors.label, fontSize: 13, fontWeight: '600' },
  sub: { color: colors.muted, fontSize: 12, fontWeight: '500' },
  side: { flex: 1, gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line, minWidth: 0 },
  sideTitle: { color: colors.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  sideTotal: { color: colors.text, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  sideRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sideName: { flex: 1, color: colors.label, fontSize: 13, fontWeight: '600' },
  sideValue: { color: colors.money, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  cash: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(50,213,140,0.12)' },
  meter: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  meterFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4 },
  meterText: { fontSize: 13, fontWeight: '700' },
  pick: { borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface, paddingBottom: 8, overflow: 'hidden' },
  pickOn: { borderColor: colors.primary, backgroundColor: 'rgba(121,84,237,0.12)' },
  pickValue: { color: colors.money, fontSize: 13, fontWeight: '800', paddingHorizontal: 8, fontVariant: ['tabular-nums'] },
  pickName: { color: colors.label2, fontSize: 12, fontWeight: '600', paddingHorizontal: 8 },
  check: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  tierDot: { position: 'absolute', top: 10, left: 8, width: 8, height: 8, borderRadius: 4 },
});
