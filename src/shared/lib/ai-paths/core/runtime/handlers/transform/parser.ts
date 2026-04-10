import type {
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';
import { coerceInput, getValueAtMappingPath } from '@/shared/lib/ai-paths/core/utils';

import { extractImageUrls } from '../../utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

type ParserSourceRecord = Record<string, unknown>;

const normalizeParserOutputValue = (key: string, value: unknown): unknown => {
  const normalizedKey = key.trim().toLowerCase();
  if (normalizedKey === 'images' || normalizedKey === 'imageurls') {
    const urls = extractImageUrls(value);
    return urls.length > 0 ? urls : value;
  }
  return value;
};

const readContextEntitySource = (contextInput: unknown): ParserSourceRecord | undefined =>
  contextInput && typeof contextInput === 'object'
    ? (((contextInput as ParserSourceRecord)['entity'] as ParserSourceRecord | undefined) ??
        ((contextInput as ParserSourceRecord)['entityJson'] as ParserSourceRecord | undefined) ??
        ((contextInput as ParserSourceRecord)['product'] as ParserSourceRecord | undefined))
    : undefined;

const readParserHydrationEntityId = (contextInput: unknown): string | null => {
  if (!contextInput || typeof contextInput !== 'object') return null;
  const contextRecord = contextInput as ParserSourceRecord;
  if (typeof contextRecord['entityId'] === 'string' && contextRecord['entityId'].trim().length > 0) {
    return contextRecord['entityId'].trim();
  }
  if (typeof contextRecord['productId'] === 'string' && contextRecord['productId'].trim().length > 0) {
    return contextRecord['productId'].trim();
  }
  return null;
};

const readParserHydrationEntityType = (
  contextInput: unknown,
  simulationEntityType: string | null
): string | null => {
  if (!contextInput || typeof contextInput !== 'object') return simulationEntityType;
  const contextRecord = contextInput as ParserSourceRecord;
  if (typeof contextRecord['entityType'] === 'string' && contextRecord['entityType'].trim().length > 0) {
    return contextRecord['entityType'].trim();
  }
  return simulationEntityType;
};

const hydrateParserSourceFromContext = async (args: {
  contextInput: unknown;
  simulationEntityType: string | null;
  fetchEntityCached: NodeHandlerContext['fetchEntityCached'];
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  node: NodeHandlerContext['node'];
}): Promise<ParserSourceRecord | undefined> => {
  const contextEntityId = readParserHydrationEntityId(args.contextInput);
  const contextEntityType = readParserHydrationEntityType(
    args.contextInput,
    args.simulationEntityType
  );
  if (!contextEntityId || !contextEntityType) return undefined;

  try {
    const hydrated = await args.fetchEntityCached(contextEntityType, contextEntityId);
    return hydrated && typeof hydrated === 'object' ? hydrated : undefined;
  } catch (error) {
    logClientError(error);
    args.reportAiPathsError(
      error,
      {
        service: 'ai-paths-runtime',
        nodeId: args.node.id,
        nodeType: args.node.type,
        contextEntityId,
        contextEntityType,
      },
      `Parser context hydration failed for ${contextEntityType}:${contextEntityId}`
    );
    return undefined;
  }
};

const isEmptyParserValue = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

const fallbackParserValue = (source: ParserSourceRecord, key: string): unknown => {
  const normalized = key.trim().toLowerCase();
  if (normalized === 'catalogid') {
    if (typeof source['catalogId'] === 'string' && source['catalogId'].trim().length > 0) {
      return source['catalogId'];
    }
    if (Array.isArray(source['catalogs'])) {
      for (const entry of source['catalogs']) {
        if (!entry || typeof entry !== 'object') continue;
        const catalogId = (entry as Record<string, unknown>)['catalogId'];
        if (typeof catalogId === 'string' && catalogId.trim().length > 0) {
          return catalogId;
        }
      }
    }
    return undefined;
  }
  if (normalized === 'title' || normalized === 'name') {
    return (
      source['title'] ??
      source['name'] ??
      source['name_en'] ??
      source['name_pl'] ??
      source['label'] ??
      source['productName']
    );
  }
  if (normalized === 'images' || normalized === 'imageurls') {
    return (
      source['images'] ??
      source['imageLinks'] ??
      source['media'] ??
      source['gallery'] ??
      source['imageFiles'] ??
      source['photos']
    );
  }
  if (normalized === 'productid' || normalized === 'entityid' || normalized === 'id') {
    return source['id'] ?? source['_id'] ?? source['productId'] ?? source['entityId'];
  }
  if (normalized === 'content_en' || normalized === 'description_en') {
    return (
      source['content_en'] ??
      source['description_en'] ??
      source['description'] ??
      source['content']
    );
  }
  return undefined;
};

const resolveParserOutputValue = (
  source: ParserSourceRecord,
  outputKey: string,
  value: unknown
): unknown => {
  const resolved = isEmptyParserValue(value) ? (fallbackParserValue(source, outputKey) ?? value) : value;
  return resolved !== undefined ? normalizeParserOutputValue(outputKey, resolved) : undefined;
};

const buildParsedOutputs = (args: {
  source: ParserSourceRecord;
  mappings: Record<string, string | undefined>;
}): RuntimePortValues =>
  Object.entries(args.mappings).reduce<RuntimePortValues>(
    (acc: RuntimePortValues, [output, rawMapping]): RuntimePortValues => {
      const key = output.trim();
      if (!key) return acc;
      const mapping = rawMapping?.trim() ?? '';
      const directValue = mapping ? getValueAtMappingPath(args.source, mapping) : args.source[key];
      const resolvedValue = resolveParserOutputValue(args.source, key, directValue);
      if (resolvedValue !== undefined) {
        acc[key] = resolvedValue;
      }
      return acc;
    },
    {}
  );

const buildDeclaredOutputs = (
  outputs: string[],
  sourceRecord: ParserSourceRecord,
  source: ParserSourceRecord
): Record<string, unknown> =>
  outputs.reduce<Record<string, unknown>>(
    (acc: Record<string, unknown>, output: string): Record<string, unknown> => {
      if (output === 'bundle') return acc;
      const outputKey = output.trim();
      if (!outputKey) return acc;
      const resolvedValue = resolveParserOutputValue(source, outputKey, sourceRecord[outputKey]);
      if (resolvedValue !== undefined) {
        acc[outputKey] = resolvedValue;
      }
      return acc;
    },
    {}
  );

const normalizeParserBundle = (source: ParserSourceRecord): ParserSourceRecord => {
  const bundle = { ...source };
  if (bundle['images'] !== undefined) {
    bundle['images'] = normalizeParserOutputValue('images', bundle['images']);
  }
  if (bundle['imageUrls'] !== undefined) {
    bundle['imageUrls'] = normalizeParserOutputValue('imageUrls', bundle['imageUrls']);
  }
  return bundle;
};

const hasParserMappings = (mappings: Record<string, string | undefined>): boolean =>
  Object.keys(mappings).some((key: string): boolean => !!key.trim());

const buildBundleParserResult = (args: {
  source: ParserSourceRecord;
  parsed: RuntimePortValues;
  hasMappings: boolean;
  outputs: string[];
}): RuntimePortValues => {
  if (!args.hasMappings || Object.keys(args.parsed).length === 0) {
    const fullBundle = normalizeParserBundle(args.source);
    const declaredOutputs = buildDeclaredOutputs(args.outputs, fullBundle, args.source);
    return { bundle: fullBundle, ...declaredOutputs };
  }

  const extraOutputs = buildDeclaredOutputs(
    args.outputs,
    args.parsed as ParserSourceRecord,
    args.source
  );
  return { bundle: args.parsed, ...extraOutputs };
};

export const handleParser: NodeHandler = async ({
  node,
  nodeInputs,
  fetchEntityCached,
  simulationEntityType,
  resolvedEntity,
  reportAiPathsError,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  try {
    const contextInput = coerceInput(nodeInputs['context']);
    const contextEntity = readContextEntitySource(contextInput);
    let source =
      (coerceInput(nodeInputs['entityJson']) as ParserSourceRecord | undefined) ??
      contextEntity ??
      (resolvedEntity as ParserSourceRecord | undefined);

    // In strict mode, hydration by explicit context identity is allowed (not a hidden fallback).
    if (!source) {
      source = await hydrateParserSourceFromContext({
        contextInput,
        simulationEntityType,
        fetchEntityCached,
        reportAiPathsError,
        node,
      });
    }

    if (!source) {
      return {
        status: 'blocked',
        skipReason: 'missing_source',
        blockedReason: 'missing_source',
      };
    }
    const parserConfig = node.config?.parser;
    const mappings = parserConfig?.mappings ?? {};
    const outputMode = parserConfig?.outputMode ?? 'individual';
    const hasMappings = hasParserMappings(mappings);
    const parsed = buildParsedOutputs({
      source,
      mappings: mappings as Record<string, string | undefined>,
    });

    if (outputMode === 'bundle') {
      return buildBundleParserResult({
        source,
        parsed,
        hasMappings,
        outputs: node.outputs,
      });
    }
    return parsed;
  } catch (error) {
    logClientError(error);
    reportAiPathsError(
      error,
      {
        service: 'ai-paths-runtime',
        nodeId: node.id,
        nodeType: node.type,
      },
      `Node ${node.id} failed`
    );
    return {};
  }
};
