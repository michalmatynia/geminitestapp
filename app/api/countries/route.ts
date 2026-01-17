import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ensureInternationalizationDefaults } from "@/lib/seedInternationalization";
import { fallbackCountries } from "@/lib/internationalizationFallback";

export const runtime = "nodejs";

const countrySchema = z.object({
  code: z.enum(["PL", "DE", "GB", "US", "SE"]),
  name: z.string().trim().min(1),
  currencyIds: z.array(z.string()).optional(),
});


/**
 * GET /api/countries
 * Fetches all countries (and ensures defaults exist).
 */
export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(fallbackCountries);
  }
  try {
    await prisma.$transaction(async (tx) => {
      await ensureInternationalizationDefaults(tx);
    });

    const countries = await prisma.country.findMany({
      orderBy: { name: "asc" },
      include: {
        currencies: {
          include: { currency: true },
        },
      },
    });

    return NextResponse.json(countries);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[countries][GET] Failed to fetch countries", {
      errorId,
      error,
    });
    return NextResponse.json(fallbackCountries);
  }
}

/**
 * POST /api/countries
 * Creates a country.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = countrySchema.parse(body);

    const { currencyIds, ...countryData } = data;

    const country = await prisma.country.create({
      data: {
        // countryData.code is a zod enum union; Prisma code is an enum too (compatible)
        ...(countryData as unknown as { code: CountryCode; name: string }),
        currencies: currencyIds?.length
          ? {
              createMany: {
                data: currencyIds.map((currencyId) => ({ currencyId })),
              },
            }
          : undefined,
      },
      include: {
        currencies: {
          include: { currency: true },
        },
      },
    });

    return NextResponse.json(country);
  } catch (error: unknown) {
    const errorId = randomUUID();

    if (error instanceof z.ZodError) {
      console.warn("[countries][POST] Invalid payload", {
        errorId,
        issues: error.flatten(),
      });
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten(), errorId },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      console.error("[countries][POST] Failed to create country", {
        errorId,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 400 }
      );
    }

    console.error("[countries][POST] Unknown error", { errorId, error });
    return NextResponse.json(
      { error: "An unknown error occurred", errorId },
      { status: 400 }
    );
  }
}
