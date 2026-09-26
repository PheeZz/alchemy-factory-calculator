export { requiredTechFor, solve } from './solve';
export { techClosure, techGate } from './tech';
export { linkFactories, type FactoryNetwork, type FactoryRun, type NetworkFlow, type NetworkItem } from './link';
export {
  defaultFuel,
  rankFuels,
  rankFuelVariants,
  type FuelRank,
  type FuelVariant,
  type FuelVariantOptions,
} from './rank-fuels';
export { createSolverClient, type UpgradeImpactResult } from './client';
export { rankProfitVariants, type ProfitVariant, type ProfitVariantOptions } from './rank-profit';
export { upgradeImpact, summarize, type PlanSummary, type UpgradeImpact } from './upgrade-impact';
export { buildList, type BuildListEntry } from './build-list';
export { byproductOptions, type ByproductConsumer, type ByproductOption, type ByproductOptions } from './byproducts';
export { footprintOf } from './postprocess';
export { defaultHeater } from './heaters';
export { SolverError } from './types';
