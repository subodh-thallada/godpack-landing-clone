// A battle's draw is fully determined by its seed, so the result can be
// settled the moment an opponent joins and the replay just plays it back.
import { CARDS, type Card, type Pack, seeded } from './index';

export type Drawn = { card: Card; value: number };

export function drawBattle(seed: number, pack: Pack, each: number, lowest: boolean) {
  const r = seeded(seed);
  const draw = (): Drawn[] =>
    Array.from({ length: each }, () => ({
      card: CARDS[Math.floor(r() * CARDS.length)],
      value: Math.round((pack.range[0] + (pack.price * 2.2 - pack.range[0]) * Math.pow(r(), 1.7)) * 100) / 100,
    }));
  const A = draw();
  const B = draw();
  const sum = (xs: Drawn[]) => xs.reduce((s, x) => s + x.value, 0);
  const totalA = sum(A);
  const totalB = sum(B);
  return { A, B, totalA, totalB, aWins: lowest ? totalA < totalB : totalA > totalB };
}
