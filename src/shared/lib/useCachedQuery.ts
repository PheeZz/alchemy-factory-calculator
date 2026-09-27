import { useEffect, useState } from 'react';

export type QueryState<T> = { status: 'loading' } | { status: 'error'; error: unknown } | { status: 'ready'; data: T };

// Session cache by key: switching tabs or metrics must not re-run a few dozen solves.
const cache = new Map<string, Promise<unknown>>();

/**
 * Runs `load` once per `key` for the session and shares the promise between components.
 * Failures are evicted so a later render retries. `key` must capture every input of `load`.
 */
export function useCachedQuery<T>(key: string | null, load: () => Promise<T>): QueryState<T> {
  const [state, setState] = useState<QueryState<T>>({ status: 'loading' });
  useEffect(() => {
    if (key === null) return;
    let alive = true;
    let p = cache.get(key) as Promise<T> | undefined;
    if (!p) {
      p = load();
      cache.set(key, p);
      p.catch(() => cache.delete(key));
    }
    setState({ status: 'loading' });
    p.then(
      (data) => alive && setState({ status: 'ready', data }),
      (error: unknown) => alive && setState({ status: 'error', error }),
    );
    return () => {
      alive = false;
    };
    // `load` is a fresh closure every render; `key` stands for its inputs.
  }, [key]);
  return state;
}
