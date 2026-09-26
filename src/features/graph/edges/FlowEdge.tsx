import { memo, type CSSProperties } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import { useNames, useT } from '@/shared/i18n';
import { ItemIcon } from '@/shared/ui/ItemIcon';
import { useGraphData } from '../context';
import type { FlowKind, GraphEdge } from '../elements';
import { roundedPath } from './path';

export const FLOW_COLOR: Record<FlowKind, string> = {
  item: 'var(--color-flow)',
  liquid: 'var(--color-liquid)',
  fuel: 'var(--color-ember)',
  fertilizer: 'var(--color-verdant)',
};

// Brighter core for the moving dots so they read as light on top of the tinted trunk.
const SPARK_COLOR: Record<FlowKind, string> = {
  item: '#b9f6fb',
  liquid: '#bcdcff',
  fuel: '#ffe0ad',
  fertilizer: '#b9f5d8',
};

export const FlowEdge = memo(function FlowEdge({
  id,
  data,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps<GraphEdge>) {
  const t = useT();
  const name = useNames();
  const item = useGraphData().items[data!.edge.item];
  const { edge, kind, durationSec, route } = data!;
  // ELK's orthogonal route when available (nodes are not draggable, so it never goes stale);
  // the bezier is only a fallback for an edge ELK returned without a section.
  const [bezier, bx, by] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const path = route ? roundedPath(route.points) : bezier;
  const labelX = route?.label?.x ?? bx;
  const labelY = route?.label?.y ?? by;
  const color = FLOW_COLOR[kind];
  const itemName = item ? name(item.nameKey) : edge.item;
  // Thicker trunk for multi-lane flows: belt count is the physically meaningful width.
  const width = 1.4 + Math.min(edge.belts, 4) * 0.6;

  return (
    <>
      {/* Glow is a wide translucent underlay, not a CSS filter: a filtered path is re-rasterised every
          frame while its dashes move, which cost ~50 % of frames on a 200-edge graph. */}
      <BaseEdge id={id} path={path} style={{ stroke: color, strokeOpacity: 0.16, strokeWidth: width + 6 }} />
      <path d={path} fill="none" stroke={color} strokeOpacity={0.5} strokeWidth={width} className="pointer-events-none" />
      {/* Running lights: round dots travelling at a speed ∝ log(items/min). */}
      <path
        d={path}
        fill="none"
        stroke={SPARK_COLOR[kind]}
        strokeWidth={width + 1.6}
        className="flow-spark pointer-events-none"
        style={{ '--flow-dur': `${durationSec}s` } as CSSProperties}
      />
      <EdgeLabelRenderer>
        <div
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          className="nodrag nopan pointer-events-none absolute flex items-center gap-1.5 rounded-full border border-line bg-void/90 py-0.5 pr-2.5 pl-1 text-[11px] text-ink"
        >
          <ItemIcon icon={item?.icon ?? null} name={itemName} seed={edge.item} size={16} />
          <span className="num">
            {t.rate(edge.perMin)}
            {edge.belts > 1 && <span className="text-muted"> · {t.plural('belts', edge.belts)}</span>}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
