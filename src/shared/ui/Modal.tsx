import { useEffect, useRef, type ReactNode } from 'react';
import { cx } from '@/shared/lib/cx';

/**
 * Modal on native <dialog>: focus trap, Esc, inert page and aria-modal semantics come from the
 * platform. Centered panel on desktop, bottom sheet on phones (`.modal` in styles.css).
 */
export function Modal({
  open,
  onClose,
  labelledBy,
  label,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={cx('modal text-ink', className)}
    >
      {open && children}
    </dialog>
  );
}
