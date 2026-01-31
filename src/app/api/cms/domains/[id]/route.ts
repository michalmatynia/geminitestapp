import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { deleteCmsDomain, setCmsDomainAlias } from "@/features/cms/services/cms-domain";

type Params = { id: string };

const domainUpdateSchema = z.object({
  aliasOf: z.string().trim().min(1).nullable().optional(),
});

async function PUT_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: Params
): Promise<Response> {
  try {
    const parsed = await parseJsonBody(req, domainUpdateSchema, {
      logPrefix: "cms-domains",
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    const updated = await setCmsDomainAlias(params.id, parsed.data.aliasOf ?? null);
    return NextResponse.json(updated ?? {});
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "cms.domains.[id].PUT",
      fallbackMessage: "Failed to update domain",
    });
  }
}

async function DELETE_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: Params
): Promise<Response> {
  try {
    await deleteCmsDomain(params.id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "cms.domains.[id].DELETE",
      fallbackMessage: "Failed to delete domain",
    });
  }
}

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: "cms.domains.[id].DELETE",
});

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: "cms.domains.[id].PUT",
});
