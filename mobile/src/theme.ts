// Design tokens, taken one-to-one from the web app's CSS (app/css/app.css)
// so the phone app and the website share one visual system.
export const colors = {
  // surfaces
  bg: '#101014',
  panel: '#18161e',
  panelLine: '#35323e',
  surface: '#121119',
  surface2: '#1b1a25',
  surfaceHover: '#252333',
  line: '#2a2836',
  lineStrong: '#3a3849',
  control: '#302d3a',
  controlLine: '#625b73',
  action: '#24202d',
  dialog: '#17141f',
  dialogLine: '#3c3449',
  fieldLine: '#746d88',
  overlay: 'rgba(8,7,12,0.82)',

  // ink
  text: '#f5f3ff',
  label: '#f7f5ff',
  label2: '#bcb8ca',
  muted: '#a6a2bc',
  faint: '#8e8aa5',
  nav: '#aaa5b7',
  navOn: '#d0c0ff',
  head: '#d8d7df',

  // accent & status
  primary: '#7954ed',
  primaryDown: '#6a45dc',
  accentSoft: '#9d85ff',
  focus: '#ae83ff',
  money: '#3dd68c',
  online: '#3dd68c',
  switchOn: '#2fb877',
  switchOff: '#3d3b49',
  gold: '#ffc24b',
  info: '#39b4ff',
  danger: '#ff5c7a',
} as const;

export type Tier = 'common' | 'core' | 'hit' | 'chase' | 'grail';

// Tier colours (glows, odds bars, post tints) as RGB triples, like the CSS.
export const tierRgb: Record<Tier, [number, number, number]> = {
  common: [110, 106, 133],
  core: [57, 180, 255],
  hit: [157, 133, 255],
  chase: [255, 92, 170],
  grail: [255, 194, 75],
};
export const tierColor: Record<Tier, string> = {
  common: '#6e6a85',
  core: '#39b4ff',
  hit: '#9d85ff',
  chase: '#ff5caa',
  grail: '#ffc24b',
};
export const rgba = (t: Tier, a: number) => `rgba(${tierRgb[t].join(',')},${a})`;

export const radius = { sm: 8, field: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

export const type = {
  // .view-title-row h1
  title: { fontSize: 30, fontWeight: '800' as const, letterSpacing: -0.8, lineHeight: 35, color: colors.text },
  // .order__head h2, .shine-head
  h2: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.4, lineHeight: 29, color: colors.text },
  h3: { fontSize: 17, fontWeight: '700' as const, lineHeight: 22, color: colors.text },
  body: { fontSize: 15, fontWeight: '500' as const, lineHeight: 21, color: colors.muted },
  small: { fontSize: 13, fontWeight: '500' as const, lineHeight: 18, color: colors.muted },
  // .label-caps
  caps: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.4, lineHeight: 15, textTransform: 'uppercase' as const, color: colors.muted },
};

// Avatar colours a collector can pick, with names for screen readers.
export const AVATAR_COLORS = ['#7954ed', '#2f8fd6', '#e2603a', '#3aa36b', '#d9488f', '#26b5a8', '#d6a12b', '#5c6cff'];
export const COLOR_NAMES: Record<string, string> = {
  '#7954ed': 'Violet',
  '#2f8fd6': 'Blue',
  '#e2603a': 'Orange',
  '#3aa36b': 'Green',
  '#d9488f': 'Pink',
  '#26b5a8': 'Teal',
  '#d6a12b': 'Gold',
  '#5c6cff': 'Indigo',
};
