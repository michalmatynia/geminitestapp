import { type NextRequest, NextResponse } from 'next/server';

import { deleteCmsDomain, setCmsDomainAlias } from '@/features/cms/server';
import { cmsDomainUpdateSchema } from '@/features/cms/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { IdDto as ApiParams } from '@/shared/contracts/base';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export async function putHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: ApiParams
): Promise<Response> {
  const parsed = await parseJsonBody(req, cmsDomainUpdateSchema, {
    logPrefix: 'cms-domains',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const updated = await setCmsDomainAlias(params.id, parsed.data.aliasOf ?? null);
  return NextResponse.json(updated ?? {});
}

export async function deleteHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: ApiParams
): Promise<Response> {
  await deleteCmsDomain(params.id);
  return new Response(null, { status: 204 });
}
