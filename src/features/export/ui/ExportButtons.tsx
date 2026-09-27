import type { GameData } from '@/shared/data/types';
import type { SolveResult } from '@/features/solver/types';
import { useT } from '@/shared/i18n';
import { Button } from '@/shared/ui/Button';
import { useSummaryExport } from '../model/useSummaryExport';

export function ExportButtons({ data, result }: { data: GameData; result: SolveResult }) {
  const t = useT();
  const { csv, markdown } = useSummaryExport(data, result);
  return (
    <div role="group" aria-label={t('export.label')} className="flex flex-wrap gap-2">
      <Button size="sm" icon="download" title={t('export.csvHint')} onClick={csv}>
        {t('export.csv')}
      </Button>
      <Button size="sm" icon="download" title={t('export.markdownHint')} onClick={markdown}>
        {t('export.markdown')}
      </Button>
    </div>
  );
}
