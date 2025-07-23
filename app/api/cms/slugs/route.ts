import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
    const { slug } = (await req.json()) as { slug: string };
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
