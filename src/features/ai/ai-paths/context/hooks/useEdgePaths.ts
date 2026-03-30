'use client';

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

import { useMemo, useRef } from 'react';

import type { Point2d } from '@/shared/contracts/geometry';
import { NODE_WIDTH, getPortOffsetY } from '@/shared/lib/ai-paths';
import type { AiNode, Edge } from '@/shared/lib/ai-paths';

import { useGraphState } from '../GraphContext';

export type EdgeRoutingMode = 'bezier' | 'orthogonal';

/**
 * Edge path with SVG path data and optional label/arrow.
 */
export type EdgePath = {
  id: string;
  path: string;
  label?: string | undefined;
  arrow?: { x: number; y: number; angle: number } | undefined;
  fromNodeId: string;
  toNodeId: string;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
};

/**
 * Calculate the position of a port on a node.
 */
function getPortPosition(
  node: AiNode,
  portName: string | undefined,
  side: 'input' | 'output'
): Point2d {
  const ports = side === 'input' ? node.inputs : node.outputs;
  const index = portName ? ports.indexOf(portName) : -1;
  const safeIndex = index >= 0 ? index : Math.max(0, Math.floor(ports.length / 2));
  const x = node.position.x + (side === 'output' ? NODE_WIDTH : 0);
  const y = node.position.y + getPortOffsetY(safeIndex, ports.length);
  return { x, y };
}

const midpoint = (a: Point2d, b: Point2d): Point2d => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

const toAngleDegrees = (dx: number, dy: number): number => (Math.atan2(dy, dx) * 180) / Math.PI;
const ORTHOGONAL_CORNER_RADIUS = 18;
const SEGMENT_EPSILON = 0.001;

const dedupeAdjacentPoints = (points: Point2d[]): Point2d[] => {
  const deduped: Point2d[] = [];
  points.forEach((point: Point2d) => {
    const previous = deduped[deduped.length - 1];
    if (
      previous &&
      Math.abs(previous.x - point.x) < 0.001 &&
      Math.abs(previous.y - point.y) < 0.001
    ) {
      return;
    }
    deduped.push(point);
  });
  return deduped;
};

const buildOrthogonalPolyline = (from: Point2d, to: Point2d): Point2d[] => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx < 28) {
    const directionY = dy >= 0 ? 1 : -1;
    const bendY = from.y + (absDy < 56 ? 24 * directionY : dy * 0.5);
    return dedupeAdjacentPoints([from, { x: from.x, y: bendY }, { x: to.x, y: bendY }, to]);
  }

  const directionX = dx >= 0 ? 1 : -1;
  const bendX = from.x + (absDx < 84 ? 34 * directionX : dx * 0.5);
  return dedupeAdjacentPoints([from, { x: bendX, y: from.y }, { x: bendX, y: to.y }, to]);
};

const buildRoundedOrthogonalPath = (points: Point2d[], cornerRadius: number): string => {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const only = points[0] as Point2d;
    return `M ${only.x} ${only.y}`;
  }

  const segments: string[] = [];
  const first = points[0] as Point2d;
  segments.push(`M ${first.x} ${first.y}`);

  for (let index = 1; index < points.length - 1; index += 1) {
    const prev = points[index - 1] as Point2d;
    const curr = points[index] as Point2d;
    const next = points[index + 1] as Point2d;
    const dxIn = curr.x - prev.x;
    const dyIn = curr.y - prev.y;
    const dxOut = next.x - curr.x;
    const dyOut = next.y - curr.y;
    const lenIn = Math.hypot(dxIn, dyIn);
    const lenOut = Math.hypot(dxOut, dyOut);
    if (lenIn <= SEGMENT_EPSILON || lenOut <= SEGMENT_EPSILON) {
      segments.push(`L ${curr.x} ${curr.y}`);
      continue;
    }
    const dirInX = dxIn / lenIn;
    const dirInY = dyIn / lenIn;
    const dirOutX = dxOut / lenOut;
    const dirOutY = dyOut / lenOut;
    const isStraight =
      Math.abs(dirInX - dirOutX) <= SEGMENT_EPSILON &&
      Math.abs(dirInY - dirOutY) <= SEGMENT_EPSILON;
    if (isStraight) {
      segments.push(`L ${curr.x} ${curr.y}`);
      continue;
    }
    const radius = Math.min(cornerRadius, lenIn / 2, lenOut / 2);
    if (radius < 0.5) {
      segments.push(`L ${curr.x} ${curr.y}`);
      continue;
    }
    const enterX = curr.x - dirInX * radius;
    const enterY = curr.y - dirInY * radius;
    const exitX = curr.x + dirOutX * radius;
    const exitY = curr.y + dirOutY * radius;
    segments.push(`L ${enterX} ${enterY}`);
    segments.push(`Q ${curr.x} ${curr.y} ${exitX} ${exitY}`);
  }

  const last = points[points.length - 1] as Point2d;
  segments.push(`L ${last.x} ${last.y}`);
  return segments.join(' ');
};

const computePolylineArrow = (points: Point2d[]): { x: number; y: number; angle: number } => {
  if (points.length < 2) return { x: 0, y: 0, angle: 0 };
  const segments = points
    .slice(0, -1)
    .map((point: Point2d, index: number) => {
      const next = points[index + 1] as Point2d;
      const dx = next.x - point.x;
      const dy = next.y - point.y;
      const length = Math.hypot(dx, dy);
      return {
        from: point,
        to: next,
        dx,
        dy,
        length,
      };
    })
    .filter((segment): boolean => segment.length > 0.001);
  if (segments.length === 0) {
    const from = points[0] as Point2d;
    return { x: from.x, y: from.y, angle: 0 };
  }
  const totalLength = segments.reduce((sum: number, segment): number => sum + segment.length, 0);
  const targetDistance = totalLength / 2;
  let traversed = 0;
  for (const segment of segments) {
    if (traversed + segment.length >= targetDistance) {
      const t = (targetDistance - traversed) / segment.length;
      const x = segment.from.x + segment.dx * t;
      const y = segment.from.y + segment.dy * t;
      return {
        x,
        y,
        angle: toAngleDegrees(segment.dx, segment.dy),
      };
    }
    traversed += segment.length;
  }
  const last = segments[segments.length - 1]!;
  return {
    x: (last.from.x + last.to.x) / 2,
    y: (last.from.y + last.to.y) / 2,
    angle: toAngleDegrees(last.dx, last.dy),
  };
};

/**
 * Compute edge paths from nodes and edges.
 */
function computeEdgePaths(
  nodes: AiNode[],
  edges: Edge[],
  routingMode: EdgeRoutingMode,
  cache: Map<string, { signature: string; value: EdgePath }>
): {
  edgePaths: EdgePath[];
  nextCache: Map<string, { signature: string; value: EdgePath }>;
} {
  const nodeMap = new Map(nodes.map((node): [string, AiNode] => [node.id, node]));
  const nextCache = new Map<string, { signature: string; value: EdgePath }>();

  const edgePaths = edges
    .map((edge): EdgePath | null => {
      const fromNodeId = edge.from;
      const toNodeId = edge.to;
      if (!fromNodeId || !toNodeId) return null;
      const from = nodeMap.get(fromNodeId);
      const to = nodeMap.get(toNodeId);
      if (!from || !to) return null;

      const fromPort = edge.fromPort ?? (from.outputs.length > 0 ? from.outputs[0] : undefined);
      const toPort = edge.toPort ?? (to.inputs.length > 0 ? to.inputs[0] : undefined);
      const fromPos = getPortPosition(from, fromPort, 'output');
      const toPos = getPortPosition(to, toPort, 'input');
      const signature = [
        edge.id,
        edge.label ?? '',
        edge.from,
        fromPort ?? '',
        fromPos.x,
        fromPos.y,
        edge.to,
        toPort ?? '',
        toPos.x,
        toPos.y,
        routingMode,
      ].join('|');
      const cached = cache.get(edge.id);
      if (cached?.signature === signature) {
        nextCache.set(edge.id, cached);
        return cached.value;
      }

      const p0 = { x: fromPos.x, y: fromPos.y };
      const p3 = { x: toPos.x, y: toPos.y };
      let path: string;
      let bounds: { minX: number; minY: number; maxX: number; maxY: number };
      let arrow: { x: number; y: number; angle: number };

      if (routingMode === 'orthogonal') {
        const points = buildOrthogonalPolyline(p0, p3);
        path = buildRoundedOrthogonalPath(points, ORTHOGONAL_CORNER_RADIUS);
        const xs = points.map((point: Point2d): number => point.x);
        const ys = points.map((point: Point2d): number => point.y);
        bounds = {
          minX: Math.min(...xs),
          minY: Math.min(...ys),
          maxX: Math.max(...xs),
          maxY: Math.max(...ys),
        };
        arrow = computePolylineArrow(points);
      } else {
        const midX = p0.x + (p3.x - p0.x) * 0.5;
        const p1 = { x: midX, y: p0.y };
        const p2 = { x: midX, y: p3.y };
        const q0 = midpoint(p0, p1);
        const q1 = midpoint(p1, p2);
        const q2 = midpoint(p2, p3);
        const r0 = midpoint(q0, q1);
        const r1 = midpoint(q1, q2);
        const s = midpoint(r0, r1);
        path = [
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
        arrow = { x: s.x, y: s.y, angle: toAngleDegrees(dx, dy) };
        bounds = {
          minX: Math.min(p0.x, p1.x, p2.x, p3.x),
          minY: Math.min(p0.y, p1.y, p2.y, p3.y),
          maxX: Math.max(p0.x, p1.x, p2.x, p3.x),
          maxY: Math.max(p0.y, p1.y, p2.y, p3.y),
        };
      }

      const nextEdgePath: EdgePath = {
        id: edge.id,
        path,
        label: edge.label ?? undefined,
        arrow,
        fromNodeId,
        toNodeId,
        bounds,
      };
      nextCache.set(edge.id, {
        signature,
        value: nextEdgePath,
      });
      return nextEdgePath;
    })
    .filter(Boolean) as EdgePath[];
  return {
    edgePaths,
    nextCache,
  };
}

/**
 * Hook to compute edge paths from GraphContext.
 *
 * @returns Array of edge paths with SVG path data
 */
export function useEdgePaths(routingMode: EdgeRoutingMode = 'bezier'): EdgePath[] {
  const { nodes, edges } = useGraphState();
  const cacheRef = useRef<Map<string, { signature: string; value: EdgePath }>>(new Map());

  return useMemo(() => {
    const { edgePaths, nextCache } = computeEdgePaths(nodes, edges, routingMode, cacheRef.current);
    cacheRef.current = nextCache;
    return edgePaths;
  }, [nodes, edges, routingMode]);
}
