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
 * GET /api/price-groups
 * Fetches all price groups with currency details.
 */
export async function GET() {
  try {
    const groups = await prisma.priceGroup.findMany({
      include: {
        currency: true,
        sourceGroup: true,
      },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
    return NextResponse.json(groups);
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch price groups" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/price-groups
 * Creates a price group and enforces a single default group.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = priceGroupSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.priceGroup.updateMany({
          data: { isDefault: false },
        });
      }
      return await tx.priceGroup.create({
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
