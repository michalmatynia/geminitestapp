import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { noteService } from "@/lib/services/noteService/index";

/**
 * GET /api/notes/categories/tree
 * Fetches categories as a hierarchical tree structure
 */
export async function GET() {
  try {
    const tree = await noteService.getCategoryTree();
    return NextResponse.json(tree);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[categories][tree][GET] Failed to fetch category tree", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to fetch category tree", errorId },
      { status: 500 }
    );
  }
}
