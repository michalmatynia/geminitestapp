import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";

const currencySchema = z.object({
  code: z.enum(["USD", "EUR", "PLN", "GBP", "SEK"]),
  name: z.string().trim().min(1),
  symbol: z.string().trim().min(1).optional(),
});

// Derive the exact Prisma enum-backed type for `Currency.code`
type CurrencyCode = Prisma.CurrencyCreateManyInput["code"];

const defaultCurrencies: Array<{
  code: CurrencyCode;
  name: string;
  symbol: string;
}> = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
];

/**
 * GET /api/currencies
 * Fetches all currencies (and ensures defaults exist).
 */
export async function GET() {
  try {
    await prisma.currency.createMany({
      data: defaultCurrencies,
      skipDuplicates: true,
    });

    const currencies = await prisma.currency.findMany({
      orderBy: { code: "asc" },
    });

    return NextResponse.json(currencies);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[currencies][GET] Failed to fetch currencies", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to fetch currencies", errorId },
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

    // Ensure TS sees `code` as Prisma's enum type (matches schema)
    const currency = await prisma.currency.create({
      data: data as unknown as Prisma.CurrencyCreateInput,
    });

    return NextResponse.json(currency);
  } catch (error: unknown) {
    const errorId = randomUUID();

    if (error instanceof z.ZodError) {
      console.warn("[currencies][POST] Invalid payload", {
        errorId,
        issues: error.flatten(),
      });
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten(), errorId },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      console.error("[currencies][POST] Failed to create currency", {
        errorId,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 400 }
      );
    }

    console.error("[currencies][POST] Unknown error", { errorId, error });
    return NextResponse.json(
      { error: "An unknown error occurred", errorId },
      { status: 400 }
    );
  }
}
