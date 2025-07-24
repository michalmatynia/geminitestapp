import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/cms/pages/[id]
 * Fetches a single page by its ID.
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const page = await prisma.page.findUnique({
      where: { id: params.id },
      include: {
        slugs: {
          include: {
            slug: true,
          },
        },
        components: {
          orderBy: {
            order: "asc",
          },
        },
      },
    });
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }
    return NextResponse.json(page);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch page" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/cms/pages/[id]
 * Updates a page.
 */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { name, slugIds, components } = (await req.json()) as { name: string; slugIds: string[]; components: any[] };

    const updatedPage = await prisma.page.update({
      where: { id: params.id },
      data: {
        name,
        slugs: {
          deleteMany: {},
          create: slugIds.map((slugId) => ({
            slug: {
              connect: { id: slugId },
            },
          })),
        },
        components: {
          deleteMany: {},
          create: components.map((component, index) => ({
            type: component.type,
            content: component.content,
            order: index,
          })),
        },
      },
    });
    return NextResponse.json(updatedPage);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update page" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cms/pages/[id]
 * Deletes a page.
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.page.delete({
      where: { id: params.id },
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete page" },
      { status: 500 }
    );
  }
}
