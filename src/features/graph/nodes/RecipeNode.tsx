import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { mainOutput } from '@/entities/game';
import { useNames, useT } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { formatNumber, formatPercent, formatRate } from '@/shared/lib/format';
import { GlowBadge } from '@/shared/ui/GlowBadge';
import { Icon } from '@/shared/ui/Icon';
import { ItemIcon } from '@/shared/ui/ItemIcon';
import { Tooltip } from '@/shared/ui/Tooltip';
import { useGraphData } from '../context';
import type { RecipeFlowNode } from '../elements';

export const RecipeNode = memo(function RecipeNode({ data: { node, loops }, selected }: NodeProps<RecipeFlowNode>) {
  const t = useT();
  const name = useNames();
  const data = useGraphData();
  const recipe = data.recipes[node.recipe];
  const building = data.buildings[node.building];
  const out = recipe && mainOutput(recipe);
  const outItem = out && data.items[out.item];
  const itemName = (id: string) => name(data.items[id]?.nameKey ?? id);
  const title = outItem ? name(outItem.nameKey) : node.recipe;
  const buildingName = building ? name(building.nameKey) : node.building;
  const exact = formatNumber(t.lang, node.machinesExact, 1);
  const util = formatPercent(node.utilization);

  return (
    <div
      className={cx(
        'glass group relative flex h-full w-full flex-col justify-center gap-2 rounded-2xl px-3 py-2.5 transition-shadow duration-200',
        selected ? 'border-arcane/80 shadow-glow-arcane' : 'hover:border-white/25',
      )}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <div className="flex items-center gap-2.5">
        <span className="relative shrink-0">
          <ItemIcon icon={building?.icon ?? null} name={buildingName} seed={node.building} size={34} decorative />
          {outItem && (
            <ItemIcon
              icon={outItem.icon}
              name={title}
              seed={outItem.id}
              size={18}
              decorative
              className="absolute -right-1.5 -bottom-1.5 ring-2 ring-abyss"
            />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] leading-tight font-semibold text-ink">{title}</span>
          <span className="block truncate text-xs text-muted">{buildingName}</span>
        </span>
        {node.portWarnings.length > 0 && (
          <Tooltip
            content={node.portWarnings.map((w) => (
              <span key={w.item} className="block">
                {t('graph.portWarning', {
                  item: itemName(w.item),
                  perMachine: formatRate(t.lang, w.perMachine),
                  belt: formatRate(t.lang, w.beltSpeed),
                })}
              </span>
            ))}
          >
            <button type="button" className="nodrag rounded-full" aria-label={t('inspector.warnings')}>
              <GlowBadge tone="danger" glow className="px-1.5">
                <Icon name="alert" size={12} />
              </GlowBadge>
            </button>
          </Tooltip>
        )}
      </div>

      <p className="num text-[13px] text-muted" aria-label={t('graph.machines', { n: node.machines, exact, util })}>
        <span className="font-semibold text-ink">{node.machines}×</span> · {exact} ·{' '}
        <span className={node.utilization < 0.5 ? 'text-ember' : undefined}>{util}</span>
      </p>

      {(node.fuel || node.fertilizer || loops.length > 0) && (
      <div className="flex gap-1 overflow-hidden">
        {node.fuel && (
          <GlowBadge tone="ember" title={t('graph.fuel', { item: itemName(node.fuel.item), rate: formatRate(t.lang, node.fuel.rate) })}>
            <Icon name="flame" size={11} />
            {formatRate(t.lang, node.fuel.rate)}
          </GlowBadge>
        )}
        {node.fertilizer && (
          <GlowBadge
            tone="verdant"
            title={t('graph.fertilizer', { item: itemName(node.fertilizer.item), rate: formatRate(t.lang, node.fertilizer.rate) })}
          >
            <Icon name="leaf" size={11} />
            {formatRate(t.lang, node.fertilizer.rate)}
          </GlowBadge>
        )}
        {loops.map((l) => (
          <GlowBadge key={l.item} tone="muted" title={t('graph.loop', { item: itemName(l.item), rate: formatRate(t.lang, l.perMin) })}>
            <Icon name="loop" size={11} />
            {formatRate(t.lang, l.perMin)}
          </GlowBadge>
        ))}
      </div>
      )}
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  );
});
