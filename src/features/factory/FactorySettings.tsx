import { useId, type ReactNode } from 'react';
import type { GameData } from '@/shared/data/types';
import type { OptimizeGoal } from '@/features/solver/types';
import { fertilizerItems } from '@/entities/game';
import { useNames, useT } from '@/shared/i18n';
import { Panel } from '@/shared/ui/Panel';
import { Select } from '@/shared/ui/Select';
import { chooseFuel } from './fuelActions';
import { FuelOptions } from './FuelOptions';
import { HeaterSelect } from './HeaterSelect';
import { defaultHeater } from '@/features/solver';
import { isSteamLike } from './steam';
import { OverridesList } from './OverridesList';
import { useActivePlan, useFactoryStore } from './store';

const GOALS: (OptimizeGoal | 'manual')[] = ['manual', 'raw', 'machines', 'money'];

function Field({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-faint">
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
  const { setFertilizer, setOptimize, setHeater } = useFactoryStore.getState();

  return (
    <Panel title={t('settings.title')}>
      {/* Labels above: the sidebar is too narrow for label + select + heater icon side by side. */}
      <div className="flex flex-col gap-3">
        <Field label={t('settings.fuel')}>
          {(id) => (
            <Select id={id} value={plan.fuel ?? ''} onChange={(e) => chooseFuel(data, null, e.target.value || null)}>
              <option value="">{t('settings.none')}</option>
              <FuelOptions data={data} />
            </Select>
          )}
        </Field>
        {isSteamLike(data.items[plan.fuel ?? '']) && <p className="-mt-1.5 text-xs text-muted">{t('settings.steamNote')}</p>}
        <Field label={t('settings.heater')}>
          {(id) => (
            <HeaterSelect
              id={id}
              data={data}
              fuel={plan.fuel}
              value={plan.heater}
              inheritedId={defaultHeater(data, data.items[plan.fuel ?? ''] ?? null)}
              inheritLabel={(n) => t('settings.heaterAuto', { name: n })}
              onChange={setHeater}
            />
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
      <OverridesList data={data} />
    </Panel>
  );
}
