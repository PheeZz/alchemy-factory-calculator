import { useEffect, useRef, useState } from 'react';
import { animate } from 'motion/react';

/** Number that counts from its previous value to the new one; jumps straight there under reduced motion. */
export function CountUp({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const [shown, setShown] = useState(value);
  // Where the display currently is, so a new value mid-count continues from there instead of jumping.
  const current = useRef(value);
  useEffect(() => {
    const show = (v: number) => {
      current.current = v;
      setShown(v);
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || current.current === value) {
      show(value);
      return;
    }
    const controls = animate(current.current, value, { duration: 0.6, ease: [0.2, 0.7, 0.3, 1], onUpdate: show });
    return () => controls.stop();
  }, [value]);
  return <span className={`num ${className ?? ''}`}>{format(shown)}</span>;
}
