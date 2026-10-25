// Pull cards from the web app: Recent Hits (.hit), Top Hits (.tile) and the
// feed post (.post) with its tier tint.
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { type Pull, packById } from '../data';
import { ago, money } from '../lib/format';
import { colors, radius, rgba } from '../theme';
import { Icon } from './Icon';
import { Thumb } from './Thumb';
import { Avatar, Press } from './ui';

export const isSlab = (p: Pull) => p.pack === 'master' || p.pack === 'arena';

export function inspect(p: Pull) {
  router.push({
    pathname: '/pull',
    params: { card: p.card.id, value: String(p.value), tier: p.tier, pack: p.pack, handle: p.user.handle, self: p.user.self ? '1' : '0', m: String(p.minutesAgo) },
  });
}

export const profileHref = (u: { handle: string; self?: boolean }) => (u.self ? '/profile' : `/profile/${u.handle}`);

// .hit — art on the left, value, name, who and when on the right.
export const HitCard = memo(function HitCard({ hit }: { hit: Pull }) {
  const slab = isSlab(hit);
  return (
    <Press onPress={() => inspect(hit)} accessibilityLabel={`${hit.card.name}, ${money(hit.value)}, pulled by @${hit.user.handle}, ${ago(hit.minutesAgo)}`} style={styles.hit} testID="hit">
      <View style={styles.hitArt}>
        <Thumb id={hit.card.id} graded={slab} tier={hit.tier} width={slab ? 80 : 88} />
      </View>
      <View style={styles.hitInfo}>
        <Text style={styles.hitValue}>{money(hit.value, { compact: true })}</Text>
        <Text style={styles.hitName} numberOfLines={2}>
          {hit.card.name}
        </Text>
        <View style={styles.who}>
          <Avatar handle={hit.user.handle} color={hit.user.color} size={20} />
          <Text style={styles.whoText} numberOfLines={1}>
            @{hit.user.handle}
          </Text>
        </View>
        <Text style={styles.time}>{ago(hit.minutesAgo)}</Text>
      </View>
    </Press>
  );
});

// .tile — the tall Top Hits tile; grails get a gold wash.
export const TopTile = memo(function TopTile({ hit }: { hit: Pull }) {
  const grail = hit.tier === 'grail';
  return (
    <Press onPress={() => inspect(hit)} accessibilityLabel={`${hit.card.name}, ${money(hit.value)}`} style={styles.tile}>
      <LinearGradient
        colors={grail ? ['rgba(255,194,75,0.16)', 'rgba(255,194,75,0.02)'] : ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.01)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.tileArt}
      >
        <Thumb id={hit.card.id} graded tier={hit.tier} width={122} />
      </LinearGradient>
      <View style={styles.tileCap}>
        <Text style={styles.tileValue}>{money(hit.value, { compact: true })}</Text>
        <Text style={styles.tileName} numberOfLines={1}>
          {hit.card.name}
        </Text>
      </View>
    </Press>
  );
});

// .post — tinted by the pull's tier.
export const Post = memo(function Post({ hit, latest, onShare }: { hit: Pull; latest?: boolean; onShare: (p: Pull) => void }) {
  const slab = isSlab(hit);
  const tier = hit.tier;
  return (
    <View style={[styles.post, latest && { borderColor: rgba(tier, 0.45) }]} testID="post">
      <LinearGradient colors={[rgba(tier, 0.19), rgba(tier, 0.07), 'transparent']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0.3 }} end={{ x: 1, y: 0.7 }} style={StyleSheet.absoluteFill} />
      <View style={styles.postMeta}>
        <Press onPress={() => router.push(profileHref(hit.user) as never)} accessibilityLabel={`View @${hit.user.handle}'s profile`} style={styles.postWho} hitSlop={6}>
          <Avatar handle={hit.user.handle} color={hit.user.color} size={20} />
          <Text style={styles.postHandle} numberOfLines={1}>
            {hit.user.self ? 'You' : `@${hit.user.handle}`}
          </Text>
        </Press>
        <Text style={styles.postVerb}>pulled</Text>
        <View style={{ flex: 1 }} />
        {latest ? <Text style={styles.badge}>Latest pull</Text> : <Text style={styles.postVerb}>{ago(hit.minutesAgo)}</Text>}
        <Press onPress={() => onShare(hit)} accessibilityLabel="Share pull" hitSlop={8} style={{ padding: 4 }}>
          <Icon name="share" size={18} color={colors.muted} />
        </Press>
      </View>
      <View style={styles.postBody}>
        <Press onPress={() => inspect(hit)} accessibilityLabel={`Inspect ${hit.card.name}`} scaleTo={0.96} style={{ width: 70, alignItems: 'center' }}>
          <Thumb id={hit.card.id} graded={slab} tier={hit.tier} width={slab ? 62 : 70} glow={false} />
        </Press>
        <View style={{ flex: 1, gap: 4, justifyContent: 'flex-end' }}>
          <Text style={styles.postName} numberOfLines={2}>
            {hit.card.name}
          </Text>
          <Text style={styles.postSub} numberOfLines={1}>
            {slab ? `Graded · ${hit.card.grade}` : 'Raw · NM'} · {packById(hit.pack).name}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', justifyContent: 'flex-end', gap: 2 }}>
          <Text style={styles.capsMuted}>Pull value</Text>
          <Text style={styles.postValue}>{money(hit.value, { compact: true })}</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  hit: { flexDirection: 'row', gap: 14, width: 260, height: 170, paddingVertical: 15, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.surface },
  hitArt: { width: 88, alignItems: 'center', justifyContent: 'center' },
  hitInfo: { flex: 1, justifyContent: 'center', minWidth: 0 },
  hitValue: { color: colors.money, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  hitName: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 4, lineHeight: 20 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 9 },
  whoText: { color: colors.label, fontSize: 12, fontWeight: '500', flexShrink: 1 },
  time: { color: colors.muted, fontSize: 11, fontWeight: '500', marginTop: 3 },
  tile: { width: 180, height: 290, borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  tileArt: { height: 228, alignItems: 'center', justifyContent: 'center', borderTopLeftRadius: 19, borderTopRightRadius: 19 },
  tileCap: { paddingHorizontal: 12, paddingTop: 8, gap: 2 },
  tileValue: { color: colors.money, fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  tileName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  post: { padding: 16, gap: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, overflow: 'hidden' },
  postMeta: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  postWho: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  postHandle: { color: colors.text, fontSize: 12, fontWeight: '600', flexShrink: 1 },
  postVerb: { color: colors.muted, fontSize: 12, fontWeight: '500' },
  badge: { color: colors.accentSoft, backgroundColor: 'rgba(124,92,255,0.125)', fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  postBody: { flexDirection: 'row', gap: 14, alignItems: 'stretch' },
  postName: { color: colors.text, fontSize: 18, fontWeight: '700', lineHeight: 23 },
  postSub: { color: colors.muted, fontSize: 13, fontWeight: '500' },
  capsMuted: { color: colors.muted, fontSize: 11, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
  postValue: { color: colors.money, fontSize: 22, fontWeight: '800', letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
});
