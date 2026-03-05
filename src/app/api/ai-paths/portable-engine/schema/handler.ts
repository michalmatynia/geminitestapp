import { NextRequest, NextResponse } from 'next/server';

import { requireAiPathsAccess } from '@/features/ai/ai-paths/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { getQueryParams } from '@/shared/lib/api/api-handler';
import {
  AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
  PORTABLE_PATH_JSON_SCHEMA_KINDS,
  type PortablePathJsonSchemaKind,
  buildPortablePathJsonSchemaCatalog,
} from '@/shared/lib/ai-paths/portable-engine';

const SCHEMA_KIND_VALUES = ['all', ...PORTABLE_PATH_JSON_SCHEMA_KINDS] as const;
type SchemaKindQueryValue = (typeof SCHEMA_KIND_VALUES)[number];

const isSchemaKindQueryValue = (value: string): value is SchemaKindQueryValue =>
  SCHEMA_KIND_VALUES.includes(value as SchemaKindQueryValue);

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireAiPathsAccess();

  const searchParams = getQueryParams(req);
  const kindRaw = (searchParams.get('kind') ?? 'all').trim().toLowerCase();
  if (!isSchemaKindQueryValue(kindRaw)) {
    throw badRequestError('Invalid portable schema kind.');
  }

  const schemas = buildPortablePathJsonSchemaCatalog();
  const publishedAt = new Date().toISOString();

  if (kindRaw === 'all') {
    return NextResponse.json({
      specVersion: AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
      publishedAt,
      kind: 'all',
      schemas,
    });
  }

  const schemaKind = kindRaw as PortablePathJsonSchemaKind;
  return NextResponse.json({
    specVersion: AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
    publishedAt,
    kind: schemaKind,
    schema: schemas[schemaKind],
  });
}
