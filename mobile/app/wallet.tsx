// Wallet sheet: demo balance, cards value, deposit / withdraw and recent
// money movements.
import { router } from 'expo-router';
import { go } from '../src/lib/nav';
import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '../src/components/Icon';
import { Button, Divider, Press, Sheet } from '../src/components/ui';
import { money, since } from '../src/lib/format';
import { useSession, vaultValue } from '../src/store/session';
import { colors, radius, type } from '../src/theme';

export default function Wallet() {
  const s = useSession((x) => x.s);
  if (!s) return null;
  const cards = vaultValue(s);
  const open = (href: '/deposit' | '/withdraw' | '/shipments' | '/vault') => {
    router.back();
    go(href);
  };
  return (
    <Sheet title="Wallet" testID="wallet-sheet">
      <View style={styles.hero}>
        <Text style={type.caps}>Demo balance</Text>
        <Text style={styles.balance} testID="wallet-balance">
          {money(s.balance)}
        </Text>
        <Text style={type.small}>Pretend credit for this demo. It can't be cashed out.</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button label="Deposit" icon="deposit" onPress={() => open('/deposit')} style={{ flex: 1 }} testID="wallet-deposit" />
        <Button label="Withdraw" icon="withdraw" variant="secondary" onPress={() => open('/withdraw')} style={{ flex: 1 }} testID="wallet-withdraw" />
      </View>
      <View style={styles.list}>
        <Row icon="vault" label="Cards in your Vault" value={money(cards)} onPress={() => open('/vault')} />
        <Divider />
        <Row icon="sparkle" label="Total (cash + cards)" value={money(s.balance + cards)} />
        <Divider />
        <Row icon="truck" label="Shipments" value={String(s.shipments.length)} onPress={() => open('/shipments')} />
      </View>
      {s.withdrawals.length ? (
        <View style={{ gap: 8 }}>
          <Text style={type.caps}>Recent withdrawals</Text>
          {s.withdrawals.slice(0, 4).map((w) => (
            <View key={w.id} style={styles.item}>
              <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }}>{w.method}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{since(w.at)}</Text>
              <Text style={{ color: colors.text, fontWeight: '800', fontVariant: ['tabular-nums'] }}>−{money(w.amount)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Sheet>
  );
}

function Row({ icon, label, value, onPress }: { icon: 'vault' | 'sparkle' | 'truck'; label: string; value: string; onPress?: () => void }) {
  const body = (
    <View style={styles.row}>
      <Icon name={icon} size={18} color={colors.accentSoft} />
      <Text style={{ color: colors.label2, fontWeight: '600', flex: 1 }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{value}</Text>
      {onPress ? <Icon name="chevronRight" size={16} color={colors.faint} /> : null}
    </View>
  );
  return onPress ? (
    <Press onPress={onPress} accessibilityLabel={label}>
      {body}
    </Press>
  ) : (
    body
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 4, paddingVertical: 10 },
  balance: { color: colors.money, fontSize: 40, fontWeight: '900', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  list: { borderRadius: radius.lg, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.panel },
});
