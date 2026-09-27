import { cx } from '@/shared/lib/cx';
import type { Tier } from '@/shared/lib/tiers';
import { TIER_STYLE } from './tierStyle';

export function TierBadge({ tier, size = 'md', label }: { tier: Tier | null; size?: 'md' | 'lg'; label: string }) {
  return (
    <span
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      className={cx(
        'grid shrink-0 place-items-center rounded-xl font-display font-bold ring-1',
        size === 'lg' ? 'size-12 text-2xl' : 'size-10 text-xl',
        tier ? TIER_STYLE[tier].badge : 'bg-white/5 text-faint ring-line',
      )}
    >
      {tier ?? '—'}
    </span>
  );
}
