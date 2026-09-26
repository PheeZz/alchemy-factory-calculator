/** Circle-triangle-square: the classic alchemical "philosopher's stone" sigil, drawn inline. */
export function Sigil({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={`${className} shrink-0 text-arcane drop-shadow-[0_0_6px_rgb(181_116_255/0.75)]`} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="20" cy="20" r="18" />
        <path d="M20 5.5 32.6 27.3H7.4Z" />
        <rect x="13.2" y="14.2" width="13.6" height="13.1" className="text-flow" stroke="var(--color-flow)" />
        <circle cx="20" cy="21" r="4.4" stroke="var(--color-ember)" />
      </g>
    </svg>
  );
}
