// Inspect someone's pull: the card large, its value, who pulled it and from
// which pack.
import { router, useLocalSearchParams } from 'expo-router';
import { go } from '../src/lib/nav';
import { Text, View, useWindowDimensions } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Thumb } from '../src/components/Thumb';
import { Avatar, Button, Press, Sheet } from '../src/components/ui';
import { cardById, packById, user } from '../src/data';
import { ago, money } from '../src/lib/format';
import { useSession } from '../src/store/session';
import { colors, type, type Tier } from '../src/theme';

export default function PullDetail() {
  const p = useLocalSearchParams<{ card: string; value: string; tier: Tier; pack: string; handle: string; self?: string; m?: string }>();
  const me = useSession((x) => x.s);
  const { width: W, height: H } = useWindowDimensions();
  const card = cardById(p.card);
  const pack = packById(p.pack);
  const slab = pack.slabs;
  const who = p.self === '1' && me ? { handle: me.handle, color: me.color } : user(p.handle);
  const w = Math.min(W * 0.52, H * 0.3 * (slab ? 0.6 : 0.716), 240);
  const openProfile = () => {
    router.back();
    go(p.self === '1' ? '/profile' : `/profile/${p.handle}`);
  };
  return (
    <Sheet title={card.name} testID="pull-sheet">
      <Animated.View entering={ZoomIn.springify().damping(15)} style={{ alignItems: 'center', paddingVertical: 8 }}>
        <Thumb id={card.id} graded={slab} tier={p.tier} width={w} large />
      </Animated.View>
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Text style={{ color: colors.money, fontSize: 30, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{money(parseFloat(p.value) || 0)}</Text>
        <Text style={type.small}>
          {slab ? `Graded · ${card.grade}` : 'Raw · NM'} · {card.set}
        </Text>
      </View>
      <Press onPress={openProfile} accessibilityLabel={`View @${who.handle}'s profile`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: colors.panel }}>
        <Avatar handle={who.handle} color={who.color} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Pulled by @{who.handle}</Text>
          <Text style={{ color: colors.muted, fontSize: 13 }}>
            {pack.name} pack · {ago(parseInt(p.m ?? '0', 10))}
          </Text>
        </View>
      </Press>
      <Button
        label={`Open a ${pack.name} pack`}
        icon="packs"
        onPress={() => {
          go('/packs');
        }}
        testID="pull-open-pack"
      />
    </Sheet>
  );
}
