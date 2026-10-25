// Your profile: who you are, your connections, a portfolio chart, stats,
// your collection and your recent pack activity.
import { router } from 'expo-router';
import { go } from '../../src/lib/nav';
import { Platform, Share, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../src/components/Icon';
import { PortfolioChart } from '../../src/components/PortfolioChart';
import { Thumb } from '../../src/components/Thumb';
import { Avatar, Button, Empty, IconButton, Panel, Press, Screen, Stat } from '../../src/components/ui';
import { packById } from '../../src/data';
import { money, since } from '../../src/lib/format';
import { toast } from '../../src/lib/toast';
import { cardOf, useSession } from '../../src/store/session';
import { colors, radius, type } from '../../src/theme';

export default function MyProfile() {
  const s = useSession((x) => x.s);
  if (!s) return null;
  const share = async () => {
    const text = `Follow me on the Godpack demo: @${s.handle}`;
    try {
      if (Platform.OS === 'web') {
        await (globalThis.navigator as Navigator).clipboard?.writeText(text);
        toast('Profile link copied');
      } else await Share.share({ message: text });
    } catch {
      // Dismissed.
    }
  };
  return (
    <Screen title="Profile" testID="screen-profile" right={<IconButton name="settings" label="Settings" onPress={() => router.push('/settings')} testID="to-settings" />}>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Avatar handle={s.handle} color={s.color} size={80} />
        <Text style={type.h2} testID="profile-name">
          {s.name}
        </Text>
        <Text style={{ color: colors.label2, fontWeight: '600' }}>@{s.handle}</Text>
        {s.bio ? <Text style={[type.body, { textAlign: 'center' }]}>{s.bio}</Text> : null}
      </View>
      <View style={styles.stats}>
        <Stat center label="Vaulted" value={s.vault.length} />
        <Press onPress={() => router.push({ pathname: '/connections', params: { tab: 'followers' } })} accessibilityLabel={`${s.followers.length} followers`} style={{ flex: 1 }} testID="my-followers">
          <Stat center label="Followers" value={s.followers.length} />
        </Press>
        <Press onPress={() => router.push({ pathname: '/connections', params: { tab: 'following' } })} accessibilityLabel={`${s.following.length} following`} style={{ flex: 1 }} testID="my-following">
          <Stat center label="Following" value={s.following.length} />
        </Press>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label="Edit profile" icon="pencil" variant="secondary" size="sm" onPress={() => router.push('/settings')} style={{ flex: 1 }} testID="edit-profile" />
        <Button label="Share" icon="share" variant="secondary" size="sm" onPress={share} style={{ flex: 1 }} />
      </View>
      <Panel>
        <PortfolioChart s={s} />
      </Panel>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Panel style={{ flex: 1, gap: 4 }}>
          <Text style={type.caps}>Packs opened</Text>
          <Text style={styles.big} testID="packs-opened">
            {s.opened}
          </Text>
        </Panel>
        <Panel style={{ flex: 1.3, gap: 4 }}>
          <Text style={type.caps}>Largest pull</Text>
          {s.largest ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Thumb id={s.largest.id} graded={s.largest.graded} tier={s.largest.tier} width={28} glow={false} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.big, { fontSize: 18, color: colors.money }]}>{money(s.largest.value)}</Text>
                <Text style={type.small} numberOfLines={1}>
                  {cardOf(s.largest).name}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.big}>—</Text>
          )}
        </Panel>
      </View>
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[type.h3, { flex: 1 }]}>Collection</Text>
          <Press onPress={() => go('/vault')} accessibilityLabel="See all in Vault" style={{ padding: 4 }}>
            <Text style={{ color: colors.accentSoft, fontWeight: '700' }}>See all</Text>
          </Press>
        </View>
        {s.vault.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {s.vault.slice(0, 6).map((v) => (
              <Press key={v.uid} onPress={() => router.push(`/card/${v.uid}`)} accessibilityLabel={cardOf(v).name} style={styles.mini}>
                <Thumb id={v.id} graded={v.graded} tier={v.tier} width={v.graded ? 60 : 72} />
                <Text style={{ color: colors.money, fontWeight: '800', fontSize: 12, marginTop: 4 }}>{money(v.value)}</Text>
              </Press>
            ))}
          </View>
        ) : (
          <Empty icon="vault" title="Nothing vaulted yet" body="Cards you keep from packs and battles show up here." />
        )}
      </View>
      <View style={{ gap: 8 }}>
        <Text style={type.h3}>Pack activity</Text>
        {s.pulls.length ? (
          s.pulls.slice(0, 8).map((p) => (
            <View key={p.uid} style={styles.activity}>
              <Icon name="packs" size={16} color={colors.accentSoft} />
              <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                {cardOf(p).name} <Text style={{ color: colors.muted }}>from {packById(p.pack).name}</Text>
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{since(p.at)}</Text>
              <Text style={{ color: colors.money, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{money(p.value)}</Text>
            </View>
          ))
        ) : (
          <Text style={type.small}>Open a pack and it shows up here.</Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', paddingVertical: 14, borderRadius: radius.lg, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
  big: { color: colors.text, fontSize: 24, fontWeight: '900', fontVariant: ['tabular-nums'] },
  mini: { width: 96, alignItems: 'center', padding: 8, borderRadius: radius.md, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
  activity: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.panel },
});
