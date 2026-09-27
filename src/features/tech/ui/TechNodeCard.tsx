import { memo } from 'react';
import type { GameData, TechNode } from '@/shared/data/types';
import { mainOutput } from '@/entities/game';
import { Coins } from '@/shared/ui/Coins';
import { useNames, useT } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { formatNumber } from '@/shared/lib/format';
import { ItemIcon } from '@/shared/ui/ItemIcon';
import { useTechLabel } from '../model/useTechLabel';

const MAX_ICONS = 7;

/** Icons of what a node unlocks: recipes (by product), machines (incl. décor outside GameData), items. */
function useUnlockIcons(data: GameData, n: TechNode) {
  const name = useNames();
  const recipes = n.unlocks.recipes.map((id) => {
    const out = data.recipes[id] && mainOutput(data.recipes[id]);
    const item = out ? data.items[out.item] : undefined;
    return { key: `r:${id}`, icon: item?.icon ?? null, label: item ? name(item.nameKey) : id };
  });
  const buildings = n.unlocks.buildings.map((id) => {
    const b = data.buildings[id];
    // Workbench/décor buildings are not in GameData; their icon and name follow the same conventions.
    return {
      key: `b:${id}`,
      icon: b?.icon ?? `icons/${data.build.id}/buildings/${id}.webp`,
      label: name(b?.nameKey ?? `Building_Name_${id}`),
    };
  });
  const items = n.unlocks.items.map((id) => ({ key: `i:${id}`, icon: data.items[id]?.icon ?? null, label: name(data.items[id]?.nameKey ?? id) }));
  return [...recipes, ...buildings, ...items];
}

export const TechNodeCard = memo(function TechNodeCard({
  data,
  node,
  learned,
  onToggle,
}: {
  data: GameData;
  node: TechNode;
  learned: boolean;
  onToggle: (id: string) => void;
}) {
  const t = useT();
  const label = useTechLabel()(node);
  const icons = useUnlockIcons(data, node);
  const level = node.nameKey === null;
  return (
    <button
      type="button"
      aria-pressed={learned}
      onClick={() => onToggle(node.id)}
      title={icons.map((i) => i.label).join(', ')}
      className={cx(
        'group flex w-full flex-col gap-2 rounded-xl border p-2.5 text-left transition-[border-color,box-shadow,opacity] duration-200',
        learned
          ? 'border-verdant/50 bg-verdant/[0.07] shadow-[0_0_18px_-10px_var(--color-verdant)]'
          : 'border-line bg-abyss/70 opacity-70 hover:opacity-100',
        'hover:border-flow/50',
      )}
    >
      <span className="flex items-center gap-2">
        {level ? (
          <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-ember/50 bg-ember/10 font-display text-sm text-ember">
            {node.stage + 1}
          </span>
        ) : (
          <ItemIcon icon={node.icon} name={label} seed={node.id} size={32} decorative />
        )}
        <span className="line-clamp-2 min-w-0 flex-1 text-[13px] leading-snug font-medium text-ink">{label}</span>
        <span
          aria-hidden="true"
          className={cx('size-2.5 shrink-0 rounded-full', learned ? 'bg-verdant shadow-[0_0_8px_var(--color-verdant)]' : 'bg-white/15')}
        />
      </span>
      <span className="num flex items-center justify-between gap-2 text-[11px] text-muted">
        <Coins copper={node.costMoney} />
        <span>{t('tech.rp', { n: formatNumber(t.lang, node.researchPoints, 0) })}</span>
      </span>
      {icons.length > 0 && (
        <span className="flex flex-wrap items-center gap-1" aria-label={t('tech.unlocks')}>
          {icons.slice(0, MAX_ICONS).map((i) => (
            <ItemIcon key={i.key} icon={i.icon} name={i.label} seed={i.key} size={18} decorative />
          ))}
          {icons.length > MAX_ICONS && <span className="text-[11px] text-faint">+{icons.length - MAX_ICONS}</span>}
        </span>
      )}
    </button>
  );
});
