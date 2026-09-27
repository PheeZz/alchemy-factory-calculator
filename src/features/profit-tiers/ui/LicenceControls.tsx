import type { SaleBonus } from '@/shared/data/types';
import { useNames, useT } from '@/shared/i18n';
import { formatPercent } from '@/shared/lib/format';
import { Select } from '@/shared/ui/Select';
import { useProfitControls } from '../model/useProfitControls';

export function LicenceControls({ bonuses }: { bonuses: SaleBonus[] }) {
  const t = useT();
  const name = useNames();
  const { saleLevels, setSaleLevel } = useProfitControls();
  if (bonuses.length === 0) return null;
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-xs text-muted">{t('profit.licences')}</legend>
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        {bonuses.map((b) => {
          const id = `licence-${b.id}`;
          const level = Math.min(saleLevels[b.id] ?? 0, b.maxLevel);
          return (
            <li key={b.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-line bg-abyss/60 py-1.5 pr-1.5 pl-3">
              <label htmlFor={id} className="min-w-0 text-sm text-ink/85">
                {name(b.nameKey)}
              </label>
              <Select id={id} className="w-36 shrink-0" value={level} onChange={(e) => setSaleLevel(b.id, Number(e.target.value))}>
                {b.values.map((v, lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl === 0 ? t('profit.licenceNone') : t('profit.licenceLevel', { level: lvl, bonus: `+${formatPercent(v)}` })}
                  </option>
                ))}
              </Select>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
