import 'server-only';

import type { ContextNode } from '@/shared/contracts/ai-context-registry';
import type { ContextRegistryBackend } from '../registry/backend';

// ─── Result types ─────────────────────────────────────────────────────────────

export interface ResolveResult {
  nodes: ContextNode[];
  truncated: boolean;
  visitedIds: string[];
}

export interface RelatedResult {
  sourceId: string;
  nodes: ContextNode[];
}

// ─── ContextRetrievalService ──────────────────────────────────────────────────

export class ContextRetrievalService {
  constructor(private readonly backend: ContextRegistryBackend) {}

  /**
   * BFS graph expansion from root ids.
   * - depth=0: only the root nodes themselves
   * - depth=1 (default): root + their direct relationship targets
   * - maxNodes: hard cap; returns truncated=true if hit
   * - includeSchemas/includeExamples: opt-in field inclusion
   */
  resolveWithExpansion({
    ids,
    depth = 1,
    maxNodes = 80,
    includeSchemas = false,
    includeExamples = false,
  }: {
    ids: string[];
    depth?: number;
    maxNodes?: number;
    includeSchemas?: boolean;
    includeExamples?: boolean;
  }): ResolveResult {
    const visited = new Set<string>();
    const out: ContextNode[] = [];
    let frontier = ids;

    for (let d = 0; d <= depth; d++) {
      const batch = frontier.filter((id) => !visited.has(id));
      if (batch.length === 0) break;

      const nodes = this.backend.getByIds(batch);

      for (const node of nodes) {
        visited.add(node.id);
        out.push(this.stripNode(node, includeSchemas, includeExamples));
        if (out.length >= maxNodes) {
          return { nodes: out, truncated: true, visitedIds: [...visited] };
        }
      }

      // Mark ids that resolved to nothing as visited (avoid infinite retry).
      for (const id of batch) visited.add(id);

      frontier = nodes.flatMap((n) => n.relationships?.map((r) => r.targetId) ?? []);
    }

    return { nodes: out, truncated: false, visitedIds: [...visited] };
  }

  /**
   * Returns forward-referenced nodes (via relationships[].targetId) and
   * reverse-referenced nodes (nodes that list this id in their relationships).
   * The source node itself is excluded from results.
   */
  getRelatedNodes(id: string): RelatedResult {
    const [sourceNode] = this.backend.getByIds([id]);
    const relatedSet = new Set<string>();

    // Forward references
    if (sourceNode?.relationships) {
      for (const rel of sourceNode.relationships) {
        if (rel.targetId !== id) relatedSet.add(rel.targetId);
      }
    }

    // Reverse references
    for (const node of this.backend.listAll()) {
      if (node.id !== id && node.relationships?.some((r) => r.targetId === id)) {
        relatedSet.add(node.id);
      }
    }

    const nodes = this.backend.getByIds([...relatedSet]);
    return { sourceId: id, nodes };
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private stripNode(
    n: ContextNode,
    includeSchemas: boolean,
    includeExamples: boolean
  ): ContextNode {
    return {
      ...n,
      jsonSchema2020: includeSchemas ? n.jsonSchema2020 : undefined,
      examples: includeExamples ? n.examples : undefined,
    };
  }
}
