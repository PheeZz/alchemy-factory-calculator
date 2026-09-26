import { useId, type ReactNode } from 'react';
import { cx } from '@/shared/lib/cx';

export function Panel({
  title,
  actions,
  className,
  children,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={title ? id : undefined} className={cx('glass relative rounded-panel p-4 focus-within:z-20', className)}>
      {title && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id={id} className="font-display text-[1.15rem] leading-tight text-ink">
            {title}
          </h2>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
