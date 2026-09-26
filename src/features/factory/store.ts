import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BuildingId, ItemId, RecipeId } from '@/shared/data/types';
import type { FactoryPlan, OptimizeGoal, Rate, UpgradeLevels } from '@/features/solver/types';
import { translate, useLangStore } from '@/shared/i18n';

export interface Factory {
  id: string;
  name: string;
  plan: FactoryPlan;
}

interface FactoryData {
  factories: Factory[];
  activeId: string;
  levels: UpgradeLevels;
}

interface FactoryActions {
  createFactory: (name?: string) => string;
  renameFactory: (id: string, name: string) => void;
  deleteFactory: (id: string) => void;
  duplicateFactory: (id: string) => string | null;
  setActive: (id: string) => void;
  addTarget: (target: Rate) => void;
  updateTarget: (index: number, patch: Partial<Rate>) => void;
  removeTarget: (index: number) => void;
  setMode: (mode: FactoryPlan['mode']) => void;
  setSupply: (item: ItemId, rate: number) => void;
  removeSupply: (item: ItemId) => void;
  setMaximize: (item: ItemId | null) => void;
  setRecipe: (item: ItemId, recipe: RecipeId | null) => void;
  setBuilding: (recipe: RecipeId, building: BuildingId | null) => void;
  toggleImport: (item: ItemId) => void;
  setFuel: (item: ItemId | null) => void;
  setFuelFor: (recipe: RecipeId, item: ItemId | null) => void;
  setFertilizer: (item: ItemId | null) => void;
  setFertilizerFor: (recipe: RecipeId, item: ItemId | null) => void;
  setOptimize: (goal: OptimizeGoal | null) => void;
  setLevels: (levels: Partial<UpgradeLevels>) => void;
}

export type FactoryState = FactoryData & FactoryActions;

export const STORAGE_KEY = 'afc:v1';
const VERSION = 1;

export function emptyPlan(): FactoryPlan {
  return {
    targets: [],
    mode: 'targets',
    supplies: [],
    maximize: null,
    recipeFor: {},
    buildingFor: {},
    imports: [],
    fuel: null,
    fuelFor: {},
    fertilizer: null,
    fertilizerFor: {},
    optimize: null,
  };
}

const zeroLevels = (): UpgradeLevels => ({
  conveyor: 0,
  factorySpeed: 0,
  alchemySkill: 0,
  fuelEfficiency: 0,
  fertilizerEfficiency: 0,
});

const newId = () => crypto.randomUUID();

const defaultName = (n: number) => translate(useLangStore.getState().lang, 'factory.defaultName', { n });

function initialData(): FactoryData {
  const first: Factory = { id: newId(), name: defaultName(1), plan: emptyPlan() };
  return { factories: [first], activeId: first.id, levels: zeroLevels() };
}

/** Structural guard for whatever sits in localStorage: bad data resets instead of crashing the app. */
function isFactoryData(v: unknown): v is FactoryData {
  if (!v || typeof v !== 'object') return false;
  const d = v as Partial<FactoryData>;
  return (
    Array.isArray(d.factories) &&
    d.factories.length > 0 &&
    d.factories.every((f) => f && typeof f.id === 'string' && f.plan && Array.isArray(f.plan.targets)) &&
    typeof d.activeId === 'string' &&
    !!d.levels &&
    typeof d.levels === 'object'
  );
}

function withKey<V>(rec: Record<string, V>, key: string, value: V | null): Record<string, V> {
  const next = { ...rec };
  if (value === null) delete next[key];
  else next[key] = value;
  return next;
}

export const useFactoryStore = create<FactoryState>()(
  persist(
    (set, get) => {
      const patchPlan = (fn: (plan: FactoryPlan) => Partial<FactoryPlan>) =>
        set((s) => ({
          factories: s.factories.map((f) => (f.id === s.activeId ? { ...f, plan: { ...f.plan, ...fn(f.plan) } } : f)),
        }));

      return {
        ...initialData(),

        createFactory: (name) => {
          const f: Factory = { id: newId(), name: name ?? defaultName(get().factories.length + 1), plan: emptyPlan() };
          set((s) => ({ factories: [...s.factories, f], activeId: f.id }));
          return f.id;
        },
        renameFactory: (id, name) =>
          set((s) => ({ factories: s.factories.map((f) => (f.id === id ? { ...f, name } : f)) })),
        deleteFactory: (id) =>
          set((s) => {
            const rest = s.factories.filter((f) => f.id !== id);
            // The app always needs an active factory to edit, so deleting the last one starts a fresh one.
            if (rest.length === 0) {
              const { factories, activeId } = initialData();
              return { factories, activeId };
            }
            return { factories: rest, activeId: s.activeId === id ? rest[0]!.id : s.activeId };
          }),
        duplicateFactory: (id) => {
          const src = get().factories.find((f) => f.id === id);
          if (!src) return null;
          const copy: Factory = {
            id: newId(),
            name: translate(useLangStore.getState().lang, 'factory.copyName', { name: src.name }),
            plan: structuredClone(src.plan),
          };
          set((s) => ({ factories: [...s.factories, copy], activeId: copy.id }));
          return copy.id;
        },
        setActive: (id) => set((s) => (s.factories.some((f) => f.id === id) ? { activeId: id } : s)),

        addTarget: (target) => patchPlan((p) => ({ targets: [...p.targets, target] })),
        updateTarget: (index, patch) =>
          patchPlan((p) => ({ targets: p.targets.map((t, i) => (i === index ? { ...t, ...patch } : t)) })),
        removeTarget: (index) => patchPlan((p) => ({ targets: p.targets.filter((_, i) => i !== index) })),
        setMode: (mode) => patchPlan(() => ({ mode })),
        setSupply: (item, rate) =>
          patchPlan((p) => ({
            supplies: p.supplies.some((s) => s.item === item)
              ? p.supplies.map((s) => (s.item === item ? { item, rate } : s))
              : [...p.supplies, { item, rate }],
          })),
        removeSupply: (item) => patchPlan((p) => ({ supplies: p.supplies.filter((s) => s.item !== item) })),
        setMaximize: (maximize) => patchPlan(() => ({ maximize })),
        setRecipe: (item, recipe) => patchPlan((p) => ({ recipeFor: withKey(p.recipeFor, item, recipe) })),
        setBuilding: (recipe, building) =>
          patchPlan((p) => ({ buildingFor: withKey(p.buildingFor, recipe, building) })),
        toggleImport: (item) =>
          patchPlan((p) => ({
            imports: p.imports.includes(item) ? p.imports.filter((i) => i !== item) : [...p.imports, item],
          })),
        setFuel: (fuel) => patchPlan(() => ({ fuel })),
        setFuelFor: (recipe, item) => patchPlan((p) => ({ fuelFor: withKey(p.fuelFor, recipe, item) })),
        setFertilizer: (fertilizer) => patchPlan(() => ({ fertilizer })),
        setFertilizerFor: (recipe, item) =>
          patchPlan((p) => ({ fertilizerFor: withKey(p.fertilizerFor, recipe, item) })),
        setOptimize: (optimize) => patchPlan(() => ({ optimize })),
        setLevels: (levels) => set((s) => ({ levels: { ...s.levels, ...levels } })),
      };
    },
    {
      name: STORAGE_KEY,
      version: VERSION,
      partialize: ({ factories, activeId, levels }): FactoryData => ({ factories, activeId, levels }),
      // No older schema exists yet: any other version (incl. one written by a newer build) resets
      // to a clean state rather than feeding an unknown shape into the solver.
      migrate: (persisted, version) =>
        version === VERSION && isFactoryData(persisted) ? persisted : initialData(),
      merge: (persisted, current) => {
        if (!isFactoryData(persisted)) return current;
        const activeId = persisted.factories.some((f) => f.id === persisted.activeId)
          ? persisted.activeId
          : persisted.factories[0]!.id;
        return { ...current, ...persisted, activeId, levels: { ...zeroLevels(), ...persisted.levels } };
      },
    },
  ),
);

export const useActiveFactory = () =>
  useFactoryStore((s) => s.factories.find((f) => f.id === s.activeId) ?? s.factories[0]!);

export const useActivePlan = () => useActiveFactory().plan;
