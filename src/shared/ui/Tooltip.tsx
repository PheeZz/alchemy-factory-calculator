import { cloneElement, useId, type ReactElement, type ReactNode } from 'react';

/** CSS-only tooltip on hover and keyboard focus; the trigger must be focusable (button/link). */
export function Tooltip({ content, children }: { content: ReactNode; children: ReactElement<{ 'aria-describedby'?: string }> }) {
  const id = useId();
  return (
    <span className="group/tip relative inline-flex">
      {cloneElement(children, { 'aria-describedby': id })}
      <span
        role="tooltip"
        id={id}
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-64 -translate-x-1/2 translate-y-1 rounded-lg border border-line bg-abyss/95 px-2.5 py-1.5 text-xs leading-snug text-ink opacity-0 shadow-xl backdrop-blur transition duration-150 group-focus-within/tip:visible group-focus-within/tip:translate-y-0 group-focus-within/tip:opacity-100 group-hover/tip:visible group-hover/tip:translate-y-0 group-hover/tip:opacity-100"
      >
        {content}
      </span>
    </span>
  );
}
