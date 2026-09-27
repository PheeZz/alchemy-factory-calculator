import type { GameData } from '@/shared/data/types';
import { buildList } from '@/features/solver/build-list';
import type { FactoryPlan, SolveResult } from '@/features/solver/types';
import { formatQty, stacksText, type NameOf } from './text';

export type ExportRateUnit = 'sec' | 'min' | 'hour';

export interface ExportUnits {
  rateUnit: ExportRateUnit;
  /** Suffix after a rate, e.g. '/min' or '/мин'. */
  rateLabel: string;
}

export interface PlanMarkdownLabels {
  title: string;
  targets: string;
  machines: string;
  building: string;
  count: string;
  raw: string;
  surplus: string;
  buildList: string;
  totalCost: string;
  heat: string;
  heatUnit: string;
  area: string;
  floor: string;
  cells: string;
  none: string;
}

const EN: PlanMarkdownLabels = {
  title: 'Factory plan',
  targets: 'Targets',
  machines: 'Machines',
  building: 'Building',
  count: 'Count',
  raw: 'Raw input',
  surplus: 'Surplus',
  buildList: 'Build list',
  totalCost: 'Total cost',
  heat: 'Heat',
  heatUnit: 'heat/s',
  area: 'Area',
  floor: 'floor tiles',
  cells: 'cells',
  none: '—',
};

const PER_MIN: Record<ExportRateUnit, number> = { sec: 1 / 60, min: 1, hour: 60 };

/** Table cells: a name with a pipe or line break must not split the row. */
const md = (s: string) => s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

/**
 * Markdown summary of a solved plan: targets (what leaves as product), machines by building with
 * heaters, raw input, surplus, build list, heat and area. Rates are shown in `units`.
 */
export function planMarkdown(
  data: GameData,
  plan: FactoryPlan,
  result: SolveResult,
  names: NameOf,
  units: ExportUnits,
  labels: Partial<PlanMarkdownLabels> = {},
): string {
  const l = { ...EN, ...labels };
  const rate = (perMin: number) => `${formatQty(perMin * PER_MIN[units.rateUnit])}${units.rateLabel}`;
  const list = (rows: string[]) => (rows.length ? rows : [`- ${l.none}`]);
  const out = new Map<string, number>();
  for (const e of result.edges) if (e.to === `target:${e.item}`) out.set(e.item, (out.get(e.item) ?? 0) + e.perMin);
  // A plan target that got no edge (0 output) still shows, so the reader sees what was asked for.
  for (const t of plan.targets) if (!out.has(t.item)) out.set(t.item, 0);

  const lines = [
    `# ${l.title}`,
    '',
    `## ${l.targets}`,
    ...list([...out].map(([item, perMin]) => `- ${names(item)}: ${rate(perMin)}`)),
    '',
    `## ${l.machines}`,
    `| ${l.building} | ${l.count} |`,
    '|---|---:|',
    ...result.totals.machines.map((m) => `| ${md(names(m.building))} | ${m.count} |`),
    '',
    `## ${l.raw}`,
    ...list(result.totals.raw.concat(result.totals.imports).map((s) => `- ${names(s.item)}: ${rate(s.qty)}`)),
    '',
    `## ${l.surplus}`,
    ...list(result.totals.surplus.map((s) => `- ${names(s.item)}: ${rate(s.qty)}`)),
    '',
    `## ${l.buildList}`,
    `| ${l.building} | ${l.count} | ${l.totalCost} |`,
    '|---|---:|---|',
    ...buildList(data, result).map((e) => `| ${md(names(e.building))} | ${e.count} | ${md(stacksText(e.totalCost, names)) || l.none} |`),
    '',
    `## ${l.heat}`,
    `${formatQty(result.totals.heatPerSec)} ${l.heatUnit}`,
  ];
  if (result.totals.area) lines.push('', `## ${l.area}`, `${result.totals.area.floor} ${l.floor}, ${result.totals.area.cells} ${l.cells}`);
  return lines.join('\n') + '\n';
}
