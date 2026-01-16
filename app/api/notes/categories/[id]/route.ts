import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { noteService } from "@/lib/services/noteService";
import { parseJsonBody } from "@/lib/api/parse-json";
import { categoryUpdateSchema } from "@/lib/validations/notes";

/**
 * PATCH /api/notes/categories/[id]
 * Updates a category.
 */
export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const parsed = await parseJsonBody(req, categoryUpdateSchema, {
      logPrefix: "categories:PATCH",
      allowEmpty: true,
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const category = await noteService.updateCategory(params.id, parsed.data);
    return NextResponse.json(category);
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof Error) {
      console.error("[categories][PATCH] Failed to update category", {
        errorId,
        categoryId: params.id,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 500 }
      );
    }
    console.error("[categories][PATCH] Unknown error updating category", {
      errorId,
      categoryId: params.id,
      error,
    });
    return NextResponse.json(
      { error: "Failed to update category", errorId },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notes/categories/[id]
 * Deletes a category.
 *
 * Query params:
 * - recursive=true: Delete all subfolders and notes within the category
 */
export async function DELETE(
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
    const errorId = randomUUID();
    console.error("[categories][DELETE] Failed to delete category", {
      errorId,
      categoryId: params.id,
      recursive,
      error,
    });
    return NextResponse.json(
      { error: "Failed to delete category", errorId },
      { status: 500 }
    );
  }
}
