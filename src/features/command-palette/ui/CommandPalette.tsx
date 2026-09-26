import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import type { GameData } from '@/shared/data/types';
import { addItemAsTarget, showInFuelTiers } from '@/features/item-card/model/itemActions';
import { useItemCard } from '@/features/item-card/model/useItemCard';
import { useNames, useT } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { Icon } from '@/shared/ui/Icon';
import { ItemIcon } from '@/shared/ui/ItemIcon';
import { Modal } from '@/shared/ui/Modal';
import { toast } from '@/shared/ui/Toast';
import { buildIndex, searchIndex, type PaletteEntry } from '../lib/search';
import { MOD_KEY, usePalette } from '../model/usePalette';

function PaletteBody({ data, index }: { data: GameData; index: PaletteEntry[] }) {
  const t = useT();
  const name = useNames();
  const listId = useId();
  const setOpen = usePalette((s) => s.setOpen);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const results = useMemo(() => searchIndex(index, query), [index, query]);
  const optionId = (i: number) => `${listId}-${i}`;

  const openCard = (e: PaletteEntry) => {
    setOpen(false);
    useItemCard.getState().open(e.item);
  };
  const addTarget = (e: PaletteEntry) => {
    setOpen(false);
    addItemAsTarget(e.item);
    toast(t('card.added', { item: name(data.items[e.item]?.nameKey ?? e.item) }));
  };
  const toTiers = (e: PaletteEntry) => {
    setOpen(false);
    showInFuelTiers(e.item);
  };
  const isFuel = (e: PaletteEntry) => (data.items[e.item]?.heatValue ?? 0) > 0;

  const move = (i: number) => {
    setActive(i);
    document.getElementById(optionId(i))?.scrollIntoView({ block: 'nearest' });
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    const cur = results[active];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length) move((active + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length);
    } else if (e.key === 'Enter' && cur) {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) addTarget(cur);
      else openCard(cur);
    }
  };

  return (
    <div className="flex max-h-[inherit] flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Icon name="search" className="shrink-0 text-flow" />
        <input
          autoFocus
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={results[active] ? optionId(active) : undefined}
          aria-label={t('palette.open')}
          placeholder={t('palette.placeholder')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKey}
          className="h-14 min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-faint focus:outline-none"
        />
        <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-[11px] text-faint sm:inline">Esc</kbd>
      </div>

      <ul id={listId} role="listbox" aria-label={t('palette.items')} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">{t('palette.empty')}</li>}
        {results.map((e, i) => (
          <li
            key={`${e.kind}:${e.id}`}
            id={optionId(i)}
            role="option"
            aria-selected={i === active}
            onMouseMove={() => i !== active && setActive(i)}
            onClick={() => openCard(e)}
            className={cx(
              'group flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2',
              i === active ? 'bg-arcane/18 shadow-[inset_0_0_0_1px_rgb(181_116_255/0.45)]' : 'hover:bg-white/[0.03]',
            )}
          >
            <ItemIcon icon={e.icon} name={e.label} seed={e.item} size={28} decorative />
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-sm text-ink" title={e.label}>
                {e.label}
                {e.kind === 'recipe' && <span className="ml-2 text-[11px] text-faint">{t('palette.recipe')}</span>}
              </span>
              {e.detail && <span className="block truncate text-xs text-muted">← {e.detail}</span>}
            </span>
            {/* Mouse shortcuts for the active row; the keyboard has Enter / Mod+Enter (see footer). */}
            {i === active && (
              <span className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    addTarget(e);
                  }}
                  className="rounded-lg border border-line px-2 py-1 text-xs text-muted hover:border-flow/50 hover:text-ink"
                >
                  + {t('palette.addTarget')}
                </button>
                {isFuel(e) && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      toTiers(e);
                    }}
                    className="rounded-lg border border-ember/40 px-2 py-1 text-xs text-ember hover:border-ember/70"
                  >
                    {t('palette.fuel')}
                  </button>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>

      <p className="hidden border-t border-line px-4 py-2 text-[11px] text-faint sm:block">{t('palette.hint', { mod: MOD_KEY })}</p>
    </div>
  );
}

export function CommandPalette({ data }: { data: GameData }) {
  const t = useT();
  const name = useNames();
  const { open, setOpen } = usePalette();
  const index = useMemo(() => buildIndex(data, name), [data, name]);
  return (
    <Modal open={open} onClose={() => setOpen(false)} label={t('palette.title')}>
      <PaletteBody data={data} index={index} />
    </Modal>
  );
}
