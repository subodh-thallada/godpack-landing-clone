// Deposit: add pretend demo credit. No payment details are asked for and no
// money moves.
import { useLocalSearchParams } from 'expo-router';
import { back } from '../src/lib/nav';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon, type IconName } from '../src/components/Icon';
import { Button, Chip, Panel, Press, Screen } from '../src/components/ui';
import { money } from '../src/lib/format';
import { success } from '../src/lib/haptics';
import { toast } from '../src/lib/toast';
import { deposit, useSession } from '../src/store/session';
import { colors, radius, type } from '../src/theme';

const QUICK = [10, 25, 50, 100, 250];
const METHODS: { id: string; name: string; note: string; icon: IconName; demo: boolean }[] = [
  { id: 'demo', name: 'Demo credit', note: 'Instant · free', icon: 'sparkle', demo: true },
  { id: 'card', name: 'Card', note: 'Not part of this demo', icon: 'card', demo: false },
  { id: 'crypto', name: 'Crypto', note: 'Not part of this demo', icon: 'globe', demo: false },
];

export default function Deposit() {
  const params = useLocalSearchParams<{ amount?: string | string[] }>();
  const initial = Array.isArray(params.amount) ? params.amount[0] : params.amount;
  const balance = useSession((x) => x.s?.balance ?? 0);
  const [amount, setAmount] = useState(initial ?? '50');
  const [method, setMethod] = useState('demo');
  const v = Math.round(parseFloat(amount.replace(/[^\d.]/g, '')) * 100) / 100 || 0;
  const error = v < 5 ? 'Minimum $5' : v > 5000 ? 'Maximum $5,000 per deposit' : null;
  const go = () => {
    if (error) return;
    deposit(v);
    success();
    toast(`Added ${money(v)} of demo credit`, 'good');
    back();
  };
  return (
    <Screen title="Deposit" testID="screen-deposit" footer={<Button label={`Add ${money(v, { compact: true })} demo credit`} variant="buy" disabled={!!error} onPress={go} testID="deposit-submit" />}>
      <Panel style={{ alignItems: 'center', gap: 6 }}>
        <Text style={type.caps}>Amount (USD)</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.dollar}>$</Text>
          <TextInput
            value={amount}
            onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, '').slice(0, 7))}
            keyboardType="decimal-pad"
            style={styles.amount}
            accessibilityLabel="Deposit amount in US dollars"
            testID="deposit-amount"
            selectTextOnFocus
          />
        </View>
        <Text style={[type.small, error ? { color: colors.danger } : null]}>{error ?? `Balance after: ${money(balance + v)}`}</Text>
      </Panel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }} accessibilityLabel="Quick amounts">
        {QUICK.map((q) => (
          <Chip key={q} label={`$${q}`} on={v === q} onPress={() => setAmount(String(q))} testID={`quick-${q}`} />
        ))}
      </View>
      <Text style={type.h3}>Payment</Text>
      {METHODS.map((m) => (
        <Press
          key={m.id}
          onPress={() => (m.demo ? setMethod(m.id) : toast(`${m.name} deposits are not part of this demo`))}
          accessibilityRole="radio"
          accessibilityState={{ checked: method === m.id, disabled: !m.demo }}
          style={[styles.method, method === m.id && { borderColor: colors.accentSoft }, !m.demo && { opacity: 0.5 }]}
          testID={`method-${m.id}`}
        >
          <Icon name={m.icon} size={20} color={colors.accentSoft} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{m.name}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{m.note}</Text>
          </View>
          <View style={[styles.radio, method === m.id && styles.radioOn]} />
        </Press>
      ))}
      <View style={styles.note}>
        <Icon name="lock" size={15} color={colors.muted} />
        <Text style={[type.small, { flex: 1 }]}>This is an unofficial demo. Deposits add pretend credit; no payment is taken and no card details are needed.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dollar: { color: colors.muted, fontSize: 36, fontWeight: '800' },
  amount: { color: colors.text, fontSize: 44, fontWeight: '900', minWidth: 120, textAlign: 'center', fontVariant: ['tabular-nums'] },
  method: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.panel, borderWidth: 1.5, borderColor: colors.line },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.controlLine },
  radioOn: { borderWidth: 7, borderColor: colors.primary },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, backgroundColor: colors.surface },
});
