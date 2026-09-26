import { useId, useMemo, useState } from 'react';
import type { GameData, Recipe } from '@/shared/data/types';
import { rankedRecipesFor } from '@/entities/game';
import { useActivePlan, useFactoryStore } from '@/features/factory/store';
import { useNames, useT } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { formatNumber } from '@/shared/lib/format';
import { ItemIcon } from '@/shared/ui/ItemIcon';
import { FIELD } from '@/shared/ui/NumberInput';
import { filterRecipes, visibleRecipes } from './recipeList';

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

/** Alternative recipes for the node's main output as native radio cards; long lists get a filter. */
export function RecipeChoice({
  data,
  item,
  current,
  onSelect,
}: {
  data: GameData;
  item: string;
  current: Recipe;
  onSelect: (recipeId: string, forItem: string) => void;
}) {
  const t = useT();
  const name = useNames();
  const setRecipe = useFactoryStore.getState().setRecipe;
  // The plan, not the solved node, is the source of truth: it answers immediately after a pick.
  const chosen = useActivePlan().recipeFor[item] ?? current.id;
  // Unique per instance: desktop aside and mobile sheet may both mount this group.
  const group = useId();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  const recipes = useMemo(() => rankedRecipesFor(data, item), [data, item]);
  const itemName = (id: string) => name(data.items[id]?.nameKey ?? id);
  // Generated recipes (e.g. Paradox → Mors) share the output's name, so inputs are what tells them apart.
  const title = (r: Recipe) =>
    recipes.filter((x) => x.nameKey === r.nameKey).length > 1 ? r.inputs.map((s) => itemName(s.item)).join(' + ') : name(r.nameKey);

  const filtered = filterRecipes(recipes, query, (r) => `${title(r)} ${r.inputs.map((s) => itemName(s.item)).join(' ')}`);
  const shown = visibleRecipes(filtered, chosen, expanded || query !== '');
  const hiddenCount = filtered.length - shown.length;

  return (
    <fieldset>
      <legend className="mb-2 text-xs font-medium text-faint">
        {t('inspector.recipes')} {recipes.length > 1 && <span className="num">({recipes.length})</span>}
      </legend>
      {recipes.length > 6 && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('inspector.filterRecipes')}
          aria-label={t('inspector.filterRecipes')}
          className={cx(FIELD, 'mb-2 h-9')}
        />
      )}
      <div className="flex flex-col gap-2">
        {shown.map((r, i) => {
          const checked = r.id === chosen;
          return (
            <label
              key={r.id}
              className={cx(
                'block cursor-pointer rounded-xl border p-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-flow',
                checked
                  ? 'border-arcane/70 bg-arcane/12 shadow-[0_0_22px_-10px_var(--color-arcane)]'
                  : 'border-line hover:border-flow/40 hover:bg-white/[0.03] hover:shadow-[0_0_18px_-10px_var(--color-flow)]',
              )}
            >
              <input type="radio" name={group} value={r.id} checked={checked} onChange={() => {
                  setRecipe(item, r.id);
                  // Node ids are recipe ids: follow the node so the inspector does not close on the swap.
                  onSelect(r.id, item);
                }} className="sr-only" />
              <span className="mb-2 flex items-start justify-between gap-2">
                {/* Two lines, not an ellipsis: long Russian names (and Paradox input lists) must read whole. */}
                <span className="line-clamp-2 text-sm leading-snug font-medium text-ink" title={title(r)}>
                  {title(r)}
                </span>
                <span className="num shrink-0 text-xs text-faint">
                  {i === 0 && r.id === recipes[0]?.id && query === '' ? `${t('inspector.default')} · ` : ''}
                  {t('inspector.perBatch', { time: formatNumber(t.lang, r.timeSec, 1) })}
                </span>
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
        {filtered.length === 0 && <p className="text-sm text-muted">{t('combobox.empty')}</p>}
        {hiddenCount > 0 && (
          <button type="button" onClick={() => setExpanded(true)} className="self-start text-sm text-flow hover:underline">
            {t('inspector.showAll', { n: filtered.length })}
          </button>
        )}
      </div>
    </fieldset>
  );
}
