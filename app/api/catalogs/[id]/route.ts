import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";

const catalogUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional().nullable(),
  languageIds: z.array(z.string().trim().min(1)).optional(),
});

/**
 * PUT /api/catalogs/[id]
 * Updates a catalog.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let catalogId = "";
  try {
    const { id } = await params;
    catalogId = id;
    if (!id) {
      const errorId = randomUUID();
      console.error("[catalogs][PUT] Missing catalog id", { errorId });
      return NextResponse.json(
        { error: "Catalog id is required", errorId },
        { status: 400 }
      );
    }
    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      const errorId = randomUUID();
      console.error("[catalogs][PUT] Failed to parse JSON body", {
        errorId,
        error,
        catalogId: id,
      });
      return NextResponse.json(
        { error: "Invalid JSON payload", errorId },
        { status: 400 }
      );
    }
    const data = catalogUpdateSchema.parse(body);
    const catalog = await prisma.catalog.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description ?? null,
      },
    });
    if (data.languageIds) {
      const uniqueIds = Array.from(new Set(data.languageIds));
      const existing = await prisma.language.findMany({
        where: { id: { in: uniqueIds } },
        select: { id: true },
      });
      const existingIds = new Set(existing.map((entry) => entry.id));
      const validIds = uniqueIds.filter((languageId) =>
        existingIds.has(languageId)
      );
      await prisma.catalogLanguage.deleteMany({ where: { catalogId: id } });
      if (validIds.length > 0) {
        await prisma.catalogLanguage.createMany({
          data: validIds.map((languageId) => ({
            catalogId: id,
            languageId,
          })),
        });
      }
    }
    const catalogWithLanguages = await prisma.catalog.findUnique({
      where: { id },
      include: {
        languages: {
          include: {
            language: true,
          },
        },
      },
    });
    return NextResponse.json(catalogWithLanguages ?? catalog);
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof z.ZodError) {
      console.warn("[catalogs][PUT] Invalid payload", {
        errorId,
        issues: error.flatten(),
        catalogId,
      });
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten(), errorId },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      console.error("[catalogs][PUT] Failed to update catalog", {
        errorId,
        message: error.message,
        catalogId,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 400 }
      );
    }
    console.error("[catalogs][PUT] Unknown error", { errorId, error });
    return NextResponse.json(
      { error: "An unknown error occurred", errorId },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/catalogs/[id]
 * Deletes a catalog.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let catalogId = "";
  try {
    const { id } = await params;
    catalogId = id;
    if (!id) {
      const errorId = randomUUID();
      console.error("[catalogs][DELETE] Missing catalog id", { errorId });
      return NextResponse.json(
        { error: "Catalog id is required", errorId },
        { status: 400 }
      );
    }
    await prisma.catalog.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[catalogs][DELETE] Failed to delete catalog", {
      errorId,
      error,
      catalogId,
    });
    return NextResponse.json(
      { error: "Failed to delete catalog", errorId },
      { status: 500 }
    );
  }
}
