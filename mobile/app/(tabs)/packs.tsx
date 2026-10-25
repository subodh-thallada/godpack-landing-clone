// Packs: the store block, then Recent Hits for the selected pack (yours
// first, a new one landing every few seconds) and the all-time Top Hits —
// the same page as the website, plus a short getting-started list.
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInLeft, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { HitCard, TopTile } from '../../src/components/Hits';
import { Icon } from '../../src/components/Icon';
import { PackStore } from '../../src/components/PackStore';
import { Press, SectionHead, ViewHead } from '../../src/components/ui';
import { PACKS, type Pull, TOP_HITS, pullsFor } from '../../src/data';
import { go } from '../../src/lib/nav';
import { setPrefs, usePrefs } from '../../src/store/prefs';
import { type Session, myPulls, useSession } from '../../src/store/session';
import { colors, radius } from '../../src/theme';

export default function Packs() {
  const s = useSession((x) => x.s);
  const index = usePrefs((p) => p.pack);
  const safe = usePrefs((p) => p.safe);
  const pack = PACKS[index] ?? PACKS[0];
  const reduced = useReducedMotion();
  const [live, setLive] = useState<Pull[]>([]);

  const hits = useMemo(() => {
    const mine = myPulls(s).filter((p) => p.pack === pack.id && p.value >= pack.price);
    return [...live, ...mine, ...pullsFor(pack, 12, safe ? 17 : 7)].slice(0, 14);
  }, [s, pack, safe, live]);

  useEffect(() => setLive([]), [pack.id]);
  // A new pull lands at the front every few seconds.
  useEffect(() => {
    if (reduced) return;
    let seed = 100;
    const id = setInterval(() => {
      const fresh = { ...pullsFor(pack, 1, seed++)[0], minutesAgo: 0 };
      fresh.uid = `${fresh.uid}-live-${seed}`;
      setLive((l) => [fresh, ...l].slice(0, 6));
    }, 7000);
    return () => clearInterval(id);
  }, [pack, reduced]);

  return (
    <ScrollView contentContainerStyle={styles.page} testID="screen-packs">
      <ViewHead title="Choose your pack" />
      <Checklist s={s} />
      <PackStore />
      <View style={{ gap: 12, marginTop: 16 }}>
        <SectionHead icon="flame" title="Recent Hits" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }} style={{ marginRight: -16 }} testID="recent-hits">
          {hits.map((h, i) => (
            <Animated.View key={h.uid} entering={i === 0 && live.length ? FadeInLeft.duration(420) : undefined} layout={LinearTransition.duration(380)}>
              <HitCard hit={h} />
            </Animated.View>
          ))}
        </ScrollView>
      </View>
      <View style={{ gap: 12, marginTop: 14 }}>
        <SectionHead icon="trophy" title="Top Hits" gold />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingRight: 16 }} style={{ marginRight: -16 }}>
          {TOP_HITS.map((h) => (
            <TopTile key={h.uid} hit={h} />
          ))}
        </ScrollView>
      </View>
      <Text style={styles.foot}>Unofficial recreation · demo data only · not affiliated with Godpack</Text>
    </ScrollView>
  );
}

// A short list of first things to try; it hides itself once everything's done.
function Checklist({ s }: { s: Session | null }) {
  const hidden = usePrefs((p) => p.checklistHidden);
  if (!s || hidden) return null;
  const items: { done: boolean; label: string; href?: string }[] = [
    { done: s.pulls.some((p) => p.uid !== s.welcomeUid), label: 'Open a pack' },
    { done: s.lastCheckIn > 0, label: 'Check in for your streak', href: '/rewards' },
    { done: s.following.some((h) => h !== 'orbit_ann'), label: 'Follow a collector', href: '/feed' },
    { done: s.battles.length > 0, label: 'Try a battle', href: '/battles' },
  ];
  const count = items.filter((i) => i.done).length;
  return (
    <View style={styles.check} testID="checklist">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, flex: 1 }}>{count === items.length ? "You're all set" : 'Getting started'}</Text>
        <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] }} testID="checklist-count">
          {count} of {items.length}
        </Text>
        <Press onPress={() => setPrefs({ checklistHidden: true })} accessibilityLabel="Hide getting started" hitSlop={10} style={{ padding: 4 }} testID="checklist-hide">
          <Icon name="close" size={16} color={colors.muted} />
        </Press>
      </View>
      {items.map((it) => (
        <Press key={it.label} onPress={() => it.href && go(it.href)} disabled={it.done || !it.href} accessibilityState={{ checked: it.done }} style={styles.item}>
          <View style={[styles.box, it.done && styles.boxOn]}>{it.done ? <Icon name="check" size={12} color="#fff" stroke={3} /> : null}</View>
          <Text style={{ flex: 1, color: it.done ? colors.faint : colors.label, fontSize: 14, fontWeight: '500', textDecorationLine: it.done ? 'line-through' : 'none' }}>{it.label}</Text>
          {!it.done && it.href ? <Icon name="chevronRight" size={16} color={colors.faint} /> : null}
        </Press>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32, gap: 16 },
  foot: { color: colors.faint, fontSize: 12, textAlign: 'center', marginTop: 12 },
  check: { gap: 4, paddingHorizontal: 16, paddingVertical: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 40 },
  box: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: colors.fieldLine, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.switchOn, borderColor: colors.switchOn },
});
