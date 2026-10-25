// A field of the logo's sparkles behind your avatar, fading out from the
// middle. A few of them twinkle.
import { memo, useMemo } from 'react';
import { View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';
import { loop } from '../lib/motion';

const SPARK = 'M12 0 C12.8 7.4 16.6 11.2 24 12 C16.6 12.8 12.8 16.6 12 24 C11.2 16.6 7.4 12.8 0 12 C7.4 11.2 11.2 7.4 12 0 Z';

const twinkle = (delay: number) => loop({ '0%': { opacity: 0.25 }, '50%': { opacity: 1 }, '100%': { opacity: 0.25 } }, 2400, 'ease-in-out', delay);

export const Sparkles = memo(function Sparkles({ cx, cy, width, height }: { cx: number; cy: number; width: number; height: number }) {
  const reduced = useReducedMotion();
  const dots = useMemo(() => {
    const out: { x: number; y: number; s: number; o: number }[] = [];
    const step = 34;
    const rx = width / 2;
    const ry = height / 2;
    for (let y = 0; y <= height; y += step) {
      for (let x = (y / step) % 2 ? step / 2 : 0; x <= width; x += step) {
        const d = Math.hypot((x - rx) / rx, (y - ry) / ry);
        if (d > 1 || d < 0.32) continue;
        // Deterministic jitter so the pattern doesn't read as a grid.
        const j = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const r = j - Math.floor(j);
        out.push({ x: x + (r - 0.5) * 10, y: y + (r - 0.5) * 8, s: 5 + r * 7, o: (1 - d) * 0.5 });
      }
    }
    return out;
  }, [width, height]);
  const twinkles = dots.filter((_, i) => i % 7 === 3).slice(0, 5);
  return (
    <View style={{ position: 'absolute', left: cx - width / 2, top: cy - height / 2, width, height }} pointerEvents="none">
      <Svg width={width} height={height}>
        {dots.map((d, i) => (
          <G key={i} transform={`translate(${d.x - d.s / 2} ${d.y - d.s / 2}) scale(${d.s / 24})`}>
            <Path d={SPARK} fill="#c7a5ff" opacity={d.o} />
          </G>
        ))}
      </Svg>
      {reduced
        ? null
        : twinkles.map((d, i) => (
            <Animated.View key={i} style={[{ position: 'absolute', left: d.x - d.s, top: d.y - d.s, width: d.s * 2, height: d.s * 2 }, twinkle(i * 450)]}>
              <Svg width="100%" height="100%" viewBox="0 0 24 24">
                <Path d={SPARK} fill="#ffe08a" />
              </Svg>
            </Animated.View>
          ))}
    </View>
  );
});
