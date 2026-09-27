import { createContext, createElement, useCallback, useContext, type ReactNode } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameLocale } from '@/shared/data/types';
import { formatRate } from '@/shared/lib/format';
import { syncAcrossTabs } from '@/shared/lib/syncAcrossTabs';
import { fromPerMin, toPerMin, useUnitStore } from '@/shared/lib/units';
import { ru } from './ru';
import { en } from './en';
import { langFromUrl, pickLang, withLang } from './url';

export type Lang = 'ru' | 'en';
export type DictKey = keyof typeof ru;
export type Dict = Record<DictKey, string>;

const dicts: Record<Lang, Dict> = { ru, en };

const BASE = import.meta.env.BASE_URL;
const urlLang = () => (typeof location === 'undefined' ? null : langFromUrl(location.href, BASE));
const detectLang = (saved: Lang | null) =>
  pickLang(urlLang(), saved, typeof navigator === 'undefined' ? '' : navigator.language);

// Kept separate from the factory store so i18n has no dependency on features.
export const useLangStore = create<{ lang: Lang; setLang: (lang: Lang) => void }>()(
  persist(
    (set) => ({
      lang: detectLang(null),
      setLang: (lang) => set({ lang }),
    }),
    {
      name: 'afc:lang',
      version: 1,
      partialize: (s) => ({ lang: s.lang }),
      // Re-read on every rehydrate (also cross-tab), so a tab opened by an explicit ?lang link keeps it.
      merge: (saved, current) => ({ ...current, lang: detectLang((saved as { lang?: Lang } | undefined)?.lang ?? null) }),
    },
  ),
);

// An explicit URL language is remembered: set() is what writes to storage, hydration does not.
if (urlLang()) useLangStore.setState({ lang: useLangStore.getState().lang });

syncAcrossTabs('afc:lang', () => useLangStore.persist.rehydrate());

if (typeof location !== 'undefined') {
  useLangStore.subscribe((s, prev) => {
    if (s.lang !== prev.lang) history.replaceState(history.state, '', withLang(location.href, s.lang, BASE));
  });
}

/** Current page with the language pinned, for links that leave this tab. */
export const hrefWithLang = (href: string) => withLang(href, useLangStore.getState().lang, BASE);

/** `{name}` placeholders are replaced from params. */
export function translate(lang: Lang, key: DictKey, params?: Record<string, string | number>): string {
  const text: string = dicts[lang][key];
  return params ? text.replace(/\{(\w+)\}/g, (m, p: string) => String(params[p] ?? m)) : text;
}

/** Dict keys that carry CLDR plural forms as `<base>.one|few|many|other`. */
type PluralBase = 'belts' | 'machines' | 'slots';

export function translatePlural(lang: Lang, base: PluralBase, n: number, params?: Record<string, string | number>) {
  const form = new Intl.PluralRules(lang).select(n) as 'one' | 'few' | 'many' | 'other';
  const key = `${base}.${form === 'one' || form === 'few' || form === 'many' ? form : 'other'}` as DictKey;
  return translate(lang, key, { n, ...params });
}

export function useT() {
  const lang = useLangStore((s) => s.lang);
  const rateUnit = useUnitStore((s) => s.rateUnit);
  const t = (key: DictKey, params?: Record<string, string | number>) => translate(lang, key, params);
  t.plural = (base: PluralBase, n: number, params?: Record<string, string | number>) =>
    translatePlural(lang, base, n, params);
  t.lang = lang;
  // The one seam for item rates on screen: values arrive in /min, the player picks /s, /min or /h.
  t.rateUnit = rateUnit;
  /** "12,5/мин" in the chosen unit. */
  t.rate = (perMin: number) => translate(lang, `unit.per.${rateUnit}`, { value: formatRate(lang, fromPerMin(perMin, rateUnit)) });
  /** Number only, for compact chips. */
  t.rateValue = (perMin: number) => formatRate(lang, fromPerMin(perMin, rateUnit));
  /** Any per-minute quantity (money, items) converted to the chosen unit; and back, for inputs. */
  t.fromPerMin = (perMin: number) => fromPerMin(perMin, rateUnit);
  t.toPerMin = (value: number) => toPerMin(value, rateUnit);
  /** Unit suffix alone ("/мин") for inputs and column headers. */
  t.rateSuffix = translate(lang, `unit.per.${rateUnit}`, { value: '' });
  return t;
}

const GameLocaleContext = createContext<GameLocale>({});

export function GameLocaleProvider({ locale, children }: { locale: GameLocale; children: ReactNode }) {
  return createElement(GameLocaleContext.Provider, { value: locale }, children);
}

/** Resolver for game entity names; falls back to the key so missing strings stay visible, not blank. */
export function useNames() {
  const locale = useContext(GameLocaleContext);
  return useCallback((nameKey: string) => locale[nameKey] ?? nameKey, [locale]);
}

export function useName(nameKey: string) {
  return useNames()(nameKey);
}
