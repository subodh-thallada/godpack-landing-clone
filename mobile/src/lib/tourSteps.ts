// The first-run tour, worded around what the collector told us in onboarding.
import type { TourStep } from '../components/Tour';
import type { Answers } from '../store/prefs';
import { recommend } from './recommend';

export function tourSteps(a: Answers, balance: number, freePacks: number): TourStep[] {
  const setup = recommend(a);
  const battles = a.goals.includes('battle');
  const flip = a.goals.includes('flip');
  return [
    {
      target: 'wallet',
      icon: 'wallet',
      shape: 'pill',
      title: 'Your wallet',
      body: `This is your demo balance: $${balance.toFixed(2)} to play with. Tap it to add demo credit, withdraw or see your cards' value.`,
    },
    {
      target: 'open',
      icon: 'packs',
      title: 'Open packs here',
      body: `Swipe between packs and tap one to open it, or pick how many below. We picked ${setup.pack.name} for you${setup.safe ? ' with Safe mode on' : ''}. Odds are one tap away.`,
    },
    {
      target: 'tab-battles',
      icon: 'battles',
      shape: 'rect',
      title: battles ? 'Battles, like you asked' : 'Battle other collectors',
      body: 'Two collectors open the same packs. The bigger total takes every card — or the smaller one in Lowest wins.',
    },
    {
      target: 'tab-market',
      icon: 'market',
      shape: 'rect',
      title: 'Buy, sell and trade',
      body: 'The Market: buy cards other collectors list, bid on auctions, make offers, and trade — two for one, or cards plus cash.',
    },
    {
      target: 'tab-vault',
      icon: 'vault',
      shape: 'rect',
      title: flip ? 'Sell from your Vault' : 'Your Vault',
      body: 'Every card you pull lands here. Sell it back instantly for 95% of its value, or ship it to your door.',
    },
    {
      target: 'tab-feed',
      icon: 'feed',
      shape: 'rect',
      title: 'Follow collectors',
      body: "See everyone's pulls as they happen, follow collectors you like, replay battles and chat.",
    },
    {
      target: 'tab-rewards',
      icon: 'gift',
      shape: 'rect',
      title: freePacks ? `${freePacks} free pack waiting` : 'Rewards',
      body: 'Check in every day — seven in a row earns a free pack. Your VIP tier lowers the sell-back fee as you open more.',
    },
  ];
}
