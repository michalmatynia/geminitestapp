import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/cms/slugs/[id]
 * Fetches a single slug by its ID.
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const slug = await prisma.slug.findUnique({
      where: { id: params.id },
    });
    if (!slug) {
      return NextResponse.json({ error: "Slug not found" }, { status: 404 });
    }
    return NextResponse.json(slug);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch slug" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cms/slugs/[id]
 * Deletes a slug.
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.slug.delete({
      where: { id: params.id },
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete slug" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/cms/slugs/[id]
 * Updates a slug.
 */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { slug, isDefault } = (await req.json()) as { slug: string; isDefault: boolean };

    if (isDefault) {
      await prisma.slug.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const updatedSlug = await prisma.slug.update({
      where: { id: params.id },
      data: { slug, isDefault },
    });
    return NextResponse.json(updatedSlug);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update slug" },
      { status: 500 }
    );
  }
}
