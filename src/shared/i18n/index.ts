import { create } from 'zustand';
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
export const useLangStore = create<{ lang: Lang; setLang: (lang: Lang) => void }>((set) => ({
  lang: detectLang(),
  setLang: (lang) => set({ lang }),
}));

/** `{name}` placeholders are replaced from params. */
export function translate(lang: Lang, key: DictKey, params?: Record<string, string | number>): string {
  const text: string = dicts[lang][key];
  return params ? text.replace(/\{(\w+)\}/g, (m, p: string) => String(params[p] ?? m)) : text;
}

export function useT() {
  const lang = useLangStore((s) => s.lang);
  return (key: DictKey, params?: Record<string, string | number>) => translate(lang, key, params);
}
