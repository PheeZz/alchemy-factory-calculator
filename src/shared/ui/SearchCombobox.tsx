import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useT } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { ItemIcon } from './ItemIcon';
import { FIELD } from './NumberInput';

export interface ComboOption {
  value: string;
  label: string;
  /** Extra searchable text, e.g. the other language's name or the game id. */
  keywords?: string;
  icon: string | null;
}

const MAX_SHOWN = 60;

export function filterOptions(options: ComboOption[], query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return options;
  return options.filter((o) => {
    const hay = `${o.label} ${o.keywords ?? ''}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

/** WAI-ARIA combobox (list autocomplete): ↑↓ move, Enter picks, Esc closes and restores. */
export function SearchCombobox({
  options,
  value,
  onChange,
  label,
  placeholder,
  autoFocus,
  className,
}: {
  options: ComboOption[];
  value: string | null;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const t = useT();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;
  const shown = useMemo(() => filterOptions(options, query).slice(0, MAX_SHOWN), [options, query]);
  const optionId = (i: number) => `${listId}-o${i}`;

  const move = (i: number) => {
    setActive(i);
    listRef.current?.querySelector(`#${CSS.escape(optionId(i))}`)?.scrollIntoView({ block: 'nearest' });
  };
  const pick = (o: ComboOption | undefined) => {
    if (!o) return;
    onChange(o.value);
    setOpen(false);
    setQuery('');
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return setOpen(true);
      const d = e.key === 'ArrowDown' ? 1 : -1;
      move((active + d + shown.length) % Math.max(shown.length, 1));
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      pick(shown[active]);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div className={cx('relative', className)}>
      {selected && !open && (
        <ItemIcon
          icon={selected.icon}
          name={selected.label}
          seed={selected.value}
          size={20}
          decorative
          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
        />
      )}
      <input
        type="text"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && shown[active] ? optionId(active) : undefined}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        placeholder={open ? (selected?.label ?? placeholder) : placeholder}
        value={open ? query : (selected?.label ?? '')}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setQuery('');
        }}
        onKeyDown={onKey}
        className={cx(FIELD, 'truncate', selected && !open && 'pl-10')}
      />
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={label}
        hidden={!open}
        className="absolute inset-x-0 top-full z-40 mt-1.5 max-h-72 overflow-y-auto rounded-xl border border-line bg-abyss/95 p-1 shadow-2xl backdrop-blur-xl"
      >
        {shown.length === 0 && <li className="px-3 py-2.5 text-sm text-muted">{t('combobox.empty')}</li>}
        {shown.map((o, i) => (
          <li
            key={o.value}
            id={optionId(i)}
            role="option"
            aria-selected={o.value === value}
            // mousedown, not click: keeps focus in the input so blur does not close the list first.
            onMouseDown={(e) => {
              e.preventDefault();
              pick(o);
            }}
            onMouseMove={() => active !== i && setActive(i)}
            className={cx(
              'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm',
              i === active ? 'bg-arcane/20 text-ink' : 'text-ink/90',
              o.value === value && 'font-semibold',
            )}
          >
            <ItemIcon icon={o.icon} name={o.label} seed={o.value} size={22} decorative />
            <span className="truncate">{o.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
