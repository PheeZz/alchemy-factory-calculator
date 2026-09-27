import type { GameData } from '@/shared/data/types';
import { useT } from '@/shared/i18n';
import { VisitBadge } from './VisitBadge';

/** Game-data version and visitor badge: the bottom line of the controls, on desktop and phone. */
export function SiteInfo({ data }: { data: GameData }) {
  const t = useT();
  return (
    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 px-1 pb-1">
      <p className="text-[11px] text-faint">{t('game.version', { version: data.build.version, build: data.build.id })}</p>
      <VisitBadge />
    </div>
  );
}
