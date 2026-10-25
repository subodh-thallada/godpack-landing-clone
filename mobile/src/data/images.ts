// Static image requires (React Native needs them spelled out).
/* eslint-disable @typescript-eslint/no-require-imports */
// Metro turns each bundled image into a numeric asset id.
type Src = number;

export const packImages: Record<string, { sm: Src; lg: Src }> = {
  arena: { sm: require('../../assets/packs/arena-480.webp'), lg: require('../../assets/packs/arena-720.webp') },
  master: { sm: require('../../assets/packs/master-480.webp'), lg: require('../../assets/packs/master-720.webp') },
  starter: { sm: require('../../assets/packs/starter-480.webp'), lg: require('../../assets/packs/starter-720.webp') },
  trainer: { sm: require('../../assets/packs/trainer-480.webp'), lg: require('../../assets/packs/trainer-720.webp') },
};

export const cardImages: Record<string, { sm: Src; lg: Src }> = {
  'aurora-peaks': { sm: require('../../assets/cards/aurora-peaks-200.webp'), lg: require('../../assets/cards/aurora-peaks.webp') },
  'coral-drift': { sm: require('../../assets/cards/coral-drift-200.webp'), lg: require('../../assets/cards/coral-drift.webp') },
  'crystal-hollow': { sm: require('../../assets/cards/crystal-hollow-200.webp'), lg: require('../../assets/cards/crystal-hollow.webp') },
  'ember-dunes': { sm: require('../../assets/cards/ember-dunes-200.webp'), lg: require('../../assets/cards/ember-dunes.webp') },
  'frost-halo': { sm: require('../../assets/cards/frost-halo-200.webp'), lg: require('../../assets/cards/frost-halo.webp') },
  'gilded-comet': { sm: require('../../assets/cards/gilded-comet-200.webp'), lg: require('../../assets/cards/gilded-comet.webp') },
  'moonlit-grove': { sm: require('../../assets/cards/moonlit-grove-200.webp'), lg: require('../../assets/cards/moonlit-grove.webp') },
  'nebula-bloom': { sm: require('../../assets/cards/nebula-bloom-200.webp'), lg: require('../../assets/cards/nebula-bloom.webp') },
  'prism-gate': { sm: require('../../assets/cards/prism-gate-200.webp'), lg: require('../../assets/cards/prism-gate.webp') },
  'solar-crown': { sm: require('../../assets/cards/solar-crown-200.webp'), lg: require('../../assets/cards/solar-crown.webp') },
  'storm-spire': { sm: require('../../assets/cards/storm-spire-200.webp'), lg: require('../../assets/cards/storm-spire.webp') },
  'tidal-glass': { sm: require('../../assets/cards/tidal-glass-200.webp'), lg: require('../../assets/cards/tidal-glass.webp') },
  'volcanic-heart': { sm: require('../../assets/cards/volcanic-heart-200.webp'), lg: require('../../assets/cards/volcanic-heart.webp') },
};

export const slabImages: Record<string, { sm: Src; lg: Src }> = {
  'aurora-peaks': { sm: require('../../assets/slabs/aurora-peaks-400.webp'), lg: require('../../assets/slabs/aurora-peaks-600.webp') },
  'coral-drift': { sm: require('../../assets/slabs/coral-drift-400.webp'), lg: require('../../assets/slabs/coral-drift-600.webp') },
  'crystal-hollow': { sm: require('../../assets/slabs/crystal-hollow-400.webp'), lg: require('../../assets/slabs/crystal-hollow-600.webp') },
  'ember-dunes': { sm: require('../../assets/slabs/ember-dunes-400.webp'), lg: require('../../assets/slabs/ember-dunes-600.webp') },
  'frost-halo': { sm: require('../../assets/slabs/frost-halo-400.webp'), lg: require('../../assets/slabs/frost-halo-600.webp') },
  'gilded-comet': { sm: require('../../assets/slabs/gilded-comet-400.webp'), lg: require('../../assets/slabs/gilded-comet-600.webp') },
  'moonlit-grove': { sm: require('../../assets/slabs/moonlit-grove-400.webp'), lg: require('../../assets/slabs/moonlit-grove-600.webp') },
  'nebula-bloom': { sm: require('../../assets/slabs/nebula-bloom-400.webp'), lg: require('../../assets/slabs/nebula-bloom-600.webp') },
  'prism-gate': { sm: require('../../assets/slabs/prism-gate-400.webp'), lg: require('../../assets/slabs/prism-gate-600.webp') },
  'solar-crown': { sm: require('../../assets/slabs/solar-crown-400.webp'), lg: require('../../assets/slabs/solar-crown-600.webp') },
  'storm-spire': { sm: require('../../assets/slabs/storm-spire-400.webp'), lg: require('../../assets/slabs/storm-spire-600.webp') },
  'tidal-glass': { sm: require('../../assets/slabs/tidal-glass-400.webp'), lg: require('../../assets/slabs/tidal-glass-600.webp') },
  'volcanic-heart': { sm: require('../../assets/slabs/volcanic-heart-400.webp'), lg: require('../../assets/slabs/volcanic-heart-600.webp') },
};

export const slabBack: Src = require('../../assets/slabs/slab-back-600.webp');
export const logoImage: Src = require('../../assets/logo.png');
