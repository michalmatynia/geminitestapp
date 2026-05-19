/**
 * AI Insights Context Registry - Server Entry Point
 *
 * This module serves as the server-only entry point for AI insights context registry integration.
 * It exports utilities for building and resolving context registry envelopes for insights generation.
 *
 * Boundary Warning: This module must only be imported into server-side code.
 *
 * Exported members:
 * - resolveAiInsightsContextRegistryEnvelope: Resolve context registry references for insights
 *
 * Example usage:
 * import { resolveAiInsightsContextRegistryEnvelope } from '@/features/ai/insights/context-registry/server';
 */

import {
  buildContextRegistryConsumerEnvelope,
  mergeContextRegistryResolutionBundles,
} from '@/features/ai/ai-context-registry/context/page-context-shared';
import { contextRegistryEngine } from '@/features/ai/ai-context-registry/server';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';

export const resolveAiInsightsContextRegistryEnvelope = async (
  contextRegistry: ContextRegistryConsumerEnvelope | null | undefined
): Promise<ContextRegistryConsumerEnvelope | null> => {
  if (!contextRegistry) {
    return null;
  }

  const resolvedRegistryBundle =
    contextRegistry.refs.length > 0
      ? await contextRegistryEngine.resolveRefs({
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
