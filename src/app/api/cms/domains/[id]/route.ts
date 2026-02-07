export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { parseJsonBody } from "@/features/products/server";
import { deleteCmsDomain, setCmsDomainAlias } from "@/features/cms/services/cms-domain";
import { ApiParams } from "@/shared/types/base-types";

const domainUpdateSchema = z.object({
  aliasOf: z.string().trim().min(1).nullable().optional(),
});

async function PUT_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: ApiParams
): Promise<Response> {
  const parsed = await parseJsonBody(req, domainUpdateSchema, {
    logPrefix: "cms-domains",
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const updated = await setCmsDomainAlias(params.id, parsed.data.aliasOf ?? null);
  return NextResponse.json(updated ?? {});
}

async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: ApiParams
): Promise<Response> {
  await deleteCmsDomain(params.id);
  return new Response(null, { status: 204 });
}

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: "cms.domains.[id].DELETE",
});

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: "cms.domains.[id].PUT",
});
