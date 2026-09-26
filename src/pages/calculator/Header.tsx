import { FactorySwitcher } from '@/features/factory/FactorySwitcher';
import { useLangStore, useT, type Lang } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
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

export function Header({ onShare }: { onShare: () => void }) {
  const t = useT();
  return (
    <header className="flex items-center gap-3 border-b border-line/70 bg-void/40 px-3 py-2 backdrop-blur-md lg:gap-6 lg:px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <Sigil />
        <h1 className="sr-only min-w-0 leading-none sm:not-sr-only">
          <span className="block truncate font-display text-lg text-ink lg:text-xl">{t('brand.title')}</span>
          <span className="hidden text-xs text-muted sm:block">{t('brand.subtitle')}</span>
        </h1>
      </div>
      <FactorySwitcher className="min-w-0 flex-1 sm:w-56 sm:flex-none lg:ml-4" />
      <div className="ml-auto flex items-center gap-2">
        <LangToggle />
        <IconButton icon="share" label={t('header.share')} onClick={onShare} />
      </div>
    </header>
  );
}
