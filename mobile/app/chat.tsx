// Global chat: the seeded conversation plus everything posted while you're
// here (yours included). Shared pulls show as small cards.
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View, type TextStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { riseIn } from '../src/lib/motion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../src/components/Icon';
import { Thumb } from '../src/components/Thumb';
import { Avatar, IconButton, Press } from '../src/components/ui';
import { CHAT, cardById, user } from '../src/data';
import { money, since } from '../src/lib/format';
import { tap } from '../src/lib/haptics';
import { type ChatMsg, markChatSeen, postChat, useSession } from '../src/store/session';
import { colors, type } from '../src/theme';

export default function Chat() {
  const s = useSession((x) => x.s);
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const list = useRef<FlatList<ChatMsg>>(null);
  const [opened] = useState(() => Date.now());
  const messages = useMemo<ChatMsg[]>(() => {
    const seeded = CHAT.map((m) => ({ u: m.u, t: m.t, at: opened - m.m * 60000 }));
    return [...seeded, ...(s?.chat ?? [])];
  }, [s?.chat, opened]);

  useEffect(() => {
    markChatSeen();
    return () => markChatSeen();
  }, []);
  useEffect(() => {
    const t = setTimeout(() => list.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [messages.length]);

  const send = () => {
    const t = text.trim();
    if (!t || !s) return;
    tap();
    postChat({ u: s.handle, t: t.slice(0, 200), mine: true });
    setText('');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }} testID="screen-chat">
      <View style={[styles.head, { paddingTop: insets.top + 6 }]}>
        <IconButton name="chevronLeft" label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/feed'))} testID="back" />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={type.h3}>Global chat</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={styles.online} />
            <Text style={{ color: colors.muted, fontSize: 12 }}>214 online · be kind</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        ref={list}
        data={messages}
        keyExtractor={(m, i) => `${m.at}-${i}`}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item: m }) => <Bubble m={m} me={s?.handle ?? ''} myColor={s?.color ?? colors.primary} />}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
      />
      <View style={[styles.composer, { paddingBottom: insets.bottom + 10 }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Say something nice"
          placeholderTextColor={colors.faint}
          style={styles.input}
          onSubmitEditing={send}
          returnKeyType="send"
          maxLength={200}
          accessibilityLabel="Message"
          testID="chat-input"
        />
        <Press onPress={send} disabled={!text.trim()} accessibilityLabel="Send message" style={[styles.send, !text.trim() && { opacity: 0.4 }]} testID="chat-send" scaleTo={0.9}>
          <Icon name="send" size={20} color="#fff" stroke={2.4} />
        </Press>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ m, me, myColor }: { m: ChatMsg; me: string; myColor: string }) {
  const mine = m.mine || m.u === me;
  const u = mine ? { handle: me, color: myColor } : user(m.u);
  const card = m.share ? cardById(m.share.card) : null;
  return (
    // Only a message that just arrived slides in; older ones are simply there
    // (the list recycles rows, so an entrance would replay on scroll).
    <Animated.View entering={Date.now() - m.at < 2000 ? riseIn : undefined} style={[styles.msg, mine && { flexDirection: 'row-reverse' }]} testID={mine ? 'my-message' : 'message'}>
      <Avatar handle={u.handle} color={u.color} size={30} />
      <View style={{ maxWidth: '78%', gap: 3, alignItems: mine ? 'flex-end' : 'flex-start' }}>
        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '600' }}>
          {mine ? 'You' : `@${u.handle}`} · {since(m.at)}
        </Text>
        {card && m.share ? (
          <View style={[styles.bubble, styles.shareCard, mine && styles.mine]}>
            <Thumb id={card.id} graded={m.share.pack === 'arena' || m.share.pack === 'master'} tier={m.share.tier} width={40} />
            <View>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{card.name}</Text>
              <Text style={{ color: colors.money, fontWeight: '800' }}>{money(m.share.value)}</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.bubble, mine && styles.mine]}>
            <Text style={[{ color: colors.text, fontSize: 15 }, breakAnywhere]}>{m.t}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

// A pasted link or a long compound word has no spaces to wrap at; on the web
// let it break mid-word rather than run out of the bubble (native already does).
const breakAnywhere = Platform.OS === 'web' ? ({ wordBreak: 'break-word', overflowWrap: 'anywhere' } as unknown as TextStyle) : null;

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  online: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.online },
  msg: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
  mine: { backgroundColor: 'rgba(121,84,237,0.3)', borderColor: 'rgba(157,133,255,0.4)' },
  shareCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  composer: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.bg },
  input: { flex: 1, height: 46, borderRadius: 23, paddingHorizontal: 16, backgroundColor: colors.surface2, color: colors.text, fontSize: 16, borderWidth: 1, borderColor: colors.line },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
