import { NextResponse } from "next/server";
import { noteService } from "@/lib/services/noteService/index";
import { createErrorResponse } from "@/lib/api/handle-api-error";

/**
 * GET /api/notes/categories/tree
 * Fetches categories as a hierarchical tree structure
 */
export async function GET(req: Request) {
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
