import type { GameData } from '@/shared/data/types';
import { planDefaults } from '@/features/factory/defaults';
import { hasShareHash, importShareHash } from '@/features/factory/share';
import { useFactoryStore } from '@/features/factory/store';
import { translate, useLangStore } from '@/shared/i18n';
import { toast } from '@/shared/ui/Toast';

/** Runs once data is loaded: build-specific defaults, first factory, and a pending `#s=` share link. */
export function bootstrap(data: GameData) {
  useFactoryStore.getState().init(planDefaults(data));

  if (!hasShareHash(location.hash)) return;
  const lang = useLangStore.getState().lang;
  const res = importShareHash(location.hash);
  toast(translate(lang, res.ok ? 'share.imported' : 'share.broken'), res.ok ? 'info' : 'error');
  // Cleared either way: a reload must not import the same factory twice or repeat the error.
  history.replaceState(null, '', location.pathname + location.search);
}
