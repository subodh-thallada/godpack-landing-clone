// Feed: All (everyone's pulls, yours included), Following, Battles (finished
// battles with replays) and Leaderboard — the website's feed, with sharing
// to Global Chat.
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { fadeIn, sheetIn, staggered } from '../../src/lib/motion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FollowRow } from '../../src/components/FollowRow';
import { Post } from '../../src/components/Hits';
import { Thumb } from '../../src/components/Thumb';
import { Avatar, Button, Chip, Empty, Press, ViewHead } from '../../src/components/ui';
import { CARDS, type Pull, USERS, pastBattles, pullsOf, seeded, timeline } from '../../src/data';
import { money } from '../../src/lib/format';
import { go } from '../../src/lib/nav';
import { toast } from '../../src/lib/toast';
import { getS, myPulls, postChat, useSession } from '../../src/store/session';
import { colors, radius, type } from '../../src/theme';

const TABS = ['All', 'Following', 'Battles', 'Leaderboard'] as const;
type Tab = (typeof TABS)[number];

function leaders(range: number, mode: 'pulls' | 'volume') {
  const r = seeded(500 + range * 7 + (mode === 'volume' ? 99 : 0));
  return Array.from({ length: 12 }, () => {
    const u = USERS[Math.floor(r() * USERS.length)];
    const card = CARDS[Math.floor(r() * CARDS.length)];
    return { u, card, mult: Math.round(48 - r() * 30), volume: Math.round(20000 * Math.pow(r(), 1.5)) };
  }).sort((a, b) => (mode === 'volume' ? b.volume - a.volume : b.mult - a.mult));
}

export default function Feed() {
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const [tab, setTab] = useState<Tab>('All');
  const [sharing, setSharing] = useState<Pull | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const t = Array.isArray(params.tab) ? params.tab[0] : params.tab;
    if (t && (TABS as readonly string[]).includes(t)) setTab(t as Tab);
  }, [params.tab]);

  return (
    <View style={{ flex: 1 }} testID="screen-feed">
      <ScrollView contentContainerStyle={styles.page}>
        <ViewHead title="Feed" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {TABS.map((t) => (
            <Chip key={t} label={t} on={tab === t} onPress={() => setTab(t)} testID={`feed-tab-${t}`} />
          ))}
        </ScrollView>
        {tab === 'All' ? <AllFeed onShare={setSharing} /> : null}
        {tab === 'Following' ? <FollowingFeed onShare={setSharing} /> : null}
        {tab === 'Battles' ? <BattleList /> : null}
        {tab === 'Leaderboard' ? <Leaderboard /> : null}
      </ScrollView>
      {sharing ? <ShareSheet pull={sharing} onClose={() => setSharing(null)} bottom={insets.bottom} /> : null}
    </View>
  );
}

// .day__label — a small label with a rule running to the edge.
function DayLabel({ children }: { children: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600' }}>{children}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
    </View>
  );
}

function AllFeed({ onShare }: { onShare: (p: Pull) => void }) {
  const s = useSession((x) => x.s);
  const list = useMemo(() => [...myPulls(s), ...timeline()].sort((a, b) => a.minutesAgo - b.minutesAgo).slice(0, 30), [s]);
  return (
    <View style={{ gap: 10 }} testID="feed-all">
      <DayLabel>Today</DayLabel>
      {list.map((h, i) => (
        <Animated.View key={h.uid} entering={staggered(i)}>
          <Post hit={h} latest={i === 0} onShare={onShare} />
        </Animated.View>
      ))}
    </View>
  );
}

function FollowingFeed({ onShare }: { onShare: (p: Pull) => void }) {
  const s = useSession((x) => x.s);
  const following = s?.following ?? [];
  const list = useMemo(
    () =>
      following
        .flatMap((h) => pullsOf(h, 6))
        .sort((a, b) => a.minutesAgo - b.minutesAgo)
        .slice(0, 30),
    [following],
  );
  const suggestions = USERS.filter((u) => !following.includes(u.handle)).slice(0, 5);
  return (
    <View style={{ gap: 10 }} testID="feed-following">
      <DayLabel>{`Following ${following.length} ${following.length === 1 ? 'collector' : 'collectors'}`}</DayLabel>
      {list.length ? list.map((h) => <Post key={h.uid} hit={h} onShare={onShare} />) : <Empty icon="feed" title="No activity from people you follow yet" body="Follow a few collectors and their pulls show up here." />}
      <Text style={[type.h3, { marginTop: 12 }]}>Collectors to follow</Text>
      {suggestions.map((u) => (
        <FollowRow key={u.handle} handle={u.handle} />
      ))}
    </View>
  );
}

function BattleList() {
  const list = useMemo(pastBattles, []);
  return (
    <View style={{ gap: 10 }} testID="feed-battles">
      {list.map((bt, i) => (
        <Animated.View key={bt.seed} entering={staggered(i)} style={styles.bt}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Press onPress={() => go(`/profile/${bt.a.handle}`)} style={styles.side} accessibilityLabel={`@${bt.a.handle}`}>
              <Avatar handle={bt.a.handle} color={bt.a.color} size={28} />
              <Text style={styles.sideText} numberOfLines={1}>
                @{bt.a.handle}
              </Text>
            </Press>
            <Text style={styles.vs}>vs</Text>
            <Press onPress={() => go(`/profile/${bt.b.handle}`)} style={styles.side} accessibilityLabel={`@${bt.b.handle}`}>
              <Avatar handle={bt.b.handle} color={bt.b.color} size={28} />
              <Text style={styles.sideText} numberOfLines={1}>
                @{bt.b.handle}
              </Text>
            </Press>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>
                {bt.pack.name} · {bt.each} pack{bt.each > 1 ? 's' : ''} each{bt.lowest ? ' · Lowest wins' : ''}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>
                {money(bt.pack.price * bt.each, { compact: true })} each · {bt.minutes}m ago
              </Text>
            </View>
            <Button
              label="Replay"
              size="sm"
              onPress={() => router.push({ pathname: '/replay', params: { pack: bt.pack.id, each: String(bt.each), lowest: bt.lowest ? '1' : '0', a: bt.a.handle, b: bt.b.handle, seed: String(bt.seed) } })}
              testID="replay"
            />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

// .medal — gold, silver and bronze for the top three.
const MEDALS: [string, string, string][] = [
  ['#fff0af', '#a16a1d', '#513009'],
  ['#f4f7ff', '#79859a', '#303c50'],
  ['#ffd5ad', '#874d2f', '#49250f'],
];

function Leaderboard() {
  const [range, setRange] = useState(3);
  const [mode, setMode] = useState<'pulls' | 'volume'>('pulls');
  const list = useMemo(() => leaders(range, mode), [range, mode]);
  const ranges = ['Past day', 'Past week', 'Past month', 'All time'];
  return (
    <View style={{ gap: 10 }} testID="feed-leaderboard">
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Chip label="Best pulls" on={mode === 'pulls'} onPress={() => setMode('pulls')} />
        <Chip label="Packs opened" on={mode === 'volume'} onPress={() => setMode('volume')} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {ranges.map((r, i) => (
          <Chip key={r} label={r} on={range === i} onPress={() => setRange(i)} />
        ))}
      </ScrollView>
      {list.map((l, i) => (
        <View key={`${range}-${mode}-${i}`} style={styles.lb}>
          {i < 3 ? (
            <LinearGradient colors={[MEDALS[i][0], MEDALS[i][1]]} start={{ x: 0.3, y: 0.2 }} end={{ x: 0.8, y: 1 }} style={styles.medal}>
              <Text style={{ color: MEDALS[i][2], fontWeight: '800', fontSize: 13 }}>{i + 1}</Text>
            </LinearGradient>
          ) : (
            <Text style={styles.rank}>{i + 1}</Text>
          )}
          <Press onPress={() => go(`/profile/${l.u.handle}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }} accessibilityLabel={`@${l.u.handle}`}>
            <Avatar handle={l.u.handle} color={l.u.color} size={34} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }} numberOfLines={1}>
                @{l.u.handle}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
                {mode === 'volume' ? 'Packs opened' : l.card.name}
              </Text>
            </View>
          </Press>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text style={{ color: colors.money, fontWeight: '800', fontSize: 18, fontVariant: ['tabular-nums'] }}>{mode === 'volume' ? `$${l.volume.toLocaleString('en-US')}` : `${l.mult}×`}</Text>
            <Text style={type.caps}>{mode === 'volume' ? 'Opened' : 'Card / pack'}</Text>
          </View>
          {mode === 'pulls' ? <Thumb id={l.card.id} width={34} glow={false} /> : null}
        </View>
      ))}
    </View>
  );
}

function ShareSheet({ pull, onClose, bottom }: { pull: Pull; onClose: () => void; bottom: number }) {
  const text = `${pull.user.self ? 'I' : `@${pull.user.handle}`} pulled ${pull.card.name} (${money(pull.value)}) on the Godpack demo`;
  const toChat = () => {
    const s = getS();
    if (!s) return;
    postChat({ u: s.handle, t: '', share: { card: pull.card.id, value: pull.value, tier: pull.tier, pack: pull.pack }, mine: true });
    toast('Shared to Global Chat');
    onClose();
  };
  const system = async () => {
    onClose();
    try {
      if (Platform.OS === 'web') {
        const nav = globalThis.navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
        if (nav.share) await nav.share({ text });
        else {
          await nav.clipboard?.writeText(text);
          toast('Link copied');
        }
      } else await Share.share({ message: text });
    } catch {
      // Dismissed.
    }
  };
  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View entering={fadeIn} style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}>
        <Press haptic={false} scaleTo={1} accessibilityLabel="Close" onPress={onClose} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View entering={sheetIn} style={[styles.share, { paddingBottom: bottom + 16 }]} testID="share-sheet">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <Thumb id={pull.card.id} tier={pull.tier} width={40} glow={false} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{pull.card.name}</Text>
            <Text style={{ color: colors.money, fontWeight: '700' }}>{money(pull.value)}</Text>
          </View>
        </View>
        <Button label="Share to Global Chat" icon="chat" onPress={toChat} testID="share-chat" />
        <Button label={Platform.OS === 'web' ? 'Copy link' : 'Share…'} icon={Platform.OS === 'web' ? 'copy' : 'share'} variant="secondary" onPress={system} testID="share-system" />
        <Button label="Cancel" variant="ghost" onPress={onClose} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32, gap: 14 },
  bt: { gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  side: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  sideText: { color: colors.text, fontWeight: '600', fontSize: 13, flexShrink: 1 },
  vs: { color: colors.muted, fontWeight: '600', fontSize: 12 },
  lb: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 70, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.md, backgroundColor: colors.surface },
  medal: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rank: { width: 32, textAlign: 'center', color: colors.muted, fontWeight: '700', fontSize: 14 },
  share: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 10, padding: 20, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, backgroundColor: colors.dialog, borderWidth: 1, borderBottomWidth: 0, borderColor: colors.dialogLine },
});
