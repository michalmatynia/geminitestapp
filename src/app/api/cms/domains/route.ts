export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { parseJsonBody } from "@/features/products/server";
import {
  createCmsDomain,
  listCmsDomains,
  resolveCmsDomainFromRequest,
} from "@/features/cms/services/cms-domain";

const domainSchema = z.object({
  domain: z.string().trim().min(1),
});

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await resolveCmsDomainFromRequest(req);
  const domains = await listCmsDomains();
  return NextResponse.json(domains);
}

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, domainSchema, {
    logPrefix: "cms-domains",
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const domain = await createCmsDomain(parsed.data.domain);
  return NextResponse.json(domain);
}

export const GET = apiHandler(GET_handler, { source: "cms.domains.GET" });
export const POST = apiHandler(POST_handler, { source: "cms.domains.POST" });
