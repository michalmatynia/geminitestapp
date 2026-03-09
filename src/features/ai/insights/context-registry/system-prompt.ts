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

const buildAiInsightsContextRegistryPrompt = (
  registryBundle: ContextRegistryResolutionBundle | null | undefined,
  input: {
    heading: string;
    instruction: string;
  }
): string => {
  if (!registryBundle || (!registryBundle.nodes.length && !registryBundle.documents.length)) {
    return '';
  }

  const payload = {
    nodes: registryBundle.nodes.slice(0, 10).map(summarizeNode),
    documents: registryBundle.documents.slice(0, 3).map(summarizeDocument),
  };

  return [
    input.heading,
    input.instruction,
    'Treat this registry bundle as current operator UI state, not as an external source of truth.',
    JSON.stringify(payload, null, 2),
  ].join('\n\n');
};

export const buildAnalyticsInsightContextRegistrySystemPrompt = (
  registryBundle: ContextRegistryResolutionBundle | null | undefined
): string =>
  buildAiInsightsContextRegistryPrompt(registryBundle, {
    heading: 'Context Registry bundle for the current analytics insight trigger surface.',
    instruction:
      'Use it as authoritative UI context for the active analytics range, scope, visible summary cards, recent events, and related insight state.',
  });

export const buildRuntimeAnalyticsInsightContextRegistrySystemPrompt = (
  registryBundle: ContextRegistryResolutionBundle | null | undefined
): string =>
  buildAiInsightsContextRegistryPrompt(registryBundle, {
    heading: 'Context Registry bundle for the current runtime analytics insight trigger surface.',
    instruction:
      'Use it as authoritative UI context for the current runtime analytics dashboard state, visible reports, and any AI insight panels that triggered this run.',
  });
