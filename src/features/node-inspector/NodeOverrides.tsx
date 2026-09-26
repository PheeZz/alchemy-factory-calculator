import { useId, type ReactNode } from 'react';
import type { Building, GameData, Recipe } from '@/shared/data/types';
import { fertilizerItems, fuelItems } from '@/entities/game';
import { useActivePlan, useFactoryStore } from '@/features/factory/store';
import { useNames, useT } from '@/shared/i18n';
import { formatNumber } from '@/shared/lib/format';
import { Select } from '@/shared/ui/Select';

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
  const itemName = (id: string | null) => (id ? name(data.items[id]?.nameKey ?? id) : null);
  const factoryDefault = (id: string | null) =>
    id ? t('inspector.factoryDefault', { name: itemName(id)! }) : t('inspector.factoryDefaultNone');
  const heated = (building?.heatCost ?? 0) > 0 || recipe.heatPerSec !== null;

  return (
    <div className="flex flex-col gap-3">
      {recipe.buildings.length > 1 && (
        <Row label={t('inspector.building')}>
          {(id) => (
            <Select id={id} value={building?.id ?? ''} onChange={(e) => s.setBuilding(recipe.id, e.target.value)}>
              {recipe.buildings.map((b) => {
                const def = data.buildings[b];
                return (
                  <option key={b} value={b}>
                    {t('inspector.speed', { name: name(def?.nameKey ?? b), speed: formatNumber(t.lang, def?.speedMult ?? 1) })}
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
            <Select id={id} value={plan.fuelFor[recipe.id] ?? ''} onChange={(e) => s.setFuelFor(recipe.id, e.target.value || null)}>
              <option value="">{factoryDefault(plan.fuel)}</option>
              {fuelItems(data).map((i) => (
                <option key={i.id} value={i.id}>
                  {name(i.nameKey)}
                </option>
              ))}
            </Select>
          )}
        </Row>
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
