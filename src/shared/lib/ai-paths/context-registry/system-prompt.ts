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

export const buildAiPathsContextRegistrySystemPrompt = (
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
    'Context Registry bundle for the current AI Paths workspace.',
    'Use it as authoritative authoring context for the active path, selected node, runtime outputs, and recent execution events.',
    'Treat this registry bundle as live UI state, not as external retrieved knowledge.',
    JSON.stringify(payload, null, 2),
  ].join('\n\n');
};
