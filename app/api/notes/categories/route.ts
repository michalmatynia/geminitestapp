import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { noteService } from "@/lib/services/noteService";

/**
 * GET /api/notes/categories
 * Fetches all categories.
 */
export async function GET() {
  try {
    const categories = await noteService.getAllCategories();
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
    const body = await req.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    const category = await noteService.createCategory(body);
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
