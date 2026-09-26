import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from '@/shared/lib/cx';

/** WAI-ARIA tabs with automatic activation: arrows move and select, Home/End jump. */
export function Tabs<V extends string>({
  label,
  tabs,
  value,
  onChange,
  children,
}: {
  label: string;
  tabs: { value: V; label: string }[];
  value: V;
  onChange: (value: V) => void;
  children: ReactNode;
}) {
  const base = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent, i: number) => {
    const last = tabs.length - 1;
    const next = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    onChange(tabs[next]!.value);
    refs.current[next]?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label={label} className="mb-3 flex rounded-xl border border-line bg-void/50 p-1">
        {tabs.map((tab, i) => {
          const selected = tab.value === value;
          return (
            <button
              key={tab.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${tab.value}`}
              aria-selected={selected}
              aria-controls={`${base}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.value)}
              onKeyDown={(e) => onKey(e, i)}
              className={cx(
                'h-8 flex-1 rounded-lg text-[13px] font-medium transition-colors',
                selected ? 'bg-arcane/22 text-ink' : 'text-muted hover:text-ink',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-tab-${value}`}>
        {children}
      </div>
    </div>
  );
}
