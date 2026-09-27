import type { Lang } from './index';

const isLang = (v: string | null): v is Lang => v === 'ru' || v === 'en';

/** `?lang=` wins over the `/en/` entry path, so `/en/?lang=ru` is Russian. */
export function langFromUrl(href: string, base: string): Lang | null {
  const url = new URL(href);
  const q = url.searchParams.get('lang');
  if (isLang(q)) return q;
  return url.pathname.startsWith(`${base}en/`) ? 'en' : null;
}

/**
 * The path follows the language (root = ru, `/en/` = en) because crawlers ignore the query: a link
 * copied from `/en/` must unfurl with the English preview. `?lang` is kept anyway so the language
 * survives hosts or copies that drop the path.
 */
export function withLang(href: string, lang: Lang, base: string): string {
  const url = new URL(href);
  const enPath = `${base}en/`;
  if (lang === 'en' && url.pathname === base) url.pathname = enPath;
  if (lang === 'ru' && url.pathname.startsWith(enPath)) url.pathname = base;
  url.searchParams.set('lang', lang);
  return url.toString();
}

/** URL > saved choice > browser language. */
export function pickLang(fromUrl: Lang | null, saved: Lang | null, browser: string): Lang {
  return fromUrl ?? saved ?? (browser.toLowerCase().startsWith('en') ? 'en' : 'ru');
}
