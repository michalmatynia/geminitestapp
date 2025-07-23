import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
