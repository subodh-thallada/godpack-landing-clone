// Another collector's profile: bio, stats, Follow / Following, and the
// cards they've pulled.
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { go } from '../../src/lib/nav';
import { StyleSheet, Text, View } from 'react-native';
import { inspect } from '../../src/components/Hits';
import { Thumb } from '../../src/components/Thumb';
import { Avatar, Button, Empty, Panel, Press, Screen, Stat } from '../../src/components/ui';
import { packById, profileOf, pullsOf } from '../../src/data';
import { ago, money } from '../../src/lib/format';
import { bump } from '../../src/lib/haptics';
import { toast } from '../../src/lib/toast';
import { market, useMarket } from '../../src/store/market';
import { isFollowing, toggleFollow, useSession } from '../../src/store/session';
import { colors, radius, type } from '../../src/theme';

export default function CollectorProfile() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const s = useSession((x) => x.s);
  if (s && handle === s.handle) return <Redirect href="/profile" />;
  const p = profileOf(handle);
  if (!p) {
    return (
      <Screen title="Profile">
        <Empty icon="user" title="Collector not found" body={`There's no collector called @${handle} in this demo.`} action={<Button label="Back to Feed" size="sm" onPress={() => go('/feed')} />} />
      </Screen>
    );
  }
  const following = isFollowing(s, handle);
  const pulls = pullsOf(handle, 10);
  return (
    <Screen title={`@${handle}`} testID="screen-collector">
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Avatar handle={handle} color={p.color} size={80} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={type.h2}>@{handle}</Text>
          {p.vip ? (
            <View style={styles.vip}>
              <Text style={{ color: '#1a1206', fontWeight: '900', fontSize: 11 }}>VIP {p.vip}</Text>
            </View>
          ) : null}
        </View>
        {p.bio ? <Text style={[type.body, { textAlign: 'center' }]}>{p.bio}</Text> : null}
      </View>
      <View style={styles.stats}>
        <Stat center label="Vaulted" value={pulls.length} />
        <Press onPress={() => router.push({ pathname: '/connections', params: { handle, tab: 'followers' } })} accessibilityLabel="Followers" style={{ flex: 1 }}>
          <Stat center label="Followers" value={p.followers + (following ? 1 : 0)} />
        </Press>
        <Press onPress={() => router.push({ pathname: '/connections', params: { handle, tab: 'following' } })} accessibilityLabel="Following" style={{ flex: 1 }}>
          <Stat center label="Following" value={p.following} />
        </Press>
        <Stat center label="Packs" value={p.packsOpened.toLocaleString('en-US')} />
      </View>
      <Button
        label={following ? 'Following' : 'Follow'}
        icon={following ? 'check' : 'plus'}
        variant={following ? 'secondary' : 'primary'}
        onPress={() => {
          const now = toggleFollow(handle);
          bump('light');
          toast(now ? `Following @${handle} — their pulls will show in Following` : `Unfollowed @${handle}`);
        }}
        testID="follow-button"
      />
      <Button label={`Trade with @${handle}`} icon="trade" variant="secondary" onPress={() => router.push({ pathname: '/trade/new', params: { with: handle } })} testID="collector-trade" />
      <TheirListings handle={handle} />
      <Text style={type.h3}>Vaulted</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {pulls.map((h) => {
          const slab = packById(h.pack).slabs;
          return (
            <Press key={h.uid} onPress={() => inspect(h)} accessibilityLabel={`${h.card.name}, ${money(h.value)}`} style={styles.tile}>
              <Thumb id={h.card.id} graded={slab} tier={h.tier} width={slab ? 60 : 72} />
              <Text style={{ color: colors.money, fontWeight: '800', fontSize: 12, marginTop: 4 }}>{money(h.value, { compact: true })}</Text>
              <Text style={{ color: colors.faint, fontSize: 10 }}>{ago(h.minutesAgo)}</Text>
            </Press>
          );
        })}
      </View>
      <Panel style={{ gap: 6 }}>
        <Text style={type.caps}>About this demo</Text>
        <Text style={type.small}>Collectors here are invented for the demo. Their pulls and stats are generated, not real.</Text>
      </Panel>
    </Screen>
  );
}

// What they have up for sale on the Market right now.
function TheirListings({ handle }: { handle: string }) {
  const { a } = useMarket();
  if (!a) return null;
  const list = market.browse(a, { seller: handle });
  if (!list.length) return null;
  return (
    <View style={{ gap: 10 }} testID="collector-listings">
      <Text style={type.h3}>On the Market</Text>
      {list.slice(0, 6).map((l) => (
        <Press key={l.id} onPress={() => router.push(`/listing/${l.id}`)} style={styles.listing} accessibilityLabel={`${market.titleOf(l.items)}, ${money(l.price)}`}>
          <Thumb id={l.items[0].id} graded={l.items[0].graded} tier={l.items[0].tier} width={30} glow={false} />
          <Text style={{ flex: 1, color: colors.text, fontWeight: '700' }} numberOfLines={1}>
            {market.titleOf(l.items)}
          </Text>
          <Text style={{ color: colors.money, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
            {l.kind === 'auction' ? 'Bid ' : ''}
            {money(l.price)}
          </Text>
        </Press>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listing: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: radius.md, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
  vip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.gold },
  stats: { flexDirection: 'row', paddingVertical: 14, borderRadius: radius.lg, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
  tile: { width: 96, alignItems: 'center', padding: 8, borderRadius: radius.md, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
});
