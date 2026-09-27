import { useMemo } from 'react';
import type { GameData } from '@/shared/data/types';
import { buildList } from '@/features/solver';
import type { SolveResult } from '@/features/solver/types';
import { useActiveFactory, useFactoryStore } from '@/features/factory/store';
import { useNames, useT } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { formatNumber } from '@/shared/lib/format';
import { Coins } from '@/shared/ui/Coins';
import { ItemIcon } from '@/shared/ui/ItemIcon';

/** What to build, with a per-factory "построено" checklist; progress counts machines, not rows. */
export function BuildChecklist({ data, result }: { data: GameData; result: SolveResult }) {
  const t = useT();
  const name = useNames();
  const built = useActiveFactory().built ?? [];
  const toggle = useFactoryStore((s) => s.toggleBuilt);
  const list = useMemo(() => buildList(data, result), [data, result]);
  const total = list.reduce((s, e) => s + e.count, 0);
  const done = list.filter((e) => built.includes(e.building)).reduce((s, e) => s + e.count, 0);
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8" aria-hidden="true">
          <div className="h-full rounded-full bg-gradient-to-r from-verdant to-flow transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <span className="num text-xs text-muted">{t('build.progress', { done: formatNumber(t.lang, done, 0), total: formatNumber(t.lang, total, 0) })}</span>
      </div>
      <ul className="flex flex-col gap-1">
        {list.map((e) => {
          const b = data.buildings[e.building];
          const label = name(b?.nameKey ?? e.building);
          const isBuilt = built.includes(e.building);
          return (
            <li key={e.building}>
              <label className={cx('flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-sm hover:bg-white/[0.03]', isBuilt && 'text-muted line-through decoration-verdant/60')}>
                <input type="checkbox" checked={isBuilt} onChange={() => toggle(e.building)} className="size-4 shrink-0 accent-[var(--color-verdant)]" />
                <ItemIcon icon={b?.icon ?? null} name={label} seed={e.building} size={20} decorative />
                <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{label}</span>
                <span className="num shrink-0 text-muted">{formatNumber(t.lang, e.count, 0)}×</span>
                {e.totalMoney > 0 && <Coins copper={e.totalMoney} />}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
