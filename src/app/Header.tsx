import { FactorySwitcher } from '@/features/factory/FactorySwitcher';
import { useLangStore, useT, type Lang } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { copyShareLink } from '@/features/factory/share';
import { useActiveFactory } from '@/features/factory/store';
import { useViewStore, type AppView } from '@/shared/lib/view';
import { toast } from '@/shared/ui/Toast';
import { Icon } from '@/shared/ui/Icon';
import { RATE_UNITS, useUnitStore } from '@/shared/lib/units';
import { MOD_KEY, usePalette } from '@/features/command-palette/model/usePalette';
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

function UnitsToggle() {
  const t = useT();
  const { rateUnit, setRateUnit } = useUnitStore();
  return (
    <div role="group" aria-label={t('units.label')} className="flex shrink-0 rounded-xl border border-line bg-void/50 p-0.5">
      {RATE_UNITS.map((u) => (
        <button
          key={u}
          type="button"
          aria-pressed={rateUnit === u}
          onClick={() => setRateUnit(u)}
          className={cx(
            'num h-8 rounded-[0.6rem] px-2 text-xs font-semibold transition-colors',
            rateUnit === u ? 'bg-flow/20 text-ink' : 'text-muted hover:text-ink',
          )}
        >
          {t(`units.${u}`)}
        </button>
      ))}
    </div>
  );
}

function SearchButton() {
  const t = useT();
  const setOpen = usePalette((s) => s.setOpen);
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={t('palette.open')}
      aria-keyshortcuts="Control+K Meta+K"
      title={`${t('palette.open')} (${MOD_KEY}+K)`}
      className="flex h-10 items-center gap-2 rounded-xl border border-line bg-white/[0.03] px-2.5 text-sm text-muted transition-colors hover:border-flow/50 hover:text-ink"
    >
      <Icon name="search" size={17} />
      <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 font-sans text-[11px] text-faint lg:inline">{MOD_KEY} K</kbd>
    </button>
  );
}

export function Header({ buildId }: { buildId: string }) {
  const t = useT();
  const factory = useActiveFactory();
  const onShare = () =>
    copyShareLink(buildId, factory).then((ok) => toast(t(ok ? 'share.copied' : 'share.copyFailed'), ok ? 'info' : 'error'));
  return (
    <header className="flex flex-wrap items-center gap-x-2 gap-y-2 border-b sm:gap-x-3 border-line/70 bg-void/40 px-3 py-2 backdrop-blur-md lg:gap-6 lg:px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <Sigil />
        <h1 className="sr-only min-w-0 leading-none sm:not-sr-only">
          <span className="block truncate font-display text-lg text-ink lg:text-xl">{t('brand.title')}</span>
          <span className="hidden text-xs text-muted sm:block">{t('brand.subtitle')}</span>
        </h1>
      </div>
      <ViewSwitch />
      {/* Phones: switcher + units take their own row; beside the other controls they shrank to nothing. */}
      <div className="order-last flex w-full items-center gap-2 sm:order-none sm:w-auto">
        <FactorySwitcher className="min-w-0 flex-1 sm:w-56 sm:flex-none" />
        <UnitsToggle />
        {/* Phones: language joins this row so the first one fits in 390px (display:none hides the twin from AT). */}
        <div className="sm:hidden">
          <LangToggle />
        </div>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <SearchButton />
        <div className="hidden sm:block">
          <LangToggle />
        </div>
        <IconButton icon="share" label={t('header.share')} onClick={onShare} />
      </div>
    </header>
  );
}
