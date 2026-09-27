// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildList, solve } from '@/features/solver';
import { level0, plan } from '@/features/solver/fixtures/builders';
import { heatersData } from '@/features/solver/fixtures/heaters';
import { buildListCsv, toCsv } from './csv';
import { planMarkdown } from './markdown';

const names = (id: string) => ({ Stove: 'Stone Stove', Crucible: 'Crucible', Stone: 'Stone', Ore: 'Ore', Coal: 'Coal', Ingot: 'Iron Ingot' })[id] ?? id;

describe('CSV', () => {
  it('RFC 4180 quoting and CRLF', () => {
    expect(toCsv([['a,b', 'say "hi"', 'x\ny', 'plain'], [1.5, 2]])).toBe('"a,b","say ""hi""","x\ny",plain\r\n1.5,2\r\n');
  });

  it('formula cells are neutralized, numbers are not', () => {
    expect(toCsv([['=HYPERLINK("x")', '+1', '-a', '@cmd', 'ok'], [-3]])).toBe(`"'=HYPERLINK(""x"")",'+1,'-a,'@cmd,ok\r\n-3\r\n`);
  });

  it('build list checklist', async () => {
    const res = await solve(heatersData, plan({ targets: [{ item: 'Ingot', rate: 100 }], fuel: 'Coal' }), level0);
    expect(buildListCsv(heatersData, buildList(heatersData, res), names)).toBe(
      'Building,Kind,Count,Unit cost,Total cost,Total money (copper)\r\n' +
        'Crucible,machine,10,,,0\r\n' +
        'Stone Stove,heater,3,20 Stone,60 Stone,0\r\n',
    );
    // Localized headers come from the caller.
    expect(buildListCsv(heatersData, [], names, { building: 'Здание' }).startsWith('Здание,Kind')).toBe(true);
  });
});

describe('planMarkdown', () => {
  it('summarizes targets, machines, raw, surplus, build list, heat and area in the chosen unit', async () => {
    const p = plan({ targets: [{ item: 'Ingot', rate: 120 }], fuel: 'Coal' });
    const res = await solve(heatersData, p, level0);
    const text = planMarkdown(heatersData, p, res, names, { rateUnit: 'sec', rateLabel: '/s' });
    // 120/min = 2/s; Ore 2/s, Coal 120·0.6 = 72/min = 1.2/s; 12 crucibles, ceil(12/4) = 3 stoves.
    expect(text).toContain('## Targets\n- Iron Ingot: 2/s\n');
    expect(text).toContain('| Crucible | 12 |\n| Stone Stove | 3 |');
    expect(text).toContain('- Ore: 2/s\n- Coal: 1.2/s');
    expect(text).toContain('## Surplus\n- —');
    expect(text).toContain('| Stone Stove | 3 | 60 Stone |');
    // 120 batches · 24 heat / 60 = 48 heat/s; 1-cell fixture buildings: 3 stoves of floor, 12 + 3 cells.
    expect(text).toContain('## Heat\n48 heat/s');
    expect(text).toContain('## Area\n3 floor tiles, 15 cells');
  });
});
