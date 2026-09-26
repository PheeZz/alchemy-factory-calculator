import type { GameData } from '@/shared/data/types';
import { useNames, useT } from '@/shared/i18n';
import { Segmented } from '@/shared/ui/Segmented';
import type { TierMetric } from '../lib/tiers';
import { useTierControls, type HeatingMode } from '../model/useTierControls';

const METRICS: TierMetric[] = ['machines', 'price', 'perRaw'];

export function TierControls({ data, factoryFuel }: { data: GameData; factoryFuel: string | null }) {
  const t = useT();
  const name = useNames();
  const { metric, heating, setMetric, setHeating } = useTierControls();
  const fuelName = factoryFuel ? name(data.items[factoryFuel]?.nameKey ?? factoryFuel) : null;
  const heatingOptions: { value: HeatingMode; label: string }[] = [
    { value: 'self', label: t('tiers.heating.self') },
    ...(fuelName ? [{ value: 'factory' as const, label: t('tiers.heating.factory', { fuel: fuelName }) }] : []),
  ];

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-6">
      <div className="min-w-0 lg:w-[30rem]">
        <Segmented
          label={t('tiers.metric')}
          value={metric}
          onChange={setMetric}
          options={METRICS.map((m) => ({ value: m, label: t(`tiers.metric.${m}`) }))}
        />
      </div>
      <Segmented
        className="lg:w-[26rem]"
        label={t('tiers.heating')}
        value={fuelName ? heating : 'self'}
        onChange={setHeating}
        options={heatingOptions}
      />
      <p className="text-xs text-muted lg:max-w-xs lg:pb-1.5">{t(`tiers.metricHint.${metric}`)}</p>
    </div>
  );
}
