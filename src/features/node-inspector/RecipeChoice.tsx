import { useId } from 'react';
import type { GameData, Recipe } from '@/shared/data/types';
import { recipesProducing } from '@/entities/game';
import { useFactoryStore } from '@/features/factory/store';
import { useNames, useT } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { formatNumber } from '@/shared/lib/format';
import { ItemIcon } from '@/shared/ui/ItemIcon';

function StackIcons({ data, stacks }: { data: GameData; stacks: Recipe['inputs'] }) {
  const t = useT();
  const name = useNames();
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {stacks.map((s) => {
        const item = data.items[s.item];
        const label = item ? name(item.nameKey) : s.item;
        return (
          <span key={s.item} className="num inline-flex items-center gap-1 text-xs text-muted" title={label}>
            <ItemIcon icon={item?.icon ?? null} name={label} seed={s.item} size={18} />
            {formatNumber(t.lang, s.qty, 2)}
          </span>
        );
      })}
    </span>
  );
}

/** Alternative recipes for the node's main output as native radio cards. */
export function RecipeChoice({ data, item, current }: { data: GameData; item: string; current: Recipe }) {
  const t = useT();
  const name = useNames();
  const recipes = recipesProducing(data, item);
  const setRecipe = useFactoryStore.getState().setRecipe;
  // Unique per instance: desktop aside and mobile sheet may both mount this group.
  const group = useId();

  return (
    <fieldset>
      <legend className="mb-2 text-xs font-medium text-faint">{t('inspector.recipes')}</legend>
      <div className="flex flex-col gap-2">
        {recipes.map((r) => {
          const checked = r.id === current.id;
          return (
            <label
              key={r.id}
              className={cx(
                'block cursor-pointer rounded-xl border p-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-flow',
                checked ? 'border-arcane/70 bg-arcane/12' : 'border-line hover:border-white/25 hover:bg-white/[0.03]',
              )}
            >
              <input
                type="radio"
                name={group}
                value={r.id}
                checked={checked}
                onChange={() => setRecipe(item, r.id)}
                className="sr-only"
              />
              <span className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-ink">{name(r.nameKey)}</span>
                <span className="num shrink-0 text-xs text-faint">{t('inspector.perBatch', { time: formatNumber(t.lang, r.timeSec, 1) })}</span>
              </span>
              <span className="flex items-center gap-2">
                <StackIcons data={data} stacks={r.inputs} />
                <span className="text-faint" aria-hidden="true">
                  →
                </span>
                <StackIcons data={data} stacks={r.outputs} />
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
