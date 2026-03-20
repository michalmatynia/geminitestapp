import { createHash } from 'node:crypto';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAiPathsAccess } from '@/features/ai/ai-paths/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { normalizeOptionalQueryString } from '@/shared/lib/api/query-schema';
import {
  AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
  PORTABLE_PATH_JSON_SCHEMA_KINDS,
  buildPortablePathJsonSchemaCatalog,
  getPortableNodeCodeObjectContractsCatalog,
} from '@/shared/lib/ai-paths/portable-engine';

const SCHEMA_KIND_VALUES = ['all', ...PORTABLE_PATH_JSON_SCHEMA_KINDS] as const;
type SchemaKindQueryValue = (typeof SCHEMA_KIND_VALUES)[number];
const SCHEMA_CACHE_CONTROL = 'private, max-age=300, stale-while-revalidate=900';

export const querySchema = z.object({
  kind: z.preprocess(
    (value: unknown) => normalizeOptionalQueryString(value)?.toLowerCase(),
    z.enum(SCHEMA_KIND_VALUES).optional()
  ),
});

const buildSchemaEtag = (payload: unknown): string => {
  const serialized = JSON.stringify(payload);
  const hash = createHash('sha256').update(serialized).digest('hex').slice(0, 32);
  return `"${hash}"`;
};

const normalizeEtagToken = (value: string): string => {
  const trimmed = value.trim();
  return trimmed.startsWith('W/') ? trimmed.slice(2).trim() : trimmed;
};

const matchesIfNoneMatch = (headerValue: string | null, etag: string): boolean => {
  if (!headerValue) return false;
  const tokens = headerValue
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (tokens.includes('*')) return true;
  const normalizedEtag = normalizeEtagToken(etag);
  return tokens.some((token) => normalizeEtagToken(token) === normalizedEtag);
};

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireAiPathsAccess();

  const query = (_ctx.query ?? {}) as z.infer<typeof querySchema>;
  const kindRaw: SchemaKindQueryValue = query.kind ?? 'all';

  const schemas = buildPortablePathJsonSchemaCatalog();
  const payload =
    kindRaw === 'all'
      ? {
        specVersion: AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
        kind: 'all' as const,
        schemas,
        nodeCodeObjectContracts: getPortableNodeCodeObjectContractsCatalog(),
      }
      : {
        specVersion: AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
        kind: kindRaw,
        schema: schemas[kindRaw],
      };
  const etag = buildSchemaEtag(payload);
  const headers = {
    ETag: etag,
    'Cache-Control': SCHEMA_CACHE_CONTROL,
  };
  if (matchesIfNoneMatch(req.headers.get('if-none-match'), etag)) {
    return new NextResponse(null, {
      status: 304,
      headers,
    });
  }

  return NextResponse.json(payload, {
    headers,
  });
}
