import { DataLoadError } from '@/shared/data/load';
import { useT } from '@/shared/i18n';
import { Button } from '@/shared/ui/Button';
import { Sigil } from '@/shared/ui/Sigil';

export function LoadingScreen() {
  const t = useT();
  return (
    <main className="grid h-dvh place-items-center p-6" aria-busy="true">
      <div className="flex flex-col items-center gap-4 text-center">
        <Sigil className="size-16 animate-[spin_12s_linear_infinite] motion-reduce:animate-none" />
        <h1 className="font-display text-2xl text-ink">{t('brand.title')}</h1>
        <p role="status" className="text-sm text-muted">
          {t('load.loading')}
        </p>
      </div>
    </main>
  );
}

export function LoadErrorScreen({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const t = useT();
  const detail =
    error instanceof DataLoadError
      ? t(`load.error.${error.kind}`, { status: error.status ?? '' })
      : t('load.error.unknown');
  return (
    <main className="grid h-dvh place-items-center p-6">
      <div role="alert" className="glass flex max-w-md flex-col items-center gap-3 rounded-panel p-6 text-center">
        <Sigil className="size-12 opacity-70" />
        <h1 className="font-display text-xl text-ink">{t('load.error.title')}</h1>
        <p className="text-sm text-muted">{detail}</p>
        <Button variant="primary" icon="loop" onClick={onRetry} className="mt-2">
          {t('load.retry')}
        </Button>
      </div>
    </main>
  );
}
