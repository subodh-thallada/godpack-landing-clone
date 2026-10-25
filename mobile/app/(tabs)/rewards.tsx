// Rewards, as on the website: the VIP card (tap to flip) and tier table,
// free packs and referral cash, invites, and the daily check-in streak.
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { EASE_IN_OUT } from '../../src/lib/motion';
import { Icon, Mark } from '../../src/components/Icon';
import { PackArt } from '../../src/components/Thumb';
import { Button, Caps, Press, ViewHead } from '../../src/components/ui';
import { PACKS, VIP_LEVELS } from '../../src/data';
import { money } from '../../src/lib/format';
import { success } from '../../src/lib/haptics';
import { toast } from '../../src/lib/toast';
import { DAY, checkIn, checkedInToday, currentStreak, nextVip, openPacks, startOfDay, useSession } from '../../src/store/session';
import { colors, radius, type } from '../../src/theme';

function untilMidnight(now: number) {
  const left = startOfDay(now) + DAY - now;
  return `${Math.floor(left / 3600000)}h ${Math.floor((left % 3600000) / 60000)}m left today`;
}

export default function Rewards() {
  const s = useSession((x) => x.s);
  const [now, setNow] = useState(Date.now());
  const [flipped, setFlipped] = useState(false);
  const flip = useSharedValue(0);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    // Turning over on the spot: ease-in-out, and a tap mid-turn reverses it
    // from wherever it is.
    flip.set(withTiming(flipped ? 1 : 0, { duration: 420, easing: EASE_IN_OUT }));
  }, [flipped, flip]);
  const front = useAnimatedStyle(() => ({ opacity: flip.get() < 0.5 ? 1 : 0, transform: [{ perspective: 1000 }, { rotateY: `${flip.get() * 180}deg` }] }));
  const back = useAnimatedStyle(() => ({ opacity: flip.get() >= 0.5 ? 1 : 0, transform: [{ perspective: 1000 }, { rotateY: `${(flip.get() - 1) * 180}deg` }] }));

  if (!s) return null;
  const next = nextVip(s.volume);
  const today = checkedInToday(s, now);
  const streak = currentStreak(s, now);
  const link = `godpack.demo/r/${s.handle}`;

  const copy = async (what: 'link' | 'code') => {
    const text = what === 'code' ? s.handle.toUpperCase() : `Join me on the Godpack demo: ${link}`;
    try {
      if (Platform.OS === 'web') {
        await (globalThis.navigator as Navigator).clipboard?.writeText(text);
        toast(what === 'code' ? 'Code copied' : 'Link copied');
      } else await Share.share({ message: text });
    } catch {
      // Dismissed.
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.page} testID="screen-rewards">
      <ViewHead title="Rewards" />

      <Press onPress={() => setFlipped((f) => !f)} accessibilityLabel="Your VIP card: Standard, 5% sell-back fee. Tap to flip." scaleTo={0.99} testID="vip-card">
        <View style={{ aspectRatio: 1.585 }}>
          <Animated.View style={[StyleSheet.absoluteFill, front]}>
            <LinearGradient colors={['#1d1b25', '#121119']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.vip}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Mark size={26} />
                  <Text style={styles.word}>godpack</Text>
                </View>
                <Text style={styles.tier}>STANDARD</Text>
              </View>
              <View>
                <Text style={styles.rate}>5%</Text>
                <Text style={styles.cap}>Sell-back fee</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <Text style={styles.holder}>@{s.handle.toUpperCase()}</Text>
                <Text style={styles.tag}>VIP</Text>
              </View>
            </LinearGradient>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, back]}>
            <View style={[styles.vip, { backgroundColor: '#15141b', alignItems: 'center', justifyContent: 'center' }]}>
              <View style={styles.stripe} />
              <Mark size={44} />
              <Text style={[styles.cap, { marginTop: 10 }]}>Member since {new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</Text>
            </View>
          </Animated.View>
        </View>
      </Press>

      <View style={styles.panel}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>Next: {next ? next[1] : 'Top tier'}</Text>
          <Text style={{ color: colors.label2, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
            {money(s.volume, { compact: true })} / {next ? `$${next[0].toLocaleString('en-US')}` : '—'}
          </Text>
        </View>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${next ? Math.max(1.5, (s.volume / next[0]) * 100) : 100}%` }]} />
        </View>
        <Text style={type.small}>{next ? `$${(next[0] - s.volume).toLocaleString('en-US')} more in pack volume for a ${next[2]}% sell-back fee.` : 'You are at the top tier.'}</Text>
        <View style={{ marginTop: 8 }}>
          <View style={[styles.tierRow, { paddingVertical: 6 }]}>
            <Caps style={{ flex: 1 }}>Tier</Caps>
            <Caps style={{ flex: 1.2 }}>30-day volume</Caps>
            <Caps style={{ width: 52, textAlign: 'right' }}>Fee</Caps>
          </View>
          {VIP_LEVELS.map(([n, v, f], i) => (
            <View key={n} style={[styles.tierRow, i === 0 && { backgroundColor: colors.control }]}>
              <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }}>
                {n}
                {i === 0 ? <Text style={{ color: colors.accentSoft, fontSize: 12 }}> Current</Text> : null}
              </Text>
              <Text style={[styles.cell, { flex: 1.2 }]}>{v === 0 ? 'No minimum' : `$${v.toLocaleString('en-US')}+`}</Text>
              <Text style={[styles.cell, { width: 52, textAlign: 'right' }]}>{f}%</Text>
            </View>
          ))}
        </View>
        <Text style={[type.small, { fontSize: 12 }]}>Paid pack purchases count toward your volume. Free packs, deposits and refunds don't.</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={[styles.panel, { flex: 1 }]} testID="free-packs">
          <PackArt art={PACKS[0].art} width={40} />
          <Text style={styles.big} testID="free-count">
            {s.freePacks}×
          </Text>
          <Text style={type.small}>Free packs</Text>
          {s.freePacks ? (
            <Button
              label="Open free pack"
              size="sm"
              variant="gold"
              onPress={() => {
                const pulls = openPacks(PACKS[0], 1, { free: true });
                router.push({ pathname: '/open', params: { pack: PACKS[0].id, uids: pulls.map((p) => p.uid).join(',') } });
              }}
              testID="open-free"
            />
          ) : (
            <Text style={[type.small, { fontSize: 12 }]}>Invite a friend to earn one</Text>
          )}
        </View>
        <View style={[styles.panel, { flex: 1 }]}>
          <Icon name="cash" size={26} color={colors.money} />
          <Text style={styles.big}>$0</Text>
          <Text style={type.small}>Referral cash</Text>
          <Text style={[type.small, { fontSize: 12 }]}>$0 earned so far</Text>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={type.h3}>Invite friends</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            ['10%', 'of their fees, for life'],
            ['10%', 'off fees for them'],
            ['Up to 5', 'packs, one per friend'],
          ].map(([a, b]) => (
            <View key={b} style={styles.inviteStat}>
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>{a}</Text>
              <Text style={{ color: colors.muted, fontSize: 11, textAlign: 'center' }}>{b}</Text>
            </View>
          ))}
        </View>
        <Press onPress={() => copy('link')} style={styles.linkRow} accessibilityLabel="Copy invite link" testID="copy-link">
          <Caps style={{ width: 40 }}>Link</Caps>
          <Text style={{ color: colors.text, flex: 1, fontSize: 14 }} numberOfLines={1}>
            {link}
          </Text>
          <Text style={styles.copy}>Copy</Text>
        </Press>
        <Press onPress={() => copy('code')} style={styles.linkRow} accessibilityLabel="Copy invite code" testID="copy-code">
          <Caps style={{ width: 40 }}>Code</Caps>
          <Text style={{ color: colors.text, flex: 1, fontWeight: '700', letterSpacing: 1 }}>{s.handle.toUpperCase()}</Text>
          <Text style={styles.copy}>Copy</Text>
        </Press>
      </View>

      <View style={styles.panel} testID="daily">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={type.h3}>Daily check-in</Text>
          <Text style={{ color: colors.muted, fontSize: 12, fontVariant: ['tabular-nums'] }}>{untilMidnight(now)}</Text>
        </View>
        <Text style={type.small}>Check in seven days in a row to earn a free pack.</Text>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 20 }} testID="streak">
          {streak}-day streak
        </Text>
        <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`Seven-day streak, day ${streak}`}>
          {[1, 2, 3, 4, 5, 6].map((d) => {
            const done = d <= streak;
            const isToday = d === streak + (today ? 0 : 1);
            return (
              <View key={d} style={[styles.day, done && styles.dayDone, isToday && !done && styles.dayToday]}>
                {done ? <Icon name="check" size={15} color="#fff" stroke={3} /> : <Text style={{ color: isToday ? colors.text : colors.muted, fontWeight: '700' }}>{d}</Text>}
              </View>
            );
          })}
          <View style={[styles.day, { borderColor: 'rgba(255,194,75,0.45)' }]}>
            <Icon name="gift" size={16} color={colors.gold} />
          </View>
        </View>
        <Text style={type.small}>{today ? 'Checked in today. Come back tomorrow to keep the streak going.' : 'Check in once a day to build your streak.'}</Text>
        <Button
          label={today ? 'Checked in' : 'Check in'}
          variant="buy"
          disabled={today}
          onPress={() => {
            const earned = checkIn();
            success();
            const st = useSession.getState().s;
            toast(earned ? 'Seven days! A free pack is waiting for you' : `Checked in — ${st?.streak ?? 1}-day streak`);
          }}
          testID="check-in"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32, gap: 14 },
  panel: { gap: 10, padding: 18, borderRadius: radius.lg, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.panelLine },
  vip: { flex: 1, borderRadius: radius.lg, padding: 20, justifyContent: 'space-between', borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  word: { color: 'rgba(245,243,255,0.75)', fontSize: 22, fontWeight: '700', letterSpacing: -0.6 },
  tier: { color: 'rgba(245,243,255,0.55)', fontWeight: '700', letterSpacing: 3, fontSize: 12 },
  rate: { color: 'rgba(245,243,255,0.8)', fontSize: 46, fontWeight: '800', letterSpacing: -1 },
  cap: { color: 'rgba(245,243,255,0.45)', fontWeight: '600', fontSize: 12 },
  holder: { color: 'rgba(245,243,255,0.55)', fontWeight: '700', letterSpacing: 3, fontSize: 13 },
  tag: { color: '#b98d33', fontWeight: '900', fontSize: 18, letterSpacing: 3 },
  stripe: { position: 'absolute', top: 24, left: 0, right: 0, height: 34, backgroundColor: 'rgba(0,0,0,0.45)' },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.surface2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
  tierRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 10, borderRadius: radius.sm },
  cell: { color: colors.label2, fontVariant: ['tabular-nums'], fontWeight: '500' },
  big: { color: colors.text, fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  inviteStat: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 10, paddingHorizontal: 6, borderRadius: radius.md, backgroundColor: colors.surface2 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 46, paddingHorizontal: 12, borderRadius: radius.field, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line },
  copy: { color: colors.accentSoft, fontWeight: '600', fontSize: 14 },
  day: { flex: 1, aspectRatio: 1, maxWidth: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.line },
  dayDone: { backgroundColor: colors.switchOn, borderColor: colors.switchOn },
  dayToday: { borderColor: colors.accentSoft },
});
