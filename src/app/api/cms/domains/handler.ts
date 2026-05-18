import { type NextRequest, NextResponse } from 'next/server';

import {
  createCmsDomain,
  listCmsDomains,
  resolveCmsDomainFromRequest,
} from '@/features/cms/server';
import { cmsDomainCreateSchema } from '@/features/cms/server';
import { logCmsActivity } from '@/features/cms/services/cms-activity';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export async function getHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await resolveCmsDomainFromRequest(req);
  const domains = await listCmsDomains();
  return NextResponse.json(domains);
}

export async function postHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, cmsDomainCreateSchema, {
    logPrefix: 'cms-domains',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const domain = await createCmsDomain(parsed.data.domain);
  void logCmsActivity({
    event: 'DOMAIN_CREATED',
    description: `Created CMS domain: ${domain.domain}`,
    userId: ctx.userId ?? null,
    entityId: domain.id,
    entityType: 'cms_domain',
    metadata: { domain: domain.domain },
  }).catch(() => {});
  return NextResponse.json(domain);
}
