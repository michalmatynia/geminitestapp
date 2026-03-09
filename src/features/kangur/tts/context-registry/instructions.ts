import type {
  ContextRegistryConsumerEnvelope,
  ContextNode,
  ContextRegistryResolutionBundle,
} from '@/shared/contracts/ai-context-registry';

const SURFACE_NODE_KINDS = new Set<ContextNode['kind']>(['page', 'component', 'action']);

const isRelevantSurfaceNode = (node: ContextNode): boolean =>
  SURFACE_NODE_KINDS.has(node.kind) &&
  (node.id.startsWith('page:kangur') ||
    node.id.startsWith('component:kangur') ||
    node.id.startsWith('action:kangur'));

const collectNodeNames = (
  bundle: ContextRegistryResolutionBundle,
  kind: ContextNode['kind'],
  limit: number
): string[] =>
  bundle.nodes
    .filter((node) => node.kind === kind && isRelevantSurfaceNode(node))
    .map((node) => node.name)
    .slice(0, limit);

export const buildKangurLessonTtsContextSignature = (
  bundle: ContextRegistryResolutionBundle | null | undefined
): string | null => {
  if (!bundle) {
    return null;
  }

  const surfaceIds = bundle.nodes
    .filter(isRelevantSurfaceNode)
    .map((node) => node.id)
    .sort();
  const entityTypes = bundle.documents
    .map((document) => document.entityType.trim())
    .filter(Boolean)
    .sort();

  const signature = [...surfaceIds, ...entityTypes].join('|');
  return signature || null;
};

export const buildKangurLessonTtsEnvelopeSignature = (
  envelope: ContextRegistryConsumerEnvelope | null | undefined
): string | null => {
  if (!envelope) {
    return null;
  }

  const resolvedSignature = buildKangurLessonTtsContextSignature(envelope.resolved);
  if (resolvedSignature) {
    return resolvedSignature;
  }

  const surfaceIds = envelope.refs
    .filter((ref) =>
      ref.id.startsWith('page:kangur') ||
      ref.id.startsWith('component:kangur') ||
      ref.id.startsWith('action:kangur')
    )
    .map((ref) => ref.id)
    .sort();
  const runtimeEntityTypes = envelope.refs
    .map((ref) => ref.entityType?.trim() ?? '')
    .filter(Boolean)
    .sort();
  const signature = [...surfaceIds, ...runtimeEntityTypes].join('|');

  return signature || null;
};

export const buildKangurLessonTtsContextInstructions = (
  bundle: ContextRegistryResolutionBundle | null | undefined
): string => {
  if (!bundle) {
    return '';
  }

  const pageNames = collectNodeNames(bundle, 'page', 2);
  const componentNames = collectNodeNames(bundle, 'component', 3);
  const actionNames = collectNodeNames(bundle, 'action', 2);
  const entityTypes = bundle.documents
    .map((document) => document.entityType.trim())
    .filter(Boolean)
    .slice(0, 3);
  const details: string[] = [];

  if (pageNames.length > 0) {
    details.push(`Current Kangur surface: ${pageNames.join(', ')}.`);
  }
  if (componentNames.length > 0) {
    details.push(`Active narration UI: ${componentNames.join(', ')}.`);
  }
  if (actionNames.length > 0) {
    details.push(`Invocation path: ${actionNames.join(', ')}.`);
  }
  if (entityTypes.length > 0) {
    details.push(`Runtime context types: ${entityTypes.join(', ')}.`);
  }

  if (details.length === 0) {
    return '';
  }

  details.push(
    'Use this only to shape tone and pacing for the active Kangur surface. Do not add, remove, paraphrase, or translate any input words.'
  );

  return details.join(' ');
};
