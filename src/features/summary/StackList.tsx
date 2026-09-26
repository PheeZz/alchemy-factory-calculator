import type { GameData, ItemId } from '@/shared/data/types';
import { useNames, useT } from '@/shared/i18n';
import { ItemIcon } from '@/shared/ui/ItemIcon';

export interface SummaryRow {
  id: ItemId;
  icon: string | null;
  nameKey: string;
  value: string;
  tag?: string;
}

export function StackList({ rows }: { rows: SummaryRow[] }) {
  const t = useT();
  const name = useNames();
  if (rows.length === 0) return <p className="text-sm text-faint">{t('summary.none')}</p>;
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((r) => (
        <li key={r.id + (r.tag ?? '')} className="flex items-start gap-2 text-sm">
          <ItemIcon icon={r.icon} name={name(r.nameKey)} seed={r.id} size={20} decorative />
          {/* Tag under the name: beside it, it squeezed long names into mid-word breaks. */}
          <span className="min-w-0 flex-1 [overflow-wrap:anywhere]" title={name(r.nameKey)}>
            {name(r.nameKey)}
            {r.tag && <span className="block text-xs text-faint">{r.tag}</span>}
          </span>
          <span className="num shrink-0 text-muted">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

export const itemRow = (data: GameData, id: ItemId, value: string, tag?: string): SummaryRow => ({
  id,
  icon: data.items[id]?.icon ?? null,
  nameKey: data.items[id]?.nameKey ?? id,
  value,
  tag,
});
