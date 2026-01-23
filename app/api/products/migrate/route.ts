import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getProductMigrationTotal,
  migrateProductBatch,
  type MigrationDirection,
} from "@/lib/services/product-migration";
import { parseJsonBody } from "@/lib/api/parse-json";
import { removeUndefined } from "@/lib/utils";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { badRequestError } from "@/lib/errors/app-error";

const migrationDirectionSchema = z.enum(["prisma-to-mongo", "mongo-to-prisma"]);

const migrationSchema = z.object({
  direction: migrationDirectionSchema,
  dryRun: z.boolean().optional(),
  cursor: z.string().nullable().optional(),
  batchSize: z.coerce.number().int().positive().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsedDirection = migrationDirectionSchema.safeParse(
      searchParams.get("direction")
    );
    if (!parsedDirection.success) {
      throw badRequestError("Invalid migration direction.");
    }
    const total = await getProductMigrationTotal(parsedDirection.data);
    return NextResponse.json({ total });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.migrate.GET",
      fallbackMessage: "Failed to load product migration totals.",
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = await parseJsonBody(req, migrationSchema, {
      logPrefix: "products.migrate.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const result = await migrateProductBatch(removeUndefined({
      direction: parsed.data.direction,
      dryRun: Boolean(parsed.data.dryRun),
      cursor: parsed.data.cursor ?? null,
      batchSize: parsed.data.batchSize,
    }) as { direction: MigrationDirection; dryRun?: boolean; cursor?: string | null; batchSize?: number });
    return NextResponse.json({ result });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.migrate.POST",
      fallbackMessage: "Failed to run product migration.",
    });
  }
}
