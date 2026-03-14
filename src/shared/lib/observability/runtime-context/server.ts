import type {
  ContextNode,
  ContextRegistryConsumerEnvelope,
  ContextRegistryRef,
  ContextRegistryResolutionBundle,
  ContextRuntimeDocument,
  ContextRuntimeDocumentSection,
} from '@/shared/contracts/ai-context-registry';
import {
  buildContextRegistryConsumerEnvelope,
  mergeContextRegistryResolutionBundles,
} from '@/shared/lib/ai-context-registry/page-context-shared';

const summarizeNode = (node: ContextNode): Record<string, unknown> => ({
  id: node.id,
  kind: node.kind,
  name: node.name,
  description: node.description,
  tags: node.tags.slice(0, 6),
  relationships: (node.relationships ?? []).slice(0, 8).map((relationship) => ({
    type: relationship.type,
    targetId: relationship.targetId,
  })),
});

const summarizeSection = (section: ContextRuntimeDocumentSection): Record<string, unknown> => ({
  kind: section.kind,
  title: section.title,
  summary: section.summary ?? null,
  text: section.text,
  items: section.items?.slice(0, 10),
});

const summarizeDocument = (document: ContextRuntimeDocument): Record<string, unknown> => ({
  id: document.id,
  entityType: document.entityType,
  title: document.title,
  summary: document.summary,
  tags: document.tags.slice(0, 6),
  relatedNodeIds: document.relatedNodeIds.slice(0, 10),
  facts: document.facts ?? null,
  sections: (document.sections ?? []).slice(0, 5).map(summarizeSection),
});

/**
 * Builds a system prompt fragment from a Context Registry bundle for system logs.
 */
export const buildSystemLogsContextRegistrySystemPrompt = (
  registryBundle: ContextRegistryResolutionBundle | null | undefined
): string => {
  if (!registryBundle || (!registryBundle.nodes.length && !registryBundle.documents.length)) {
    return '';
  }

  const payload = {
    nodes: registryBundle.nodes.slice(0, 10).map(summarizeNode),
    documents: registryBundle.documents.slice(0, 3).map(summarizeDocument),
  };

  return [
    'Context Registry bundle for the current Observation Post workspace.',
    'Use it as authoritative UI context for the active system-log filters, visible event slice, and recent AI insight state.',
    'Treat this registry bundle as operator page state, not as independent production evidence.',
    JSON.stringify(payload, null, 2),
  ].join('\n\n');
};

type ContextRegistryResolveRefs = (args: {
  refs: ContextRegistryRef[];
  maxNodes?: number;
  depth?: number;
}) => Promise<ContextRegistryResolutionBundle>;

/**
 * Resolves observability context registry envelope by merging provided and runtime state.
 */
export const resolveObservabilityContextRegistryEnvelope = async (
  contextRegistry: ContextRegistryConsumerEnvelope | null | undefined,
  resolveRefs: ContextRegistryResolveRefs
): Promise<ContextRegistryConsumerEnvelope | null> => {
  if (!contextRegistry) {
    return null;
  }

  const resolvedRegistryBundle =
    contextRegistry.refs.length > 0
      ? await resolveRefs({
        refs: contextRegistry.refs,
        maxNodes: 24,
        depth: 1,
      })
      : null;

  return buildContextRegistryConsumerEnvelope({
    refs: contextRegistry.refs,
    resolved: mergeContextRegistryResolutionBundles(
      resolvedRegistryBundle,
      contextRegistry.resolved ?? null
    ),
  });
};
