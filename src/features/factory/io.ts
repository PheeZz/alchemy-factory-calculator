import type { UpgradeLevels } from '@/features/solver/types';
import { isFactoryDraft, type FactoryDraft } from './schema';
import { useFactoryStore } from './store';

const KIND = 'alchemy-factory-calculator';
const VERSION = 1;

interface ExportFile {
  kind: typeof KIND;
  v: typeof VERSION;
  build: string;
  factories: FactoryDraft[];
  levels: UpgradeLevels;
}

export type ImportParse =
  | { ok: true; factories: FactoryDraft[]; levels: Partial<UpgradeLevels> }
  | { ok: false; error: 'json' | 'kind' | 'version' | 'shape' };

export function serializeExport(build: string): string {
  const { factories, levels } = useFactoryStore.getState();
  const file: ExportFile = { kind: KIND, v: VERSION, build, factories: factories.map(({ name, plan }) => ({ name, plan })), levels };
  return JSON.stringify(file, null, 2);
}

export function parseImport(text: string): ImportParse {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return { ok: false, error: 'json' };
  }
  const f = v as Partial<ExportFile> | null;
  if (!f || typeof f !== 'object' || f.kind !== KIND) return { ok: false, error: 'kind' };
  if (f.v !== VERSION) return { ok: false, error: 'version' };
  if (!Array.isArray(f.factories) || f.factories.length === 0 || !f.factories.every(isFactoryDraft))
    return { ok: false, error: 'shape' };
  const levels = Object.fromEntries(
    Object.entries(f.levels && typeof f.levels === 'object' ? f.levels : {}).filter(
      ([, n]) => typeof n === 'number' && Number.isFinite(n),
    ),
  ) as Partial<UpgradeLevels>;
  return { ok: true, factories: f.factories, levels };
}

/**
 * Merges a backup as new factories (existing ones are never replaced). Levels are a player profile,
 * not per-factory, so restoring a backup restores them too.
 */
export function importFile(text: string): ImportParse {
  const parsed = parseImport(text);
  if (parsed.ok) {
    const s = useFactoryStore.getState();
    s.importFactories(parsed.factories);
    s.setLevels(parsed.levels);
  }
  return parsed;
}

export function downloadExport(build: string) {
  const blob = new Blob([serializeExport(build)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `alchemy-factories-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 0);
}
