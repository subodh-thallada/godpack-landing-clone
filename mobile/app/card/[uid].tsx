// A card in your Vault: sell it back, or ship it (address form). Shipping
// is pretend: a tracking number is made up and the shipment moves along on
// its own.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Icon } from '../../src/components/Icon';
import { Thumb } from '../../src/components/Thumb';
import { Button, Chip, Field, Sheet } from '../../src/components/ui';
import { packById } from '../../src/data';
import { money } from '../../src/lib/format';
import { success } from '../../src/lib/haptics';
import { toast } from '../../src/lib/toast';
import { type Address, SELL_RATE, SHIP_COST, cardOf, saleTimer, sell, ship, useSession } from '../../src/store/session';
import { colors, radius, tierColor, type } from '../../src/theme';

const TIER = { common: 'Common', core: 'Core', hit: 'Hit', chase: 'Chase', grail: 'Grail' } as const;
const empty: Address = { name: '', line1: '', line2: '', city: '', region: '', zip: '', country: 'US' };

export default function CardDetail() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const s = useSession((x) => x.s);
  const item = s?.vault.find((v) => v.uid === uid);
  const { width: W, height: H } = useWindowDimensions();
  const [shipping, setShipping] = useState(false);
  const [addr, setAddr] = useState<Address>(() => ({ ...empty, name: s?.name ?? '' }));
  const [errors, setErrors] = useState<Partial<Record<keyof Address, string>>>({});
  const close = () => (router.canGoBack() ? router.back() : router.replace('/vault'));

  if (!item || !s) {
    return (
      <Sheet title="Card">
        <Text style={type.body}>This card isn't in your Vault any more.</Text>
        <Button label="Back to Vault" onPress={close} />
      </Sheet>
    );
  }
  const c = cardOf(item);
  const pack = packById(item.pack);
  const w = Math.min(W * 0.5, H * 0.28 * (item.graded ? 0.6 : 0.716), 220);
  const cost = SHIP_COST[addr.country];

  const submit = () => {
    const e: typeof errors = {};
    if (addr.name.trim().length < 2) e.name = 'Enter the recipient name';
    if (addr.line1.trim().length < 4) e.line1 = 'Enter a street address';
    if (addr.city.trim().length < 2) e.city = 'Enter a city';
    if (addr.region.trim().length < 2) e.region = addr.country === 'US' ? 'Enter a state' : 'Enter a province';
    const zipOk = addr.country === 'US' ? /^\d{5}(-\d{4})?$/.test(addr.zip.trim()) : /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(addr.zip.trim());
    if (!zipOk) e.zip = addr.country === 'US' ? 'Enter a 5-digit ZIP' : 'Enter a postal code like K1A 0B1';
    setErrors(e);
    if (Object.keys(e).length) return;
    if (s.balance < cost) {
      toast(`Add ${money(cost - s.balance)} to cover shipping`, 'warn');
      return;
    }
    const sh = ship(item.uid, { ...addr, zip: addr.zip.trim().toUpperCase() });
    if (!sh) return;
    success();
    toast(`${c.name} is on its way — track it in Shipments`, 'good');
    close();
  };

  const set = (k: keyof Address) => (v: string) => {
    setAddr((a) => ({ ...a, [k]: v }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  return (
    <Sheet title={shipping ? `Ship ${c.name}` : c.name} testID="card-sheet">
      {!shipping ? (
        <>
          <Animated.View entering={ZoomIn.springify().damping(15)} style={{ alignItems: 'center', paddingVertical: 6 }}>
            <Thumb id={c.id} graded={item.graded} tier={item.tier} width={w} large />
          </Animated.View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={{ color: colors.money, fontSize: 30, fontWeight: '900', fontVariant: ['tabular-nums'] }} testID="card-value">
              {money(item.value)}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <View style={[styles.tier, { borderColor: tierColor[item.tier] }]}>
                <Text style={{ color: tierColor[item.tier], fontWeight: '800', fontSize: 12 }}>{TIER[item.tier]}</Text>
              </View>
              <Text style={type.small}>
                {item.graded ? `Graded · ${c.grade}` : 'Raw · NM'} · {pack.name}
              </Text>
            </View>
          </View>
          <View style={styles.info}>
            <Icon name="clock" size={16} color={colors.gold} />
            <Text style={[type.small, { flex: 1 }]}>Auto-sells in {saleTimer(item)} if you don't sell or ship it.</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              label={`Sell ${money(item.value * SELL_RATE)}`}
              icon="cash"
              variant="secondary"
              onPress={() => {
                const got = sell([item.uid]);
                success();
                toast(`Sold ${c.name} for ${money(got)}`, 'good');
                close();
              }}
              style={{ flex: 1 }}
              testID="card-sell"
            />
            <Button label="Ship" icon="truck" onPress={() => setShipping(true)} style={{ flex: 1 }} testID="card-ship" />
          </View>
        </>
      ) : (
        <Animated.View entering={FadeIn.duration(180)} style={{ gap: 12 }} testID="ship-form">
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Text style={[type.caps, { marginRight: 4 }]}>Country</Text>
            <Chip label={`US · $${SHIP_COST.US}`} on={addr.country === 'US'} onPress={() => setAddr((a) => ({ ...a, country: 'US' }))} testID="ship-us" />
            <Chip label={`Canada · $${SHIP_COST.CA}`} on={addr.country === 'CA'} onPress={() => setAddr((a) => ({ ...a, country: 'CA' }))} testID="ship-ca" />
          </View>
          <Field label="Full name" value={addr.name} onChangeText={set('name')} error={errors.name} autoComplete="name" testID="ship-name" />
          <Field label="Street address" value={addr.line1} onChangeText={set('line1')} error={errors.line1} autoComplete="street-address" testID="ship-line1" />
          <Field label="Apartment, suite (optional)" value={addr.line2} onChangeText={set('line2')} testID="ship-line2" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Field label="City" value={addr.city} onChangeText={set('city')} error={errors.city} style={{ flex: 1.3 }} testID="ship-city" />
            <Field label={addr.country === 'US' ? 'State' : 'Province'} value={addr.region} onChangeText={set('region')} error={errors.region} style={{ flex: 1 }} testID="ship-region" />
          </View>
          <Field label={addr.country === 'US' ? 'ZIP code' : 'Postal code'} value={addr.zip} onChangeText={set('zip')} error={errors.zip} autoCapitalize="characters" keyboardType={addr.country === 'US' ? 'number-pad' : 'default'} testID="ship-zip" />
          <View style={styles.info}>
            <Icon name="info" size={16} color={colors.accentSoft} />
            <Text style={[type.small, { flex: 1 }]}>Demo only: nothing is shipped and the address stays on this device. {money(cost, { compact: true })} shipping comes from your demo balance.</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="Back" variant="secondary" onPress={() => setShipping(false)} style={{ flex: 1 }} />
            <Button label={`Ship for ${money(cost, { compact: true })}`} onPress={submit} style={{ flex: 2 }} testID="ship-submit" />
          </View>
        </Animated.View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  tier: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md, backgroundColor: colors.surface },
});
