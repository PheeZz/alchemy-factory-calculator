import { useId } from 'react';
import type { GameData, UpgradeTrack } from '@/shared/data/types';
import { useFactoryStore } from '@/features/factory/store';
import { useT } from '@/shared/i18n';
import { formatNumber } from '@/shared/lib/format';
import { IconButton } from '@/shared/ui/Button';
import { NumberFlip } from '@/shared/ui/NumberFlip';
import { Panel } from '@/shared/ui/Panel';

function TrackRow({ track, level, onLevel }: { track: UpgradeTrack; level: number; onLevel: (l: number) => void }) {
  const t = useT();
  const id = useId();
  const name = t(`upgrades.track.${track.id}`);
  const value = track.values[level] ?? track.values[0] ?? 1;
  const shown =
    track.id === 'conveyor' ? t('unit.perMin', { value: formatNumber(t.lang, value, 0) }) : `×${formatNumber(t.lang, value, 2)}`;
  const set = (l: number) => onLevel(Math.max(0, Math.min(track.maxLevel, l)));

  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm text-ink">
          {name}
        </label>
        <span className="text-sm">
          <NumberFlip value={shown} className="font-semibold text-flow" />{' '}
          <span className="num text-xs text-faint">{t('upgrades.level', { level, max: track.maxLevel })}</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <IconButton icon="minus" size="sm" label={t('upgrades.decrease', { name })} disabled={level === 0} onClick={() => set(level - 1)} />
        <input
          id={id}
          type="range"
          min={0}
          max={track.maxLevel}
          step={1}
          value={level}
          aria-valuetext={`${shown}, ${t('upgrades.level', { level, max: track.maxLevel })}`}
          onChange={(e) => set(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer accent-[var(--color-arcane)]"
        />
        <IconButton
          icon="plus"
          size="sm"
          label={t('upgrades.increase', { name })}
          disabled={level === track.maxLevel}
          onClick={() => set(level + 1)}
        />
      </div>
    </li>
  );
}

export function UpgradesPanel({ data }: { data: GameData }) {
  const t = useT();
  const levels = useFactoryStore((s) => s.levels);
  const setLevels = useFactoryStore.getState().setLevels;
  return (
    <Panel title={t('upgrades.title')}>
      <ul className="flex flex-col gap-4">
        {data.upgrades.map((track) => (
          <TrackRow key={track.id} track={track} level={levels[track.id]} onLevel={(l) => setLevels({ [track.id]: l })} />
        ))}
      </ul>
    </Panel>
  );
}
