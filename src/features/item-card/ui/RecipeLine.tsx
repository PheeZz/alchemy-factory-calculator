import type { GameData, Recipe, Stack } from '@/shared/data/types';
import { useNames, useT } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { formatNumber } from '@/shared/lib/format';
import { GlowBadge } from '@/shared/ui/GlowBadge';
import { ItemIcon } from '@/shared/ui/ItemIcon';

function StackChip({ data, stack, current, onOpen }: { data: GameData; stack: Stack; current: string; onOpen: (item: string) => void }) {
  const t = useT();
  const name = useNames();
  const item = data.items[stack.item];
  const label = item ? name(item.nameKey) : stack.item;
  const self = stack.item === current;
  return (
    <button
      type="button"
      onClick={() => onOpen(stack.item)}
      disabled={self}
      title={label}
      aria-label={`${label} × ${formatNumber(t.lang, stack.qty, 2)}`}
      className={cx(
        'num inline-flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-xs transition-colors',
        self ? 'border-arcane/60 bg-arcane/15 text-ink' : 'border-line text-muted hover:border-flow/50 hover:text-ink',
      )}
    >
      <ItemIcon icon={item?.icon ?? null} name={label} seed={stack.item} size={18} decorative />
      {formatNumber(t.lang, stack.qty, 2)}
    </button>
  );
}

/** One recipe: machine, time, badges, then inputs → outputs as clickable items. */
export function RecipeLine({ data, recipe, current, onOpen }: { data: GameData; recipe: Recipe; current: string; onOpen: (item: string) => void }) {
  const t = useT();
  const name = useNames();
  const building = data.buildings[recipe.buildings[0] ?? ''];
  const bName = building ? name(building.nameKey) : (recipe.buildings[0] ?? '—');
  return (
    <li className="rounded-xl border border-line bg-void/40 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
        <ItemIcon icon={building?.icon ?? null} name={bName} seed={building?.id ?? 'b'} size={20} decorative />
        <span className="text-ink/90">{bName}</span>
        <span className="num">{t('inspector.perBatch', { time: formatNumber(t.lang, recipe.timeSec, 1) })}</span>
        {recipe.alternate && <GlowBadge tone="arcane">{t('card.alternate')}</GlowBadge>}
        {recipe.special && <GlowBadge tone="ember">{t('card.special')}</GlowBadge>}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {recipe.inputs.length === 0 && <span className="text-xs text-faint">{t('card.noInputs')}</span>}
        {recipe.inputs.map((s) => (
          <StackChip key={s.item} data={data} stack={s} current={current} onOpen={onOpen} />
        ))}
        <span className="px-1 text-faint" aria-hidden="true">
          →
        </span>
        {recipe.outputs.map((s) => (
          <StackChip key={s.item} data={data} stack={s} current={current} onOpen={onOpen} />
        ))}
      </div>
    </li>
  );
}
