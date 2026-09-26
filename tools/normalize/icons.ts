import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { EXTRACTED, packageFile, ROOT, type RawAsset } from './load';

export const ICON_SIZE = 64;

export interface IconJob {
  /** Path relative to public/, as stored in Item.icon / Building.icon. */
  publicPath: string;
  source: string;
}

/** Resolves the extracted PNG for a DisplayIcon; null when the asset was not exported. */
export function iconJob(build: string, kind: 'items' | 'buildings', id: string, asset: RawAsset | null): IconJob | null {
  if (!asset) return null;
  const source = packageFile(join(EXTRACTED, 'icons'), asset.ObjectPath, '.png');
  return existsSync(source) ? { publicPath: `icons/${build}/${kind}/${id}.webp`, source } : null;
}

export async function writeIcons(build: string, jobs: IconJob[]): Promise<void> {
  const dir = join(ROOT, 'public/icons', build);
  rmSync(dir, { recursive: true, force: true });
  for (const kind of ['items', 'buildings']) mkdirSync(join(dir, kind), { recursive: true });
  await Promise.all(
    jobs.map((j) =>
      sharp(j.source)
        .resize(ICON_SIZE, ICON_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 85, effort: 6 })
        .toFile(join(ROOT, 'public', j.publicPath)),
    ),
  );
}
