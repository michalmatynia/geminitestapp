import type {
  DatabaseConfig,
  UpdaterMapping,
} from '@/shared/contracts/ai-paths';

import {
  coerceInput,
  getValueAtMappingPath,
} from '../../utils';

const isEmptyValue = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && (value).trim() === '') ||
  (Array.isArray(value) && (value as unknown[]).length === 0);

const isEffectivelyMissing = (value: unknown): boolean =>
  isEmptyValue(value) ||
  (typeof value === 'object' &&
    !Array.isArray(value) &&
    value !== null &&
    Object.keys(value as Record<string, unknown>).length === 0);

export type ResolveDatabaseUpdateMappingsInput = {
  dbConfig: DatabaseConfig;
  nodeInputPorts: string[];
  resolvedInputs: Record<string, unknown>;
  parameterTargetPath: string;
};

export type ResolveDatabaseUpdateMappingsResult = {
  fallbackTarget: string;
  mappings: UpdaterMapping[];
  updates: Record<string, unknown>;
  requiredSourcePorts: Set<string>;
  unresolvedSourcePorts: Set<string>;
};

export function resolveDatabaseUpdateMappings({
  dbConfig,
  nodeInputPorts,
  resolvedInputs,
  parameterTargetPath,
}: ResolveDatabaseUpdateMappingsInput): ResolveDatabaseUpdateMappingsResult {
  const fallbackTarget: string = dbConfig.mappings?.[0]?.targetPath ?? 'content_en';
  const fallbackSourcePort: string = nodeInputPorts.includes('result')
    ? 'result'
    : 'content_en';
  const mappings: UpdaterMapping[] =
    dbConfig.mappings && dbConfig.mappings.length > 0
      ? dbConfig.mappings
      : [
        {
          targetPath: fallbackTarget,
          sourcePort: fallbackSourcePort,
        },
      ];
  const trimStrings: boolean = dbConfig.trimStrings ?? false;
  const skipEmpty: boolean = dbConfig.skipEmpty ?? false;
  const updates: Record<string, unknown> = {};
  const requiredSourcePorts: Set<string> = new Set<string>();
  const unresolvedSourcePorts: Set<string> = new Set<string>();
  const shouldPreserveArrayMappingValue = (
    mapping: UpdaterMapping,
    sourceValue: unknown
  ): boolean =>
    Boolean(
      dbConfig.parameterInferenceGuard?.enabled &&
      mapping.targetPath === parameterTargetPath &&
      Array.isArray(sourceValue),
    );

  mappings.forEach((mapping: UpdaterMapping) => {
    const sourcePort = mapping.sourcePort;
    if (!sourcePort) return;
    requiredSourcePorts.add(sourcePort);
    const sourceValue = resolvedInputs[sourcePort];
    if (sourceValue === undefined) return;
    let value: unknown = shouldPreserveArrayMappingValue(mapping, sourceValue)
      ? sourceValue
      : coerceInput(sourceValue);
    if (value && typeof value === 'object' && mapping.sourcePath) {
      const resolved = getValueAtMappingPath(value, mapping.sourcePath);
      if (resolved !== undefined) {
        value = resolved;
      } else if (sourcePort === 'result') {
        unresolvedSourcePorts.add(sourcePort);
        return;
      }
    }
    if (
      sourcePort === 'result' &&
      value &&
      typeof value === 'object' &&
      !mapping.sourcePath
    ) {
      const resultValue: unknown = (value as Record<string, unknown>)['result'];
      const descriptionValue: unknown = (value as Record<string, unknown>)['description'];
      const contentValue: unknown = (value as Record<string, unknown>)['content_en'];
      value = resultValue ?? descriptionValue ?? contentValue ?? value;
    }
    if (sourcePort === 'result' && isEffectivelyMissing(value)) {
      unresolvedSourcePorts.add(sourcePort);
      return;
    }
    if (typeof value === 'string' && trimStrings) {
      value = (value).trim();
    }
    if (skipEmpty && isEmptyValue(value)) {
      return;
    }
    if (mapping.targetPath) {
      updates[mapping.targetPath] = value;
    }
  });

  return {
    fallbackTarget,
    mappings,
    updates,
    requiredSourcePorts,
    unresolvedSourcePorts,
  };
}
