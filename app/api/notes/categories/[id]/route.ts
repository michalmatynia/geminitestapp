import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { noteService } from "@/lib/services/noteService";

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
    const body = await req.json();
    const category = await noteService.updateCategory(params.id, body);
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
 */
export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    await noteService.deleteCategory(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[categories][DELETE] Failed to delete category", {
      errorId,
      categoryId: params.id,
      error,
    });
    return NextResponse.json(
      { error: "Failed to delete category", errorId },
      { status: 500 }
    );
  }
}
