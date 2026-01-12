import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const countrySchema = z.object({
  code: z.enum(["PL", "DE", "GB", "US", "SE"]),
  name: z.string().trim().min(1),
  currencyIds: z.array(z.string()).optional(),
});

/**
 * PUT /api/countries/[id]
 * Updates a country.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = countrySchema.parse(body);
    const { currencyIds, ...countryData } = data;
    const country = await prisma.$transaction(async (tx) => {
      const updated = await tx.country.update({
        where: { id },
        data: {
          ...countryData,
        },
      });

      if (currencyIds) {
        await tx.countryCurrency.deleteMany({ where: { countryId: id } });
        if (currencyIds.length > 0) {
          await tx.countryCurrency.createMany({
            data: currencyIds.map((currencyId) => ({ countryId: id, currencyId })),
          });
        }
      }

      return tx.country.findUnique({
        where: { id: updated.id },
        include: {
          currencies: {
            include: {
              currency: true,
            },
          },
        },
      });
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

/**
 * DELETE /api/countries/[id]
 * Deletes a country.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.country.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to delete country" },
      { status: 500 }
    );
  }
}
