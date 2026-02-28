import type {
  DatabaseAction,
  DatabaseActionCategory,
  DatabaseConfig,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';

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
  dbConfig: _dbConfig,
  nodeInputPorts: _nodeInputPorts,
  templateInputs: _templateInputs,
  parameterTargetPath: _parameterTargetPath,
}: {
  dbConfig: DatabaseConfig;
  nodeInputPorts: string[];
  templateInputs: RuntimePortValues;
  parameterTargetPath: string;
}): BuildMongoUpdatesFromMappingsResult {
  throw new Error(
    'Mapping-based database updates are disabled. Use an explicit update template instead.'
  );
}

export function extractMissingTemplatePorts(
  template: string,
  templateInputs: RuntimePortValues
): string[] {
  const missing: Set<string> = new Set<string>();
  // Keep this token parser aligned with renderTemplate to avoid treating
  // JSON array syntax as unresolved placeholder input.
  const tokenRegex: RegExp = /{{\s*([^}]+)\s*}}|\[\s*([A-Za-z0-9_.$:-]+)\s*\]/g;
  let match: RegExpExecArray | null = tokenRegex.exec(template);

  while (match) {
    const token: string = (match[1] ?? match[2] ?? '').trim();
    if (token) {
      const rootPortCandidate: string = token.split('.')[0]?.trim() ?? '';
      const rootPort: string = rootPortCandidate.replace(/\[[^\]]*\]/g, '').trim();
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
