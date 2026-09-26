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

/** Slow rising motes behind everything; stops on hidden tab and never runs under reduced motion. */
export function ParticlesBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let w = 0;
    let h = 0;
    let motes: Mote[] = [];
    let raf = 0;

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
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i]!;
        m.x += m.vx;
        m.y += m.vy;
        if (m.y < -10) motes[i] = spawn(w, h, false);
        const a = 0.12 + 0.18 * (0.5 + 0.5 * Math.sin(time / 1400 + m.phase));
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 5);
        g.addColorStop(0, `hsl(${m.hue} 95% 75% / ${a})`);
        g.addColorStop(1, `hsl(${m.hue} 95% 60% / 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r * 5, 0, Math.PI * 2);
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
    document.addEventListener('visibilitychange', sync);
    reduce.addEventListener('change', sync);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', sync);
      reduce.removeEventListener('change', sync);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />;
}
