// First-run onboarding, in the website's visual language. A few quick
// questions (each one changes the setup), a short "building your setup"
// moment, the recommended setup, a free welcome pack opened with the
// website's own ceremony, then an account (Apple, Google, email or skip),
// a collector name and a notification primer. No payment anywhere.
// See docs/ONBOARDING.md for the research behind each step.
import { router } from 'expo-router';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInLeft,
  SlideInRight,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { AuthButtons } from '../src/components/AuthButtons';
import { HitCard } from '../src/components/Hits';
import { Icon, Mark } from '../src/components/Icon';
import { PackArt, Thumb } from '../src/components/Thumb';
import { Avatar, Button, Caps, Field, IconButton, Press, Toggle } from '../src/components/ui';
import { cardById, packById, pullsFor } from '../src/data';
import Ceremony from '../src/dom/Ceremony';
import { type Identity, TAKEN, suggestHandle, validHandle } from '../src/lib/auth';
import { money } from '../src/lib/format';
import { bump, tap, warn } from '../src/lib/haptics';
import { requestNotifications, setDailyReminder } from '../src/lib/notifications';
import { GOALS, recommend } from '../src/lib/recommend';
import { toast } from '../src/lib/toast';
import {
  type Experience,
  type Format,
  type Goal,
  type Spend,
  setAnswers,
  setPrefs,
  usePrefs,
} from '../src/store/prefs';
import { signIn, welcomePull } from '../src/store/session';
import { AVATAR_COLORS, COLOR_NAMES, colors, radius, type } from '../src/theme';

type StepId =
  | 'welcome'
  | 'age'
  | 'goals'
  | 'experience'
  | 'format'
  | 'spend'
  | 'building'
  | 'ready'
  | 'pack'
  | 'account'
  | 'profile'
  | 'notify';
const NEW: StepId[] = [
  'welcome',
  'age',
  'goals',
  'experience',
  'format',
  'spend',
  'building',
  'ready',
  'pack',
  'account',
  'profile',
  'notify',
];
const RETURNING: StepId[] = ['welcome', 'age', 'account', 'notify'];
const CEREMONY_PACKS = ['arena', 'master', 'starter', 'trainer'];

export default function Onboarding() {
  const saved = usePrefs.getState();
  const blocked = usePrefs((p) => p.blocked);
  const draft = usePrefs((p) => p.draft);
  const [mode, setMode] = useState<'new' | 'returning'>('new');
  const steps = mode === 'new' ? NEW : RETURNING;
  // Resume where you left off. The setup animation replays from its start,
  // and the name step needs an account, so without one resume at sign-in.
  const [index, setIndex] = useState(() => {
    let i = Math.min(saved.step, NEW.length - 1);
    if (NEW[i] === 'building') i += 1;
    if ((NEW[i] === 'profile' || NEW[i] === 'notify') && !saved.draft) i = NEW.indexOf('account');
    return i;
  });
  const [dir, setDir] = useState<1 | -1>(1);
  const moved = useRef(false);
  const insets = useSafeAreaInsets();
  const step = steps[index];

  useEffect(() => {
    if (mode === 'new') setPrefs({ step: index });
  }, [index, mode]);

  const goTo = (to: number) => {
    moved.current = true;
    setDir(to > index ? 1 : -1);
    setIndex(Math.max(0, Math.min(steps.length - 1, to)));
  };
  const next = () => goTo(index + 1);
  const back = () => {
    if (index === 1 && mode === 'returning') setMode('new');
    // The setup animation moves on by itself, so going back skips over it.
    let to = index - 1;
    if (steps[to] === 'building') to -= 1;
    goTo(to);
  };

  const finish = (notifications: 'on' | 'off') => {
    const p = usePrefs.getState();
    const d = p.draft;
    const handle = d?.handle || suggestHandle(d?.name ?? '', d?.email);
    signIn(
      {
        handle,
        name: d?.name || handle,
        color: d?.color ?? AVATAR_COLORS[0],
        provider: d?.provider ?? 'guest',
        email: d?.email,
      },
      mode === 'new' ? p.welcome : null,
    );
    // Safe mode and the reminder were already set on the setup screen.
    setPrefs({
      onboarded: true,
      tourRequested: true,
      tourDone: false,
      step: 0,
      pack: recommend(p.answers).packIndex,
      notifications,
      welcome: null,
      draft: null,
    });
    router.replace('/packs');
  };

  let body: ReactNode;
  if (blocked) body = <TooYoung />;
  else if (step === 'welcome')
    body = (
      <Welcome
        onStart={() => {
          moved.current = true;
          setMode('new');
          setDir(1);
          setIndex(1);
        }}
        onReturning={() => {
          moved.current = true;
          setMode('returning');
          setDir(1);
          setIndex(1);
        }}
      />
    );
  else if (step === 'age')
    body = (
      <Age
        onYes={() => {
          setAnswers({ adult: true });
          next();
        }}
        onNo={() => {
          warn();
          setPrefs({ blocked: true });
        }}
      />
    );
  else if (step === 'goals') body = <Goals onNext={next} />;
  else if (step === 'experience') body = <ExperienceStep onNext={next} />;
  else if (step === 'format') body = <FormatStep onNext={next} />;
  else if (step === 'spend') body = <SpendStep onNext={next} />;
  else if (step === 'building') body = <Building onDone={next} />;
  else if (step === 'ready') body = <Ready onNext={next} />;
  else if (step === 'pack') body = <WelcomePack onNext={next} onBack={back} />;
  else if (step === 'account')
    body = (
      <Account
        returning={mode === 'returning'}
        onIdentity={(id: Identity) => {
          setPrefs({
            draft: { ...id, handle: suggestHandle(id.name, id.email), color: draft?.color ?? AVATAR_COLORS[0] },
          });
          bump('medium');
          next();
        }}
      />
    );
  else if (step === 'profile') body = <ProfileStep onNext={next} />;
  else body = <Notify onDone={finish} />;

  // The welcome screen and the ceremony fill the screen; other steps share the header.
  const chrome = !blocked && step !== 'welcome' && step !== 'pack';
  const progress = steps.length > 1 ? index / (steps.length - 1) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="onboarding">
      {chrome ? (
        <View style={[styles.top, { paddingTop: insets.top + 6 }]}>
          <IconButton name="chevronLeft" label="Back" testID="ob-back" onPress={back} />
          <ProgressBar value={progress} />
          <Text style={styles.count} testID="ob-count">
            {index}/{steps.length - 1}
          </Text>
        </View>
      ) : null}
      <Animated.View
        key={blocked ? 'young' : step}
        entering={
          !moved.current
            ? undefined
            : dir > 0
              ? SlideInRight.duration(280).easing(Easing.out(Easing.cubic))
              : SlideInLeft.duration(280).easing(Easing.out(Easing.cubic))
        }
        exiting={FadeOut.duration(100)}
        style={{ flex: 1 }}
        testID={`ob-step-${blocked ? 'too-young' : step}`}
      >
        {body}
      </Animated.View>
    </View>
  );
}

// Starts partly filled (people are likelier to finish something already under way).
function ProgressBar({ value }: { value: number }) {
  const w = useSharedValue(0.12);
  useEffect(() => {
    w.value = withTiming(0.12 + 0.88 * value, { duration: 380, easing: Easing.out(Easing.cubic) });
  }, [value, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View
      style={styles.bar}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round((0.12 + 0.88 * value) * 100) }}
    >
      <Animated.View style={[styles.barFill, fill]} />
    </View>
  );
}

function Frame({
  title,
  sub,
  children,
  footer,
  center,
}: {
  title: string;
  sub?: string;
  children?: ReactNode;
  footer?: ReactNode;
  center?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={[styles.frame, center && { flexGrow: 1, justifyContent: 'center' }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={{ gap: 8 }}>
          <Text style={type.title} accessibilityRole="header">
            {title}
          </Text>
          {sub ? <Text style={styles.sub}>{sub}</Text> : null}
        </View>
        {children}
      </ScrollView>
      {footer ? <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}

// A grouped list (one panel, hairline rows) of choices.
function Choices({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

function Choice({
  title,
  sub,
  on,
  onPress,
  testID,
  multi,
  visual,
  last,
}: {
  title: string;
  sub?: string;
  on: boolean;
  onPress: () => void;
  testID: string;
  multi?: boolean;
  visual?: ReactNode;
  last?: boolean;
}) {
  return (
    <Press
      testID={testID}
      onPress={onPress}
      scaleTo={1}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: on }}
      accessibilityLabel={sub ? `${title}. ${sub}` : title}
      style={[styles.choice, !last && styles.choiceRule, on && { backgroundColor: colors.control }]}
    >
      {visual}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.choiceTitle}>{title}</Text>
        {sub ? <Text style={styles.choiceSub}>{sub}</Text> : null}
      </View>
      <View style={[multi ? styles.box : styles.radio, on && styles.markOn]}>
        {on ? <Icon name="check" size={13} color="#fff" stroke={3} /> : null}
      </View>
    </Press>
  );
}

// Single-choice questions move on by themselves a moment after a tap.
function useAutoNext(onNext: () => void) {
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef(onNext);
  latest.current = onNext;
  useEffect(() => () => clearTimeout(t.current), []);
  return () => {
    clearTimeout(t.current);
    t.current = setTimeout(() => latest.current(), 260);
  };
}

// ---- 1. Welcome ----

function Floating({
  art,
  left,
  top,
  width,
  rot,
  delay,
}: {
  art: string;
  left: number;
  top: number;
  width: number;
  rot: number;
  delay: number;
}) {
  const v = useSharedValue(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!reduced)
      v.value = withDelay(
        delay,
        withRepeat(withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }), -1, true),
      );
    return () => cancelAnimation(v);
  }, [v, delay, reduced]);
  const s = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(v.value, [0, 1], [0, -8]) }, { rotate: `${rot}deg` }],
  }));
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(500)} style={{ position: 'absolute', left, top }}>
      <Animated.View style={s}>
        <PackArt art={art} width={width} large />
      </Animated.View>
    </Animated.View>
  );
}

function Welcome({ onStart, onReturning }: { onStart: () => void; onReturning: () => void }) {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  // Taller phones also get a strip of real recent pulls under the copy.
  const showHits = H >= 760;
  const stage = Math.min(H * (showHits ? 0.33 : 0.38), 320);
  const pw = Math.min(W * 0.3, stage * 0.5, 150);
  const hits = useMemo(() => pullsFor(packById('master'), 8, 40), []);
  return (
    <View style={{ flex: 1 }}>
      <View style={{ height: stage + insets.top }}>
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
          <Defs>
            <RadialGradient id="welcomeGlow" cx="50%" cy="58%" rx="62%" ry="58%">
              <Stop offset="0" stopColor="#d8d3e3" stopOpacity={0.24} />
              <Stop offset="0.7" stopColor="#d8d3e3" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx="50%" cy="58%" rx="62%" ry="58%" fill="url(#welcomeGlow)" />
        </Svg>
        <View
          style={{
            position: 'absolute',
            top: insets.top + 14,
            left: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Mark size={26} />
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', letterSpacing: -0.6 }}>godpack</Text>
        </View>
        <Floating
          art="arena"
          left={W * 0.5 - pw * 1.3}
          top={insets.top + stage * 0.3}
          width={pw * 0.85}
          rot={-12}
          delay={120}
        />
        <Floating
          art="trainer"
          left={W * 0.5 + pw * 0.45}
          top={insets.top + stage * 0.3}
          width={pw * 0.85}
          rot={12}
          delay={240}
        />
        <Floating art="master" left={W * 0.5 - pw / 2} top={insets.top + stage * 0.18} width={pw} rot={0} delay={0} />
      </View>
      <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: insets.bottom + 16, gap: 18 }}>
        <Animated.View entering={FadeInDown.delay(180).duration(420)} style={{ gap: 10, paddingHorizontal: 20 }}>
          <Text style={[type.title, { fontSize: 34, lineHeight: 38 }]} accessibilityRole="header">
            Open packs.{'\n'}Pull graded cards.
          </Text>
          <Text style={styles.sub}>
            Odds before every pack, instant sell-back, and shipping for the cards you keep. This is an unofficial demo —
            balances are pretend credit.
          </Text>
        </Animated.View>
        {showHits ? (
          <Animated.View entering={FadeIn.delay(320).duration(420)}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}
              accessibilityLabel="Recent pulls"
            >
              {hits.slice(0, 6).map((h) => (
                <View key={h.uid} pointerEvents="none">
                  <HitCard hit={h} />
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        ) : null}
        <Animated.View entering={FadeInDown.delay(420).duration(420)} style={{ gap: 4, paddingHorizontal: 20 }}>
          <Button label="Get started" variant="buy" onPress={onStart} testID="ob-start" />
          <Press onPress={onReturning} testID="ob-have-account" style={{ alignSelf: 'center', padding: 12 }}>
            <Text style={{ color: colors.label2, fontWeight: '500', fontSize: 15 }}>
              Already have an account? <Text style={{ color: colors.accentSoft, fontWeight: '600' }}>Log in</Text>
            </Text>
          </Press>
        </Animated.View>
      </View>
    </View>
  );
}

// ---- 2. Age ----

function Age({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  return (
    <Frame
      title="Are you 18 or older?"
      sub="Godpack is for adults. This demo has no real money, but it keeps the same rule."
      footer={
        <View style={{ gap: 6 }}>
          <Button label="Yes, I'm 18 or older" variant="buy" onPress={onYes} testID="ob-age-yes" />
          <Button label="No, I'm under 18" variant="ghost" onPress={onNo} testID="ob-age-no" />
        </View>
      }
    />
  );
}

function TooYoung() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.frame, { flex: 1, justifyContent: 'center', paddingTop: insets.top + 20 }]}>
      <Text style={type.title} accessibilityRole="header">
        Godpack is for adults
      </Text>
      <Text style={styles.sub}>
        You need to be 18 or older to use the app, so we can't set up an account for you. Thanks for stopping by.
      </Text>
    </View>
  );
}

// ---- 3. Goals ----

function Goals({ onNext }: { onNext: () => void }) {
  const goals = usePrefs((p) => p.answers.goals);
  const toggle = (g: Goal) => setAnswers({ goals: goals.includes(g) ? goals.filter((x) => x !== g) : [...goals, g] });
  return (
    <Frame
      title="What brings you here?"
      sub="Pick everything that fits. We'll set things up around it."
      footer={
        <Button
          label={goals.length ? 'Continue' : 'Pick at least one'}
          variant="buy"
          disabled={!goals.length}
          onPress={onNext}
          testID="ob-continue"
        />
      }
    >
      <Choices>
        {GOALS.map((g, i) => (
          <Choice
            key={g.id}
            multi
            title={g.title}
            sub={g.sub}
            on={goals.includes(g.id)}
            onPress={() => toggle(g.id)}
            testID={`opt-${g.id}`}
            last={i === GOALS.length - 1}
          />
        ))}
      </Choices>
      {goals.length ? (
        <Text style={styles.hint} testID="ob-picked">
          {goals.length} picked
        </Text>
      ) : null}
    </Frame>
  );
}

// ---- 4. Experience ----

function ExperienceStep({ onNext }: { onNext: () => void }) {
  const value = usePrefs((p) => p.answers.experience);
  const auto = useAutoNext(onNext);
  const pick = (v: Experience) => {
    setAnswers({ experience: v });
    auto();
  };
  const opts: [Experience, string, string][] = [
    ['new', "I'm new to this", "We'll explain things as you go"],
    ['casual', "I've opened a few", 'You know the basics'],
    ['serious', 'I open packs a lot', 'Skip the hand-holding'],
  ];
  return (
    <Frame
      title="How much have you opened before?"
      sub="This changes how much we explain, and whether Safe mode starts on."
    >
      <Choices>
        {opts.map(([id, t, s], i) => (
          <Choice
            key={id}
            title={t}
            sub={s}
            on={value === id}
            onPress={() => pick(id)}
            testID={`opt-${id}`}
            last={i === opts.length - 1}
          />
        ))}
      </Choices>
    </Frame>
  );
}

// ---- 5. Format ----

function FormatStep({ onNext }: { onNext: () => void }) {
  const value = usePrefs((p) => p.answers.format);
  const auto = useAutoNext(onNext);
  const pick = (v: Format) => {
    setAnswers({ format: v });
    auto();
  };
  const visual = (kind: Format) => (
    <View style={{ width: 48, height: 58, alignItems: 'center', justifyContent: 'center' }}>
      {kind === 'raw' ? <Thumb id="frost-halo" width={40} glow={false} /> : null}
      {kind === 'graded' ? <Thumb id="aurora-peaks" graded width={34} glow={false} /> : null}
      {kind === 'both' ? (
        <View style={{ width: 48, height: 58 }}>
          <Thumb id="frost-halo" width={30} glow={false} style={{ position: 'absolute', left: 0, top: 8 }} />
          <Thumb id="aurora-peaks" graded width={27} glow={false} style={{ position: 'absolute', right: 0, top: 2 }} />
        </View>
      ) : null}
    </View>
  );
  return (
    <Frame
      title="What do you want to pull?"
      sub="Raw cards come in cheaper packs. Graded slabs are already graded and sealed."
    >
      <Choices>
        <Choice
          visual={visual('raw')}
          title="Raw cards"
          sub="Packs from $1"
          on={value === 'raw'}
          onPress={() => pick('raw')}
          testID="opt-raw"
        />
        <Choice
          visual={visual('graded')}
          title="Graded slabs"
          sub="Packs from $25"
          on={value === 'graded'}
          onPress={() => pick('graded')}
          testID="opt-graded"
        />
        <Choice
          visual={visual('both')}
          title="Both"
          sub="Show me everything"
          on={value === 'both'}
          onPress={() => pick('both')}
          testID="opt-both"
          last
        />
      </Choices>
    </Frame>
  );
}

// ---- 6. Comfortable spend ----

function SpendStep({ onNext }: { onNext: () => void }) {
  const value = usePrefs((p) => p.answers.spend);
  const auto = useAutoNext(onNext);
  const pick = (v: Spend) => {
    setAnswers({ spend: v });
    auto();
  };
  const opts: [Spend, string, string][] = [
    ['look', 'Just looking', 'Browse and open the free pack'],
    ['low', 'Under $10', 'Starter packs and small battles'],
    ['mid', '$10 – $50', 'Trainer and Arena packs'],
    ['high', '$50 or more', 'Master packs and big battles'],
  ];
  return (
    <Frame
      title="What feels comfortable per session?"
      sub="This only tunes your recommendations and a spending reminder. You won't be asked to pay anything."
    >
      <Choices>
        {opts.map(([id, t, s], i) => (
          <Choice
            key={id}
            title={t}
            sub={s}
            on={value === id}
            onPress={() => pick(id)}
            testID={`opt-${id}`}
            last={i === opts.length - 1}
          />
        ))}
      </Choices>
      <Text style={styles.hint}>Demo credit only. Nothing in this app costs real money.</Text>
    </Frame>
  );
}

// ---- 7. Building your setup ----

function Building({ onDone }: { onDone: () => void }) {
  const answers = usePrefs((p) => p.answers);
  const setup = useMemo(() => recommend(answers), [answers]);
  const items = [
    `Matching packs to your goals`,
    setup.safe ? 'Turning on Safe mode' : 'Setting up full odds',
    'Adding your free welcome pack',
  ];
  const [pct, setPct] = useState(0);
  const reduced = useReducedMotion();
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const total = reduced ? 300 : 2100;
    const t0 = Date.now();
    let finish: ReturnType<typeof setTimeout> | undefined;
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / total);
      setPct(p);
      if (p >= 1) {
        clearInterval(id);
        bump('light');
        // Start the setup screen from the recommendation; it can be changed there.
        setPrefs({ safe: setup.safe, limit: setup.limit });
        finish = setTimeout(() => done.current(), 350);
      }
    }, 40);
    return () => {
      clearInterval(id);
      clearTimeout(finish);
    };
  }, [reduced, setup.safe, setup.limit]);
  return (
    <Frame title="Building your setup…" sub="Using what you told us." center>
      <View style={{ alignItems: 'center', marginVertical: 8 }}>
        <PackArt art={setup.pack.art} width={110} large />
      </View>
      <View style={styles.track}>
        <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
      </View>
      <View style={{ gap: 14 }}>
        {items.map((t, i) => {
          const on = pct >= (i + 1) / items.length - 0.02;
          return (
            <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.radio, on && styles.markOn]}>
                {on ? <Icon name="check" size={13} color="#fff" stroke={3} /> : null}
              </View>
              <Text style={{ color: on ? colors.text : colors.muted, fontSize: 16, fontWeight: '500' }}>{t}</Text>
            </View>
          );
        })}
      </View>
    </Frame>
  );
}

// ---- 8. Your setup is ready ----

function Ready({ onNext }: { onNext: () => void }) {
  const answers = usePrefs((p) => p.answers);
  const setup = useMemo(() => recommend(answers), [answers]);
  const safe = usePrefs((p) => p.safe);
  const limit = usePrefs((p) => p.limit);
  const p = setup.pack;
  const range = safe ? p.safeRange : p.range;
  return (
    <Frame
      title="Your setup is ready"
      sub="Here's where we'd start. You can change any of it later."
      footer={
        <View style={{ gap: 8 }}>
          <Button label="Open your free welcome pack" variant="buy" onPress={onNext} testID="ob-continue" />
          <Text style={[type.small, { textAlign: 'center' }]}>Free, and guaranteed to be a hit or better</Text>
        </View>
      }
    >
      <View style={styles.panel} testID="ob-recommended">
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <PackArt art={p.art} width={70} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={type.h2} testID="ob-recommended-name">
              {p.name}
            </Text>
            <Text style={{ color: colors.label2, fontWeight: '500', fontSize: 14 }}>
              {p.slabs ? 'Graded slabs' : 'Raw cards'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 3 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
              {money(p.price, { compact: true })}
            </Text>
            <Text style={{ color: colors.accentSoft, fontSize: 13, fontWeight: '500' }}>up to {p.mult}×</Text>
          </View>
        </View>
        <View style={styles.range}>
          <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '500' }}>Value range per pack</Text>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {money(range[0])} – {money(range[1])}
          </Text>
        </View>
      </View>
      <View style={styles.group}>
        <View style={[styles.choice, styles.choiceRule]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.choiceTitle}>Safe mode</Text>
            <Text style={styles.choiceSub}>Raises the floor, same top prizes</Text>
          </View>
          <Toggle value={safe} onChange={(v) => setPrefs({ safe: v })} label="Safe mode" testID="ob-safe" />
        </View>
        <View style={styles.choice}>
          <View style={{ flex: 1 }}>
            <Text style={styles.choiceTitle}>Daily spending reminder</Text>
            <Text style={styles.choiceSub}>
              {limit != null ? `A nudge after ${money(limit, { compact: true })} in a day` : 'Off'}
            </Text>
          </View>
          <Toggle
            value={limit != null}
            onChange={(v) => setPrefs({ limit: v ? (setup.limit ?? 50) : null })}
            label="Daily spending reminder"
            testID="ob-reminder"
          />
        </View>
      </View>
      <View style={{ gap: 10 }}>
        {setup.reasons.slice(0, 3).map((r) => (
          <View key={r} style={{ flexDirection: 'row', gap: 10 }}>
            <Icon name="check" size={16} color={colors.money} stroke={2.4} />
            <Text style={{ color: colors.label2, fontSize: 14, lineHeight: 20, flex: 1 }}>{r}</Text>
          </View>
        ))}
      </View>
    </Frame>
  );
}

// ---- 9. Free welcome pack — the website's ceremony ----

function WelcomePack({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const stored = usePrefs((p) => p.welcome);
  const [pull] = useState(() => stored ?? welcomePull());
  const insets = useSafeAreaInsets();
  const kept = useRef(false);
  useEffect(() => {
    if (!stored) setPrefs({ welcome: pull });
  }, [stored, pull]);
  const card = cardById(pull.id);
  const pack = packById(pull.pack);
  return (
    <View
      style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top, paddingBottom: insets.bottom }}
      testID="welcome-reveal"
    >
      <Ceremony
        pack={Math.max(0, CEREMONY_PACKS.indexOf(pack.art))}
        card={{ id: card.id, name: card.name, value: pull.value, tier: pull.tier }}
        actions={[{ label: 'Save it to my Vault', primary: true }]}
        onAction={async () => {
          kept.current = true;
        }}
        onClose={async () => (kept.current ? onNext() : onBack())}
        dom={{
          style: { flex: 1, backgroundColor: '#000' },
          containerStyle: { flex: 1 },
          scrollEnabled: false,
          bounces: false,
        }}
      />
    </View>
  );
}

// ---- 10. Account ----

function Account({ returning, onIdentity }: { returning: boolean; onIdentity: (id: Identity) => void }) {
  const welcome = usePrefs((p) => p.welcome);
  const card = welcome ? cardById(welcome.id) : null;
  return (
    <Frame
      title={returning ? 'Welcome back' : 'Save your pull'}
      sub={
        returning
          ? 'Log in to pick up where you left off.'
          : 'Create a free account so your card and your setup are kept. No payment needed.'
      }
    >
      {card && welcome && !returning ? (
        <View style={styles.saved}>
          <Thumb id={card.id} tier={welcome.tier} width={42} />
          <View style={{ flex: 1 }}>
            <Text style={styles.choiceTitle}>{card.name}</Text>
            <Text style={{ color: colors.money, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {money(welcome.value)}
            </Text>
          </View>
          <Text style={{ color: colors.gold, fontWeight: '600', fontSize: 12 }}>Not saved yet</Text>
        </View>
      ) : null}
      <AuthButtons onIdentity={onIdentity} allowSkip={!returning} />
      <Text style={[type.small, { textAlign: 'center' }]}>
        By continuing you agree to the demo's terms and privacy notice. Accounts and cards stay on this device.
      </Text>
    </Frame>
  );
}

// ---- 11. Collector name ----

function ProfileStep({ onNext }: { onNext: () => void }) {
  const draft = usePrefs((p) => p.draft);
  const [handle, setHandle] = useState(draft?.handle ?? '');
  const color = draft?.color ?? AVATAR_COLORS[0];
  const clean = handle.toLowerCase();
  const error = !clean
    ? null
    : !validHandle(clean)
      ? 'Use 3–16 letters, numbers or _'
      : TAKEN.has(clean)
        ? 'That name is taken'
        : null;
  const ok = !!clean && !error;
  const signedWith = draft ? { apple: 'Apple', google: 'Google', email: 'email', guest: '' }[draft.provider] : '';
  const save = (patch: Partial<NonNullable<typeof draft>>) => draft && setPrefs({ draft: { ...draft, ...patch } });
  return (
    <Frame
      title="Pick your collector name"
      sub="It's how other collectors see you in the feed, battles and chat."
      footer={
        <Button
          label="Continue"
          variant="buy"
          disabled={!ok}
          onPress={() => {
            save({ handle: clean });
            onNext();
          }}
          testID="ob-continue"
        />
      }
    >
      {signedWith ? (
        <Text style={styles.hint} testID="ob-signed-with">
          Signed in with {signedWith}
          {draft?.demo ? ' (demo, on this device)' : ''}
          {draft?.email ? ` · ${draft.email}` : ''}
        </Text>
      ) : null}
      <View style={{ alignItems: 'center', gap: 8, marginVertical: 4 }}>
        <Avatar handle={clean || '?'} color={color} size={76} />
        <Text style={{ color: colors.label2, fontSize: 16, fontWeight: '600' }}>@{clean || 'yourname'}</Text>
      </View>
      <Field
        label="Collector name"
        value={handle}
        onChangeText={(t) => setHandle(t.replace(/\s+/g, '_').toLowerCase())}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={16}
        error={error}
        placeholder="yourname"
        testID="ob-handle"
      />
      <View style={{ gap: 10 }}>
        <Caps>Avatar colour</Caps>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {AVATAR_COLORS.map((c) => (
            <Press
              key={c}
              accessibilityRole="radio"
              accessibilityState={{ checked: c === color }}
              accessibilityLabel={COLOR_NAMES[c]}
              onPress={() => {
                tap();
                save({ color: c });
              }}
              testID={`ob-color-${c.slice(1)}`}
              scaleTo={0.92}
              style={[styles.swatch, { backgroundColor: c }, c === color && styles.swatchOn]}
            >
              {c === color ? <Icon name="check" size={15} color="#fff" stroke={3} /> : null}
            </Press>
          ))}
        </View>
      </View>
    </Frame>
  );
}

// ---- 12. Notifications ----

function Notify({ onDone }: { onDone: (n: 'on' | 'off') => void }) {
  const [busy, setBusy] = useState(false);
  const samples: [string, string, string][] = [
    ['Frost Halo shipped', 'Tracking DEMO482193774', 'now'],
    ['@emberkid joined your battle', 'Tap to watch the replay', '2m ago'],
    ['Your daily check-in is ready', 'Day 4 of 7 — keep the streak going', '7:00 PM'],
  ];
  const turnOn = async () => {
    setBusy(true);
    const granted = await requestNotifications();
    if (granted) await setDailyReminder(true);
    else toast('Notifications are off. You can turn them on in Settings.', 'warn');
    setBusy(false);
    onDone(granted ? 'on' : 'off');
  };
  return (
    <Frame
      title="Never miss a pull"
      sub="Shipping updates, battle results and one daily check-in reminder. You can change this any time."
      footer={
        <View style={{ gap: 6 }}>
          <Button label="Turn on notifications" variant="buy" onPress={turnOn} loading={busy} testID="ob-notify-on" />
          <Button label="Not now" variant="ghost" onPress={() => onDone('off')} testID="ob-notify-later" />
        </View>
      }
    >
      <View style={{ gap: 8, marginTop: 4 }}>
        {samples.map(([t, b, when], i) => (
          <Animated.View key={t} entering={FadeInDown.delay(100 + i * 120).duration(320)} style={styles.notif}>
            <Mark size={30} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14, flex: 1 }} numberOfLines={1}>
                  {t}
                </Text>
                <Text style={{ color: colors.faint, fontSize: 12 }}>{when}</Text>
              </View>
              <Text style={{ color: colors.label2, fontSize: 13 }} numberOfLines={1}>
                {b}
              </Text>
            </View>
          </Animated.View>
        ))}
      </View>
    </Frame>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingBottom: 4 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2, backgroundColor: colors.primary },
  track: { height: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' },
  count: {
    color: colors.faint,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'right',
    paddingRight: 8,
  },
  frame: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24, gap: 20 },
  sub: { color: colors.muted, fontSize: 16, lineHeight: 23, fontWeight: '500' },
  hint: { color: colors.muted, fontSize: 13, fontWeight: '500' },
  footer: { paddingHorizontal: 20, paddingTop: 10 },
  group: {
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelLine,
    overflow: 'hidden',
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  choiceRule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.panelLine },
  choiceTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  choiceSub: { color: colors.muted, fontSize: 13.5, fontWeight: '500' },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.fieldLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.fieldLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  panel: {
    gap: 14,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelLine,
  },
  range: { gap: 2, padding: 12, borderRadius: 12, backgroundColor: colors.surface2 },
  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  swatch: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  swatchOn: { borderWidth: 3, borderColor: '#fff' },
  notif: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
