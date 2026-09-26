/**
 * `storage` fires only in *other* tabs of the same origin, so the handler never reacts to its own writes.
 * Rehydrating (zustand persist) does not write back, which keeps two tabs from echoing forever.
 */
export function syncAcrossTabs(key: string, rehydrate: () => unknown) {
  if (typeof window === 'undefined') return;
  window.addEventListener('storage', (e) => {
    if (e.key === key || e.key === null) void rehydrate();
  });
}
