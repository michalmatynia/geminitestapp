import 'server-only';

import type {
  ContextNode,
  ContextRegistryRef,
  ContextRegistryResolutionBundle,
  ContextRuntimeDocument,
  ContextRegistryBackend,
} from '@/shared/contracts/ai-context-registry';

import type { ContextRetrievalService } from './retrieval';
import type { RuntimeContextProvider } from './runtime-provider';

const dedupeRefs = (refs: ContextRegistryRef[]): ContextRegistryRef[] => {
  const seen = new Set<string>();
  const unique: ContextRegistryRef[] = [];

  for (const ref of refs) {
    if (!ref.id || seen.has(ref.id)) continue;
    seen.add(ref.id);
    unique.push(ref);
  }

  return unique;
};

const dedupeDocuments = (documents: ContextRuntimeDocument[]): ContextRuntimeDocument[] => {
  const seen = new Set<string>();
  const unique: ContextRuntimeDocument[] = [];

  for (const document of documents) {
    if (!document.id || seen.has(document.id)) continue;
    seen.add(document.id);
    unique.push(document);
  }

  return unique;
};

const dedupeNodes = (nodes: ContextNode[]): ContextNode[] => {
  const seen = new Set<string>();
  const unique: ContextNode[] = [];

  for (const node of nodes) {
    if (!node.id || seen.has(node.id)) continue;
    seen.add(node.id);
    unique.push(node);
  }

  return unique;
};

export class ContextRegistryEngine {
  private readonly runtimeProviders: RuntimeContextProvider[];

  constructor(
    private readonly backend: ContextRegistryBackend,
    private readonly retrievalService: ContextRetrievalService,
    initialProviders: readonly RuntimeContextProvider[] = []
  ) {
    this.runtimeProviders = [...initialProviders];
  }

  registerProvider(provider: RuntimeContextProvider): void {
    if (!this.runtimeProviders.find((p) => p.id === provider.id)) {
      this.runtimeProviders.push(provider);
    }
  }

  getVersion(): string {
    const providerVersions = this.runtimeProviders
      .map((provider) => `${provider.id}@${provider.getVersion()}`)
      .join(',');

    return `registry:${this.backend.getVersion()}|providers:${providerVersions || 'none'}`;
  }

  inferRefs(input: Record<string, unknown> | null | undefined): ContextRegistryRef[] {
    if (!input) return [];

    const inferred = this.runtimeProviders.flatMap((provider) => {
      if (!provider.canInferRefs(input)) return [];
      return provider.inferRefs(input);
    });

    return dedupeRefs(inferred);
  }

  async resolveRefs(input: {
    refs: ContextRegistryRef[];
    maxNodes?: number;
    depth?: number;
  }): Promise<ContextRegistryResolutionBundle> {
    const refs = dedupeRefs(input.refs);
    const runtimeRefs = refs.filter((ref) => ref.kind === 'runtime_document');
    const staticNodeIds = refs.filter((ref) => ref.kind === 'static_node').map((ref) => ref.id);

    const documents = dedupeDocuments(
      (
        await Promise.all(
          this.runtimeProviders.map(async (provider) => {
            const providerRefs = runtimeRefs.filter((ref) => provider.canResolveRef(ref));
            if (providerRefs.length === 0) return [];
            return await provider.resolveRefs(providerRefs);
          })
        )
      ).flat()
    );

    const nodeIds = new Set<string>(staticNodeIds);
    for (const document of documents) {
      for (const nodeId of document.relatedNodeIds ?? []) {
        nodeIds.add(nodeId);
      }
    }

    let nodes: ContextNode[] = [];
    let truncated = false;

    if (nodeIds.size > 0) {
      const resolved = this.retrievalService.resolveWithExpansion({
        ids: [...nodeIds],
        depth: input.depth ?? 1,
        maxNodes: input.maxNodes ?? 24,
      });
      nodes = dedupeNodes(resolved.nodes);
      truncated = resolved.truncated;
    }

    return {
      refs,
      nodes,
      documents,
      truncated,
      engineVersion: this.getVersion(),
    };
  }
}
