import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const integrationSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
});

/**
 * GET /api/integrations
 * Fetches all integrations.
 */
export async function GET() {
  try {
    const integrations = await prisma.integration.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(integrations);
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch integrations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations
 * Creates an integration.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = integrationSchema.parse(body);
    if (!("integration" in prisma)) {
      throw new Error("Prisma client is out of date. Run prisma generate.");
    }
    const integration = await prisma.integration.upsert({
      where: { slug: data.slug },
      update: { name: data.name },
      create: data,
    });
    return NextResponse.json(integration);
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
