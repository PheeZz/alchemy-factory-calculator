import type { ComponentProps } from 'react';
import { cx } from '@/shared/lib/cx';

export type Tone = 'flow' | 'arcane' | 'ember' | 'verdant' | 'danger' | 'muted';

const TONES: Record<Tone, string> = {
  flow: 'border-flow/35 bg-flow/10 text-flow',
  arcane: 'border-arcane/40 bg-arcane/12 text-[#d7b8ff]',
  ember: 'border-ember/35 bg-ember/10 text-ember',
  verdant: 'border-verdant/35 bg-verdant/10 text-verdant',
  danger: 'border-danger/50 bg-danger/15 text-[#ff9aa3]',
  muted: 'border-line bg-white/[0.04] text-muted',
};

const GLOWS: Partial<Record<Tone, string>> = {
  danger: 'shadow-[0_0_14px_-3px_var(--color-danger)]',
  ember: 'shadow-[0_0_14px_-4px_var(--color-ember)]',
  arcane: 'shadow-glow-arcane',
};

export function GlowBadge({
  tone = 'muted',
  glow = false,
  className,
  ...props
}: ComponentProps<'span'> & { tone?: Tone; glow?: boolean }) {
  return (
    <span
      className={cx(
        'num inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-4 font-medium whitespace-nowrap',
        TONES[tone],
        glow && GLOWS[tone],
        className,
      )}
      {...props}
    />
  );
}
