import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useT } from '@/shared/i18n';
import { IconButton } from './Button';

/**
 * Mobile bottom sheet on native <dialog>: focus trap, Esc and inert background come from the platform.
 * Slide-in is pure CSS (`.sheet` in styles.css) so reduced-motion is handled in one place.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="sheet glass text-ink"
    >
      <div className="flex max-h-[82dvh] flex-col">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/20" aria-hidden="true" />
        <div className="flex items-center justify-between px-4 pt-2 pb-3">
          <h2 id={titleId} className="font-display text-xl">
            {title}
          </h2>
          <IconButton icon="close" label={t('sheet.close')} size="sm" onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </dialog>
  );
}
