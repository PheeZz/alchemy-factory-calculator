import type { FactoryPlan, Rate } from '@/features/solver/types';

// Runtime shape guards for anything that enters the store from outside (localStorage, share links,
// imported files). Deliberately structural: unknown ids are a data-version concern handled by stale.ts.

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isStrOrNull = (v: unknown) => v === null || isStr(v);
const isStrMap = (v: unknown) => isObj(v) && Object.values(v).every(isStr);
const isRate = (v: unknown): v is Rate =>
  isObj(v) && isStr(v.item) && typeof v.rate === 'number' && Number.isFinite(v.rate) && v.rate >= 0;

export function isPlan(v: unknown): v is FactoryPlan {
  return (
    isObj(v) &&
    Array.isArray(v.targets) &&
    v.targets.every(isRate) &&
    (v.mode === 'targets' || v.mode === 'fromInput') &&
    Array.isArray(v.supplies) &&
    v.supplies.every(isRate) &&
    isStrOrNull(v.maximize) &&
    isStrMap(v.recipeFor) &&
    isStrMap(v.buildingFor) &&
    Array.isArray(v.imports) &&
    v.imports.every(isStr) &&
    isStrOrNull(v.fuel) &&
    isStrMap(v.fuelFor) &&
    isStrOrNull(v.fertilizer) &&
    isStrMap(v.fertilizerFor) &&
    (v.optimize === null || v.optimize === 'raw' || v.optimize === 'machines' || v.optimize === 'money') &&
    // Optional: plans saved before heaters existed have neither field.
    (v.heater === undefined || isStrOrNull(v.heater)) &&
    (v.heaterFor === undefined || isStrMap(v.heaterFor))
  );
}

export interface FactoryDraft {
  name: string;
  plan: FactoryPlan;
}

export const isFactoryDraft = (v: unknown): v is FactoryDraft => isObj(v) && isStr(v.name) && isPlan(v.plan);
