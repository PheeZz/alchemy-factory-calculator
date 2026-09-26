const COLORS = ['#4fe3f1', '#b574ff', '#ff5fd2', '#ffb547', '#43e39b'];
const COUNT = 14;

/**
 * Short spark burst from an element's centre (a success cue: target added, fuel applied).
 * Plain DOM + WAAPI, transform/opacity only; lives on <body> so it survives a view switch.
 */
export function burstFrom(el: Element | null) {
  if (!el || typeof document === 'undefined' || !('animate' in HTMLElement.prototype)) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  for (let i = 0; i < COUNT; i++) {
    const dot = document.createElement('span');
    const angle = (i / COUNT) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 38 + Math.random() * 46;
    const color = COLORS[i % COLORS.length]!;
    Object.assign(dot.style, {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      width: '6px',
      height: '6px',
      margin: '-3px 0 0 -3px',
      borderRadius: '50%',
      background: color,
      boxShadow: `0 0 8px ${color}`,
      pointerEvents: 'none',
      zIndex: '70',
    });
    document.body.appendChild(dot);
    dot
      .animate(
        [
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          { transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) scale(0.2)`, opacity: 0 },
        ],
        { duration: 620 + Math.random() * 220, easing: 'cubic-bezier(.2,.7,.3,1)' },
      )
      .finished.finally(() => dot.remove());
  }
}
