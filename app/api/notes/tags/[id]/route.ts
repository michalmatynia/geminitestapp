import { NextResponse } from "next/server";
import { noteService } from "@/lib/services/noteService/index";
import { parseJsonBody } from "@/lib/api/parse-json";
import { tagUpdateSchema } from "@/lib/validations/notes";
import { removeUndefined } from "@/lib/utils";
import type { TagUpdateInput } from "@/types/notes";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { apiHandlerWithParams } from "@/lib/api/api-handler";

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
      source: "tags.PATCH",
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
      source: "tags.DELETE",
      fallbackMessage: "Failed to delete tag",
    });
  }
}

export const PATCH = apiHandlerWithParams<any>(async (req, _ctx, params) => PATCH_handler(req, { params: Promise.resolve(params) }), { source: "notes.tags.[id].PATCH" });
export const DELETE = apiHandlerWithParams<any>(async (req, _ctx, params) => DELETE_handler(req, { params: Promise.resolve(params) }), { source: "notes.tags.[id].DELETE" });
