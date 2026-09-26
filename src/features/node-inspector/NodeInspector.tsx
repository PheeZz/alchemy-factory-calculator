import type { GameData } from '@/shared/data/types';
import type { SolveNode, SolveResult } from '@/features/solver/types';
import { mainOutput, upgradeValue } from '@/entities/game';
import { useActivePlan, useFactoryStore } from '@/features/factory/store';
import { parseEndpoint } from '@/features/graph/elements';
import { useNames, useT } from '@/shared/i18n';
import { formatRate } from '@/shared/lib/format';
import { Button, IconButton } from '@/shared/ui/Button';
import { GlowBadge } from '@/shared/ui/GlowBadge';
import { Icon } from '@/shared/ui/Icon';
import { ItemIcon } from '@/shared/ui/ItemIcon';
import { ItemRateList } from './ItemRateList';
import { MachineStats } from './MachineStats';
import { NodeOverrides } from './NodeOverrides';
import { recipeRates } from './rates';
import { RecipeChoice } from './RecipeChoice';

interface Props {
  data: GameData;
  result: SolveResult | null;
  selectedId: string | null;
  onClose?: () => void;
}

function Header({ icon, seed, title, subtitle, onClose }: { icon: string | null; seed: string; title: string; subtitle: string; onClose?: () => void }) {
  const t = useT();
  return (
    <div className="flex items-center gap-3">
      <ItemIcon icon={icon} name={title} seed={seed} size={40} decorative />
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-display text-xl leading-tight">{title}</h2>
        <p className="truncate text-sm text-muted">{subtitle}</p>
      </div>
      {onClose && <IconButton icon="close" size="sm" label={t('inspector.close')} onClick={onClose} />}
    </div>
  );
}

function RecipeInspector({ data, node, onClose }: { data: GameData; node: SolveNode; onClose?: () => void }) {
  const t = useT();
  const name = useNames();
  const plan = useActivePlan();
  const levels = useFactoryStore((s) => s.levels);
  const recipe = data.recipes[node.recipe];
  if (!recipe) return null;
  const building = data.buildings[node.building];
  const out = mainOutput(recipe);
  const outItem = out ? data.items[out.item] : undefined;
  const outName = outItem ? name(outItem.nameKey) : node.recipe;
  const rates = recipeRates(recipe, node, upgradeValue(data, 'alchemySkill', levels.alchemySkill));
  const itemName = (id: string) => name(data.items[id]?.nameKey ?? id);

  return (
    <div className="flex flex-col gap-5">
      <Header
        icon={outItem?.icon ?? null}
        seed={out?.item ?? node.recipe}
        title={outName}
        subtitle={building ? name(building.nameKey) : node.building}
        onClose={onClose}
      />
      <MachineStats node={node} />
      {(node.fuel || node.fertilizer) && (
        <ul className="flex flex-col gap-1.5 text-sm">
          {node.fuel && (
            <li className="flex items-center gap-2 text-ember">
              <Icon name="flame" size={15} />
              {t('graph.fuel', { item: itemName(node.fuel.item), rate: formatRate(t.lang, node.fuel.rate) })}
            </li>
          )}
          {node.fertilizer && (
            <li className="flex items-center gap-2 text-verdant">
              <Icon name="leaf" size={15} />
              {t('graph.fertilizer', { item: itemName(node.fertilizer.item), rate: formatRate(t.lang, node.fertilizer.rate) })}
            </li>
          )}
        </ul>
      )}
      {node.portWarnings.length > 0 && (
        <ul className="flex flex-col gap-1.5" aria-label={t('inspector.warnings')}>
          {node.portWarnings.map((w) => (
            <li key={w.item} className="flex gap-2 rounded-xl border border-danger/40 bg-danger/10 p-2.5 text-sm text-[#ffc2c7]">
              <Icon name="alert" size={16} className="mt-0.5 shrink-0 text-danger" />
              {t('graph.portWarning', {
                item: itemName(w.item),
                perMachine: formatRate(t.lang, w.perMachine),
                belt: formatRate(t.lang, w.beltSpeed),
              })}
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-1 gap-4">
        <ItemRateList data={data} title={t('inspector.inputs')} rates={rates.inputs} />
        <ItemRateList data={data} title={t('inspector.outputs')} rates={rates.outputs} />
      </div>
      {out && <RecipeChoice data={data} item={out.item} current={recipe} />}
      <NodeOverrides data={data} recipe={recipe} building={building} />
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

  return (
    <div className="flex flex-col gap-4">
      <Header icon={item?.icon ?? null} seed={ep.item} title={title} subtitle={t(imported ? 'graph.import' : 'graph.raw')} onClose={onClose} />
      <GlowBadge tone="flow" className="self-start text-sm">
        {t('unit.perMin', { value: formatRate(t.lang, perMin) })}
      </GlowBadge>
      <p className="text-sm text-muted">{t(imported ? 'inspector.importNode' : 'inspector.rawNode')}</p>
      {imported && (
        <Button variant="primary" onClick={() => useFactoryStore.getState().toggleImport(ep.item)}>
          {t('inspector.produceHere')}
        </Button>
      )}
    </div>
  );
}

export function NodeInspector({ data, result, selectedId, onClose }: Props) {
  const t = useT();
  const node = result?.nodes.find((n) => n.id === selectedId);
  if (node) return <RecipeInspector data={data} node={node} onClose={onClose} />;
  if (result && selectedId && parseEndpoint(selectedId)?.kind === 'import')
    return <EndpointInspector data={data} id={selectedId} result={result} onClose={onClose} />;
  return <p className="text-sm text-muted">{t('inspector.empty')}</p>;
}
