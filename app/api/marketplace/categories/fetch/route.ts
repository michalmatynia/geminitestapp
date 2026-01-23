import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fetchBaseCategories } from "@/lib/services/imports/base-client";
import { getExternalCategoryRepository } from "@/lib/services/external-category-repository";

type FetchCategoriesRequest = {
  connectionId: string;
};

/**
 * POST /api/marketplace/categories/fetch
 * Fetches categories from the marketplace API and stores them locally.
 * Currently supports Base.com (BaseLinker).
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FetchCategoriesRequest;
    const { connectionId } = body;

    if (!connectionId) {
      return NextResponse.json(
        { error: "connectionId is required" },
        { status: 400 }
      );
    }

    // Get the connection to retrieve the API token
    const connection = await prisma.integrationConnection.findUnique({
      where: { id: connectionId },
      include: { integration: true },
    });

    if (!connection) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      );
    }

    // Check if this is a Base.com connection
    const integrationSlug = connection.integration?.slug?.toLowerCase();
    if (integrationSlug !== "baselinker" && integrationSlug !== "base") {
      return NextResponse.json(
        { error: "Only Base.com connections are supported for category fetch" },
        { status: 400 }
      );
    }

    // Get the API token
    const token = connection.baseApiToken;
    if (!token) {
      return NextResponse.json(
        { error: "Base.com API token not configured for this connection" },
        { status: 400 }
      );
    }

    // Fetch categories from Base.com API
    const categories = await fetchBaseCategories(token);

    if (categories.length === 0) {
      return NextResponse.json({
        fetched: 0,
        total: 0,
        message: "No categories found in Base.com",
      });
    }

    // Sync categories to local database
    const repo = await getExternalCategoryRepository();
    const syncedCount = await repo.syncFromBase(connectionId, categories);

    return NextResponse.json({
      fetched: syncedCount,
      total: categories.length,
      message: `Successfully synced ${syncedCount} categories from Base.com`,
    });
  } catch (error) {
    console.error("[marketplace/categories/fetch] POST error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch categories";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
