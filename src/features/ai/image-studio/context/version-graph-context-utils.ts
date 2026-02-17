import { readMeta } from '../utils/metadata';

import type { VersionGraphFilterType } from './version-graph-context-types';
import type { VersionNode } from '../utils/version-graph';


export const VERSION_GRAPH_IMAGE_PRELOAD_LIMIT = 120;

const versionGraphImagePreloadStatus = new Map<string, 'loading' | 'loaded' | 'error'>();

export const preloadVersionGraphImage = (src: string): void => {
  const normalizedSrc = src.trim();
  if (!normalizedSrc) return;
  if (normalizedSrc.startsWith('data:') || normalizedSrc.startsWith('blob:')) {
    versionGraphImagePreloadStatus.set(normalizedSrc, 'loaded');
    return;
  }

  const status = versionGraphImagePreloadStatus.get(normalizedSrc);
  if (status === 'loading' || status === 'loaded') return;

  versionGraphImagePreloadStatus.set(normalizedSrc, 'loading');
  const image = new Image();
  image.loading = 'eager';
  image.decoding = 'async';
  image.onload = (): void => {
    versionGraphImagePreloadStatus.set(normalizedSrc, 'loaded');
  };
  image.onerror = (): void => {
    versionGraphImagePreloadStatus.set(normalizedSrc, 'error');
  };
  image.src = normalizedSrc;
};

export const collectHiddenIds = (
  collapsedIds: Set<string>,
  allNodes: VersionNode[],
): Set<string> => {
  const nodeById = new Map(allNodes.map((n) => [n.id, n]));
  const hidden = new Set<string>();

  const walkDown = (nodeId: string): void => {
    const node = nodeById.get(nodeId);
    if (!node) return;
    for (const childId of node.childIds) {
      if (hidden.has(childId)) continue;
      hidden.add(childId);
      walkDown(childId);
    }
  };

  for (const cid of collapsedIds) {
    walkDown(cid);
  }

  return hidden;
};

export const matchesFilter = (
  node: VersionNode,
  query: string,
  types: Set<VersionGraphFilterType>,
  hasMask: boolean | null,
): boolean => {
  if (types.size > 0 && !types.has(node.type)) return false;
  if (hasMask === true && !node.hasMask) return false;
  if (hasMask === false && node.hasMask) return false;

  if (query) {
    const q = query.toLowerCase();
    const labelMatch = node.label.toLowerCase().includes(q);
    const meta = readMeta(node.slot);
    const promptMatch = meta.generationParams?.prompt?.toLowerCase().includes(q) ?? false;
    if (!labelMatch && !promptMatch) return false;
  }

  return true;
};

export const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const readMetadataSourceIds = (metadata: Record<string, unknown> | null): string[] => {
  if (!metadata) return [];

  const ordered = new Set<string>();
  const primary = metadata['sourceSlotId'];
  if (typeof primary === 'string' && primary.trim()) {
    ordered.add(primary.trim());
  }

  const nested = metadata['sourceSlotIds'];
  if (Array.isArray(nested)) {
    nested.forEach((value: unknown) => {
      if (typeof value !== 'string') return;
      const normalized = value.trim();
      if (!normalized) return;
      ordered.add(normalized);
    });
  }

  return Array.from(ordered);
};

const remapMetadataIdList = (value: unknown, idMap: Map<string, string>): string[] => {
  if (!Array.isArray(value)) return [];
  const remapped = new Set<string>();
  value.forEach((entry: unknown) => {
    if (typeof entry !== 'string') return;
    const normalized = entry.trim();
    if (!normalized) return;
    const mapped = idMap.get(normalized);
    if (mapped) remapped.add(mapped);
  });
  return Array.from(remapped);
};

export const remapMetadataForDetachedCopy = (
  metadata: Record<string, unknown> | null,
  idMap: Map<string, string>,
  isRoot: boolean,
): Record<string, unknown> | null => {
  if (!metadata) {
    return isRoot ? { role: 'base' } : null;
  }

  const next: Record<string, unknown> = { ...metadata };
  const remappedSourceIds = Array.from(
    new Set(
      readMetadataSourceIds(metadata)
        .map((sourceId: string) => idMap.get(sourceId))
        .filter((sourceId): sourceId is string => Boolean(sourceId)),
    ),
  );

  if (isRoot || remappedSourceIds.length === 0) {
    delete next['sourceSlotId'];
    delete next['sourceSlotIds'];
  } else if (remappedSourceIds.length === 1) {
    next['sourceSlotId'] = remappedSourceIds[0];
    delete next['sourceSlotIds'];
  } else {
    next['sourceSlotId'] = remappedSourceIds[0];
    next['sourceSlotIds'] = remappedSourceIds;
  }

  const remappedReferenceIds = remapMetadataIdList(next['sourceReferenceIds'], idMap);
  if (remappedReferenceIds.length > 0) {
    next['sourceReferenceIds'] = remappedReferenceIds;
  } else {
    delete next['sourceReferenceIds'];
  }

  const compositeConfig = asRecord(next['compositeConfig']);
  if (compositeConfig) {
    const remappedLayers = Array.isArray(compositeConfig['layers'])
      ? (compositeConfig['layers'] as unknown[])
        .map((layer: unknown): Record<string, unknown> | null => {
          const layerRecord = asRecord(layer);
          if (!layerRecord) return null;
          const rawSlotId = layerRecord['slotId'];
          if (typeof rawSlotId !== 'string') return null;
          const mappedSlotId = idMap.get(rawSlotId.trim());
          if (!mappedSlotId) return null;
          return { ...layerRecord, slotId: mappedSlotId };
        })
        .filter((layer): layer is Record<string, unknown> => Boolean(layer))
      : [];

    const nextCompositeConfig: Record<string, unknown> = { ...compositeConfig };
    if (remappedLayers.length > 0) {
      nextCompositeConfig['layers'] = remappedLayers.map(
        (layer: Record<string, unknown>, index: number) => ({
          ...layer,
          order: index,
        }),
      );
    } else {
      delete nextCompositeConfig['layers'];
    }

    const rawFlattenedId = nextCompositeConfig['flattenedSlotId'];
    if (typeof rawFlattenedId === 'string') {
      const mappedFlattenedId = idMap.get(rawFlattenedId.trim());
      if (mappedFlattenedId) {
        nextCompositeConfig['flattenedSlotId'] = mappedFlattenedId;
      } else {
        delete nextCompositeConfig['flattenedSlotId'];
      }
    }

    if (Object.keys(nextCompositeConfig).length > 0) {
      next['compositeConfig'] = nextCompositeConfig;
    } else {
      delete next['compositeConfig'];
    }
  }

  if (isRoot) {
    delete next['relationType'];
    delete next['generationRunId'];
    delete next['generationOutputIndex'];
    delete next['generationOutputCount'];
    delete next['sourceSlotId'];
    delete next['sourceSlotIds'];
    delete next['sourceReferenceIds'];
    next['role'] = 'base';
  }

  return Object.keys(next).length > 0 ? next : null;
};
