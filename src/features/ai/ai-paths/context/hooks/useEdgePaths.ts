/**
 * useEdgePaths - Computes SVG paths for edges based on nodes and edges from context.
 *
 * This hook derives edgePaths from GraphContext, eliminating the need to pass
 * edgePaths as a prop from the parent component.
 *
 * Usage:
 * ```tsx
 * function CanvasBoard() {
 *   const edgePaths = useEdgePaths();
 *   // Render edge paths...
 * }
 * ```
 */

import { useMemo } from 'react';

import { NODE_WIDTH, getPortOffsetY } from '@/features/ai/ai-paths/lib';
import type { AiNode, Edge } from '@/features/ai/ai-paths/lib';

import { useGraphState } from '../GraphContext';

/**
 * Edge path with SVG path data and optional label/arrow.
 */
export type EdgePath = {
  id: string;
  path: string;
  label?: string | undefined;
  arrow?: { x: number; y: number; angle: number } | undefined;
};

/**
 * Calculate the position of a port on a node.
 */
function getPortPosition(
  node: AiNode,
  portName: string | undefined,
  side: 'input' | 'output'
): { x: number; y: number } {
  const ports = side === 'input' ? node.inputs : node.outputs;
  const index = portName ? ports.indexOf(portName) : -1;
  const safeIndex = index >= 0 ? index : Math.max(0, Math.floor(ports.length / 2));
  const x = node.position.x + (side === 'output' ? NODE_WIDTH : 0);
  const y = node.position.y + getPortOffsetY(safeIndex, ports.length);
  return { x, y };
}

/**
 * Compute edge paths from nodes and edges.
 */
function computeEdgePaths(nodes: AiNode[], edges: Edge[]): EdgePath[] {
  const nodeMap = new Map(nodes.map((node): [string, AiNode] => [node.id, node]));
  const midpoint = (a: { x: number; y: number }, b: { x: number; y: number }): { x: number; y: number } => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });

  return edges
    .map((edge): EdgePath | null => {
      const from = nodeMap.get(edge.from);
      const to = nodeMap.get(edge.to);
      if (!from || !to) return null;

      const fromPort = edge.fromPort ?? (from.outputs.length > 0 ? from.outputs[0] : undefined);
      const toPort = edge.toPort ?? (to.inputs.length > 0 ? to.inputs[0] : undefined);
      const fromPos = getPortPosition(from, fromPort, 'output');
      const toPos = getPortPosition(to, toPort, 'input');

      const p0 = { x: fromPos.x, y: fromPos.y };
      const p3 = { x: toPos.x, y: toPos.y };
      const midX = p0.x + (p3.x - p0.x) * 0.5;
      const p1 = { x: midX, y: p0.y };
      const p2 = { x: midX, y: p3.y };
      const q0 = midpoint(p0, p1);
      const q1 = midpoint(p1, p2);
      const q2 = midpoint(p2, p3);
      const r0 = midpoint(q0, q1);
      const r1 = midpoint(q1, q2);
      const s = midpoint(r0, r1);

      const path = [
        `M ${p0.x} ${p0.y}`,
        `C ${q0.x} ${q0.y}, ${r0.x} ${r0.y}, ${s.x} ${s.y}`,
        `C ${r1.x} ${r1.y}, ${q2.x} ${q2.y}, ${p3.x} ${p3.y}`,
      ].join(' ');

      let dx = r1.x - r0.x;
      let dy = r1.y - r0.y;
      if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
        dx = p3.x - p0.x;
        dy = p3.y - p0.y;
      }
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

      return {
        id: edge.id,
        path,
        label: edge.label,
        arrow: { x: s.x, y: s.y, angle },
      };
    })
    .filter(Boolean) as EdgePath[];
}

/**
 * Hook to compute edge paths from GraphContext.
 *
 * @returns Array of edge paths with SVG path data
 */
export function useEdgePaths(): EdgePath[] {
  const { nodes, edges } = useGraphState();

  return useMemo(() => computeEdgePaths(nodes, edges), [nodes, edges]);
}
