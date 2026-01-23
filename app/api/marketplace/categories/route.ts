import { NextRequest, NextResponse } from "next/server";
import { getExternalCategoryRepository } from "@/lib/services/external-category-repository";

/**
 * GET /api/marketplace/categories
 * Lists external categories for a given connection.
 * Query params:
 *   - connectionId (required): The integration connection ID
 *   - tree (optional): If "true", returns categories as a hierarchical tree
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get("connectionId");
    const tree = searchParams.get("tree") === "true";

    if (!connectionId) {
      return NextResponse.json(
        { error: "connectionId is required" },
        { status: 400 }
      );
    }

    const repo = await getExternalCategoryRepository();

    if (tree) {
      const categories = await repo.getTreeByConnection(connectionId);
      return NextResponse.json(categories);
    }

    const categories = await repo.listByConnection(connectionId);
    return NextResponse.json(categories);
  } catch (error) {
    console.error("[marketplace/categories] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch external categories" },
      { status: 500 }
    );
  }
}
