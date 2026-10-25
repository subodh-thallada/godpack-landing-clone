// On-device preferences: onboarding answers and progress, the tour, the store
// controls (Safe mode, last pack) and the spending reminder.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { VaultItem } from './session';

export type Goal = 'grails' | 'collect' | 'battle' | 'slabs' | 'flip';
export type Experience = 'new' | 'casual' | 'serious';
export type Format = 'raw' | 'graded' | 'both';
export type Spend = 'look' | 'low' | 'mid' | 'high';

export type Answers = {
  adult: boolean;
  goals: Goal[];
  experience: Experience | null;
  format: Format | null;
  spend: Spend | null;
};

// What onboarding has collected so far about the account, so a relaunch
// mid-way doesn't lose the sign-in.
export type Draft = {
  provider: 'apple' | 'google' | 'email' | 'guest';
  name: string;
  email?: string;
  demo: boolean;
  handle: string;
  color: string;
};

export type Prefs = {
  answers: Answers;
  draft: Draft | null;
  blocked: boolean; // answered "under 18
  step: number; // onboarding step to resume at
  welcome: VaultItem | null; // the free welcome pull from onboarding
  onboarded: boolean;
  tourDone: boolean;
  tourRequested: boolean; // play the tour on the next visit to the tabs
  tipsSeen: string[];
  checklistHidden: boolean;
  notifications: 'on' | 'off' | 'unasked';
  safe: boolean;
  pack: number;
  battlePack: number;
  limit: number | null; // daily spending reminder in demo dollars
  spentDay: string;
  spentToday: number;
};

export const emptyAnswers: Answers = { adult: false, goals: [], experience: null, format: null, spend: null };

const initial: Prefs = {
  answers: emptyAnswers,
  draft: null,
  blocked: false,
  step: 0,
  welcome: null,
  onboarded: false,
  tourDone: false,
  tourRequested: false,
  tipsSeen: [],
  checklistHidden: false,
  notifications: 'unasked',
  safe: false,
  pack: 0,
  battlePack: 0,
  limit: null,
  spentDay: '',
  spentToday: 0,
};

export const usePrefs = create<Prefs>()(
  persist(() => initial, {
    name: 'gp.prefs',
    version: 1,
    storage: createJSONStorage(() => AsyncStorage),
    migrate: () => initial,
  }),
);

export const setPrefs = (p: Partial<Prefs>) => usePrefs.setState(p);
export const setAnswers = (a: Partial<Answers>) => usePrefs.setState((s) => ({ answers: { ...s.answers, ...a } }));
export const resetPrefs = () => usePrefs.setState(initial);
export const markTip = (id: string) =>
  usePrefs.setState((s) => (s.tipsSeen.includes(id) ? s : { tipsSeen: [...s.tipsSeen, id] }));

const dayKey = (t = Date.now()) => new Date(t).toDateString();

// Record demo spend against today's reminder. Returns true the first time
// today's total passes the reminder.
export function recordSpend(amount: number, now = Date.now()) {
  const p = usePrefs.getState();
  const before = p.spentDay === dayKey(now) ? p.spentToday : 0;
  const after = before + amount;
  usePrefs.setState({ spentDay: dayKey(now), spentToday: after });
  return p.limit != null && before < p.limit && after >= p.limit;
}

export const spentToday = (p: Prefs, now = Date.now()) => (p.spentDay === dayKey(now) ? p.spentToday : 0);
