// The pack-opening ceremony — the website's own animation, running in a DOM
// component. The pulls were already drawn and added to the Vault by the
// store; this reveals the best one with Sell / Keep, or after several packs
// Keep all / See all, which opens the results grid.
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Thumb } from '../src/components/Thumb';
import { Button, Press } from '../src/components/ui';
import { cardById, packById } from '../src/data';
import Ceremony from '../src/dom/Ceremony';
import { money } from '../src/lib/format';
import { success } from '../src/lib/haptics';
import { toast } from '../src/lib/toast';
import { SELL_RATE, type VaultItem, bestOf, sell, useSession } from '../src/store/session';
import { colors, radius } from '../src/theme';

// The ceremony's pack art order (packdemo.js PACKS).
const CEREMONY_PACKS = ['arena', 'master', 'starter', 'trainer'];
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function Open() {
  const params = useLocalSearchParams<{ pack?: string | string[]; uids?: string | string[] }>();
  const s = useSession((x) => x.s);
  const insets = useSafeAreaInsets();
  const pack = packById(first(params.pack) ?? 'starter');
  // Look the pulls up in your history (they stay there even once sold).
  const [pulls] = useState<VaultItem[]>(() => {
    const ids = (first(params.uids) ?? '').split(',').filter(Boolean);
    return ids.map((id) => s?.pulls.find((p) => p.uid === id)).filter((p): p is VaultItem => !!p);
  });
  const [view, setView] = useState<'reveal' | 'results'>('reveal');
  const after = useRef<'close' | 'results'>('close');
  const best = useMemo(() => (pulls.length ? bestOf(pulls) : null), [pulls]);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/packs'));

  if (!best) {
    return (
      <View style={[styles.full, { justifyContent: 'center', alignItems: 'center', gap: 12 }]}>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>Nothing to open</Text>
        <Button label="Back to packs" onPress={close} />
      </View>
    );
  }
  const card = cardById(best.id);
  const several = pulls.length > 1;
  const actions = several ? [{ label: 'Keep all' }, { label: `See all ${pulls.length} cards`, primary: true }] : [{ label: `Sell for ${money(best.value * SELL_RATE)}` }, { label: 'Keep', primary: true }];

  const onAction = async (i: number) => {
    if (several) {
      if (i === 1) after.current = 'results';
      else toast(`${pulls.length} cards added to your Vault`);
      return;
    }
    if (i === 0) {
      const got = sell([best.uid]);
      success();
      toast(`Sold ${card.name} for ${money(got)}`);
    } else toast(`${card.name} is in your Vault`);
  };
  const onClose = async () => {
    if (after.current === 'results') setView('results');
    else close();
  };

  return (
    <View style={styles.full} testID="ceremony">
      {view === 'reveal' ? (
        <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: '#000' }}>
          <Ceremony
            pack={Math.max(0, CEREMONY_PACKS.indexOf(pack.art))}
            card={{ id: card.id, name: card.name, value: best.value, tier: best.tier === 'common' ? 'core' : best.tier }}
            actions={actions}
            onAction={onAction}
            onClose={onClose}
            dom={{ style: { flex: 1, backgroundColor: '#000' }, containerStyle: { flex: 1 }, scrollEnabled: false, bounces: false }}
          />
        </View>
      ) : (
        <Results pulls={pulls} packName={pack.name} packPrice={pack.price} onDone={close} />
      )}
    </View>
  );
}

// Every card from a multi-pack open, best first, with Sell or Keep all.
function Results({ pulls, packName, packPrice, onDone }: { pulls: VaultItem[]; packName: string; packPrice: number; onDone: () => void }) {
  const { width: W } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const vault = useSession((x) => x.s?.vault ?? []);
  const inVault = (uid: string) => vault.some((v) => v.uid === uid);
  const sorted = useMemo(() => pulls.slice().sort((a, b) => b.value - a.value), [pulls]);
  const total = sorted.reduce((sum, p) => sum + p.value, 0);
  const spent = packPrice * pulls.length;
  const up = total >= spent;
  const tileW = (Math.min(W, 520) - 40 - 2 * 10) / 3;
  const left = sorted.filter((p) => inVault(p.uid));
  return (
    <View style={[styles.full, { backgroundColor: colors.bg, paddingTop: insets.top + 8 }]} testID="results">
      <Animated.View entering={FadeIn.duration(200)} style={styles.head}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', flex: 1 }}>
          {pulls.length} {packName} packs
        </Text>
        <Press onPress={onDone} hitSlop={10} accessibilityLabel="Done" testID="results-close">
          <Text style={{ color: colors.accentSoft, fontWeight: '600', fontSize: 15 }}>Done</Text>
        </Press>
      </Animated.View>
      <Text style={styles.sum}>
        Pulled <Text style={{ color: colors.text, fontWeight: '800' }}>{money(total)}</Text> from {money(spent, { compact: true })}{' '}
        <Text style={{ color: up ? colors.money : colors.danger, fontWeight: '700' }}>
          {up ? '+' : '−'}
          {money(Math.abs(total - spent))}
        </Text>
      </Text>
      <ScrollView contentContainerStyle={styles.grid}>
        {sorted.map((p, i) => {
          const c = cardById(p.id);
          const sold = !inVault(p.uid);
          return (
            <Animated.View key={p.uid} entering={FadeInDown.delay(i * 40).duration(260)} style={[styles.tile, { width: tileW }, sold && { opacity: 0.45 }]} testID="result-tile">
              <Thumb id={c.id} graded={p.graded} tier={p.tier} width={p.graded ? tileW - 34 : tileW - 24} />
              <Text style={styles.value}>{money(p.value)}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {c.name}
              </Text>
              <Button
                label={sold ? 'Sold' : 'Sell'}
                size="sm"
                variant="secondary"
                disabled={sold}
                onPress={() => {
                  const got = sell([p.uid]);
                  toast(`Sold for ${money(got)}`);
                }}
                style={{ alignSelf: 'stretch', marginTop: 8 }}
                testID="result-sell"
              />
            </Animated.View>
          );
        })}
      </ScrollView>
      <View style={[styles.actions, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          label={left.length ? `Sell all for ${money(left.reduce((sum, p) => sum + p.value, 0) * SELL_RATE)}` : 'All sold'}
          variant="secondary"
          disabled={!left.length}
          onPress={() => {
            const got = sell(left.map((p) => p.uid));
            toast(`Sold ${left.length} cards for ${money(got)}`);
            onDone();
          }}
          style={{ flex: 1 }}
          testID="sell-all"
        />
        <Button label="Keep all" onPress={onDone} style={{ flex: 1 }} testID="results-done" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: '#000' },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 4 },
  sum: { color: colors.label2, fontSize: 15, paddingHorizontal: 20, paddingBottom: 14 },
  grid: { paddingHorizontal: 20, paddingBottom: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center' },
  value: { color: colors.money, fontWeight: '800', fontSize: 14, marginTop: 10, fontVariant: ['tabular-nums'] },
  name: { color: colors.text, fontWeight: '600', fontSize: 12, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
});
