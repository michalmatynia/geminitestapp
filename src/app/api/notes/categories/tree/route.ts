export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { noteService } from "@/features/notesapp/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

/**
 * GET /api/notes/categories/tree
 * Fetches categories as a hierarchical tree structure
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const notebookIdParam = searchParams.get("notebookId");
  const notebook = notebookIdParam
    ? { id: notebookIdParam }
    : await noteService.getOrCreateDefaultNotebook();
  const tree = await noteService.getCategoryTree(notebook.id);
  return NextResponse.json(tree);
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "notes.categories.tree.GET" });
