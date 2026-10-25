// A small area chart of your portfolio (cash + cards) over a time range.
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { money } from '../lib/format';
import { RANGES, type Range, type Session, portfolioSeries } from '../store/session';
import { colors } from '../theme';
import { Chip } from './ui';

export function PortfolioChart({ s }: { s: Session }) {
  const [range, setRange] = useState<Range>('1M');
  const [w, setW] = useState(320);
  const h = 140;
  const pts = useMemo(() => portfolioSeries(s, range), [s, range]);
  const { line, area, first, last } = useMemo(() => {
    const vals = pts.map((p) => p[1]);
    const lo = Math.min(...vals),
      hi = Math.max(...vals);
    const span = hi - lo || 1;
    const xy = pts.map((p, i) => [(i / (pts.length - 1)) * w, h - 10 - ((p[1] - lo) / span) * (h - 24)] as const);
    const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
    return { line, area: `${line}L${w} ${h}L0 ${h}Z`, first: vals[0], last: vals[vals.length - 1] };
  }, [pts, w]);
  const up = last >= first;
  const c = up ? colors.money : colors.danger;
  return (
    <View style={{ gap: 10 }} testID="portfolio">
      <View>
        <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 }}>Portfolio</Text>
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: '900', fontVariant: ['tabular-nums'] }} testID="portfolio-value">
          {money(last)}
        </Text>
        <Text style={{ color: c, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
          {up ? '+' : '−'}
          {money(Math.abs(last - first))} ({(((last - first) / (first || 1)) * 100).toFixed(1)}%) · {range}
        </Text>
      </View>
      <View onLayout={(e) => setW(Math.max(100, e.nativeEvent.layout.width))} accessibilityLabel={`Portfolio value over ${range}`}>
        <Svg width={w} height={h}>
          <Defs>
            <LinearGradient id="pf" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c} stopOpacity={0.28} />
              <Stop offset="1" stopColor={c} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>
          <Path d={area} fill="url(#pf)" />
          <Path d={line} stroke={c} strokeWidth={2.4} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        </Svg>
      </View>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {RANGES.map((r) => (
          <Chip key={r} label={r} on={r === range} onPress={() => setRange(r)} testID={`range-${r}`} />
        ))}
      </View>
    </View>
  );
}
