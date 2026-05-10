import 'server-only';

import type {
  ContextNode,
  ResolveResult,
  RelatedResult,
  ContextRegistryBackend,
} from '@/shared/contracts/ai-context-registry';

export type { ResolveResult, RelatedResult };

type ExpansionOptions = {
  ids: string[];
  depth?: number;
  maxNodes?: number;
  includeSchemas?: boolean;
  includeExamples?: boolean;
};

type NormalizedExpansionOptions = Required<ExpansionOptions>;

// ─── ContextRetrievalService ──────────────────────────────────────────────────

export class ContextRetrievalService {
  constructor(private readonly backend: ContextRegistryBackend) {}

  private normalizeExpansionOptions(options: ExpansionOptions): NormalizedExpansionOptions {
    return {
      ids: options.ids,
      depth: options.depth ?? 1,
      maxNodes: options.maxNodes ?? 80,
      includeSchemas: options.includeSchemas ?? false,
      includeExamples: options.includeExamples ?? false,
    };
  }

  private appendResolvedNodes(
    nodes: ContextNode[],
    output: ContextNode[],
    visited: Set<string>,
    options: NormalizedExpansionOptions
  ): ResolveResult | null {
    for (const node of nodes) {
      visited.add(node.id);
      output.push(this.stripNode(node, options.includeSchemas, options.includeExamples));
      if (output.length >= options.maxNodes) {
        return { nodes: output, truncated: true, visitedIds: [...visited] };
      }
    }
    return null;
  }

  private addForwardReferences(sourceNode: ContextNode | undefined, relatedSet: Set<string>): void {
    if (sourceNode?.relationships === undefined) return;

    for (const rel of sourceNode.relationships) {
      if (rel.targetId !== sourceNode.id) relatedSet.add(rel.targetId);
    }
  }

  private addReverseReferences(id: string, relatedSet: Set<string>): void {
    for (const node of this.backend.listAll()) {
      const hasReverseReference =
        node.relationships?.some((relationship) => relationship.targetId === id) === true;
      if (node.id !== id && hasReverseReference) {
        relatedSet.add(node.id);
      }
    }
  }

  /**
   * BFS graph expansion from root ids.
   * - depth=0: only the root nodes themselves
   * - depth=1 (default): root + their direct relationship targets
   * - maxNodes: hard cap; returns truncated=true if hit
   * - includeSchemas/includeExamples: opt-in field inclusion
   */
  resolveWithExpansion(optionsInput: ExpansionOptions): ResolveResult {
    const options = this.normalizeExpansionOptions(optionsInput);
    const visited = new Set<string>();
    const out: ContextNode[] = [];
    let frontier = options.ids;

    for (let d = 0; d <= options.depth; d++) {
      const batch = frontier.filter((id) => !visited.has(id));
      if (batch.length === 0) break;

      const nodes = this.backend.getByIds(batch);
      const cappedResult = this.appendResolvedNodes(nodes, out, visited, options);
      if (cappedResult !== null) return cappedResult;

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

    this.addForwardReferences(sourceNode, relatedSet);
    this.addReverseReferences(id, relatedSet);

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
