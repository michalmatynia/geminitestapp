import { NextRequest, NextResponse } from 'next/server';

import {
  createCmsDomain,
  listCmsDomains,
  resolveCmsDomainFromRequest,
} from '@/features/cms/server';
import { cmsDomainCreateSchema } from '@/features/cms/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await resolveCmsDomainFromRequest(req);
  const domains = await listCmsDomains();
  return NextResponse.json(domains);
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, cmsDomainCreateSchema, {
    logPrefix: 'cms-domains',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const domain = await createCmsDomain(parsed.data.domain);
  return NextResponse.json(domain);
}
