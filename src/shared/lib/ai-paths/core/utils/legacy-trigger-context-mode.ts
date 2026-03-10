import { isObjectRecord } from '@/shared/utils/object-utils';

export const REMOVED_LEGACY_TRIGGER_CONTEXT_MODES = [
  'simulation_preferred',
  'simulation_required',
] as const;

export type RemovedLegacyTriggerContextMode =
  (typeof REMOVED_LEGACY_TRIGGER_CONTEXT_MODES)[number];

export type RemovedLegacyTriggerContextModeUsage = {
  index: number;
  nodeId: string | null;
  nodeTitle: string | null;
  contextMode: RemovedLegacyTriggerContextMode;
};

export const CANONICAL_TRIGGER_CONTEXT_MODE = 'trigger_only' as const;

export type LegacyTriggerContextModeRemediationResult<TValue> = {
  value: TValue;
  changed: boolean;
  remediatedModes: RemovedLegacyTriggerContextModeUsage[];
};

const REMOVED_LEGACY_TRIGGER_CONTEXT_MODE_SET = new Set<string>(
  REMOVED_LEGACY_TRIGGER_CONTEXT_MODES
);

const asTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const findRemovedLegacyTriggerContextModes = (
  nodes: unknown
): RemovedLegacyTriggerContextModeUsage[] => {
  if (!Array.isArray(nodes)) return [];
  return nodes.flatMap(
    (node: unknown, index: number): RemovedLegacyTriggerContextModeUsage[] => {
      if (!isObjectRecord(node)) return [];
      if (asTrimmedString(node['type']) !== 'trigger') return [];
      const config = isObjectRecord(node['config']) ? node['config'] : null;
      const triggerConfig = config && isObjectRecord(config['trigger']) ? config['trigger'] : null;
      const contextMode = asTrimmedString(triggerConfig?.['contextMode']);
      if (!REMOVED_LEGACY_TRIGGER_CONTEXT_MODE_SET.has(contextMode)) return [];
      return [
        {
          index,
          nodeId: asTrimmedString(node['id']) || null,
          nodeTitle: asTrimmedString(node['title']) || null,
          contextMode: contextMode as RemovedLegacyTriggerContextMode,
        },
      ];
    }
  );
};

export const remediateRemovedLegacyTriggerContextModes = (
  nodes: unknown
): LegacyTriggerContextModeRemediationResult<unknown> => {
  if (!Array.isArray(nodes)) {
    return {
      value: nodes,
      changed: false,
      remediatedModes: [],
    };
  }

  const remediatedModes: RemovedLegacyTriggerContextModeUsage[] = [];
  let changed = false;
  const nextNodes = nodes.map((node: unknown, index: number): unknown => {
    if (!isObjectRecord(node)) return node;
    if (asTrimmedString(node['type']) !== 'trigger') return node;
    const config = isObjectRecord(node['config']) ? node['config'] : null;
    const triggerConfig = config && isObjectRecord(config['trigger']) ? config['trigger'] : null;
    const contextMode = asTrimmedString(triggerConfig?.['contextMode']);
    if (!REMOVED_LEGACY_TRIGGER_CONTEXT_MODE_SET.has(contextMode)) return node;

    changed = true;
    remediatedModes.push({
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

  return {
    value: changed ? nextNodes : nodes,
    changed,
    remediatedModes,
  };
};

export const findRemovedLegacyTriggerContextModesInDocument = (
  document: unknown
): RemovedLegacyTriggerContextModeUsage[] => {
  if (!isObjectRecord(document)) return [];
  const direct = findRemovedLegacyTriggerContextModes(document['nodes']);
  if (direct.length > 0) return direct;

  const semanticDocument = document['document'];
  if (isObjectRecord(semanticDocument)) {
    const nested = findRemovedLegacyTriggerContextModes(semanticDocument['nodes']);
    if (nested.length > 0) return nested;
  }

  const portableEnvelope = document['package'];
  if (isObjectRecord(portableEnvelope)) {
    const nestedDocument = portableEnvelope['document'];
    if (isObjectRecord(nestedDocument)) {
      return findRemovedLegacyTriggerContextModes(nestedDocument['nodes']);
    }
  }

  return [];
};

export const normalizeRemovedTriggerContextModesInDocument = (
  document: unknown
): LegacyTriggerContextModeRemediationResult<unknown> => {
  if (!isObjectRecord(document)) {
    return {
      value: document,
      changed: false,
      remediatedModes: [],
    };
  }

  let nextDocument: Record<string, unknown> = document;
  let changed = false;
  const remediatedModes: RemovedLegacyTriggerContextModeUsage[] = [];

  const direct = remediateRemovedLegacyTriggerContextModes(nextDocument['nodes']);
  if (direct.changed) {
    nextDocument = {
      ...nextDocument,
      nodes: direct.value,
    };
    changed = true;
    remediatedModes.push(...direct.remediatedModes);
  }

  const semanticDocument = nextDocument['document'];
  if (isObjectRecord(semanticDocument)) {
    const nested = remediateRemovedLegacyTriggerContextModes(semanticDocument['nodes']);
    if (nested.changed) {
      nextDocument = {
        ...nextDocument,
        document: {
          ...semanticDocument,
          nodes: nested.value,
        },
      };
      changed = true;
      remediatedModes.push(...nested.remediatedModes);
    }
  }

  const portableEnvelope = nextDocument['package'];
  if (isObjectRecord(portableEnvelope)) {
    const nestedDocument = portableEnvelope['document'];
    if (isObjectRecord(nestedDocument)) {
      const nested = remediateRemovedLegacyTriggerContextModes(nestedDocument['nodes']);
      if (nested.changed) {
        nextDocument = {
          ...nextDocument,
          package: {
            ...portableEnvelope,
            document: {
              ...nestedDocument,
              nodes: nested.value,
            },
          },
        };
        changed = true;
        remediatedModes.push(...nested.remediatedModes);
      }
    }
  }

  return {
    value: changed ? nextDocument : document,
    changed,
    remediatedModes,
  };
};

export const findRemovedLegacyTriggerContextModesInPathConfig = (
  pathConfig: { nodes?: unknown } | null | undefined
): RemovedLegacyTriggerContextModeUsage[] => {
  if (!pathConfig || typeof pathConfig !== 'object') return [];
  return findRemovedLegacyTriggerContextModes((pathConfig as { nodes?: unknown }).nodes);
};

export const normalizeRemovedTriggerContextModesInPathConfig = <
  TPathConfig extends { nodes?: unknown } | null | undefined,
>(
    pathConfig: TPathConfig
  ): LegacyTriggerContextModeRemediationResult<TPathConfig> => {
  if (!pathConfig || typeof pathConfig !== 'object') {
    return {
      value: pathConfig,
      changed: false,
      remediatedModes: [],
    };
  }

  const remediated = remediateRemovedLegacyTriggerContextModes(pathConfig.nodes);
  if (!remediated.changed) {
    return {
      value: pathConfig,
      changed: false,
      remediatedModes: [],
    };
  }

  return {
    value: {
      ...pathConfig,
      nodes: remediated.value,
    } as TPathConfig,
    changed: true,
    remediatedModes: remediated.remediatedModes,
  };
};

const formatRemovedLegacyTriggerContextModeUsage = (
  usage: RemovedLegacyTriggerContextModeUsage
): string => {
  const nodeId = usage.nodeId ? ` (${usage.nodeId})` : '';
  const nodeTitle = usage.nodeTitle ? `"${usage.nodeTitle}" ` : '';
  return `${nodeTitle}<trigger>${nodeId} uses \`${usage.contextMode}\``;
};

export const formatRemovedLegacyTriggerContextModesMessage = (
  removedModes: RemovedLegacyTriggerContextModeUsage[],
  options?: {
    surface?:
      | 'path config'
      | 'run graph'
      | 'semantic document'
      | 'portable payload'
      | 'trigger payload'
      | 'validation payload';
  }
): string => {
  const surface = options?.surface ?? 'path config';
  const examples = removedModes
    .slice(0, 3)
    .map(formatRemovedLegacyTriggerContextModeUsage)
    .join(', ');
  return [
    `AI Paths ${surface} contains removed legacy Trigger context modes: ${examples}.`,
    'Deprecated Trigger.contextMode values `simulation_required` and `simulation_preferred` are no longer supported.',
    'Keep Trigger in `trigger_only` mode and resolve entity context through downstream Fetcher or Simulation nodes.',
  ].join(' ');
};
