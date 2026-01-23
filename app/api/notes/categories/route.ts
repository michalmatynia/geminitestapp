import { NextResponse } from "next/server";
import { noteService } from "@/lib/services/noteService/index";
import { parseJsonBody } from "@/lib/api/parse-json";
import { categoryCreateSchema } from "@/lib/validations/notes";
import { removeUndefined } from "@/lib/utils";
import type { CategoryCreateInput } from "@/types/notes";
import { createErrorResponse } from "@/lib/api/handle-api-error";

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
    return createErrorResponse(error, {
      request: req,
      source: "categories.GET",
      fallbackMessage: "Failed to fetch categories",
    });
  }
}

/**
 * POST /api/notes/categories
 * Creates a new category.
 */
export async function POST(req: Request) {
  try {
    const parsed = await parseJsonBody(req, categoryCreateSchema, {
      logPrefix: "categories.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    const resolvedNotebookId =
      parsed.data.notebookId ?? (await noteService.getOrCreateDefaultNotebook()).id;
    const category = await noteService.createCategory(removeUndefined({
      ...parsed.data,
      notebookId: resolvedNotebookId,
    }) as CategoryCreateInput);
    return NextResponse.json(category, { status: 201 });
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "categories.POST",
      fallbackMessage: "Failed to create category",
    });
  }
}
