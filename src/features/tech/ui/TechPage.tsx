import { useCallback, useMemo } from 'react';
import type { GameData } from '@/shared/data/types';
import { Coins } from '@/shared/ui/Coins';
import { useFactoryStore } from '@/features/factory/store';
import { useT } from '@/shared/i18n';
import { formatNumber } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button';
import { openSet, techCost, techStages } from '../lib/tech';
import { toggleTech } from '../model/useTechActions';
import { TechNodeCard } from './TechNodeCard';

export function TechPage({ data }: { data: GameData }) {
  const t = useT();
  const unlocked = useFactoryStore((s) => s.unlocked);
  const setUnlocked = useFactoryStore((s) => s.setUnlocked);
  const stages = useMemo(() => techStages(data), [data]);
  const open = useMemo(() => openSet(data, unlocked), [data, unlocked]);
  const total = data.tech?.length ?? 0;
  const learnedIds = open ? [...open] : (data.tech ?? []).map((n) => n.id);
  const spent = techCost(data, learnedIds);
  const onToggle = useCallback((id: string) => toggleTech(data, id), [data]);

  if (!data.tech?.length) return <main className="p-6 text-sm text-muted">{t('tech.noData')}</main>;

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-3 pt-4 pb-10 lg:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-display text-2xl text-ink lg:text-3xl">{t('tech.title')}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">{t('tech.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant={unlocked === null ? 'primary' : 'ghost'} onClick={() => setUnlocked(null)}>
              {t('tech.allOpen')}
            </Button>
            <Button size="sm" onClick={() => setUnlocked([])}>
              {t('tech.nothing')}
            </Button>
          </div>
        </div>

        <p className="num flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
          <span className="text-ink">{t('tech.learned', { n: learnedIds.length, total })}</span>
          <span className="inline-flex items-center gap-2">
            {t('tech.spent')} <Coins copper={spent.money} /> · {t('tech.rp', { n: formatNumber(t.lang, spent.rp, 0) })}
          </span>
          <span className="text-faint">{unlocked === null ? t('tech.allOpenNote') : t('tech.hint')}</span>
        </p>

        {/* Tiers are columns on wide screens (the game's own layout), stacked sections on phones. */}
        <div className="flex flex-col gap-5 lg:grid lg:auto-cols-[minmax(190px,1fr)] lg:grid-flow-col lg:gap-3 lg:overflow-x-auto lg:pb-3">
          {stages.map((nodes, stage) => (
            <section key={stage} aria-label={t('tech.stage', { n: stage + 1 })} className="flex min-w-0 flex-col gap-2">
              <h3 className="flex items-baseline justify-between font-display text-lg text-ink">
                {t('tech.stage', { n: stage + 1 })}
                <span className="num text-xs font-normal text-faint">
                  {nodes.filter((n) => !open || open.has(n.id)).length}/{nodes.length}
                </span>
              </h3>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-col">
                {nodes.map((n) => (
                  <li key={n.id}>
                    <TechNodeCard data={data} node={n} learned={!open || open.has(n.id)} onToggle={onToggle} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
