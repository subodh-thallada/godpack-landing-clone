// Motion tokens: one set of curves, springs and enter/exit builders for the
// whole app, so nothing hand-rolls its own. Values from Emil Kowalski's
// animation guidance (animations.dev):
//   - ease-out for anything entering or leaving, ease-in-out for things
//     moving on screen, never ease-in on UI;
//   - UI motion under 300ms; press feedback 100-150ms;
//   - springs only where a finger (or velocity) is involved, given as
//     { duration, dampingRatio } and bounce only after a flick;
//   - nothing grows from scale(0); reduced motion is gentler, not none.
// Builders live at module scope so renders never rebuild them.
import type { ViewStyle } from 'react-native';
import {
  type CSSAnimationProperties,
  type CSSTransitionProperties,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  FadeOutLeft,
  FadeOutRight,
  LinearTransition,
  ReduceMotion,
  SlideInDown,
  SlideInUp,
  SlideOutDown,
  SlideOutUp,
  cubicBezier,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
export const EASE_SHEET = Easing.bezier(0.32, 0.72, 0, 1);

// Settle somewhere new with no overshoot (pose changes, repositioning).
export const SETTLE = { duration: 400, dampingRatio: 1 } as const;
// Snap back after a drag; pass the gesture's velocity alongside.
export const SNAP = { duration: 400, dampingRatio: 0.8 } as const;
// Sheets and drawers.
export const SHEET = { duration: 300, dampingRatio: 0.8 } as const;

export const DUR = { press: 120, small: 180, ui: 240, sheet: 300 } as const;

// Reanimated CSS transitions and animations. React Native's own style types
// only know string curves, while Reanimated wants curve objects, so these
// are typed through Reanimated's CSS types and then spread into an Animated
// component's style.
const css = (x: CSSTransitionProperties | CSSAnimationProperties) => x as unknown as ViewStyle;
export const T_PRESS = css({ transitionProperty: ['transform', 'opacity'], transitionDuration: [DUR.press, DUR.small], transitionTimingFunction: [cubicBezier(0.23, 1, 0.32, 1), 'ease'] });
export const T_COLOR = css({ transitionProperty: ['backgroundColor', 'borderColor'], transitionDuration: DUR.small - 30, transitionTimingFunction: 'ease' });
export const T_SETTLE = css({ transitionProperty: ['transform', 'opacity'], transitionDuration: DUR.ui, transitionTimingFunction: cubicBezier(0.23, 1, 0.32, 1) });
// A looping keyframe animation (a caret blink, a twinkle).
export const loop = (keyframes: CSSAnimationProperties['animationName'], duration: number, timing: CSSAnimationProperties['animationTimingFunction'] = 'ease', delay = 0) =>
  css({ animationName: keyframes, animationDuration: duration, animationIterationCount: 'infinite', animationTimingFunction: timing, animationDelay: delay });

// Step and content transitions: direction-aware slides, short fades out.
// Reduced motion keeps the fade (it explains the change) and drops the travel.
export const enterFwd = FadeInRight.duration(DUR.ui + 40).easing(EASE_OUT);
export const enterBack = FadeInLeft.duration(DUR.ui + 40).easing(EASE_OUT);
export const exitFwd = FadeOutLeft.duration(DUR.small - 40).easing(EASE_OUT);
export const exitBack = FadeOutRight.duration(DUR.small - 40).easing(EASE_OUT);
export const fadeIn = FadeIn.duration(DUR.small).easing(EASE_OUT);
export const fadeOut = FadeOut.duration(DUR.press).easing(EASE_OUT);
export const dropIn = FadeInDown.duration(DUR.ui).easing(EASE_OUT);
export const riseIn = FadeInUp.duration(DUR.ui).easing(EASE_OUT);
export const sheetIn = SlideInDown.duration(380).easing(EASE_SHEET);
export const sheetOut = SlideOutDown.duration(DUR.ui).easing(EASE_OUT);
// Exits run about 20% faster than their entrance.
export const toastIn = FadeInDown.duration(DUR.sheet).easing(EASE_OUT);
export const toastOut = FadeOutDown.duration(DUR.ui).easing(EASE_OUT);

// A list closing a gap or making room: things already on screen moving.
export const reflow = LinearTransition.duration(DUR.ui).easing(EASE_IN_OUT);

// A system banner drops from the top edge and leaves the same way.
export const bannerIn = SlideInUp.duration(DUR.sheet).easing(EASE_OUT);
export const bannerOut = SlideOutUp.duration(DUR.ui).easing(EASE_OUT);
// A heading's supporting line follows it by one stagger step.
export const dropInLate = FadeInDown.delay(50).duration(DUR.ui).easing(EASE_OUT);

// A list or group entrance: 30-80ms between items, never blocking taps.
// Prebuilt for the first few positions; later items share the last delay.
export const stagger = (i: number, step = 45) => FadeInDown.delay(Math.min(i, 8) * step).duration(DUR.ui).easing(EASE_OUT);
export const STAGGER = Array.from({ length: 9 }, (_, i) => stagger(i));
export const staggered = (i: number) => STAGGER[Math.min(i, STAGGER.length - 1)];

// Appear from 95% rather than from nothing.
export function scaleIn() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.95 }] },
    animations: {
      opacity: withTiming(1, { duration: DUR.small, easing: EASE_OUT }),
      transform: [{ scale: withTiming(1, { duration: DUR.ui, easing: EASE_OUT }) }],
    },
  };
}
export function scaleOut() {
  'worklet';
  return {
    initialValues: { opacity: 1, transform: [{ scale: 1 }] },
    animations: {
      opacity: withTiming(0, { duration: DUR.press, easing: EASE_OUT }),
      transform: [{ scale: withTiming(0.95, { duration: DUR.press, easing: EASE_OUT }) }],
    },
  };
}
// A playful pop for rare, first-run moments only (charms, a claimed card):
// starts at 60%, settles with a little overshoot.
export function popIn() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.6 }] },
    animations: {
      opacity: withTiming(1, { duration: DUR.small, easing: EASE_OUT }),
      transform: [{ scale: withSpring(1, { duration: 450, dampingRatio: 0.6, reduceMotion: ReduceMotion.System }) }],
    },
  };
}

// Where a flick would come to rest if it kept decelerating (Apple's
// exponential-decay projection).
export function project(velocity: number, decelerationRate = 0.998) {
  'worklet';
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

// Past an edge, the further you drag the less it follows.
export function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  'worklet';
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}
