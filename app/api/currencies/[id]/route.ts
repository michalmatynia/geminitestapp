import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const currencySchema = z.object({
  code: z.enum(["USD", "EUR", "PLN", "GBP"]),
  name: z.string().trim().min(1),
});

/**
 * PUT /api/currencies/[id]
 * Updates a currency.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = currencySchema.parse(body);
    const currency = await prisma.currency.update({
      where: { id },
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

/**
 * DELETE /api/currencies/[id]
 * Deletes a currency.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.currency.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to delete currency" },
      { status: 500 }
    );
  }
}
