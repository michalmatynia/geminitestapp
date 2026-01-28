import { NextResponse } from "next/server";
import { noteService } from "@/features/notesapp/server";
import { parseJsonBody } from "@/features/products/server";
import { tagUpdateSchema } from "@/features/notesapp";
import { removeUndefined } from "@/shared/utils";
import type { TagUpdateInput } from "@/shared/types/notes";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";

/**
 * PATCH /api/notes/tags/[id]
 * Updates a tag.
 */
async function PATCH_handler(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const parsed = await parseJsonBody(req, tagUpdateSchema, {
      logPrefix: "tags.PATCH",
      allowEmpty: true,
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const tag = await noteService.updateTag(
      id,
      removeUndefined(parsed.data) as TagUpdateInput
    );
    return NextResponse.json(tag);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "notes.tags.[id].PATCH",
      fallbackMessage: "Failed to update tag",
    });
  }
}

/**
 * DELETE /api/notes/tags/[id]
 * Deletes a tag.
 */
async function DELETE_handler(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await noteService.deleteTag(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "notes.tags.[id].DELETE",
      fallbackMessage: "Failed to delete tag",
    });
  }
}

export const PATCH = apiHandlerWithParams<{ id: string }>(async (req, _ctx, params) => PATCH_handler(req, { params: Promise.resolve(params) }), { source: "notes.tags.[id].PATCH" });
export const DELETE = apiHandlerWithParams<{ id: string }>(async (req, _ctx, params) => DELETE_handler(req, { params: Promise.resolve(params) }), { source: "notes.tags.[id].DELETE" });
