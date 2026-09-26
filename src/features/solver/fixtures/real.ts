import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { GameData } from '@/shared/data/types';

export const REAL_BUILD = '25321648';

/** The generated game data of the current build (node-only: golden tests). */
export function loadRealData(): GameData {
  const path = fileURLToPath(new URL(`../../../../public/data/${REAL_BUILD}/gamedata.json`, import.meta.url));
  return JSON.parse(readFileSync(path, 'utf8')) as GameData;
}
