// Battles: the store in battle mode, then Open battles — other collectors'
// battles you can join and any you've posted (waiting, with Cancel).
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { fadeIn, reflow } from '../../src/lib/motion';
import { Icon } from '../../src/components/Icon';
import { PackStore } from '../../src/components/PackStore';
import { PackArt } from '../../src/components/Thumb';
import { Avatar, Button, Chip, Empty, Press, ViewHead } from '../../src/components/ui';
import { PACKS, packById, user } from '../../src/data';
import { clock, money } from '../../src/lib/format';
import { go } from '../../src/lib/nav';
import { toast } from '../../src/lib/toast';
import { recordSpend } from '../../src/store/prefs';
import { cancelBattle, joinLobby, lobbyBattles, myOpenRows, useSession } from '../../src/store/session';
import { colors, radius, type } from '../../src/theme';

const FILTERS = ['All', ...PACKS.map((p) => p.name)];

export default function Battles() {
  const s = useSession((x) => x.s);
  const [filter, setFilter] = useState('All');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const mine = myOpenRows(s).map((b) => ({ ...b, mine: true as const, host: s?.handle ?? 'you', record: '' }));
  const others = lobbyBattles(s, now).map((b) => ({ ...b, mine: false as const, lowest: false }));
  const all = [...mine, ...others].filter((b) => b.ends > now);
  const shown = all.filter((b) => filter === 'All' || packById(b.pack).name === filter);

  const join = (id: string, packId: string, each: number) => {
    const entry = packById(packId).price * each;
    const balance = s?.balance ?? 0;
    if (balance < entry) {
      toast(`Add ${money(entry - balance)} to join this battle`, 'warn');
      router.push({ pathname: '/deposit', params: { amount: String(Math.ceil(entry - balance)) } });
      return;
    }
    const joined = joinLobby(id);
    if (!joined) return;
    recordSpend(entry);
    router.push({ pathname: '/replay', params: { id: joined.id } });
  };

  return (
    <ScrollView contentContainerStyle={styles.page} testID="screen-battles">
      <ViewHead title="Battles" sub="Two collectors open the same pack. The bigger total takes every card — or the smaller one, in Lowest wins battles." />
      <PackStore battle />
      <View style={{ gap: 12, marginTop: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Icon name="battles" size={20} color={colors.head} />
          <Text style={[type.h2, { color: colors.head, fontSize: 22 }]}>Open battles</Text>
          <Text style={styles.count} testID="open-count">
            {all.length} open
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {FILTERS.map((f) => (
            <Chip key={f} label={f} on={filter === f} onPress={() => setFilter(f)} testID={`battle-filter-${f}`} />
          ))}
        </ScrollView>
        {shown.length ? (
          shown.map((b) => {
            const pack = packById(b.pack);
            const host = b.mine ? { handle: s?.handle ?? 'you', color: s?.color ?? colors.primary } : user(b.host);
            return (
              <Animated.View key={b.id} entering={fadeIn} layout={reflow} style={[styles.ob, b.mine && { borderColor: colors.accentSoft }]} testID={b.mine ? 'my-battle' : 'lobby-battle'}>
                <View style={styles.obTop}>
                  <Press onPress={() => !b.mine && go(`/profile/${b.host}`)} disabled={b.mine} accessibilityLabel={b.mine ? 'You' : `@${b.host}`} style={styles.host}>
                    <Avatar handle={host.handle} color={host.color} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.hostName} numberOfLines={1}>
                        {b.mine ? 'You' : `@${b.host}`}
                      </Text>
                      <Text style={styles.sub}>{b.mine ? 'Waiting for an opponent…' : b.record}</Text>
                    </View>
                  </Press>
                  <View style={styles.clock}>
                    <Text style={styles.clockText}>{clock(b.ends - now)}</Text>
                    <Icon name="clock" size={14} color={colors.muted} />
                  </View>
                </View>
                <View style={styles.obBottom}>
                  <PackArt art={pack.art} width={30} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.packLine} numberOfLines={1}>
                      {pack.name} × {b.each}
                      {b.lowest ? ' · Lowest wins' : ''}
                    </Text>
                    <Text style={styles.sub}>
                      {money(pack.price * b.each, { compact: true })} entry · winner takes {b.each * 2} cards
                    </Text>
                  </View>
                  {b.mine ? (
                    <Button
                      label="Cancel"
                      size="sm"
                      variant="secondary"
                      onPress={() => {
                        cancelBattle(b.id);
                        recordSpend(-pack.price * b.each);
                        toast('Battle cancelled — entry refunded');
                      }}
                      testID="cancel-battle"
                    />
                  ) : (
                    <Button label="Join" size="sm" onPress={() => join(b.id, b.pack, b.each)} testID="join-battle" />
                  )}
                </View>
              </Animated.View>
            );
          })
        ) : (
          <Empty icon="battles" title="No battles open" body={filter === 'All' ? 'Start one above and it stays listed here for 15 minutes.' : `No ${filter} battles are open right now.`} />
        )}
        <Press onPress={() => router.push({ pathname: '/feed', params: { tab: 'Battles' } })} style={styles.link} accessibilityLabel="Watch past battles in the Feed">
          <Text style={{ color: colors.accentSoft, fontWeight: '600', fontSize: 14 }}>Watch past battles</Text>
          <Icon name="chevronRight" size={16} color={colors.accentSoft} />
        </Press>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32, gap: 16 },
  count: { color: colors.muted, fontWeight: '600', fontSize: 13, marginLeft: 'auto', fontVariant: ['tabular-nums'] },
  ob: { gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  obTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  host: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  hostName: { color: colors.text, fontWeight: '700', fontSize: 15 },
  sub: { color: colors.muted, fontSize: 12, fontWeight: '500', fontVariant: ['tabular-nums'] },
  clock: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  clockText: { color: colors.label2, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  obBottom: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  packLine: { color: colors.text, fontWeight: '700', fontSize: 14 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', padding: 10 },
});
