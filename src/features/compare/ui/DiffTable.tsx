import { useId, useState } from 'react';
import type { Delta } from '@/features/solver';
import { useT } from '@/shared/i18n';
import { Icon } from '@/shared/ui/Icon';
import { ItemIcon } from '@/shared/ui/ItemIcon';
import { splitRows } from '../lib/rows';
import { DeltaValue } from './DeltaValue';

export interface DiffRow extends Delta {
  id: string;
  name: string;
  icon: string | null;
}

function Row({ row, format }: { row: DiffRow; format: (n: number) => string }) {
  return (
    <tr className="border-t border-line/70">
      <th scope="row" className="py-1.5 pr-3 text-left font-normal">
        <span className="flex items-center gap-2">
          <ItemIcon icon={row.icon} name={row.name} seed={row.id} size={20} decorative />
          <span className="min-w-0 [overflow-wrap:anywhere] text-ink/90">{row.name}</span>
        </span>
      </th>
      <td className="num px-2 py-1.5 text-right text-muted">{format(row.a)}</td>
      <td className="num px-2 py-1.5 text-right text-muted">{format(row.b)}</td>
      <td className="py-1.5 pl-2 text-right">
        <DeltaValue delta={row.delta}>{format(Math.abs(row.delta))}</DeltaValue>
      </td>
    </tr>
  );
}

/** A | B | Δ per entity: changes first by size, unchanged rows behind a toggle. */
export function DiffTable({ caption, rows, format }: { caption: string; rows: DiffRow[]; format: (n: number) => string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  const { changed, unchanged } = splitRows(rows);
  return (
    <section className="glass min-w-0 rounded-panel p-4">
      {/* Narrow screens: the table scrolls inside its card, never the page. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[20rem] text-sm">
          <caption className="mb-2 text-left font-display text-base text-ink">{caption}</caption>
          <thead>
            <tr className="text-xs text-faint">
              <th scope="col" className="pb-1.5 text-left font-medium">
                {t('compare.col.name')}
              </th>
              <th scope="col" className="px-2 pb-1.5 text-right font-medium text-flow">
                A
              </th>
              <th scope="col" className="px-2 pb-1.5 text-right font-medium text-arcane">
                B
              </th>
              <th scope="col" className="pb-1.5 pl-2 text-right font-medium">
                <abbr title={t('compare.delta')} className="no-underline">
                  Δ
                </abbr>
              </th>
            </tr>
          </thead>
          <tbody>
            {changed.map((r) => (
              <Row key={r.id} row={r} format={format} />
            ))}
            {changed.length === 0 && unchanged.length === 0 && (
              <tr>
                <td colSpan={4} className="py-1.5 text-faint">
                  {t('summary.none')}
                </td>
              </tr>
            )}
          </tbody>
          <tbody id={bodyId} hidden={!open}>
            {unchanged.map((r) => (
              <Row key={r.id} row={r} format={format} />
            ))}
          </tbody>
        </table>
      </div>
      {unchanged.length > 0 && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen(!open)}
          className="mt-2 inline-flex items-center gap-1 rounded-lg text-xs text-flow hover:underline"
        >
          <Icon name="chevron" size={14} className={open ? 'rotate-180' : undefined} />
          {t('compare.unchanged', { n: unchanged.length })}
        </button>
      )}
    </section>
  );
}
