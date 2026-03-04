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

    if (!query) {
      // No text query: iterate all nodes, apply kind/tag filters, stop at limit.
      const results: ContextNode[] = [];
      for (const node of this.byId.values()) {
        if (kinds && kinds.length > 0 && !kinds.includes(node.kind)) continue;
        if (filterTags && filterTags.length > 0) {
          const nodeTags = new Set(node.tags.map(normalize));
          if (!filterTags.every((t) => nodeTags.has(normalize(t)))) continue;
        }
        results.push(node);
        if (results.length >= limit) break;
      }
      return results;
    }

    const q = normalize(query);
    const tokens = q.split(' ').filter(Boolean);

    // Build candidate set from inverted index.
    const candidates = new Set<string>();
    for (const t of tokens) {
      const hit = this.inverted.get(t);
      if (hit) for (const id of hit) candidates.add(id);
    }

    // Score candidates by token hit count, apply kind/tag filters.
    const scored: Array<{ node: ContextNode; score: number }> = [];
    for (const id of candidates) {
      const node = this.byId.get(id);
      if (!node) continue;
      if (kinds && kinds.length > 0 && !kinds.includes(node.kind)) continue;
      if (filterTags && filterTags.length > 0) {
        const nodeTags = new Set(node.tags.map(normalize));
        if (!filterTags.every((t) => nodeTags.has(normalize(t)))) continue;
      }
      const hay = normalize(`${node.id} ${node.name} ${node.description} ${node.tags.join(' ')}`);
      let score = 0;
      for (const t of tokens) if (hay.includes(t)) score++;
      scored.push({ node, score });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((x) => x.node);
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private buildIndex(nodes: ContextNode[]): void {
    for (const n of nodes) {
      const hay = normalize(`${n.id} ${n.name} ${n.description} ${n.tags.join(' ')}`);
      for (const token of new Set(hay.split(' ').filter(Boolean))) {
        if (!this.inverted.has(token)) this.inverted.set(token, new Set());
        this.inverted.get(token)!.add(n.id);
      }
    }
  }
}
