import type { GameData } from '@/shared/data/types';
import type { BuildListEntry } from '@/features/solver/build-list';
import { formatQty, stacksText, type NameOf } from './text';

/**
 * Spreadsheets run a cell starting with = + - @ (or tab/CR) as a formula: a name like "=HYPERLINK(…)"
 * in shared data must stay text, so such cells get a leading apostrophe (OWASP CSV injection).
 */
const guard = (s: string) => (/^[=+\-@\t\r]/.test(s) ? `'${s}` : s);

/** RFC 4180: quote fields with a comma, quote or line break; double the quotes. */
function cell(v: string | number): string {
  if (typeof v === 'number') return formatQty(v);
  const s = guard(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const toCsv = (rows: (string | number)[][]) => rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';

export interface BuildListCsvHeaders {
  building: string;
  kind: string;
  count: string;
  unitCost: string;
  totalCost: string;
  totalMoney: string;
  heater: string;
  machine: string;
}

const EN: BuildListCsvHeaders = {
  building: 'Building',
  kind: 'Kind',
  count: 'Count',
  unitCost: 'Unit cost',
  totalCost: 'Total cost',
  totalMoney: 'Total money (copper)',
  heater: 'heater',
  machine: 'machine',
};

/** Build checklist as CSV (CRLF, RFC 4180). Names and header text come from the caller (i18n stays in the UI). */
export function buildListCsv(data: GameData, entries: BuildListEntry[], names: NameOf, headers: Partial<BuildListCsvHeaders> = {}): string {
  const h = { ...EN, ...headers };
  return toCsv([
    [h.building, h.kind, h.count, h.unitCost, h.totalCost, h.totalMoney],
    ...entries.map((e) => [
      names(e.building),
      (data.buildings[e.building]?.heatSlots ?? 0) > 0 ? h.heater : h.machine,
      e.count,
      stacksText(e.unitCost, names),
      stacksText(e.totalCost, names),
      e.totalMoney,
    ]),
  ]);
}
