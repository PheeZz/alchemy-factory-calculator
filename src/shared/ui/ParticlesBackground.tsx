import { useEffect, useRef } from 'react';

const COUNT = 48;
const HUES = [272, 186, 38, 300];

interface Mote {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  hue: number;
  phase: number;
}

const spawn = (w: number, h: number, anywhere: boolean): Mote => ({
  x: Math.random() * w,
  y: anywhere ? Math.random() * h : h + 10,
  r: 0.6 + Math.random() * 1.5,
  vx: (Math.random() - 0.5) * 0.08,
  vy: -(0.05 + Math.random() * 0.16),
  hue: HUES[Math.floor(Math.random() * HUES.length)]!,
  phase: Math.random() * Math.PI * 2,
});

/**
 * Slow rising motes over a soft nebula, both drifting with the cursor for depth (bigger motes move
 * more). Stops on a hidden tab and never runs under reduced motion.
 */
export function ParticlesBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  const nebula = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let w = 0;
    let h = 0;
    let motes: Mote[] = [];
    let raf = 0;
    // Pointer offset from the centre in -0.5..0.5, eased so the scene glides after the cursor.
    const target = { x: 0, y: 0 };
    const eased = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      target.x = e.clientX / w - 0.5;
      target.y = e.clientY / h - 0.5;
    };

    const resize = () => {
      const dpr = Math.min(devicePixelRatio, 2);
      w = innerWidth;
      h = innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      motes = Array.from({ length: COUNT }, () => spawn(w, h, true));
    };

    const frame = (time: number) => {
      eased.x += (target.x - eased.x) * 0.04;
      eased.y += (target.y - eased.y) * 0.04;
      if (nebula.current) nebula.current.style.transform = `translate3d(${eased.x * -36}px, ${eased.y * -28}px, 0)`;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i]!;
        m.x += m.vx;
        m.y += m.vy;
        if (m.y < -10) motes[i] = spawn(w, h, false);
        const px = m.x + eased.x * 22 * m.r;
        const py = m.y + eased.y * 16 * m.r;
        const a = 0.12 + 0.18 * (0.5 + 0.5 * Math.sin(time / 1400 + m.phase));
        const g = ctx.createRadialGradient(px, py, 0, px, py, m.r * 5);
        g.addColorStop(0, `hsl(${m.hue} 95% 75% / ${a})`);
        g.addColorStop(1, `hsl(${m.hue} 95% 60% / 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, m.r * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };

    const sync = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      if (reduce.matches || document.hidden) {
        ctx.clearRect(0, 0, w, h);
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    resize();
    sync();
    addEventListener('resize', resize);
    addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', sync);
    reduce.addEventListener('change', sync);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', resize);
      removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', sync);
      reduce.removeEventListener('change', sync);
    };
  }, []);

  return (
    <>
      <div
        ref={nebula}
        aria-hidden="true"
        className="pointer-events-none fixed -inset-12 -z-10 will-change-transform"
        style={{
          background:
            'radial-gradient(40% 35% at 22% 30%, rgb(181 116 255 / 0.13), transparent 70%), radial-gradient(35% 30% at 78% 70%, rgb(79 227 241 / 0.09), transparent 70%), radial-gradient(30% 25% at 60% 18%, rgb(255 95 210 / 0.06), transparent 70%)',
        }}
      />
      <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />
    </>
  );
}
