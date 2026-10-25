// Withdraw: request a withdrawal of demo credit. Nothing is sent anywhere.
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '../src/components/Icon';
import { Button, Panel, Press, Screen } from '../src/components/ui';
import { WITHDRAW_METHODS } from '../src/data';
import { money, since } from '../src/lib/format';
import { success } from '../src/lib/haptics';
import { toast } from '../src/lib/toast';
import { useSession, withdraw } from '../src/store/session';
import { colors, radius, type } from '../src/theme';

export default function Withdraw() {
  const s = useSession((x) => x.s);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<(typeof WITHDRAW_METHODS)[number]['id']>('venmo');
  if (!s) return null;
  const m = WITHDRAW_METHODS.find((x) => x.id === method) ?? WITHDRAW_METHODS[1];
  const v = Math.round(parseFloat(amount) * 100) / 100 || 0;
  const fee = Math.round(v * m.rate * 100) / 100;
  const error = !amount ? null : v < 5 ? 'Minimum $5' : v > s.balance ? `You have ${money(s.balance)}` : null;
  const go = () => {
    if (error || !v) return;
    withdraw(v, m.name);
    success();
    toast(`Withdrawal of ${money(v)} requested (demo)`, 'good');
    setAmount('');
  };
  return (
    <Screen title="Withdraw" testID="screen-withdraw" footer={<Button label={v ? `Withdraw ${money(v)}` : 'Enter an amount'} variant="buy" disabled={!v || !!error} onPress={go} testID="withdraw-submit" />}>
      <Panel style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={type.caps}>Withdrawal amount</Text>
          <Press onPress={() => setAmount(String(s.balance))} accessibilityLabel="Use full balance">
            <Text style={{ color: colors.accentSoft, fontWeight: '700', fontSize: 13 }}>Max {money(s.balance)}</Text>
          </Press>
        </View>
        <View style={styles.field}>
          <Text style={{ color: colors.muted, fontSize: 22, fontWeight: '800' }}>$</Text>
          <TextInput value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, '').slice(0, 8))} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.faint} style={styles.input} accessibilityLabel="Withdrawal amount" testID="withdraw-amount" />
        </View>
        {error ? <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text> : null}
        {v && !error ? (
          <Text style={type.small}>
            Fee {money(fee)} · you'd receive <Text style={{ color: colors.text, fontWeight: '800' }}>{money(v - fee)}</Text>
          </Text>
        ) : null}
      </Panel>
      <Text style={type.h3}>Withdrawal options</Text>
      {WITHDRAW_METHODS.map((x) => (
        <Press key={x.id} onPress={() => setMethod(x.id)} accessibilityRole="radio" accessibilityState={{ checked: method === x.id }} style={[styles.method, method === x.id && { borderColor: colors.accentSoft }]} testID={`withdraw-${x.id}`}>
          <Icon name={x.id === 'crypto' ? 'globe' : x.id === 'bank' ? 'bank' : x.id === 'card' ? 'card' : 'bolt'} size={20} color={colors.accentSoft} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>
              {x.name} <Text style={{ color: colors.muted, fontWeight: '600', fontSize: 12 }}>· {x.fee}</Text>
            </Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{x.note}</Text>
          </View>
          <View style={[styles.radio, method === x.id && styles.radioOn]} />
        </Press>
      ))}
      {s.withdrawals.length ? (
        <View style={{ gap: 8 }}>
          <Text style={type.h3}>Recent withdrawals</Text>
          {s.withdrawals.slice(0, 5).map((w) => (
            <View key={w.id} style={styles.recent} testID="withdrawal">
              <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }}>{w.method}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{since(w.at)} · Requested</Text>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{money(w.amount)}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <Text style={[type.small, { textAlign: 'center' }]}>Demo only: withdrawals just lower your demo balance. Nothing is sent.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 56, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lineStrong },
  input: { flex: 1, color: colors.text, fontSize: 24, fontWeight: '800', height: '100%', fontVariant: ['tabular-nums'] },
  method: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.panel, borderWidth: 1.5, borderColor: colors.line },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.controlLine },
  radioOn: { borderWidth: 7, borderColor: colors.primary },
  recent: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.panel },
});
