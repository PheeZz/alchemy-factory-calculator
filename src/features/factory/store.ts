import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BuildingId, ItemId, RecipeId } from '@/shared/data/types';
import type { FactoryPlan, OptimizeGoal, Rate, UpgradeLevels } from '@/features/solver/types';
import { translate, useLangStore } from '@/shared/i18n';
import { isFactoryDraft, type FactoryDraft } from './schema';

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
  /** Called once game data is loaded: remembers per-build plan defaults and guarantees an active factory. */
  init: (defaults: Partial<FactoryPlan>) => void;
  /** Adds factories from a share link or file as new ones (never overwrites); returns their ids. */
  importFactories: (drafts: FactoryDraft[]) => string[];
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

export type FactoryState = FactoryData & FactoryActions & { planDefaults: Partial<FactoryPlan> };

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

// Starts empty: the first factory is created by init() once game data provides fuel/fertilizer defaults.
const initialData = (): FactoryData => ({ factories: [], activeId: '', levels: zeroLevels() });

const isFactory = (f: unknown): f is Factory => isFactoryDraft(f) && typeof (f as Factory).id === 'string';

/** Keeps the valid factories from whatever sits in localStorage; null when nothing usable is left. */
function readPersisted(v: unknown): FactoryData | null {
  if (!v || typeof v !== 'object') return null;
  const d = v as Partial<FactoryData>;
  const factories = Array.isArray(d.factories) ? d.factories.filter(isFactory) : [];
  if (factories.length === 0) return null;
  const levels = { ...zeroLevels(), ...(d.levels && typeof d.levels === 'object' ? d.levels : {}) };
  const activeId = factories.some((f) => f.id === d.activeId) ? d.activeId! : factories[0]!.id;
  return { factories, activeId, levels };
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

      const fresh = (name: string): Factory => ({ id: newId(), name, plan: { ...emptyPlan(), ...get().planDefaults } });

      return {
        ...initialData(),
        planDefaults: {},

        init: (planDefaults) => {
          set({ planDefaults });
          if (get().factories.length === 0) {
            const f = fresh(defaultName(1));
            set({ factories: [f], activeId: f.id });
          }
        },
        importFactories: (drafts) => {
          const added = drafts.map((d): Factory => ({ id: newId(), name: d.name, plan: structuredClone(d.plan) }));
          if (added.length) set((s) => ({ factories: [...s.factories, ...added], activeId: added[0]!.id }));
          return added.map((f) => f.id);
        },
        createFactory: (name) => {
          const f = fresh(name ?? defaultName(get().factories.length + 1));
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
              const f = fresh(defaultName(1));
              return { factories: [f], activeId: f.id };
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
      migrate: (persisted, version) => (version === VERSION ? (readPersisted(persisted) ?? initialData()) : initialData()),
      merge: (persisted, current) => ({ ...current, ...(readPersisted(persisted) ?? {}) }),
    },
  ),
);

export const useActiveFactory = () =>
  useFactoryStore((s) => s.factories.find((f) => f.id === s.activeId) ?? s.factories[0]!);

export const useActivePlan = () => useActiveFactory().plan;
