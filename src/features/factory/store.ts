import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BuildingId, ItemId, RecipeId } from '@/shared/data/types';
import type { FactoryPlan, OptimizeGoal, Rate, UpgradeLevels } from '@/features/solver/types';
import { translate, useLangStore } from '@/shared/i18n';
import { syncAcrossTabs } from '@/shared/lib/syncAcrossTabs';
import { isFactoryDraft, type FactoryDraft } from './schema';

export interface Factory {
  id: string;
  name: string;
  plan: FactoryPlan;
  /** Build checklist: buildings the player marked as already built. */
  built?: BuildingId[];
}

interface FactoryData {
  factories: Factory[];
  activeId: string;
  levels: UpgradeLevels;
  /**
   * Learned tech nodes, a player profile like `levels` (research belongs to the save, not to one
   * factory). null = everything open, the default.
   */
  unlocked: string[] | null;
}

interface FactoryActions {
  /**
   * Called once game data is loaded: remembers per-build plan defaults and track lengths, clamps
   * stored levels to them, and guarantees an active factory.
   */
  init: (defaults: Partial<FactoryPlan>, maxLevels?: UpgradeLevels) => void;
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
  /** Adds several recipe choices at once (a fuel path from the tier list); existing other choices stay. */
  mergeRecipes: (recipeFor: Record<ItemId, RecipeId>) => void;
  setBuilding: (recipe: RecipeId, building: BuildingId | null) => void;
  toggleImport: (item: ItemId) => void;
  setFuel: (item: ItemId | null) => void;
  setFuelFor: (recipe: RecipeId, item: ItemId | null) => void;
  setFertilizer: (item: ItemId | null) => void;
  setFertilizerFor: (recipe: RecipeId, item: ItemId | null) => void;
  setOptimize: (goal: OptimizeGoal | null) => void;
  setHeater: (building: BuildingId | null) => void;
  setHeaterFor: (recipe: RecipeId, building: BuildingId | null) => void;
  /** Levels are clamped here, the one seam every writer (UI, file import) goes through. */
  setLevels: (levels: Partial<UpgradeLevels>) => void;
  /** Drops manual recipe and machine choices of the active factory (the "undo" for an unsolvable pick). */
  clearOverrides: () => void;
  setUnlocked: (unlocked: string[] | null) => void;
  setCatalystFor: (recipe: RecipeId, catalyst: ItemId | null) => void;
  /** Upper bound on machines for a recipe ("I have N of these"); null removes it. */
  setMachineCap: (recipe: RecipeId, cap: number | null) => void;
  toggleBuilt: (building: BuildingId) => void;
}

export type FactoryState = FactoryData &
  FactoryActions & { planDefaults: Partial<FactoryPlan>; maxLevels: UpgradeLevels | null };

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
    heater: null,
    heaterFor: {},
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

/** Smallest «Завод N» not already taken, so imports and deletions never produce duplicates. */
function nextName(factories: Factory[]) {
  const taken = new Set(factories.map((f) => f.name));
  let n = 1;
  while (taken.has(defaultName(n))) n++;
  return defaultName(n);
}

/** Whole, non-negative, and within the build's track length once it is known. */
function clampLevels(levels: Partial<UpgradeLevels>, max: UpgradeLevels | null): UpgradeLevels {
  const out = zeroLevels();
  for (const k of Object.keys(out) as (keyof UpgradeLevels)[]) {
    const v = Number(levels[k]);
    const n = Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
    out[k] = max ? Math.min(n, max[k]) : n;
  }
  return out;
}

// Starts empty: the first factory is created by init() once game data provides fuel/fertilizer defaults.
const initialData = (): FactoryData => ({ factories: [], activeId: '', levels: zeroLevels(), unlocked: null });

const isFactory = (f: unknown): f is Factory => isFactoryDraft(f) && typeof (f as Factory).id === 'string';

/** Keeps the valid factories from whatever sits in localStorage; null when nothing usable is left. */
function readPersisted(v: unknown): FactoryData | null {
  if (!v || typeof v !== 'object') return null;
  const d = v as Partial<FactoryData>;
  const factories = Array.isArray(d.factories) ? d.factories.filter(isFactory) : [];
  if (factories.length === 0) return null;
  const levels = clampLevels(d.levels && typeof d.levels === 'object' ? d.levels : {}, null);
  const activeId = factories.some((f) => f.id === d.activeId) ? d.activeId! : factories[0]!.id;
  const unlocked = Array.isArray(d.unlocked) ? d.unlocked.filter((x): x is string => typeof x === 'string') : null;
  return { factories, activeId, levels, unlocked };
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
        maxLevels: null,

        init: (planDefaults, maxLevels) => {
          set((s) => ({ planDefaults, maxLevels: maxLevels ?? null, levels: clampLevels(s.levels, maxLevels ?? null) }));
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
          const f = fresh(name ?? nextName(get().factories));
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
              const f = fresh(nextName([]));
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
        mergeRecipes: (recipeFor) => patchPlan((p) => ({ recipeFor: { ...p.recipeFor, ...recipeFor } })),
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
        setHeater: (heater) => patchPlan(() => ({ heater })),
        setHeaterFor: (recipe, building) => patchPlan((p) => ({ heaterFor: withKey(p.heaterFor ?? {}, recipe, building) })),
        setLevels: (levels) => set((s) => ({ levels: clampLevels({ ...s.levels, ...levels }, s.maxLevels) })),
        clearOverrides: () => patchPlan(() => ({ recipeFor: {}, buildingFor: {}, heaterFor: {}, catalystFor: {}, machineCaps: {} })),
        setUnlocked: (unlocked) => set({ unlocked }),
        setCatalystFor: (recipe, catalyst) => patchPlan((p) => ({ catalystFor: withKey(p.catalystFor ?? {}, recipe, catalyst) })),
        setMachineCap: (recipe, cap) =>
          patchPlan((p) => ({ machineCaps: withKey(p.machineCaps ?? {}, recipe, cap !== null && cap >= 0 ? cap : null) })),
        toggleBuilt: (building) =>
          set((s) => ({
            factories: s.factories.map((f) => {
              if (f.id !== s.activeId) return f;
              const built = f.built ?? [];
              return { ...f, built: built.includes(building) ? built.filter((b) => b !== building) : [...built, building] };
            }),
          })),
      };
    },
    {
      name: STORAGE_KEY,
      version: VERSION,
      partialize: ({ factories, activeId, levels, unlocked }): FactoryData => ({ factories, activeId, levels, unlocked }),
      // No older schema exists yet: any other version (incl. one written by a newer build) resets
      // to a clean state rather than feeding an unknown shape into the solver.
      migrate: (persisted, version) => (version === VERSION ? (readPersisted(persisted) ?? initialData()) : initialData()),
      merge: (persisted, current) => {
        const stored = readPersisted(persisted);
        if (!stored) return current;
        // A rehydrate triggered by another tab keeps this tab's own active factory when it still
        // exists; otherwise two tabs would keep switching each other's view.
        const activeId = stored.factories.some((f) => f.id === current.activeId) ? current.activeId : stored.activeId;
        return { ...current, ...stored, activeId, levels: clampLevels(stored.levels, current.maxLevels) };
      },
    },
  ),
);

export const useActiveFactory = () =>
  useFactoryStore((s) => s.factories.find((f) => f.id === s.activeId) ?? s.factories[0]!);

export const useActivePlan = () => useActiveFactory().plan;

// Another tab saved: re-read instead of overwriting its factories with this tab's stale copy on the next edit.
syncAcrossTabs(STORAGE_KEY, () => useFactoryStore.persist.rehydrate());
