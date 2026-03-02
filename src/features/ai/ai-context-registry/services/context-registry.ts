import 'server-only';

import type {
  ContextNode,
  ContextSearchRequest,
  ContextSearchResponse,
  ContextResolveResponse,
  ContextRelatedResponse,
} from '@/shared/contracts/ai-context-registry';

// ─── In-memory store ──────────────────────────────────────────────────────────
// Module-level singleton — persists across requests within the same worker process.

const registry = new Map<string, ContextNode>();

// ─── Registration ─────────────────────────────────────────────────────────────

export function registerNode(node: ContextNode): void {
  registry.set(node.id, node);
}

export function registerNodes(nodes: ContextNode[]): void {
  for (const node of nodes) {
    registry.set(node.id, node);
  }
}

// ─── Search ───────────────────────────────────────────────────────────────────
// All filters are AND-combined.
// - query: case-insensitive substring match against name, description, and tags
// - tags: node must include ALL requested tags
// - kind: exact match

export function searchNodes(request: ContextSearchRequest): ContextSearchResponse {
  const { query, tags: filterTags, kind: filterKind, limit = 20 } = request;
  const normalizedQuery = query?.trim().toLowerCase();

  const results: ContextNode[] = [];

  for (const node of registry.values()) {
    if (filterKind && node.kind !== filterKind) continue;

    if (filterTags && filterTags.length > 0) {
      const nodeTags = new Set(node.tags);
      if (!filterTags.every((t) => nodeTags.has(t))) continue;
    }

    if (normalizedQuery) {
      const searchableText = [
        node.name.toLowerCase(),
        node.description.toLowerCase(),
        ...node.tags.map((t) => t.toLowerCase()),
      ].join(' ');
      if (!searchableText.includes(normalizedQuery)) continue;
    }

    results.push(node);
    if (results.length >= limit) break;
  }

  return { nodes: results, total: results.length };
}

// ─── Resolve ──────────────────────────────────────────────────────────────────

export function resolveNodes(ids: string[]): ContextResolveResponse {
  const nodes: ContextNode[] = [];
  const missing: string[] = [];

  for (const id of ids) {
    const node = registry.get(id);
    if (node) {
      nodes.push(node);
    } else {
      missing.push(id);
    }
  }

  return { nodes, missing };
}

// ─── Related ──────────────────────────────────────────────────────────────────
// Returns forward-referenced nodes (via relatedIds) plus reverse-referenced
// nodes (nodes that list this id in their own relatedIds).

export function getRelatedNodes(id: string): ContextRelatedResponse {
  const sourceNode = registry.get(id);
  const relatedSet = new Set<string>();

  if (sourceNode?.relatedIds) {
    for (const relId of sourceNode.relatedIds) {
      if (relId !== id) relatedSet.add(relId);
    }
  }

  for (const [nodeId, node] of registry.entries()) {
    if (nodeId !== id && node.relatedIds?.includes(id)) {
      relatedSet.add(nodeId);
    }
  }

  const nodes: ContextNode[] = [];
  for (const relId of relatedSet) {
    const node = registry.get(relId);
    if (node) nodes.push(node);
  }

  return { sourceId: id, nodes };
}

// ─── Schema lookup ────────────────────────────────────────────────────────────
// Finds a node whose id ends with `:${entity}` (case-insensitive) and returns
// its schema field, or null if not found or no schema defined.

export function getEntitySchema(entity: string): Record<string, unknown> | null {
  const normalized = entity.toLowerCase();

  for (const node of registry.values()) {
    if (
      node.id.endsWith(`:${normalized}`) ||
      node.name.toLowerCase() === normalized
    ) {
      return node.schema ?? null;
    }
  }

  return null;
}

// ─── Utility ─────────────────────────────────────────────────────────────────

export function getAllNodes(): ContextNode[] {
  return Array.from(registry.values());
}

export function getNodeById(id: string): ContextNode | undefined {
  return registry.get(id);
}

/** Only for use in tests — clears the registry between test runs. */
export const __testOnly = {
  clearRegistry(): void {
    registry.clear();
  },
  getRegistry(): Map<string, ContextNode> {
    return registry;
  },
};
