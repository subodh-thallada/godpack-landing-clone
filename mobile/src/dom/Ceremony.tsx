'use dom';

// The website's pack-opening ceremony, running as a DOM component: inline
// on the web, in a WebView on iOS and Android. Same code, same animation.
// Button presses and closing are sent back to the native screen.
import type { DOMProps } from 'expo/dom';
import { useEffect, useRef } from 'react';
import './packdemo.js';

type Card = { id: string; name: string; value: number; tier: string };
type Action = { label: string; primary?: boolean };
type Demo = {
  preload: (pack: number) => Promise<void>;
  open: (opts: object) => { close: () => void };
};

declare global {
  interface Window {
    PackDemo: Demo;
    __PD_BASE__?: string;
  }
}

// Art lives in public/ceremony: under the site root on the web, the bundled public
// folder inside the native app.
function assetBase() {
  if (!process.env.EXPO_DOM_HOST_OS) return '/';
  const b = process.env.EXPO_BASE_URL ?? '/';
  return b.endsWith('/') ? b : `${b}/`;
}

export default function Ceremony({
  pack,
  card,
  actions,
  from,
  onAction,
  onClose,
}: {
  pack: number;
  card: Card;
  actions: Action[];
  // Where the pack is on screen when the ceremony starts, so it can fly in from there.
  from?: { x: number; y: number; w: number; h: number };
  onAction: (index: number) => Promise<void>;
  onClose: () => Promise<void>;
  dom?: DOMProps;
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.__PD_BASE__ = assetBase();
    let live = true;
    let ceremony: { close: () => void } | null = null;
    window.PackDemo.preload(pack)
      .catch(() => {})
      .then(() => {
        if (!live || !root.current) return;
        ceremony = window.PackDemo.open({
          root: root.current,
          pack,
          card,
          from,
          keyboard: false,
          actions: actions.map((a, i) => ({ ...a, onClick: () => onAction(i) })),
          onClose: () => {
            if (live) onClose();
          },
        });
      });
    return () => {
      live = false;
      ceremony?.close();
    };
    // The ceremony runs once per mount; the screen remounts it for a new pull.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={root}
      data-testid="ceremony-dom"
      style={{ position: 'fixed', inset: 0, background: '#000', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}
    />
  );
}
