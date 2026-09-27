import type { GameData } from '@/shared/data/types';
import type { SolveResult } from '@/features/solver/types';
import { buildList } from '@/features/solver/build-list';
import { useActiveFactory } from '@/features/factory/store';
import { useNames, useT } from '@/shared/i18n';
import { buildListCsv } from '../lib/csv';
import { downloadText, safeFileName } from '../lib/download';
import { planMarkdown } from '../lib/markdown';

export function useSummaryExport(data: GameData, result: SolveResult) {
  const t = useT();
  const name = useNames();
  const factory = useActiveFactory();
  const names = (id: string) => name(data.items[id]?.nameKey ?? data.buildings[id]?.nameKey ?? id);

  const csv = () => {
    const text = buildListCsv(data, buildList(data, result), names, {
      building: t('export.col.building'),
      kind: t('export.col.kind'),
      count: t('export.col.count'),
      unitCost: t('export.col.unitCost'),
      totalCost: t('export.col.totalCost'),
      totalMoney: t('export.col.totalMoney'),
      heater: t('export.kind.heater'),
      machine: t('export.kind.machine'),
    });
    // BOM: without it Excel reads UTF-8 CSV as the system code page and Cyrillic names turn to mojibake.
    downloadText('﻿' + text, safeFileName(factory.name, 'csv'), 'text/csv');
  };

  const markdown = () => {
    const text = planMarkdown(data, factory.plan, result, names, { rateUnit: t.rateUnit, rateLabel: t.rateSuffix }, {
      title: t('export.md.title', { name: factory.name }),
      targets: t('export.md.targets'),
      machines: t('summary.machines'),
      building: t('export.col.building'),
      count: t('export.col.count'),
      raw: t('export.md.raw'),
      surplus: t('export.md.surplus'),
      buildList: t('build.title'),
      totalCost: t('export.col.totalCost'),
      heat: t('summary.heat'),
      heatUnit: t('export.md.heatUnit'),
      area: t('summary.area'),
      floor: t('export.md.floor'),
      cells: t('export.md.cells'),
      none: t('summary.none'),
    });
    downloadText(text, safeFileName(factory.name, 'md'), 'text/markdown');
  };

  return { csv, markdown };
}
