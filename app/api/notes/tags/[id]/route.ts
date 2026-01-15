import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { noteService } from "@/lib/services/noteService";

/**
 * PATCH /api/notes/tags/[id]
 * Updates a tag.
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const tag = await noteService.updateTag(params.id, body);
    return NextResponse.json(tag);
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof Error) {
      console.error("[tags][PATCH] Failed to update tag", {
        errorId,
        tagId: params.id,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 500 }
      );
    }
    console.error("[tags][PATCH] Unknown error updating tag", {
      errorId,
      tagId: params.id,
      error,
    });
    return NextResponse.json(
      { error: "Failed to update tag", errorId },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notes/tags/[id]
 * Deletes a tag.
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await noteService.deleteTag(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[tags][DELETE] Failed to delete tag", {
      errorId,
      tagId: params.id,
      error,
    });
    return NextResponse.json(
      { error: "Failed to delete tag", errorId },
      { status: 500 }
    );
  }
}
