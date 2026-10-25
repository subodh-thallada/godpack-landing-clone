// Settings: edit your profile, notifications, Safe mode and the daily
// spending reminder, replay the tour, and the demo account controls —
// including deleting the account, which the App Store requires for any app
// that lets you create one.
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '../src/components/Icon';
import { Avatar, Button, Caps, Chip, Field, Press, Screen, Toggle } from '../src/components/ui';
import { money } from '../src/lib/format';
import { requestNotifications, setDailyReminder } from '../src/lib/notifications';
import { toast } from '../src/lib/toast';
import { resetPrefs, setPrefs, usePrefs } from '../src/store/prefs';
import { editProfile, resetDemo, signOut, useSession } from '../src/store/session';
import { AVATAR_COLORS, COLOR_NAMES, colors, radius } from '../src/theme';

const LIMITS = [null, 10, 25, 50, 100] as const;
type Confirm = 'reset' | 'logout' | 'restart' | 'delete';
const CONFIRM: Record<Confirm, { q: string; detail: string; cta: string }> = {
  reset: { q: 'Reset demo data?', detail: 'Your balance, Vault and history go back to the start.', cta: 'Reset' },
  logout: { q: 'Log out?', detail: 'You can log back in with the same option any time.', cta: 'Log out' },
  restart: { q: 'Start onboarding again?', detail: 'This signs you out and resets the demo.', cta: 'Restart' },
  delete: { q: 'Delete your account?', detail: 'Everything stored on this device for this account is removed. This cannot be undone.', cta: 'Delete account' },
};

export default function Settings() {
  const s = useSession((x) => x.s);
  const prefs = usePrefs();
  const [name, setName] = useState(s?.name ?? '');
  const [bio, setBio] = useState(s?.bio ?? '');
  const [color, setColor] = useState(s?.color ?? AVATAR_COLORS[0]);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  if (!s) return null;
  const dirty = name.trim() !== s.name || bio.trim() !== s.bio || color !== s.color;

  const notif = async (on: boolean) => {
    if (on && !(await requestNotifications())) {
      toast('Notifications are blocked. Allow them in your device settings.', 'warn');
      setPrefs({ notifications: 'off' });
      return;
    }
    await setDailyReminder(on);
    setPrefs({ notifications: on ? 'on' : 'off' });
  };

  const leave = (to: '/signin' | '/onboarding') => {
    if (router.canDismiss()) router.dismissAll();
    router.replace(to);
  };

  const run = async (what: Confirm) => {
    setConfirm(null);
    if (what === 'reset') {
      resetDemo();
      toast('Demo data reset');
      return;
    }
    // Leaving the account also stops its daily reminder.
    await setDailyReminder(false);
    if (what === 'logout') {
      signOut();
      toast('Logged out');
      leave('/signin');
      return;
    }
    signOut();
    resetPrefs();
    if (what === 'delete') toast('Your account was deleted');
    leave('/onboarding');
  };

  return (
    <Screen title="Settings" testID="screen-settings">
      <Group>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
          <Avatar handle={s.handle} color={color} size={48} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>@{s.handle}</Text>
            <Text style={styles.sub}>
              {s.provider === 'guest' ? 'Guest account' : `Signed in with ${{ apple: 'Apple', google: 'Google', email: 'email' }[s.provider]}`}
              {s.email ? ` · ${s.email}` : ''}
            </Text>
          </View>
        </View>
        <View style={{ gap: 14, paddingHorizontal: 16, paddingBottom: 16 }}>
          <Field label="Display name" value={name} onChangeText={setName} maxLength={24} testID="settings-name" />
          <Field label="Bio" value={bio} onChangeText={setBio} maxLength={80} placeholder="A line about you" testID="settings-bio" />
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            {AVATAR_COLORS.map((c) => (
              <Press key={c} onPress={() => setColor(c)} accessibilityRole="radio" accessibilityState={{ checked: c === color }} accessibilityLabel={COLOR_NAMES[c]} style={[styles.swatch, { backgroundColor: c }, c === color && styles.swatchOn]} scaleTo={0.92}>
                {c === color ? <Icon name="check" size={14} color="#fff" stroke={3} /> : null}
              </Press>
            ))}
          </View>
          <Button
            label="Save profile"
            disabled={!dirty || name.trim().length < 2}
            onPress={() => {
              editProfile({ name: name.trim(), bio: bio.trim(), color });
              toast('Profile updated');
            }}
            testID="settings-save"
          />
        </View>
      </Group>

      <Group>
        <Row icon="bell" title="Notifications" sub="Shipping, battle results and a 7 PM check-in reminder">
          <Toggle value={prefs.notifications === 'on'} onChange={notif} label="Notifications" testID="settings-notifications" />
        </Row>
        <Row icon="shield" title="Safe mode" sub="Raises the floor, same top prizes">
          <Toggle value={prefs.safe} onChange={(v) => setPrefs({ safe: v })} label="Safe mode" testID="settings-safe" />
        </Row>
        <View style={{ padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="clock" size={18} color={colors.label2} />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Daily spending reminder</Text>
              <Text style={styles.sub}>A nudge when today's opening passes this amount</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {LIMITS.map((l) => (
              <Chip key={String(l)} label={l == null ? 'Off' : money(l, { compact: true })} on={prefs.limit === l} onPress={() => setPrefs({ limit: l })} testID={`limit-${l ?? 'off'}`} />
            ))}
          </View>
        </View>
      </Group>

      <Group>
        <Link
          icon="compass"
          title="Replay the app tour"
          onPress={() => {
            setPrefs({ tourRequested: true });
            if (router.canDismiss()) router.dismissAll();
            router.navigate('/packs');
          }}
          testID="settings-tour"
        />
        <Link icon="info" title="Pack odds" onPress={() => router.push({ pathname: '/odds', params: { pack: 'starter' } })} />
        <Link icon="truck" title="Shipments" onPress={() => router.push('/shipments')} last />
      </Group>

      <Caps style={{ marginTop: 4, marginLeft: 4 }}>Demo account</Caps>
      {confirm ? (
        <View style={styles.confirm} testID="settings-confirm">
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{CONFIRM[confirm].q}</Text>
          <Text style={styles.sub}>{CONFIRM[confirm].detail}</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
            <Button label="Cancel" variant="secondary" onPress={() => setConfirm(null)} style={{ flex: 1 }} />
            <Button label={CONFIRM[confirm].cta} variant={confirm === 'reset' ? 'primary' : 'danger'} onPress={() => run(confirm)} style={{ flex: 1 }} testID="settings-confirm-yes" />
          </View>
        </View>
      ) : (
        <Group>
          <Link icon="refresh" title="Reset demo data" onPress={() => setConfirm('reset')} testID="settings-reset" />
          <Link icon="sparkle" title="Restart onboarding" onPress={() => setConfirm('restart')} testID="settings-restart" />
          <Link icon="logout" title="Log out" onPress={() => setConfirm('logout')} testID="settings-logout" />
          <Link icon="close" title="Delete account" danger onPress={() => setConfirm('delete')} testID="settings-delete" last />
        </Group>
      )}
      <Text style={styles.foot}>Unofficial recreation of the Godpack app with original art and invented collectors. No real money, cards or shipping.</Text>
    </Screen>
  );
}

function Group({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

function Row({ icon, title, sub, children }: { icon: IconName; title: string; sub: string; children: ReactNode }) {
  return (
    <View style={[styles.row, styles.rule]}>
      <Icon name={icon} size={18} color={colors.label2} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>
      {children}
    </View>
  );
}

function Link({ icon, title, onPress, testID, last, danger }: { icon: IconName; title: string; onPress: () => void; testID?: string; last?: boolean; danger?: boolean }) {
  return (
    <Press onPress={onPress} accessibilityLabel={title} scaleTo={1} style={[styles.row, !last && styles.rule]} testID={testID}>
      <Icon name={icon} size={18} color={danger ? colors.danger : colors.label2} />
      <Text style={[styles.title, { flex: 1 }, danger && { color: colors.danger }]}>{title}</Text>
      <Icon name="chevronRight" size={16} color={colors.faint} />
    </Press>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: radius.lg, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.panelLine, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, paddingVertical: 12 },
  rule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.panelLine },
  title: { color: colors.text, fontWeight: '600', fontSize: 15 },
  sub: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  swatch: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  swatchOn: { borderWidth: 3, borderColor: '#fff' },
  confirm: { gap: 4, padding: 16, borderRadius: radius.lg, backgroundColor: colors.dialog, borderWidth: 1, borderColor: colors.dialogLine },
  foot: { color: colors.faint, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 4 },
});
