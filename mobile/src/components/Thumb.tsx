// Card and slab art (.thumb) with the web app's tier glows (.glow-*).
import { Image } from 'expo-image';
import { memo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { cardImages, packImages, slabImages } from '../data/images';
import { colors, rgba, type Tier } from '../theme';

export const CARD_RATIO = 480 / 670;
export const SLAB_RATIO = 600 / 1005;
export const PACK_RATIO = 1060 / 1484;

// .glow-core / .glow-hit / .glow-chase / .glow-grail / .glow-base
const GLOW: Record<Tier, [number, number]> = { common: [20, 0.4], core: [20, 0.4], hit: [22, 0.5], chase: [24, 0.5], grail: [26, 0.55] };

export const Thumb = memo(function Thumb({
  id,
  graded,
  tier = 'common',
  width,
  large,
  glow = true,
  style,
}: {
  id: string;
  graded?: boolean;
  tier?: Tier;
  width: number;
  large?: boolean;
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const ratio = graded ? SLAB_RATIO : CARD_RATIO;
  const src = graded ? slabImages[id] : cardImages[id];
  const r = width * (graded ? 0.04 : 0.05);
  const [blur, alpha] = GLOW[tier];
  return (
    <View
      style={[
        { width, height: width / ratio, borderRadius: r, backgroundColor: colors.surface2 },
        glow ? { boxShadow: `0 0 ${Math.round(blur * Math.min(1, width / 100))}px ${rgba(tier, alpha)}` } : null,
        style,
      ]}
    >
      <Image source={large ? src?.lg : src?.sm} style={{ width: '100%', height: '100%', borderRadius: r }} contentFit={graded ? 'contain' : 'cover'} transition={120} accessibilityIgnoresInvertColors />
    </View>
  );
});

export const PackArt = memo(function PackArt({ art, width, large, style }: { art: string; width: number; large?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ width, height: width / PACK_RATIO }, style]}>
      <Image source={large ? packImages[art]?.lg : packImages[art]?.sm} style={{ width: '100%', height: '100%' }} contentFit="contain" transition={120} />
    </View>
  );
});
