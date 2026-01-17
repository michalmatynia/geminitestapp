import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const priceGroupSchema = z
  .object({
    groupId: z.string().trim().min(1),
    isDefault: z.boolean().optional(),
    name: z.string().trim().min(1),
    description: z.string().trim().optional().default(""),
    currencyId: z.string().trim().min(1),
    type: z.enum(["standard", "dependent"]),
    basePriceField: z.string().trim().min(1),
    sourceGroupId: z.string().trim().optional().transform((value) => {
      if (!value) return undefined;
      return value;
    }),
    priceMultiplier: z.coerce.number().nonnegative(),
    addToPrice: z.coerce.number().int(),
  })
  .refine(
    (data) => data.type === "standard" || !!data.sourceGroupId,
    {
      message: "Source price group is required for dependent groups",
      path: ["sourceGroupId"],
    }
  );

/**
 * PUT /api/price-groups/[id]
 * Updates a price group and enforces a single default group.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = priceGroupSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.priceGroup.updateMany({
          where: { id: { not: id } },
          data: { isDefault: false },
        });
      }
      return await tx.priceGroup.update({
        where: { id },
        data: {
          groupId: data.groupId,
          isDefault: data.isDefault ?? false,
          name: data.name,
          description: data.description || null,
          currencyId: data.currencyId,
          type: data.type,
          basePriceField: data.basePriceField,
          sourceGroupId: data.sourceGroupId,
          priceMultiplier: data.priceMultiplier,
          addToPrice: data.addToPrice,
        },
      });
    });

    return NextResponse.json(result);
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
 * DELETE /api/price-groups/[id]
 * Deletes a price group.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const total = await prisma.priceGroup.count();
    if (total <= 1) {
      return NextResponse.json(
        { error: "At least one price group is required." },
        { status: 400 }
      );
    }
    await prisma.priceGroup.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to delete price group" },
      { status: 500 }
    );
  }
}
