import { useT } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { IconButton } from '@/shared/ui/Button';
import { NumberInput } from '@/shared/ui/NumberInput';
import { SearchCombobox, type ComboOption } from '@/shared/ui/SearchCombobox';

/** One "item × rate/min" line, shared by targets and supplies. */
export function RateRow({
  options,
  item,
  rate,
  itemLabel,
  onItem,
  onRate,
  onRemove,
  unlimited,
  onToggleUnlimited,
}: {
  options: ComboOption[];
  item: string;
  rate: number;
  itemLabel: string;
  onItem: (item: string) => void;
  onRate: (rate: number) => void;
  onRemove: () => void;
  /** fromInput only: an unlimited supply is an import, so the rate field gives way to a toggle state. */
  unlimited?: boolean;
  onToggleUnlimited?: () => void;
}) {
  const t = useT();
  const name = options.find((o) => o.value === item)?.label ?? item;
  return (
    <li className={cx('grid items-center gap-2', onToggleUnlimited ? 'grid-cols-[minmax(0,1fr)_5.25rem_auto_auto]' : 'grid-cols-[minmax(0,1fr)_6.5rem_auto]')}>
      <SearchCombobox options={options} value={item} onChange={onItem} label={itemLabel} placeholder={t('combobox.placeholder')} />
      {unlimited ? (
        <span className="grid h-10 place-items-center rounded-xl border border-flow/30 bg-flow/5 text-xs text-flow">{t('supplies.unlimited')}</span>
      ) : (
        <NumberInput value={rate} onChange={onRate} suffix={t('unit.perMin', { value: '' })} aria-label={t('targets.rate', { name })} />
      )}
      {onToggleUnlimited && (
        <IconButton
          icon="infinity"
          size="sm"
          label={t('supplies.toggleUnlimited', { name })}
          aria-pressed={!!unlimited}
          onClick={onToggleUnlimited}
          className={unlimited ? 'border-flow/60 bg-flow/15 text-flow' : 'border-transparent bg-transparent'}
        />
      )}
      <IconButton icon="close" size="sm" label={t('targets.remove', { name })} className="border-transparent bg-transparent" onClick={onRemove} />
    </li>
  );
}
