import { NextResponse } from "next/server";
import { noteService } from "@/lib/services/noteService/index";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { apiHandler } from "@/lib/api/api-handler";

/**
 * GET /api/notes/categories/tree
 * Fetches categories as a hierarchical tree structure
 */
async function GET_handler(req: Request) {
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
      source: "categories.tree.GET",
      fallbackMessage: "Failed to fetch category tree",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "notes.categories.tree.GET" });
