import { useCallback, useEffect, useState } from 'react';
import { loadGameData, loadLocale, loadManifest } from '@/shared/data/load';
import type { GameData, GameLocale } from '@/shared/data/types';
import type { Lang } from '@/shared/i18n';

export type GameDataState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; data: GameData; locale: GameLocale };

/**
 * Loads the current build and the locale for `lang`. A language switch keeps showing the old
 * locale until the new one arrives, so only the first load (or a retry) shows the loading screen.
 */
export function useGameData(lang: Lang, onReady: (data: GameData) => Promise<void>): GameDataState & { retry: () => void } {
  const [state, setState] = useState<GameDataState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    loadManifest()
      .then(({ current }) => Promise.all([loadGameData(current), loadLocale(current, lang)]))
      .then(async ([data, locale]) => {
        await onReady(data);
        return [data, locale] as const;
      })
      .then(
        ([data, locale]) => alive && setState({ status: 'ready', data, locale }),
        (error: unknown) => alive && setState({ status: 'error', error }),
      );
    return () => {
      alive = false;
    };
    // onReady deliberately not a dependency: it is a module-level bootstrap, re-running on it would refetch.
  }, [lang, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((a) => a + 1);
  }, []);

  return { ...state, retry };
}
