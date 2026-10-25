// A small stand-in for react-native-reanimated in Jest: animated components
// are plain views, styles are computed once, animations finish immediately
// and reduced motion is on (so reveal sequences complete synchronously).
const React = require('react');
const RN = require('react-native');

// Chainable layout-animation builders: FadeIn.delay(100).springify()…
const chain = () =>
  new Proxy(function builder() {}, {
    get: () => chain(),
    apply: () => chain(),
  });

const createAnimatedComponent = (Component) =>
  React.forwardRef(function Animated({ entering, exiting, layout, animatedProps, ...props }, ref) {
    return React.createElement(Component, { ...props, ref });
  });

const Animated = {
  View: createAnimatedComponent(RN.View),
  Text: createAnimatedComponent(RN.Text),
  ScrollView: createAnimatedComponent(RN.ScrollView),
  Image: createAnimatedComponent(RN.Image),
  createAnimatedComponent,
};

const done = (value, _config, callback) => {
  if (typeof callback === 'function') callback(true);
  return value;
};

function interpolate(x, input, output) {
  if (x <= input[0]) return output[0];
  for (let i = 1; i < input.length; i++) {
    if (x <= input[i]) return output[i - 1] + ((x - input[i - 1]) / (input[i] - input[i - 1])) * (output[i] - output[i - 1]);
  }
  return output[output.length - 1];
}

const identity = (t) => t;
const Easing = new Proxy({}, { get: () => (...args) => (typeof args[0] === 'function' ? args[0] : identity) });

module.exports = {
  __esModule: true,
  default: Animated,
  ...Animated,
  useSharedValue: (v) => {
    const ref = React.useRef(null);
    if (!ref.current) {
      const sv = { value: v, get: () => sv.value, set: (n) => (sv.value = typeof n === 'function' ? n(sv.value) : n) };
      ref.current = sv;
    }
    return ref.current;
  },
  useAnimatedStyle: (fn) => fn(),
  useAnimatedProps: (fn) => fn(),
  useAnimatedScrollHandler: () => () => {},
  useAnimatedReaction: () => {},
  useReducedMotion: () => true,
  withTiming: done,
  withSpring: done,
  withDelay: (_ms, value) => value,
  withRepeat: (value) => value,
  withSequence: (...values) => values[values.length - 1],
  cancelAnimation: () => {},
  interpolate,
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
  runOnJS: (fn) => fn,
  Easing,
  // CSS timing functions are plain descriptors here.
  cubicBezier: (x1, y1, x2, y2) => ({ name: 'cubicBezier', x1, y1, x2, y2 }),
  linear: (...points) => ({ name: 'linear', points }),
  steps: (n, modifier) => ({ name: 'steps', n, modifier }),
  FadeIn: chain(),
  FadeInDown: chain(),
  FadeInUp: chain(),
  FadeInLeft: chain(),
  FadeInRight: chain(),
  FadeOut: chain(),
  FadeOutDown: chain(),
  FadeOutLeft: chain(),
  FadeOutRight: chain(),
  FadeOutUp: chain(),
  SlideInDown: chain(),
  SlideInLeft: chain(),
  SlideInRight: chain(),
  SlideInUp: chain(),
  SlideOutDown: chain(),
  SlideOutUp: chain(),
  ZoomIn: chain(),
  ZoomOut: chain(),
  LinearTransition: chain(),
};
