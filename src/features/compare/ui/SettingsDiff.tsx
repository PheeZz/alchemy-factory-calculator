import { useMemo } from 'react';
import type { GameData } from '@/shared/data/types';
import type { FactoryPlan, OptimizeGoal } from '@/features/solver/types';
import { useNames, useT } from '@/shared/i18n';
import { settingsDiff, type SettingChange } from '../lib/settingsDiff';

/** Subject (what the setting is about) and the text of one side's value. */
function useLabels(data: GameData) {
  const t = useT();
  const name = useNames();
  const item = (id: string) => name(data.items[id]?.nameKey ?? id);
  const building = (id: string) => name(data.buildings[id]?.nameKey ?? id);
  const recipe = (id: string) => name(data.recipes[id]?.nameKey ?? id);
  // Alternative recipes of one item often share its name; their inputs tell them apart (as in OverridesList).
  const recipeByInputs = (id: string) => data.recipes[id]?.inputs.map((x) => item(x.item)).join(' + ') || recipe(id);
  const or = (v: string | number | null, show: (v: string) => string, fallback = t('compare.default')) =>
    v === null ? fallback : show(String(v));

  const subject = (c: SettingChange) =>
    'item' in c ? item(c.item) : 'key' in c ? (c.kind === 'recipeFor' ? item(c.key) : recipe(c.key)) : null;

  const value = (c: SettingChange, v: SettingChange['a']): string => {
    switch (c.kind) {
      case 'target':
      case 'supply':
        return typeof v === 'number' ? t.rate(v) : '—';
      case 'import':
        return v ? t('compare.yes') : t('compare.none');
      case 'unlocked':
        return v === null ? t('compare.all') : String(v);
      case 'mode':
        return t(v === 'fromInput' ? 'targets.modeFromInput' : 'targets.modeTargets');
      case 'optimize':
        return t(`optimize.${(v ?? 'manual') as OptimizeGoal | 'manual'}`);
      case 'maximize':
      case 'fuel':
      case 'fertilizer':
        return or(v as string | null, item, t('compare.none'));
      case 'heater':
      case 'buildingFor':
      case 'heaterFor':
        return or(v as string | null, building);
      case 'recipeFor':
        return or(v as string | null, recipeByInputs);
      case 'fuelFor':
      case 'fertilizerFor':
      case 'catalystFor':
        return or(v as string | null, item);
      case 'machineCaps':
        return or(v as number | null, (n) => n, t('compare.none'));
    }
  };
  return { subject, value };
}

/** Which inputs of the two plans differ: the "why" behind the numbers below. */
export function SettingsDiff({ data, a, b }: { data: GameData; a: FactoryPlan; b: FactoryPlan }) {
  const t = useT();
  const changes = useMemo(() => settingsDiff(a, b), [a, b]);
  const { subject, value } = useLabels(data);
  return (
    <section aria-labelledby="cmp-settings" className="glass rounded-panel p-4">
      <h3 id="cmp-settings" className="mb-2 font-display text-lg text-ink">
        {t('compare.settings')}
      </h3>
      {changes.length === 0 ? (
        <p className="text-sm text-muted">{t('compare.settingsSame')}</p>
      ) : (
        <ul className="flex flex-col gap-1.5 text-sm">
          {changes.map((c, i) => {
            const about = subject(c);
            return (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-faint">
                  {t(`compare.set.${c.kind}`)}
                  {about && <span className="text-ink/90"> · {about}</span>}
                </span>
                <span className="inline-flex flex-wrap items-baseline gap-x-1.5 [overflow-wrap:anywhere]">
                  <span className="text-flow">
                    <span className="sr-only">A: </span>
                    {value(c, c.a)}
                  </span>
                  <span aria-hidden="true" className="text-faint">
                    →
                  </span>
                  <span className="text-arcane">
                    <span className="sr-only">, B: </span>
                    {value(c, c.b)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
