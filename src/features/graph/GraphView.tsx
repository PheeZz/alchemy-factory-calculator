import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  useStore,
  type OnSelectionChangeFunc,
} from '@xyflow/react';
import type { GameData } from '@/shared/data/types';
import type { SolveResult } from '@/features/solver/types';
import { GraphActionsContext, GraphDataContext } from './context';
import { FlowEdge } from './edges/FlowEdge';
import type { GraphNode } from './elements';
import { GraphToolbar, type GraphMode } from './GraphToolbar';
import { BuildingGroupNode } from './nodes/BuildingGroupNode';
import { ImportNode, SurplusNode, TargetNode } from './nodes/EndpointNode';
import { RecipeNode } from './nodes/RecipeNode';
import { useGraphExport } from './useGraphExport';
import { useGraphLayout, type GraphOptions } from './useGraphLayout';
import { chainFocus } from './focus';
import { openingViewport } from './viewport';

/** Below this zoom the running lights are sub-pixel and only cost paint time. */
const FAR_ZOOM = 0.35;

// Module-level so React Flow never sees new type maps (it would remount every node).
const nodeTypes = { recipe: RecipeNode, import: ImportNode, target: TargetNode, surplus: SurplusNode, building: BuildingGroupNode };
const edgeTypes = { flow: FlowEdge };

const MINIMAP_COLOR: Record<string, string> = {
  recipe: '#b574ff',
  import: '#4fe3f1',
  target: '#ff5fd2',
  surplus: '#ffb547',
  building: 'rgb(181 116 255 / 0.12)',
};

// d3-sankey and the diagram only load when the player switches to it.
const SankeyView = lazy(() => import('./sankey/SankeyView'));

interface GraphViewProps {
  data: GameData;
  result: SolveResult | null;
  selectedId: string | null;
  onSelectNode: (id: string | null) => void;
}

function Graph({ data, result, selectedId, onSelectNode, options }: GraphViewProps & { options: GraphOptions }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const { graph, pending } = useGraphLayout(
    data,
    result,
    () => ({
      width: wrapper.current?.clientWidth || 1024,
      height: wrapper.current?.clientHeight || 600,
    }),
    options,
  );
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

  const [hovered, setHovered] = useState<string | null>(null);
  const focus = useMemo(() => chainFocus(graph?.edges ?? [], hovered), [graph, hovered]);
  const shownNodes = useMemo(
    () =>
      focus
        ? nodes.map((n) => ({ ...n, className: focus.nodes.has(n.id) || n.type === 'building' ? undefined : 'is-dim' }))
        : nodes,
    [nodes, focus],
  );
  const shownEdges = useMemo(
    () => (focus && graph ? graph.edges.map((e) => ({ ...e, className: focus.edges.has(e.id) ? undefined : 'is-dim' })) : (graph?.edges ?? [])),
    [graph, focus],
  );
  const far = useStore((s) => s.transform[2] < FAR_ZOOM);

  return (
    <GraphDataContext.Provider value={data}>
      <ReactFlow<GraphNode>
        ref={wrapper}
        nodesDraggable={false}
        nodes={shownNodes}
        edges={shownEdges}
        className={far ? 'graph-far' : undefined}
        onNodeMouseEnter={(_, n) => setHovered(n.id)}
        onNodeMouseLeave={() => setHovered(null)}
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
        {pending && <div className="shimmer z-10" aria-hidden="true" />}
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

/** Graph or flow diagram of one result, with the view toolbar; view options survive switching modes. */
function GraphPanel(props: GraphViewProps) {
  const [mode, setMode] = useState<GraphMode>('graph');
  const [grouped, setGrouped] = useState(false);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const stage = useRef<HTMLDivElement>(null);
  const sankey = useRef<SVGSVGElement>(null);
  const { exportImage, exporting } = useGraphExport(mode, stage, sankey);

  const actions = useMemo(
    () => ({
      toggleBranch: (id: string) =>
        setCollapsed((prev) => {
          const next = new Set(prev);
          if (!next.delete(id)) next.add(id);
          return next;
        }),
    }),
    [],
  );

  return (
    <div ref={stage} className="absolute inset-0">
      {mode === 'graph' ? (
        <GraphActionsContext.Provider value={actions}>
          <Graph {...props} options={{ collapsed, grouped }} />
        </GraphActionsContext.Provider>
      ) : (
        props.result && (
          <Suspense fallback={<div className="shimmer" aria-hidden="true" />}>
            <SankeyView data={props.data} result={props.result} svgRef={sankey} />
          </Suspense>
        )
      )}
      <GraphToolbar
        mode={mode}
        onMode={setMode}
        grouped={grouped}
        onGrouped={setGrouped}
        onExport={(f) => void exportImage(f)}
        exporting={exporting}
      />
    </div>
  );
}

export function GraphView(props: GraphViewProps) {
  return (
    <ReactFlowProvider>
      <GraphPanel {...props} />
    </ReactFlowProvider>
  );
}
