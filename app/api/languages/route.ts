import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";

const defaultLanguages = [
  { code: "EN", name: "English", nativeName: "English" },
  { code: "PL", name: "Polish", nativeName: "Polski" },
  { code: "DE", name: "German", nativeName: "Deutsch" },
  { code: "SV", name: "Swedish", nativeName: "Svenska" },
];

const languageCreateSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  nativeName: z.string().trim().min(1).optional(),
  countryIds: z.array(z.string().trim().min(1)).optional(),
});

/**
 * GET /api/languages
 * Fetches available languages (seeds defaults if empty).
 */
export async function GET() {
  try {
    await prisma.language.createMany({
      data: defaultLanguages,
      skipDuplicates: true,
    });
    const languages = await prisma.language.findMany({
      orderBy: { code: "asc" },
      include: {
        countries: {
          include: {
            country: true,
          },
        },
      },
    });
    return NextResponse.json(languages);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[languages][GET] Failed to fetch languages", { errorId, error });
    return NextResponse.json(
      { error: "Failed to fetch languages", errorId },
      { status: 500 }
    );
  }
}

/**
 * POST /api/languages
 * Creates a language with optional country assignments.
 */
export async function POST(req: Request) {
  const errorId = randomUUID();
  try {
    const body = await req.json();
    const data = languageCreateSchema.parse(body);
    const code = data.code.toUpperCase();
    const countryIds = data.countryIds ?? [];
    const uniqueIds = Array.from(new Set(countryIds));
    const existing = await prisma.country.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((entry) => entry.id));
    const validIds = uniqueIds.filter((countryId) =>
      existingIds.has(countryId)
    );

    const language = await prisma.language.create({
      data: {
        code,
        name: data.name,
        nativeName: data.nativeName,
        countries: validIds.length
          ? {
              createMany: {
                data: validIds.map((countryId) => ({ countryId })),
              },
            }
          : undefined,
      },
      include: {
        countries: {
          include: {
            country: true,
          },
        },
      },
    });
    return NextResponse.json(language);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.warn("[languages][POST] Invalid payload", {
        errorId,
        issues: error.flatten(),
      });
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten(), errorId },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      console.error("[languages][POST] Failed to create language", {
        errorId,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 400 }
      );
    }
    console.error("[languages][POST] Unknown error", { errorId, error });
    return NextResponse.json(
      { error: "An unknown error occurred", errorId },
      { status: 400 }
    );
  }
}
