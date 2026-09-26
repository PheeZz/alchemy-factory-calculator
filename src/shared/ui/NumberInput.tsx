import { useState, type ComponentProps } from 'react';
import { useT } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';

export const FIELD =
  'h-10 w-full rounded-xl border border-line bg-void/60 px-3 text-sm text-ink placeholder:text-faint transition-colors hover:border-white/25 focus:border-flow/70 focus:outline-none';

/** Accepts both `,` and `.` as decimal separator; only valid values ≥ 0 reach onChange. */
export function parseDecimal(text: string): number | null {
  const n = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(n) && n >= 0 ? n : null;
}

export function NumberInput({
  value,
  onChange,
  suffix,
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type'> & {
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  const t = useT();
  const shown = (v: number) => {
    const s = String(+v.toFixed(4));
    return t.lang === 'ru' ? s.replace('.', ',') : s;
  };
  // Draft text lives locally while focused so "1," or "" can be typed without being normalized away.
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? shown(value);
  const invalid = draft !== null && parseDecimal(draft) === null;

  return (
    <div className={cx('relative', className)}>
      <input
        {...props}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={text}
        aria-invalid={invalid || undefined}
        onFocus={(e) => {
          setDraft(text);
          props.onFocus?.(e);
        }}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = parseDecimal(e.target.value);
          if (n !== null) onChange(n);
        }}
        onBlur={(e) => {
          setDraft(null);
          props.onBlur?.(e);
        }}
        className={cx(FIELD, 'num text-right', suffix && 'pr-12', invalid && 'border-danger/70 focus:border-danger')}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-faint">
          {suffix}
        </span>
      )}
    </div>
  );
}
