import { useT } from '@/shared/i18n';
import { formatNumber, splitCopper } from '@/shared/lib/format';

const METALS = [
  { key: 'gold', color: '#f3c74f' },
  { key: 'silver', color: '#cdd5e6' },
  { key: 'copper', color: '#d98b5f' },
] as const;

/** Money as the game shows it: gold/silver/copper, zero leading denominations dropped. */
export function Coins({ copper }: { copper: number }) {
  const t = useT();
  const parts = splitCopper(copper);
  const firstNonZero = METALS.findIndex((m) => parts[m.key] > 0);
  const shown = METALS.slice(firstNonZero === -1 ? 2 : firstNonZero);
  return (
    <span className="num inline-flex items-center gap-2.5" role="img" aria-label={t('money.aria', parts)}>
      {shown.map((m) => (
        <span key={m.key} className="inline-flex items-center gap-1" aria-hidden="true">
          <span className="size-2.5 rounded-full" style={{ background: m.color, boxShadow: `inset 0 -1px 0 rgb(0 0 0 / 0.35)` }} />
          {formatNumber(t.lang, parts[m.key], 0)}
        </span>
      ))}
    </span>
  );
}
