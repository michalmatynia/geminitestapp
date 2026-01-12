import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";

const catalogSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  languageIds: z.array(z.string().trim().min(1)).optional(),
  isDefault: z.boolean().optional(),
});

/**
 * GET /api/catalogs
 * Fetches all catalogs.
 */
export async function GET() {
  try {
    const catalogs = await prisma.catalog.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        languages: {
          include: {
            language: true,
          },
        },
      },
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
    const existingCount = await prisma.catalog.count();
    const shouldBeDefault =
      existingCount === 0 ? true : data.isDefault ?? false;

    if (shouldBeDefault) {
      await prisma.catalog.updateMany({ data: { isDefault: false } });
    }

    const catalog = await prisma.catalog.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        isDefault: shouldBeDefault,
      },
    });
    const languageIds = Array.from(new Set(data.languageIds ?? []));
    if (languageIds.length > 0) {
      const existing = await prisma.language.findMany({
        where: { id: { in: languageIds } },
        select: { id: true },
      });
      const existingIds = new Set(existing.map((entry) => entry.id));
      const validIds = languageIds.filter((id) => existingIds.has(id));
      if (validIds.length > 0) {
        await prisma.catalogLanguage.createMany({
          data: validIds.map((languageId) => ({
            catalogId: catalog.id,
            languageId,
          })),
        });
      }
    }
    const catalogWithLanguages = await prisma.catalog.findUnique({
      where: { id: catalog.id },
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
