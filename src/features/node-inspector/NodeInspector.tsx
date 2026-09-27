import type { GameData } from '@/shared/data/types';
import type { SolveNode, SolveResult } from '@/features/solver/types';
import { mainOutput, upgradeValue } from '@/entities/game';
import { useActivePlan, useFactoryStore } from '@/features/factory/store';
import { parseEndpoint } from '@/features/graph/elements';
import { useNames, useT } from '@/shared/i18n';
import { formatNumber } from '@/shared/lib/format';
import { Button, IconButton } from '@/shared/ui/Button';
import { GlowBadge } from '@/shared/ui/GlowBadge';
import { Icon } from '@/shared/ui/Icon';
import { ItemIcon } from '@/shared/ui/ItemIcon';
import { ItemRateList } from './ItemRateList';
import { MachineStats } from './MachineStats';
import { NodeOverrides } from './NodeOverrides';
import { recipeRates } from './rates';
import { suppliersOf } from '@/features/network/lib/network';
import { RecipeChoice } from './RecipeChoice';
import { CatalystSelect } from './CatalystSelect';
import { MachineCap } from './MachineCap';
import { resolveSelection } from './selection';

interface Props {
  data: GameData;
  result: SolveResult | null;
  selectedId: string | null;
  onClose?: () => void;
  /** Item a recipe was just picked for (kept as the inspector's subject). */
  forItem?: string;
  /** Called with the new node id (= recipe id) when the player switches the node's recipe. */
  onSelect: (id: string, forItem: string) => void;
}

function Header({ icon, seed, title, subtitle, onClose }: { icon: string | null; seed: string; title: string; subtitle: string; onClose?: () => void }) {
  const t = useT();
  return (
    <div className="flex items-center gap-3">
      <ItemIcon icon={icon} name={title} seed={seed} size={40} decorative />
      <div className="min-w-0 flex-1">
        <h2 className="line-clamp-2 font-display text-xl leading-tight" title={title}>
          {title}
        </h2>
        <p className="truncate text-sm text-muted" title={subtitle}>
          {subtitle}
        </p>
      </div>
      {onClose && <IconButton icon="close" size="sm" label={t('inspector.close')} onClick={onClose} />}
    </div>
  );
}

/**
 * `node` is absent while a just-picked recipe is being solved or turned out unsolvable: the choices
 * stay on screen so the pick can be changed back, only the numbers wait for a result.
 */
function RecipeInspector({
  data,
  recipeId,
  node,
  forItem,
  onClose,
  onSelect,
}: {
  data: GameData;
  recipeId: string;
  node: SolveNode | undefined;
  forItem: string | undefined;
  onClose?: () => void;
  onSelect: (id: string, forItem: string) => void;
}) {
  const t = useT();
  const name = useNames();
  const plan = useActivePlan();
  const levels = useFactoryStore((s) => s.levels);
  const recipe = data.recipes[recipeId]!;
  const buildingId = node?.building ?? plan.buildingFor[recipeId] ?? recipe.buildings[0] ?? '';
  const building = data.buildings[buildingId];
  // The item the player was choosing a recipe for stays the subject even when the new recipe
  // makes it only as a side product (Coke → Charcoal); otherwise the node's main output.
  const produced = forItem ? recipe.outputs.find((o) => o.item === forItem) : undefined;
  const out = produced ?? mainOutput(recipe);
  const outItem = out ? data.items[out.item] : undefined;
  const outName = outItem ? name(outItem.nameKey) : recipeId;
  const rates = node && recipeRates(data, recipe, node, upgradeValue(data, 'alchemySkill', levels.alchemySkill));
  const itemName = (id: string) => name(data.items[id]?.nameKey ?? id);
  const buildingName = (id: string) => name(data.buildings[id]?.nameKey ?? id);

  return (
    <div className="flex flex-col gap-5">
      <Header
        icon={outItem?.icon ?? null}
        seed={out?.item ?? recipeId}
        title={outName}
        subtitle={building ? name(building.nameKey) : buildingId}
        onClose={onClose}
      />
      {node ? <MachineStats node={node} /> : <p className="rounded-xl border border-line p-3 text-sm text-muted">{t('inspector.pending')}</p>}
      {node?.heaterWarning && (
        <p role="alert" className="flex gap-2 rounded-xl border border-danger/50 bg-danger/10 p-2.5 text-sm text-[#ffc2c7]">
          <Icon name="alert" size={16} className="mt-0.5 shrink-0 text-danger" />
          {t('graph.heaterWarning', {
            heater: buildingName(node.heaterWarning.building),
            need: node.heaterWarning.slotsRequired,
            has: node.heaterWarning.heatSlots,
          })}
        </p>
      )}
      {node && (node.fuel || node.fertilizer || node.heater || node.catalyst) && (
        <ul className="flex flex-col gap-1.5 text-sm">
          {node.fuel && (
            <li className="flex items-center gap-2 text-ember">
              <Icon name="flame" size={15} />
              {t('graph.fuel', { item: itemName(node.fuel.item), rate: t.rate(node.fuel.rate) })}
            </li>
          )}
          {node.heater && (
            <li className="flex items-center gap-2 text-muted">
              <ItemIcon
                icon={data.buildings[node.heater.building]?.icon ?? null}
                name={buildingName(node.heater.building)}
                seed={node.heater.building}
                size={16}
                decorative
              />
              {t('graph.heater', {
                name: buildingName(node.heater.building),
                count: formatNumber(t.lang, node.heater.count, 0),
                exact: formatNumber(t.lang, node.heater.countExact, 2),
                need: building?.heatSlotsRequired ?? 0,
                slots: data.buildings[node.heater.building]?.heatSlots ?? 0,
              })}
            </li>
          )}
          {node.catalyst && (
            <li className="flex items-center gap-2 text-arcane">
              <Icon name="flask" size={15} />
              {t('catalyst.rate', { item: itemName(node.catalyst.item), rate: t.rate(node.catalyst.rate) })}
            </li>
          )}
          {node.fertilizer && (
            <li className="flex items-center gap-2 text-verdant">
              <Icon name="leaf" size={15} />
              {t('graph.fertilizer', { item: itemName(node.fertilizer.item), rate: t.rate(node.fertilizer.rate) })}
            </li>
          )}
        </ul>
      )}
      {node && node.portWarnings.length > 0 && (
        <ul className="flex flex-col gap-1.5" aria-label={t('inspector.warnings')}>
          {node.portWarnings.map((w) => (
            <li key={w.item} className="flex gap-2 rounded-xl border border-danger/40 bg-danger/10 p-2.5 text-sm text-[#ffc2c7]">
              <Icon name="alert" size={16} className="mt-0.5 shrink-0 text-danger" />
              {t('graph.portWarning', {
                item: itemName(w.item),
                perMachine: t.rate(w.perMachine),
                belt: t.rate(w.beltSpeed),
              })}
            </li>
          ))}
        </ul>
      )}
      {rates && (
        <div className="grid grid-cols-1 gap-4">
          <ItemRateList data={data} title={t('inspector.inputs')} rates={rates.inputs} />
          <ItemRateList data={data} title={t('inspector.outputs')} rates={rates.outputs} />
        </div>
      )}
      {out && <RecipeChoice data={data} item={out.item} current={recipe} onSelect={onSelect} />}
      <NodeOverrides data={data} recipe={recipe} building={building} />
      <CatalystSelect data={data} recipe={recipe} />
      <MachineCap recipe={recipe} />
      {out && (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-3 hover:border-white/25">
          <input
            type="checkbox"
            checked={plan.imports.includes(out.item)}
            onChange={() => useFactoryStore.getState().toggleImport(out.item)}
            className="mt-0.5 size-4 accent-[var(--color-flow)]"
          />
          <span>
            <span className="block text-sm text-ink">{t('inspector.import')}</span>
            <span className="block text-xs text-muted">{t('inspector.importHint', { item: outName })}</span>
          </span>
        </label>
      )}
    </div>
  );
}

function EndpointInspector({ data, id, result, onClose }: { data: GameData; id: string; result: SolveResult; onClose?: () => void }) {
  const t = useT();
  const name = useNames();
  const plan = useActivePlan();
  const ep = parseEndpoint(id)!;
  const item = data.items[ep.item];
  const title = item ? name(item.nameKey) : ep.item;
  const perMin = result.edges.filter((e) => e.from === id).reduce((a, e) => a + e.perMin, 0);
  const imported = plan.imports.includes(ep.item);
  const factories = useFactoryStore((st) => st.factories);
  const activeId = useFactoryStore((st) => st.activeId);
  const suppliers = suppliersOf(factories, activeId, ep.item);

  return (
    <div className="flex flex-col gap-4">
      <Header icon={item?.icon ?? null} seed={ep.item} title={title} subtitle={t(imported ? 'graph.import' : 'graph.raw')} onClose={onClose} />
      <GlowBadge tone="flow" className="self-start text-sm">
        {t.rate(perMin)}
      </GlowBadge>
      <p className="text-sm text-muted">{t(imported ? 'inspector.importNode' : 'inspector.rawNode')}</p>
      {imported && suppliers.length > 0 && (
        <p className="text-sm text-verdant">{t('network.comesFrom', { list: suppliers.map((f) => f.name).join(', ') })}</p>
      )}
      {imported && (
        <Button variant="primary" onClick={() => useFactoryStore.getState().toggleImport(ep.item)}>
          {t('inspector.produceHere')}
        </Button>
      )}
    </div>
  );
}

export function NodeInspector({ data, result, selectedId, forItem, onClose, onSelect }: Props) {
  const t = useT();
  const sel = resolveSelection(data, result, selectedId);
  if (sel?.kind === 'recipe')
    return <RecipeInspector data={data} recipeId={sel.recipeId} node={sel.node} forItem={forItem} onClose={onClose} onSelect={onSelect} />;
  if (sel?.kind === 'import' && result) return <EndpointInspector data={data} id={sel.id} result={result} onClose={onClose} />;
  return <p className="text-sm text-muted">{t('inspector.empty')}</p>;
}
