import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  getProductMigrationTotal,
  migrateProductBatch,
  type MigrationDirection,
} from "@/lib/services/product-migration";
import { parseJsonBody } from "@/lib/api/parse-json";

const migrationDirectionSchema = z.enum(["prisma-to-mongo", "mongo-to-prisma"]);

const migrationSchema = z.object({
  direction: migrationDirectionSchema,
  dryRun: z.boolean().optional(),
  cursor: z.string().nullable().optional(),
  batchSize: z.coerce.number().int().positive().optional(),
});

export async function GET(req: NextRequest) {
  const errorId = randomUUID();
  try {
    const { searchParams } = new URL(req.url);
    const parsedDirection = migrationDirectionSchema.safeParse(
      searchParams.get("direction")
    );
    if (!parsedDirection.success) {
      return NextResponse.json(
        { error: "Invalid migration direction.", errorId },
        { status: 400 }
      );
    }
    const total = await getProductMigrationTotal(parsedDirection.data);
    return NextResponse.json({ total });
  } catch (error) {
    console.error("[products][migration] Failed to get totals", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to load product migration totals.", errorId },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const errorId = randomUUID();
  try {
    const parsed = await parseJsonBody(req, migrationSchema, {
      logPrefix: "products-migrate",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const result = await migrateProductBatch({
      direction: parsed.data.direction,
      dryRun: Boolean(parsed.data.dryRun),
      cursor: parsed.data.cursor ?? null,
      batchSize:
        typeof parsed.data.batchSize === "number"
          ? parsed.data.batchSize
          : undefined,
    });
    return NextResponse.json({ result });
  } catch (error) {
    console.error("[products][migration] Failed", { errorId, error });
    return NextResponse.json(
      { error: "Failed to run product migration.", errorId },
      { status: 500 }
    );
  }
}
