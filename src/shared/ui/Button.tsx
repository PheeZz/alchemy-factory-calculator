import type { ComponentProps } from 'react';
import { cx } from '@/shared/lib/cx';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary:
    'cta-glow border-arcane/60 bg-arcane/18 text-ink hover:bg-arcane/28 hover:shadow-glow-arcane active:bg-arcane/35',
  ghost: 'border-line bg-white/[0.03] text-ink hover:border-white/25 hover:bg-white/[0.07]',
  danger: 'border-danger/40 text-danger hover:border-danger/70 hover:bg-danger/10',
};

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl border font-medium transition-[background-color,box-shadow,border-color] duration-200 disabled:pointer-events-none disabled:opacity-45';

export function Button({
  variant = 'ghost',
  size = 'md',
  icon,
  className,
  children,
  ...props
}: ComponentProps<'button'> & { variant?: Variant; size?: 'sm' | 'md'; icon?: IconName }) {
  return (
    <button
      type="button"
      className={cx(BASE, VARIANTS[variant], size === 'sm' ? 'h-8 px-3 text-[13px]' : 'h-10 px-4 text-sm', className)}
      {...props}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
      {children}
    </button>
  );
}

/** Icon-only action: the label is mandatory because it is the only accessible name. */
export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  className,
  ...props
}: Omit<ComponentProps<'button'>, 'children'> & { icon: IconName; label: string; variant?: Variant; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(BASE, VARIANTS[variant], size === 'sm' ? 'size-8' : 'size-10', className)}
      {...props}
    >
      <Icon name={icon} size={size === 'sm' ? 15 : 18} />
    </button>
  );
}
