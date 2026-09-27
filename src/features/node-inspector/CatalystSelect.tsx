import { useId } from 'react';
import type { GameData, Recipe } from '@/shared/data/types';
import { useActivePlan, useFactoryStore } from '@/features/factory/store';
import { useNames, useT } from '@/shared/i18n';
import { formatNumber } from '@/shared/lib/format';
import { Select } from '@/shared/ui/Select';

// Fertile and Eternal effects come from the community calculator, not from traced game code
// (research/07-catalysts-cauldron.md); the UI says so.
const UNCONFIRMED = new Set(['fertile', 'eternal']);

/** Catalyst for Advanced Athanor recipes that accept one: none or one of the four, with its effect. */
export function CatalystSelect({ data, recipe }: { data: GameData; recipe: Recipe }) {
  const t = useT();
  const name = useNames();
  const id = useId();
  const plan = useActivePlan();
  const catalysts = data.catalysts ?? [];
  if (!recipe.catalyst || catalysts.length === 0) return null;
  const chosen = catalysts.find((c) => c.item === plan.catalystFor?.[recipe.id]);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-faint">
        {t('catalyst.label')}
      </label>
      <Select
        id={id}
        value={chosen?.item ?? ''}
        onChange={(e) => useFactoryStore.getState().setCatalystFor(recipe.id, e.target.value || null)}
      >
        <option value="">{t('catalyst.none')}</option>
        {catalysts.map((c) => (
          <option key={c.item} value={c.item}>
            {`${name(data.items[c.item]?.nameKey ?? c.item)} · ${t('catalyst.charges', { n: formatNumber(t.lang, c.charges, 0) })}`}
          </option>
        ))}
      </Select>
      {chosen && (
        <p className="text-xs text-muted">
          {t(`catalyst.effect.${chosen.effect}`)}
          {UNCONFIRMED.has(chosen.effect) && <span className="ml-1 text-ember">· {t('catalyst.community')}</span>}
        </p>
      )}
    </div>
  );
}
