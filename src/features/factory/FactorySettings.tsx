import { useId, type ReactNode } from 'react';
import type { GameData } from '@/shared/data/types';
import type { OptimizeGoal } from '@/features/solver/types';
import { fertilizerItems, fuelItems } from '@/entities/game';
import { useNames, useT } from '@/shared/i18n';
import { Panel } from '@/shared/ui/Panel';
import { Select } from '@/shared/ui/Select';
import { useActivePlan, useFactoryStore } from './store';

const GOALS: (OptimizeGoal | 'manual')[] = ['manual', 'raw', 'machines', 'money'];

function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="contents">
      <label htmlFor={id} className="text-sm text-muted">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

export function FactorySettings({ data }: { data: GameData }) {
  const t = useT();
  const name = useNames();
  const plan = useActivePlan();
  const { setFuel, setFertilizer, setOptimize } = useFactoryStore.getState();

  return (
    <Panel title={t('settings.title')}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2.5">
        <Field label={t('settings.fuel')}>
          {(id) => (
            <Select id={id} value={plan.fuel ?? ''} onChange={(e) => setFuel(e.target.value || null)}>
              <option value="">{t('settings.none')}</option>
              {fuelItems(data).map((i) => (
                <option key={i.id} value={i.id}>
                  {name(i.nameKey)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t('settings.fertilizer')}>
          {(id) => (
            <Select id={id} value={plan.fertilizer ?? ''} onChange={(e) => setFertilizer(e.target.value || null)}>
              <option value="">{t('settings.none')}</option>
              {fertilizerItems(data).map((i) => (
                <option key={i.id} value={i.id}>
                  {name(i.nameKey)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t('settings.optimize')}>
          {(id) => (
            <Select
              id={id}
              value={plan.optimize ?? 'manual'}
              onChange={(e) => setOptimize(e.target.value === 'manual' ? null : (e.target.value as OptimizeGoal))}
            >
              {GOALS.map((g) => (
                <option key={g} value={g}>
                  {t(`optimize.${g}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
    </Panel>
  );
}
