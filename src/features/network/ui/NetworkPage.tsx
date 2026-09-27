import type { GameData } from '@/shared/data/types';
import type { NetworkShare } from '@/features/solver/link';
import { useFactoryStore } from '@/features/factory/store';
import { useNames, useT } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { useViewStore } from '@/shared/lib/view';
import { ItemIcon } from '@/shared/ui/ItemIcon';
import { useNetwork } from '../model/useNetwork';

/** Factory chip: click opens that factory in the calculator. */
function FactoryChip({ share, tone }: { share: NetworkShare; tone: 'supply' | 'demand' }) {
  const t = useT();
  const f = useFactoryStore((s) => s.factories.find((x) => x.id === share.factory));
  return (
    <button
      type="button"
      onClick={() => {
        useFactoryStore.getState().setActive(share.factory);
        useViewStore.getState().setView('calculator');
      }}
      className={cx(
        'num inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-xs hover:text-ink',
        tone === 'supply' ? 'border-verdant/35 text-verdant/90' : 'border-flow/35 text-flow/90',
      )}
    >
      {f?.name ?? share.factory}
      <span className="text-ink/80">{t.rate(share.rate)}</span>
    </button>
  );
}

export function NetworkPage({ data }: { data: GameData }) {
  const t = useT();
  const name = useNames();
  const factories = useFactoryStore((s) => s.factories);
  const state = useNetwork(data);
  const factoryName = (id: string) => factories.find((f) => f.id === id)?.name ?? id;
  const itemName = (id: string) => name(data.items[id]?.nameKey ?? id);

  return (
    <main className="min-h-0 flex-1 overflow-y-auto px-3 pt-4 pb-10 lg:px-6">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-5">
        <div>
          <h2 className="font-display text-2xl text-ink lg:text-3xl">{t('network.title')}</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">{t('network.subtitle')}</p>
        </div>

        {state.status === 'loading' && (
          <div role="status" className="relative h-40 overflow-hidden rounded-xl border border-line bg-abyss/70">
            <span className="sr-only">{t('network.loading')}</span>
            <div className="shimmer" />
          </div>
        )}
        {state.status === 'error' && <p role="alert" className="text-sm text-[#ffc2c7]">{t('network.error')}</p>}

        {state.status === 'ready' && (
          <>
            {state.data.failed.length > 0 && (
              <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-[#ffc2c7]">
                {t('network.failed', { list: state.data.failed.map(factoryName).join(', ') })}
              </p>
            )}
            {state.data.network.items.length === 0 ? (
              <p className="rounded-xl border border-line bg-abyss/60 p-4 text-sm text-muted">{t('network.empty')}</p>
            ) : (
              <section aria-labelledby="net-items">
                <h3 id="net-items" className="mb-2 font-display text-lg text-ink">
                  {t('network.items')}
                </h3>
                <ul className="flex flex-col gap-2">
                  {state.data.network.items.map((it) => {
                    const short = it.balance < -1e-6;
                    const extra = it.balance > 1e-6;
                    return (
                      <li
                        key={it.item}
                        className={cx(
                          'grid gap-3 rounded-xl border bg-abyss/80 p-3 lg:grid-cols-[minmax(12rem,1fr)_1.4fr_1.4fr_9rem] lg:items-center',
                          short ? 'border-danger/45' : extra ? 'border-verdant/35' : 'border-line',
                        )}
                      >
                        <span className="flex items-center gap-2.5">
                          <ItemIcon icon={data.items[it.item]?.icon ?? null} name={itemName(it.item)} seed={it.item} size={28} decorative />
                          <span className="text-sm font-medium text-ink">{itemName(it.item)}</span>
                        </span>
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-faint">{t('network.supply')}</span>
                          {it.supply.length ? it.supply.map((s) => <FactoryChip key={s.factory} share={s} tone="supply" />) : <span className="text-xs text-faint">—</span>}
                        </span>
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-faint">{t('network.demand')}</span>
                          {it.demand.length ? it.demand.map((s) => <FactoryChip key={s.factory} share={s} tone="demand" />) : <span className="text-xs text-faint">—</span>}
                        </span>
                        <span className={cx('num text-sm font-semibold lg:text-right', short ? 'text-danger' : extra ? 'text-verdant' : 'text-muted')}>
                          {short ? t('network.short', { rate: t.rate(-it.balance) }) : extra ? t('network.extra', { rate: t.rate(it.balance) }) : t('network.balanced')}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
            {state.data.network.flows.length > 0 && (
              <section aria-labelledby="net-flows">
                <h3 id="net-flows" className="mb-2 font-display text-lg text-ink">
                  {t('network.flows')}
                </h3>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {state.data.network.flows.map((f, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-2 text-ink/90">
                      <span className="font-medium">{factoryName(f.from)}</span>
                      <span className="text-flow" aria-hidden="true">→</span>
                      <span className="font-medium">{factoryName(f.to)}</span>
                      <span className="inline-flex items-center gap-1 text-muted">
                        <ItemIcon icon={data.items[f.item]?.icon ?? null} name={itemName(f.item)} seed={f.item} size={16} />
                        {itemName(f.item)} <span className="num text-ink/85">{t.rate(f.rate)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
