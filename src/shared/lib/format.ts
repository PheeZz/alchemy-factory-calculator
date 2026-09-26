import type { Lang } from '@/shared/i18n';

const LOCALES: Record<Lang, string> = { ru: 'ru-RU', en: 'en-US' };
const cache = new Map<string, Intl.NumberFormat>();

function nf(lang: Lang, options: Intl.NumberFormatOptions) {
  const key = lang + JSON.stringify(options);
  let f = cache.get(key);
  if (!f) cache.set(key, (f = new Intl.NumberFormat(LOCALES[lang], options)));
  return f;
}

export function formatNumber(lang: Lang, n: number, maxFrac = 2) {
  return nf(lang, { maximumFractionDigits: maxFrac }).format(n);
}

/** Per-minute rates: precision shrinks as magnitude grows, huge values go compact. */
export function formatRate(lang: Lang, perMin: number) {
  const a = Math.abs(perMin);
  if (a >= 10_000) return nf(lang, { notation: 'compact', maximumFractionDigits: 1 }).format(perMin);
  return formatNumber(lang, perMin, a >= 100 ? 0 : a >= 10 ? 1 : 2);
}

/** Written by hand: ru Intl puts a space before %, the node chip needs the compact form. */
export function formatPercent(fraction: number) {
  return `${Math.round(fraction * 100)}%`;
}

export const COPPER_PER_SILVER = 1000;
export const COPPER_PER_GOLD = 100_000;

export function splitCopper(total: number) {
  const c = Math.max(0, Math.round(total));
  return {
    gold: Math.floor(c / COPPER_PER_GOLD),
    silver: Math.floor((c % COPPER_PER_GOLD) / COPPER_PER_SILVER),
    copper: c % COPPER_PER_SILVER,
  };
}
