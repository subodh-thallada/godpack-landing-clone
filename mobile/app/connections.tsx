// Followers / Following for you or another collector, with Follow buttons.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Avatar, Button, Chip, Empty, Press, Sheet } from '../src/components/ui';
import { USERS, profileOf } from '../src/data';
import { toast } from '../src/lib/toast';
import { isFollowing, toggleFollow, useSession } from '../src/store/session';
import { colors } from '../src/theme';

// A believable follower list for another collector, stable per handle.
function listFor(handle: string, tab: 'followers' | 'following', mine: boolean, me: string | null) {
  const others = USERS.map((u) => u.handle).filter((h) => h !== handle);
  const n = handle.length;
  const base = tab === 'followers' ? others.filter((_, i) => (i + n) % 2 === 0) : others.filter((_, i) => (i + n) % 3 === 0);
  if (tab === 'followers' && mine && me && !base.includes(me)) return [me, ...base];
  return base;
}

export default function Connections() {
  const p = useLocalSearchParams<{ handle?: string; tab?: string }>();
  const s = useSession((x) => x.s);
  const [tab, setTab] = useState<'followers' | 'following'>(p.tab === 'following' ? 'following' : 'followers');
  const self = !p.handle || p.handle === s?.handle;
  const handle = self ? (s?.handle ?? '') : (p.handle ?? '');
  const list = self ? (tab === 'followers' ? (s?.followers ?? []) : (s?.following ?? [])) : listFor(handle, tab, isFollowing(s, handle), s?.handle ?? null);
  return (
    <Sheet title={self ? 'Your connections' : `@${handle}`} testID="connections">
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label="Followers" on={tab === 'followers'} onPress={() => setTab('followers')} testID="conn-followers" />
        <Chip label="Following" on={tab === 'following'} onPress={() => setTab('following')} testID="conn-following" />
      </View>
      {list.length ? (
        list.map((h) => {
          const isMe = h === s?.handle;
          const u = isMe ? { handle: h, color: s?.color ?? colors.primary, vip: 0 } : (profileOf(h) ?? { handle: h, color: '#555', vip: 0 });
          const on = isFollowing(s, h);
          return (
            <View key={h} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} testID="conn-row">
              <Press
                onPress={() => {
                  if (isMe) return;
                  router.back();
                  setTimeout(() => router.push(`/profile/${h}`), 10);
                }}
                accessibilityLabel={`@${h}`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}
              >
                <Avatar handle={h} color={u.color} size={38} />
                <Text style={{ color: colors.text, fontWeight: '700' }}>
                  @{h}
                  {u.vip ? <Text style={{ color: colors.gold, fontSize: 12 }}>  VIP {u.vip}</Text> : null}
                  {isMe ? <Text style={{ color: colors.accentSoft, fontSize: 12 }}>  You</Text> : null}
                </Text>
              </Press>
              {!isMe ? (
                <Button
                  label={on ? 'Following' : 'Follow'}
                  size="sm"
                  variant={on ? 'secondary' : 'primary'}
                  onPress={() => {
                    const now = toggleFollow(h);
                    toast(now ? `Following @${h}` : `Unfollowed @${h}`);
                  }}
                  testID={`conn-follow-${h}`}
                />
              ) : null}
            </View>
          );
        })
      ) : (
        <Empty icon="feed" title={tab === 'followers' ? 'No followers yet' : 'Not following anyone'} body={tab === 'followers' ? 'Collectors who follow you show up here.' : 'Follow collectors from the Feed to see their pulls.'} />
      )}
    </Sheet>
  );
}
