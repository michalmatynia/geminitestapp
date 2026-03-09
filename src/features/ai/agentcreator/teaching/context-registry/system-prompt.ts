import type {
  ContextNode,
  ContextRegistryResolutionBundle,
  ContextRuntimeDocument,
  ContextRuntimeDocumentSection,
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

export const buildAgentTeachingContextRegistrySystemPrompt = (
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
    'Context Registry bundle for the current Agent Creator teaching chat page.',
    'Use it for operator/page context such as the selected agent, recent conversation, and source panel state.',
    'Do not cite this registry bundle as knowledge-base evidence. Keep citations reserved for retrieved [doc:...] sources.',
    JSON.stringify(payload, null, 2),
  ].join('\n\n');
};
