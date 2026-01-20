import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  getExportWarehouseId,
  setExportWarehouseId,
} from "@/lib/services/import-template-repository";

const requestSchema = z.object({
  warehouseId: z.string().trim().min(1).nullable().optional(),
});

export async function GET() {
  try {
    const warehouseId = await getExportWarehouseId();
    return NextResponse.json({ warehouseId });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[base-export-warehouse][GET] Failed to fetch warehouse", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to fetch warehouse.", errorId },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const errorId = randomUUID();
  try {
    const body = await req.json();
    const data = requestSchema.parse(body);
    await setExportWarehouseId(data.warehouseId ?? null);
    return NextResponse.json({ warehouseId: data.warehouseId ?? null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(
      "[base-export-warehouse][POST] Failed to save warehouse",
      {
        errorId,
        message,
      }
    );
    return NextResponse.json(
      { error: message, errorId },
      { status: 500 }
    );
  }
}
