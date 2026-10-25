// The top bar on every tab, as on the website: the brand mark, then the
// notifications bell, the wallet pill (.wallet) and your avatar.
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { money } from '../lib/format';
import { unreadCount, useSession } from '../store/session';
import { colors, radius } from '../theme';
import { Icon, Mark } from './Icon';
import { TourTarget } from './Tour';
import { Avatar, IconButton, Press } from './ui';

export function AppHeader() {
  const insets = useSafeAreaInsets();
  const s = useSession((x) => x.s);
  const unread = unreadCount(s);
  const balance = s?.balance ?? 0;
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
      <Mark size={30} />
      <View style={{ flex: 1 }} />
      <TourTarget id="bell">
        <IconButton outline name="bell" label={unread ? `Notifications, ${unread} unread` : 'Notifications'} testID="bell" badge={unread} onPress={() => router.push('/notifications')} />
      </TourTarget>
      <TourTarget id="wallet">
        <Press testID="wallet" accessibilityLabel={`Wallet, balance ${money(balance)}`} onPress={() => router.push('/wallet')} style={styles.wallet}>
          <Icon name="wallet" size={18} color={colors.muted} />
          <Text style={styles.amount} testID="balance">
            {money(balance, { compact: true })}
          </Text>
          <View style={styles.add}>
            <View style={styles.divider} />
            <Icon name="plus" size={16} color={colors.muted} />
          </View>
        </Press>
      </TourTarget>
      <Press testID="avatar" accessibilityLabel="Your profile" onPress={() => router.push('/profile')} scaleTo={0.94} hitSlop={6}>
        <Avatar handle={s?.handle ?? '?'} color={s?.color ?? colors.primary} size={34} />
      </Press>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 8, backgroundColor: colors.bg },
  wallet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingLeft: 12,
    paddingRight: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  amount: { color: colors.text, fontWeight: '700', fontSize: 17, letterSpacing: -0.2, fontVariant: ['tabular-nums'] },
  add: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  divider: { position: 'absolute', left: -4, top: 7, bottom: 7, width: 1, backgroundColor: colors.lineStrong },
});
