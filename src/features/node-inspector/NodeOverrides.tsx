import { useId, type ReactNode } from 'react';
import type { Building, GameData, Recipe } from '@/shared/data/types';
import { fertilizerItems, heatersFor } from '@/entities/game';
import { useActivePlan, useFactoryStore } from '@/features/factory/store';
import { useNames, useT } from '@/shared/i18n';
import { formatNumber } from '@/shared/lib/format';
import { Select } from '@/shared/ui/Select';
import { chooseFuel } from '@/features/factory/fuelActions';
import { FuelOptions } from '@/features/factory/FuelOptions';
import { HeaterSelect } from '@/features/factory/HeaterSelect';
import { useLocks } from '@/features/tech/model/useLocks';
import { defaultHeater } from '@/features/solver';
import { isSteamLike } from '@/features/factory/steam';

function Row({ label, children }: { label: string; children: (id: string) => ReactNode }) {
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

/** Machine, fuel and fertilizer choices; each control appears only when the recipe can use it. */
export function NodeOverrides({ data, recipe, building }: { data: GameData; recipe: Recipe; building: Building | undefined }) {
  const t = useT();
  const name = useNames();
  const plan = useActivePlan();
  const s = useFactoryStore.getState();
  const locks = useLocks(data);
  const itemName = (id: string | null) => (id ? name(data.items[id]?.nameKey ?? id) : null);
  const factoryDefault = (id: string | null) =>
    id ? t('inspector.factoryDefault', { name: itemName(id)! }) : t('inspector.factoryDefaultNone');
  const heated = (building?.heatCost ?? 0) > 0 || recipe.heatPerSec !== null;
  // A boiler burning its own steam would be a free-heat loop: its list has solid fuels only.
  const isBoiler = recipe.outputs.some((o) => isSteamLike(data.items[o.item]));
  const nodeFuel = plan.fuelFor[recipe.id] ?? plan.fuel;
  // What the empty choice resolves to: the plan-wide heater if it takes this node's fuel, else the default.
  const fitting = heatersFor(data, nodeFuel).map((b) => b.id);
  const inheritedHeater =
    plan.heater && fitting.includes(plan.heater) ? plan.heater : defaultHeater(data, data.items[nodeFuel ?? ''] ?? null);

  return (
    <div className="flex flex-col gap-3">
      {recipe.buildings.length > 1 && (
        <Row label={t('inspector.building')}>
          {(id) => (
            <Select id={id} value={building?.id ?? ''} onChange={(e) => s.setBuilding(recipe.id, e.target.value)}>
              {recipe.buildings.map((b) => {
                const def = data.buildings[b];
                const lockedBy = locks.building(b);
                return (
                  <option key={b} value={b}>
                    {lockedBy ? '🔒 ' : ''}
                    {t('inspector.speed', { name: name(def?.nameKey ?? b), speed: formatNumber(t.lang, def?.speedMult ?? 1) })}
                    {lockedBy ? ` — ${t('tech.lockedBy', { node: lockedBy })}` : ''}
                  </option>
                );
              })}
            </Select>
          )}
        </Row>
      )}
      {heated && (
        <Row label={t('inspector.fuel')}>
          {(id) => (
            <Select id={id} value={plan.fuelFor[recipe.id] ?? ''} onChange={(e) => chooseFuel(data, recipe.id, e.target.value || null)}>
              <option value="">{factoryDefault(plan.fuel)}</option>
              <FuelOptions data={data} excludeSteam={isBoiler} />
            </Select>
          )}
        </Row>
      )}
      {heated && (
        <Row label={t('inspector.heater')}>
          {(id) => (
            <HeaterSelect
              id={id}
              data={data}
              fuel={nodeFuel}
              value={plan.heaterFor?.[recipe.id]}
              inheritedId={inheritedHeater}
              inheritLabel={(n) => t('inspector.factoryDefault', { name: n })}
              onChange={(b) => s.setHeaterFor(recipe.id, b)}
            />
          )}
        </Row>
      )}
      {heated && !isBoiler && isSteamLike(data.items[nodeFuel ?? '']) && (
        <p className="-mt-1 text-xs text-muted">{t('settings.steamNote')}</p>
      )}
      {recipe.nutrientPerBatch !== null && (
        <Row label={t('inspector.fertilizer')}>
          {(id) => (
            <Select
              id={id}
              value={plan.fertilizerFor[recipe.id] ?? ''}
              onChange={(e) => s.setFertilizerFor(recipe.id, e.target.value || null)}
            >
              <option value="">{factoryDefault(plan.fertilizer)}</option>
              {fertilizerItems(data).map((i) => (
                <option key={i.id} value={i.id}>
                  {name(i.nameKey)}
                </option>
              ))}
            </Select>
          )}
        </Row>
      )}
    </div>
  );
}
