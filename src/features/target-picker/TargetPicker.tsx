import { useState } from 'react';
import type { GameData } from '@/shared/data/types';
import { useActivePlan, useFactoryStore } from '@/features/factory/store';
import { useT } from '@/shared/i18n';
import { Button } from '@/shared/ui/Button';
import { Panel } from '@/shared/ui/Panel';
import { SearchCombobox, type ComboOption } from '@/shared/ui/SearchCombobox';
import { Tabs } from '@/shared/ui/Tabs';
import { RateRow } from './RateRow';
import { useItemOptions } from './useItemOptions';

const DEFAULT_RATE = 60;

/** "Add" opens a picker first: a row only enters the plan once it has a real item. */
function AddRow({ options, label, onPick }: { options: ComboOption[]; label: string; onPick: (item: string) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <Button size="sm" icon="plus" onClick={() => setOpen(true)} className="self-start">
        {label}
      </Button>
    );
  return (
    <div onBlur={() => setOpen(false)}>
      <SearchCombobox
        autoFocus
        options={options}
        value={null}
        label={label}
        placeholder={t('combobox.placeholder')}
        onChange={(item) => {
          onPick(item);
          setOpen(false);
        }}
      />
    </div>
  );
}

export function TargetPicker({ data }: { data: GameData }) {
  const t = useT();
  const plan = useActivePlan();
  const options = useItemOptions(data);
  const s = useFactoryStore.getState();

  return (
    <Panel title={t('targets.title')}>
      <Tabs
        label={t('targets.mode')}
        value={plan.mode}
        onChange={s.setMode}
        tabs={[
          { value: 'targets', label: t('targets.modeTargets') },
          { value: 'fromInput', label: t('targets.modeFromInput') },
        ]}
      >
        {plan.mode === 'targets' ? (
          <div className="flex flex-col gap-2.5">
            {plan.targets.length === 0 && <p className="text-sm text-muted">{t('targets.empty')}</p>}
            <ul className="flex flex-col gap-2">
              {plan.targets.map((target, i) => (
                <RateRow
                  key={i}
                  options={options}
                  item={target.item}
                  rate={target.rate}
                  itemLabel={t('targets.item')}
                  onItem={(item) => s.updateTarget(i, { item })}
                  onRate={(rate) => s.updateTarget(i, { rate })}
                  onRemove={() => s.removeTarget(i)}
                />
              ))}
            </ul>
            <AddRow options={options} label={t('targets.add')} onPick={(item) => s.addTarget({ item, rate: DEFAULT_RATE })} />
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <p className="text-sm text-muted">{t('supplies.hint')}</p>
            <ul className="flex flex-col gap-2">
              {plan.supplies.map((supply) => (
                <RateRow
                  key={supply.item}
                  options={options}
                  item={supply.item}
                  rate={supply.rate}
                  itemLabel={t('supplies.item')}
                  onItem={(item) => {
                    s.removeSupply(supply.item);
                    s.setSupply(item, supply.rate);
                  }}
                  onRate={(rate) => s.setSupply(supply.item, rate)}
                  onRemove={() => s.removeSupply(supply.item)}
                />
              ))}
            </ul>
            <AddRow options={options} label={t('supplies.add')} onPick={(item) => s.setSupply(item, DEFAULT_RATE)} />
            <div className="mt-1 flex flex-col gap-1.5">
              <span className="text-sm text-muted" aria-hidden="true">
                {t('supplies.maximize')}
              </span>
              <SearchCombobox
                options={options}
                value={plan.maximize}
                onChange={s.setMaximize}
                label={t('supplies.maximize')}
                placeholder={t('combobox.placeholder')}
              />
            </div>
          </div>
        )}
      </Tabs>
    </Panel>
  );
}
