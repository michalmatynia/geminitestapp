import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const countrySchema = z.object({
  code: z.enum(["PL", "DE", "GB", "US"]),
  name: z.string().trim().min(1),
});

/**
 * GET /api/countries
 * Fetches all countries.
 */
export async function GET() {
  try {
    const countries = await prisma.country.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(countries);
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch countries" },
      { status: 500 }
    );
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
    const country = await prisma.country.create({
      data: {
        ...data,
      },
    });
    return NextResponse.json(country);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten() },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "An unknown error occurred" },
      { status: 400 }
    );
  }
}
