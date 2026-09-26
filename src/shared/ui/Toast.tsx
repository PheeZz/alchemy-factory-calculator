import { AnimatePresence, motion } from 'motion/react';
import { create } from 'zustand';
import { useT } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { Icon } from './Icon';

type ToastTone = 'info' | 'error';
interface ToastItem {
  id: number;
  text: string;
  tone: ToastTone;
}

let seq = 0;
const TTL_MS = 4500;

export const useToastStore = create<{
  toasts: ToastItem[];
  push: (text: string, tone?: ToastTone) => void;
  dismiss: (id: number) => void;
}>((set, get) => ({
  toasts: [],
  push: (text, tone = 'info') => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, tone }] }));
    setTimeout(() => get().dismiss(id), TTL_MS);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export const toast = (text: string, tone?: ToastTone) => useToastStore.getState().push(text, tone);

export function ToastViewport() {
  const t = useT();
  const { toasts, dismiss } = useToastStore();
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6"
    >
      <AnimatePresence initial={false}>
        {toasts.map((x) => (
          <motion.div
            key={x.id}
            layout
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={cx(
              'glass pointer-events-auto flex max-w-md items-center gap-3 rounded-xl py-2.5 pr-2 pl-4 text-sm',
              x.tone === 'error' && 'border-danger/50',
            )}
          >
            <span className="flex-1">{x.text}</span>
            <button
              type="button"
              onClick={() => dismiss(x.id)}
              aria-label={t('toast.dismiss')}
              className="grid size-7 place-items-center rounded-lg text-muted hover:bg-white/5 hover:text-ink"
            >
              <Icon name="close" size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
