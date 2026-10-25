// The world keeps moving while you browse: open battles come and go, your
// shipments move along, unclaimed cards auto-sell, someone follows you, chat
// gets new messages and battles you post find an opponent a few seconds
// later.
import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { autoSell, checkShipments, dueBattle, matchBattle, maybeGainFollower, postScriptedChat, refreshLobby } from '../store/session';
import { tickMarket } from '../store/market';
import { toast } from './toast';

// Screens where a battle replay may open on its own.
const CALM = ['/packs', '/battles', '/market', '/vault', '/feed', '/rewards', '/profile'];

export function useWorld(enabled: boolean) {
  const path = usePathname();
  const pathRef = useRef(path);
  pathRef.current = path;

  useEffect(() => {
    if (!enabled) return;
    const lobby = setInterval(() => refreshLobby(), 20000);
    const ships = setInterval(() => checkShipments(), 5000);
    const sales = setInterval(() => autoSell(), 60000);
    const resume = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      autoSell();
      checkShipments();
      tickMarket();
    });
    const follower = setTimeout(() => {
      const h = maybeGainFollower();
      if (h) toast(`@${h} followed you`);
    }, 45000);
    const chat = setInterval(() => postScriptedChat(), 38000);
    // The market: answers to your offers and trades, sales, bids, new
    // listings. The most important thing that happened gets a toast.
    const marketBeat = () => {
      const ev = tickMarket();
      const top = ev.find((e) => e.tone === 'good') ?? ev[0];
      if (top) toast(top.title, top.tone === 'warn' ? 'warn' : top.tone === 'good' ? 'good' : 'default');
    };
    marketBeat();
    const market = setInterval(marketBeat, 3000);
    const battles = setInterval(() => {
      if (!CALM.includes(pathRef.current)) return;
      const due = dueBattle();
      if (!due) return;
      const match = matchBattle(due.id);
      if (!match) return;
      toast(`@${match.opponent} joined your battle`);
      router.push({ pathname: '/replay', params: { id: due.id } });
    }, 2000);
    return () => {
      clearInterval(lobby);
      clearInterval(ships);
      clearInterval(sales);
      resume.remove();
      clearTimeout(follower);
      clearInterval(chat);
      clearInterval(market);
      clearInterval(battles);
    };
  }, [enabled]);
}
