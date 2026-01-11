import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const currencySchema = z.object({
  code: z.enum(["USD", "EUR", "PLN", "GBP"]),
  name: z.string().trim().min(1),
});

/**
 * GET /api/currencies
 * Fetches all currencies.
 */
export async function GET() {
  try {
    const currencies = await prisma.currency.findMany({
      orderBy: { code: "asc" },
    });
    return NextResponse.json(currencies);
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch currencies" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/currencies
 * Creates a currency.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = currencySchema.parse(body);
    const currency = await prisma.currency.create({
      data,
    });
    return NextResponse.json(currency);
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
