import type {
  DatabaseAction,
  DatabaseActionCategory,
  DatabaseConfig,
  RuntimePortValues,
  UpdaterMapping,
} from '@/shared/types/domain/ai-paths';

import { coerceInput, getValueAtMappingPath } from '../../utils';

export type BuildMongoUpdatesFromMappingsResult = {
  updates: Record<string, unknown>;
  primaryTarget: string;
  missingSourcePorts: string[];
  unresolvedSourcePorts: string[];
};

export function resolveMongoUpdateFilter({
  filter,
  queryTemplate,
  parseJsonTemplate,
}: {
  filter: Record<string, unknown>;
  queryTemplate?: string;
  parseJsonTemplate: (template: string) => unknown;
}): Record<string, unknown> {
  if (!queryTemplate?.trim()) {
    return filter;
  }
  const parsedFilter: unknown = parseJsonTemplate(queryTemplate);
  if (parsedFilter && typeof parsedFilter === 'object' && !Array.isArray(parsedFilter)) {
    return parsedFilter as Record<string, unknown>;
  }
  return filter;
}

export function buildMongoUpdateDebugPayload({
  actionCategory,
  action,
  collection,
  resolvedFilter,
  updateTemplate,
  idType,
  resolvedInputs,
}: {
  actionCategory: DatabaseActionCategory;
  action: DatabaseAction;
  collection: string;
  resolvedFilter: Record<string, unknown>;
  updateTemplate: string;
  idType: unknown;
  resolvedInputs: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    mode: 'mongo',
    actionCategory,
    action,
    collection,
    filter: resolvedFilter,
    updateTemplate: updateTemplate || undefined,
    idType,
    entityId: resolvedInputs['entityId'],
    productId: resolvedInputs['productId'],
    entityType: resolvedInputs['entityType'],
  };
}

export function buildMongoUpdatesFromMappings({
  dbConfig,
  nodeInputPorts,
  templateInputs,
  parameterTargetPath,
}: {
  dbConfig: DatabaseConfig;
  nodeInputPorts: string[];
  templateInputs: RuntimePortValues;
  parameterTargetPath: string;
}): BuildMongoUpdatesFromMappingsResult {
  const fallbackTarget: string =
    dbConfig.mappings?.[0]?.['targetPath'] ?? 'content_en';
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

  const shouldPreserveArrayMappingValue = (
    mapping: UpdaterMapping,
    sourceValue: unknown,
  ): boolean =>
    Boolean(
      dbConfig.parameterInferenceGuard?.enabled &&
        mapping.targetPath === parameterTargetPath &&
        Array.isArray(sourceValue),
    );

  const updates: Record<string, unknown> = {};
  const requiredSourcePorts: Set<string> = new Set<string>();
  const unresolvedSourcePorts: Set<string> = new Set<string>();

  mappings.forEach((mapping: UpdaterMapping): void => {
    const sourcePort: string = mapping.sourcePort;
    if (!sourcePort) return;
    requiredSourcePorts.add(sourcePort);
    const sourceValue: unknown = templateInputs[sourcePort];
    if (sourceValue === undefined) return;

    let value: unknown = shouldPreserveArrayMappingValue(mapping, sourceValue)
      ? sourceValue
      : coerceInput(sourceValue);

    if (value && typeof value === 'object' && mapping.sourcePath) {
      const resolved: unknown = getValueAtMappingPath(value, mapping.sourcePath);
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

  const missingSourcePorts: string[] = Array.from(requiredSourcePorts).filter(
    (sourcePort: string): boolean => templateInputs[sourcePort] === undefined,
  );

  return {
    updates,
    primaryTarget:
      mappings.find((m: UpdaterMapping): boolean => !!m.targetPath)?.targetPath ?? fallbackTarget,
    missingSourcePorts,
    unresolvedSourcePorts: Array.from(unresolvedSourcePorts),
  };
}

export function extractMissingTemplatePorts(
  template: string,
  templateInputs: RuntimePortValues,
): string[] {
  const missing: Set<string> = new Set<string>();
  const tokenRegex: RegExp = /{{\s*([^}]+)\s*}}|\[\s*([^\]]+)\s*\]/g;
  let match: RegExpExecArray | null = tokenRegex.exec(template);

  while (match) {
    const token: string = (match[1] ?? match[2] ?? '').trim();
    if (token) {
      const rootPort: string = token.split('.')[0]?.trim() ?? '';
      if (
        rootPort &&
        rootPort !== 'value' &&
        rootPort !== 'current' &&
        templateInputs[rootPort] === undefined
      ) {
        missing.add(rootPort);
      }
    }
    match = tokenRegex.exec(template);
  }

  return Array.from(missing);
}
