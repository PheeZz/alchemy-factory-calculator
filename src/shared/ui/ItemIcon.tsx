import { useState } from 'react';
import { cx } from '@/shared/lib/cx';

function hue(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 360;
}

/**
 * Game icon with a glyph fallback for null/404 icons. `decorative` hides it from assistive tech
 * when the localized name is already printed next to it (avoids reading the name twice).
 */
export function ItemIcon({
  icon,
  name,
  seed = name,
  size = 24,
  decorative = false,
  className,
}: {
  icon: string | null;
  name: string;
  seed?: string;
  size?: number;
  decorative?: boolean;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const a11y = decorative ? { 'aria-hidden': true } : { role: 'img', 'aria-label': name };

  if (!icon || failedSrc === icon) {
    const h = hue(seed);
    return (
      <span
        {...a11y}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.52,
          color: `hsl(${h} 85% 80%)`,
          background: `radial-gradient(circle at 35% 30%, hsl(${h} 60% 32%), hsl(${h} 55% 14%))`,
          boxShadow: `inset 0 0 0 1px hsl(${h} 70% 60% / 0.45)`,
        }}
        className={cx('inline-grid shrink-0 place-items-center rounded-[30%] font-display leading-none select-none', className)}
      >
        {Array.from(name.trim())[0]?.toUpperCase() ?? '?'}
      </span>
    );
  }

  return (
    <img
      src={`${import.meta.env.BASE_URL}${icon}`}
      alt={decorative ? '' : name}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailedSrc(icon)}
      className={cx('shrink-0 object-contain', className)}
    />
  );
}
