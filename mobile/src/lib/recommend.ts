// Turns the onboarding answers into a starting setup. Every question changes
// something here, so the "your setup is ready" screen reflects what was said.
import type { IconName } from '../components/Icon';
import { PACKS, TOP_HITS, type Pack, type Pull } from '../data';
import type { Answers, Goal, Spend } from '../store/prefs';

export type Setup = {
  pack: Pack;
  packIndex: number;
  safe: boolean;
  limit: number | null;
  reasons: string[];
  highlights: Pull[];
  tourFocus: 'battles' | 'vault' | 'packs' | 'feed';
};

export const GOALS: { id: Goal; title: string; sub: string; icon: IconName }[] = [
  { id: 'grails', title: 'Chase big pulls', sub: 'Go for the rare grail cards', icon: 'sparkles' },
  { id: 'collect', title: 'Build a collection', sub: 'Keep the cards you love', icon: 'grid' },
  { id: 'battle', title: 'Battle other collectors', sub: 'Same pack, best total wins', icon: 'battles' },
  { id: 'slabs', title: 'Own graded slabs', sub: 'Cards already graded and sealed', icon: 'shield' },
  { id: 'flip', title: 'Sell for value', sub: 'Sell back instantly at 95%', icon: 'cash' },
];

export const SPEND_LIMIT: Record<Spend, number | null> = { look: 10, low: 10, mid: 50, high: null };

export function recommend(a: Answers): Setup {
  const spend = a.spend ?? 'low';
  const wantsSlabs = a.format === 'graded' || (a.format === 'both' && (spend === 'mid' || spend === 'high'));
  let id: Pack['id'];
  if (wantsSlabs) id = spend === 'high' ? 'master' : 'arena';
  else id = spend === 'mid' || spend === 'high' ? 'trainer' : 'starter';
  const packIndex = PACKS.findIndex((p) => p.id === id);
  const pack = PACKS[packIndex];

  const cautious = a.experience === 'new' || spend === 'look' || spend === 'low';
  const safe = cautious && !(a.experience === 'serious' && a.goals.includes('grails'));

  const reasons: string[] = [];
  if (wantsSlabs) reasons.push(`${pack.name} packs pull graded slabs, which you said you want.`);
  else reasons.push(`${pack.name} packs are ${pack.price === 1 ? 'the cheapest way' : 'a good way'} to start with raw cards.`);
  if (safe) reasons.push('Safe mode is on: it trims the lowest outcomes and keeps the same top prizes.');
  if (a.goals.includes('battle')) reasons.push('Battles are one tap away. Post one, or join one from the open list.');
  if (a.goals.includes('flip')) reasons.push('Anything you pull can be sold back instantly for 95% of its value.');
  if (a.goals.includes('grails') && !safe) reasons.push(`Top prize in ${pack.name}: up to ${pack.mult}× the pack price.`);
  const limit = SPEND_LIMIT[spend];
  if (limit != null) reasons.push(`We'll remind you when you've opened $${limit} in a day. You can change this in Settings.`);

  const highlights = TOP_HITS.filter((h) => (wantsSlabs ? h.pack === id || h.pack === 'master' : true)).slice(0, 3);
  const tourFocus = a.goals.includes('battle') ? 'battles' : a.goals.includes('flip') ? 'vault' : a.goals.includes('collect') ? 'feed' : 'packs';
  return { pack, packIndex, safe, limit, reasons: reasons.slice(0, 4), highlights, tourFocus };
}
