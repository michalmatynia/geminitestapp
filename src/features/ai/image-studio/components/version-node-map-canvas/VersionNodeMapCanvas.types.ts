export interface VersionNodeMapCanvasProps {
  _unused?: never;
}

export interface VersionNodeMapCanvasRef {
  svgElement: SVGSVGElement | null;
  fitToView: () => void;
  getPanZoom: () => { pan: { x: number; y: number }; zoom: number };
  setPan: (pan: { x: number; y: number }) => void;
}

export type NodeOperationVisual = {
  label: string;
  icon: string;
  color: string;
};
