import { NextResponse } from "next/server";
import { noteService } from "@/features/notesapp/server";
import { parseJsonBody } from "@/features/products/server";
import { categoryCreateSchema } from "@/features/notesapp";
import { removeUndefined } from "@/shared/utils";
import type { CategoryCreateInput } from "@/shared/types/notes";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandler } from "@/shared/lib/api/api-handler";

/**
 * GET /api/notes/categories
 * Fetches all categories.
 */
async function GET_handler(req: Request) {
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
      source: "notes.categories.GET",
      fallbackMessage: "Failed to fetch categories",
    });
  }
}

/**
 * POST /api/notes/categories
 * Creates a new category.
 */
async function POST_handler(req: Request) {
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
      source: "notes.categories.POST",
      fallbackMessage: "Failed to create category",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "notes.categories.GET" });
export const POST = apiHandler(POST_handler, { source: "notes.categories.POST" });
