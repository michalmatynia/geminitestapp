import {
  contextRegistryConsumerEnvelopeSchema,
  type ContextNode,
  type ContextRegistryConsumerEnvelope,
  type ContextRegistryResolutionBundle,
  type ContextRuntimeDocument,
  type ContextRuntimeDocumentSection,
} from '@/shared/contracts/ai-context-registry';

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
  items: section.items?.slice(0, 8),
});

const summarizeDocument = (document: ContextRuntimeDocument): Record<string, unknown> => ({
  id: document.id,
  entityType: document.entityType,
  title: document.title,
  summary: document.summary,
  status: document.status ?? null,
  tags: document.tags.slice(0, 6),
  relatedNodeIds: document.relatedNodeIds.slice(0, 10),
  facts: document.facts ?? null,
  sections: (document.sections ?? []).slice(0, 5).map(summarizeSection),
});

export const readAgentRuntimeContextRegistry = (
  planState: unknown
): ContextRegistryConsumerEnvelope | null => {
  if (!planState || typeof planState !== 'object' || Array.isArray(planState)) {
    return null;
  }
  const parsed = contextRegistryConsumerEnvelopeSchema.safeParse(
    (planState as Record<string, unknown>)['contextRegistry']
  );
  return parsed.success ? parsed.data : null;
};

export const buildAgentRuntimeContextRegistryPrompt = (
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
    'Context Registry bundle for the current page session.',
    'Use it as authoritative UI context when planning, validating, and selecting actions.',
    'Treat this registry bundle as live page state, not as external retrieved knowledge.',
    JSON.stringify(payload, null, 2),
  ].join('\n\n');
};

export const applyAgentRuntimeContextMemory = (
  memoryContext: string[],
  contextRegistryPrompt: string | null | undefined,
  maxItems: number = 10
): string[] => {
  const normalizedEntries = memoryContext
    .map((entry: string): string => entry.trim())
    .filter((entry: string): boolean => entry.length > 0);
  const prompt = contextRegistryPrompt?.trim();

  if (!prompt) {
    return normalizedEntries.slice(-maxItems);
  }

  const withoutPrompt = normalizedEntries.filter((entry: string): boolean => entry !== prompt);
  const budget = Math.max(0, maxItems - 1);
  return [...withoutPrompt.slice(-budget), prompt];
};
