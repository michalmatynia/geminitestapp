import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { noteService } from "@/lib/services/noteService/index";
import { parseJsonBody } from "@/lib/api/parse-json";
import { categoryCreateSchema } from "@/lib/validations/notes";

/**
 * GET /api/notes/categories
 * Fetches all categories.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const notebookIdParam = searchParams.get("notebookId");
    const notebook = notebookIdParam
      ? { id: notebookIdParam }
      : await noteService.getOrCreateDefaultNotebook();
    const categories = await noteService.getAllCategories(notebook.id);
    return NextResponse.json(categories);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[categories][GET] Failed to fetch categories", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to fetch categories", errorId },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes/categories
 * Creates a new category.
 */
export async function POST(req: Request) {
  try {
    const parsed = await parseJsonBody(req, categoryCreateSchema, {
      logPrefix: "categories:POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    const resolvedNotebookId =
      parsed.data.notebookId ?? (await noteService.getOrCreateDefaultNotebook()).id;
    const category = await noteService.createCategory({
      ...parsed.data,
      notebookId: resolvedNotebookId,
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof Error) {
      console.error("[categories][POST] Failed to create category", {
        errorId,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 500 }
      );
    }
    console.error("[categories][POST] Unknown error creating category", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to create category", errorId },
      { status: 500 }
    );
  }
}
