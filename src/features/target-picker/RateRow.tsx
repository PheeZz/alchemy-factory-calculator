import { useT } from '@/shared/i18n';
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
}: {
  options: ComboOption[];
  item: string;
  rate: number;
  itemLabel: string;
  onItem: (item: string) => void;
  onRate: (rate: number) => void;
  onRemove: () => void;
}) {
  const t = useT();
  const name = options.find((o) => o.value === item)?.label ?? item;
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_6.5rem_auto] items-center gap-2">
      <SearchCombobox options={options} value={item} onChange={onItem} label={itemLabel} placeholder={t('combobox.placeholder')} />
      <NumberInput value={rate} onChange={onRate} suffix={t('unit.perMin', { value: '' })} aria-label={t('targets.rate', { name })} />
      <IconButton icon="close" size="sm" label={t('targets.remove', { name })} className="border-transparent bg-transparent" onClick={onRemove} />
    </li>
  );
}
