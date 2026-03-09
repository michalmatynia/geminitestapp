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
  id: section.id ?? null,
  kind: section.kind,
  title: section.title,
  summary: section.summary ?? null,
  text: typeof section.text === 'string' ? section.text : undefined,
  items: section.items?.slice(0, 12),
});

const summarizeDocument = (document: ContextRuntimeDocument): Record<string, unknown> => ({
  id: document.id,
  entityType: document.entityType,
  title: document.title,
  summary: document.summary,
  status: document.status ?? null,
  tags: document.tags.slice(0, 6),
  relatedNodeIds: document.relatedNodeIds.slice(0, 12),
  facts: document.facts ?? null,
  sections: (document.sections ?? []).slice(0, 6).map(summarizeSection),
});

export const buildCmsContextRegistrySystemPrompt = (
  registryBundle: ContextRegistryResolutionBundle | null | undefined
): string => {
  if (!registryBundle || (!registryBundle.nodes.length && !registryBundle.documents.length)) {
    return '';
  }

  const payload = {
    nodes: registryBundle.nodes.slice(0, 12).map(summarizeNode),
    documents: registryBundle.documents.slice(0, 4).map(summarizeDocument),
  };

  return [
    'Context Registry bundle for the current CMS page-builder surface.',
    'Use this as authoritative page context when generating layouts, CSS, settings, or theme output.',
    JSON.stringify(payload, null, 2),
  ].join('\n\n');
};
