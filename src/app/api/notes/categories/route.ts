export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { noteService } from "@/features/notesapp/server";
import { parseJsonBody } from "@/features/products/server";
import { categoryCreateSchema } from "@/features/notesapp";
import { removeUndefined } from "@/shared/utils";
import type { CategoryCreateInput } from "@/shared/types/notes";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

/**
 * GET /api/notes/categories
 * Fetches all categories.
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const notebookIdParam = searchParams.get("notebookId");
  const notebook = notebookIdParam
    ? { id: notebookIdParam }
    : await noteService.getOrCreateDefaultNotebook();
  const categories = await noteService.getAllCategories(notebook.id);
  return NextResponse.json(categories);
}

/**
 * POST /api/notes/categories
 * Creates a new category.
 */
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "notes.categories.GET" });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "notes.categories.POST" });
