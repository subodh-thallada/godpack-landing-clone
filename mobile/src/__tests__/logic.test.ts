import { describe, expect, it } from '@jest/globals';

// Node's Buffer, available when Jest runs.
declare const Buffer: { from(s: string): { toString(encoding: string): string } };
import { identityFromIdToken, suggestHandle, validEmail, validHandle } from '../lib/auth';
import { ago, clock, money } from '../lib/format';
import { recommend } from '../lib/recommend';
import { tourSteps } from '../lib/tourSteps';
import { type Answers, emptyAnswers, recordSpend, setPrefs, spentToday, usePrefs } from '../store/prefs';

const a = (x: Partial<Answers>): Answers => ({ ...emptyAnswers, adult: true, ...x });

describe('recommend', () => {
  it('raw cards and a small budget start on Starter with Safe mode', () => {
    const r = recommend(a({ format: 'raw', spend: 'low', experience: 'new', goals: ['collect'] }));
    expect(r.pack.id).toBe('starter');
    expect(r.safe).toBe(true);
    expect(r.limit).toBe(10);
  });

  it('graded slabs pick Arena, or Master for the biggest budget', () => {
    expect(recommend(a({ format: 'graded', spend: 'mid' })).pack.id).toBe('arena');
    expect(recommend(a({ format: 'graded', spend: 'high' })).pack.id).toBe('master');
  });

  it('"both" follows the budget', () => {
    expect(recommend(a({ format: 'both', spend: 'low' })).pack.id).toBe('starter');
    expect(recommend(a({ format: 'both', spend: 'mid' })).pack.id).toBe('arena');
  });

  it('serious grail chasers keep full odds and no reminder at $50+', () => {
    const r = recommend(a({ format: 'raw', spend: 'high', experience: 'serious', goals: ['grails'] }));
    expect(r.pack.id).toBe('trainer');
    expect(r.safe).toBe(false);
    expect(r.limit).toBeNull();
  });

  it('every goal shows up in the reasons or the tour focus', () => {
    expect(recommend(a({ goals: ['battle'] })).tourFocus).toBe('battles');
    expect(recommend(a({ goals: ['flip'] })).reasons.join(' ')).toMatch(/95%/);
    expect(recommend(a({ goals: ['collect'] })).tourFocus).toBe('feed');
  });

  it('never gives more than four reasons', () => {
    const r = recommend(a({ goals: ['grails', 'collect', 'battle', 'slabs', 'flip'], format: 'both', spend: 'low', experience: 'new' }));
    expect(r.reasons.length).toBeLessThanOrEqual(4);
  });
});

describe('tour', () => {
  it('has seven stops covering wallet, packs and every tab', () => {
    const steps = tourSteps(a({ goals: ['battle'] }), 250, 1);
    expect(steps.map((s) => s.target)).toEqual(['wallet', 'open', 'tab-battles', 'tab-market', 'tab-vault', 'tab-feed', 'tab-rewards']);
    expect(steps[0].body).toContain('$250.00');
    expect(steps[2].title).toMatch(/like you asked/);
    expect(steps[6].title).toMatch(/1 free pack/);
  });
});

describe('auth helpers', () => {
  it('suggests a clean handle', () => {
    expect(suggestHandle('Jane Doe')).toBe('jane_doe');
    expect(suggestHandle('', 'Pack.Ripper+1@example.com')).toBe('pack_ripper_1');
    expect(suggestHandle('', undefined)).toBe('collector');
    expect(suggestHandle('Al')).toMatch(/^collector\d{3}$/);
    // Never the same as one of the demo's own collectors.
    expect(suggestHandle('', 'vesper@example.com')).toMatch(/^vesper_\d{2}$/);
  });

  it('validates handles and emails', () => {
    expect(validHandle('ok_name1')).toBe(true);
    expect(validHandle('no')).toBe(false);
    expect(validHandle('Has Space')).toBe(false);
    expect(validEmail('a@b.co')).toBe(true);
    expect(validEmail('nope@')).toBe(false);
  });

  it('reads name and email from a Google ID token', () => {
    const payload = Buffer.from(JSON.stringify({ given_name: 'Zoë', email: 'z@example.com' })).toString('base64url');
    expect(identityFromIdToken(`x.${payload}.y`)).toMatchObject({ name: 'Zoë', email: 'z@example.com', provider: 'google', demo: false });
    expect(identityFromIdToken('garbage')).toMatchObject({ name: '', provider: 'google' });
  });
});

describe('spending reminder', () => {
  it('fires once when today passes the limit and resets the next day', () => {
    setPrefs({ limit: 10, spentDay: '', spentToday: 0 });
    const day1 = new Date(2026, 9, 1, 10).getTime();
    expect(recordSpend(6, day1)).toBe(false);
    expect(recordSpend(6, day1)).toBe(true);
    expect(recordSpend(6, day1)).toBe(false);
    expect(spentToday(usePrefs.getState(), day1)).toBe(18);
    const day2 = new Date(2026, 9, 2, 10).getTime();
    expect(spentToday(usePrefs.getState(), day2)).toBe(0);
    expect(recordSpend(10, day2)).toBe(true);
  });

  it('never fires with the reminder off', () => {
    setPrefs({ limit: null, spentDay: '', spentToday: 0 });
    expect(recordSpend(1000)).toBe(false);
  });
});

describe('format', () => {
  it('formats money, time and countdowns', () => {
    expect(money(1234.5)).toBe('$1,234.50');
    expect(money(25, { compact: true })).toBe('$25');
    expect(money(-3)).toBe('−$3.00');
    expect(ago(0)).toBe('just now');
    expect(ago(90)).toBe('1h ago');
    expect(ago(60 * 50)).toBe('2d ago');
    expect(clock(61000)).toBe('1:01');
  });
});
