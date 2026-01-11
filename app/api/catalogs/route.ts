import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";

const catalogSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
});

/**
 * GET /api/catalogs
 * Fetches all catalogs.
 */
export async function GET() {
  try {
    const catalogs = await prisma.catalog.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(catalogs);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[catalogs][GET] Failed to fetch catalogs", { errorId, error });
    return NextResponse.json(
      { error: "Failed to fetch catalogs", errorId },
      { status: 500 }
    );
  }
}

/**
 * POST /api/catalogs
 * Creates a catalog.
 */
export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      const errorId = randomUUID();
      console.error("[catalogs][POST] Failed to parse JSON body", {
        errorId,
        error,
      });
      return NextResponse.json(
        { error: "Invalid JSON payload", errorId },
        { status: 400 }
      );
    }
    const data = catalogSchema.parse(body);
    const catalog = await prisma.catalog.create({
      data: {
        name: data.name,
        description: data.description ?? null,
      },
    });
    return NextResponse.json(catalog);
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof z.ZodError) {
      console.warn("[catalogs][POST] Invalid payload", {
        errorId,
        issues: error.flatten(),
      });
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten(), errorId },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      console.error("[catalogs][POST] Failed to create catalog", {
        errorId,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 400 }
      );
    }
    console.error("[catalogs][POST] Unknown error", { errorId, error });
    return NextResponse.json(
      { error: "An unknown error occurred", errorId },
      { status: 400 }
    );
  }
}
