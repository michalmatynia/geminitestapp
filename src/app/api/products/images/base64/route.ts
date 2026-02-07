export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { badRequestError } from "@/shared/errors/app-error";
import { parseJsonBody } from "@/features/products/server";

const bulkSchema = z.object({
  productIds: z.array(z.string().min(1)).min(1),
});

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, bulkSchema, {
    logPrefix: "products.images.base64.bulk.POST",
  });
  if (!parsed.ok) return parsed.response;
  const { productIds } = parsed.data;
  if (!productIds.length) {
    throw badRequestError("No product ids provided");
  }

  const results = await Promise.allSettled(
    productIds.map((id: string) =>
      fetch(new URL(`/api/products/${id}/images/base64`, req.url), {
        method: "POST",
      })
    )
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - succeeded;

  return NextResponse.json({
    status: "ok",
    requested: productIds.length,
    succeeded,
    failed,
  });
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> =>
    POST_handler(req, ctx),
  { source: "products.images.base64.bulk.POST" }
);
