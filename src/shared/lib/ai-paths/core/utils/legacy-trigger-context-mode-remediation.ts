import { isObjectRecord } from '@/shared/utils/object-utils';

import {
  REMOVED_LEGACY_TRIGGER_CONTEXT_MODES,
  type RemovedLegacyTriggerContextMode,
  type RemovedLegacyTriggerContextModeUsage,
} from './legacy-trigger-context-mode';

export const CANONICAL_TRIGGER_CONTEXT_MODE = 'trigger_only' as const;

const REMOVED_LEGACY_TRIGGER_CONTEXT_MODE_SET = new Set<string>(
  REMOVED_LEGACY_TRIGGER_CONTEXT_MODES
);

const asTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const remediateRemovedLegacyTriggerContextModesInNodes = (
  nodes: unknown
): {
  nodes: unknown;
  usages: RemovedLegacyTriggerContextModeUsage[];
} => {
  if (!Array.isArray(nodes)) {
    return { nodes, usages: [] };
  }

  const usages: RemovedLegacyTriggerContextModeUsage[] = [];
  const nextNodes = nodes.map((node: unknown, index: number): unknown => {
    if (!isObjectRecord(node)) return node;
    if (asTrimmedString(node['type']) !== 'trigger') return node;

    const config = isObjectRecord(node['config']) ? node['config'] : null;
    const triggerConfig = config && isObjectRecord(config['trigger']) ? config['trigger'] : null;
    const contextMode = asTrimmedString(triggerConfig?.['contextMode']);
    if (!REMOVED_LEGACY_TRIGGER_CONTEXT_MODE_SET.has(contextMode)) {
      return node;
    }

    usages.push({
      index,
      nodeId: asTrimmedString(node['id']) || null,
      nodeTitle: asTrimmedString(node['title']) || null,
      contextMode: contextMode as RemovedLegacyTriggerContextMode,
    });

    return {
      ...node,
      config: {
        ...(config ?? {}),
        trigger: {
          ...(triggerConfig ?? {}),
          contextMode: CANONICAL_TRIGGER_CONTEXT_MODE,
        },
      },
    };
  });

  return { nodes: usages.length > 0 ? nextNodes : nodes, usages };
};

export const remediateRemovedLegacyTriggerContextModesInDocument = <T>(
  document: T
): {
  value: T;
  usages: RemovedLegacyTriggerContextModeUsage[];
} => {
  if (!isObjectRecord(document)) {
    return { value: document, usages: [] };
  }

  const direct = remediateRemovedLegacyTriggerContextModesInNodes(document['nodes']);
  if (direct.usages.length > 0) {
    return {
      value: {
        ...document,
        nodes: direct.nodes,
      } as T,
      usages: direct.usages,
    };
  }

  const semanticDocument = document['document'];
  if (isObjectRecord(semanticDocument)) {
    const nested = remediateRemovedLegacyTriggerContextModesInNodes(semanticDocument['nodes']);
    if (nested.usages.length > 0) {
      return {
        value: {
          ...document,
          document: {
            ...semanticDocument,
            nodes: nested.nodes,
          },
        } as T,
        usages: nested.usages,
      };
    }
  }

  const portableEnvelope = document['package'];
  if (isObjectRecord(portableEnvelope)) {
    const nestedDocument = portableEnvelope['document'];
    if (isObjectRecord(nestedDocument)) {
      const nested = remediateRemovedLegacyTriggerContextModesInNodes(nestedDocument['nodes']);
      if (nested.usages.length > 0) {
        return {
          value: {
            ...document,
            package: {
              ...portableEnvelope,
              document: {
                ...nestedDocument,
                nodes: nested.nodes,
              },
            },
          } as T,
          usages: nested.usages,
        };
      }
    }
  }

  return { value: document, usages: [] };
};

export const remediateRemovedLegacyTriggerContextModesInPathConfig = <
  T extends { nodes?: unknown } | null | undefined,
>(
  pathConfig: T
): {
  value: T;
  usages: RemovedLegacyTriggerContextModeUsage[];
} => {
  if (!pathConfig || typeof pathConfig !== 'object') {
    return { value: pathConfig, usages: [] };
  }
  const remediated = remediateRemovedLegacyTriggerContextModesInNodes(pathConfig.nodes);
  if (remediated.usages.length === 0) {
    return { value: pathConfig, usages: [] };
  }
  return {
    value: {
      ...pathConfig,
      nodes: remediated.nodes,
    } as T,
    usages: remediated.usages,
  };
};
