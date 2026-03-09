import type {
  ContextNode,
  ContextRegistryConsumerEnvelope,
  ContextRegistryRef,
  ContextRegistryResolutionBundle,
  ContextRuntimeDocument,
} from '@/shared/contracts/ai-context-registry';

export const PAGE_CONTEXT_ENGINE_VERSION = 'page-context:v1';

export type ContextRegistryPageSource = {
  sourceId: string;
  label?: string;
  refs?: ContextRegistryRef[];
  rootNodeIds?: string[];
  resolved?: ContextRegistryResolutionBundle | null;
};

export type BuildContextRegistryConsumerEnvelopeInput = {
  rootNodeIds?: string[];
  refs?: ContextRegistryRef[];
  resolved?: ContextRegistryResolutionBundle | null;
};

const dedupeStrings = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const unique: string[] = [];

  values.forEach((value) => {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      return;
    }
    seen.add(trimmed);
    unique.push(trimmed);
  });

  return unique;
};

export const createStaticContextRegistryRef = (id: string): ContextRegistryRef => ({
  id,
  kind: 'static_node',
});

export const mergeContextRegistryRefs = (
  ...groups: ReadonlyArray<readonly ContextRegistryRef[] | null | undefined>
): ContextRegistryRef[] => {
  const mergedByKey = new Map<string, ContextRegistryRef>();

  groups.forEach((group) => {
    group?.forEach((ref) => {
      if (!ref?.id?.trim()) {
        return;
      }

      const normalized: ContextRegistryRef = {
        id: ref.id.trim(),
        kind: ref.kind,
        ...(typeof ref.providerId === 'string' && ref.providerId.trim()
          ? { providerId: ref.providerId.trim() }
          : {}),
        ...(typeof ref.entityType === 'string' && ref.entityType.trim()
          ? { entityType: ref.entityType.trim() }
          : {}),
      };

      const key = `${normalized.kind}:${normalized.id}`;
      const existing = mergedByKey.get(key);
      if (!existing) {
        mergedByKey.set(key, normalized);
        return;
      }

      mergedByKey.set(key, {
        ...existing,
        ...normalized,
        providerId: normalized.providerId ?? existing.providerId,
        entityType: normalized.entityType ?? existing.entityType,
      });
    });
  });

  return [...mergedByKey.values()];
};

const mergeById = <T extends { id: string }>(items: readonly T[][]): T[] => {
  const merged = new Map<string, T>();

  items.forEach((group) => {
    group.forEach((item) => {
      if (!item.id.trim()) {
        return;
      }
      merged.set(item.id, item);
    });
  });

  return [...merged.values()];
};

export const mergeContextRegistryResolutionBundles = (
  ...bundles: ReadonlyArray<ContextRegistryResolutionBundle | null | undefined>
): ContextRegistryResolutionBundle | null => {
  const definedBundles = bundles.filter(
    (bundle): bundle is ContextRegistryResolutionBundle => Boolean(bundle)
  );

  if (definedBundles.length === 0) {
    return null;
  }

  const refs = mergeContextRegistryRefs(...definedBundles.map((bundle) => bundle.refs));
  const nodes = mergeById<ContextNode>(definedBundles.map((bundle) => bundle.nodes));
  const documents = mergeById<ContextRuntimeDocument>(definedBundles.map((bundle) => bundle.documents));
  const engineVersion =
    definedBundles[definedBundles.length - 1]?.engineVersion ?? PAGE_CONTEXT_ENGINE_VERSION;

  return {
    refs,
    nodes,
    documents,
    truncated: definedBundles.some((bundle) => bundle.truncated),
    engineVersion,
  };
};

export const buildContextRegistryConsumerEnvelope = (
  input: BuildContextRegistryConsumerEnvelopeInput
): ContextRegistryConsumerEnvelope | null => {
  const rootNodeIds = dedupeStrings(input.rootNodeIds ?? []);
  const staticRefs = rootNodeIds.map((id) => createStaticContextRegistryRef(id));
  const resolved = input.resolved ? mergeContextRegistryResolutionBundles(input.resolved) : null;
  const refs = mergeContextRegistryRefs(staticRefs, input.refs, resolved?.refs);

  if (refs.length === 0) {
    return null;
  }

  return {
    refs,
    engineVersion: resolved?.engineVersion ?? PAGE_CONTEXT_ENGINE_VERSION,
    ...(resolved
      ? {
        resolved: {
          ...resolved,
          refs,
        },
      }
      : {}),
  };
};
