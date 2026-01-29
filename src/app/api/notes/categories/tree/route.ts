import { NextRequest, NextResponse } from "next/server";
import { noteService } from "@/features/notesapp/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

/**
 * GET /api/notes/categories/tree
 * Fetches categories as a hierarchical tree structure
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    const notebookIdParam = searchParams.get("notebookId");
    const notebook = notebookIdParam
      ? { id: notebookIdParam }
      : await noteService.getOrCreateDefaultNotebook();
    const tree = await noteService.getCategoryTree(notebook.id);
    return NextResponse.json(tree);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "notes.categories.tree.GET",
      fallbackMessage: "Failed to fetch category tree",
    });
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "notes.categories.tree.GET" });
