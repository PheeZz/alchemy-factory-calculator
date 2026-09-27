import { useId } from 'react';
import type { Recipe } from '@/shared/data/types';
import { useActivePlan, useFactoryStore } from '@/features/factory/store';
import { useT } from '@/shared/i18n';
import { IconButton } from '@/shared/ui/Button';
import { NumberInput } from '@/shared/ui/NumberInput';

/** Reverse calculation: "I have N of these machines" — an upper bound the solver must respect. */
export function MachineCap({ recipe }: { recipe: Recipe }) {
  const t = useT();
  const id = useId();
  const plan = useActivePlan();
  const cap = plan.machineCaps?.[recipe.id];
  const s = useFactoryStore.getState();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-faint">
        {t('cap.label')}
      </label>
      <div className="flex items-center gap-2">
        {cap === undefined ? (
          <button
            id={id}
            type="button"
            onClick={() => s.setMachineCap(recipe.id, 1)}
            className="h-10 flex-1 rounded-xl border border-dashed border-line text-sm text-muted hover:border-flow/50 hover:text-ink"
          >
            {t('cap.add')}
          </button>
        ) : (
          <>
            <NumberInput id={id} className="flex-1" value={cap} onChange={(n) => s.setMachineCap(recipe.id, Math.floor(n))} suffix={t('cap.unit')} />
            <IconButton icon="close" size="sm" label={t('cap.clear')} onClick={() => s.setMachineCap(recipe.id, null)} />
          </>
        )}
      </div>
      {cap !== undefined && <p className="text-xs text-muted">{t(plan.mode === 'fromInput' ? 'cap.hintMax' : 'cap.hintTargets')}</p>}
    </div>
  );
}
