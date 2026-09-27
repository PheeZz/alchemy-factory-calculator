import { useLayoutEffect, useMemo, useRef, useState, type Ref, type RefObject } from 'react';
import type { GameData } from '@/shared/data/types';
import type { SolveResult } from '@/features/solver/types';
import { useNames, useT } from '@/shared/i18n';
import { FLOW_COLOR } from '../edges/FlowEdge';
import { fitLabel, layoutFlows, linkPath, toFlows, type FlowNode, type LaidNode } from './model';

// Presentation attributes with CSS variables (no classes): the SVG export resolves them into a standalone file.
const NODE_COLOR: Record<FlowNode['kind'], string> = {
  recipe: 'var(--color-arcane)',
  import: 'var(--color-flow)',
  target: 'var(--color-rose)',
  surplus: 'var(--color-ember)',
};

function useBoxSize(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: Math.floor(entry!.contentRect.width), height: Math.floor(entry!.contentRect.height) }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

type Active = { index: number; x: number; y: number };

/** Flow diagram of the solve: link width ∝ items/min, hover or focus lights the path a flow is on. */
export default function SankeyView({ data, result, svgRef }: { data: GameData; result: SolveResult; svgRef: Ref<SVGSVGElement> }) {
  const t = useT();
  const name = useNames();
  const box = useRef<HTMLDivElement>(null);
  const size = useBoxSize(box);
  const flows = useMemo(() => toFlows(data, result), [data, result]);
  const laid = useMemo(() => size && flows.links.length > 0 && layoutFlows(flows, size.width, size.height), [flows, size]);
  const [active, setActive] = useState<Active | null>(null);
  const activeIndex = active?.index;
  const lit = useMemo(() => (activeIndex === undefined ? null : linkPath(flows.links, activeIndex)), [flows, activeIndex]);

  const itemName = (id: string) => name(data.items[id]?.nameKey ?? id);
  const label = (n: LaidNode) => (n.item ? itemName(n.item) : n.id);
  const describe = (i: number) => {
    const l = laid ? laid.links[i]! : null;
    if (!l) return '';
    return `${itemName(l.item)}: ${label(l.source as LaidNode)} → ${label(l.target as LaidNode)} · ${t.rate(l.value)}`;
  };
  const activate = (index: number, el: Element, x?: number, y?: number) => {
    const r = el.getBoundingClientRect();
    setActive({ index, x: x ?? r.left + r.width / 2, y: y ?? r.top + r.height / 2 });
  };

  return (
    // The diagram starts below the stage toolbar (top padding), so no node or label sits under it.
    <div ref={box} className="absolute inset-0 overflow-auto pt-14">
      {laid && (
        <svg
          ref={svgRef}
          width={laid.width}
          height={laid.height}
          viewBox={`0 0 ${laid.width} ${laid.height}`}
          role="group"
          aria-label={t('graph.flows.label')}
          fontSize={11}
        >
          <g fill="none">
            {laid.links.map((l, i) => (
              <path
                key={i}
                d={laid.path(l) ?? undefined}
                stroke={FLOW_COLOR[l.kind]}
                strokeWidth={Math.max(1, l.width ?? 1)}
                strokeOpacity={lit ? (lit.has(i) ? 0.8 : 0.08) : 0.38}
                tabIndex={0}
                role="img"
                aria-label={describe(i)}
                className="cursor-help transition-[stroke-opacity] duration-150 outline-none"
                // Placed on entry, not tracked per mousemove: that would re-render every link each pixel.
                onMouseEnter={(e) => activate(i, e.currentTarget, e.clientX, e.clientY)}
                onMouseLeave={() => setActive(null)}
                onFocus={(e) => activate(i, e.currentTarget)}
                onBlur={() => setActive(null)}
              />
            ))}
          </g>
          {laid.nodes.map((n) => {
            const left = n.x0! < laid.width / 2;
            const full = label(n);
            const rate = t.rate(n.perMin);
            const shown = fitLabel(full, rate, laid.labelRoom);
            return (
              <g key={n.id}>
                {shown !== full && <title>{`${full} ${rate}`}</title>}
                <rect x={n.x0} y={n.y0} width={n.x1! - n.x0!} height={Math.max(1, n.y1! - n.y0!)} rx={2} fill={NODE_COLOR[n.kind]} />
                <text
                  x={left ? n.x1! + laid.labelGap : n.x0! - laid.labelGap}
                  y={(n.y0! + n.y1!) / 2}
                  dy="0.35em"
                  textAnchor={left ? 'start' : 'end'}
                  fill="var(--color-ink)"
                  className="pointer-events-none"
                >
                  {shown}
                  <tspan fill="var(--color-muted)"> {rate}</tspan>
                </text>
              </g>
            );
          })}
        </svg>
      )}
      {active && (
        <p
          role="tooltip"
          style={{ left: active.x + 12, top: active.y + 12 }}
          className="pointer-events-none fixed z-50 max-w-72 rounded-lg border border-line bg-abyss/95 px-2.5 py-1.5 text-xs leading-snug text-ink shadow-xl"
        >
          {describe(active.index)}
        </p>
      )}
    </div>
  );
}
