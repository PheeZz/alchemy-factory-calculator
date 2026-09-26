import { createContext, createElement, useCallback, useContext, type ReactNode } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameLocale } from '@/shared/data/types';
import { ru } from './ru';
import { en } from './en';

export type Lang = 'ru' | 'en';
export type DictKey = keyof typeof ru;
export type Dict = Record<DictKey, string>;

const dicts: Record<Lang, Dict> = { ru, en };

function detectLang(): Lang {
  if (typeof navigator === 'undefined') return 'ru';
  return navigator.language.toLowerCase().startsWith('en') ? 'en' : 'ru';
}

// Kept separate from the factory store so i18n has no dependency on features.
export const useLangStore = create<{ lang: Lang; setLang: (lang: Lang) => void }>()(
  persist(
    (set) => ({
      lang: detectLang(),
      setLang: (lang) => set({ lang }),
    }),
    { name: 'afc:lang', version: 1, partialize: (s) => ({ lang: s.lang }) },
  ),
);

/** `{name}` placeholders are replaced from params. */
export function translate(lang: Lang, key: DictKey, params?: Record<string, string | number>): string {
  const text: string = dicts[lang][key];
  return params ? text.replace(/\{(\w+)\}/g, (m, p: string) => String(params[p] ?? m)) : text;
}

/** Dict keys that carry CLDR plural forms as `<base>.one|few|many|other`. */
type PluralBase = 'belts' | 'machines';

export function translatePlural(lang: Lang, base: PluralBase, n: number, params?: Record<string, string | number>) {
  const form = new Intl.PluralRules(lang).select(n) as 'one' | 'few' | 'many' | 'other';
  const key = `${base}.${form === 'one' || form === 'few' || form === 'many' ? form : 'other'}` as DictKey;
  return translate(lang, key, { n, ...params });
}

export function useT() {
  const lang = useLangStore((s) => s.lang);
  const t = (key: DictKey, params?: Record<string, string | number>) => translate(lang, key, params);
  t.plural = (base: PluralBase, n: number, params?: Record<string, string | number>) =>
    translatePlural(lang, base, n, params);
  t.lang = lang;
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
