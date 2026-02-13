import type { ImageStudioSlotRecord, SlotGenerationMetadata } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export type LayoutMode = 'dag' | 'timeline-h' | 'timeline-v';

export interface VersionNode {
  id: string;
  label: string;
  type: 'base' | 'generation' | 'merge' | 'composite';
  parentIds: string[];
  childIds: string[];
  hasMask: boolean;
  slot: ImageStudioSlotRecord;
  depth: number;
  x: number;
  y: number;
  descendantCount: number;
}

export interface VersionEdge {
  id: string;
  source: string;
  target: string;
  type: 'generation' | 'merge' | 'composite';
}

export interface VersionGraph {
  nodes: VersionNode[];
  edges: VersionEdge[];
  rootNodes: VersionNode[];
}

// ── Layout constants ─────────────────────────────────────────────────────────

const NODE_WIDTH = 72;
const NODE_HEIGHT = 88;
const H_GAP = 24;
const V_GAP = 40;

// ── Helpers ──────────────────────────────────────────────────────────────────

function readMetadata(slot: ImageStudioSlotRecord): SlotGenerationMetadata {
  if (!slot.metadata || typeof slot.metadata !== 'object') return {};
  return slot.metadata as SlotGenerationMetadata;
}

/** Resolve parent IDs from metadata — supports both single and multi-parent. */
function resolveParentIds(
  meta: SlotGenerationMetadata,
  slotById: Map<string, ImageStudioSlotRecord>,
): string[] {
  // Multi-parent (merge) takes precedence
  if (Array.isArray(meta.sourceSlotIds) && meta.sourceSlotIds.length > 0) {
    return meta.sourceSlotIds.filter((id) => slotById.has(id));
  }
  // Single parent (generation)
  if (meta.sourceSlotId && slotById.has(meta.sourceSlotId)) {
    return [meta.sourceSlotId];
  }
  return [];
}

/** Count all recursive descendants of a node. */
function countDescendants(
  nodeId: string,
  childrenMap: Map<string, string[]>,
  memo: Map<string, number>,
): number {
  const cached = memo.get(nodeId);
  if (cached !== undefined) return cached;

  const children = childrenMap.get(nodeId);
  if (!children || children.length === 0) {
    memo.set(nodeId, 0);
    return 0;
  }

  let count = children.length;
  for (const childId of children) {
    count += countDescendants(childId, childrenMap, memo);
  }
  memo.set(nodeId, count);
  return count;
}

// ── Core computation ─────────────────────────────────────────────────────────

export function computeVersionGraph(slots: ImageStudioSlotRecord[]): VersionGraph {
  if (slots.length === 0) return { nodes: [], edges: [], rootNodes: [] };

  const slotById = new Map<string, ImageStudioSlotRecord>();
  for (const slot of slots) {
    slotById.set(slot.id, slot);
  }

  // Build adjacency
  const childrenMap = new Map<string, string[]>();
  const parentIdsMap = new Map<string, string[]>();

  for (const slot of slots) {
    const meta = readMetadata(slot);
    const pids = resolveParentIds(meta, slotById);
    if (pids.length > 0) {
      parentIdsMap.set(slot.id, pids);
      for (const pid of pids) {
        const siblings = childrenMap.get(pid);
        if (siblings) {
          siblings.push(slot.id);
        } else {
          childrenMap.set(pid, [slot.id]);
        }
      }
    }
  }

  // BFS to assign depth (for DAG: depth = max of parent depths + 1)
  const depthMap = new Map<string, number>();
  const rootIds: string[] = [];

  for (const slot of slots) {
    if (!parentIdsMap.has(slot.id)) {
      rootIds.push(slot.id);
      depthMap.set(slot.id, 0);
    }
  }

  // Topological-order depth assignment for DAG
  const inDegree = new Map<string, number>();
  for (const slot of slots) {
    const pids = parentIdsMap.get(slot.id);
    inDegree.set(slot.id, pids ? pids.length : 0);
  }

  const queue = [...rootIds];
  let qi = 0;
  while (qi < queue.length) {
    const current = queue[qi]!;
    qi += 1;
    const currentDepth = depthMap.get(current) ?? 0;
    const children = childrenMap.get(current);
    if (children) {
      for (const childId of children) {
        // For multi-parent: depth = max(parent depths) + 1
        const existingDepth = depthMap.get(childId) ?? -1;
        const candidateDepth = currentDepth + 1;
        if (candidateDepth > existingDepth) {
          depthMap.set(childId, candidateDepth);
        }
        const remaining = (inDegree.get(childId) ?? 1) - 1;
        inDegree.set(childId, remaining);
        if (remaining <= 0) {
          queue.push(childId);
        }
      }
    }
  }

  // Handle orphaned cycles
  for (const slot of slots) {
    if (!depthMap.has(slot.id)) {
      depthMap.set(slot.id, 0);
      rootIds.push(slot.id);
    }
  }

  // Group by depth for layout
  const depthGroups = new Map<number, string[]>();
  for (const [id, depth] of depthMap) {
    const group = depthGroups.get(depth);
    if (group) {
      group.push(id);
    } else {
      depthGroups.set(depth, [id]);
    }
  }

  // Compute positions: layered layout
  const positionMap = new Map<string, { x: number; y: number }>();
  const maxDepth = Math.max(...depthGroups.keys(), 0);

  // First pass: assign positions left-to-right within each layer
  for (let depth = 0; depth <= maxDepth; depth += 1) {
    const group = depthGroups.get(depth) ?? [];
    const y = depth * (NODE_HEIGHT + V_GAP);
    const totalWidth = group.length * NODE_WIDTH + (group.length - 1) * H_GAP;
    const startX = -totalWidth / 2;

    for (let i = 0; i < group.length; i += 1) {
      const id = group[i]!;
      const x = startX + i * (NODE_WIDTH + H_GAP) + NODE_WIDTH / 2;
      positionMap.set(id, { x, y });
    }
  }

  // Second pass: center parents over their children (bottom-up)
  for (let depth = maxDepth - 1; depth >= 0; depth -= 1) {
    const group = depthGroups.get(depth) ?? [];
    for (const id of group) {
      const children = childrenMap.get(id);
      if (children && children.length > 0) {
        const childXs = children.map((cid) => positionMap.get(cid)?.x ?? 0);
        const avgX = childXs.reduce((sum, x) => sum + x, 0) / childXs.length;
        const pos = positionMap.get(id);
        if (pos) {
          pos.x = avgX;
        }
      }
    }
  }

  // Third pass: position merge nodes at average X of their parents
  for (const slot of slots) {
    const pids = parentIdsMap.get(slot.id);
    if (pids && pids.length > 1) {
      const parentXs = pids.map((pid) => positionMap.get(pid)?.x ?? 0);
      const avgX = parentXs.reduce((sum, x) => sum + x, 0) / parentXs.length;
      const pos = positionMap.get(slot.id);
      if (pos) {
        pos.x = avgX;
      }
    }
  }

  // Resolve overlaps in each layer
  for (let depth = 0; depth <= maxDepth; depth += 1) {
    const group = depthGroups.get(depth) ?? [];
    const sorted = [...group].sort((a, b) => {
      const ax = positionMap.get(a)?.x ?? 0;
      const bx = positionMap.get(b)?.x ?? 0;
      return ax - bx;
    });
    for (let i = 1; i < sorted.length; i += 1) {
      const prevPos = positionMap.get(sorted[i - 1]!)!;
      const currPos = positionMap.get(sorted[i]!)!;
      const minX = prevPos.x + NODE_WIDTH + H_GAP;
      if (currPos.x < minX) {
        currPos.x = minX;
      }
    }
  }

  // Compute descendant counts
  const descendantMemo = new Map<string, number>();

  // Build nodes
  const nodes: VersionNode[] = slots.map((slot) => {
    const meta = readMetadata(slot);
    const pids = parentIdsMap.get(slot.id) ?? [];
    const pos = positionMap.get(slot.id) ?? { x: 0, y: 0 };

    let nodeType: VersionNode['type'] = 'base';
    if (meta.role === 'composite') {
      nodeType = 'composite';
    } else if (meta.role === 'merge' || pids.length > 1) {
      nodeType = 'merge';
    } else if (pids.length === 1) {
      nodeType = 'generation';
    }

    return {
      id: slot.id,
      label: slot.name || slot.id.slice(0, 8),
      type: nodeType,
      parentIds: pids,
      childIds: childrenMap.get(slot.id) ?? [],
      hasMask: Boolean(meta.maskData && meta.maskData.shapes.length > 0),
      slot,
      depth: depthMap.get(slot.id) ?? 0,
      x: pos.x,
      y: pos.y,
      descendantCount: countDescendants(slot.id, childrenMap, descendantMemo),
    };
  });

  // Build edges
  const edges: VersionEdge[] = [];
  for (const [childId, pids] of parentIdsMap) {
    const childMeta = readMetadata(slotById.get(childId)!);
    const isComposite = childMeta.role === 'composite';
    const isMerge = childMeta.role === 'merge' || pids.length > 1;
    for (const pid of pids) {
      edges.push({
        id: `${pid}→${childId}`,
        source: pid,
        target: childId,
        type: isComposite ? 'composite' : isMerge ? 'merge' : 'generation',
      });
    }
  }

  const rootNodes = nodes.filter((n) => n.type === 'base');

  return { nodes, edges, rootNodes };
}

// ── Timeline layout ──────────────────────────────────────────────────────────

/**
 * Re-layout nodes in chronological order as a timeline.
 * Uses actual timestamps from generationParams when available, otherwise falls
 * back to depth ordering.
 */
export function computeTimelineLayout(
  nodes: VersionNode[],
  edges: VersionEdge[],
  orientation: 'horizontal' | 'vertical',
): { nodes: VersionNode[]; edges: VersionEdge[] } {
  if (nodes.length === 0) return { nodes: [], edges };

  // Try to extract timestamps for time-based positioning
  const timestampMap = new Map<string, number>();
  for (const node of nodes) {
    const meta = readMetadata(node.slot);
    const ts = meta.generationParams?.timestamp;
    if (ts) {
      const parsed = new Date(ts).getTime();
      if (!isNaN(parsed)) {
        timestampMap.set(node.id, parsed);
      }
    }
  }

  const hasTimestamps = timestampMap.size > nodes.length * 0.5;

  // Sort by timestamp (if available) or by depth
  const sorted = [...nodes].sort((a, b) => {
    if (hasTimestamps) {
      const ta = timestampMap.get(a.id) ?? 0;
      const tb = timestampMap.get(b.id) ?? 0;
      if (ta !== tb) return ta - tb;
    }
    if (a.depth !== b.depth) return a.depth - b.depth;
    return 0;
  });

  // Assign branch tracks: each root starts a new track, children follow parent track
  // or get a new track if they're a branch
  const trackMap = new Map<string, number>();
  let nextTrack = 0;

  // Assign tracks root-first
  for (const node of sorted) {
    if (node.parentIds.length === 0) {
      trackMap.set(node.id, nextTrack);
      nextTrack += 1;
    }
  }

  // Then children: first child inherits parent track, subsequent children get new tracks
  const parentFirstChild = new Set<string>();
  for (const node of sorted) {
    if (trackMap.has(node.id)) continue;
    const primaryParent = node.parentIds[0];
    if (primaryParent && !parentFirstChild.has(primaryParent)) {
      parentFirstChild.add(primaryParent);
      trackMap.set(node.id, trackMap.get(primaryParent) ?? 0);
    } else {
      trackMap.set(node.id, nextTrack);
      nextTrack += 1;
    }
  }

  const spacing = NODE_WIDTH + H_GAP;
  const trackSpacing = NODE_HEIGHT + V_GAP;

  const repositioned = sorted.map((node, index) => {
    const track = trackMap.get(node.id) ?? 0;
    if (orientation === 'horizontal') {
      return { ...node, x: index * spacing, y: track * trackSpacing };
    }
    return { ...node, x: track * spacing, y: index * trackSpacing };
  });

  return { nodes: repositioned, edges };
}

// ── Export SVG as PNG ────────────────────────────────────────────────────────

export async function exportSvgAsPng(svgElement: SVGSVGElement): Promise<void> {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;

  // Compute bounding box from the content
  const bbox = svgElement.getBBox();
  const padding = 20;
  const width = bbox.width + padding * 2;
  const height = bbox.height + padding * 2;

  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute(
    'viewBox',
    `${bbox.x - padding} ${bbox.y - padding} ${width} ${height}`,
  );

  // Inline computed styles for key elements
  const rects = clone.querySelectorAll('rect');
  for (const rect of rects) {
    const original = svgElement.querySelector(`rect[x="${rect.getAttribute('x')}"][y="${rect.getAttribute('y')}"]`);
    if (original) {
      const computed = window.getComputedStyle(original);
      if (!rect.getAttribute('fill') || rect.classList.length > 0) {
        rect.setAttribute('fill', computed.fill || '#1f2937');
      }
      if (!rect.getAttribute('stroke') || rect.classList.length > 0) {
        rect.setAttribute('stroke', computed.stroke || '#4b5563');
      }
    }
  }

  // Set a dark background
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('x', String(bbox.x - padding));
  bg.setAttribute('y', String(bbox.y - padding));
  bg.setAttribute('width', String(width));
  bg.setAttribute('height', String(height));
  bg.setAttribute('fill', '#0a0a0a');
  clone.insertBefore(bg, clone.firstChild);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.width = width * 2;
  img.height = height * 2;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * 2;
      canvas.height = height * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width * 2, height * 2);
      URL.revokeObjectURL(url);

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Could not export PNG'));
          return;
        }
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `version-graph-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
        resolve();
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG as image'));
    };
    img.src = url;
  });
}

// ── Composite helpers ─────────────────────────────────────────────────────────

const COMPOSITE_LAYER_ROW_HEIGHT = 24;

function getCompositeNodeHeight(layerCount: number): number {
  return NODE_HEIGHT + COMPOSITE_LAYER_ROW_HEIGHT * Math.max(layerCount - 1, 0);
}

export { NODE_WIDTH, NODE_HEIGHT, COMPOSITE_LAYER_ROW_HEIGHT, getCompositeNodeHeight };
