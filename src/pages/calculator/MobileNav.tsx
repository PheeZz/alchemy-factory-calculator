import { useT } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { Icon, type IconName } from '@/shared/ui/Icon';

export type SheetId = 'targets' | 'upgrades' | 'inspector' | 'summary';

const ITEMS: { id: SheetId; icon: IconName }[] = [
  { id: 'targets', icon: 'layers' },
  { id: 'upgrades', icon: 'sliders' },
  { id: 'inspector', icon: 'node' },
  { id: 'summary', icon: 'sum' },
];

export function MobileNav({ open, onOpen, hasSelection }: { open: SheetId | null; onOpen: (id: SheetId) => void; hasSelection: boolean }) {
  const t = useT();
  return (
    <nav aria-label={t('nav.label')} className="border-t border-line/70 bg-void/80 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      <ul className="grid grid-cols-4">
        {ITEMS.map(({ id, icon }) => (
          <li key={id}>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={open === id}
              onClick={() => onOpen(id)}
              className={cx(
                'relative flex h-14 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                open === id ? 'text-ink' : 'text-muted hover:text-ink',
              )}
            >
              <Icon name={icon} size={20} />
              {t(`nav.${id}`)}
              {id === 'inspector' && hasSelection && (
                <span className="absolute top-2.5 right-[calc(50%-16px)] size-1.5 rounded-full bg-arcane shadow-[0_0_6px_var(--color-arcane)]" />
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
