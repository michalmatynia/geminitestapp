export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { noteService } from "@/features/notesapp/server";
import { parseJsonBody } from "@/features/products/server";
import { tagUpdateSchema } from "@/features/notesapp";
import { removeUndefined } from "@/shared/utils";
import type { TagUpdateInput } from "@/shared/types/notes";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

/**
 * PATCH /api/notes/tags/[id]
 * Updates a tag.
 */
async function PATCH_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const { id } = params;
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
}

/**
 * DELETE /api/notes/tags/[id]
 * Deletes a tag.
 */
async function DELETE_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  const { id } = params;
  await noteService.deleteTag(id);
  return NextResponse.json({ success: true });
}

export const PATCH = apiHandlerWithParams<{ id: string }>(PATCH_handler, { source: "notes.tags.[id].PATCH" });
export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, { source: "notes.tags.[id].DELETE" });
