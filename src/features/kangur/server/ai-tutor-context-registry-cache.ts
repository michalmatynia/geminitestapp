import 'server-only';

import type { ContextRegistryRef, ContextRegistryResolutionBundle } from '@/shared/contracts/ai-context-registry';
import { contextRegistryEngine } from '@/features/ai/ai-context-registry/server';

// ---------------------------------------------------------------------------
// In-process TTL cache for context registry bundle resolution.
//
// Resolving a bundle requires DB reads + graph traversal for every message.
// Static nodes (pages, collections, policies) are immutable between deploys,
// and runtime documents (learner snapshots) update at most once per minute.
// A 60-second TTL eliminates redundant resolutions in multi-turn conversations
// while keeping data fresh enough for limit-enforcement and SLO contexts.
//
// Cache is keyed by sorted refs string + maxNodes + depth so different ref
// sets never collide. A small entry cap prevents unbounded growth on warm
// servers with many concurrent learners.
// ---------------------------------------------------------------------------

const BUNDLE_CACHE_TTL_MS = 60_000;
const BUNDLE_CACHE_MAX_ENTRIES = 64;

type BundleCacheEntry = {
  bundle: ContextRegistryResolutionBundle;
  cachedAt: number;
};

const bundleCache = new Map<string, BundleCacheEntry>();

const buildBundleCacheKey = (
  refs: ContextRegistryRef[],
  maxNodes: number,
  depth: number
): string => {
  const sortedRefs = [...refs]
    .map((ref) => `${ref.kind}:${ref.id}`)
    .sort()
    .join(',');
  return `${sortedRefs}|maxNodes=${maxNodes}|depth=${depth}`;
};

const evictStalestEntry = (): void => {
  const oldestKey = bundleCache.keys().next().value;
  if (oldestKey !== undefined) {
    bundleCache.delete(oldestKey);
  }
};

/** Exposed only for test isolation — do not call in production code. */
export const __resetContextRegistryBundleCacheForTests = (): void => {
  bundleCache.clear();
};

export const resolveKangurAiTutorContextRegistryBundle = async (input: {
  refs: ContextRegistryRef[];
  maxNodes?: number;
  depth?: number;
}): Promise<ContextRegistryResolutionBundle> => {
  const maxNodes = input.maxNodes ?? 24;
  const depth = input.depth ?? 1;
  const cacheKey = buildBundleCacheKey(input.refs, maxNodes, depth);

  const now = Date.now();
  const cached = bundleCache.get(cacheKey);
  if (cached && now - cached.cachedAt < BUNDLE_CACHE_TTL_MS) {
    return cached.bundle;
  }

  const bundle = await contextRegistryEngine.resolveRefs({
    refs: input.refs,
    maxNodes,
    depth,
  });

  if (bundleCache.size >= BUNDLE_CACHE_MAX_ENTRIES) {
    evictStalestEntry();
  }
  bundleCache.set(cacheKey, { bundle, cachedAt: now });

  return bundle;
};
