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

export const findRemovedLegacyTriggerContextModesInPathConfig = (
  pathConfig: { nodes?: unknown } | null | undefined
): RemovedLegacyTriggerContextModeUsage[] => {
  if (!pathConfig || typeof pathConfig !== 'object') return [];
  return findRemovedLegacyTriggerContextModes((pathConfig as { nodes?: unknown }).nodes);
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
