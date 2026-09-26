import type { Tier } from '../lib/tiers';

// S glows and pulses (the one accent on the page); C/D are muted so weak options recede.
export const TIER_STYLE: Record<Tier, { color: string; badge: string; bar: string }> = {
  S: { color: '#ffb547', badge: 'tier-s bg-[#ffb547]/20 text-[#ffcf85] ring-[#ffb547]/80', bar: 'bg-[#ffb547]' },
  A: { color: '#43e39b', badge: 'bg-[#43e39b]/15 text-[#7ff0bd] ring-[#43e39b]/60 shadow-[0_0_12px_-4px_#43e39b]', bar: 'bg-[#43e39b]' },
  B: { color: '#4fe3f1', badge: 'bg-[#4fe3f1]/12 text-[#8cedf6] ring-[#4fe3f1]/50 shadow-[0_0_10px_-5px_#4fe3f1]', bar: 'bg-[#4fe3f1]/80' },
  C: { color: '#b574ff', badge: 'bg-[#b574ff]/10 text-[#c9a4f5] ring-[#b574ff]/35', bar: 'bg-[#b574ff]/55' },
  D: { color: '#ff5d6c', badge: 'bg-[#ff5d6c]/8 text-[#e89aa1] ring-[#ff5d6c]/30', bar: 'bg-[#ff5d6c]/45' },
};
