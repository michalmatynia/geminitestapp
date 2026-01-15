import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { parseJsonBody } from "@/lib/api/parse-json";

const slugSchema = z.object({
  slug: z.string().trim().min(1),
});

/**
 * GET /api/cms/slugs
 * Fetches a list of all slugs.
 */
export async function GET() {
  try {
    const slugs = await prisma.slug.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(slugs);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch slugs" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cms/slugs
 * Creates a new slug.
 */
export async function POST(req: Request) {
  try {
    const parsed = await parseJsonBody(req, slugSchema, {
      logPrefix: "cms-slugs",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const { slug } = parsed.data;
    const newSlug = await prisma.slug.create({
      data: { slug },
    });
    return NextResponse.json(newSlug);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: "Slug already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create slug" },
      { status: 500 }
    );
  }
}
