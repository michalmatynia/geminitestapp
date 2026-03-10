import type {
  ContextRegistryConsumerEnvelope,
  ContextRegistryRef,
  ContextRegistryResolutionBundle,
} from '@/shared/contracts/ai-context-registry';
import {
  buildContextRegistryConsumerEnvelope,
  mergeContextRegistryResolutionBundles,
} from '@/shared/lib/ai-context-registry/page-context-shared';

type ContextRegistryResolveRefs = (args: {
  refs: ContextRegistryRef[];
  maxNodes?: number;
  depth?: number;
}) => Promise<ContextRegistryResolutionBundle>;

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
