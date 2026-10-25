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
  useSharedValue: (v) => React.useRef({ value: v }).current,
  useAnimatedStyle: (fn) => fn(),
  useAnimatedProps: (fn) => fn(),
  useAnimatedScrollHandler: () => () => {},
  useReducedMotion: () => true,
  withTiming: done,
  withSpring: done,
  withDelay: (_ms, value) => value,
  withRepeat: (value) => value,
  withSequence: (...values) => values[values.length - 1],
  cancelAnimation: () => {},
  interpolate,
  runOnJS: (fn) => fn,
  Easing,
  FadeIn: chain(),
  FadeInDown: chain(),
  FadeInUp: chain(),
  FadeInLeft: chain(),
  FadeOut: chain(),
  FadeOutDown: chain(),
  SlideInDown: chain(),
  SlideInLeft: chain(),
  SlideInRight: chain(),
  ZoomIn: chain(),
  LinearTransition: chain(),
};
