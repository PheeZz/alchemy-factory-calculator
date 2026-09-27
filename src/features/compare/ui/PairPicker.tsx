import { useId } from 'react';
import type { GameData } from '@/shared/data/types';
import { useErrorMessage } from '@/features/factory/useErrorMessage';
import type { SolveErrorInfo } from '@/features/factory/useSolve';
import { useFactoryStore } from '@/features/factory/store';
import { useT } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { IconButton } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import type { Side } from '../model/useComparePair';
import { useCompareStore } from '../model/useCompareStore';

function SideError({ data, error }: { data: GameData; error: SolveErrorInfo }) {
  const t = useT();
  return (
    <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-[#ffc2c7]">
      <span className="font-medium">{t('error.title')}: </span>
      {useErrorMessage(data, error)}
    </p>
  );
}

function SidePicker({ data, slot, side }: { data: GameData; slot: 'a' | 'b'; side: Side }) {
  const t = useT();
  const id = useId();
  const factories = useFactoryStore((s) => s.factories);
  const pick = useCompareStore((s) => s.pick);
  const { state } = side;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className={cx('text-xs font-semibold', slot === 'a' ? 'text-flow' : 'text-arcane')}>
        {t(slot === 'a' ? 'compare.a' : 'compare.b')}
      </label>
      <Select id={id} value={side.factory?.id ?? ''} onChange={(e) => pick({ [slot]: e.target.value })}>
        {factories.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </Select>
      {state.status === 'loading' && (
        <p role="status" className="flex items-center gap-2 text-xs text-muted">
          <span className="size-2 animate-pulse rounded-full bg-flow motion-reduce:animate-none" aria-hidden="true" />
          {t('compare.loading')}
        </p>
      )}
      {state.status === 'empty' && <p className="text-xs text-faint">{t('compare.empty')}</p>}
      {state.status === 'error' && <SideError data={data} error={state.error} />}
    </div>
  );
}

/** Factory A and B selects with a swap between them; each side reports its own solve state. */
export function PairPicker({ data, a, b }: { data: GameData; a: Side; b: Side }) {
  const t = useT();
  const pick = useCompareStore((s) => s.pick);
  return (
    <div className="glass grid gap-3 rounded-panel p-4 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
      <SidePicker data={data} slot="a" side={a} />
      <IconButton
        icon="swap"
        label={t('compare.swap')}
        className="justify-self-center sm:mt-6"
        onClick={() => pick({ a: b.factory?.id ?? null, b: a.factory?.id ?? null })}
      />
      <SidePicker data={data} slot="b" side={b} />
    </div>
  );
}
