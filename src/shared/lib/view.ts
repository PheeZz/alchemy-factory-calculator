import { create } from 'zustand';

export type AppView = 'calculator' | 'fuel';

const fromUrl = (): AppView =>
  typeof location !== 'undefined' && new URLSearchParams(location.search).get('view') === 'fuel' ? 'fuel' : 'calculator';

/**
 * Current screen, mirrored in `?view=` so a reload keeps it. The query string, not the hash:
 * `#s=` belongs to share links and must stay free.
 */
export const useViewStore = create<{ view: AppView; setView: (view: AppView) => void }>((set) => ({
  view: fromUrl(),
  setView: (view) => {
    const url = new URL(location.href);
    if (view === 'calculator') url.searchParams.delete('view');
    else url.searchParams.set('view', view);
    history.replaceState(history.state, '', url);
    set({ view });
  },
}));
