import { useEffect, useState } from 'react';
import { useT } from '@/shared/i18n';
import { formatNumber } from '@/shared/lib/format';
import { CountUp } from '@/shared/ui/CountUp';
import { Icon } from '@/shared/ui/Icon';
import { fetchVisits } from './lib/visits';

const SITE = import.meta.env.VITE_GOATCOUNTER as string | undefined;

/** Neon pill with the site's visitor total; renders nothing until (and unless) the count arrives. */
export function VisitBadge() {
  const t = useT();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!SITE) return;
    let alive = true;
    fetchVisits(SITE).then((n) => alive && setCount(n));
    return () => {
      alive = false;
    };
  }, []);

  // A fresh counter reads 0 until GoatCounter's cached total (up to 4 h) refreshes; a "0 visitors" pill is worse than none.
  if (!count) return null;
  return (
    <span
      title={t('visits.title')}
      className="inline-flex items-center gap-1.5 rounded-full border border-flow/40 bg-flow/10 px-2 py-0.5 text-[11px] text-flow shadow-[0_0_10px_rgb(79_227_241/0.25)]"
    >
      <Icon name="eye" size={14} />
      <span className="sr-only">{t('visits.title')}:</span>
      <CountUp value={count} format={(n) => formatNumber(t.lang, Math.round(n), 0)} />
    </span>
  );
}
