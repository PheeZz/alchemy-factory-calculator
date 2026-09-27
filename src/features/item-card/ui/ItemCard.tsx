import { useId, useMemo, type ReactNode } from 'react';
import type { GameData } from '@/shared/data/types';
import { itemUsage } from '@/entities/item-usage';
import { Coins } from '@/shared/ui/Coins';
import { useNames, useT } from '@/shared/i18n';
import { formatNumber } from '@/shared/lib/format';
import { Button, IconButton } from '@/shared/ui/Button';
import { GlowBadge } from '@/shared/ui/GlowBadge';
import { Icon } from '@/shared/ui/Icon';
import { ItemIcon } from '@/shared/ui/ItemIcon';
import { Modal } from '@/shared/ui/Modal';
import { burstFrom } from '@/shared/ui/burst';
import { toast } from '@/shared/ui/Toast';
import { addItemAsTarget, showInFuelTiers } from '../model/itemActions';
import { useItemCard } from '../model/useItemCard';
import { RecipeLine } from './RecipeLine';

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 flex items-baseline gap-2 font-display text-lg text-ink">
        {title} <span className="num text-sm font-normal text-faint">{count}</span>
      </h3>
      {children}
    </section>
  );
}

function CardBody({ data, item }: { data: GameData; item: string }) {
  const t = useT();
  const name = useNames();
  const titleId = useId();
  const { stack, push, back, close } = useItemCard();
  const info = data.items[item];
  const usage = useMemo(() => itemUsage(data, item), [data, item]);
  if (!info) return null;
  const label = name(info.nameKey);

  return (
    <div className="flex max-h-[inherit] flex-col">
      <header className="flex items-start gap-3 border-b border-line p-4">
        {stack.length > 1 && <IconButton icon="back" size="sm" label={t('card.back')} onClick={back} />}
        <ItemIcon icon={info.icon} name={label} seed={item} size={48} decorative />
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="font-display text-2xl leading-tight">
            {label}
          </h2>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {info.liquid && <GlowBadge tone="flow">{t('card.liquid')}</GlowBadge>}
            {info.raw && <GlowBadge tone="muted">{t('graph.raw')}</GlowBadge>}
            {usage.heat > 0 && (
              <GlowBadge tone="ember">
                <Icon name="flame" size={11} />
                {t('card.heat', { n: formatNumber(t.lang, usage.heat, 0) })}
              </GlowBadge>
            )}
            {usage.nutrient > 0 && (
              <GlowBadge tone="verdant">
                <Icon name="leaf" size={11} />
                {t('card.nutrient', { n: formatNumber(t.lang, usage.nutrient, 0) })}
              </GlowBadge>
            )}
          </div>
        </div>
        <IconButton icon="close" size="sm" label={t('sheet.close')} onClick={close} />
      </header>

      <div className="flex flex-col gap-5 overflow-y-auto overscroll-contain p-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
          <dt className="text-muted">{t('card.value')}</dt>
          <dd>
            <Coins copper={info.value} />
          </dd>
          {info.buyPrice !== null && (
            <>
              <dt className="text-muted">{t('card.buyPrice')}</dt>
              <dd>
                <Coins copper={info.buyPrice} />
              </dd>
            </>
          )}
        </dl>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            icon="plus"
            onClick={(e) => {
              burstFrom(e.currentTarget);
              addItemAsTarget(item);
              close();
              toast(t('card.added', { item: label }));
            }}
          >
            {t('targets.add')}
          </Button>
          {usage.heat > 0 && (
            <Button
              icon="flame"
              onClick={() => {
                showInFuelTiers(item);
                close();
              }}
            >
              {t('card.inTiers')}
            </Button>
          )}
        </div>

        <Section title={t('card.producedBy')} count={usage.producedBy.length}>
          {usage.producedBy.length === 0 ? (
            <p className="text-sm text-muted">{t('card.notProduced')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {usage.producedBy.map((r) => (
                <RecipeLine key={r.id} data={data} recipe={r} current={item} onOpen={push} />
              ))}
            </ul>
          )}
        </Section>

        <Section title={t('card.usedIn')} count={usage.consumedBy.length + (usage.heat > 0 ? 1 : 0) + (usage.nutrient > 0 ? 1 : 0)}>
          <ul className="flex flex-col gap-2">
            {usage.heat > 0 && <li className="text-sm text-ember">{t('card.asFuel', { n: formatNumber(t.lang, usage.heat, 0) })}</li>}
            {usage.nutrient > 0 && (
              <li className="text-sm text-verdant">{t('card.asFertilizer', { n: formatNumber(t.lang, usage.nutrient, 0) })}</li>
            )}
            {usage.consumedBy.map((r) => (
              <RecipeLine key={r.id} data={data} recipe={r} current={item} onOpen={push} />
            ))}
            {usage.consumedBy.length === 0 && usage.heat === 0 && usage.nutrient === 0 && (
              <li className="text-sm text-muted">{t('card.notUsed')}</li>
            )}
          </ul>
        </Section>
      </div>
    </div>
  );
}

export function ItemCard({ data }: { data: GameData }) {
  const t = useT();
  const { stack, close } = useItemCard();
  const current = stack.at(-1);
  return (
    <Modal open={!!current} onClose={close} label={t('card.title')}>
      {current && <CardBody key={current} data={data} item={current} />}
    </Modal>
  );
}
