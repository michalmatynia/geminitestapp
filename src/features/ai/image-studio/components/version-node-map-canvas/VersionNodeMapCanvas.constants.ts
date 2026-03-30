'use client';

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 3;
export const WHEEL_ZOOM_SENSITIVITY = 0.00065;
export const MAX_WHEEL_ZOOM_DELTA = 0.1;
export const MIN_WHEEL_ZOOM_DELTA = 0.002;
export const THUMB_SIZE = 48;
export const LABEL_OFFSET_Y = 14;

export const SVG_STYLES = `
@keyframes vgraph-fade-in {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 0.85; transform: scale(1); }
}
@keyframes vgraph-glow-pulse {
  0%, 100% { filter: drop-shadow(0 0 3px rgba(250,204,21,0.4)); }
  50% { filter: drop-shadow(0 0 8px rgba(250,204,21,0.7)); }
}
@keyframes vgraph-edge-draw {
  from { stroke-dashoffset: 1000; }
  to { stroke-dashoffset: 0; }
}
.vgraph-focusable {
  outline: none;
}
.vgraph-focusable:focus-visible > [data-focus-ring='true'] {
  stroke: #93c5fd;
  stroke-width: 1.5;
}
.vgraph-node-trigger:focus-visible > [data-focus-ring='true'] {
  stroke: #facc15;
  stroke-width: 2;
}
`;
