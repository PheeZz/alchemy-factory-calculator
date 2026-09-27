import { useT } from '@/shared/i18n';
import { cx } from '@/shared/lib/cx';
import { Button, IconButton } from '@/shared/ui/Button';
import type { ImageFormat } from './export';

export type GraphMode = 'graph' | 'flows';

const MODES: GraphMode[] = ['graph', 'flows'];

export function GraphToolbar({
  mode,
  onMode,
  grouped,
  onGrouped,
  onExport,
  exporting,
}: {
  mode: GraphMode;
  onMode: (mode: GraphMode) => void;
  grouped: boolean;
  onGrouped: (grouped: boolean) => void;
  onExport: (format: ImageFormat) => void;
  exporting: boolean;
}) {
  const t = useT();
  // The flow diagram is exported as vector only: it is already an SVG, a raster adds nothing.
  const formats: ImageFormat[] = mode === 'graph' ? ['png', 'svg'] : ['svg'];
  return (
    <div role="group" aria-label={t('graph.toolbar')} className="glass absolute top-3 right-3 z-10 flex items-center gap-1 rounded-xl p-1">
      <div className="flex rounded-lg bg-void/50 p-0.5">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => onMode(m)}
            className={cx(
              'h-7 rounded-md px-2.5 text-[13px] font-medium transition-colors',
              mode === m ? 'bg-arcane/25 text-ink' : 'text-muted hover:text-ink',
            )}
          >
            {t(`graph.view.${m}`)}
          </button>
        ))}
      </div>
      {mode === 'graph' && (
        <IconButton
          icon="layers"
          size="sm"
          label={t('graph.group')}
          aria-pressed={grouped}
          onClick={() => onGrouped(!grouped)}
          className={cx('border-transparent', grouped && 'border-arcane/60 bg-arcane/20 text-[#d7b8ff]')}
        />
      )}
      {formats.map((f) => (
        <Button
          key={f}
          size="sm"
          icon="download"
          aria-label={t(`graph.export.${f}`)}
          title={t(`graph.export.${f}`)}
          disabled={exporting}
          aria-busy={exporting}
          onClick={() => onExport(f)}
          className="border-transparent px-2"
        >
          {f.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
