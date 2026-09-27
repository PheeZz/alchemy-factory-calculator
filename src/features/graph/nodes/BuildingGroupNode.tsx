import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { useNames, useT } from '@/shared/i18n';
import { ItemIcon } from '@/shared/ui/ItemIcon';
import { useGraphData } from '../context';
import type { BuildingGroupNode as BuildingGroupFlowNode } from '../elements';

/** Frame behind the recipes that run on one building; purely visual (pointer events are off). */
export const BuildingGroupNode = memo(function BuildingGroupNode({ data }: NodeProps<BuildingGroupFlowNode>) {
  const t = useT();
  const name = useNames();
  const building = useGraphData().buildings[data.building];
  const title = building ? name(building.nameKey) : data.building;
  return (
    <div className="h-full w-full rounded-3xl border border-dashed border-arcane/40 bg-arcane/[0.06]">
      <p className="flex items-center gap-2 px-4 pt-2.5 text-[13px] font-semibold text-[#d7b8ff]">
        <ItemIcon icon={building?.icon ?? null} name={title} seed={data.building} size={22} decorative />
        <span className="truncate">{title}</span>
        <span className="num shrink-0 font-normal text-muted">· {t('graph.groupRecipes', { n: data.count })}</span>
      </p>
    </div>
  );
});
