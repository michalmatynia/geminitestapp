import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import type {
  TanstackFactoryDomain,
  TanstackFactoryMeta,
  TanstackRequestOperation,
} from '@/shared/lib/tanstack-factory-v2.types';

import type { QueryKey } from '@tanstack/react-query';

type LegacyMetaInput = {
  key?: QueryKey | undefined;
  operation: TanstackRequestOperation;
  source: string;
  kind: 'query' | 'mutation';
};

const keyToTokens = (key: QueryKey | undefined): string[] => {
  if (!key) return [];
  const normalized = normalizeQueryKey(key);
  return normalized
    .flatMap((entry: unknown): string[] => {
      if (typeof entry === 'string') return [entry];
      if (typeof entry === 'number' || typeof entry === 'boolean') return [String(entry)];
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        return Object.entries(entry as Record<string, unknown>)
          .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
          .map(([subKey, value]) => `${subKey}:${String(value)}`);
      }
      return [];
    })
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
};

const inferDomain = (tokens: string[]): TanstackFactoryDomain => {
  const first = tokens[0]?.toLowerCase();
  if (!first) return 'global';
  if (first === 'products') return 'products';
  if (first === 'image-studio' || first === 'image_studio') return 'image_studio';
  if (first === 'integrations' || first === 'marketplace' || first === 'import-export') {
    return 'integrations';
  }
  return 'global';
};

const inferResource = (tokens: string[], fallback: string): string => {
  if (tokens.length === 0) return fallback;
  return tokens.slice(0, 3).join('.');
};

export const inferLegacyFactoryMeta = (input: LegacyMetaInput): TanstackFactoryMeta => {
  const tokens = keyToTokens(input.key);
  const domain = inferDomain(tokens);
  const resource = inferResource(tokens, input.kind === 'query' ? 'query.unknown' : 'mutation.unknown');
  return {
    source: input.source,
    operation: input.operation,
    resource,
    ...(input.kind === 'query' ? { queryKey: input.key } : { mutationKey: input.key }),
    domain,
    samplingRate: input.kind === 'mutation' ? 0.4 : 0.2,
    tags: ['legacy-factory', input.kind],
  };
};
