import type { GameData } from '@/shared/data/types';
import { Coins } from '@/shared/ui/Coins';
import { useT } from '@/shared/i18n';
import { formatNumber } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { ItemIcon } from '@/shared/ui/ItemIcon';
import { techCost } from '../lib/tech';
import { learnAll } from '../model/useTechActions';
import { useTechLabel } from '../model/useTechLabel';

/** Shown when the plan is unreachable only because of research: what to learn, what it costs. */
export function RequiredTech({ data, ids }: { data: GameData; ids: string[] }) {
  const t = useT();
  const label = useTechLabel();
  const nodes = ids.map((id) => data.tech?.find((n) => n.id === id)).filter((n) => !!n);
  const cost = techCost(data, ids);
  return (
    <div className="mt-3 rounded-xl border border-line bg-void/40 p-3">
      <h3 className="mb-2 text-xs font-medium text-faint">{t('tech.need')}</h3>
      <ul className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
        {nodes.map((n) => (
          <li key={n.id} className="inline-flex items-center gap-1 rounded-lg border border-line px-1.5 py-0.5 text-xs text-ink/90">
            {n.nameKey && <ItemIcon icon={n.icon} name={label(n)} seed={n.id} size={16} decorative />}
            {label(n)}
          </li>
        ))}
      </ul>
      <p className="num mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
        {t('tech.needCost')} <Coins copper={cost.money} /> · {t('tech.rp', { n: formatNumber(t.lang, cost.rp, 0) })}
      </p>
      <Button size="sm" variant="primary" className="mt-3" onClick={() => learnAll(data, ids)}>
        {t('tech.markLearned')}
      </Button>
    </div>
  );
}
