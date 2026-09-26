import { useCallback, useEffect, useRef } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  type OnSelectionChangeFunc,
} from '@xyflow/react';
import type { GameData } from '@/shared/data/types';
import type { SolveResult } from '@/features/solver/types';
import { GraphDataContext } from './context';
import { FlowEdge } from './edges/FlowEdge';
import type { GraphNode } from './elements';
import { ImportNode, SurplusNode, TargetNode } from './nodes/EndpointNode';
import { RecipeNode } from './nodes/RecipeNode';
import { useGraphLayout } from './useGraphLayout';
import { openingViewport } from './viewport';

// Module-level so React Flow never sees new type maps (it would remount every node).
const nodeTypes = { recipe: RecipeNode, import: ImportNode, target: TargetNode, surplus: SurplusNode };
const edgeTypes = { flow: FlowEdge };

const MINIMAP_COLOR: Record<string, string> = {
  recipe: '#b574ff',
  import: '#4fe3f1',
  target: '#ff5fd2',
  surplus: '#ffb547',
};

interface GraphViewProps {
  data: GameData;
  result: SolveResult | null;
  selectedId: string | null;
  onSelectNode: (id: string | null) => void;
}

function Graph({ data, result, selectedId, onSelectNode }: GraphViewProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  const graph = useGraphLayout(data, result, () => ({
    width: wrapper.current?.clientWidth || 1024,
    height: wrapper.current?.clientHeight || 600,
  }));
  const [nodes, setNodes, onNodesChange] = useNodesState<GraphNode>([]);
  const { setViewport, getNodes, getNodesBounds } = useReactFlow();

  useEffect(() => {
    setNodes(graph ? graph.nodes.map((n) => ({ ...n, selected: n.id === selectedId })) : []);
    // selectedId deliberately not a dependency: re-seeding on selection would re-measure nodes and
    // reset the viewport on every click; selection is synced by the effect below.
  }, [graph, setNodes]);

  // Fit only once React Flow has measured the freshly laid-out nodes; earlier calls see an empty box.
  const measured = useNodesInitialized();
  useEffect(() => {
    const el = wrapper.current;
    if (!measured || !el) return;
    const all = getNodes();
    const targets = all.filter((n) => n.type === 'target');
    void setViewport(
      openingViewport(getNodesBounds(all), targets.length ? getNodesBounds(targets) : null, {
        width: el.clientWidth,
        height: el.clientHeight,
      }),
    );
  }, [measured, graph, setViewport, getNodes, getNodesBounds]);

  useEffect(() => {
    setNodes((ns) => ns.map((n) => (!!n.selected === (n.id === selectedId) ? n : { ...n, selected: n.id === selectedId })));
  }, [selectedId, setNodes]);

  // Only real picks select; clearing is an explicit pane click. React Flow also reports an empty
  // selection when it (re)mounts or re-seeds nodes, which used to close the inspector mid-edit.
  const onSelectionChange = useCallback<OnSelectionChangeFunc>(
    ({ nodes: sel }) => {
      if (sel[0]) onSelectNode(sel[0].id);
    },
    [onSelectNode],
  );
  const onPaneClick = useCallback(() => onSelectNode(null), [onSelectNode]);

  return (
    <GraphDataContext.Provider value={data}>
      <ReactFlow<GraphNode>
        ref={wrapper}
        nodesDraggable={false}
        nodes={nodes}
        edges={graph?.edges ?? []}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onSelectionChange={onSelectionChange}
        onPaneClick={onPaneClick}
        nodesConnectable={false}
        multiSelectionKeyCode={null}
        selectionKeyCode={null}
        deleteKeyCode={null}
        minZoom={0.2}
        maxZoom={1.75}
        colorMode="dark"
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1.2} color="rgb(176 164 255 / 0.13)" />
        <Controls showInteractive={false} position="bottom-left" />
        <MiniMap
          pannable
          zoomable
          position="bottom-right"
          className="max-lg:!hidden"
          nodeColor={(n) => MINIMAP_COLOR[n.type ?? 'recipe'] ?? '#b574ff'}
          nodeStrokeWidth={0}
          nodeBorderRadius={6}
          style={{ width: 150, height: 96 }}
        />
      </ReactFlow>
    </GraphDataContext.Provider>
  );
}

export function GraphView(props: GraphViewProps) {
  return (
    <ReactFlowProvider>
      <Graph {...props} />
    </ReactFlowProvider>
  );
}
