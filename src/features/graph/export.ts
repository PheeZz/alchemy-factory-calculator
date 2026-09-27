import type { Rect } from '@xyflow/react';
import { toPng, toSvg } from 'html-to-image';

export type ImageFormat = 'png' | 'svg';

// The page's void colour lives on <body>, outside anything captured, so it is baked into the image.
const BACKGROUND = '#090716';
const PAD = 32;
/** Longest side in device pixels; browsers refuse canvases much past 16k, and 2× is plenty for print. */
const MAX_SIDE = 8192;

function download(url: string, fileName: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
}

/**
 * The whole graph at zoom 1, whatever the on-screen pan/zoom: the React Flow viewport element is
 * re-transformed onto `bounds` (the approach from the React Flow "download image" example).
 */
export async function exportFlowImage(viewport: HTMLElement, bounds: Rect, format: ImageFormat, fileName: string) {
  const width = Math.ceil(bounds.width + 2 * PAD);
  const height = Math.ceil(bounds.height + 2 * PAD);
  const options = {
    backgroundColor: BACKGROUND,
    width,
    height,
    pixelRatio: Math.min(2, MAX_SIDE / Math.max(width, height)),
    style: { width: `${width}px`, height: `${height}px`, transform: `translate(${PAD - bounds.x}px, ${PAD - bounds.y}px) scale(1)` },
    // The running lights are a moving dash pattern; frozen mid-step they read as a broken line.
    // Controls marked data-export-skip only make sense on screen.
    filter: (el: HTMLElement) => !el.classList?.contains('flow-spark') && !el.dataset?.exportSkip,
  };
  download(format === 'png' ? await toPng(viewport, options) : await toSvg(viewport, options), fileName);
}

/** A live inline SVG as a standalone file: CSS variables resolved against the page, background and font baked in. */
export function exportSvgElement(svg: SVGSVGElement, fileName: string) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('font-family', getComputedStyle(svg).fontFamily);
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', '100%');
  bg.setAttribute('height', '100%');
  bg.setAttribute('fill', BACKGROUND);
  clone.prepend(bg);
  const root = getComputedStyle(document.documentElement);
  const text = new XMLSerializer()
    .serializeToString(clone)
    .replace(/var\((--[\w-]+)\)/g, (m, name: string) => root.getPropertyValue(name).trim() || m);
  const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
  download(url, fileName);
  setTimeout(() => URL.revokeObjectURL(url));
}
