import { useEffect } from 'react';
import { hasShareHash, importShareHash } from '@/features/factory/share';
import { translate, useLangStore } from '@/shared/i18n';
import { toast } from '@/shared/ui/Toast';

function importFromLocation() {
  if (!hasShareHash(location.hash)) return;
  const res = importShareHash(location.hash);
  toast(translate(useLangStore.getState().lang, res.ok ? 'share.imported' : 'share.broken'), res.ok ? 'info' : 'error');
  // Cleared either way: a reload must not import the same factory twice or repeat the error.
  history.replaceState(null, '', location.pathname + location.search);
}

/**
 * `#s=` links at startup and pasted into an open tab. Independent of game data and locale loading:
 * importing needs neither, and tying it to data readiness re-ran it on every language switch.
 */
export function useShareLinks() {
  useEffect(() => {
    importFromLocation();
    addEventListener('hashchange', importFromLocation);
    return () => removeEventListener('hashchange', importFromLocation);
  }, []);
}
