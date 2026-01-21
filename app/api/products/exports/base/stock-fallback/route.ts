import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  getExportStockFallbackEnabled,
  setExportStockFallbackEnabled,
} from "@/lib/services/export-template-repository";

const requestSchema = z.object({
  enabled: z.boolean(),
});

export async function GET() {
  try {
    const enabled = await getExportStockFallbackEnabled();
    return NextResponse.json({ enabled });
  } catch (error) {
    const errorId = randomUUID();
    console.error(
      "[base-export-stock-fallback][GET] Failed to fetch setting",
      {
        errorId,
        error,
      }
    );
    return NextResponse.json(
      { error: "Failed to fetch stock fallback setting.", errorId },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const errorId = randomUUID();
  try {
    const body = await req.json();
    const data = requestSchema.parse(body);
    await setExportStockFallbackEnabled(data.enabled);
    return NextResponse.json({ enabled: data.enabled });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(
      "[base-export-stock-fallback][POST] Failed to save setting",
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
