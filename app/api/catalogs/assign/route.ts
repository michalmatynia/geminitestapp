import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";

const assignSchema = z.object({
  productIds: z.array(z.string().trim().min(1)).min(1),
  catalogIds: z.array(z.string().trim().min(1)).min(1),
  mode: z.enum(["add", "replace", "remove"]).optional(),
});

/**
 * POST /api/catalogs/assign
 * Bulk assigns catalogs to products.
 */
export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      const errorId = randomUUID();
      console.error("[catalogs][ASSIGN] Failed to parse JSON body", {
        errorId,
        error,
      });
      return NextResponse.json(
        { error: "Invalid JSON payload", errorId },
        { status: 400 }
      );
    }
    const data = assignSchema.parse(body);
    const mode = data.mode ?? "add";

    const uniqueCatalogIds = Array.from(new Set(data.catalogIds));
    const existingCatalogs = await prisma.catalog.findMany({
      where: { id: { in: uniqueCatalogIds } },
      select: { id: true },
    });
    const existingIds = new Set(existingCatalogs.map((entry) => entry.id));
    const validCatalogIds = uniqueCatalogIds.filter((id) => existingIds.has(id));
    if (validCatalogIds.length === 0) {
      return NextResponse.json(
        { error: "No valid catalogs found." },
        { status: 400 }
      );
    }

    const uniqueProductIds = Array.from(new Set(data.productIds));

    if (mode === "replace") {
      await prisma.productCatalog.deleteMany({
        where: { productId: { in: uniqueProductIds } },
      });
    }

    if (mode === "remove") {
      await prisma.productCatalog.deleteMany({
        where: {
          productId: { in: uniqueProductIds },
          catalogId: { in: validCatalogIds },
        },
      });
      return NextResponse.json({
        updated: uniqueProductIds.length,
        catalogs: validCatalogIds.length,
        mode,
      });
    }

    await prisma.productCatalog.createMany({
      data: uniqueProductIds.flatMap((productId) =>
        validCatalogIds.map((catalogId) => ({
          productId,
          catalogId,
        }))
      ),
      skipDuplicates: true,
    });

    return NextResponse.json({
      updated: uniqueProductIds.length,
      catalogs: validCatalogIds.length,
      mode,
    });
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof z.ZodError) {
      console.warn("[catalogs][ASSIGN] Invalid payload", {
        errorId,
        issues: error.flatten(),
      });
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten(), errorId },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      console.error("[catalogs][ASSIGN] Failed to assign catalogs", {
        errorId,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 400 }
      );
    }
    console.error("[catalogs][ASSIGN] Unknown error", { errorId, error });
    return NextResponse.json(
      { error: "An unknown error occurred", errorId },
      { status: 400 }
    );
  }
}
