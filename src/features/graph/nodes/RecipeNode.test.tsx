import { render, screen } from '@testing-library/react';
import { ReactFlowProvider, type NodeProps } from '@xyflow/react';
import { demoGameData } from '../fixtures/demo-gamedata';
import { demoResult } from '../fixtures/demo-result';
import { GraphDataContext } from '../context';
import type { RecipeFlowNode } from '../elements';
import { GameLocaleProvider, useLangStore } from '@/shared/i18n';
import { RecipeNode } from './RecipeNode';

const data = {
  ...demoGameData,
  buildings: {
    ...demoGameData.buildings,
    Stove: { ...demoGameData.buildings.Kiln!, id: 'Stove', nameKey: 'building.Stove', category: 'heating' as const, heatSlots: 4 },
  },
};

function renderNode(node: RecipeFlowNode['data']['node']) {
  useLangStore.setState({ lang: 'ru' });
  const props = { id: node.id, data: { node, loops: [], feeds: [] }, selected: false } as unknown as NodeProps<RecipeFlowNode>;
  return render(
    <GameLocaleProvider locale={{ 'building.Stove': 'Печь' }}>
      <ReactFlowProvider>
        <GraphDataContext.Provider value={data}>
          <RecipeNode {...props} />
        </GraphDataContext.Provider>
      </ReactFlowProvider>
    </GameLocaleProvider>,
  );
}

const crucible = demoResult.nodes.find((n) => n.recipe === 'IronIngot')!;

test('heated node shows its heater count with exact count and slots in the tooltip', () => {
  renderNode({ ...crucible, heater: { building: 'Stove', countExact: 1.5, count: 2 } });
  expect(screen.getByTitle('Печь: 2 шт. (точно 1,5); машина занимает 1 из 4 слотов')).toHaveTextContent('2×');
});

test('a machine that does not fit its heater gets a visible warning badge with the numbers', () => {
  renderNode({ ...crucible, heaterWarning: { building: 'Stove', slotsRequired: 9, heatSlots: 4 } });
  const badge = screen.getByTitle('Машина не влезает в «Печь»: нужно 9 слотов, есть 4');
  expect(badge).toHaveTextContent('не влезает в Печь');
});
