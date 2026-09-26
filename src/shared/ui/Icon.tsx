import type { SVGProps } from 'react';

// ponytail: hand-picked stroke paths instead of an icon package; add a library when this set outgrows ~20.
const PATHS = {
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  pencil: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  share: 'M4 12v7h16v-7M12 3v12M7 8l5-5 5 5',
  chevron: 'M6 9l6 6 6-6',
  alert: 'M12 3l10 18H2L12 3zM12 10v5M12 18v.01',
  flame: 'M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-3 2-4 2-6 1 1 1.5 2 1.5 3C12 8 11 6 12 3z',
  leaf: 'M5 19c0-9 5-14 15-14 0 10-5 15-14 15M5 19l7-7',
  loop: 'M17 2l3 3-3 3M20 5H9a5 5 0 00-5 5v1M7 22l-3-3 3-3M4 19h11a5 5 0 005-5v-1',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
  node: 'M4 4h7v7H4zM13 13h7v7h-7zM11 7.5h4.5V13',
  sum: 'M18 5H6l6 7-6 7h12',
  download: 'M12 4v11M7 10l5 5 5-5M4 19h16',
  upload: 'M12 20V9M7 14l5-5 5 5M4 5h16',
  infinity: 'M7.5 15.5a3.5 3.5 0 110-7c3 0 6 7 9 7a3.5 3.5 0 100-7c-3 0-6 7-9 7z',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, ...props }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
