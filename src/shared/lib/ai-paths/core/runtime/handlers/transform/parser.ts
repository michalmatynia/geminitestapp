import type {
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';
import { coerceInput, getValueAtMappingPath } from '@/shared/lib/ai-paths/core/utils';

import { extractImageUrls } from '../../utils';

export const handleParser: NodeHandler = async ({
  node,
  nodeInputs,
  fetchEntityCached,
  simulationEntityType,
  resolvedEntity,
  reportAiPathsError,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  try {
    const normalizeParserOutputValue = (key: string, value: unknown): unknown => {
      const normalizedKey = key.trim().toLowerCase();
      if (normalizedKey === 'images' || normalizedKey === 'imageurls') {
        const urls = extractImageUrls(value);
        return urls.length > 0 ? urls : value;
      }
      return value;
    };
    const contextInput = coerceInput(nodeInputs['context']);
    const contextEntity =
      contextInput && typeof contextInput === 'object'
        ? (((contextInput as Record<string, unknown>)['entity'] as
            | Record<string, unknown>
            | undefined) ??
          ((contextInput as Record<string, unknown>)['entityJson'] as
            | Record<string, unknown>
            | undefined) ??
          ((contextInput as Record<string, unknown>)['product'] as
            | Record<string, unknown>
            | undefined))
        : undefined;
    let source =
      (coerceInput(nodeInputs['entityJson']) as Record<string, unknown> | undefined) ??
      contextEntity ??
      (resolvedEntity as Record<string, unknown> | undefined);

    // In strict mode, hydration by explicit context identity is allowed (not a hidden fallback).
    if (!source && contextInput && typeof contextInput === 'object') {
      const contextRecord = contextInput as Record<string, unknown>;
      const contextEntityId =
        typeof contextRecord['entityId'] === 'string' && contextRecord['entityId'].trim().length > 0
          ? contextRecord['entityId'].trim()
          : typeof contextRecord['productId'] === 'string' &&
              contextRecord['productId'].trim().length > 0
            ? contextRecord['productId'].trim()
            : null;
      const contextEntityType =
        typeof contextRecord['entityType'] === 'string' &&
        contextRecord['entityType'].trim().length > 0
          ? contextRecord['entityType'].trim()
          : simulationEntityType;
      if (contextEntityId && contextEntityType) {
        try {
          const hydrated = await fetchEntityCached(contextEntityType, contextEntityId);
          if (hydrated && typeof hydrated === 'object') {
            source = hydrated;
          }
        } catch (error) {
          reportAiPathsError(
            error,
            {
              service: 'ai-paths-runtime',
              nodeId: node.id,
              nodeType: node.type,
              contextEntityId,
              contextEntityType,
            },
            `Parser context hydration failed for ${contextEntityType}:${contextEntityId}`
          );
        }
      }
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
    const hasMappings = Object.keys(mappings).some((key: string): boolean => !!key.trim());
    const isEmptyValue = (value: unknown): boolean =>
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '') ||
      (Array.isArray(value) && value.length === 0);

    const fallbackForKey = (key: string): unknown => {
      const normalized = key.trim().toLowerCase();
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

    const parsed: RuntimePortValues = {};
    Object.keys(mappings).forEach((output: string): void => {
      const key = output.trim();
      if (!key) return;
      const mapping = mappings[output]?.trim() ?? '';
      const value = mapping ? getValueAtMappingPath(source, mapping) : source[key];
      const resolved = isEmptyValue(value) ? (fallbackForKey(key) ?? value) : value;
      if (resolved !== undefined) {
        parsed[key] = normalizeParserOutputValue(key, resolved);
      }
    });

    const buildDeclaredOutputs = (sourceRecord: Record<string, unknown>): Record<string, unknown> =>
      node.outputs.reduce<Record<string, unknown>>(
        (acc: Record<string, unknown>, output: string): Record<string, unknown> => {
          if (output === 'bundle') return acc;
          const outputKey = output.trim();
          if (!outputKey) return acc;
          const direct = sourceRecord[outputKey];
          const resolved = isEmptyValue(direct) ? (fallbackForKey(outputKey) ?? direct) : direct;
          if (resolved !== undefined) {
            acc[outputKey] = normalizeParserOutputValue(outputKey, resolved);
          }
          return acc;
        },
        {}
      );

    if (outputMode === 'bundle') {
      if (!hasMappings || Object.keys(parsed).length === 0) {
        const fullBundle: Record<string, unknown> =
          typeof source === 'object' && source !== null ? { ...source } : {};
        if (fullBundle['images'] !== undefined) {
          fullBundle['images'] = normalizeParserOutputValue('images', fullBundle['images']);
        }
        if (fullBundle['imageUrls'] !== undefined) {
          fullBundle['imageUrls'] = normalizeParserOutputValue(
            'imageUrls',
            fullBundle['imageUrls']
          );
        }
        const declaredOutputs = buildDeclaredOutputs(fullBundle);
        return { bundle: fullBundle, ...declaredOutputs };
      }
      const extraOutputs = buildDeclaredOutputs(parsed);
      return { bundle: parsed, ...extraOutputs };
    } else {
      return parsed;
    }
  } catch (error) {
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
