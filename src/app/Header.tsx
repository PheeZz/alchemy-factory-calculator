import { FactorySwitcher } from '@/features/factory/FactorySwitcher';
import { useLangStore, useT, type Lang } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { copyShareLink } from '@/features/factory/share';
import { useActiveFactory } from '@/features/factory/store';
import { useViewStore, type AppView } from '@/shared/lib/view';
import { toast } from '@/shared/ui/Toast';
import { IconButton } from '@/shared/ui/Button';
import { Sigil } from '@/shared/ui/Sigil';

function LangToggle() {
  const t = useT();
  const { lang, setLang } = useLangStore();
  return (
    <div role="group" aria-label={t('header.lang')} className="flex rounded-xl border border-line bg-void/50 p-0.5">
      {(['ru', 'en'] as Lang[]).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={lang === l}
          lang={l}
          onClick={() => setLang(l)}
          className={cx(
            'h-8 rounded-[0.6rem] px-2.5 text-xs font-semibold tracking-wide transition-colors',
            lang === l ? 'bg-arcane/25 text-ink' : 'text-muted hover:text-ink',
          )}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

/** Screen switch: navigation between views, so aria-current rather than a tab widget. */
function ViewSwitch() {
  const t = useT();
  const { view, setView } = useViewStore();
  return (
    <nav aria-label={t('nav.views')} className="flex rounded-xl border border-line bg-void/50 p-0.5">
      {(['calculator', 'fuel'] as AppView[]).map((v) => (
        <button
          key={v}
          type="button"
          aria-current={view === v ? 'page' : undefined}
          onClick={() => setView(v)}
          className={cx(
            'h-8 rounded-[0.6rem] px-2.5 text-xs font-semibold transition-colors sm:px-3',
            view === v ? 'bg-arcane/25 text-ink' : 'text-muted hover:text-ink',
          )}
        >
          {t(`nav.${v}`)}
        </button>
      ))}
    </nav>
  );
}

export function Header({ buildId }: { buildId: string }) {
  const t = useT();
  const factory = useActiveFactory();
  const onShare = () =>
    copyShareLink(buildId, factory).then((ok) => toast(t(ok ? 'share.copied' : 'share.copyFailed'), ok ? 'info' : 'error'));
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line/70 bg-void/40 px-3 py-2 backdrop-blur-md lg:gap-6 lg:px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <Sigil />
        <h1 className="sr-only min-w-0 leading-none sm:not-sr-only">
          <span className="block truncate font-display text-lg text-ink lg:text-xl">{t('brand.title')}</span>
          <span className="hidden text-xs text-muted sm:block">{t('brand.subtitle')}</span>
        </h1>
      </div>
      <ViewSwitch />
      {/* Phones: the switcher takes its own row; beside five controls it shrank to nothing. */}
      <FactorySwitcher className="order-last w-full sm:order-none sm:w-56" />
      <div className="ml-auto flex items-center gap-2">
        <LangToggle />
        <IconButton icon="share" label={t('header.share')} onClick={onShare} />
      </div>
    </header>
  );
}
