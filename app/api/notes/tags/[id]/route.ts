import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { noteService } from "@/lib/services/noteService/index";
import { parseJsonBody } from "@/lib/api/parse-json";
import { tagUpdateSchema } from "@/lib/validations/notes";

/**
 * PATCH /api/notes/tags/[id]
 * Updates a tag.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const parsed = await parseJsonBody(req, tagUpdateSchema, {
      logPrefix: "tags:PATCH",
      allowEmpty: true,
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const tag = await noteService.updateTag(id, parsed.data);
    return NextResponse.json(tag);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[tags][PATCH] Failed to update tag", {
      errorId,
      tagId: id,
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await noteService.deleteTag(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[tags][DELETE] Failed to delete tag", {
      errorId,
      tagId: id,
      error,
    });
    return NextResponse.json(
      { error: "Failed to delete tag", errorId },
      { status: 500 }
    );
  }
}
