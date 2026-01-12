import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";

const languageUpdateSchema = z.object({
  code: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  nativeName: z.string().trim().min(1).optional(),
  countryIds: z.array(z.string().trim().min(1)).optional(),
});

/**
 * PUT /api/languages/[id]
 * Updates language country assignments.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let languageId = "";
  try {
    const { id } = await params;
    languageId = id;
    if (!id) {
      const errorId = randomUUID();
      console.error("[languages][PUT] Missing language id", { errorId });
      return NextResponse.json(
        { error: "Language id is required", errorId },
        { status: 400 }
      );
    }
    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      const errorId = randomUUID();
      console.error("[languages][PUT] Failed to parse JSON body", {
        errorId,
        error,
        languageId: id,
      });
      return NextResponse.json(
        { error: "Invalid JSON payload", errorId },
        { status: 400 }
      );
    }
    const data = languageUpdateSchema.parse(body);
    const language = await prisma.$transaction(async (tx) => {
      if (data.code || data.name || data.nativeName !== undefined) {
        await tx.language.update({
          where: { id },
          data: {
            code: data.code ? data.code.toUpperCase() : undefined,
            name: data.name,
            nativeName: data.nativeName,
          },
        });
      }

      if (data.countryIds) {
        const uniqueIds = Array.from(new Set(data.countryIds));
        const existing = await tx.country.findMany({
          where: { id: { in: uniqueIds } },
          select: { id: true },
        });
        const existingIds = new Set(existing.map((entry) => entry.id));
        const validIds = uniqueIds.filter((countryId) =>
          existingIds.has(countryId)
        );
        await tx.languageCountry.deleteMany({ where: { languageId: id } });
        if (validIds.length > 0) {
          await tx.languageCountry.createMany({
            data: validIds.map((countryId) => ({
              languageId: id,
              countryId,
            })),
          });
        }
      }

      return tx.language.findUnique({
        where: { id },
        include: {
          countries: {
            include: {
              country: true,
            },
          },
        },
      });
    });
    return NextResponse.json(language);
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof z.ZodError) {
      console.warn("[languages][PUT] Invalid payload", {
        errorId,
        issues: error.flatten(),
        languageId,
      });
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten(), errorId },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      console.error("[languages][PUT] Failed to update language", {
        errorId,
        message: error.message,
        languageId,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 400 }
      );
    }
    console.error("[languages][PUT] Unknown error", { errorId, error });
    return NextResponse.json(
      { error: "An unknown error occurred", errorId },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/languages/[id]
 * Deletes a language and its assignments.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let languageId = "";
  const errorId = randomUUID();
  try {
    const { id } = await params;
    languageId = id;
    if (!id) {
      console.error("[languages][DELETE] Missing language id", { errorId });
      return NextResponse.json(
        { error: "Language id is required", errorId },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.languageCountry.deleteMany({ where: { languageId: id } });
      await tx.catalogLanguage.deleteMany({ where: { languageId: id } });
      await tx.language.delete({ where: { id } });
    });

    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("[languages][DELETE] Failed to delete language", {
        errorId,
        message: error.message,
        languageId,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 400 }
      );
    }
    console.error("[languages][DELETE] Unknown error", { errorId, error });
    return NextResponse.json(
      { error: "An unknown error occurred", errorId },
      { status: 400 }
    );
  }
}
