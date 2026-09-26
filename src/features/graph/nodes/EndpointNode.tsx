import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useNames, useT, type DictKey } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { formatRate } from '@/shared/lib/format';
import { ItemIcon } from '@/shared/ui/ItemIcon';
import { useGraphData } from '../context';
import type { EndpointKind, ItemFlowNode } from '../elements';

// Each endpoint kind gets its own silhouette so the chain reads left→right without a legend:
// sources are cut flat on the left, the target is a sealed double ring, surplus is a dashed overflow.
const STYLE: Record<EndpointKind, { shell: string; label: string }> = {
  import: { shell: 'rounded-l-md rounded-r-full border-l-[3px] border-l-flow/70 pr-5', label: 'text-flow' },
  target: {
    shell: 'rounded-full border-rose/60 px-5 outline outline-1 outline-offset-[3px] outline-rose/25 shadow-[0_0_24px_-6px_var(--color-rose)]',
    label: 'text-rose',
  },
  surplus: { shell: 'rounded-full rounded-l-md border-dashed border-ember/50 pl-4', label: 'text-ember' },
};

function EndpointShell({ kind, data, selected }: { kind: EndpointKind; data: ItemFlowNode['data']; selected: boolean }) {
  const t = useT();
  const name = useNames();
  const item = useGraphData().items[data.item];
  const title = item ? name(item.nameKey) : data.item;
  const labelKey: DictKey = kind === 'import' ? (data.raw ? 'graph.raw' : 'graph.import') : `graph.${kind}`;

  return (
    <div
      className={cx(
        'glass-flat flex h-full w-full items-center gap-2.5 py-2 pl-3 transition-shadow',
        STYLE[kind].shell,
        selected && 'border-flow/80 shadow-glow-flow',
      )}
    >
      {kind !== 'import' && <Handle type="target" position={Position.Left} isConnectable={false} />}
      <ItemIcon icon={item?.icon ?? null} name={title} seed={data.item} size={28} decorative />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] leading-tight font-semibold text-ink" title={title}>
          {title}
        </span>
        <span className="num block truncate text-xs">
          <span className={STYLE[kind].label}>{t(labelKey)}</span>
          <span className="text-muted"> · {t('unit.perMin', { value: formatRate(t.lang, data.perMin) })}</span>
        </span>
      </span>
      {kind === 'import' && <Handle type="source" position={Position.Right} isConnectable={false} />}
    </div>
  );
}

export const ImportNode = memo(({ data, selected }: NodeProps<ItemFlowNode>) => (
  <EndpointShell kind="import" data={data} selected={!!selected} />
));
export const TargetNode = memo(({ data, selected }: NodeProps<ItemFlowNode>) => (
  <EndpointShell kind="target" data={data} selected={!!selected} />
));
export const SurplusNode = memo(({ data, selected }: NodeProps<ItemFlowNode>) => (
  <EndpointShell kind="surplus" data={data} selected={!!selected} />
));
