import type { GameData } from '@/shared/data/types';
import { heatersFor } from '@/entities/game';
import { useNames, useT } from '@/shared/i18n';
import { ItemIcon } from '@/shared/ui/ItemIcon';
import { Select } from '@/shared/ui/Select';

/**
 * Heater picker limited to heaters that can take `fuel`. The empty option means "inherit"
 * (`inheritedId` is what that resolves to, shown in its label and as the icon).
 */
export function HeaterSelect({
  id,
  data,
  fuel,
  value,
  inheritedId,
  inheritLabel,
  onChange,
}: {
  id: string;
  data: GameData;
  fuel: string | null | undefined;
  value: string | null | undefined;
  inheritedId: string | null;
  inheritLabel: (name: string) => string;
  onChange: (building: string | null) => void;
}) {
  const t = useT();
  const name = useNames();
  const heaters = heatersFor(data, fuel);
  const shown = data.buildings[value || inheritedId || ''];
  const label = (bid: string | null) => (bid && data.buildings[bid] ? name(data.buildings[bid].nameKey) : '—');
  return (
    <div className="flex min-w-0 items-center gap-2">
      <ItemIcon icon={shown?.icon ?? null} name={shown ? name(shown.nameKey) : '—'} seed={shown?.id ?? 'heater'} size={28} decorative />
      <Select id={id} className="min-w-0 flex-1" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">{inheritLabel(label(inheritedId))}</option>
        {heaters.map((b) => (
          <option key={b.id} value={b.id}>
            {`${name(b.nameKey)} · ${t.plural('slots', b.heatSlots ?? 0)}`}
          </option>
        ))}
      </Select>
    </div>
  );
}
