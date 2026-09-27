import type { ReactNode } from 'react';
import { useT } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { trend } from '../lib/rows';

const TONE = { better: 'text-verdant', worse: 'text-danger', same: 'text-muted' } as const;
const ARROW = { better: '↓', worse: '↑', same: '=' } as const;

/**
 * B − A with a colored arrow; `children` is the formatted magnitude (always non-negative), the sign
 * comes from the arrow and a +/− prefix so a color-blind reader still gets the direction.
 */
export function DeltaValue({ delta, children, className }: { delta: number; children: ReactNode; className?: string }) {
  const t = useT();
  const tr = trend(delta);
  return (
    <span className={cx('num inline-flex items-center justify-end gap-1 font-semibold whitespace-nowrap', TONE[tr], className)}>
      <span aria-hidden="true">{ARROW[tr]}</span>
      {tr === 'same' ? '0' : <span className="inline-flex items-center">{delta > 0 ? '+' : '−'}{children}</span>}
      <span className="sr-only">({t(`compare.${tr}`)})</span>
    </span>
  );
}
