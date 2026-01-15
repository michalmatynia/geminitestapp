import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  getProductMigrationTotal,
  migrateProductBatch,
  type MigrationDirection,
} from "@/lib/services/product-migration";

export async function GET(req: NextRequest) {
  const errorId = randomUUID();
  try {
    const { searchParams } = new URL(req.url);
    const direction = searchParams.get("direction") as MigrationDirection | null;
    if (direction !== "prisma-to-mongo" && direction !== "mongo-to-prisma") {
      return NextResponse.json(
        { error: "Invalid migration direction.", errorId },
        { status: 400 }
      );
    }
    const total = await getProductMigrationTotal(direction);
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
    const body = (await req.json()) as {
      direction?: MigrationDirection;
      dryRun?: boolean;
      cursor?: string | null;
      batchSize?: number;
    };
    if (
      body.direction !== "prisma-to-mongo" &&
      body.direction !== "mongo-to-prisma"
    ) {
      return NextResponse.json(
        { error: "Invalid migration direction.", errorId },
        { status: 400 }
      );
    }
    const result = await migrateProductBatch({
      direction: body.direction,
      dryRun: Boolean(body.dryRun),
      cursor: body.cursor ?? null,
      batchSize:
        typeof body.batchSize === "number" ? body.batchSize : undefined,
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
