import type { ComponentProps } from 'react';
import { cx } from '@/shared/lib/cx';
import { Icon } from './Icon';
import { FIELD } from './NumberInput';

/** Native select: keyboard, mobile pickers and screen readers come for free. */
export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <div className={cx('relative', className)}>
      <select {...props} className={cx(FIELD, 'cursor-pointer appearance-none pr-9 [&>option]:bg-abyss')}>
        {children}
      </select>
      <Icon name="chevron" size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" />
    </div>
  );
}
