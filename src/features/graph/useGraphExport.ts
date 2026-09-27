import { useState, type RefObject } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useT } from '@/shared/i18n';
import { toast } from '@/shared/ui/Toast';
import type { ImageFormat } from './export';
import type { GraphMode } from './GraphToolbar';

/**
 * Download of whatever the stage shows: the React Flow graph as PNG/SVG, or the flow diagram's SVG.
 * The exporter (and html-to-image) load on first use, keeping them out of the main chunk.
 */
export function useGraphExport(mode: GraphMode, stage: RefObject<HTMLElement | null>, sankey: RefObject<SVGSVGElement | null>) {
  const t = useT();
  const { getNodes, getNodesBounds } = useReactFlow();
  const [exporting, setExporting] = useState(false);

  const exportImage = async (format: ImageFormat) => {
    setExporting(true);
    try {
      const { exportFlowImage, exportSvgElement } = await import('./export');
      if (mode === 'flows') {
        if (!sankey.current) throw new Error('flow diagram is not rendered');
        exportSvgElement(sankey.current, 'alchemy-flows.svg');
      } else {
        const viewport = stage.current?.querySelector<HTMLElement>('.react-flow__viewport');
        if (!viewport) throw new Error('graph is not rendered');
        await exportFlowImage(viewport, getNodesBounds(getNodes()), format, `alchemy-graph.${format}`);
      }
    } catch {
      toast(t('graph.export.failed'), 'error');
    } finally {
      setExporting(false);
    }
  };

  return { exportImage, exporting };
}
