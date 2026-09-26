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
  const graph = useGraphLayout(data, result);
  const [nodes, setNodes, onNodesChange] = useNodesState<GraphNode>([]);
  const { fitView, getViewport, setViewport, getNodes, getNodesBounds } = useReactFlow();
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNodes(graph ? graph.nodes.map((n) => ({ ...n, selected: n.id === selectedId })) : []);
    // selectedId deliberately not a dependency: it is synced below, re-seeding here would undo drags.
  }, [graph, setNodes]);

  // Fit only once React Flow has measured the freshly laid-out nodes; earlier calls see an empty box.
  const measured = useNodesInitialized();
  useEffect(() => {
    if (!measured) return;
    // Small graphs fit whole. Large ones stop at a legible zoom and open on the target side: the
    // result and its last steps answer "how do I make X", while raw inputs are also listed in the summary.
    const narrow = (wrapper.current?.clientWidth ?? 1024) < 640;
    void fitView({ padding: 0.06, minZoom: narrow ? 0.6 : 0.75, maxZoom: 1.1 }).then(() => {
      const v = getViewport();
      const all = getNodes();
      const b = getNodesBounds(all);
      const el = wrapper.current;
      if (!el) return;
      const right = el.clientWidth - 24 - (b.x + b.width) * v.zoom;
      if (v.x <= right) return; // whole graph fits
      const t = getNodesBounds(all.filter((n) => n.type === 'target'));
      void setViewport({ ...v, x: right, y: el.clientHeight / 2 - (t.y + t.height / 2) * v.zoom });
    });
  }, [measured, graph, fitView, getViewport, setViewport, getNodes, getNodesBounds]);

  useEffect(() => {
    setNodes((ns) => ns.map((n) => (!!n.selected === (n.id === selectedId) ? n : { ...n, selected: n.id === selectedId })));
  }, [selectedId, setNodes]);

  const onSelectionChange = useCallback<OnSelectionChangeFunc>(
    ({ nodes: sel }) => onSelectNode(sel[0]?.id ?? null),
    [onSelectNode],
  );

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
