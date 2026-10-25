// Line icons drawn for this project (24-unit grid, currentColor). Shared
// with the web recreation, plus a few mobile-only marks.
import { memo } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

const paths = {
  packs: {"body":"<path d=\"M12 2.6 3.6 7.2v9.6L12 21.4l8.4-4.6V7.2L12 2.6Zm0 2.3 5.9 3.2L12 11.3 6.1 8.1 12 4.9ZM5.6 9.8l5.4 3v6.1l-5.4-3V9.8Zm7.4 9.1v-6.1l5.4-3v6.1l-5.4 3Z\"/>","fill":true,"stroke":1.9},
  battles: {"body":"<path d=\"M4 4l9.5 9.5M4 4v3.2M4 4h3.2M20 4l-9.5 9.5M20 4v3.2M20 4h-3.2\"/><path d=\"M8.3 15.7 5 19M15.7 15.7 19 19M6.7 13.4l3.9 3.9M17.3 13.4l-3.9 3.9\"/>","fill":false,"stroke":1.9},
  vault: {"body":"<path d=\"M5 4.5h14a2 2 0 0 1 2 2V9H3V6.5a2 2 0 0 1 2-2Zm-2 6h18v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7Zm7 2.2a.8.8 0 0 0 0 1.6h4a.8.8 0 0 0 0-1.6h-4Z\"/>","fill":true,"stroke":1.9},
  feed: {"body":"<circle cx=\"8.5\" cy=\"8\" r=\"3.4\"/><circle cx=\"16.6\" cy=\"8.6\" r=\"2.8\"/><path d=\"M2.4 18.4c.5-3.3 3-5.4 6.1-5.4s5.6 2.1 6.1 5.4c.1.6-.4 1.1-1 1.1H3.4c-.6 0-1.1-.5-1-1.1Z\"/><path d=\"M15.9 19.5c.6 0 1-.5.9-1.1a7.3 7.3 0 0 0-1.8-4.3c.5-.2 1-.3 1.6-.3 2.6 0 4.6 1.8 5 4.6.1.6-.3 1.1-.9 1.1h-4.8Z\"/>","fill":true,"stroke":1.9},
  rewards: {"body":"<path d=\"M7 3.5h10v1.6h3.2v2.1c0 2.4-1.7 4.3-4.1 4.6a5.1 5.1 0 0 1-3.2 2.9V17h2.6c.8 0 1.4.6 1.4 1.4v2H7.1v-2c0-.8.6-1.4 1.4-1.4h2.6v-2.4a5.1 5.1 0 0 1-3.2-2.9C5.5 11.4 3.8 9.6 3.8 7.2V5.1H7V3.5Zm-1.4 3.4v.3c0 1.3.7 2.4 1.7 2.8-.2-.5-.3-1-.3-1.6V6.9H5.6Zm11 1.5c0 .6-.1 1.1-.3 1.6 1-.4 1.7-1.5 1.7-2.8v-.3h-1.4v1.5Z\"/>","fill":true,"stroke":1.9},
  shipping: {"body":"<path d=\"m12 3 8 4.3v9.4L12 21l-8-4.3V7.3L12 3Z\"/><path d=\"m4.3 7.4 7.7 4.2 7.7-4.2M12 11.6V21M8 5.2l8 4.3\"/>","fill":false,"stroke":1.9},
  deposit: {"body":"<circle cx=\"12\" cy=\"12\" r=\"8.6\"/><path d=\"M12 8v8M8 12h8\"/>","fill":false,"stroke":1.9},
  withdraw: {"body":"<path d=\"M12 3v18M16.4 7.1C15.7 5.8 14.1 5 12.2 5 9.7 5 8 6.3 8 8.2c0 4.6 8.4 2.6 8.4 7.4 0 2-1.8 3.4-4.4 3.4-2 0-3.8-.9-4.5-2.4\"/>","fill":false,"stroke":2.2},
  sound: {"body":"<path d=\"M4 9.5h3.2L11.5 6v12l-4.3-3.5H4v-5Z\"/><path d=\"M15 9.2c.8.8 1.2 1.7 1.2 2.8s-.4 2-1.2 2.8M17.8 6.6A7.6 7.6 0 0 1 20 12a7.6 7.6 0 0 1-2.2 5.4\"/>","fill":false,"stroke":1.9},
  mute: {"body":"<path d=\"M4 9.5h3.2L11.5 6v12l-4.3-3.5H4v-5Z\"/><path d=\"m15.5 9.5 5 5M20.5 9.5l-5 5\"/>","fill":false,"stroke":1.9},
  chevronLeft: {"body":"<path d=\"m14.5 6-6 6 6 6\"/>","fill":false,"stroke":2.2},
  chevronRight: {"body":"<path d=\"m9.5 6 6 6-6 6\"/>","fill":false,"stroke":2.2},
  chevronUp: {"body":"<path d=\"m6 14.5 6-6 6 6\"/>","fill":false,"stroke":2.2},
  chevronDown: {"body":"<path d=\"m6 9.5 6 6 6-6\"/>","fill":false,"stroke":2.2},
  plus: {"body":"<path d=\"M12 5v14M5 12h14\"/>","fill":false,"stroke":1.8},
  minus: {"body":"<path d=\"M5 12h14\"/>","fill":false,"stroke":1.8},
  close: {"body":"<path d=\"m6 6 12 12M18 6 6 18\"/>","fill":false,"stroke":2},
  info: {"body":"<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M12 11v5.2M12 7.8v.2\"/>","fill":false,"stroke":1.8},
  send: {"body":"<path d=\"M12 19V5M6 11l6-6 6 6\"/>","fill":false,"stroke":2},
  grip: {"body":"<circle cx=\"9\" cy=\"6\" r=\"1.6\"/><circle cx=\"15\" cy=\"6\" r=\"1.6\"/><circle cx=\"9\" cy=\"12\" r=\"1.6\"/><circle cx=\"15\" cy=\"12\" r=\"1.6\"/><circle cx=\"9\" cy=\"18\" r=\"1.6\"/><circle cx=\"15\" cy=\"18\" r=\"1.6\"/>","fill":true,"stroke":1.9},
  search: {"body":"<circle cx=\"11\" cy=\"11\" r=\"6.5\"/><path d=\"m20 20-4.4-4.4\"/>","fill":false,"stroke":2},
  sliders: {"body":"<path d=\"M4 7h10M18 7h2M4 17h4M12 17h8\"/><circle cx=\"16\" cy=\"7\" r=\"2\"/><circle cx=\"10\" cy=\"17\" r=\"2\"/>","fill":false,"stroke":1.9},
  check: {"body":"<path d=\"m5 12.5 4.5 4.5L19 7.5\"/>","fill":false,"stroke":2.4},
  heart: {"body":"<path d=\"M12 19.5S4 15 4 9.3A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8 2.3c0 5.7-8 10.2-8 10.2Z\"/>","fill":false,"stroke":1.9},
  share: {"body":"<path d=\"M12 15V4M7.5 8.5 12 4l4.5 4.5M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5\"/>","fill":false,"stroke":1.9},
  copy: {"body":"<rect x=\"8\" y=\"8\" width=\"12\" height=\"12\" rx=\"2.5\"/><path d=\"M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2\"/>","fill":false,"stroke":1.9},
  arrowRight: {"body":"<path d=\"M5 12h14M13 6l6 6-6 6\"/>","fill":false,"stroke":2},
  gift: {"body":"<rect x=\"3.5\" y=\"8.5\" width=\"17\" height=\"4\" rx=\"1\"/><path d=\"M5 12.5V20h14v-7.5M12 8.5V20M12 8.5S11 4 8.5 4C7 4 6.5 5.2 6.8 6.2 7.3 8 12 8.5 12 8.5Zm0 0s1-4.5 3.5-4.5c1.5 0 2 1.2 1.7 2.2-.5 1.8-5.2 2.3-5.2 2.3Z\"/>","fill":false,"stroke":1.9},
  calendar: {"body":"<rect x=\"4\" y=\"5.5\" width=\"16\" height=\"14.5\" rx=\"2.5\"/><path d=\"M4 10h16M8.5 3.5v4M15.5 3.5v4\"/>","fill":false,"stroke":1.9},
  truck: {"body":"<path d=\"M3 6.5h11v10H3zM14 10h3.6l3.4 3.4v3.1h-7\"/><circle cx=\"7\" cy=\"17.5\" r=\"1.8\"/><circle cx=\"17.5\" cy=\"17.5\" r=\"1.8\"/>","fill":false,"stroke":1.9},
  card: {"body":"<rect x=\"3\" y=\"5.5\" width=\"18\" height=\"13\" rx=\"2.5\"/><path d=\"M3 10h18M7 15h4\"/>","fill":false,"stroke":1.9},
  bank: {"body":"<path d=\"M3.5 9.5 12 4.5l8.5 5M5 10v7M9.7 10v7M14.3 10v7M19 10v7M3.5 19.5h17\"/>","fill":false,"stroke":1.9},
  bolt: {"body":"<path d=\"M13.4 2.8 5.5 13.2h5.4l-1.2 8 8-10.6h-5.6l1.3-7.8Z\"/>","fill":true,"stroke":1.9},
  mail: {"body":"<rect x=\"3.5\" y=\"5.5\" width=\"17\" height=\"13\" rx=\"2.5\"/><path d=\"m4.5 7 7.5 6 7.5-6\"/>","fill":false,"stroke":1.9},
  key: {"body":"<circle cx=\"8\" cy=\"15\" r=\"4\"/><path d=\"m11 12 8.5-8.5M16.5 6.5l2.5 2.5M14 9l2 2\"/>","fill":false,"stroke":1.9},
  globe: {"body":"<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M3.5 12h17M12 3.5c2.4 2.5 3.6 5.3 3.6 8.5s-1.2 6-3.6 8.5c-2.4-2.5-3.6-5.3-3.6-8.5S9.6 6 12 3.5Z\"/>","fill":false,"stroke":1.8},
  bell: {"body":"<path d=\"M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2h-14l1.5-2Z\"/><path d=\"M10 20.5a2.2 2.2 0 0 0 4 0\"/>","fill":false,"stroke":1.8},
  wallet: {"body":"<path d=\"M4 7.5A2.5 2.5 0 0 1 6.5 5H17v3\"/><rect x=\"4\" y=\"8\" width=\"16\" height=\"11\" rx=\"2.5\"/><path d=\"M16 13.5h.01\"/>","fill":false,"stroke":1.8},
  logout: {"body":"<path d=\"M14 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7M17 8.5 20.5 12 17 15.5M20.5 12H10\"/>","fill":false,"stroke":1.9},
  pencil: {"body":"<path d=\"m15 5 4 4L8.5 19.5H4.5v-4L15 5Z\"/>","fill":false,"stroke":1.9},
  clock: {"body":"<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M12 7.5V12l3 2\"/>","fill":false,"stroke":1.9},
  cash: {"body":"<rect x=\"3\" y=\"6.5\" width=\"18\" height=\"11\" rx=\"2\"/><circle cx=\"12\" cy=\"12\" r=\"2.6\"/><path d=\"M6.5 9.5v5M17.5 9.5v5\"/>","fill":false,"stroke":1.8},
  chat: {"body":"<path d=\"M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 17h-7l-4.5 3.2V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5Z\"/><circle cx=\"9\" cy=\"11.3\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"15\" cy=\"11.3\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/>","fill":false,"stroke":1.8},
  camera: {"body":"<rect x=\"3.5\" y=\"3.5\" width=\"17\" height=\"17\" rx=\"5\"/><circle cx=\"12\" cy=\"12\" r=\"4\"/><circle cx=\"17.2\" cy=\"6.8\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/>","fill":false,"stroke":1.8},
  xmark: {"body":"<path d=\"M4.5 3.5h4.2l10.8 17h-4.2z\"/><path d=\"M19.5 3.5 13 10.6M4.5 20.5l6.6-7.2\"/>","fill":false,"stroke":1.7},
  file: {"body":"<path d=\"M6.5 3.5h7l4 4v13h-11z\"/><path d=\"M13.5 3.5v4h4M9 12h6M9 15.5h6\"/>","fill":false,"stroke":1.8},
  flame: {"body":"<path d=\"M12.2 2.5c.5 3.2-1.3 4.8-2.9 6.6-1.4 1.6-2.8 3.3-2.8 6a5.5 5.5 0 0 0 11 .1c0-2.1-.9-3.7-2-5-.1 1.3-.7 2.5-1.8 3 .6-3.6-.1-7.6-1.5-10.7Zm-.4 17.6a2.5 2.5 0 0 1-2.5-2.5c0-1.5 1.3-2.4 2.2-3.7.5 1.5 2.8 2 2.8 3.9 0 1.3-1.1 2.3-2.5 2.3Z\"/>","fill":true,"stroke":1.9},
  trophy: {"body":"<path d=\"M7 3.5h10v1.6h3.2v2.1c0 2.4-1.7 4.3-4.1 4.6a5.1 5.1 0 0 1-3.2 2.9V17h2.6c.8 0 1.4.6 1.4 1.4v2H7.1v-2c0-.8.6-1.4 1.4-1.4h2.6v-2.4a5.1 5.1 0 0 1-3.2-2.9C5.5 11.4 3.8 9.6 3.8 7.2V5.1H7V3.5Z\"/>","fill":true,"stroke":1.9},
  sparkle: {"body":"<path d=\"M12 2.5c.5 4.6 2.9 7 9.5 9.5-6.6 2.5-9 4.9-9.5 9.5-.5-4.6-2.9-7-9.5-9.5 6.6-2.5 9-4.9 9.5-9.5Z\"/>","fill":true,"stroke":1.9},
  shield: {"body":"<path d=\"M12 3.5 19 6v5.6c0 4.3-2.9 7.6-7 8.9-4.1-1.3-7-4.6-7-8.9V6l7-2.5Z\"/><path d=\"m9 12 2.2 2.2L15.5 10\"/>","fill":false,"stroke":1.9},
  sparkles: {"body":"<path d=\"M10 3c.4 3.9 2.4 5.9 8 8-5.6 2.1-7.6 4.1-8 8-.4-3.9-2.4-5.9-8-8 5.6-2.1 7.6-4.1 8-8Z\"/><path d=\"M18.5 2.5c.2 1.6 1 2.4 3 3-2 .6-2.8 1.4-3 3-.2-1.6-1-2.4-3-3 2-.6 2.8-1.4 3-3Z\"/>","fill":true,"stroke":1.9},
  grid: {"body":"<rect x=\"4\" y=\"4\" width=\"6.5\" height=\"8.5\" rx=\"1.6\"/><rect x=\"13.5\" y=\"4\" width=\"6.5\" height=\"8.5\" rx=\"1.6\"/><rect x=\"4\" y=\"15.5\" width=\"6.5\" height=\"4.5\" rx=\"1.4\"/><rect x=\"13.5\" y=\"15.5\" width=\"6.5\" height=\"4.5\" rx=\"1.4\"/>","fill":false,"stroke":1.9},
  settings: {"body":"<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5\"/><circle cx=\"12\" cy=\"12\" r=\"6.6\"/>","fill":false,"stroke":1.8},
  user: {"body":"<circle cx=\"12\" cy=\"8.5\" r=\"3.8\"/><path d=\"M4.8 20c.7-3.8 3.6-6 7.2-6s6.5 2.2 7.2 6\"/>","fill":false,"stroke":1.9},
  lock: {"body":"<rect x=\"5\" y=\"10.5\" width=\"14\" height=\"10\" rx=\"2.5\"/><path d=\"M8 10.5V8a4 4 0 0 1 8 0v2.5\"/>","fill":false,"stroke":1.9},
  refresh: {"body":"<path d=\"M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4\"/>","fill":false,"stroke":1.9},
  help: {"body":"<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.7M12 16.8v.2\"/>","fill":false,"stroke":1.9},
  compass: {"body":"<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><path d=\"m15.5 8.5-2 5-5 2 2-5 5-2Z\"/>","fill":false,"stroke":1.9},
  eye: {"body":"<path d=\"M2.8 12S6 5.8 12 5.8 21.2 12 21.2 12 18 18.2 12 18.2 2.8 12 2.8 12Z\"/><circle cx=\"12\" cy=\"12\" r=\"2.8\"/>","fill":false,"stroke":1.9},
  star: {"body":"<path d=\"m12 3.2 2.6 5.5 6 .7-4.4 4.1 1.2 5.9L12 16.5l-5.4 2.9 1.2-5.9-4.4-4.1 6-.7L12 3.2Z\"/>","fill":true,"stroke":1.9},
  target: {"body":"<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><circle cx=\"12\" cy=\"12\" r=\"4.6\"/><circle cx=\"12\" cy=\"12\" r=\".9\" fill=\"currentColor\" stroke=\"none\"/>","fill":false,"stroke":1.9},
  apple: {"body":"<path d=\"M16.4 12.7c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.8ZM14.1 5.9c.6-.8 1.1-1.8 1-2.9-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2.1-.5 2.7-1.3Z\"/>","fill":true,"stroke":1.9},
} as const;

export type IconName = keyof typeof paths;

function xml(name: IconName, stroke?: number) {
  const p = paths[name];
  return `<svg viewBox="0 0 24 24" fill="${p.fill ? 'currentColor' : 'none'}" stroke="${p.fill ? 'none' : 'currentColor'}" stroke-width="${stroke ?? p.stroke}" stroke-linecap="round" stroke-linejoin="round">${p.body}</svg>`;
}

export const Icon = memo(function Icon({ name, size = 20, color = '#f5f3ff', stroke }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  if (!paths[name]) return <View style={{ width: size, height: size }} />;
  return <SvgXml xml={xml(name, stroke)} width={size} height={size} color={color} />;
});

const MARK = `<svg viewBox="-50 -50 100 100"><defs><linearGradient id="mk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe6f7"/><stop offset=".4" stop-color="#c7a5ff"/><stop offset=".7" stop-color="#9b86ff"/><stop offset="1" stop-color="#dff6ff"/></linearGradient></defs><path fill="url(#mk)" fill-rule="evenodd" d="M0-46 39.8-23v46L0 46-39.8 23v-46Zm0 17L-25.1-14.5v29L0 29l25.1-14.5v-29Z"/><path fill="url(#mk)" d="M0-21Q2.5-2.5 21 0Q2.5 2.5 0 21Q-2.5 2.5-21 0Q-2.5-2.5 0-21Z"/></svg>`;

// The hexagon-and-sparkle brand mark.
export const Mark = memo(function Mark({ size = 24 }: { size?: number }) {
  return <SvgXml xml={MARK} width={size} height={size} />;
});

const GOOGLE_G = `<svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;

export const GoogleG = memo(function GoogleG({ size = 18 }: { size?: number }) {
  return <SvgXml xml={GOOGLE_G} width={size} height={size} />;
});
