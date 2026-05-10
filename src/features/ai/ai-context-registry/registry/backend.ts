import type {
  ContextNode,
  ContextNodeKind,
  ContextRegistryBackend,
} from '@/shared/contracts/ai-context-registry';

export type { ContextRegistryBackend };

// ─── Normalization ────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const tokenize = (value: string): string[] =>
  normalize(value)
    .split(' ')
    .filter((token) => token !== '');

const nodeMatchesFilters = (
  node: ContextNode,
  filters: { kinds?: ContextNodeKind[]; tags?: string[] }
): boolean => {
  if (filters.kinds !== undefined && filters.kinds.length > 0 && !filters.kinds.includes(node.kind)) {
    return false;
  }
  if (filters.tags === undefined || filters.tags.length === 0) return true;

  const nodeTags = new Set(node.tags.map(normalize));
  return filters.tags.every((tag) => nodeTags.has(normalize(tag)));
};

const scoreNode = (node: ContextNode, tokens: string[]): number => {
  const hay = normalize(`${node.id} ${node.name} ${node.description} ${node.tags.join(' ')}`);
  return tokens.filter((token) => hay.includes(token)).length;
};

// ─── CodeFirstRegistryBackend ─────────────────────────────────────────────────

export class CodeFirstRegistryBackend implements ContextRegistryBackend {
  private readonly byId = new Map<string, ContextNode>();
  private readonly inverted = new Map<string, Set<string>>();
  private readonly snapshotVersion: string;

  constructor(nodes: ContextNode[]) {
    for (const n of nodes) this.byId.set(n.id, n);
    this.buildIndex(nodes);
    this.snapshotVersion = `codefirst:${nodes.length}`;
  }

  getByIds(ids: string[]): ContextNode[] {
    return ids.map((id) => this.byId.get(id)).filter((n): n is ContextNode => n !== undefined);
  }

  listAll(): ContextNode[] {
    return Array.from(this.byId.values());
  }

  getVersion(): string {
    return this.snapshotVersion;
  }

  search(params: {
    query?: string;
    kinds?: ContextNodeKind[];
    tags?: string[];
    limit: number;
  }): ContextNode[] {
    const { query, kinds, tags: filterTags, limit } = params;

    if (query === undefined || query === '') return this.searchWithoutQuery(params);

    const tokens = tokenize(query);
    return this.searchCandidates(tokens, { kinds, tags: filterTags, limit });
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private collectCandidateIds(tokens: string[]): Set<string> {
    const candidates = new Set<string>();

    for (const t of tokens) {
      const hit = this.inverted.get(t);
      if (hit) for (const id of hit) candidates.add(id);
    }

    return candidates;
  }

  private searchCandidates(
    tokens: string[],
    params: {
      kinds?: ContextNodeKind[];
      tags?: string[];
      limit: number;
    }
  ): ContextNode[] {
    const scored: Array<{ node: ContextNode; score: number }> = [];
    for (const id of this.collectCandidateIds(tokens)) {
      const node = this.byId.get(id);
      if (node === undefined || !nodeMatchesFilters(node, params)) continue;
      scored.push({ node, score: scoreNode(node, tokens) });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, params.limit).map((x) => x.node);
  }

  private searchWithoutQuery(params: {
    kinds?: ContextNodeKind[];
    tags?: string[];
    limit: number;
  }): ContextNode[] {
    const results: ContextNode[] = [];
    for (const node of this.byId.values()) {
      if (!nodeMatchesFilters(node, { kinds: params.kinds, tags: params.tags })) continue;
      results.push(node);
      if (results.length >= params.limit) break;
    }
    return results;
  }

  private buildIndex(nodes: ContextNode[]): void {
    for (const n of nodes) {
      const hay = normalize(`${n.id} ${n.name} ${n.description} ${n.tags.join(' ')}`);
      for (const token of new Set(tokenize(hay))) {
        const indexedIds = this.inverted.get(token) ?? new Set<string>();
        indexedIds.add(n.id);
        this.inverted.set(token, indexedIds);
      }
    }
  }
}
