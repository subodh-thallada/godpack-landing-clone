// First-run onboarding as one continuous scene. The logo lights up and drops
// into a sealed pack that stays on stage the whole way, reacting to every
// answer, while Pip (the logo's hexagon, given a face) comments on what you
// pick. You tear the pack open with the website's ceremony, and the card you
// pulled travels with you through sign-up: over the sign-up sheet, as the
// icon of the email-code steps, tucked behind your new avatar, and in the
// lock-screen preview. Then the stage irises open into the app as the card
// drops into your Vault.
// No payment anywhere. See docs/ONBOARDING.md for the research behind it.
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthButtons } from '../src/components/AuthButtons';
import { playCurtain } from '../src/components/Curtain';
import { Icon, type IconName, Mark } from '../src/components/Icon';
import { Thumb } from '../src/components/Thumb';
import { Button, Caps, Field, IconButton, Press, Toggle } from '../src/components/ui';
import { cardById } from '../src/data';
import Ceremony from '../src/dom/Ceremony';
import { type Identity, TAKEN, suggestHandle, validEmail, validHandle } from '../src/lib/auth';
import { money } from '../src/lib/format';
import { bump, success, tap, warn } from '../src/lib/haptics';
import { DUR, EASE_OUT, SETTLE, bannerIn, bannerOut, enterBack, enterFwd, exitBack, exitFwd, fadeIn, fadeOut, dropIn, dropInLate, staggered } from '../src/lib/motion';
import { requestNotifications, setDailyReminder } from '../src/lib/notifications';
import { GOALS, SPEND_LIMIT, recommend } from '../src/lib/recommend';
import { toast } from '../src/lib/toast';
import { AuthSheet } from '../src/onboarding/AuthSheet';
import { Bubble } from '../src/onboarding/Bubble';
import { CODE_LENGTH, CodeInput } from '../src/onboarding/CodeInput';
import { Intro } from '../src/onboarding/Intro';
import { Mascot, type Mood } from '../src/onboarding/Mascot';
import { SpendSlider } from '../src/onboarding/SpendSlider';
import { type Pose, Stage, geometry, heroBottom } from '../src/onboarding/Stage';
import { type Experience, type Format, type Goal, type Spend, setAnswers, setPrefs, usePrefs } from '../src/store/prefs';
import { signIn, welcomePull } from '../src/store/session';
import { AVATAR_COLORS, COLOR_NAMES, colors, radius, tierColor, type } from '../src/theme';

type StepId = 'welcome' | 'age' | 'goals' | 'format' | 'spend' | 'experience' | 'seal' | 'tear' | 'claim' | 'email' | 'code' | 'name' | 'notify';
const NEW: StepId[] = ['welcome', 'age', 'goals', 'format', 'spend', 'experience', 'seal', 'tear', 'claim', 'email', 'code', 'name', 'notify'];
const RETURNING: StepId[] = ['welcome', 'age', 'claim', 'email', 'code', 'notify'];
const CEREMONY_PACKS = ['arena', 'master', 'starter', 'trainer'];
const PIP_ROW = 74;

const POSE: Record<StepId, Pose> = {
  welcome: 'welcome',
  age: 'ask',
  goals: 'ask',
  format: 'ask',
  spend: 'spend',
  experience: 'ask',
  seal: 'seal',
  tear: 'seal',
  claim: 'claim',
  email: 'account',
  code: 'account',
  name: 'profile',
  notify: 'notify',
};

const GOAL_ICON: Record<Goal, IconName> = { grails: 'sparkles', collect: 'grid', battle: 'battles', slabs: 'shield', flip: 'cash' };
const GOAL_LINE: Record<Goal, string> = {
  grails: 'Chasing grails? Bold. I respect it.',
  collect: 'A collector! Every card finds a home.',
  battle: "Battles? Oh, it's on.",
  slabs: 'Graded and sealed. Very fancy.',
  flip: 'Quick flips, quick wins.',
};
const FORMAT_LINE: Record<Format, string> = {
  raw: 'Raw it is — cheaper packs, more rips.',
  graded: 'Slabs! Already graded, already sealed.',
  both: 'Why choose? I like your style.',
};
const SPENDS: { id: Spend; label: string; line: string }[] = [
  { id: 'look', label: 'Just looking', line: "Just looking is fine — your first pack's free." },
  { id: 'low', label: 'Under $10', line: 'Starter packs are a dollar. Easy.' },
  { id: 'mid', label: '$10–50', line: 'Trainer and Arena territory.' },
  { id: 'high', label: '$50+', line: 'Master packs. Big energy.' },
];
const EXPERIENCE: { id: Experience; label: string; line: string }[] = [
  { id: 'new', label: "I'm new", line: "Then Safe mode's on — a higher floor, same top prizes." },
  { id: 'casual', label: 'A few times', line: 'Nice. You know the drill.' },
  { id: 'serious', label: 'All the time', line: "A pro. I'll stay out of your way." },
];
const GLOW: Record<string, string> = { starter: '#39b4ff', trainer: '#9d85ff', arena: '#ff5caa', master: '#ffc24b' };

const newCode = () => String(Math.floor(100000 + Math.random() * 900000));

// Where to pick up after a restart: the saved step, or the nearest earlier
// one whose inputs still exist.
function resumeStep(): StepId {
  const saved = usePrefs.getState();
  let id = NEW[Math.min(saved.step, NEW.length - 1)] ?? 'welcome';
  const after = (s: StepId) => NEW.indexOf(id) > NEW.indexOf(s);
  if (id === 'tear' || (after('tear') && !saved.welcome)) id = 'seal';
  if (id === 'email' || id === 'code') id = 'claim';
  if ((id === 'name' || id === 'notify') && !saved.draft) id = 'claim';
  return id;
}

export default function Onboarding() {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const prefs = usePrefs();
  const { answers, blocked, draft, welcome } = prefs;
  const [mode, setMode] = useState<'new' | 'returning'>('new');
  const [step, setStep] = useState<StepId>(resumeStep);
  const [intro, setIntro] = useState(() => step === 'welcome' && !blocked);
  const [dormant, setDormant] = useState(intro);
  const [viaEmail, setViaEmail] = useState(draft?.provider === 'email');
  const steps = (mode === 'new' ? NEW : RETURNING).filter((s) => viaEmail || (s !== 'email' && s !== 'code'));
  const index = Math.max(0, steps.indexOf(step));
  const [dir, setDir] = useState<1 | -1>(1);
  const [line, setLine] = useState<string | null>(null);
  const [mood, setMood] = useState<Mood>('happy');
  const [hop, setHop] = useState(0);
  const [handle, setHandle] = useState(draft?.handle ?? '');
  const [sheetH, setSheetH] = useState(0);
  // Each step's words and buttons, measured, so a short screen can make room.
  const [sizes, setSizes] = useState<Record<string, { body?: number; foot?: number }>>({});
  const measured = (key: string, part: 'body' | 'foot', h: number) =>
    setSizes((m) => (m[key]?.[part] === h ? m : { ...m, [key]: { ...m[key], [part]: h } }));
  // Email sign-up: the address, the code we "sent", what's been typed.
  const [email, setEmail] = useState(draft?.email ?? '');
  const [code, setCode] = useState('');
  const [entered, setEntered] = useState('');
  const [codeState, setCodeState] = useState<'idle' | 'error' | 'ok'>('idle');
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(false);
  const claimed = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const pose: Pose = mode === 'returning' && (step === 'age' || step === 'claim') ? 'ask' : POSE[step];

  useEffect(() => {
    if (mode === 'new') setPrefs({ step: NEW.indexOf(step) });
    setLine(null);
    setMood(step === 'welcome' || step === 'seal' ? 'happy' : 'idle');
  }, [step, mode]);

  const setup = useMemo(() => recommend(answers), [answers]);
  const card = welcome ? cardById(welcome.id) : null;
  const myCard = card && welcome && mode === 'new' ? { id: card.id, tier: welcome.tier, name: card.name } : null;

  const goTo = (to: StepId) => {
    const list = to === 'email' || to === 'code' ? (mode === 'new' ? NEW : RETURNING) : steps;
    setDir(list.indexOf(to) >= list.indexOf(step) ? 1 : -1);
    setStep(to);
  };
  const next = (from: StepId = step, list: StepId[] = steps) => goTo(list[Math.min(list.indexOf(from) + 1, list.length - 1)]);
  const back = () => {
    if (step === 'age' && mode === 'returning') setMode('new');
    let i = index - 1;
    if (steps[i] === 'tear') i -= 1;
    if (step === 'code') setBanner(false);
    goTo(steps[Math.max(0, i)]);
  };
  // Pip reacts: a line, a face and a hop.
  const react = (text: string, m: Mood = 'happy') => {
    setLine(text);
    setMood(m);
    setHop((h) => h + 1);
  };

  // Signed in by any route: keep the identity, then name yourself (new) or
  // go straight to notifications (returning).
  const identified = (id: Identity) => {
    const h = suggestHandle(id.name, id.email);
    setPrefs({ draft: { ...id, handle: h, color: draft?.color ?? AVATAR_COLORS[0] } });
    setHandle(h);
    const list = (mode === 'new' ? NEW : RETURNING).filter((s) => id.provider === 'email' || (s !== 'email' && s !== 'code'));
    setViaEmail(id.provider === 'email');
    goTo(list[list.indexOf(id.provider === 'email' ? 'code' : 'claim') + 1]);
  };

  const sendCode = () => {
    if (!validEmail(email) || busy) return;
    setBusy(true);
    bump('light');
    later(() => {
      const c = newCode();
      setCode(c);
      setEntered('');
      setCodeState('idle');
      setBusy(false);
      setBanner(false);
      goTo('code');
      // The "email" lands a moment later as a banner up top.
      later(() => {
        setBanner(true);
        react('There it is, up top. Tap it and I’ll fill it in.', 'wow');
      }, 1100);
    }, 650);
  };

  const verify = (value: string) => {
    setBusy(true);
    later(() => {
      setBusy(false);
      if (value === code) {
        setCodeState('ok');
        setBanner(false);
        success();
        react('Verified. Nice and safe.', 'happy');
        later(() => identified({ name: '', email: email.trim().toLowerCase(), provider: 'email', demo: true }), 420);
      } else {
        setCodeState('error');
        setEntered('');
        warn();
        react("Hmm, that's not it. It's in the banner.", 'think');
      }
    }, 450);
  };

  const onCode = (v: string) => {
    setEntered(v);
    if (codeState === 'error') setCodeState('idle');
    if (v.length === CODE_LENGTH && !busy) verify(v);
  };

  const finish = (notifications: 'on' | 'off') => {
    const p = usePrefs.getState();
    const d = p.draft;
    const h = d?.handle || suggestHandle(d?.name ?? '', d?.email);
    signIn({ handle: h, name: d?.name || h, color: d?.color ?? AVATAR_COLORS[0], provider: d?.provider ?? 'guest', email: d?.email }, mode === 'new' ? p.welcome : null);
    setPrefs({ onboarded: true, tourRequested: true, tourDone: false, step: 0, pack: recommend(p.answers).packIndex, notifications, welcome: null, draft: null });
    // The stage opens into the app and the card drops into the Vault.
    const g = geometry('notify', W, H, insets.top);
    playCurtain(mode === 'new' && p.welcome ? { id: p.welcome.id, tier: p.welcome.tier } : null, { x: g.card.cx - 60, y: g.card.cy - 100, w: 120 }, { x: g.card.cx, y: g.card.cy });
    success();
    router.replace('/packs');
  };

  // ---- what Pip says on each step ----
  const says: Record<StepId, string> = {
    welcome: "Hi, I'm Pip. See that pack? It's yours — let's set it up.",
    age: 'Quick one before we start.',
    goals: 'Pick as many as you like. Each one charms your pack.',
    format: 'Raw cards or graded slabs? Watch the pack.',
    spend: "Drag to what feels comfy. You won't pay anything.",
    experience: 'Have you opened packs before?',
    seal: `Sealed. One ${setup.pack.name} pack, just for you.`,
    tear: '',
    claim: mode === 'returning' ? "Welcome back! Log in and I'll find your stuff." : myCard && welcome ? `${money(welcome.value)}! Let's keep it safe.` : "Let's save your setup.",
    email: "I'll send you a code. It's a demo, so I'll show it to you.",
    code: 'Sending it now…',
    name: 'What should other collectors call you?',
    notify: 'Want a ping when it ships, or when someone joins your battle?',
  };

  // How far the hero has to give way for this step to fit (0 on most
  // screens). The tear keeps the sealed pack exactly where it was.
  const stepKey = blocked ? 'young' : step;
  const need = (key: string, p: Pose) => {
    const m = sizes[key];
    return m?.body == null ? 0 : Math.max(0, Math.ceil(heroBottom(p, W, H, insets.top) + PIP_ROW + m.body + (m.foot ?? 0) - H));
  };
  const squeeze = step === 'tear' ? need('seal', 'seal') : need(stepKey, pose);
  const hero = heroBottom(pose, W, H, insets.top, squeeze);
  // On the sign-up step Pip sits on the sheet's top edge, if there's room.
  const onSheet = step === 'claim' && sheetH > 0;
  const sheetPip = H - sheetH - PIP_ROW + 8;
  const pipTop = onSheet ? Math.max(hero - 6, sheetPip) : hero;
  const pipHidden = onSheet && sheetPip < hero - 24;
  const contentTop = hero + PIP_ROW;
  const chrome = !blocked && step !== 'welcome' && step !== 'tear';
  const progress = steps.length > 1 ? index / (steps.length - 1) : 0;
  const tint = step === 'welcome' ? colors.primary : pose === 'claim' || pose === 'account' || pose === 'profile' || pose === 'notify' ? (welcome && mode === 'new' ? tierColor[welcome.tier] : colors.primary) : GLOW[setup.pack.id];
  const charms = answers.goals.map((g) => GOAL_ICON[g]);
  const clean = handle.toLowerCase();

  let body: ReactNode = null;
  let footer: ReactNode = null;
  if (blocked) {
    body = (
      <Title sub="You need to be 18 or older to use Godpack, so we can't set up an account for you." testID="ob-young">
        Come back when you're 18
      </Title>
    );
  } else if (step === 'welcome') {
    body = (
      <Title sub="Every pack shows its odds first. Sell any card back instantly, or ship the ones you keep. This is an unofficial demo on pretend credit.">
        Your first pack is waiting.
      </Title>
    );
    footer = (
      <View style={{ gap: 4 }}>
        <Button
          label="Let's open it"
          variant="buy"
          onPress={() => {
            setMode('new');
            goTo('age');
          }}
          testID="ob-start"
        />
        <Press
          onPress={() => {
            setMode('returning');
            goTo('age');
          }}
          testID="ob-have-account"
          style={{ alignSelf: 'center', padding: 12 }}
        >
          <Text style={{ color: colors.label2, fontSize: 15, fontWeight: '500' }}>
            Already have an account? <Text style={{ color: colors.accentSoft, fontWeight: '600' }}>Log in</Text>
          </Text>
        </Press>
      </View>
    );
  } else if (step === 'age') {
    body = <Title sub="Godpack is for adults. This demo has no real money, but it keeps the same rule.">Are you 18 or older?</Title>;
    footer = (
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button
          label="No"
          variant="secondary"
          onPress={() => {
            warn();
            setPrefs({ blocked: true });
          }}
          testID="ob-age-no"
          style={{ flex: 1, minHeight: 52, borderRadius: 12 }}
        />
        <Button
          label="Yes, I'm 18+"
          variant="buy"
          onPress={() => {
            setAnswers({ adult: true });
            react('Great. Now the fun part.');
            next();
          }}
          testID="ob-age-yes"
          style={{ flex: 2 }}
        />
      </View>
    );
  } else if (step === 'goals') {
    body = (
      <>
        <Title>What are you here for?</Title>
        <View style={styles.chips}>
          {GOALS.map((g, i) => {
            const on = answers.goals.includes(g.id);
            return (
              <Animated.View key={g.id} entering={staggered(i + 1)}>
                <Press
                  onPress={() => {
                    const goals = on ? answers.goals.filter((x) => x !== g.id) : [...answers.goals, g.id];
                    setAnswers({ goals });
                    if (!on) react(GOAL_LINE[g.id], g.id === 'battle' ? 'wow' : 'happy');
                    else react('Changed your mind? No problem.', 'idle');
                  }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${g.title}. ${g.sub}`}
                  testID={`opt-${g.id}`}
                  style={[styles.bigChip, on && styles.bigChipOn]}
                >
                  <Icon name={g.icon} size={17} color={on ? '#0b0a12' : colors.label2} />
                  <Text style={[styles.bigChipText, on && { color: '#0b0a12' }]}>{g.title}</Text>
                </Press>
              </Animated.View>
            );
          })}
        </View>
        {answers.goals.length ? (
          <Text style={styles.hint} testID="ob-picked">
            {answers.goals.length} picked
          </Text>
        ) : null}
      </>
    );
    footer = <Button label={answers.goals.length ? 'Continue' : 'Pick at least one'} variant="buy" disabled={!answers.goals.length} onPress={() => next()} testID="ob-continue" />;
  } else if (step === 'format') {
    const pick = (f: Format) => {
      setAnswers({ format: f });
      react(FORMAT_LINE[f], f === 'graded' ? 'wow' : 'happy');
      // Long enough to watch the pack turn over to its new design.
      later(() => next('format'), 900);
    };
    const opt = (f: Format, title: string, sub: string, art: ReactNode) => (
      <Press key={f} onPress={() => pick(f)} accessibilityRole="radio" accessibilityState={{ checked: answers.format === f }} testID={`opt-${f}`} style={[styles.formatCard, answers.format === f && styles.formatOn]}>
        <View style={{ height: 92, alignItems: 'center', justifyContent: 'center' }}>{art}</View>
        <Text style={styles.formatTitle}>{title}</Text>
        <Text style={styles.formatSub}>{sub}</Text>
      </Press>
    );
    body = (
      <>
        <Title>Raw cards or graded slabs?</Title>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {opt('raw', 'Raw cards', 'Packs from $1', <Thumb id="frost-halo" width={60} />)}
          {opt('graded', 'Graded slabs', 'Packs from $25', <Thumb id="aurora-peaks" graded width={52} />)}
        </View>
        <Press onPress={() => pick('both')} testID="opt-both" style={[styles.bigChip, { alignSelf: 'center' }, answers.format === 'both' && styles.bigChipOn]}>
          <Text style={[styles.bigChipText, answers.format === 'both' && { color: '#0b0a12' }]}>Both, show me everything</Text>
        </Press>
      </>
    );
  } else if (step === 'spend') {
    const value = answers.spend ? SPENDS.findIndex((x) => x.id === answers.spend) : null;
    body = (
      <>
        <Title>What feels comfortable per session?</Title>
        <SpendSlider
          stops={SPENDS}
          value={value}
          onChange={(i) => {
            setAnswers({ spend: SPENDS[i].id });
            react(SPENDS[i].line, i === 3 ? 'wow' : 'happy');
          }}
        />
        {answers.spend ? (
          <Animated.View key={setup.pack.id} entering={fadeIn} style={styles.reco}>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '500', flex: 1 }}>Your pack</Text>
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }} testID="ob-spend-pack">
              {setup.pack.name} · {money(setup.pack.price, { compact: true })}
            </Text>
            <Text style={{ color: colors.accentSoft, fontSize: 13, fontWeight: '500' }}>up to {setup.pack.mult}×</Text>
          </Animated.View>
        ) : null}
      </>
    );
    footer = <Button label={answers.spend ? 'Continue' : 'Drag to choose'} variant="buy" disabled={!answers.spend} onPress={() => next()} testID="ob-continue" />;
  } else if (step === 'experience') {
    body = (
      <>
        <Title>Opened packs before?</Title>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {EXPERIENCE.map((e, i) => {
            const on = answers.experience === e.id;
            return (
              <Animated.View key={e.id} entering={staggered(i + 1)} style={{ flex: 1 }}>
                <Press
                  onPress={() => {
                    setAnswers({ experience: e.id });
                    // Applying the recommendation now shows the Safe-mode shield on the pack.
                    const r = recommend({ ...answers, experience: e.id });
                    setPrefs({ safe: r.safe, limit: r.limit });
                    react(e.line, e.id === 'serious' ? 'wow' : 'happy');
                    later(() => next('experience'), 1100);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  testID={`opt-${e.id}`}
                  style={[styles.expCard, on && styles.formatOn]}
                >
                  <Text style={[styles.formatTitle, { textAlign: 'center' }]}>{e.label}</Text>
                </Press>
              </Animated.View>
            );
          })}
        </View>
      </>
    );
  } else if (step === 'seal') {
    body = (
      <>
        <Title testID="ob-recommended">
          Your <Text testID="ob-recommended-name">{setup.pack.name}</Text> pack is ready
        </Title>
        <View style={styles.group}>
          <View style={[styles.row, styles.rule]}>
            <Icon name="shield" size={18} color={prefs.safe ? colors.money : colors.muted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Safe mode</Text>
              <Text style={styles.rowSub}>Higher floor, same top prizes</Text>
            </View>
            <Toggle value={prefs.safe} onChange={(v) => setPrefs({ safe: v })} label="Safe mode" testID="ob-safe" />
          </View>
          <View style={styles.row}>
            <Icon name="clock" size={18} color={prefs.limit != null ? colors.gold : colors.muted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Daily spending reminder</Text>
              <Text style={styles.rowSub}>{prefs.limit != null ? `A nudge after ${money(prefs.limit, { compact: true })} a day` : 'Off'}</Text>
            </View>
            <Toggle value={prefs.limit != null} onChange={(v) => setPrefs({ limit: v ? (SPEND_LIMIT[answers.spend ?? 'mid'] ?? 50) : null })} label="Daily spending reminder" testID="ob-reminder" />
          </View>
        </View>
      </>
    );
    footer = (
      <View style={{ gap: 8 }}>
        <Button
          label="Tear it open"
          variant="buy"
          onPress={() => {
            if (!usePrefs.getState().welcome) setPrefs({ welcome: welcomePull() });
            bump('medium');
            next();
          }}
          testID="ob-continue"
        />
        <Text style={[type.small, { textAlign: 'center' }]}>Free, and guaranteed to be a hit or better</Text>
      </View>
    );
  } else if (step === 'email') {
    const ok = validEmail(email);
    body = (
      <>
        <Title sub="We'll send a 6-digit code to confirm it's you. Demo: the code appears on screen and no email is sent.">What's your email?</Title>
        <Field
          big
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={sendCode}
          autoFocus
          accessibilityLabel="Email address"
          testID="ob-email"
        />
      </>
    );
    footer = <Button label={busy ? 'Sending' : 'Send code'} variant="buy" disabled={!ok} loading={busy} onPress={sendCode} testID="ob-send-code" />;
  } else if (step === 'code') {
    body = (
      <>
        <Title sub={`Sent to ${email.trim().toLowerCase()}.`}>Enter the code</Title>
        <CodeInput value={entered} onChange={onCode} state={codeState} testID="ob-code" />
        {codeState === 'error' ? (
          <Animated.Text entering={fadeIn} style={styles.error} testID="ob-code-error">
            That code doesn't match. Check the banner up top.
          </Animated.Text>
        ) : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Press onPress={() => goTo('email')} testID="ob-change-email" style={{ paddingVertical: 8 }}>
            <Text style={styles.link}>Change email</Text>
          </Press>
          <Press
            onPress={() => {
              setBanner(false);
              setCode(newCode());
              setEntered('');
              setCodeState('idle');
              react('New code coming up…', 'idle');
              later(() => setBanner(true), 700);
            }}
            testID="ob-resend"
            style={{ paddingVertical: 8 }}
          >
            <Text style={styles.link}>Send a new code</Text>
          </Press>
        </View>
      </>
    );
    footer = <Button label="Verify" variant="buy" disabled={entered.length < CODE_LENGTH || codeState === 'ok'} loading={busy} onPress={() => verify(entered)} testID="ob-verify" />;
  } else if (step === 'name') {
    const error = !clean ? null : !validHandle(clean) ? 'Use 3–16 letters, numbers or _' : TAKEN.has(clean) ? 'That name is taken' : null;
    const signedWith = draft ? { apple: 'Apple', google: 'Google', email: 'email', guest: '' }[draft.provider] : '';
    const color = draft?.color ?? AVATAR_COLORS[0];
    body = (
      <>
        <Title>Pick your collector name</Title>
        {signedWith ? (
          <Text style={styles.hint} testID="ob-signed-with">
            Signed in with {signedWith}
            {draft?.demo ? ' (demo, on this device)' : ''}
            {draft?.email ? ` · ${draft.email}` : ''}
          </Text>
        ) : null}
        <Field big value={handle} onChangeText={(t) => setHandle(t.replace(/\s+/g, '_').toLowerCase())} autoCapitalize="none" autoCorrect={false} maxLength={16} error={error} placeholder="yourname" accessibilityLabel="Collector name" testID="ob-handle" />
        <View style={{ gap: 10 }}>
          <Caps>Avatar colour</Caps>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {AVATAR_COLORS.map((c) => (
              <Press
                key={c}
                accessibilityRole="radio"
                accessibilityState={{ checked: c === color }}
                accessibilityLabel={COLOR_NAMES[c]}
                onPress={() => {
                  tap();
                  if (draft) setPrefs({ draft: { ...draft, color: c } });
                }}
                haptic={false}
                testID={`ob-color-${c.slice(1)}`}
                scaleTo={0.92}
                style={[styles.swatch, { backgroundColor: c }, c === color && styles.swatchOn]}
              >
                {c === color ? <Icon name="check" size={14} color="#fff" stroke={3} /> : null}
              </Press>
            ))}
          </View>
        </View>
      </>
    );
    footer = (
      <Button
        label="Continue"
        variant="buy"
        disabled={!clean || !!error}
        onPress={() => {
          if (draft) setPrefs({ draft: { ...draft, handle: clean } });
          next();
        }}
        testID="ob-continue"
      />
    );
  } else if (step === 'notify') {
    body = <Title sub="Shipping updates, battle results and one daily check-in reminder. You can change this any time.">Never miss a pull</Title>;
    footer = <Notify onDone={finish} />;
  }

  const enter = reduced ? fadeIn : dir > 0 ? enterFwd : enterBack;
  const exit = reduced ? fadeOut : dir > 0 ? exitFwd : exitBack;
  const g = geometry('welcome', W, H, insets.top, step === 'welcome' ? squeeze : 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }} testID="onboarding">
      <Stage
        pose={pose}
        art={setup.pack.art}
        tint={tint}
        charms={charms}
        shield={!!answers.experience && prefs.safe}
        card={myCard}
        owner={step === 'name' ? clean : undefined}
        avatar={step === 'name' ? { handle: clean, color: draft?.color ?? AVATAR_COLORS[0] } : null}
        hidePack={step === 'tear' || blocked}
        dormant={dormant}
        squeeze={squeeze}
      />

      {chrome ? (
        <View style={[styles.top, { paddingTop: insets.top + 4 }]}>
          <IconButton name="chevronLeft" label="Back" testID="ob-back" onPress={back} />
          <ProgressBar value={progress} />
          <Text style={styles.count} testID="ob-count">
            {index}/{steps.length - 1}
          </Text>
        </View>
      ) : null}

      {step !== 'tear' ? <PipRow top={pipTop} hidden={pipHidden} text={blocked ? 'Sorry — Godpack is only for adults.' : (line ?? says[step])} mood={blocked ? 'think' : mood} hop={hop} /> : null}

      {step !== 'claim' || blocked ? (
        <KeyboardAvoidingView behavior="padding" style={[StyleSheet.absoluteFill, { top: contentTop }]} pointerEvents="box-none">
          <Animated.View key={blocked ? 'young' : step} entering={enter} exiting={exit} style={{ flex: 1 }} testID={`ob-step-${blocked ? 'too-young' : step}`}>
            <StepBody onHeight={(h) => measured(stepKey, 'body', h)}>{body}</StepBody>
            {footer ? (
              <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]} onLayout={(e) => measured(stepKey, 'foot', e.nativeEvent.layout.height)}>
                {footer}
              </View>
            ) : null}
          </Animated.View>
        </KeyboardAvoidingView>
      ) : (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID="ob-step-claim">
          <AuthSheet
            title={mode === 'returning' ? 'Log in' : 'Save your pull'}
            sub={mode === 'returning' ? 'Pick how you signed up.' : 'Create a free account so this card and your setup are kept. No payment needed.'}
            footnote="By continuing you agree to the demo's terms and privacy notice. Accounts and cards stay on this device."
            onHeight={setSheetH}
            testID="ob-sheet"
          >
            <AuthButtons
              allowSkip={mode !== 'returning'}
              onEmail={() => {
                setViaEmail(true);
                goTo('email');
              }}
              onIdentity={(id) => {
                react('Saved. Nice and safe.', 'happy');
                identified(id);
              }}
            />
          </AuthSheet>
        </View>
      )}

      {step === 'code' && banner ? <CodeBanner code={code} onPress={() => onCode(code)} /> : null}

      {step === 'tear' && myCard && welcome ? (
        <TearOpen
          pack={setup.pack.art}
          card={{ id: myCard.id, name: myCard.name, value: welcome.value, tier: welcome.tier }}
          from={geometry('seal', W, H, insets.top, squeeze)}
          onClaim={() => {
            claimed.current = true;
          }}
          onClose={() => {
            if (claimed.current) {
              claimed.current = false;
              next();
            } else back();
          }}
        />
      ) : null}

      {intro ? <Intro to={{ x: g.cx, y: g.cy - g.h * 0.03, size: g.w * 0.5 }} onReveal={() => setDormant(false)} onDone={() => setIntro(false)} /> : null}
    </View>
  );
}

// A step's words. If they're still taller than the room left on a very short
// screen, they scroll, and a fade at the bottom says there's more.
function StepBody({ children, onHeight }: { children: ReactNode; onHeight: (h: number) => void }) {
  const [room, setRoom] = useState(0);
  const [content, setContent] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  const more = room > 0 && content - room > 2 && !atEnd;
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onLayout={(e) => setRoom(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => {
          setContent(h);
          onHeight(h);
        }}
        onScroll={(e) => {
          const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
          setAtEnd(contentOffset.y + layoutMeasurement.height >= contentSize.height - 6);
        }}
        scrollEventThrottle={32}
      >
        {children}
      </ScrollView>
      {more ? (
        <Animated.View entering={fadeIn} exiting={fadeOut} pointerEvents="none" style={styles.more} testID="ob-more">
          <LinearGradient colors={['rgba(16,16,20,0)', colors.bg]} style={StyleSheet.absoluteFill} />
        </Animated.View>
      ) : null}
    </View>
  );
}

function Title({ children, sub, testID }: { children: ReactNode; sub?: string; testID?: string }) {
  // A little tighter on very short screens, so the step fits.
  const tight = useWindowDimensions().height < 640;
  return (
    <View style={{ gap: tight ? 6 : 8 }}>
      <Animated.Text entering={dropIn} style={[type.title, tight && styles.titleTight]} accessibilityRole="header" testID={testID}>
        {children}
      </Animated.Text>
      {sub ? (
        <Animated.Text entering={dropInLate} style={[styles.sub, tight && styles.subTight]}>
          {sub}
        </Animated.Text>
      ) : null}
    </View>
  );
}

// Pip and his speech bubble, riding just under the stage's hero.
function PipRow({ top, hidden, text, mood, hop }: { top: number; hidden?: boolean; text: string; mood: Mood; hop: number }) {
  const reduced = useReducedMotion();
  const y = useSharedValue(top);
  const o = useSharedValue(hidden ? 0 : 1);
  useEffect(() => {
    y.set(reduced ? top : withSpring(top, SETTLE));
    o.set(withTiming(hidden ? 0 : 1, { duration: DUR.small, easing: EASE_OUT }));
  }, [top, hidden, reduced, y, o]);
  const style = useAnimatedStyle(() => ({ position: 'absolute', left: 16, right: 20, top: 0, height: PIP_ROW - 8, opacity: o.get(), transform: [{ translateY: y.get() }] }));
  return (
    <Animated.View style={style} pointerEvents="box-none">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        <Mascot size={50} mood={mood} hop={hop} look={hop % 2 ? 0.6 : -0.3} />
        <Bubble text={text} testID="pip-says" />
      </View>
    </Animated.View>
  );
}

// Starts partly filled (people are likelier to finish something already
// under way). The fill is absolute and childless, so its width is cheap.
function ProgressBar({ value }: { value: number }) {
  const w = useSharedValue(0.12);
  useEffect(() => {
    w.set(withSpring(0.12 + 0.88 * value, SETTLE));
  }, [value, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.get() * 100}%` }));
  return (
    <View style={styles.bar} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round((0.12 + 0.88 * value) * 100) }}>
      <Animated.View style={[styles.barFill, fill]} />
    </View>
  );
}

// The opening itself: the website's ceremony, flying the pack in from where
// it sits on stage.
function TearOpen({ pack, card, from, onClaim, onClose }: { pack: string; card: { id: string; name: string; value: number; tier: string }; from: { x: number; y: number; w: number; h: number }; onClaim: () => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Animated.View entering={fadeIn} exiting={fadeOut} style={[StyleSheet.absoluteFill, { paddingTop: insets.top, paddingBottom: insets.bottom }]} testID="welcome-reveal">
      <Ceremony
        pack={Math.max(0, CEREMONY_PACKS.indexOf(pack))}
        card={card}
        from={{ x: from.x, y: from.y - insets.top, w: from.w, h: from.h }}
        actions={[{ label: 'Claim it', primary: true }]}
        onAction={async () => onClaim()}
        onClose={async () => onClose()}
        dom={{ style: { flex: 1, backgroundColor: 'transparent' }, containerStyle: { flex: 1, backgroundColor: 'transparent' }, scrollEnabled: false, bounces: false }}
      />
    </Animated.View>
  );
}

// The "email" arriving: a system-style banner that drops from the top edge,
// frosted like the real thing so the scene shows through. Tapping it fills
// the code in.
function CodeBanner({ code, onPress }: { code: string; onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Animated.View entering={bannerIn} exiting={bannerOut} style={[styles.banner, { top: insets.top + 8 }]} testID="ob-code-banner">
      <Press onPress={onPress} accessibilityLabel={`Your Godpack code is ${code.split('').join(' ')}. Tap to fill it in.`} style={styles.bannerPress} scaleTo={0.98}>
        <BlurView intensity={45} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.bannerIcon}>
          <Mark size={22} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>Godpack</Text>
            <Text style={{ color: colors.faint, fontSize: 12 }}>now</Text>
          </View>
          <Text style={{ color: colors.label2, fontSize: 14 }} numberOfLines={1}>
            Your code is{' '}
            <Text style={{ color: colors.text, fontWeight: '700', fontVariant: ['tabular-nums'] }} testID="ob-code-value">
              {code.slice(0, 3)} {code.slice(3)}
            </Text>{' '}
            · Tap to fill
          </Text>
        </View>
      </Press>
    </Animated.View>
  );
}

// The notification primer's buttons.
function Notify({ onDone }: { onDone: (n: 'on' | 'off') => void }) {
  const [busy, setBusy] = useState(false);
  const turnOn = async () => {
    setBusy(true);
    const granted = await requestNotifications();
    if (granted) await setDailyReminder(true);
    else toast('Notifications are off. You can turn them on in Settings.', 'warn');
    setBusy(false);
    onDone(granted ? 'on' : 'off');
  };
  return (
    <View style={{ gap: 6 }}>
      <Button label="Turn on notifications" variant="buy" icon="bell" onPress={turnOn} loading={busy} testID="ob-notify-on" />
      <Button label="Not now" variant="ghost" onPress={() => onDone('off')} testID="ob-notify-later" />
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, zIndex: 2 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 2, backgroundColor: colors.primary },
  count: { color: colors.faint, fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'], minWidth: 40, textAlign: 'right', paddingRight: 8 },
  body: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 20, gap: 18 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
  more: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 28 },
  titleTight: { fontSize: 26, lineHeight: 31, letterSpacing: -0.6 },
  subTight: { fontSize: 15, lineHeight: 21 },
  sub: { color: colors.muted, fontSize: 16, lineHeight: 23, fontWeight: '500' },
  hint: { color: colors.muted, fontSize: 13, fontWeight: '500' },
  error: { color: colors.danger, fontSize: 14, fontWeight: '500', marginTop: -6 },
  link: { color: colors.accentSoft, fontSize: 15, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bigChip: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: 'rgba(24,22,30,0.85)' },
  bigChipOn: { backgroundColor: colors.label, borderColor: colors.label },
  bigChipText: { color: colors.label, fontSize: 15, fontWeight: '600' },
  formatCard: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 14, paddingHorizontal: 10, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.panelLine, backgroundColor: 'rgba(24,22,30,0.85)' },
  formatOn: { borderColor: colors.label, backgroundColor: colors.control },
  formatTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  formatSub: { color: colors.muted, fontSize: 13, fontWeight: '500' },
  expCard: { minHeight: 64, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.panelLine, backgroundColor: 'rgba(24,22,30,0.85)' },
  reco: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, backgroundColor: colors.surface2 },
  group: { borderRadius: radius.lg, backgroundColor: 'rgba(24,22,30,0.9)', borderWidth: 1, borderColor: colors.panelLine, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 16, paddingVertical: 10 },
  rule: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.panelLine },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowSub: { color: colors.muted, fontSize: 13 },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  swatchOn: { borderWidth: 3, borderColor: '#fff' },
  // The shadow sits outside the clipped, frosted layer so it isn't cut off.
  banner: { position: 'absolute', left: 12, right: 12, zIndex: 3, borderRadius: 20, boxShadow: '0 12px 30px rgba(0,0,0,0.45)' },
  // Heavier tint than iOS's own banner: it has to stay legible over a glowing scene.
  bannerPress: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(40,36,52,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  bannerIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panel },
});
