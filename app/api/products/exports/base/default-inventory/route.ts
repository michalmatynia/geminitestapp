import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  getExportDefaultInventoryId,
  setExportDefaultInventoryId,
} from "@/lib/services/export-template-repository";

const requestSchema = z.object({
  inventoryId: z.string().trim().min(1).nullable().optional(),
});

export async function GET() {
  try {
    const inventoryId = await getExportDefaultInventoryId();
    return NextResponse.json({ inventoryId });
  } catch (error) {
    const errorId = randomUUID();
    console.error(
      "[base-export-default-inventory][GET] Failed to fetch inventory",
      {
        errorId,
        error,
      }
    );
    return NextResponse.json(
      { error: "Failed to fetch inventory.", errorId },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const errorId = randomUUID();
  try {
    const body = await req.json();
    const data = requestSchema.parse(body);
    await setExportDefaultInventoryId(data.inventoryId ?? null);
    return NextResponse.json({ inventoryId: data.inventoryId ?? null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(
      "[base-export-default-inventory][POST] Failed to save inventory",
      {
        errorId,
        message,
      }
    );
    return NextResponse.json({ error: message, errorId }, { status: 500 });
  }
}
