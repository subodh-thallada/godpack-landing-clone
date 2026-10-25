// List cards on the Market: pick one card (or up to six as a bundle), then a
// fixed price or an auction. The price suggestions, fee and "how fast will
// it sell" hint are all worked out from the cards' value.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { PickTile } from '../src/components/Market';
import { Button, Chip, Empty, Field, Screen } from '../src/components/ui';
import { money } from '../src/lib/format';
import { success, warn } from '../src/lib/haptics';
import { fadeIn } from '../src/lib/motion';
import { toast } from '../src/lib/toast';
import { DURATIONS, FEE, MAX_BUNDLE, nice } from '../src/market/engine';
import { act, ensureMarket, market, useMarket } from '../src/store/market';
import { colors, radius, type } from '../src/theme';

export default function Sell() {
  const p = useLocalSearchParams<{ uids?: string }>();
  useEffect(() => ensureMarket(), []);
  const { width: W } = useWindowDimensions();
  const { a } = useMarket();
  const vault = a?.vault ?? [];
  const [picked, setPicked] = useState<string[]>(() => (p.uids ? [...new Set(p.uids.split(','))].filter((u) => vault.some((v) => v.uid === u)) : []));
  const [kind, setKind] = useState<'fixed' | 'auction'>('fixed');
  const items = picked.map((u) => vault.find((v) => v.uid === u)!).filter(Boolean);
  const value = items.reduce((s, it) => s + it.value, 0);
  const [price, setPrice] = useState('');
  const [start, setStart] = useState('');
  const [duration, setDuration] = useState('5m');
  const [reserve, setReserve] = useState('');
  const [buyNow, setBuyNow] = useState('');
  // New picks reset the suggestions to the market value.
  useEffect(() => {
    setPrice(value ? String(nice(value)) : '');
    setStart(value ? String(nice(value * 0.6)) : '');
  }, [value]);
  const tileW = Math.floor((Math.min(W, 560) - 32 - 16) / 3);
  const n = parseFloat(price) || 0;
  const ratio = value ? n / value : 0;
  const pace = !n ? '' : ratio <= 0.95 ? 'Priced to go — likely sells within a minute or two.' : ratio <= 1.1 ? 'Around market value — should sell within a few minutes.' : ratio <= 1.25 ? 'A little high — may take a while or draw offers.' : 'Well over value — it may sit until you lower it.';

  const submit = () => {
    const r = act((d) =>
      market.list(d, {
        uids: picked,
        kind,
        price: n,
        start: parseFloat(start) || 0,
        duration,
        reserve: reserve ? parseFloat(reserve) : null,
        buyNow: buyNow ? parseFloat(buyNow) : null,
      }),
    );
    if (!r.ok) {
      warn();
      const msg: Record<string, string> = { items: 'Pick at least one card', bundle: `Up to ${MAX_BUNDLE} cards in a bundle`, price: 'Enter a price of at least $0.50', reserve: 'The reserve must be at least the starting bid', buyNow: 'Buy now must be more than the starting bid' };
      return toast(msg[r.error ?? ''] ?? 'Check the listing and try again', 'warn');
    }
    success();
    toast(kind === 'fixed' ? `Listed for ${money(n)}` : `Auction started — ends in ${DURATIONS.find((d) => d.id === duration)!.label}`, 'good');
    router.replace(`/listing/${(r.listing as { id: string }).id}`);
  };

  return (
    <Screen
      title="List on the Market"
      testID="screen-sell"
      footer={
        items.length ? (
          <Button label={kind === 'fixed' ? `List for ${money(n)}` : 'Start auction'} icon={kind === 'fixed' ? 'tag' : 'gavel'} variant="buy" onPress={submit} disabled={kind === 'fixed' ? n < 0.5 : (parseFloat(start) || 0) < 0.5} testID="sell-submit" />
        ) : null
      }
    >
      <View style={styles.label}>
        <Text style={type.caps}>Cards</Text>
        <Text style={styles.meta} testID="sell-picked">
          {items.length ? `${items.length} picked · ${money(value)}` : 'Pick one, or a few for a bundle'}
        </Text>
      </View>
      {vault.length ? (
        <View style={styles.grid}>
          {vault
            .slice()
            .sort((x, y) => y.value - x.value)
            .map((it) => (
              <PickTile key={it.uid} it={it} width={tileW} on={picked.includes(it.uid)} disabled={picked.length >= MAX_BUNDLE} onPress={() => setPicked((ps) => (ps.includes(it.uid) ? ps.filter((x) => x !== it.uid) : ps.length >= MAX_BUNDLE ? ps : [...ps, it.uid]))} testID="sell-pick" />
            ))}
        </View>
      ) : (
        <Empty icon="vault" title="Your Vault is empty" body="Open a pack, buy on the Market or trade, and you can list cards here." />
      )}

      {items.length ? (
        <Animated.View entering={fadeIn} style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label="Fixed price" icon="tag" on={kind === 'fixed'} onPress={() => setKind('fixed')} testID="sell-fixed" />
            <Chip label="Auction" icon="gavel" on={kind === 'auction'} onPress={() => setKind('auction')} testID="sell-auction" />
          </View>
          {kind === 'fixed' ? (
            <>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {[
                  ['Quick sale', 0.95],
                  ['Market', 1],
                  ['Patient', 1.15],
                ].map(([label, k]) => (
                  <Chip key={label} label={`${label} · ${money(nice(value * (k as number)), { compact: true })}`} on={n === nice(value * (k as number))} onPress={() => setPrice(String(nice(value * (k as number))))} testID={`sell-suggest-${String(label).split(' ')[0].toLowerCase()}`} />
                ))}
              </View>
              <Field label="Price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" testID="sell-price" />
              <View style={styles.quote}>
                <Row k="Price" v={money(n)} />
                <Row k={`Market fee (${FEE * 100}%)`} v={`−${money(n * FEE)}`} />
                <Row k="You receive" v={money(n * (1 - FEE))} strong />
              </View>
              {pace ? <Text style={[type.small, { color: ratio <= 1.1 ? colors.money : ratio <= 1.25 ? colors.gold : colors.danger }]}>{pace}</Text> : null}
            </>
          ) : (
            <>
              <Field label="Starting bid" value={start} onChangeText={setStart} keyboardType="decimal-pad" testID="sell-start" />
              <View style={{ gap: 8 }}>
                <Text style={type.caps}>Ends in</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {DURATIONS.map((d) => (
                    <Chip key={d.id} label={d.label} on={duration === d.id} onPress={() => setDuration(d.id)} testID={`sell-duration-${d.id}`} />
                  ))}
                </View>
              </View>
              <Field label="Reserve (optional)" value={reserve} onChangeText={setReserve} keyboardType="decimal-pad" placeholder="No reserve" testID="sell-reserve" />
              <Field label="Buy now price (optional)" value={buyNow} onChangeText={setBuyNow} keyboardType="decimal-pad" placeholder="No buy now" testID="sell-buynow" />
              <Text style={type.small}>
                Collectors bid up toward what the cards are worth ({money(value)}). If bidding ends under your reserve, nothing sells and the cards come back. A 5% fee comes out of the winning bid.
              </Text>
            </>
          )}
          <Text style={type.small}>The cards leave your Vault while they're listed and come back if you take them down.</Text>
        </Animated.View>
      ) : null}
    </Screen>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={[type.small, strong && { color: colors.text, fontWeight: '700' }]}>{k}</Text>
      <Text style={[{ color: strong ? colors.money : colors.label2, fontWeight: strong ? '800' : '600', fontVariant: ['tabular-nums'] }]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  meta: { color: colors.label2, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quote: { gap: 6, padding: 14, borderRadius: radius.md, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line },
});
