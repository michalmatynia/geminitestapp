import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/cms/pages
 * Fetches a list of all pages.
 */
export async function GET() {
  try {
    const pages = await prisma.page.findMany({
      include: {
        slugs: {
          include: {
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(pages);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch pages" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cms/pages
 * Creates a new page.
 */
export async function POST(req: Request) {
  try {
    const { name, slugIds } = (await req.json()) as { name: string; slugIds: string[] };
    const newPage = await prisma.page.create({
      data: {
        name,
        slugs: {
          create: slugIds.map((slugId) => ({
            slug: {
              connect: { id: slugId },
            },
          })),
        },
      },
    });
    return NextResponse.json(newPage);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create page" },
      { status: 500 }
    );
  }
}
