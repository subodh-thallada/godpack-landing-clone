// A collector row with a Follow / Following button.
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { profileOf } from '../data';
import { toast } from '../lib/toast';
import { isFollowing, toggleFollow, useSession } from '../store/session';
import { colors, radius } from '../theme';
import { Avatar, Button, Press } from './ui';

export function FollowRow({ handle }: { handle: string }) {
  const s = useSession((x) => x.s);
  const p = profileOf(handle);
  const on = isFollowing(s, handle);
  if (!p) return null;
  return (
    <View style={styles.row} testID={`follow-row-${handle}`}>
      <Press onPress={() => router.push(`/profile/${handle}`)} accessibilityLabel={`View @${handle}'s profile`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
        <Avatar handle={handle} color={p.color} size={38} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>
            @{handle} {p.vip ? <Text style={{ color: colors.gold, fontSize: 11 }}> VIP {p.vip}</Text> : null}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
            {p.bio}
          </Text>
        </View>
      </Press>
      <Button
        label={on ? 'Following' : 'Follow'}
        size="sm"
        variant={on ? 'secondary' : 'primary'}
        onPress={() => {
          const now = toggleFollow(handle);
          toast(now ? `Following @${handle}` : `Unfollowed @${handle}`);
        }}
        testID={`follow-${handle}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.lg, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
});
