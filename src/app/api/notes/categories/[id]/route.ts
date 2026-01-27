import { NextResponse } from "next/server";
import { noteService } from "@/features/notesapp/services/notes";
import { parseJsonBody } from "@/features/products/api/parse-json";
import { categoryUpdateSchema } from "@/features/notesapp/validations/notes";
import { removeUndefined } from "@/shared/utils";
import type { CategoryUpdateInput } from "@/shared/types/notes";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";

/**
 * PATCH /api/notes/categories/[id]
 * Updates a category.
 */
async function PATCH_handler(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const parsed = await parseJsonBody(req, categoryUpdateSchema, {
      logPrefix: "categories.PATCH",
      allowEmpty: true,
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const category = await noteService.updateCategory(
      params.id,
      removeUndefined(parsed.data) as CategoryUpdateInput
    );
    return NextResponse.json(category);
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "notes.categories.[id].PATCH",
      fallbackMessage: "Failed to update category",
    });
  }
}

/**
 * DELETE /api/notes/categories/[id]
 * Deletes a category.
 *
 * Query params:
 * - recursive=true: Delete all subfolders and notes within the category
 */
async function DELETE_handler(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { searchParams } = new URL(req.url);
  const recursive = searchParams.get("recursive") === "true";

  try {
    await noteService.deleteCategory(params.id, recursive);
    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "notes.categories.[id].DELETE",
      fallbackMessage: "Failed to delete category",
    });
  }
}

export const PATCH = apiHandlerWithParams<{ id: string }>(async (req, _ctx, params) => PATCH_handler(req, { params: Promise.resolve(params) }), { source: "notes.categories.[id].PATCH" });
export const DELETE = apiHandlerWithParams<{ id: string }>(async (req, _ctx, params) => DELETE_handler(req, { params: Promise.resolve(params) }), { source: "notes.categories.[id].DELETE" });
