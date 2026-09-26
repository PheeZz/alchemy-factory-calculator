import type { GameData } from '@/shared/data/types';
import { useNames, useT } from '@/shared/i18n';
import { IconButton } from '@/shared/ui/Button';
import { useActivePlan, useFactoryStore } from './store';

/** Manual recipe and machine picks of the active factory, each with its own reset. */
export function OverridesList({ data }: { data: GameData }) {
  const t = useT();
  const name = useNames();
  const plan = useActivePlan();
  const s = useFactoryStore.getState();
  const itemName = (id: string) => name(data.items[id]?.nameKey ?? id);
  const recipeLabel = (id: string) => {
    const r = data.recipes[id];
    return r ? r.inputs.map((x) => itemName(x.item)).join(' + ') || name(r.nameKey) : id;
  };
  const rows = [
    ...Object.entries(plan.recipeFor).map(([item, recipe]) => ({
      key: `r:${item}`,
      text: t('overrides.recipe', { item: itemName(item), recipe: recipeLabel(recipe) }),
      reset: () => s.setRecipe(item, null),
    })),
    ...Object.entries(plan.buildingFor).map(([recipe, building]) => ({
      key: `b:${recipe}`,
      text: t('overrides.building', {
        recipe: name(data.recipes[recipe]?.nameKey ?? recipe),
        building: name(data.buildings[building]?.nameKey ?? building),
      }),
      reset: () => s.setBuilding(recipe, null),
    })),
  ];
  if (rows.length === 0) return null;

  return (
    <section className="mt-4 border-t border-line pt-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-faint">{t('overrides.title')}</h3>
        <button type="button" onClick={s.clearOverrides} className="text-xs text-flow hover:underline">
          {t('overrides.resetAll')}
        </button>
      </div>
      <ul className="flex flex-col gap-1">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-2 text-sm">
            <span className="min-w-0 flex-1 text-ink/90">{r.text}</span>
            <IconButton icon="close" size="sm" label={t('overrides.reset', { what: r.text })} className="border-transparent bg-transparent" onClick={r.reset} />
          </li>
        ))}
      </ul>
    </section>
  );
}
