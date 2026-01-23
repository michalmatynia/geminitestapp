import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getExportDefaultConnectionId,
  setExportDefaultConnectionId,
} from "@/lib/services/export-template-repository";

const postSchema = z.object({
  connectionId: z.string().nullable(),
});

/**
 * GET /api/products/exports/base/default-connection
 * Returns the default Base.com connection ID for exports
 */
export async function GET() {
  try {
    const connectionId = await getExportDefaultConnectionId();
    return NextResponse.json({ connectionId });
  } catch (error) {
    console.error("Failed to get default connection ID:", error);
    return NextResponse.json(
      { error: "Failed to get default connection ID" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products/exports/base/default-connection
 * Sets the default Base.com connection ID for exports
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = postSchema.parse(body);
    await setExportDefaultConnectionId(data.connectionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to set default connection ID:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to set default connection ID" },
      { status: 500 }
    );
  }
}
