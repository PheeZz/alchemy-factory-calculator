import { useId } from 'react';
import { cx } from '@/shared/lib/cx';

/** Single-choice switch on native radios: arrow keys, form semantics and screen readers for free. */
export function Segmented<V extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: { value: V; label: string }[];
  value: V;
  onChange: (value: V) => void;
  className?: string;
}) {
  const name = useId();
  return (
    <fieldset className={cx('min-w-0', className)}>
      <legend className="mb-1.5 text-xs font-medium text-faint">{label}</legend>
      <div className="flex flex-wrap rounded-xl border border-line bg-void/50 p-1">
        {options.map((o) => (
          <label
            key={o.value}
            className={cx(
              'relative flex h-8 min-w-0 flex-1 cursor-pointer items-center justify-center rounded-lg px-3 text-[13px] font-medium whitespace-nowrap transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-flow',
              o.value === value ? 'bg-arcane/22 text-ink' : 'text-muted hover:text-ink',
            )}
          >
            <input type="radio" name={name} value={o.value} checked={o.value === value} onChange={() => onChange(o.value)} className="sr-only" />
            <span className="truncate" title={o.label}>
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
